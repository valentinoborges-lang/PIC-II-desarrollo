import { DEFAULT_LIMITS } from '../utils/rpmClassification.js';

const MAX_SAMPLES_PER_SENSOR = 20_000;

export class MeasurementStore {
  constructor({ staleAfter = 10_000, defaultLimits = DEFAULT_LIMITS } = {}) {
    this.sensors = new Map();
    this.staleAfter = staleAfter;
    this.defaultLimits = { ...DEFAULT_LIMITS, ...defaultLimits };
  }

  addMeasurement(payload, source = 'websocket') {
    const device = String(payload?.device || '').trim();
    const sensorCode = String(payload?.sensor || '').trim();
    const rpm = Number(payload?.rpm);
    if (!device || !sensorCode || !Number.isFinite(rpm) || rpm < 0) return null;
    const id = `${device}::${sensorCode}`;
    const existing = this.sensors.get(id);
    const incomingTimestamp = Number(payload.timestamp);
    const timestamp = Number.isFinite(incomingTimestamp) ? (incomingTimestamp < 1_000_000_000_000 ? incomingTimestamp * 1000 : incomingTimestamp) : Date.now();
    const safeTimestamp = Math.min(timestamp, Date.now() + 5000);
    const name = String(payload.name || '').trim() || `Tacómetro ${this.sensors.size + 1}`;
    const record = existing || { id, device, sensor: sensorCode, name, rpm: 0, history: [], limits: { ...this.defaultLimits }, source, lastUpdate: safeTimestamp };
    record.rpm = Math.round(rpm);
    record.lastUpdate = safeTimestamp;
    record.source = source;
    record.history.push({ timestamp: safeTimestamp, rpm: record.rpm });
    if (record.history.length > MAX_SAMPLES_PER_SENSOR) record.history.splice(0, record.history.length - MAX_SAMPLES_PER_SENSOR);
    this.sensors.set(id, record);
    return record;
  }

  updateSensor(id, changes) {
    const sensor = this.sensors.get(id);
    if (!sensor) return null;
    if (changes.name) sensor.name = changes.name;
    if (changes.limits) sensor.limits = { ...sensor.limits, ...changes.limits };
    return sensor;
  }

  setDefaultLimits(limits, { applyToExisting = false } = {}) {
    this.defaultLimits = { ...DEFAULT_LIMITS, ...limits };
    if (applyToExisting) {
      for (const sensor of this.sensors.values()) sensor.limits = { ...this.defaultLimits };
    }
  }

  removeSource(source) {
    for (const [id, sensor] of this.sensors.entries()) if (sensor.source === source) this.sensors.delete(id);
  }

  getSensor(id) { return this.sensors.get(id); }
  getSensors() { return [...this.sensors.values()].sort((a, b) => a.name.localeCompare(b.name, 'es')); }
}
