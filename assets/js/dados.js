function parseCsv(text) {
  const rows = [];
  let current = [];
  let value = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const next = text[i + 1];
    if (char === '"') {
      if (quoted && next === '"') { value += '"'; i++; }
      else quoted = !quoted;
    } else if (char === ',' && !quoted) {
      current.push(value); value = '';
    } else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && next === '\n') i++;
      current.push(value); value = '';
      if (current.some(cell => cell.trim() !== '')) rows.push(current);
      current = [];
    } else {
      value += char;
    }
  }
  current.push(value);
  if (current.some(cell => cell.trim() !== '')) rows.push(current);
  return rows;
}

function toNumber(value) {
  if (value === undefined || value === null || value === '') return null;
  const n = Number(String(value).replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}
function fToC(f) { return f === null ? null : (f - 32) * 5 / 9; }
function mphToKmh(mph) { return mph === null ? null : mph * 1.609344; }
function inToMm(input) { return input === null ? null : input * 25.4; }
function fmt(value, decimals = 1) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '-';
  return Number(value).toLocaleString('pt-BR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}
function fmt0(value) { return fmt(value, 0); }
function timeLabel(value) {
  if (!value) return '-';
  const date = new Date(String(value).replace(' ', 'T'));
  if (!Number.isNaN(date.getTime())) return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const match = String(value).match(/(\d{2}:\d{2})/);
  return match ? match[1] : '-';
}
function dateKey(value) {
  if (!value) return null;
  const date = new Date(String(value).replace(' ', 'T'));
  if (!Number.isNaN(date.getTime())) return date.toISOString().slice(0, 10);
  const match = String(value).match(/(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : null;
}
function dateBR(key) {
  if (!key) return '-';
  const [y, m, d] = key.split('-');
  return `${d}/${m}/${y}`;
}
function updateMax(day, field, value, time) {
  if (value === null || Number.isNaN(Number(value))) return;
  if (day[`${field}_max`] === null || value > day[`${field}_max`]) {
    day[`${field}_max`] = value;
    day[`${field}_max_hora`] = time;
  }
}
function updateMin(day, field, value, time) {
  if (value === null || Number.isNaN(Number(value))) return;
  if (day[`${field}_min`] === null || value < day[`${field}_min`]) {
    day[`${field}_min`] = value;
    day[`${field}_min_hora`] = time;
  }
}
function newDay(key) {
  return {
    data: dateBR(key), temp_max: null, temp_max_hora: '-', temp_min: null, temp_min_hora: '-',
    umid_max: null, umid_max_hora: '-', umid_min: null, umid_min_hora: '-',
    vento_max: null, vento_max_hora: '-', vento_min: null, vento_min_hora: '-',
    rajada_max: null, rajada_max_hora: '-', chuva_max: null, chuva_max_hora: '-'
  };
}

async function loadCsvDays() {
  const candidates = ['data/ambientweather_mes.csv', 'data/ambientweather_historico.csv'];
  for (const url of candidates) {
    try {
      const res = await fetch(`${url}?t=${Date.now()}`, { cache: 'no-store' });
      if (!res.ok) continue;
      const text = await res.text();
      const rows = parseCsv(text);
      if (rows.length < 2) continue;
      const headers = rows[0].map(h => h.trim());
      const index = Object.fromEntries(headers.map((h, i) => [h, i]));
      const days = {};
      for (const row of rows.slice(1)) {
        const rawDate = row[index.date_local] || row[index.date_utc] || row[index.date] || row[index.created_at];
        const key = dateKey(rawDate);
        if (!key) continue;
        if (!days[key]) days[key] = newDay(key);
        const t = timeLabel(rawDate);
        const temp = index.temp_c !== undefined ? toNumber(row[index.temp_c]) : fToC(toNumber(row[index.tempf]));
        const hum = toNumber(row[index.humidity]);
        const wind = index.wind_kmh !== undefined ? toNumber(row[index.wind_kmh]) : mphToKmh(toNumber(row[index.windspeedmph]));
        const gust = index.gust_kmh !== undefined ? toNumber(row[index.gust_kmh]) : mphToKmh(toNumber(row[index.windgustmph]));
        const rain = index.dailyrainmm !== undefined ? toNumber(row[index.dailyrainmm]) : inToMm(toNumber(row[index.dailyrainin]));
        updateMax(days[key], 'temp', temp, t); updateMin(days[key], 'temp', temp, t);
        updateMax(days[key], 'umid', hum, t); updateMin(days[key], 'umid', hum, t);
        updateMax(days[key], 'vento', wind, t); updateMin(days[key], 'vento', wind, t);
        updateMax(days[key], 'rajada', gust, t); updateMax(days[key], 'chuva', rain, t);
      }
      return { days: Object.keys(days).sort().reverse().map(key => days[key]), source: url };
    } catch (e) {}
  }
  return null;
}

async function loadJsonFallback() {
  const res = await fetch(`data/clima.json?t=${Date.now()}`, { cache: 'no-store' });
  const json = await res.json();
  const obs = Array.isArray(json.observations) ? json.observations : [];
  const days = {};
  for (const item of obs) {
    const rawDate = item.obsTimeLocal || item.date_local || item.date || item.created_at;
    const key = dateKey(rawDate);
    if (!key) continue;
    if (!days[key]) days[key] = newDay(key);
    const t = timeLabel(rawDate);
    const metric = item.metric || {};
    const temp = toNumber(metric.temp ?? item.temp_c ?? item.temp);
    const hum = toNumber(item.humidity ?? metric.humidity);
    const wind = toNumber(metric.windSpeed ?? item.wind_kmh ?? item.windspeed);
    const gust = toNumber(metric.windGust ?? item.gust_kmh);
    const rain = toNumber(metric.dailyRain ?? item.dailyrainmm ?? item.rain_today);
    updateMax(days[key], 'temp', temp, t); updateMin(days[key], 'temp', temp, t);
    updateMax(days[key], 'umid', hum, t); updateMin(days[key], 'umid', hum, t);
    updateMax(days[key], 'vento', wind, t); updateMin(days[key], 'vento', wind, t);
    updateMax(days[key], 'rajada', gust, t); updateMax(days[key], 'chuva', rain, t);
  }
  return { days: Object.keys(days).sort().reverse().map(key => days[key]), source: 'data/clima.json' };
}

function renderRows(days) {
  const tbody = document.getElementById('dadosBody');
  if (!tbody) return;
  tbody.innerHTML = days.map(day => `
    <tr>
      <td>${day.data}</td>
      <td>${fmt(day.temp_max)}</td><td>${day.temp_max_hora}</td><td>${fmt(day.temp_min)}</td><td>${day.temp_min_hora}</td>
      <td>${fmt0(day.umid_max)}</td><td>${day.umid_max_hora}</td><td>${fmt0(day.umid_min)}</td><td>${day.umid_min_hora}</td>
      <td>${fmt(day.vento_max)}</td><td>${day.vento_max_hora}</td><td>${fmt(day.vento_min)}</td><td>${day.vento_min_hora}</td>
      <td>${fmt(day.rajada_max)}</td><td>${day.rajada_max_hora}</td>
      <td>${fmt(day.chuva_max)}</td><td>${day.chuva_max_hora}</td>
    </tr>
  `).join('');
}

async function initDados() {
  let loaded = await loadCsvDays();
  if (!loaded) loaded = await loadJsonFallback();
  renderRows(loaded.days);
  const info = document.getElementById('dadosFonte');
  if (info) info.textContent = `Fonte carregada: ${loaded.source}. Para histórico completo, envie o CSV mensal para a pasta data pelo Raspberry.`;
}

document.addEventListener('DOMContentLoaded', initDados);
