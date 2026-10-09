// ========================================================
// Flighty & Passport Core Engine
// ========================================================

const AIRPORT_DATABASE = {
  'SEA': { name: 'Seattle-Tacoma Intl', city: 'Seattle, WA', lat: 47.4502, lon: -122.3088, tz: 'PDT' },
  'SLC': { name: 'Salt Lake City Intl', city: 'Salt Lake City, UT', lat: 40.7899, lon: -111.9791, tz: 'MDT' },
  'SFO': { name: 'San Francisco Intl', city: 'San Francisco, CA', lat: 37.6213, lon: -122.3790, tz: 'PDT' },
  'LAX': { name: 'Los Angeles Intl', city: 'Los Angeles, CA', lat: 33.9416, lon: -118.4085, tz: 'PDT' },
  'JFK': { name: 'John F. Kennedy Intl', city: 'New York, NY', lat: 40.6413, lon: -73.7781, tz: 'EDT' },
  'ORD': { name: 'O\'Hare Intl', city: 'Chicago, IL', lat: 41.9742, lon: -87.9073, tz: 'CDT' },
  'DEN': { name: 'Denver Intl', city: 'Denver, CO', lat: 39.8561, lon: -104.6737, tz: 'MDT' },
  'MAA': { name: 'Chennai Intl', city: 'Chennai, India', lat: 12.9941, lon: 80.1709, tz: 'IST' }
};

// Initial reservation flights from user's Alaska Airlines booking (CQYMMJ / CQYMMZ)
const INITIAL_FLIGHTS = [
  {
    id: 'AS1513',
    airline: 'Alaska Airlines',
    flightNumber: 'AS 1513',
    callsign: 'ASA1513',
    origin: 'SEA',
    destination: 'SLC',
    date: 'Oct 2, 2026',
    depTimeSched: '6:31 PM',
    depTimeEst: '6:31 PM',
    arrTimeSched: '9:38 PM',
    arrTimeEst: '9:38 PM',
    duration: '2h 07m',
    aircraft: 'Boeing 737-900 (Winglets)',
    tail: 'N409AS',
    depTerminal: 'Main',
    depGate: 'D7',
    arrTerminal: '1',
    arrGate: 'B14',
    baggage: 'Carousel 3',
    inboundLeg: 'AS 849 from SFO (Arrived 5:45 PM • Gate D7)',
    status: 'ON TIME',
    seat: '14B',
    class: 'Main Cabin'
  },
  {
    id: 'AS665',
    airline: 'Alaska Airlines',
    flightNumber: 'AS 665',
    callsign: 'ASA665',
    origin: 'SLC',
    destination: 'SEA',
    date: 'Oct 6, 2026',
    depTimeSched: '6:42 PM',
    depTimeEst: '6:42 PM',
    arrTimeSched: '8:00 PM',
    arrTimeEst: '8:00 PM',
    duration: '2h 18m',
    aircraft: 'Boeing 737-700 (Winglets)',
    tail: 'N615AS',
    depTerminal: '1',
    depGate: 'B12',
    arrTerminal: 'Main',
    arrGate: 'N14',
    baggage: 'Carousel 5',
    inboundLeg: 'AS 664 from LAX (Arrived 5:50 PM • Gate B12)',
    status: 'ON TIME',
    seat: '11C',
    class: 'Main Cabin'
  }
];

// State
let userFlightLog = [];
let activeFlight = null;
let liveTelemetry = null;
let simulationActive = true;
let simProgress = 0.45; // 45% along the route
let simInterval = null;

// DOM Elements
const dom = {
  tabRadar: document.getElementById('tab-radar'),
  tabPassport: document.getElementById('tab-passport'),
  viewRadar: document.getElementById('view-radar'),
  viewPassport: document.getElementById('view-passport'),
  flightSelector: document.getElementById('flight-selector'),
  heroStatus: document.getElementById('hero-status'),
  heroAirline: document.getElementById('hero-airline'),
  heroIdent: document.getElementById('hero-ident'),
  originCode: document.getElementById('origin-code'),
  originCity: document.getElementById('origin-city'),
  destCode: document.getElementById('dest-code'),
  destCity: document.getElementById('dest-city'),
  progressFill: document.getElementById('progress-fill'),
  timelinePlane: document.getElementById('timeline-plane'),
  depTimeSched: document.getElementById('dep-time-sched'),
  arrTimeSched: document.getElementById('arr-time-sched'),
  depTerminal: document.getElementById('dep-terminal'),
  depGate: document.getElementById('dep-gate'),
  arrGate: document.getElementById('arr-gate'),
  baggageCarousel: document.getElementById('baggage-carousel'),
  gaugeAlt: document.getElementById('gauge-alt'),
  gaugeSpeed: document.getElementById('gauge-speed'),
  gaugeAircraft: document.getElementById('gauge-aircraft'),
  gaugeTail: document.getElementById('gauge-tail'),
  inboundText: document.getElementById('inbound-text'),
  canvasMap: document.getElementById('flight-map'),
  // Passport Elements
  statMiles: document.getElementById('stat-miles'),
  statEarth: document.getElementById('stat-earth'),
  statFlights: document.getElementById('stat-flights'),
  statAirports: document.getElementById('stat-airports'),
  stampGrid: document.getElementById('stamp-grid'),
  logList: document.getElementById('log-list'),
  addFlightModal: document.getElementById('add-flight-modal'),
  openAddModalBtn: document.getElementById('open-add-modal-btn'),
  closeAddModalBtn: document.getElementById('close-add-modal-btn'),
  saveFlightBtn: document.getElementById('save-flight-btn'),
  simToggleBtn: document.getElementById('sim-toggle-btn')
};

// -------------------------------------------------------------
// Initialization
// -------------------------------------------------------------
window.addEventListener('DOMContentLoaded', () => {
  loadSavedFlightLog();
  setupNavigation();
  setupModal();
  renderFlightChips();
  selectFlight(userFlightLog[0].id);
  startTelemetryEngine();
});

function loadSavedFlightLog() {
  const saved = localStorage.getItem('flight_passport_log');
  if (saved) {
    try {
      userFlightLog = JSON.parse(saved);
    } catch (e) {
      userFlightLog = [...INITIAL_FLIGHTS];
    }
  } else {
    userFlightLog = [...INITIAL_FLIGHTS];
    saveFlightLog();
  }
}

function saveFlightLog() {
  localStorage.setItem('flight_passport_log', JSON.stringify(userFlightLog));
  updatePassportUI();
}

// -------------------------------------------------------------
// Navigation Tabs
// -------------------------------------------------------------
function setupNavigation() {
  dom.tabRadar.addEventListener('click', () => {
    dom.tabRadar.classList.add('active');
    dom.tabPassport.classList.remove('active');
    dom.viewRadar.classList.add('active');
    dom.viewPassport.classList.remove('active');
    drawFlightMap();
  });

  dom.tabPassport.addEventListener('click', () => {
    dom.tabPassport.classList.add('active');
    dom.tabRadar.classList.remove('active');
    dom.viewPassport.classList.add('active');
    dom.viewRadar.classList.remove('active');
    updatePassportUI();
  });
}

// -------------------------------------------------------------
// Flight Selection & Hero Updates
// -------------------------------------------------------------
function renderFlightChips() {
  dom.flightSelector.innerHTML = '';
  userFlightLog.forEach((flight) => {
    const chip = document.createElement('div');
    chip.className = `flight-chip ${activeFlight?.id === flight.id ? 'active' : ''}`;
    chip.innerHTML = `
      <div class="chip-dot"></div>
      <span>${flight.flightNumber} (${flight.origin} ➔ ${flight.destination})</span>
    `;
    chip.addEventListener('click', () => selectFlight(flight.id));
    dom.flightSelector.appendChild(chip);
  });
}

function selectFlight(id) {
  activeFlight = userFlightLog.find(f => f.id === id) || userFlightLog[0];
  renderFlightChips();

  // Populate Flighty Hero Card
  dom.heroAirline.textContent = activeFlight.airline;
  dom.heroIdent.textContent = `${activeFlight.flightNumber} • ${activeFlight.date}`;
  dom.originCode.textContent = activeFlight.origin;
  dom.originCity.textContent = AIRPORT_DATABASE[activeFlight.origin]?.city || activeFlight.origin;
  dom.destCode.textContent = activeFlight.destination;
  dom.destCity.textContent = AIRPORT_DATABASE[activeFlight.destination]?.city || activeFlight.destination;

  dom.depTimeSched.textContent = activeFlight.depTimeSched;
  dom.arrTimeSched.textContent = activeFlight.arrTimeSched;

  dom.depTerminal.textContent = activeFlight.depTerminal;
  dom.depGate.textContent = activeFlight.depGate;
  dom.arrGate.textContent = activeFlight.arrGate;
  dom.baggageCarousel.textContent = activeFlight.baggage;

  dom.gaugeAircraft.textContent = activeFlight.aircraft.split('(')[0].trim();
  dom.gaugeTail.textContent = activeFlight.tail;
  dom.inboundText.textContent = activeFlight.inboundLeg;

  simProgress = 0.42; // Reset demo point
  fetchLiveOpenSkyTelemetry(activeFlight.callsign);
  drawFlightMap();
}

// -------------------------------------------------------------
// OpenSky Network ADS-B Telemetry Engine
// -------------------------------------------------------------
async function fetchLiveOpenSkyTelemetry(callsign) {
  try {
    const res = await fetch(`/api/opensky?callsign=${callsign}`);
    if (res.ok) {
      const data = await res.json();
      if (data.live) {
        liveTelemetry = data;
        updateGauges(data.altitudeFeet, data.speedMph, data.status);
        return;
      }
    }
  } catch (err) {
    console.log('OpenSky proxy query fallback to simulated mode', err);
  }

  // Simulation fallback when plane is not broadcasting right this moment
  updateSimulatedTelemetry();
}

function startTelemetryEngine() {
  clearInterval(simInterval);
  simInterval = setInterval(() => {
    if (simulationActive && activeFlight) {
      simProgress += 0.004; // Smooth progress along flight path
      if (simProgress > 0.98) simProgress = 0.05;
      updateSimulatedTelemetry();
      drawFlightMap();
    }
  }, 1000);

  if (dom.simToggleBtn) {
    dom.simToggleBtn.addEventListener('click', () => {
      simulationActive = !simulationActive;
      dom.simToggleBtn.textContent = simulationActive ? '⚡ Simulation ON' : '⚡ Simulation PAUSED';
      dom.simToggleBtn.classList.toggle('active', simulationActive);
    });
  }
}

function updateSimulatedTelemetry() {
  if (!activeFlight) return;
  const pct = Math.round(simProgress * 100);
  dom.progressFill.style.width = `${pct}%`;

  // Realistic climb, cruise (35,000 ft), and descent profile
  let alt = 35200;
  let speed = 482;
  let status = 'EN ROUTE';

  if (simProgress < 0.15) {
    alt = Math.round(simProgress * (35000 / 0.15));
    speed = Math.round(250 + (simProgress / 0.15) * 230);
    status = 'CLIMBING';
  } else if (simProgress > 0.85) {
    const descPct = (1.0 - simProgress) / 0.15;
    alt = Math.round(descPct * 35000);
    speed = Math.round(200 + descPct * 280);
    status = 'DESCENDING';
  }

  updateGauges(alt, speed, status);
}

function updateGauges(altFeet, speedMph, statusText) {
  dom.gaugeAlt.textContent = altFeet.toLocaleString();
  dom.gaugeSpeed.textContent = speedMph.toString();
  dom.heroStatus.textContent = `🟢 ${statusText}`;
}

// -------------------------------------------------------------
// Interactive Flight Route Map (Canvas Great Circle Path)
// -------------------------------------------------------------
function drawFlightMap() {
  const canvas = dom.canvasMap;
  if (!canvas || !activeFlight) return;

  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();

  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  ctx.scale(dpr, dpr);

  const width = rect.width;
  const height = rect.height;

  // Clear map canvas
  ctx.fillStyle = '#0f141e';
  ctx.fillRect(0, 0, width, height);

  // Subtle radar grid
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
  ctx.lineWidth = 1;
  for (let x = 0; x < width; x += 40) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
  for (let y = 0; y < height; y += 40) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }

  // Define origin & destination coordinates mapped to canvas
  const startX = 60;
  const startY = height - 60;
  const endX = width - 60;
  const endY = 60;
  const controlX = width / 2;
  const controlY = 20; // Arched curve for Great Circle simulation

  // Draw Great Circle Flight Arc
  ctx.beginPath();
  ctx.moveTo(startX, startY);
  ctx.quadraticCurveTo(controlX, controlY, endX, endY);
  ctx.strokeStyle = 'rgba(59, 130, 246, 0.4)';
  ctx.lineWidth = 3;
  ctx.setLineDash([6, 6]);
  ctx.stroke();
  ctx.setLineDash([]);

  // Traveled portion (solid green)
  const t = simProgress;
  const planeX = (1 - t) * (1 - t) * startX + 2 * (1 - t) * t * controlX + t * t * endX;
  const planeY = (1 - t) * (1 - t) * startY + 2 * (1 - t) * t * controlY + t * t * endY;

  ctx.beginPath();
  ctx.moveTo(startX, startY);
  ctx.quadraticCurveTo(
    (1 - t) * startX + t * controlX,
    (1 - t) * startY + t * controlY,
    planeX,
    planeY
  );
  ctx.strokeStyle = '#10b981';
  ctx.lineWidth = 4;
  ctx.stroke();

  // Origin Airport Pin
  drawAirportPin(ctx, startX, startY, activeFlight.origin, '#3b82f6');
  // Destination Airport Pin
  drawAirportPin(ctx, endX, endY, activeFlight.destination, '#f59e0b');

  // Moving Plane Indicator
  ctx.save();
  ctx.translate(planeX, planeY);
  ctx.shadowColor = '#10b981';
  ctx.shadowBlur = 14;
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(0, 0, 7, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#10b981';
  ctx.font = '16px sans-serif';
  ctx.fillText('✈️', -8, -12);
  ctx.restore();
}

function drawAirportPin(ctx, x, y, code, color) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, 5, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#fff';
  ctx.font = 'bold 11px monospace';
  ctx.fillText(code, x - 12, y + 16);
  ctx.restore();
}

// -------------------------------------------------------------
// FANCY DIGITAL PASSPORT & LOGBOOK
// -------------------------------------------------------------
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 3958.8; // Earth radius in miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

function updatePassportUI() {
  let totalMiles = 0;
  const uniqueAirports = new Set();

  dom.stampGrid.innerHTML = '';
  dom.logList.innerHTML = '';

  const stampColors = ['stamp-red', 'stamp-blue', 'stamp-green', 'stamp-purple'];

  userFlightLog.forEach((flight, idx) => {
    const o = AIRPORT_DATABASE[flight.origin] || { lat: 47.45, lon: -122.3, city: flight.origin };
    const d = AIRPORT_DATABASE[flight.destination] || { lat: 40.78, lon: -111.9, city: flight.destination };
    const distance = calculateDistance(o.lat, o.lon, d.lat, d.lon) || 689;

    totalMiles += distance;
    uniqueAirports.add(flight.origin);
    uniqueAirports.add(flight.destination);

    // Render Flight History Card
    const card = document.createElement('div');
    card.className = 'log-card';
    card.innerHTML = `
      <div class="log-left">
        <div class="log-badge">${flight.flightNumber}</div>
        <div>
          <div class="log-route">${flight.origin} ➔ ${flight.destination}</div>
          <div class="log-meta">${flight.date} • Seat ${flight.seat || '14B'} • ${flight.aircraft.split('(')[0]}</div>
        </div>
      </div>
      <div class="log-distance">${distance.toLocaleString()} mi</div>
    `;
    dom.logList.appendChild(card);
  });

  // Render Immigration Stamps for all visited destination airports
  const stampAirports = Array.from(uniqueAirports);
  stampAirports.forEach((code, i) => {
    const airport = AIRPORT_DATABASE[code] || { city: code, name: `${code} Intl` };
    const colorClass = stampColors[i % stampColors.length];
    const rot = (i % 2 === 0 ? 1 : -1) * (3 + (i * 2) % 6);

    const stamp = document.createElement('div');
    stamp.className = `visa-stamp ${colorClass}`;
    stamp.style.transform = `rotate(${rot}deg)`;
    stamp.innerHTML = `
      <div class="stamp-city">${airport.city || 'INTERNATIONAL'}</div>
      <div class="stamp-airport">${code}</div>
      <div class="stamp-status">★ ARRIVED ★</div>
      <div class="stamp-date">OCT 2026 • IMMIGRATION</div>
    `;
    dom.stampGrid.appendChild(stamp);
  });

  // Update Lifetime Stats
  dom.statMiles.textContent = totalMiles.toLocaleString();
  dom.statFlights.textContent = userFlightLog.length.toString();
  dom.statAirports.textContent = uniqueAirports.size.toString();

  const earthCircumference = 24901;
  const earthFraction = (totalMiles / earthCircumference).toFixed(2);
  dom.statEarth.textContent = `${earthFraction}x`;
}

// -------------------------------------------------------------
// Add Flight Modal
// -------------------------------------------------------------
function setupModal() {
  dom.openAddModalBtn.addEventListener('click', () => {
    dom.addFlightModal.classList.add('open');
  });

  dom.closeAddModalBtn.addEventListener('click', () => {
    dom.addFlightModal.classList.remove('open');
  });

  dom.addFlightModal.addEventListener('click', (e) => {
    if (e.target === dom.addFlightModal) dom.addFlightModal.classList.remove('open');
  });

  dom.saveFlightBtn.addEventListener('click', () => {
    const flightNum = document.getElementById('input-flight-num').value.trim();
    const fromCode = document.getElementById('input-from').value.trim().toUpperCase();
    const toCode = document.getElementById('input-to').value.trim().toUpperCase();
    const dateVal = document.getElementById('input-date').value.trim();
    const seatVal = document.getElementById('input-seat').value.trim() || '12A';

    if (!flightNum || !fromCode || !toCode) {
      alert('Please enter Flight Number, Origin, and Destination codes.');
      return;
    }

    const newFlight = {
      id: flightNum.replace(/\s+/g, ''),
      airline: 'Commercial Flight',
      flightNumber: flightNum,
      callsign: flightNum.replace(/\s+/g, ''),
      origin: fromCode,
      destination: toCode,
      date: dateVal || 'Recent Trip',
      depTimeSched: '10:00 AM',
      depTimeEst: '10:00 AM',
      arrTimeSched: '1:30 PM',
      arrTimeEst: '1:30 PM',
      duration: '3h 30m',
      aircraft: 'Boeing 737-800',
      tail: 'N' + Math.floor(100 + Math.random() * 899) + 'AA',
      depTerminal: '2',
      depGate: 'A' + Math.floor(1 + Math.random() * 20),
      arrTerminal: '1',
      arrGate: 'C' + Math.floor(1 + Math.random() * 20),
      baggage: 'Carousel ' + Math.floor(1 + Math.random() * 6),
      inboundLeg: 'On Schedule from previous hub',
      status: 'ON TIME',
      seat: seatVal,
      class: 'Economy'
    };

    userFlightLog.push(newFlight);
    saveFlightLog();
    renderFlightChips();
    selectFlight(newFlight.id);

    dom.addFlightModal.classList.remove('open');
  });
}
