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
const sectionButtons = document.querySelectorAll('.section-button');
const pastosStatus = document.querySelector('#pastosStatus');
const pastosHead = document.querySelector('#pastosHead');
const pastosRows = document.querySelector('#pastosRows');
const pastureSummaryStatus = document.querySelector('#pastureSummaryStatus');
const pastureSummarySort = document.querySelector('#pastureSummarySort');
const pastureSummaryStatusFilter = document.querySelector('#pastureSummaryStatusFilter');
const pastureSummaryRegionFilter = document.querySelector('#pastureSummaryRegionFilter');
const pastureSummaryHead = document.querySelector('#pastureSummaryHead');
const pastureSummaryRows = document.querySelector('#pastureSummaryRows');
const pastureDetailStatus = document.querySelector('#pastureDetailStatus');
const pastureDetailSelect = document.querySelector('#pastureDetailSelect');
const pastureDetailCards = document.querySelector('#pastureDetailCards');
const pastureReadiness = document.querySelector('#pastureReadiness');
const pastureMonthlyChart = document.querySelector('#pastureMonthlyChart');
const pastureHistoryStatus = document.querySelector('#pastureHistoryStatus');
const pastureHistoryMonth = document.querySelector('#pastureHistoryMonth');
const pastureHistoryPastures = document.querySelector('#pastureHistoryPastures');
const pastureHistoryChart = document.querySelector('#pastureHistoryChart');
const pastureRankingRows = document.querySelector('#pastureRankingRows');
const ndviStatus = document.querySelector('#ndviStatus');
const ndviMean = document.querySelector('#ndviMean');
const ndviImageDate = document.querySelector('#ndviImageDate');
const ndviUpdatedAt = document.querySelector('#ndviUpdatedAt');
const ndviCloud = document.querySelector('#ndviCloud');

const spreadsheetId = '1mGjbaGPV7p1V5VTQtgFJNnjf8sJSjHle3ejgO9Id2zo';
const cattleSpreadsheetId = '1YLM7NkiUAaWqOsLpkj9OIkzrqxIqEx7gavmGlgQbeOk';
const cattleGid = '259459725';
const pastureSpreadsheetId = '1SbZdtI_dleAFtATCKbKmUnFLxu-Mx3zrzJnRZfQpplA';
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
let ndviMap;
let ndviLayer;
const pastureModule = {
  resumo: [],
  detalhe: [],
  historico: [],
  resumoUpdatedAt: '',
  detalheUpdatedAt: '',
  historicoUpdatedAt: '',
};

refreshButton.addEventListener('click', loadSheet);
tabButtons.forEach((button) => button.addEventListener('click', () => activateTab(button.dataset.tab)));
sectionButtons.forEach((button) => button.addEventListener('click', () => activateSection(button.dataset.section)));
pastureSummarySort.addEventListener('change', renderPastureSummary);
pastureSummaryStatusFilter.addEventListener('change', renderPastureSummary);
pastureSummaryRegionFilter.addEventListener('change', renderPastureSummary);
pastureDetailSelect.addEventListener('change', () => renderPastureDetail(pastureDetailSelect.value));
pastureHistoryMonth.addEventListener('change', renderPastureHistory);
pastureHistoryPastures.addEventListener('change', renderPastureHistory);
loadSheet();

async function loadSheet() {
  refreshButton.disabled = true;
  refreshButton.textContent = 'Atualizando...';
  statusRows.innerHTML = '<tr><td colspan="2" class="loading-cell">Carregando...</td></tr>';
  pivoHead.innerHTML = '<tr><th>Pivô</th></tr>';
  pivoRows.innerHTML = '<tr><td class="loading-cell">Carregando...</td></tr>';
  bioHead.innerHTML = '<tr><th>Pivô</th></tr>';
  bioRows.innerHTML = '<tr><td class="loading-cell">Carregando...</td></tr>';
  pastosStatus.textContent = 'Carregando...';
  pastosHead.innerHTML = '<tr><th>Pastos Atuais</th></tr>';
  pastosRows.innerHTML = '<tr><td class="loading-cell">Carregando...</td></tr>';
  pastureSummaryStatus.textContent = 'Carregando...';
  pastureSummaryHead.innerHTML = '<tr><th>Pastos</th></tr>';
  pastureSummaryRows.innerHTML = '<tr><td class="loading-cell">Carregando...</td></tr>';
  pastureDetailStatus.textContent = 'Carregando...';
  pastureDetailSelect.innerHTML = '<option value="">Carregando...</option>';
  pastureDetailCards.innerHTML = '<div class="loading-cell">Carregando...</div>';
  pastureReadiness.textContent = 'Aguardando dados';
  pastureMonthlyChart.innerHTML = '';
  pastureHistoryStatus.textContent = 'Carregando...';
  pastureHistoryMonth.innerHTML = '<option value="">Carregando...</option>';
  pastureHistoryPastures.innerHTML = '';
  pastureHistoryChart.innerHTML = '';
  pastureRankingRows.innerHTML = '<tr><td colspan="3" class="loading-cell">Carregando...</td></tr>';
  ndviStatus.textContent = 'Carregando...';
  ndviMean.textContent = '--';
  ndviImageDate.textContent = '--';
  ndviUpdatedAt.textContent = '--';
  ndviCloud.textContent = '--';

  await Promise.allSettled([loadIrrigationData(), loadCattleData(), loadPastureModuleData(), loadNdviData()]);
  refreshButton.disabled = false;
  refreshButton.textContent = 'Atualizar';
}

async function loadIrrigationData() {
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
  }
}

async function loadCattleData() {
  try {
    const table = await loadGoogleSheetTable({
      spreadsheetId: cattleSpreadsheetId,
      gid: cattleGid,
      label: 'Gado',
    });
    const displayTable = { columns: table.columns, rows: table.displayRows };
    const pastosAtuais = displayTable.rows.some((row) => row.some((cell) => normalizeText(cell) === 'PASTOS_ATUAIS'))
      ? extractNamedTable(displayTable.rows, 'PASTOS_ATUAIS')
      : displayTable;
    renderPastosAtuaisTable(pastosAtuais);
  } catch (error) {
    pastosStatus.textContent = 'Erro ao carregar';
    pastosRows.innerHTML = `<tr><td class="loading-cell">${error.message}</td></tr>`;
  }
}

async function loadPastureModuleData() {
  try {
    const [resumo, detalhe, historico] = await Promise.all([
      loadPastureModuleSheet('SITE_RESUMO'),
      loadPastureModuleSheet('SITE_DETALHE'),
      loadPastureModuleSheet('SITE_HISTORICO'),
    ]);

    pastureModule.resumo = resumo.rows.map(normalizePastureModuleRow);
    pastureModule.detalhe = detalhe.rows.map(normalizePastureModuleRow);
    pastureModule.historico = historico.rows.map(normalizePastureModuleRow);
    pastureModule.resumoUpdatedAt = resumo.updatedAt;
    pastureModule.detalheUpdatedAt = detalhe.updatedAt;
    pastureModule.historicoUpdatedAt = historico.updatedAt;

    renderPastureSummary();
    renderPastureDetailOptions();
    renderPastureHistoryOptions();
  } catch (error) {
    pastureSummaryStatus.textContent = 'Erro ao carregar';
    pastureSummaryRows.innerHTML = `<tr><td class="loading-cell">${error.message}</td></tr>`;
    pastureDetailStatus.textContent = 'Erro ao carregar';
    pastureDetailCards.innerHTML = `<div class="loading-cell">${error.message}</div>`;
    pastureReadiness.textContent = 'Erro ao carregar';
    pastureHistoryStatus.textContent = 'Erro ao carregar';
    pastureRankingRows.innerHTML = `<tr><td colspan="3" class="loading-cell">${error.message}</td></tr>`;
  }
}

async function loadNdviData() {
  try {
    const response = await fetch('/api/ndvi/latest', { cache: 'no-store' });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || `Erro ${response.status}`);
    }

    renderNdvi(data);
  } catch (error) {
    ndviStatus.textContent = 'Erro ao carregar NDVI';
  }
}

async function loadPivoSheet(sheet) {
  const rows = await loadGoogleSheetRows({
    spreadsheetId,
    sheetName: sheet.name,
    label: sheet.name,
  });
  return {
    name: sheet.name,
    rows,
    irrigationSums: readSumsByDate(rows, sheet.irrigationColumns),
    rainSums: readSumsByDate(rows, [1]),
    bioSums: readBioinsumoByDate(rows, sheet.bioColumns),
  };
}

function loadGoogleSheetRows({ spreadsheetId, sheetName, gid, label }) {
  return loadGoogleSheetTable({ spreadsheetId, sheetName, gid, label }).then((table) => table.rows);
}

function loadGoogleSheetTable({ spreadsheetId, sheetName, gid, label }) {
  return new Promise((resolve, reject) => {
    const callbackName = `handleSheet_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const script = document.createElement('script');
    const timeout = window.setTimeout(() => {
      cleanup();
      reject(new Error(`${label}: tempo esgotado ao carregar`));
    }, 20000);

    window[callbackName] = (payload) => {
      cleanup();
      if (!payload || payload.status !== 'ok') {
        reject(new Error(`${label}: resposta inválida do Google Sheets`));
        return;
      }
      resolve(tableFromGoogle(payload.table));
    };

    script.onerror = () => {
      cleanup();
      reject(new Error(`${label}: erro ao carregar script`));
    };

    const source = gid ? `gid=${encodeURIComponent(gid)}` : `sheet=${encodeURIComponent(sheetName)}`;
    script.src =
      `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq` +
      `?tqx=out:json;responseHandler:${callbackName}&${source}`;
    document.head.append(script);

    function cleanup() {
      window.clearTimeout(timeout);
      script.remove();
      delete window[callbackName];
    }
  });
}

function extractNamedTable(rows, tableName) {
  const marker = normalizeText(tableName);
  const markerRowIndex = rows.findIndex((row) => row.some((cell) => normalizeText(cell) === marker));
  if (markerRowIndex < 0) {
    throw new Error(
      'Não encontrei a seção PASTOS_ATUAIS. Verifique se a planilha de gado está pública para visualização.',
    );
  }

  const headerRowIndex = findNextContentRow(rows, markerRowIndex + 1);
  if (headerRowIndex < 0) throw new Error('Encontrei PASTOS_ATUAIS, mas não encontrei o cabeçalho da tabela.');

  const headerRow = rows[headerRowIndex];
  const columns = headerRow
    .map((value, index) => ({ index, label: String(value || '').trim() }))
    .filter((column) => column.label);
  const data = [];

  for (let rowIndex = headerRowIndex + 1; rowIndex < rows.length; rowIndex += 1) {
    const row = rows[rowIndex];
    const cells = columns.map((column) => String(row[column.index] ?? '').trim());
    if (cells.every((cell) => !cell)) break;
    if (looksLikeSectionTitle(cells)) break;
    data.push(cells);
  }

  return {
    columns: columns.map((column) => column.label),
    rows: data,
  };
}

function findNextContentRow(rows, startIndex) {
  for (let index = startIndex; index < rows.length; index += 1) {
    if (rows[index].some((cell) => String(cell || '').trim())) return index;
  }
  return -1;
}

function looksLikeSectionTitle(cells) {
  const filled = cells.filter(Boolean);
  if (filled.length !== 1) return false;
  const value = normalizeText(filled[0]);
  return value.includes('_') && value === value.toUpperCase();
}

function normalizeText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toUpperCase();
}

function tableFromGoogle(table) {
  return {
    columns: (table.cols || []).map((column, index) => String(column.label || column.id || `Coluna ${index + 1}`)),
    rows: (table.rows || []).map((row) =>
      (row.c || []).map((cell, index) => {
        if (!cell) return '';
        if (index === 0 && cell.f) return cell.f;
        return cell.v ?? cell.f ?? '';
      }),
    ),
    displayRows: (table.rows || []).map((row) =>
      (row.c || []).map((cell) => {
        if (!cell) return '';
        return cell.f ?? cell.v ?? '';
      }),
    ),
  };
}

function parseCsv(csv) {
  const rows = [];
  let row = [];
  let cell = '';
  let insideQuotes = false;

  for (let index = 0; index < csv.length; index += 1) {
    const char = csv[index];
    const nextChar = csv[index + 1];

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        cell += '"';
        index += 1;
      } else {
        insideQuotes = !insideQuotes;
      }
      continue;
    }

    if (char === ',' && !insideQuotes) {
      row.push(cell);
      cell = '';
      continue;
    }

    if ((char === '\n' || char === '\r') && !insideQuotes) {
      if (char === '\r' && nextChar === '\n') index += 1;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
      continue;
    }

    cell += char;
  }

  if (cell || row.length) {
    row.push(cell);
    rows.push(row);
  }

  return rows;
}

async function loadPastureModuleSheet(sheetName) {
  const url =
    `https://docs.google.com/spreadsheets/d/${pastureSpreadsheetId}/gviz/tq` +
    `?tqx=out:csv&sheet=${encodeURIComponent(sheetName)}`;
  const response = await fetch(url, { cache: 'no-store' });

  if (!response.ok) {
    throw new Error(`${sheetName}: erro ${response.status} ao acessar o Google Sheets`);
  }

  const csv = await response.text();
  const parsedRows = parseCsv(csv).filter((row) => row.some((cell) => String(cell || '').trim()));
  const headers = (parsedRows[0] || []).map((header) => String(header || '').trim());
  const updatedAt = parsedRows[1]?.[1] || '';
  const dataRows = parsedRows.slice(2).map((row) =>
    Object.fromEntries(headers.map((header, index) => [header, String(row[index] ?? '').trim()])),
  );

  if (!headers.includes('pasto')) {
    throw new Error(`${sheetName}: não encontrei a coluna pasto. Verifique se a aba está publicada para leitura.`);
  }

  return {
    updatedAt,
    rows: dataRows.filter((row) => row.pasto),
  };
}

function normalizePastureModuleRow(row) {
  return {
    ...row,
    pasto: row.pasto || '',
    area: parseNumber(row.area),
    lotes: row.lotes || '',
    uaTotal: parseNumber(row.uaTotal),
    uaHaAtual: parseNumber(row.uaHaAtual),
    mediaUaHaMesAtual: parseNumber(row.mediaUaHaMesAtual),
    mediaUaHaAno: parseNumber(row.mediaUaHaAno),
    diasOcupadoAno: parseNullableNumber(row.diasOcupadoAno),
    ultimoUso: row.ultimoUso || '',
    duracaoUltimoUso: parseNullableNumber(row.duracaoUltimoUso),
    uaConsumidaUltimoUso: parseNullableNumber(row.uaConsumidaUltimoUso),
    diasDescansoAtual: parseNullableNumber(row.diasDescansoAtual),
    diasNoPastoAtual: parseNullableNumber(row.diasNoPastoAtual),
    intervaloDescansoMedio: parseNullableNumber(row.intervaloDescansoMedio),
    intervaloOcupacaoMedio: parseNullableNumber(row.intervaloOcupacaoMedio),
    maiorUaHaHistorico: parseNumber(row.maiorUaHaHistorico),
    status: String(row.status || '').trim().toLowerCase(),
    cor: sanitizeHexColor(row.cor),
    regiao: getPastureRegion(row.pasto),
  };
}

function renderPastureSummary() {
  const statusFilter = pastureSummaryStatusFilter.value;
  const regionFilter = pastureSummaryRegionFilter.value;
  const sortKey = pastureSummarySort.value;
  const rows = pastureModule.resumo
    .filter((row) => statusFilter === 'todos' || row.status === statusFilter)
    .filter((row) => regionFilter === 'todos' || row.regiao === regionFilter)
    .sort((a, b) => comparePastureModuleRows(a, b, sortKey));

  pastureSummaryStatus.textContent = `${rows.length} pasto(s) • Atualizado em: ${formatSheetTimestamp(
    pastureModule.resumoUpdatedAt,
  )}`;
  pastureSummaryHead.innerHTML = `
    <tr>
      <th>Pasto</th>
      <th>Região</th>
      <th>Lotes</th>
      <th>Área</th>
      <th>UA total</th>
      <th>UA/ha atual</th>
      <th>Média mês</th>
      <th>Média ano</th>
      <th>Dias ocupado</th>
      <th>Último uso</th>
      <th>Descanso</th>
      <th>Status</th>
    </tr>
  `;
  pastureSummaryRows.innerHTML = rows.length
    ? rows
        .map(
          (row) => `
            <tr class="pasture-module-row" style="--pasture-color: ${row.cor}">
              <td><strong>${escapeHtml(row.pasto)}</strong></td>
              <td>${formatPastureRegion(row.regiao)}</td>
              <td>${renderPastureModuleLotBadges(row.lotes)}</td>
              <td>${formatNumber(row.area)} ha</td>
              <td>${formatNumber(row.uaTotal)}</td>
              <td><strong>${formatNumber(row.uaHaAtual)}</strong></td>
              <td>${formatNumber(row.mediaUaHaMesAtual)}</td>
              <td>${formatNumber(row.mediaUaHaAno)}</td>
              <td>${formatNullable(row.diasOcupadoAno)}</td>
              <td>${escapeHtml(row.ultimoUso || '--')}</td>
              <td>${formatNullable(row.diasDescansoAtual)}</td>
              <td>${renderPastureModuleStatus(row)}</td>
            </tr>
          `,
        )
        .join('')
    : '<tr><td colspan="12" class="loading-cell">Nenhum pasto encontrado para os filtros.</td></tr>';
}

function renderPastureDetailOptions() {
  const selected = pastureDetailSelect.value || pastureModule.detalhe[0]?.pasto || '';

  pastureDetailSelect.innerHTML = pastureModule.detalhe.length
    ? pastureModule.detalhe
        .map((row) => `<option value="${escapeHtml(row.pasto)}">${escapeHtml(row.pasto)}</option>`)
        .join('')
    : '<option value="">Sem dados</option>';
  pastureDetailSelect.value = selected;
  renderPastureDetail(pastureDetailSelect.value);
}

function renderPastureDetail(pasto) {
  const row = pastureModule.detalhe.find((entry) => entry.pasto === pasto) || pastureModule.detalhe[0];

  if (!row) {
    pastureDetailStatus.textContent = 'Sem dados';
    pastureDetailCards.innerHTML = '<div class="loading-cell">Nenhum pasto encontrado.</div>';
    pastureReadiness.textContent = 'Sem dados';
    pastureMonthlyChart.innerHTML = '';
    return;
  }

  pastureDetailStatus.textContent = `Atualizado em: ${formatSheetTimestamp(pastureModule.detalheUpdatedAt)}`;
  pastureDetailCards.innerHTML = `
    <article class="pasture-info-card">
      <span>UA/ha atual</span>
      <strong>${formatNumber(row.uaHaAtual)}</strong>
    </article>
    <article class="pasture-info-card">
      <span>Dias descanso</span>
      <strong>${formatNullable(row.diasDescansoAtual)}</strong>
    </article>
    <article class="pasture-info-card">
      <span>Duração último uso</span>
      <strong>${formatNullable(row.duracaoUltimoUso)} dias</strong>
    </article>
    <article class="pasture-info-card">
      <span>MS último uso</span>
      <strong>${formatNullable(row.uaConsumidaUltimoUso)} kg</strong>
    </article>
    <article class="pasture-info-card pasture-info-card-wide">
      <span>Lotes</span>
      <div>${renderPastureModuleLotBadges(row.lotes)}</div>
    </article>
  `;
  pastureReadiness.innerHTML = renderPastureReadiness(row);
  renderPastureMonthlyBars(row);
}

function renderPastureHistoryOptions() {
  const months = uniqueSortedMonths(pastureModule.historico.map((row) => row.mes).filter(Boolean));
  const pastures = [...new Set(pastureModule.historico.map((row) => row.pasto).filter(Boolean))].sort();

  pastureHistoryMonth.innerHTML = months.length
    ? months
        .map(
          (month, index) =>
            `<option value="${escapeHtml(month)}" ${index === months.length - 1 ? 'selected' : ''}>${escapeHtml(
              month,
            )}</option>`,
        )
        .join('')
    : '<option value="">Sem dados</option>';
  pastureHistoryPastures.innerHTML = pastures
    .map((pasto, index) => `<option value="${escapeHtml(pasto)}" ${index < 3 ? 'selected' : ''}>${escapeHtml(pasto)}</option>`)
    .join('');
  renderPastureHistory();
}

function renderPastureHistory() {
  const selectedMonth = pastureHistoryMonth.value;
  const selectedPastures = Array.from(pastureHistoryPastures.selectedOptions)
    .slice(0, 3)
    .map((option) => option.value);
  const ranking = pastureModule.historico
    .filter((row) => row.mes === selectedMonth)
    .sort((a, b) => parseNumber(b.mediaUaHa) - parseNumber(a.mediaUaHa));

  pastureHistoryStatus.textContent = `Atualizado em: ${formatSheetTimestamp(pastureModule.historicoUpdatedAt)}`;
  pastureRankingRows.innerHTML = ranking.length
    ? ranking
        .map(
          (row) => `
            <tr>
              <td><strong>${escapeHtml(row.pasto)}</strong></td>
              <td>${formatNumber(parseNumber(row.mediaUaHa))}</td>
              <td>${formatNullable(parseNullableNumber(row.diasOcupado))}</td>
            </tr>
          `,
        )
        .join('')
    : '<tr><td colspan="3" class="loading-cell">Nenhum histórico para este mês.</td></tr>';

  renderPastureHistoryChart(selectedPastures);
}

function comparePastureModuleRows(a, b, sortKey) {
  if (sortKey === 'ultimoUso') {
    const dateA = parseDate(a.ultimoUso)?.getTime() || Number.MAX_SAFE_INTEGER;
    const dateB = parseDate(b.ultimoUso)?.getTime() || Number.MAX_SAFE_INTEGER;
    return dateA - dateB;
  }

  if (sortKey === 'area') return a.area - b.area;

  return parseNumber(b[sortKey]) - parseNumber(a[sortKey]);
}

function renderPastureModuleLotBadges(value) {
  const lots = String(value || '')
    .split('|')
    .map((lot) => lot.trim())
    .filter(Boolean);

  if (!lots.length) return '<span class="muted-text">Desocupado</span>';

  return `
    <div class="tag-list">
      ${lots.map((lot) => `<span class="pasture-lot-badge">${escapeHtml(lot)}</span>`).join('')}
    </div>
  `;
}

function renderPastureModuleStatus(row) {
  const label = row.status ? row.status.replace('_', ' ') : '--';
  return `
    <span class="pasture-module-status">
      <i style="background-color: ${row.cor}"></i>
      ${escapeHtml(label)}
    </span>
  `;
}

function renderPastureReadiness(row) {
  if (row.status === 'ocupado') {
    return `<strong>Ocupado agora</strong><span>${renderPastureModuleLotBadges(row.lotes)}</span>`;
  }

  if (row.diasDescansoAtual === null || row.intervaloDescansoMedio === null) {
    return '<strong>Sem histórico suficiente</strong><span>Não há dados de descanso médio para comparação.</span>';
  }

  if (row.diasDescansoAtual >= row.intervaloDescansoMedio) {
    return `<strong>Pronto para uso</strong><span>${formatNumber(row.diasDescansoAtual)} dias de descanso atual.</span>`;
  }

  const remaining = Math.ceil(row.intervaloDescansoMedio - row.diasDescansoAtual);
  return `<strong>Em descanso</strong><span>${remaining} dia${remaining === 1 ? '' : 's'} restante${
    remaining === 1 ? '' : 's'
  }.</span>`;
}

function renderPastureMonthlyBars(row) {
  const monthEntries = Object.entries(row)
    .filter(([key]) => /^media[A-Za-z]{3}\d{4}$/.test(key))
    .map(([key, value]) => ({
      label: key.replace(/^media/, '').replace(/\d{4}$/, ''),
      value: parseNumber(value),
    }));
  const max = Math.max(1, ...monthEntries.map((entry) => entry.value));

  pastureMonthlyChart.innerHTML = monthEntries.length
    ? monthEntries
        .map(
          (entry) => `
            <div class="pasture-bar-item">
              <span>${escapeHtml(entry.label)}</span>
              <div class="pasture-bar-track">
                <i style="height: ${Math.max(3, (entry.value / max) * 100)}%"></i>
              </div>
              <strong>${formatNumber(entry.value)}</strong>
            </div>
          `,
        )
        .join('')
    : '<div class="loading-cell">Sem médias mensais.</div>';
}

function renderPastureHistoryChart(selectedPastures) {
  const months = uniqueSortedMonths(pastureModule.historico.map((row) => row.mes).filter(Boolean));
  const width = 720;
  const height = 260;
  const padding = 34;
  const colors = ['#1d6f63', '#2368b5', '#946400'];
  const max = Math.max(
    1,
    ...pastureModule.historico
      .filter((row) => selectedPastures.includes(row.pasto))
      .map((row) => parseNumber(row.mediaUaHa)),
  );
  const xStep = months.length > 1 ? (width - padding * 2) / (months.length - 1) : 0;

  if (!selectedPastures.length || !months.length) {
    pastureHistoryChart.innerHTML = '<div class="loading-cell">Selecione até 3 pastos para comparar.</div>';
    return;
  }

  const series = selectedPastures.map((pasto, index) => {
    const rowsByMonth = new Map(
      pastureModule.historico
        .filter((row) => row.pasto === pasto)
        .map((row) => [row.mes, parseNumber(row.mediaUaHa)]),
    );
    const points = months.map((month, monthIndex) => {
      const value = rowsByMonth.get(month) || 0;
      const x = padding + monthIndex * xStep;
      const y = height - padding - (value / max) * (height - padding * 2);
      return { month, value, x, y };
    });

    return {
      pasto,
      color: colors[index],
      points,
      polyline: points.map((point) => `${point.x},${point.y}`).join(' '),
    };
  });

  pastureHistoryChart.innerHTML = `
    <div class="pasture-history-legend">
      ${series
        .map((entry) => `<span><i style="background: ${entry.color}"></i>${escapeHtml(entry.pasto)}</span>`)
        .join('')}
    </div>
    <svg class="pasture-history-svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="Gráfico de linha de UA/ha por mês">
      <line x1="${padding}" y1="${height - padding}" x2="${width - padding}" y2="${height - padding}" />
      <line x1="${padding}" y1="${padding}" x2="${padding}" y2="${height - padding}" />
      ${months
        .map((month, index) => {
          const x = padding + index * xStep;
          return `<text x="${x}" y="${height - 8}" text-anchor="middle">${escapeHtml(month.slice(0, 2))}</text>`;
        })
        .join('')}
      ${series
        .map(
          (entry) => `
            <polyline points="${entry.polyline}" fill="none" stroke="${entry.color}" stroke-width="3" />
            ${entry.points
              .map(
                (point) => `
                  <circle cx="${point.x}" cy="${point.y}" r="4" fill="${entry.color}">
                    <title>${escapeHtml(entry.pasto)} • ${escapeHtml(point.month)} • ${formatNumber(point.value)}</title>
                  </circle>
                `,
              )
              .join('')}
          `,
        )
        .join('')}
    </svg>
  `;
}

function getPastureRegion(pasto) {
  const value = String(pasto || '').trim().toUpperCase();
  if (!value) return '';
  if (value.startsWith('V/R') || value.startsWith('VR')) return 'RESERVA';
  if (['A', 'B', 'C', 'P'].includes(value[0])) return value[0];
  return 'RESERVA';
}

function formatPastureRegion(region) {
  if (region === 'RESERVA') return 'Reserva';
  return region ? `Região ${region}` : '--';
}

function uniqueSortedMonths(months) {
  return [...new Set(months)].sort((a, b) => parseMonthYear(a) - parseMonthYear(b));
}

function parseMonthYear(value) {
  const match = String(value || '').match(/^(\d{1,2})\/(\d{4})$/);
  if (!match) return 0;
  return Number(match[2]) * 100 + Number(match[1]);
}

function parseNullableNumber(value) {
  if (value === null || value === undefined || String(value).trim() === '') return null;
  return parseNumber(value);
}

function formatNullable(value) {
  return value === null || value === undefined || value === '' ? '--' : formatNumber(Number(value));
}

function formatSheetTimestamp(value) {
  return value || '--';
}

function sanitizeHexColor(value) {
  const color = String(value || '').trim();
  return /^#[0-9a-f]{6}$/i.test(color) ? color : '#eef2f5';
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

function renderPastosAtuaisTable(table) {
  const columnIndexes = Object.fromEntries(table.columns.map((column, index) => [normalizeText(column), index]));
  const displayColumns = [
    { label: 'Lote', type: 'lot', index: columnIndexes.LOTE },
    { label: 'Pasto Atual', type: 'pastures', index: columnIndexes['PASTO ATUAL'] },
    { label: 'Área Total (ha)', type: 'area', index: columnIndexes['AREA TOTAL (HA)'] },
    { label: 'UA/ha Atual', type: 'plain', index: columnIndexes['UA/HA ATUAL'] },
    { label: 'Data Últ. Mov.', type: 'plain', index: columnIndexes['DATA ULT. MOV.'] },
    { label: 'Status', type: 'status', index: columnIndexes.STATUS },
  ].filter((column) => column.index !== undefined);

  const uaTotalColumnIndex = columnIndexes['UA TOTAL'];
  const statusColumnIndex = table.columns.findIndex((column) => normalizeText(column) === 'STATUS');
  const movementColumnIndex = table.columns.findIndex((column) => normalizeText(column) === 'DATA ULT. MOV.');

  pastosStatus.textContent = `${table.rows.length} registro(s)`;
  pastosHead.innerHTML = `
    <tr>
      ${displayColumns.map((column) => `<th>${escapeHtml(column.label)}</th>`).join('')}
    </tr>
  `;
  pastosRows.innerHTML = table.rows.length
    ? table.rows
        .map(
          (row) => `
            <tr>
              ${displayColumns
                .map(({ index, type }) => {
                  const cell = row[index] || '';

                  if (type === 'lot') {
                    return `<td>${renderLotWithUa(cell, row[uaTotalColumnIndex])}</td>`;
                  }

                  if (type === 'pastures') {
                    return `<td>${renderPastureTags(cell)}</td>`;
                  }

                  if (type === 'area') {
                    return `<td class="area-cell"><span class="area-arrow" aria-hidden="true">→</span>${escapeHtml(cell)}</td>`;
                  }

                  if (index === statusColumnIndex || type === 'status') {
                    return `<td>${renderCattleStatus(cell, row[movementColumnIndex])}</td>`;
                  }

                  return `<td>${escapeHtml(cell)}</td>`;
                })
                .join('')}
            </tr>
          `,
        )
        .join('')
    : '<tr><td class="loading-cell">Nenhum lote encontrado.</td></tr>';
}

function renderNdvi(data) {
  ndviStatus.textContent = data.imageDate ? `Imagem ${formatIsoDate(data.imageDate)}` : 'Atualizado';
  ndviMean.textContent = typeof data.meanNdvi === 'number' ? data.meanNdvi.toFixed(2) : '--';
  ndviImageDate.textContent = data.imageDate ? formatIsoDate(data.imageDate) : '--';
  ndviUpdatedAt.textContent = data.updatedAt ? formatDateTime(data.updatedAt) : '--';
  ndviCloud.textContent =
    typeof data.cloudPercentage === 'number' ? `${data.cloudPercentage.toFixed(1)}%` : '--';

  if (!window.L || !data.tileUrl) return;

  if (!ndviMap) {
    ndviMap = L.map('ndviMap', {
      zoomControl: true,
      scrollWheelZoom: false,
    }).setView([-15.78, -47.93], 12);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap',
    }).addTo(ndviMap);
  }

  if (ndviLayer) ndviMap.removeLayer(ndviLayer);
  ndviLayer = L.tileLayer(data.tileUrl, {
    opacity: 0.85,
    attribution: 'Google Earth Engine',
  }).addTo(ndviMap);

  if (data.bounds) {
    ndviMap.fitBounds(data.bounds, { padding: [20, 20] });
  }

  setTimeout(() => ndviMap.invalidateSize(), 100);
}

function renderLotWithUa(lot, uaTotal) {
  return `
    <div class="lot-cell">
      <strong>${escapeHtml(lot)}</strong>
      <span class="ua-badge">${escapeHtml(uaTotal || '0')}</span>
    </div>
  `;
}

function renderPastureTags(value) {
  const pastures = String(value || '')
    .split('|')
    .map((pasture) => pasture.trim())
    .filter(Boolean);

  if (!pastures.length) return '';

  return `
    <div class="tag-list">
      ${pastures.map((pasture) => `<span class="pasture-tag">${escapeHtml(pasture)}</span>`).join('')}
    </div>
  `;
}

function renderCattleStatus(status, movementDateValue) {
  const normalized = normalizeText(status);

  if (normalized === 'ATIVO') {
    const days = daysSinceMovement(movementDateValue);
    const label = days === null ? 'ATIVO' : `${days} dia${days === 1 ? '' : 's'}`;
    return `<span class="status-pill compact cattle-status active">${escapeHtml(label)}</span>`;
  }

  return `<span class="status-pill compact cattle-status ${statusClass(status)}">${escapeHtml(status)}</span>`;
}

function statusClass(value) {
  const normalized = normalizeText(value);
  if (normalized === 'ATIVO') return 'active';
  if (normalized === 'SEM PASTO') return 'warning';
  if (normalized === 'ZERADO') return 'neutral';
  return 'neutral';
}

function daysSinceMovement(value) {
  const movementDate = parseDate(value);
  if (!movementDate) return null;

  const today = getToday();
  const diff = today.getTime() - movementDate.getTime();
  return Math.max(0, Math.floor(diff / 86400000));
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

function formatIsoDate(value) {
  const [year, month, day] = String(value).slice(0, 10).split('-');
  return year && month && day ? `${day}/${month}/${year}` : value;
}

function formatDateTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  });
}

function activateTab(panelId) {
  const targetPanel = document.getElementById(panelId);
  const section = targetPanel?.closest('.section-panel');
  const scopedButtons = section ? section.querySelectorAll('.tab-button') : tabButtons;
  const scopedPanels = section ? section.querySelectorAll('.tab-panel') : document.querySelectorAll('.tab-panel');

  scopedButtons.forEach((button) => button.classList.toggle('active', button.dataset.tab === panelId));
  scopedPanels.forEach((panel) => panel.classList.toggle('active', panel.id === panelId));
}

function activateSection(sectionId) {
  sectionButtons.forEach((button) => button.classList.toggle('active', button.dataset.section === sectionId));
  document
    .querySelectorAll('.section-panel')
    .forEach((section) => section.classList.toggle('active', section.id === sectionId));

  if (sectionId === 'ndviSection' && ndviMap) {
    setTimeout(() => ndviMap.invalidateSize(), 80);
  }
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
