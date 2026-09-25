const RANGE_MILLISECONDS = { '10s': 10_000, '30s': 30_000, '1m': 60_000, '5m': 300_000, '15m': 900_000, '1h': 3_600_000, all: Infinity };

export function filterSamples(samples, rangeKey, now = Date.now()) {
  const duration = RANGE_MILLISECONDS[rangeKey] ?? RANGE_MILLISECONDS['30s'];
  if (duration === Infinity) return samples;
  const minimum = now - duration;
  return samples.filter((sample) => sample.timestamp >= minimum);
}

export function sampleMeasurements(samples, periodMs) {
  const period = Number(periodMs);
  if (!Number.isFinite(period) || period <= 0 || samples.length < 2) return samples;
  const sampled = [];
  let bucket = null;
  for (const sample of samples) {
    const nextBucket = Math.floor(sample.timestamp / period);
    if (nextBucket !== bucket) {
      sampled.push(sample);
      bucket = nextBucket;
    } else {
      sampled[sampled.length - 1] = sample;
    }
  }
  return sampled;
}

export function calculateStatistics(samples) {
  if (!samples.length) return { min: null, max: null, average: null };
  let min = Infinity;
  let max = -Infinity;
  let sum = 0;
  for (const sample of samples) {
    min = Math.min(min, sample.rpm);
    max = Math.max(max, sample.rpm);
    sum += sample.rpm;
  }
  return { min, max, average: sum / samples.length };
}

const rpmFormatter = new Intl.NumberFormat('es-UY', { maximumFractionDigits: 0 });
export function formatRpm(value) {
  return value === null || value === undefined || !Number.isFinite(Number(value)) ? '—' : rpmFormatter.format(Math.round(Number(value)));
}
