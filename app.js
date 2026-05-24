const refreshButton = document.querySelector('#refreshButton');
const todayMetric = document.querySelector('#todayMetric');
const rangeLabel = document.querySelector('#rangeLabel');
const statusRows = document.querySelector('#statusRows');
const pivoRangeLabel = document.querySelector('#pivoRangeLabel');
const pivoHead = document.querySelector('#pivoHead');
const pivoRows = document.querySelector('#pivoRows');
const bioRangeLabel = document.querySelector('#bioRangeLabel');
const bioHead = document.querySelector('#bioHead');
const bioRows = document.querySelector('#bioRows');
const tabButtons = document.querySelectorAll('.tab-button');

const spreadsheetId = '1mGjbaGPV7p1V5VTQtgFJNnjf8sJSjHle3ejgO9Id2zo';
const defaultIrrigationColumns = [5, 10, 15, 20];
const extendedIrrigationColumns = [5, 10, 15, 20, 25, 30, 35, 40];
const defaultBioColumns = [
  { index: 6, piquete: 'P1' },
  { index: 11, piquete: 'P2' },
  { index: 16, piquete: 'P3' },
  { index: 21, piquete: 'P4' },
];
const extendedBioColumns = [
  ...defaultBioColumns,
  { index: 26, piquete: 'P5' },
  { index: 31, piquete: 'P6' },
  { index: 36, piquete: 'P7' },
  { index: 41, piquete: 'P8' },
];
const pivoSheets = [
  { name: 'Erva', irrigationColumns: defaultIrrigationColumns, bioColumns: defaultBioColumns },
  { name: 'Meio', irrigationColumns: defaultIrrigationColumns, bioColumns: defaultBioColumns },
  { name: 'Sedevelha', irrigationColumns: defaultIrrigationColumns, bioColumns: defaultBioColumns },
  { name: 'Ponta', irrigationColumns: defaultIrrigationColumns, bioColumns: defaultBioColumns },
  { name: 'Novo', irrigationColumns: defaultIrrigationColumns, bioColumns: defaultBioColumns },
  { name: 'Cascalho', irrigationColumns: extendedIrrigationColumns, bioColumns: extendedBioColumns },
  { name: 'Retiro', irrigationColumns: extendedIrrigationColumns, bioColumns: extendedBioColumns },
];

refreshButton.addEventListener('click', loadSheet);
tabButtons.forEach((button) => button.addEventListener('click', () => activateTab(button.dataset.tab)));
loadSheet();

async function loadSheet() {
  refreshButton.disabled = true;
  refreshButton.textContent = 'Atualizando...';
  statusRows.innerHTML = '<tr><td colspan="2" class="loading-cell">Carregando...</td></tr>';
  pivoHead.innerHTML = '<tr><th>Pivô</th></tr>';
  pivoRows.innerHTML = '<tr><td class="loading-cell">Carregando...</td></tr>';
  bioHead.innerHTML = '<tr><th>Pivô</th></tr>';
  bioRows.innerHTML = '<tr><td class="loading-cell">Carregando...</td></tr>';

  try {
    const sheets = await Promise.all(pivoSheets.map(loadPivoSheet));
    const ervaSheet = sheets.find((sheet) => sheet.name === 'Erva');
    const filledDates = readFilledDatesFromColumnA(ervaSheet.rows);

    renderStatusTable(filledDates);
    renderPivoTable(sheets);
    renderBioinsumoTable(sheets);
  } catch (error) {
    rangeLabel.textContent = 'Erro ao carregar';
    pivoRangeLabel.textContent = 'Erro ao carregar';
    bioRangeLabel.textContent = 'Erro ao carregar';
    statusRows.innerHTML = `<tr><td colspan="2" class="loading-cell">${error.message}</td></tr>`;
    pivoRows.innerHTML = `<tr><td class="loading-cell">${error.message}</td></tr>`;
    bioRows.innerHTML = `<tr><td class="loading-cell">${error.message}</td></tr>`;
  } finally {
    refreshButton.disabled = false;
    refreshButton.textContent = 'Atualizar';
  }
}

async function loadPivoSheet(sheet) {
  const rows = await loadGoogleSheetRows(sheet.name);
  return {
    name: sheet.name,
    rows,
    irrigationSums: readSumsByDate(rows, sheet.irrigationColumns),
    rainSums: readSumsByDate(rows, [1]),
    bioSums: readBioinsumoByDate(rows, sheet.bioColumns),
  };
}

function loadGoogleSheetRows(sheetName) {
  return new Promise((resolve, reject) => {
    const callbackName = `handleSheet_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const script = document.createElement('script');
    const timeout = window.setTimeout(() => {
      cleanup();
      reject(new Error(`${sheetName}: tempo esgotado ao carregar`));
    }, 20000);

    window[callbackName] = (payload) => {
      cleanup();
      if (!payload || payload.status !== 'ok') {
        reject(new Error(`${sheetName}: resposta inválida do Google Sheets`));
        return;
      }
      resolve(tableToRows(payload.table));
    };

    script.onerror = () => {
      cleanup();
      reject(new Error(`${sheetName}: erro ao carregar script`));
    };

    script.src =
      `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq` +
      `?tqx=out:json;responseHandler:${callbackName}&sheet=${encodeURIComponent(sheetName)}`;
    document.head.append(script);

    function cleanup() {
      window.clearTimeout(timeout);
      script.remove();
      delete window[callbackName];
    }
  });
}

function tableToRows(table) {
  return (table.rows || []).map((row) =>
    (row.c || []).map((cell, index) => {
      if (!cell) return '';
      if (index === 0 && cell.f) return cell.f;
      return cell.v ?? cell.f ?? '';
    }),
  );
}

function renderStatusTable(filledDates) {
  const today = getToday();
  const dates = buildLastThirtyDays(today);

  todayMetric.textContent = formatShortDate(today);
  rangeLabel.textContent = dates.length
    ? `${formatShortDate(dates[0])} até ${formatShortDate(today)}`
    : `Até ${formatShortDate(today)}`;

  statusRows.innerHTML = '';
  [...dates].reverse().forEach((date) => {
    const isFilled = filledDates.has(toDateKey(date));
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${formatShortDate(date)}</td>
      <td>
        <span class="status-pill ${isFilled ? 'filled' : 'missing'}">
          ${isFilled ? 'Foi preenchido' : 'Não preenchido'}
        </span>
      </td>
    `;
    statusRows.append(row);
  });
}

function renderPivoTable(sheets) {
  const today = getToday();
  const dates = buildLastThirtyDays(today);

  pivoRangeLabel.textContent = dates.length
    ? `${formatShortDate(dates[0])} até ${formatShortDate(today)}`
    : `Até ${formatShortDate(today)}`;

  pivoRows.innerHTML = '';
  pivoHead.innerHTML = renderMatrixHead(dates);

  sheets.forEach((sheet) => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <th class="sticky-pivo row-header">${sheet.name}</th>
      ${[...dates]
        .reverse()
        .map((date) => {
          const key = toDateKey(date);
          const total = sheet.irrigationSums.get(key) || 0;
          const rain = sheet.rainSums.get(key) || 0;
          const isOn = total > 0;
          const hasRain = rain > 0;
          const pillClass = isOn && hasRain ? 'split' : isOn ? 'filled' : hasRain ? 'rain' : 'missing';
          return `
            <td class="status-cell ${isOn ? 'irrigated' : ''} ${hasRain ? 'rain' : ''}">
              <span class="status-pill compact ${pillClass}">
                ${isOn ? 'Ligou' : 'Não ligou'}
              </span>
              ${isOn ? `<span class="subtle-value">Soma: ${formatNumber(total)}</span>` : ''}
              ${hasRain ? `<span class="subtle-value rain-text">Chuva: ${formatNumber(rain)}</span>` : ''}
            </td>
          `;
        })
        .join('')}
    `;
    pivoRows.append(row);
  });
}

function renderBioinsumoTable(sheets) {
  const today = getToday();
  const dates = buildLastThirtyDays(today);

  bioRangeLabel.textContent = dates.length
    ? `${formatShortDate(dates[0])} até ${formatShortDate(today)}`
    : `Até ${formatShortDate(today)}`;

  bioRows.innerHTML = '';
  bioHead.innerHTML = renderMatrixHead(dates);

  sheets.forEach((sheet) => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <th class="sticky-pivo row-header">${sheet.name}</th>
      ${[...dates]
        .reverse()
        .map((date) => {
          const bio = sheet.bioSums.get(toDateKey(date)) || { total: 0, piquetes: [] };
          const hasBio = bio.total > 0;
          return `
            <td class="status-cell ${hasBio ? 'bio-yes' : 'bio-no'}">
              <span class="status-pill compact ${hasBio ? 'filled' : 'bio-no'}">
                ${hasBio ? 'Sim' : ''}
              </span>
              ${
                hasBio
                  ? `<span class="subtle-value">Soma: ${formatNumber(bio.total)}</span>
                     <span class="subtle-value">Piquetes: ${bio.piquetes.join(', ')}</span>`
                  : ''
              }
            </td>
          `;
        })
        .join('')}
    `;
    bioRows.append(row);
  });
}

function renderMatrixHead(dates) {
  return `
    <tr>
      <th class="sticky-pivo">Pivô</th>
      ${[...dates].reverse().map((date) => `<th class="date-column">${formatShortDate(date)}</th>`).join('')}
    </tr>
  `;
}

function buildLastThirtyDays(today) {
  const start = new Date(today);
  start.setDate(today.getDate() - 29);
  const dates = [];
  const cursor = new Date(start);

  while (cursor <= today) {
    dates.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }

  return dates;
}

function readFilledDatesFromColumnA(rows) {
  const dates = new Set();

  rows.forEach((row) => {
    const date = parseDate(row[0]);
    if (date && date.getFullYear() >= 2000) dates.add(toDateKey(date));
  });

  return dates;
}

function readSumsByDate(rows, columns) {
  const sums = new Map();

  rows.forEach((row) => {
    const date = parseDate(row[0]);
    if (!date || date.getFullYear() < 2000) return;

    const total = columns.reduce((sum, columnIndex) => sum + parseNumber(row[columnIndex]), 0);
    const key = toDateKey(date);
    sums.set(key, (sums.get(key) || 0) + total);
  });

  return sums;
}

function readBioinsumoByDate(rows, columns) {
  const sums = new Map();

  rows.forEach((row) => {
    const date = parseDate(row[0]);
    if (!date || date.getFullYear() < 2000) return;

    const applied = columns
      .map((column) => ({
        piquete: column.piquete,
        value: parseNumber(row[column.index]),
      }))
      .filter((entry) => entry.value > 0);
    const total = applied.reduce((sum, entry) => sum + entry.value, 0);
    const key = toDateKey(date);
    const previous = sums.get(key) || { total: 0, piquetes: [] };

    sums.set(key, {
      total: previous.total + total,
      piquetes: [...new Set([...previous.piquetes, ...applied.map((entry) => entry.piquete)])],
    });
  });

  return sums;
}

function parseDate(value) {
  if (!value) return null;
  const clean = String(value).trim();

  const googleDate = clean.match(/^Date\((\d{4}),(\d{1,2}),(\d{1,2})\)$/);
  if (googleDate) return makeDate(googleDate[1], Number(googleDate[2]) + 1, googleDate[3]);

  const iso = clean.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (iso) return makeDate(iso[1], iso[2], iso[3]);

  const slash = clean.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
  if (slash) {
    const [, day, month, year] = slash;
    const normalizedYear = year.length === 2 ? `20${year}` : year;
    return makeDate(normalizedYear, month, day);
  }

  const parsed = new Date(clean);
  if (Number.isNaN(parsed.getTime())) return null;
  return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
}

function parseNumber(value) {
  if (!value) return 0;
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  const clean = String(value)
    .trim()
    .replace(/\s/g, '')
    .replace(/%/g, '');

  if (!clean) return 0;

  const normalized =
    clean.includes(',') && clean.includes('.')
      ? clean.replace(/\./g, '').replace(',', '.')
      : clean.replace(',', '.');
  const number = Number(normalized.replace(/[^0-9.-]/g, ''));

  return Number.isFinite(number) ? number : 0;
}

function makeDate(year, month, day) {
  const date = new Date(Number(year), Number(month) - 1, Number(day));
  return Number.isNaN(date.getTime()) ? null : date;
}

function getToday() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function toDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatShortDate(date) {
  return `${date.getDate()}/${date.getMonth() + 1}`;
}

function formatNumber(value) {
  return value.toLocaleString('pt-BR', {
    maximumFractionDigits: 2,
  });
}

function activateTab(panelId) {
  tabButtons.forEach((button) => button.classList.toggle('active', button.dataset.tab === panelId));
  document
    .querySelectorAll('.tab-panel')
    .forEach((panel) => panel.classList.toggle('active', panel.id === panelId));
}
