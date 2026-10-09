// Vercel Serverless Function: Proxy to OpenSky Network API
const OPENSKY_CLIENT_ID = process.env.OPENSKY_CLIENT_ID || 'knmurug3@gmail.com-api-client';
const OPENSKY_CLIENT_SECRET = process.env.OPENSKY_CLIENT_SECRET || '51KA0vXvxltQwyx7rPBHQUaZ20RyFjw9';

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const queryCallsign = (req.query.callsign || '').trim().toUpperCase();

  try {
    const authHeader = 'Basic ' + Buffer.from(`${OPENSKY_CLIENT_ID}:${OPENSKY_CLIENT_SECRET}`).toString('base64');
    const response = await fetch('https://opensky-network.org/api/states/all', {
      headers: {
        'Authorization': authHeader,
        'User-Agent': 'FlightPassportApp/1.0'
      }
    });

    if (!response.ok) {
      return res.status(response.status).json({ error: 'OpenSky API error', status: response.status });
    }

    const data = await response.json();
    const states = data.states || [];

    // Format flight number: e.g. "AS 1513" -> "ASA1513" or search by number "1513"
    let cleanCallsign = queryCallsign.replace(/[^A-Z0-9]/g, '');
    if (cleanCallsign.startsWith('AS') && !cleanCallsign.startsWith('ASA')) {
      cleanCallsign = 'ASA' + cleanCallsign.slice(2);
    }

    let matched = null;

    if (cleanCallsign) {
      matched = states.find(s => {
        const cs = (s[1] || '').trim().toUpperCase();
        return cs === cleanCallsign || cs.endsWith(cleanCallsign) || cleanCallsign.endsWith(cs);
      });
    }

    if (matched) {
      const lat = matched[6];
      const lon = matched[5];
      const altMeters = matched[7];
      const altFeet = altMeters ? Math.round(altMeters * 3.28084) : 0;
      const speedMs = matched[9];
      const speedKnots = speedMs ? Math.round(speedMs * 1.94384) : 0;
      const speedMph = speedMs ? Math.round(speedMs * 2.23694) : 0;
      const heading = matched[10] ? Math.round(matched[10]) : 0;
      const onGround = matched[8];

      return res.status(200).json({
        found: true,
        live: true,
        status: onGround ? 'ON GROUND' : 'EN ROUTE',
        callsign: (matched[1] || '').trim(),
        icao24: matched[0],
        originCountry: matched[2],
        latitude: lat,
        longitude: lon,
        altitudeFeet: altFeet,
        altitudeMeters: Math.round(altMeters || 0),
        speedMph: speedMph,
        speedKnots: speedKnots,
        heading: heading,
        onGround: onGround,
        lastContact: matched[4]
      });
    }

    // If not actively flying right now, return active count + scheduled status
    const activeAlaska = states.filter(s => (s[1] || '').trim().startsWith('ASA')).length;

    return res.status(200).json({
      found: false,
      live: false,
      status: 'SCHEDULED',
      message: `Flight ${queryCallsign || 'track'} is not broadcasting live ADS-B at this moment. Showing scheduled timetable.`,
      activeFleetInAir: activeAlaska,
      totalGlobalPlanes: states.length
    });

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};
