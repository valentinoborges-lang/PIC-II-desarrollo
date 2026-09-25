export function drawRpmChart(canvas, samples, limits, color) {
  const width = Math.max(260, canvas.clientWidth);
  const height = Math.max(150, canvas.clientHeight);
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(width * ratio);
  canvas.height = Math.round(height * ratio);
  const context = canvas.getContext('2d');
  context.scale(ratio, ratio);
  context.clearRect(0, 0, width, height);
  const padding = { top: 12, right: 8, bottom: 22, left: 2 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;
  context.lineWidth = 1;
  context.strokeStyle = '#edf0ee';
  for (let line = 0; line <= 3; line += 1) {
    const y = padding.top + (plotHeight / 3) * line;
    context.beginPath(); context.moveTo(padding.left, y); context.lineTo(width - padding.right, y); context.stroke();
  }
  const scaleMaximum = Math.max(limits.scaleMax, ...samples.map((sample) => sample.rpm), 1);
  const thresholdLines = [
    { value: limits.lowMax, color: '#eadcae' },
    { value: limits.normalMax, color: '#c9e2d4' },
    { value: limits.highMax, color: '#ead2cf' }
  ];
  for (const threshold of thresholdLines) {
    const y = padding.top + plotHeight - (threshold.value / scaleMaximum) * plotHeight;
    if (y < padding.top || y > padding.top + plotHeight) continue;
    context.save(); context.setLineDash([4, 5]); context.strokeStyle = threshold.color; context.beginPath();
    context.moveTo(padding.left, y); context.lineTo(width - padding.right, y); context.stroke(); context.restore();
  }
  if (!samples.length) {
    context.fillStyle = '#98a19e'; context.font = '11px Inter, Segoe UI, sans-serif';
    context.fillText('Sin muestras en este período', 6, height / 2); return;
  }
  const firstTimestamp = samples[0].timestamp;
  const lastTimestamp = samples.at(-1).timestamp;
  const duration = Math.max(lastTimestamp - firstTimestamp, 1);
  const point = (sample) => ({ x: padding.left + ((sample.timestamp - firstTimestamp) / duration) * plotWidth, y: padding.top + plotHeight - (sample.rpm / scaleMaximum) * plotHeight });
  context.save(); context.beginPath();
  samples.forEach((sample, index) => { const current = point(sample); if (index === 0) context.moveTo(current.x, current.y); else context.lineTo(current.x, current.y); });
  context.lineWidth = 2.25; context.lineJoin = 'round'; context.lineCap = 'round'; context.strokeStyle = color; context.stroke(); context.restore();
  const latest = point(samples.at(-1));
  context.beginPath(); context.arc(latest.x, latest.y, 3.5, 0, Math.PI * 2); context.fillStyle = color; context.fill();
}
