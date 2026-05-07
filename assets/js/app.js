const SITE_DATA_URL = 'data/clima.json';

const fallbackObservation = {
  obsTimeLocal: '2026-05-06 19:11:35',
  humidity: 97,
  metric: { temp: 23.1, windSpeed: 0 }
};

function brNumber(value, decimals = 1) {
  if (value === null || value === undefined || value === '' || Number.isNaN(Number(value))) return '-';
  return Number(value).toLocaleString('pt-BR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function readMetric(obs, keys, fallback = null) {
  for (const key of keys) {
    if (obs && obs[key] !== undefined && obs[key] !== null && obs[key] !== '') return obs[key];
    if (obs && obs.metric && obs.metric[key] !== undefined && obs.metric[key] !== null && obs.metric[key] !== '') return obs.metric[key];
  }
  return fallback;
}

function parseDateLabel(value) {
  if (!value) return '--/-- --:--';
  const raw = String(value).replace(' ', 'T');
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

function hourLabel(value) {
  if (!value) return '--:--';
  const raw = String(value).replace(' ', 'T');
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) {
    const m = String(value).match(/(\d{2}:\d{2})/);
    return m ? m[1] : String(value);
  }
  return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function windDirection(degrees) {
  if (degrees === null || degrees === undefined || degrees === '' || Number.isNaN(Number(degrees))) return '-';
  const dirs = ['N', 'NE', 'L', 'SE', 'S', 'SO', 'O', 'NO'];
  return dirs[Math.round(Number(degrees) / 45) % 8];
}

function classifyWeather(temp, wind, rain) {
  if (Number(rain) > 5) return { text: 'Chuva forte', cls: 'status-rain' };
  if (Number(rain) > 0) return { text: 'Chuva leve', cls: 'status-rain' };
  if (Number(wind) > 30) return { text: 'Vento forte', cls: 'status-wind' };
  if (Number(temp) > 33) return { text: 'Calor extremo', cls: 'status-hot' };
  if (Number(temp) > 28) return { text: 'Calor', cls: 'status-hot' };
  if (Number(temp) < 5) return { text: 'Frio intenso', cls: 'status-cold' };
  if (Number(temp) < 12) return { text: 'Frio', cls: 'status-cold' };
  return { text: 'Estável', cls: 'status-ok' };
}

async function loadWeatherData() {
  try {
    const res = await fetch(`${SITE_DATA_URL}?t=${Date.now()}`, { cache: 'no-store' });
    if (!res.ok) throw new Error('JSON não encontrado');
    const json = await res.json();
    const observations = Array.isArray(json.observations) && json.observations.length ? json.observations : [fallbackObservation];
    return { observations, latest: observations[0] };
  } catch (err) {
    return { observations: [fallbackObservation], latest: fallbackObservation, error: err.message };
  }
}

function setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

function fillDashboard(latest, observations, error = '') {
  const temp = readMetric(latest, ['temp', 'temp_c', 'temperature'], null);
  const humidity = readMetric(latest, ['humidity', 'hum', 'outhumidity'], null);
  const wind = readMetric(latest, ['windSpeed', 'wind_kmh', 'windspeedkmh', 'windspeed'], 0);
  const gust = readMetric(latest, ['windGust', 'gust', 'gust_kmh', 'windgustkmh'], 0);
  const pressure = readMetric(latest, ['pressure', 'pressure_hpa', 'baromrel_hpa'], null);
  const rain = readMetric(latest, ['dailyRain', 'dailyrainmm', 'rain_day', 'rain_today'], 0);
  const feels = readMetric(latest, ['feelsLike', 'feelslike_c'], temp);
  const uv = readMetric(latest, ['uv'], 0);
  const solar = readMetric(latest, ['solarRadiation', 'solarradiation'], 0);
  const dir = readMetric(latest, ['winddir', 'windDir'], null);
  const dirText = windDirection(dir);
  const date = latest.obsTimeLocal || latest.date_local || latest.date || latest.created_at || latest.time;
  const status = classifyWeather(temp, wind, rain);

  setText('updatedAt', parseDateLabel(date));
  setText('updatedAtCard', parseDateLabel(date));
  setText('windDirMeta', dirText);
  setText('statusText', status.text);
  const statusEl = document.getElementById('statusText');
  if (statusEl) statusEl.className = `status-value ${status.cls}`;

  setText('statusDescription', `Temperatura percebida de ${brNumber(feels)} °C, vento médio de ${brNumber(wind)} km/h e chuva acumulada de ${brNumber(rain)} mm.`);
  setText('tempValue', `${brNumber(temp)} °C`);
  setText('humValue', `${brNumber(humidity, 0)} %`);
  setText('windValue', `${brNumber(wind)} km/h`);
  setText('rainValue', `${brNumber(rain)} mm`);
  setText('pressureValue', pressure === null ? '-' : `${brNumber(pressure)} hPa`);
  setText('gustValue', `${brNumber(gust)} km/h`);
  setText('uvValue', brNumber(uv));
  setText('solarValue', `${brNumber(solar, 0)} W/m²`);
  setText('dirValue', dirText);

  if (error) {
    const warning = document.getElementById('dataWarning');
    if (warning) {
      warning.hidden = false;
      warning.textContent = 'Não foi possível carregar data/clima.json. Mostrando dados de exemplo enviados no pacote.';
    }
  }

  renderChart(observations);
}

function renderChart(observations) {
  const canvas = document.getElementById('weatherChart');
  if (!canvas || typeof Chart === 'undefined') return;

  const ordered = [...observations].slice(-48).reverse();
  const labels = ordered.map(obs => hourLabel(obs.obsTimeLocal || obs.date_local || obs.date || obs.created_at || obs.time));
  const temps = ordered.map(obs => Number(readMetric(obs, ['temp', 'temp_c', 'temperature'], null)));
  const hums = ordered.map(obs => Number(readMetric(obs, ['humidity', 'hum', 'outhumidity'], null)));
  const winds = ordered.map(obs => Number(readMetric(obs, ['windSpeed', 'wind_kmh', 'windspeedkmh', 'windspeed'], null)));

  new Chart(canvas, {
    type: 'line',
    data: {
      labels,
      datasets: [
        { label: 'Temperatura °C', data: temps, borderColor: '#4cc9f0', backgroundColor: 'rgba(76,201,240,.12)', tension: .35, fill: true },
        { label: 'Umidade %', data: hums, borderColor: '#72efdd', backgroundColor: 'rgba(114,239,221,.08)', tension: .35, fill: false },
        { label: 'Vento km/h', data: winds, borderColor: '#ffb703', backgroundColor: 'rgba(255,183,3,.08)', tension: .35, fill: false }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { labels: { color: '#ecf4ff' } },
        tooltip: { backgroundColor: 'rgba(8,17,31,.95)', titleColor: '#ecf4ff', bodyColor: '#ecf4ff' }
      },
      scales: {
        x: { ticks: { color: '#98a8c2', maxRotation: 0 }, grid: { color: 'rgba(255,255,255,.05)' } },
        y: { ticks: { color: '#98a8c2' }, grid: { color: 'rgba(255,255,255,.05)' } }
      }
    }
  });
}

function refreshCameraImage() {
  const img = document.getElementById('latestImage');
  if (!img) return;
  img.src = `media/latest.jpg?t=${Date.now()}`;
}

function setupCamera() {
  const img = document.getElementById('latestImage');
  if (img) {
    img.addEventListener('error', () => {
      if (!img.dataset.fallback) {
        img.dataset.fallback = '1';
        img.src = 'assets/img/placeholder-camera.svg';
      }
    });
    setInterval(refreshCameraImage, 5000);
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  const { latest, observations, error } = await loadWeatherData();
  fillDashboard(latest, observations, error);
  setupCamera();
});
