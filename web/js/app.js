import { drawRpmChart } from './components/rpmChart.js';
import { MeasurementStore } from './services/measurementStore.js';
import { WebSocketManager } from './services/websocket.js';
import { classifyRpm, DEFAULT_LIMITS } from './utils/rpmClassification.js';
import { calculateStatistics, filterSamples, formatRpm, sampleMeasurements } from './utils/statistics.js';

const PREFERENCES_KEY = 'pic-ii-tachometer-preferences-v1';
const VALID_TIME_RANGES = new Set(['10s', '30s', '1m', '5m', '15m', '1h', 'all']);
const VALID_SAMPLE_PERIODS = new Set([0, 250, 500, 1000, 2000, 5000]);

function limitsAreOrdered(limits) {
  return Number.isFinite(limits.lowMax)
    && limits.lowMax >= 0
    && limits.normalMax > limits.lowMax
    && limits.highMax > limits.normalMax
    && limits.scaleMax >= limits.highMax;
}

function loadPreferences() {
  const defaults = { limits: { ...DEFAULT_LIMITS }, timeRange: '30s', samplePeriodMs: 1000 };
  try {
    const saved = JSON.parse(localStorage.getItem(PREFERENCES_KEY) || 'null');
    if (!saved || typeof saved !== 'object') return defaults;
    const limits = { ...defaults.limits, ...saved.limits };
    return {
      limits: limitsAreOrdered(limits) ? limits : defaults.limits,
      timeRange: VALID_TIME_RANGES.has(saved.timeRange) ? saved.timeRange : defaults.timeRange,
      samplePeriodMs: VALID_SAMPLE_PERIODS.has(Number(saved.samplePeriodMs)) ? Number(saved.samplePeriodMs) : defaults.samplePeriodMs
    };
  } catch {
    return defaults;
  }
}

let preferences = loadPreferences();
const store = new MeasurementStore({ defaultLimits: preferences.limits });
const demoTargets = new Map();
let demoTimer = null;
let demoActive = true;
let selectedRange = preferences.timeRange;
let samplePeriodMs = preferences.samplePeriodMs;
let toastTimer = null;

const elements = {
  grid: document.querySelector('#tachometerGrid'),
  empty: document.querySelector('#emptyState'),
  demoToggle: document.querySelector('#demoToggle'),
  demoLabel: document.querySelector('#demoButtonLabel'),
  timeRange: document.querySelector('#timeRange'),
  samplePeriod: document.querySelector('#samplePeriod'),
  generalConnection: document.querySelector('#generalConnection'),
  connectionsList: document.querySelector('#connectionsList'),
  settingsModal: document.querySelector('#settingsModal'),
  rangeModal: document.querySelector('#rangeModal'),
  connectionModal: document.querySelector('#connectionModal'),
  settingsForm: document.querySelector('#settingsForm'),
  rangeForm: document.querySelector('#rangeForm'),
  connectionForm: document.querySelector('#connectionForm'),
  toast: document.querySelector('#toast')
};

function savePreferences() {
  preferences = { limits: { ...preferences.limits }, timeRange: selectedRange, samplePeriodMs };
  try { localStorage.setItem(PREFERENCES_KEY, JSON.stringify(preferences)); } catch { /* El dashboard funciona igualmente sin almacenamiento local. */ }
}

const websocketManager = new WebSocketManager({
  onMeasurement: (payload) => {
    const sensor = store.addMeasurement(payload, 'websocket');
    if (sensor) render();
  },
  onStateChange: () => render()
});

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function relativeTime(timestamp) {
  if (!timestamp) return 'sin datos';
  const seconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
  if (seconds < 2) return 'ahora';
  if (seconds < 60) return `hace ${seconds} s`;
  return `hace ${Math.floor(seconds / 60)} min`;
}

function isSignalActive(sensor) {
  return Date.now() - sensor.lastUpdate <= store.staleAfter;
}

function formatSamplePeriod(period) {
  if (!period) return 'cada lectura';
  if (period < 1000) return `${period} ms`;
  return `${period / 1000} s`;
}

function renderCard(sensor) {
  const samples = filterSamples(sensor.history, selectedRange);
  const chartSamples = sampleMeasurements(samples, samplePeriodMs);
  const stats = calculateStatistics(samples);
  const signalActive = isSignalActive(sensor);
  const state = classifyRpm(sensor.rpm, sensor.limits, signalActive);
  const stateWarning = state.key === 'danger' ? '<p class="state-warning">RPM por encima del límite configurado</p>' : '';

  return `
    <article class="tachometer-card ${state.key === 'danger' ? 'danger' : ''}" style="--state-color:${state.color}" data-sensor-id="${escapeHtml(sensor.id)}">
      <div class="card-heading">
        <div class="sensor-title-group">
          <h3 title="${escapeHtml(sensor.name)}">${escapeHtml(sensor.name)}</h3>
          <p>${escapeHtml(sensor.device)} · Sensor ${escapeHtml(sensor.sensor)}</p>
        </div>
        <button class="icon-button" type="button" data-action="settings" data-sensor-id="${escapeHtml(sensor.id)}" aria-label="Configurar ${escapeHtml(sensor.name)}">•••</button>
      </div>
      <div class="reading-row">
        <div class="reading-block" aria-label="${formatRpm(sensor.rpm)} revoluciones por minuto">
          <span class="rpm-value">${formatRpm(sensor.rpm)}</span><span class="rpm-unit">RPM</span>
        </div>
        <div class="state-panel">
          <span class="state-badge"><span></span>${state.label}</span>
          ${stateWarning}
        </div>
      </div>
      <div class="stats-row" aria-label="Estadísticas del período">
        <div><span>Máxima</span><strong>${formatRpm(stats.max)}</strong></div>
        <div><span>Mínima</span><strong>${formatRpm(stats.min)}</strong></div>
        <div><span>Promedio</span><strong>${formatRpm(stats.average)}</strong></div>
      </div>
      <div class="chart-wrap">
        <canvas class="rpm-chart" data-chart-for="${escapeHtml(sensor.id)}" aria-label="Histórico de RPM de ${escapeHtml(sensor.name)}"></canvas>
        <p class="chart-caption">${chartSamples.length} puntos · muestreo ${formatSamplePeriod(samplePeriodMs)} · límites ${formatRpm(sensor.limits.lowMax)} / ${formatRpm(sensor.limits.normalMax)} / ${formatRpm(sensor.limits.highMax)}</p>
      </div>
      <div class="card-footer">
        <span class="${signalActive ? '' : 'signal-lost'}"><i class="live-dot"></i>${signalActive ? 'Recibiendo datos' : 'Sin señal'}</span>
        <span>Actualizado ${relativeTime(sensor.lastUpdate)}</span>
      </div>
    </article>`;
}

function renderSummary(sensors, connections) {
  const connected = connections.filter((connection) => connection.status === 'connected').length;
  const currentSamples = sensors.flatMap((sensor) => filterSamples(sensor.history, selectedRange));
  const globalMax = currentSamples.length ? Math.max(...currentSamples.map((sample) => sample.rpm)) : null;
  const hasDanger = sensors.some((sensor) => classifyRpm(sensor.rpm, sensor.limits, isSignalActive(sensor)).key === 'danger');
  const hasSignal = sensors.some(isSignalActive);

  document.querySelector('#summarySensors').textContent = sensors.length;
  document.querySelector('#summarySensorsHint').textContent = sensors.length === 1 ? '1 tarjeta activa' : `${sensors.length} tarjetas activas`;
  document.querySelector('#summaryConnections').textContent = connected;
  document.querySelector('#summaryConnectionsHint').textContent = connected ? `${connected} conexión${connected === 1 ? '' : 'es'} en línea` : (demoActive ? 'Datos de simulación' : 'Sin conexiones reales');
  document.querySelector('#summaryMaxRpm').textContent = formatRpm(globalMax);

  const statusElement = document.querySelector('#summarySystemStatus');
  const hintElement = document.querySelector('#summarySystemHint');
  statusElement.className = 'summary-status';
  if (hasDanger) {
    statusElement.textContent = 'Atención';
    statusElement.classList.add('danger');
    hintElement.textContent = 'Hay un motor en zona peligrosa';
  } else if (hasSignal) {
    statusElement.textContent = 'Operativo';
    statusElement.classList.add('operational');
    hintElement.textContent = demoActive && !connected ? 'Modo demo en ejecución' : 'Sensores recibiendo datos';
  } else if (sensors.length) {
    statusElement.textContent = 'Sin señal';
    statusElement.classList.add('warning');
    hintElement.textContent = 'No se reciben muestras recientes';
  } else {
    statusElement.textContent = 'En espera';
    hintElement.textContent = 'Activa la demo o conecta un dispositivo';
  }
}

function connectionStatusLabel(status) {
  return ({ connecting: 'conectando', connected: 'conectado', disconnected: 'sin conexión' })[status] || 'sin conexión';
}

function renderConnections(connections) {
  if (!connections.length) {
    elements.connectionsList.innerHTML = '<div class="connections-empty">No hay conexiones WebSocket configuradas. El modo demo funciona de forma independiente.</div>';
    return;
  }
  elements.connectionsList.innerHTML = connections.map((connection) => `
    <article class="connection-item">
      <div class="connection-identity"><strong>${escapeHtml(connection.name)}</strong><span>${escapeHtml(connection.url)}</span></div>
      <span class="connection-state"><i class="connection-status-dot status-${connection.status}"></i>${connectionStatusLabel(connection.status)}</span>
      <button class="connection-action" type="button" data-connection-action="${connection.status === 'connected' || connection.status === 'connecting' ? 'disconnect' : 'reconnect'}" data-connection-id="${escapeHtml(connection.id)}">
        ${connection.status === 'connected' || connection.status === 'connecting' ? 'Desconectar' : 'Reconectar'}
      </button>
    </article>`).join('');
}

function renderGeneralConnection(connections) {
  const connected = connections.filter((connection) => connection.status === 'connected').length;
  const connecting = connections.some((connection) => connection.status === 'connecting');
  if (connected) {
    elements.generalConnection.innerHTML = `<span class="status-dot"></span><span>${connected} dispositivo${connected === 1 ? '' : 's'} conectado${connected === 1 ? '' : 's'}</span>`;
  } else if (connecting) {
    elements.generalConnection.innerHTML = '<span class="status-dot status-connecting"></span><span>Conectando…</span>';
  } else if (demoActive) {
    elements.generalConnection.innerHTML = '<span class="status-dot status-demo"></span><span>Simulación activa</span>';
  } else {
    elements.generalConnection.innerHTML = '<span class="status-dot status-idle"></span><span>Sin conexión</span>';
  }
}

function drawAllCharts(sensors) {
  for (const sensor of sensors) {
    const canvas = [...document.querySelectorAll('[data-chart-for]')].find((element) => element.dataset.chartFor === sensor.id);
    if (!canvas) continue;
    const samples = filterSamples(sensor.history, selectedRange);
    const chartSamples = sampleMeasurements(samples, samplePeriodMs);
    const state = classifyRpm(sensor.rpm, sensor.limits, isSignalActive(sensor));
    drawRpmChart(canvas, chartSamples, sensor.limits, state.color);
  }
}

function render() {
  const sensors = store.getSensors();
  const connections = websocketManager.getConnections();
  elements.grid.innerHTML = sensors.map(renderCard).join('');
  elements.empty.hidden = sensors.length > 0;
  elements.grid.hidden = sensors.length === 0;
  renderSummary(sensors, connections);
  renderConnections(connections);
  renderGeneralConnection(connections);
  requestAnimationFrame(() => drawAllCharts(sensors));
}

function showToast(message) {
  clearTimeout(toastTimer);
  elements.toast.textContent = message;
  elements.toast.classList.add('visible');
  toastTimer = setTimeout(() => elements.toast.classList.remove('visible'), 2500);
}

function seedDemoSensor(definition, count = 38) {
  const now = Date.now();
  let value = definition.base;
  for (let index = count; index >= 1; index -= 1) {
    value += (Math.random() - 0.5) * definition.variance * 0.18;
    store.addMeasurement({ ...definition, rpm: Math.max(0, Math.round(value)), timestamp: now - index * 800 }, 'demo');
  }
  demoTargets.set(`${definition.device}::${definition.sensor}`, definition.base);
}

function simulateDemoStep() {
  const definitions = [
    { device: 'ESP32-01', sensor: 'M1', name: 'Motor principal', base: 2300, variance: 420 },
    { device: 'ESP32-01', sensor: 'M2', name: 'Motor auxiliar', base: 1250, variance: 240 }
  ];
  for (const definition of definitions) {
    const id = `${definition.device}::${definition.sensor}`;
    const sensor = store.getSensor(id);
    if (!sensor) { seedDemoSensor(definition); continue; }
    let target = demoTargets.get(id) ?? definition.base;
    if (Math.random() < 0.07) {
      target = definition.base + (Math.random() - 0.5) * definition.variance;
      demoTargets.set(id, target);
    }
    const wave = Math.sin(Date.now() / (id.endsWith('M1') ? 1650 : 2100)) * definition.variance * 0.07;
    const noise = (Math.random() - 0.5) * definition.variance * 0.025;
    const rpm = sensor.rpm + (target - sensor.rpm) * 0.12 + wave + noise;
    store.addMeasurement({ ...definition, rpm: Math.max(0, Math.round(rpm)) }, 'demo');
  }
  render();
}

function startDemo() {
  if (demoTimer) return;
  demoActive = true;
  elements.demoToggle.setAttribute('aria-pressed', 'true');
  elements.demoLabel.textContent = 'Demo activo';
  simulateDemoStep();
  demoTimer = setInterval(simulateDemoStep, 800);
}

function stopDemo() {
  demoActive = false;
  clearInterval(demoTimer);
  demoTimer = null;
  demoTargets.clear();
  store.removeSource('demo');
  elements.demoToggle.setAttribute('aria-pressed', 'false');
  elements.demoLabel.textContent = 'Probar demo';
  render();
}

function toggleDemo() {
  if (demoActive) { stopDemo(); showToast('Modo demo desactivado'); }
  else { startDemo(); showToast('Modo demo activado'); }
}

function openSettings(sensorId) {
  const sensor = store.getSensor(sensorId);
  if (!sensor) return;
  document.querySelector('#settingsSensorId').value = sensor.id;
  document.querySelector('#settingsName').value = sensor.name;
  document.querySelector('#settingsLow').value = sensor.limits.lowMax;
  document.querySelector('#settingsNormal').value = sensor.limits.normalMax;
  document.querySelector('#settingsHigh').value = sensor.limits.highMax;
  document.querySelector('#settingsScale').value = sensor.limits.scaleMax;
  document.querySelector('#settingsError').textContent = '';
  elements.settingsModal.showModal();
}

function openConnectionModal() {
  document.querySelector('#connectionError').textContent = '';
  elements.connectionModal.showModal();
}

function fillRangeForm(limits) {
  document.querySelector('#rangeLow').value = limits.lowMax;
  document.querySelector('#rangeNormal').value = limits.normalMax;
  document.querySelector('#rangeHigh').value = limits.highMax;
  document.querySelector('#rangeScale').value = limits.scaleMax;
  document.querySelector('#rangeError').textContent = '';
}

function openRangeModal() {
  fillRangeForm(preferences.limits);
  elements.rangeModal.showModal();
}

function readRangeForm() {
  return {
    lowMax: Number(document.querySelector('#rangeLow').value),
    normalMax: Number(document.querySelector('#rangeNormal').value),
    highMax: Number(document.querySelector('#rangeHigh').value),
    scaleMax: Number(document.querySelector('#rangeScale').value)
  };
}

elements.settingsForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const limits = {
    lowMax: Number(document.querySelector('#settingsLow').value),
    normalMax: Number(document.querySelector('#settingsNormal').value),
    highMax: Number(document.querySelector('#settingsHigh').value),
    scaleMax: Number(document.querySelector('#settingsScale').value)
  };
  const name = document.querySelector('#settingsName').value.trim();
  if (!name || !limitsAreOrdered(limits)) {
    document.querySelector('#settingsError').textContent = 'Revisa el nombre y asegúrate de que cada límite sea mayor que el anterior.';
    return;
  }
  store.updateSensor(document.querySelector('#settingsSensorId').value, { name, limits });
  elements.settingsModal.close();
  render();
  showToast('Configuración guardada');
});

elements.rangeForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const limits = readRangeForm();
  if (!limitsAreOrdered(limits)) {
    document.querySelector('#rangeError').textContent = 'Cada límite debe ser mayor que el anterior y la escala debe incluir el rango alto.';
    return;
  }
  preferences.limits = limits;
  store.setDefaultLimits(limits, { applyToExisting: true });
  savePreferences();
  elements.rangeModal.close();
  render();
  showToast('Rangos aplicados a todos los tacómetros');
});

elements.connectionForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const name = document.querySelector('#connectionName').value.trim();
  const url = document.querySelector('#connectionUrl').value.trim();
  let validUrl = false;
  try { validUrl = ['ws:', 'wss:'].includes(new URL(url).protocol); } catch { validUrl = false; }
  if (!name || !validUrl) {
    document.querySelector('#connectionError').textContent = 'Introduce un nombre y una dirección ws:// o wss:// válida.';
    return;
  }
  websocketManager.connect({ name, url });
  elements.connectionModal.close();
  showToast(`Conectando con ${name}`);
  render();
});

document.addEventListener('click', (event) => {
  const settingsButton = event.target.closest('[data-action="settings"]');
  if (settingsButton) openSettings(settingsButton.dataset.sensorId);
  const closeButton = event.target.closest('[data-close-dialog]');
  if (closeButton) document.querySelector(`#${closeButton.dataset.closeDialog}`).close();
  const connectionAction = event.target.closest('[data-connection-action]');
  if (connectionAction) {
    const { connectionAction: action, connectionId: id } = connectionAction.dataset;
    if (action === 'disconnect') websocketManager.disconnect(id);
    if (action === 'reconnect') websocketManager.reconnect(id);
  }
});

elements.demoToggle.addEventListener('click', toggleDemo);
document.querySelector('#emptyDemoButton').addEventListener('click', startDemo);
document.querySelector('#openConnectionModal').addEventListener('click', openConnectionModal);
document.querySelector('#emptyConnectButton').addEventListener('click', openConnectionModal);
document.querySelector('#addAnotherConnection').addEventListener('click', openConnectionModal);
document.querySelector('#openRangeModal').addEventListener('click', openRangeModal);
document.querySelector('#resetRanges').addEventListener('click', () => fillRangeForm(DEFAULT_LIMITS));
elements.timeRange.value = selectedRange;
elements.samplePeriod.value = String(samplePeriodMs);
elements.timeRange.addEventListener('change', () => {
  selectedRange = elements.timeRange.value;
  savePreferences();
  render();
});
elements.samplePeriod.addEventListener('change', () => {
  samplePeriodMs = Number(elements.samplePeriod.value);
  savePreferences();
  render();
});
window.addEventListener('resize', () => drawAllCharts(store.getSensors()));
setInterval(() => { if (!demoActive) render(); }, 1000);

startDemo();
