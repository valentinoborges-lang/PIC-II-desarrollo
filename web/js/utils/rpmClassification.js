export const DEFAULT_LIMITS = Object.freeze({ lowMax: 1000, normalMax: 3500, highMax: 4500, scaleMax: 6000 });

export function classifyRpm(rpm, limits = DEFAULT_LIMITS, hasSignal = true) {
  if (!hasSignal || rpm === null || rpm === undefined || !Number.isFinite(Number(rpm))) return { key: 'offline', label: 'Sin señal', color: '#8b9591' };
  const value = Number(rpm);
  if (value <= 0) return { key: 'stopped', label: 'Detenido', color: '#8b9591' };
  if (value <= limits.lowMax) return { key: 'low', label: 'Bajas / ralentí', color: '#c49328' };
  if (value <= limits.normalMax) return { key: 'normal', label: 'Uso normal', color: '#2e9762' };
  if (value <= limits.highMax) return { key: 'high', label: 'RPM elevadas', color: '#d87832' };
  return { key: 'danger', label: 'RPM peligrosas', color: '#c84f49' };
}
