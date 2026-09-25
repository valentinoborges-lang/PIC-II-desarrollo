const rpmElement = document.querySelector('#rpmValue');
const rangeElement = document.querySelector('#rangeText');
const statusElement = document.querySelector('#status');
const meterElement = document.querySelector('#meterFill');
const toggleButton = document.querySelector('#toggleDemo');

let timer = null;
let rpm = 0;

function classifyRpm(value) {
  if (value === 0) return { label: 'Motor detenido', color: '#667b91' };
  if (value <= 1000) return { label: 'RPM bajas', color: '#4fc3a5' };
  if (value <= 3500) return { label: 'Uso normal', color: '#4d9eea' };
  if (value <= 4500) return { label: 'RPM elevadas', color: '#e39a46' };
  return { label: 'RPM peligrosas', color: '#e15c64' };
}

function render() {
  const state = classifyRpm(rpm);
  rpmElement.textContent = Math.round(rpm).toLocaleString('es-UY');
  rangeElement.textContent = state.label;
  statusElement.textContent = timer ? 'Simulación activa' : 'En espera';
  statusElement.style.background = state.color;
  meterElement.style.width = `${Math.min(100, rpm / 50)}%`;
  meterElement.style.background = state.color;
}

function simulate() {
  const target = 500 + Math.random() * 4300;
  rpm += (target - rpm) * 0.28;
  render();
}

toggleButton.addEventListener('click', () => {
  if (timer) {
    clearInterval(timer);
    timer = null;
    rpm = 0;
    toggleButton.textContent = 'Iniciar simulación';
  } else {
    timer = setInterval(simulate, 700);
    toggleButton.textContent = 'Detener simulación';
    simulate();
  }
  render();
});

render();
