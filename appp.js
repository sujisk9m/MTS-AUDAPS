// appp.js
console.log("Marine Technology System Loaded");

const POLL_MS = 2000;
let currentDataIndex = 0;
let currentRows = [];
let pollTimer = null;

// Embedded Data
const EXCEL_DATA = [];

// Chart Variables
let speedChart, tdsTrendChart, turbTrendChart, pressTrendChart, itempTrendChart, etempTrendChart, condTrendChart;
let analyticsChart = null;

// DOM Elements
let phNow, salNow, pressNow, turbNow, energyNow, loadNow, speedVal, leakPill, depthNow, altNow;



let dummyIndex = 0;

  // ===== LARGE DUMMY DATASET (200 points) =====
  const dummyDataset = Array.from({ length: 200 }, (_, i) => ({
      tds: 1800 + Math.sin(i / 5) * 100 + Math.random() * 50,
      turbidity: 1.5 + Math.cos(i / 7) * 0.4 + Math.random() * 0.2,
      pressure: 105 + Math.sin(i / 6) * 4,
      intTemp: 30 + Math.sin(i / 8) * 3,
      extTemp: 25 + Math.cos(i / 10) * 2,
      conductivity: 50 + Math.sin(i / 9) * 6,

      accX: Math.sin(i / 4),
      accY: Math.cos(i / 4),
      accZ: Math.sin(i / 3),

      gyroX: Math.sin(i / 5) * 30,
      gyroY: Math.cos(i / 5) * 30,
      gyroZ: Math.sin(i / 6) * 30
}));




// --- Initialization ---

window.onload = () => {
  initDOMElements();
  initCharts();
  setTimeout(initAnalyticsChart, 200);



  // Initialize pages with default/empty data so they aren't blank
  updateSimulationPage({});
  startDummyFeed();
  updateAnalyticsPage([]);

  // Force show dashboard page using the new helper
  if (window.showPage) {
    window.showPage('dashboard');
  }

  startPolling(); // Re-enabled for Google Sheets
};

function initDOMElements() {
  phNow = document.getElementById('phNow');
  salNow = document.getElementById('salNow');
  pressNow = document.getElementById('pressNow');
  turbNow = document.getElementById('turbNow');
  energyNow = document.getElementById('energyNow');
  loadNow = document.getElementById('loadNow');
  speedVal = document.getElementById('speedVal');
  leakPill = document.getElementById('leakPill');
  depthNow = document.getElementById('depthNow');
  altNow = document.getElementById('altNow');
}

// --- Chart Creation ---

function makeSemiDonut(ctx) {
  return new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Speed', 'Rest'],
      datasets: [{
        data: [0, 100],
        backgroundColor: ['rgba(128, 0, 0, 0.95)', 'rgba(200, 200, 200, 0.3)'],
        borderColor: ['#800000', 'rgba(200, 200, 200, 0.5)'],
        borderWidth: 3,
        cutout: '75%'
      }]
    },
    options: {
      rotation: -90,
      circumference: 180,
      plugins: { legend: { display: false }, tooltip: { enabled: true } },
      maintainAspectRatio: false
    }
  });
}

function makeLine(ctx, color, min, max, title) {
  return new Chart(ctx, {
    type: 'line',
    data: {
      labels: [],
      datasets: [{
        label: title,
        data: [],
        tension: 0.4,
        pointRadius: 3,
        pointHoverRadius: 5,
        borderWidth: 2,
        borderColor: color,
        backgroundColor: 'rgba(128, 0, 0, 0.05)',
        fill: true
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { display: true, grid: { display: true, color: 'rgba(0,0,0,0.05)' }, ticks: { display: false } }, // Grid Lines Enabled
        y: {
          min: min, max: max,
          grid: { display: true, color: 'rgba(0,0,0,0.05)' },
          ticks: { color: '#666', font: { size: 10, weight: 'bold' } }
        }
      },
      elements: {
        point: { radius: 3, backgroundColor: color } // Points Visible
      }
    }
  });
}

function initCharts() {
  const ids = ['speedGauge', 'tdsTrend', 'turTrend', 'PreTrend', 'itempTrend', 'etempTrend', 'condTrend'];
  const els = ids.map(id => document.getElementById(id));

  if (els[0]) speedChart = makeSemiDonut(els[0].getContext('2d'));
  if (els[1]) 
    tdsTrendChart = makeLine(
        els[1].getContext("2d"),
        "#2c7be5",
        1500,
        2200,
        "TDS"
    );
  if (els[2]) turbTrendChart = makeLine(els[2].getContext('2d'), '#2c3e50', 0.0, 3.0, 'Turbidity');
  if (els[3]) pressTrendChart = makeLine(els[3].getContext('2d'), '#800000', 100.0, 115.0, 'Pressure');
  if (els[4]) itempTrendChart = makeLine(els[4].getContext('2d'), '#a00000', 20.0, 45.0, 'Int Temp');
  if (els[5]) etempTrendChart = makeLine(els[5].getContext('2d'), '#2c3e50', 15.0, 30.0, 'Ext Temp');
  if (els[6]) condTrendChart = makeLine(els[6].getContext('2d'), '#800000', 40.0, 65.0, 'Conductivity');
}

// --- Data Handling ---

// CONFIGURATION: Choose your data source
const DATA_SOURCE = 'GOOGLE_SHEETS'; // Options: 'ARDUINO' or 'GOOGLE_SHEETS'

const WS_URL = 'ws://localhost:8080';
const GOOGLE_WEB_APP_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQTJaUA_Dn0ata3gEhuTIyFFaOFswvp-Pd0fDXjBQPvUef2WHWgjC1YG1GqTO-8Vf2PLUmGUJOdOM_H/pubhtml';
const TURBIDITY_URL = "https://script.googleusercontent.com/macros/echo?user_content_key=AY5xjrRkJtaZV0qGYtgh-c9zLXRxieKkh5JT49QfoJLnQ_-76XxyGCALfEqztDrNQPWakHR8rcqMOem1LcESNhgROHBguWO_8u-ofJfsxvV6Rl8hFVOGiDm6k_vqMTBJDH9AXGYpX7NNalASwVa9a5c0bk2epQdQtsVFQcEXewMP8IXSZC8WkwzqDaRpPPQ9XOUsma3BvSEF0NtoEsaOEyWLsq9bkO-_LA7dNwDeEcy3vbOxAP9c0aH2kMdcB9Rx2TvPeuMs9aYo8xkDSfaN4WOumkTMRwTET0tc0czPi4__&lib=M3V4wuBhMn8UlwEJohdjhyYSGRtvx60-5";

let ws = null;

  function startPolling() {
    if (DATA_SOURCE === 'ARDUINO') {
      connectWebSocket();
    } else if (DATA_SOURCE === 'GOOGLE_SHEETS') {
      if (pollTimer) clearInterval(pollTimer);
      // fetchSheetData();
      // pollTimer = setInterval(fetchSheetData, POLL_MS);
    }
  }

  // 1. WebSocket (Arduino)
  function connectWebSocket() {
    if (ws) return;
    console.log("Connecting to WebSocket...");
    ws = new WebSocket(WS_URL);

    ws.onopen = () => console.log("✅ WebSocket Connected");
    ws.onclose = () => {
      console.log("⚠️ WS Disconnected. Retry in 3s...");
      ws = null;
      setTimeout(connectWebSocket, 3000);
    };
    ws.onerror = (e) => { console.error("WS Error", e); ws.close(); };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        processData(data);
      } catch (e) {
        console.error("Error parsing WS data", e);
      }
    };
  }

  // 2. Google Sheets
  async function fetchSheetData() {
    try {

      // Fetch both sheets at same time
      const [accRes, turbRes] = await Promise.all([
        fetch('https://script.google.com/macros/s/AKfycbzJ7tKbxY8Ee3Ha4VDQ2iyriZMfAgp32Bv62wIaruYvvJfqCWaJuqUzEHHipAASBi39wg/exec'),
        fetch('https://script.googleusercontent.com/macros/echo?user_content_key=AY5xjrRkJtaZV0qGYtgh-c9zLXRxieKkh5JT49QfoJLnQ_-76XxyGCALfEqztDrNQPWakHR8rcqMOem1LcESNhgROHBguWO_8u-ofJfsxvV6Rl8hFVOGiDm6k_vqMTBJDH9AXGYpX7NNalASwVa9a5c0bk2epQdQtsVFQcEXewMP8IXSZC8WkwzqDaRpPPQ9XOUsma3BvSEF0NtoEsaOEyWLsq9bkO-_LA7dNwDeEcy3vbOxAP9c0aH2kMdcB9Rx2TvPeuMs9aYo8xkDSfaN4WOumkTMRwTET0tc0czPi4__&lib=M3V4wuBhMn8UlwEJohdjhyYSGRtvx60-5')
      ]);

      const accData = await accRes.json();
      const turbData = await turbRes.json();

      // Combine them
      const combinedData = {
        ...accData,
        ...turbData
      };

      processData(combinedData);

    } catch (error) {
      console.error("Error fetching sheets:", error);
    }
  }

  // Common Processor
  function processData(data) {
    console.log("Incoming Data:", data);

    if (!data) return;

    currentRows = [data];

    applyRowsToUI();
  }


  function normalize(o) {

    // ===== TDS + Depth =====
    o.salinity = Number(o.salinity || o.tds || 0);
    o.depth = Number(o.depth || 0);

    // ===== Acceleration =====
    o.accX = Number(o.accX ?? o.acc ?? 0);
    o.accY = Number(o.accY ?? 0);
    o.accZ = Number(o.accZ ?? 0);

    // Keep old single value for compatibility
    o.acc = o.accX;

    // ===== Gyroscope =====
    o.gyroX = Number(o.gyroX ?? o.gyro ?? 0);
    o.gyroY = Number(o.gyroY ?? 0);
    o.gyroZ = Number(o.gyroZ ?? 0);

    // Keep old single value for compatibility
    o.gyro = o.gyroX;

  }

function loadExcelData() {
  // DISABLED: Replaced by WebSocket
  return;
}

// --- UI Updates ---

function applyRowsToUI() {

    if (!currentRows || currentRows.length === 0) return;

    const latest = currentRows[0];
    // -------- SPEED INDICATOR --------
    if (latest.pressure !== undefined) {

        const min = 100;   // pressure minimum
        const max = 115;   // pressure maximum

        let percent = ((latest.pressure - min) / (max - min)) * 100;

        // limit between 0–100
        percent = Math.max(0, Math.min(100, percent));

        // Update percentage text
        const speedText = document.getElementById("speedVal");
        if (speedText) {
            speedText.textContent = percent.toFixed(0) + "%";
        }

        // Update semi-donut gauge
        if (speedChart) {
            speedChart.data.datasets[0].data = [percent, 100 - percent];
            speedChart.update();
        }
    }

    // TDS
    const tdsEl = document.getElementById("tdsNow");
    if (tdsEl && latest.tds !== undefined) {
        tdsEl.textContent = Number(latest.tds).toFixed(2);
    }

    // Turbidity
    const turbEl = document.getElementById("turbNow");
    if (turbEl && latest.turbidity !== undefined) {
        turbEl.textContent = Number(latest.turbidity).toFixed(2);
    }

    // Pressure
    const pressEl = document.getElementById("pressNow");
    if (pressEl && latest.pressure !== undefined) {
        pressEl.textContent = Number(latest.pressure).toFixed(2);
    }

    // Internal Temp
    const intTempEl = document.getElementById("intTempNow");
    if (intTempEl && latest.intTemp !== undefined) {
        intTempEl.textContent = Number(latest.intTemp).toFixed(1);
    }

    // -------- PARAM OVERVIEW INTERNAL TEMP --------
    if (latest.intTemp !== undefined) {
        const intEl = document.getElementById("paramIntTemp");
        if (intEl) intEl.textContent = latest.intTemp.toFixed(1);
    }

    // -------- ACCELERATION XYZ --------
    const ovAccX = document.getElementById("ovAccX");
    const ovAccY = document.getElementById("ovAccY");
    const ovAccZ = document.getElementById("ovAccZ");

    if (latest.accX !== undefined) {
        if (ovAccX) ovAccX.textContent = latest.accX.toFixed(2);
        if (ovAccY) ovAccY.textContent = latest.accY.toFixed(2);
        if (ovAccZ) ovAccZ.textContent = latest.accZ.toFixed(2);
    }


   // -------- GYRO XYZ --------
    const ovGyroX = document.getElementById("ovGyroX");
    const ovGyroY = document.getElementById("ovGyroY");
    const ovGyroZ = document.getElementById("ovGyroZ");

    if (latest.gyroX !== undefined) {
        if (ovGyroX) ovGyroX.textContent = latest.gyroX.toFixed(2);
        if (ovGyroY) ovGyroY.textContent = latest.gyroY.toFixed(2);
        if (ovGyroZ) ovGyroZ.textContent = latest.gyroZ.toFixed(2);
    }

    // -------- PARAM OVERVIEW PRESSURE --------
    if (latest.pressure !== undefined) {
        const pressEl = document.getElementById("paramPressure");
        if (pressEl) pressEl.textContent = latest.pressure.toFixed(2);
    }

    // -------- PARAM OVERVIEW ACC --------
    if (latest.accX !== undefined) {

        const ax = document.getElementById("paramAccX");
        const ay = document.getElementById("paramAccY");
        const az = document.getElementById("paramAccZ");

        if (ax) ax.textContent = latest.accX.toFixed(2);
        if (ay) ay.textContent = latest.accY.toFixed(2);
        if (az) az.textContent = latest.accZ.toFixed(2);
    }

    // -------- PARAM OVERVIEW GYRO --------
    if (latest.gyroX !== undefined) {

        const gx = document.getElementById("paramGyroX");
        const gy = document.getElementById("paramGyroY");
        const gz = document.getElementById("paramGyroZ");

        if (gx) gx.textContent = latest.gyroX.toFixed(2);
        if (gy) gy.textContent = latest.gyroY.toFixed(2);
        if (gz) gz.textContent = latest.gyroZ.toFixed(2);
    }

    // -------- PARAM OVERVIEW TDS --------
    if (latest.tds !== undefined) {
        const tdsEl = document.getElementById("paramTds");
        if (tdsEl) tdsEl.textContent = latest.tds.toFixed(2);
    }

    // -------- PARAM OVERVIEW TURBIDITY --------
    if (latest.turbidity !== undefined) {
        const turbEl = document.getElementById("paramTurb");
        if (turbEl) turbEl.textContent = latest.turbidity.toFixed(2);
    }


    // -------- PARAM OVERVIEW CONDUCTIVITY --------
    if (latest.conductivity !== undefined) {
        const condEl = document.getElementById("paramCond");
        if (condEl) condEl.textContent = latest.conductivity.toFixed(2);
    }

    // External Temp
    const extTempEl = document.getElementById("extTempNow");
    if (extTempEl && latest.extTemp !== undefined) {
        extTempEl.textContent = Number(latest.extTemp).toFixed(1);
    }

    // -------- PARAM OVERVIEW EXTERNAL TEMP --------
    if (latest.extTemp !== undefined) {
        const extEl = document.getElementById("paramExtTemp");
        if (extEl) extEl.textContent = latest.extTemp.toFixed(1);
    }

    // Conductivity
    const condEl = document.getElementById("condNow");
    if (condEl && latest.conductivity !== undefined) {
        condEl.textContent = Number(latest.conductivity).toFixed(2);
    }


    if (tdsTrendChart && latest.tds !== undefined) {

        tdsTrendChart.data.labels.push("");
        tdsTrendChart.data.datasets[0].data.push(latest.tds);

        if (tdsTrendChart.data.labels.length > 50) {
            tdsTrendChart.data.labels.shift();
            tdsTrendChart.data.datasets[0].data.shift();
        }

        tdsTrendChart.update();
    }

    if (turbTrendChart && latest.turbidity !== undefined) {

        turbTrendChart.data.labels.push("");
        turbTrendChart.data.datasets[0].data.push(latest.turbidity);

        if (turbTrendChart.data.labels.length > 50) {
            turbTrendChart.data.labels.shift();
            turbTrendChart.data.datasets[0].data.shift();
        }

        turbTrendChart.update();
    }

    // --- PRESSURE GRAPH UPDATE ---
    if (pressTrendChart && latest.pressure !== undefined) {

        pressTrendChart.data.labels.push("");

        pressTrendChart.data.datasets[0].data.push(
            Number(latest.pressure)
        );

        if (pressTrendChart.data.labels.length > 50) {
            pressTrendChart.data.labels.shift();
            pressTrendChart.data.datasets[0].data.shift();
        }

        pressTrendChart.update();
    }



    // --- CONDUCTIVITY GRAPH UPDATE ---
    if (condTrendChart && latest.conductivity !== undefined) {

        condTrendChart.data.labels.push("");

        condTrendChart.data.datasets[0].data.push(
            Number(latest.conductivity)
        );

        if (condTrendChart.data.labels.length > 50) {
            condTrendChart.data.labels.shift();
            condTrendChart.data.datasets[0].data.shift();
        }

        condTrendChart.update();
    }

    // --- INTERNAL TEMP GRAPH ---
    if (itempTrendChart && latest.intTemp !== undefined) {

        itempTrendChart.data.labels.push("");
        itempTrendChart.data.datasets[0].data.push(Number(latest.intTemp));

        if (itempTrendChart.data.labels.length > 50) {
            itempTrendChart.data.labels.shift();
            itempTrendChart.data.datasets[0].data.shift();
        }

        itempTrendChart.update();
    }

    // --- EXTERNAL TEMP GRAPH ---
    if (etempTrendChart && latest.extTemp !== undefined) {

        etempTrendChart.data.labels.push("");
        etempTrendChart.data.datasets[0].data.push(Number(latest.extTemp));

        if (etempTrendChart.data.labels.length > 50) {
            etempTrendChart.data.labels.shift();
            etempTrendChart.data.datasets[0].data.shift();
        }

        etempTrendChart.update();
    }
}

// ===== START DUMMY ANIMATION =====
    function startDummyFeed() {

      setInterval(() => {

          const data = dummyDataset[dummyIndex];

          currentRows = [data];
          applyRowsToUI();

          dummyIndex++;

          // Infinite smooth loop
          if (dummyIndex >= dummyDataset.length) {
              dummyIndex = 0;
          }

      }, 1000);  // 1 second update
  }


function updateSimulationPage(latest) {
  latest = latest || {}; // Fallback to empty object to show defaults

  const setEl = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };

  setEl('simDepthNow', latest.depth);
  setEl('simSpeedNow', latest.speed);
  setEl('simDepth', (latest.depth || 0) + ' m');
  setEl('simPressure', (latest.pressure ? latest.pressure.toFixed(1) : '--') + ' kPa');
  setEl('simTemp', (latest.etemp ? latest.etemp.toFixed(1) : '--') + ' °C');
  setEl('simVisibility', (Math.max(0, 100 - (latest.turbidity || 0) * 5)).toFixed(1) + ' m');
  setEl('simBattery', Math.round((latest.energy || 4000) / 45) + ' %');
  setEl('simSignal', (85 + Math.random() * 10).toFixed(0) + ' %');
}

// Fixed: Full Analytics Implementation
function initAnalyticsChart() {
  const ctx = document.getElementById('analyticsChart');
  if (!ctx) return;
  if (analyticsChart) analyticsChart.destroy();

  analyticsChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: [],
      datasets: [
        { label: 'pH', borderColor: '#800000', backgroundColor: 'rgba(128,0,0,0.1)', data: [], tension: 0.4, fill: true },
        { label: 'Salinity', borderColor: '#2c3e50', backgroundColor: 'rgba(44,62,80,0.1)', data: [], tension: 0.4, fill: true },
        { label: 'Pressure', borderColor: '#a00000', backgroundColor: 'rgba(160,0,0,0.1)', data: [], tension: 0.4, fill: true }
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: true } },
      scales: { x: { display: true }, y: { display: true } }
    }
  });
}

function updateAnalyticsPage(rows) {
  if (!rows.length) return;

  // Stats
  const phArr = rows.map(r => r.ph).filter(v => v != null);
  const avgPH = phArr.length ? (phArr.reduce((a, b) => a + b, 0) / phArr.length).toFixed(2) : '--';

  const salArr = rows.map(r => r.salinity).filter(v => v != null);
  const avgSal = salArr.length ? (salArr.reduce((a, b) => a + b, 0) / salArr.length).toFixed(2) : '--';

  const pArr = rows.map(r => r.pressure).filter(v => v != null);
  const maxP = pArr.length ? Math.max(...pArr).toFixed(2) : '--';
  const minP = pArr.length ? Math.min(...pArr).toFixed(2) : '--';

  const leakCount = rows.filter(r => r.leak).length;

  const setEl = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  setEl('avgPH', avgPH);
  setEl('avgSal', avgSal);
  setEl('maxPress', maxP);
  setEl('minPress', minP);
  setEl('totalRecords', rows.length);
  setEl('leakEvents', leakCount);

  // Chart
  if (analyticsChart) {
    const slice = rows.slice(-30);
    analyticsChart.data.labels = slice.map((_, i) => i);
    analyticsChart.data.datasets[0].data = slice.map(r => r.ph);
    analyticsChart.data.datasets[1].data = slice.map(r => r.salinity);
    analyticsChart.data.datasets[2].data = slice.map(r => r.pressure);
    analyticsChart.update('none');
  } else {
    initAnalyticsChart();
  }
}

// Exports
window.initAnalyticsChart = initAnalyticsChart;
window.updateAnalyticsPage = updateAnalyticsPage;
window.exportDataFromApp = function (format) { alert("Export feature placeholder"); };
