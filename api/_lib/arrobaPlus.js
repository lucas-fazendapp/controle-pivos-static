const crypto = require('node:crypto');

const ARROBA_PLUS_BASE = 'https://rastreabilidade.arrobaplus.com.br/service/api';
const SNAPSHOT_PATH = 'arrobaplus/snapshot.json';
const REQUEST_TIMEOUT_MS = 60000;

async function requestApi(route, params = {}, options = {}) {
  const url = new URL(`${ARROBA_PLUS_BASE}/${route}`);
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, String(value)));
  const response = await fetch(url, {
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Origin: 'https://rastreabilidade.arrobaplus.com.br',
      Referer: 'https://rastreabilidade.arrobaplus.com.br/home',
      'User-Agent': 'FazendApp/1.0',
      ...options.headers,
    },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`Arroba Plus respondeu HTTP ${response.status}`);
  const payload = await response.json();
  if (!payload?.status) {
    const message = text(payload?.msg || payload?.error);
    if (options.allowEmpty && normalizeText(message).includes('NENHUM REGISTRO')) return [];
    throw new Error(message || `Falha em ${route}`);
  }
  return parseApiData(payload.data);
}

function parseApiData(data) {
  if (typeof data !== 'string') return data;
  const value = data.trim();
  if (!value.startsWith('[') && !value.startsWith('{')) return data;
  return JSON.parse(value);
}

function requireCredentials() {
  const email = process.env.ARROBAPLUS_EMAIL;
  const password = process.env.ARROBAPLUS_PASSWORD;
  if (!email || !password) throw new Error('Configure ARROBAPLUS_EMAIL e ARROBAPLUS_PASSWORD na Vercel.');
  return { email, password };
}

function text(value) {
  return String(value ?? '').trim();
}

function normalizeText(value) {
  return text(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
}

function number(value) {
  if (value === null || value === undefined || String(value).trim() === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function calculateAgeMonths(value, referenceDate = new Date()) {
  const match = text(value).match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (!match) return null;
  const birthDate = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  if (Number.isNaN(birthDate.getTime()) || birthDate > referenceDate) return null;
  let months = (referenceDate.getFullYear() - birthDate.getFullYear()) * 12;
  months += referenceDate.getMonth() - birthDate.getMonth();
  if (referenceDate.getDate() < birthDate.getDate()) months -= 1;
  return Math.max(0, months);
}

function normalizeAnimal(animal) {
  const birthDate = text(animal.birthDateAnimal || animal.dataNascimentoAnimal);
  const reportedAge = number(animal.idadeMesAnimal);
  return {
    id: number(animal.idAnimal),
    brinco: text(animal.codeSisboV || animal.codigoSisboV || animal.codeEarring),
    sexo: text(animal.sex || animal.sexo).toUpperCase(),
    raca: text(animal.breed || animal.raca),
    especie: text(animal.species),
    peso: number(animal.weight),
    pesoInicial: number(animal.weightInitial),
    idadeMeses: reportedAge > 0 ? reportedAge : calculateAgeMonths(birthDate),
    nascimento: birthDate,
    emissao: text(animal.issuanceDateAnimal),
    ultimaPesagem: text(animal.dateChangeWeight),
    entrada: text(animal.reasonEntry),
    status: number(animal.statusAnimal),
  };
}

function normalizeDeath(animal) {
  return {
    ...normalizeAnimal(animal),
    dataMorte: text(animal.dateDead || animal.dataMorte),
    causaMorte: text(animal.causeDead || animal.causaMorte),
    motivoMorte: text(animal.noteDead || animal.MotivoMorte || animal.reason),
    observacao: text(animal.observacaoMorte || animal.description),
  };
}

function normalizeEntry(entry, animalCounts = new Map()) {
  const id = number(entry.Id ?? entry.idAnimalEntry);
  return {
    id,
    motivo: text(entry.Reason || entry.reason),
    inicio: text(entry.Start || entry.start),
    fim: text(entry.End || entry.end),
    chegada: text(entry.arrivedDate),
    raca: text(entry.Breed || entry.breed),
    gta: number(entry.IdGta ?? entry.idGta),
    produtor: number(entry.idProdutor),
    peso: number(entry.weight),
    aberta: Boolean(entry.IsActive),
    animais: animalCounts.get(id) || 0,
  };
}

function normalizeExit(exit, animalCounts = new Map()) {
  const id = number(exit.Id ?? exit.idAnimalExit ?? exit.IdAnimalExit);
  return {
    id,
    motivo: text(exit.Reason || exit.reason || exit.description),
    embarque: text(exit.dateBoarding || exit.DateBoarding || exit.Start || exit.start),
    finalizacao: text(exit.End || exit.end || exit.finishDate),
    destino: text(exit.customerName || exit.CustomerName || exit.destination || exit.destiny),
    gta: number(exit.IdGta ?? exit.idGta),
    peso: number(exit.weight || exit.totalWeight),
    status: text(exit.statusDescription || exit.StatusDescription || exit.status),
    animais: animalCounts.get(id) || 0,
  };
}

function countBy(records, keys) {
  return records.reduce((counts, record) => {
    const value = keys.map((key) => number(record[key])).find((item) => item !== null);
    if (value !== undefined && value !== null) counts.set(value, (counts.get(value) || 0) + 1);
    return counts;
  }, new Map());
}

function buildAgeGroups(animals) {
  const groups = [
    { label: '0 a 6 meses', min: 0, max: 6 },
    { label: '7 a 12 meses', min: 7, max: 12 },
    { label: '13 a 18 meses', min: 13, max: 18 },
    { label: '19 a 24 meses', min: 19, max: 24 },
    { label: '25 a 36 meses', min: 25, max: 36 },
    { label: 'Mais de 36 meses', min: 37, max: Infinity },
  ];
  return groups.map((group) => ({
    label: group.label,
    total: animals.filter(
      (animal) => Number.isFinite(animal.idadeMeses) && animal.idadeMeses >= group.min && animal.idadeMeses <= group.max,
    ).length,
  }));
}

function buildSummary(animals, deaths = [], entries = [], exits = []) {
  const weights = animals.map((animal) => animal.peso).filter(Number.isFinite);
  const totalWeight = weights.reduce((sum, value) => sum + value, 0);
  return {
    total: animals.length,
    machos: animals.filter((animal) => animal.sexo === 'M').length,
    femeas: animals.filter((animal) => animal.sexo === 'F').length,
    semBrinco: animals.filter((animal) => !animal.brinco).length,
    pesoMedio: weights.length ? Math.round((totalWeight / weights.length) * 10) / 10 : null,
    mortes: deaths.length,
    entradas: entries.length,
    animaisEntradas: entries.reduce((sum, entry) => sum + entry.animais, 0),
    saidas: exits.length,
    animaisSaidas: exits.reduce((sum, exit) => sum + exit.animais, 0),
    faixasEtarias: buildAgeGroups(animals),
  };
}

function baseHeaders(user) {
  return {
    login: text(user.email),
    UserEmail: text(user.email),
    idUser: String(user.id),
    UserPermitions: '',
  };
}

async function authorizedHeaders(user, farmId) {
  const headers = baseHeaders(user);
  const permissions = await requestApi('RoutineProfile/GetAcessById', { id: user.id, idFarm: farmId }, { headers });
  const routineIds = (Array.isArray(permissions) ? permissions : [])
    .filter((permission) => permission.Visualizar === true)
    .map((permission) => number(permission.idRotina))
    .filter(Number.isFinite);
  headers.UserPermitions = Buffer.from([...new Set(routineIds)].sort((a, b) => a - b).join('#')).toString('base64');
  return headers;
}

async function collectData() {
  const { email, password } = requireCredentials();
  const users = await requestApi('user/login', { email, password });
  const user = Array.isArray(users) ? users[0] : users;
  if (!user?.id) throw new Error('O Arroba Plus nao retornou um usuario valido.');
  const farms = await requestApi('userFarm/GetByUserId', { id: user.id }, { headers: baseHeaders(user) });
  const requestedFarmId = number(process.env.ARROBAPLUS_FARM_ID);
  const farm = (farms || []).find((item) => !requestedFarmId || number(item.idFarm) === requestedFarmId);
  if (!farm?.idFarm) throw new Error('Nenhuma fazenda do Arroba Plus foi encontrada.');

  const farmId = number(farm.idFarm);
  const headers = await authorizedHeaders(user, farmId);
  const [rawAnimals, rawDeaths, rawEntries, rawEntryAnimals, rawExits, rawExitAnimals] = await Promise.all([
    requestApi('animal/GetAll', { idFarm: farmId }, { headers }),
    requestApi('animal/GetAllInactive', { idFarm: farmId }, { headers, allowEmpty: true }),
    requestApi('animalEntry/GetByFarmId', { id: farmId }, { headers, allowEmpty: true }),
    requestApi('animalEntryAnimal/getAll', { idFarm: farmId }, { headers, allowEmpty: true }),
    requestApi('animalExit/GetbyIdFarm', { idFarm: farmId }, { headers, allowEmpty: true }),
    requestApi('animalExitAnimal/getAll', { idFarm: farmId }, { headers, allowEmpty: true }),
  ]);

  const animals = (Array.isArray(rawAnimals) ? rawAnimals : []).map(normalizeAnimal);
  const deaths = (Array.isArray(rawDeaths) ? rawDeaths : []).map(normalizeDeath);
  const entryCounts = countBy(Array.isArray(rawEntryAnimals) ? rawEntryAnimals : [], ['IdAnimalEntry', 'idAnimalEntry']);
  const exitCounts = countBy(Array.isArray(rawExitAnimals) ? rawExitAnimals : [], ['IdAnimalExit', 'idAnimalExit']);
  const entries = (Array.isArray(rawEntries) ? rawEntries : []).map((entry) => normalizeEntry(entry, entryCounts));
  const exits = (Array.isArray(rawExits) ? rawExits : []).map((exit) => normalizeExit(exit, exitCounts));
  const snapshot = {
    source: 'Arroba Plus',
    farmId,
    farmName: text(farm.nameFarm || farm.farmName || farm.name),
    collectedAt: new Date().toISOString(),
    summary: buildSummary(animals, deaths, entries, exits),
    animals,
    deaths,
    entries,
    exits,
  };
  return snapshot;
}

async function collectSnapshot() {
  const snapshot = await collectData();
  await saveSnapshot(snapshot);
  return snapshot;
}

async function saveSnapshot(snapshot) {
  const { put } = await import('@vercel/blob');
  await put(SNAPSHOT_PATH, JSON.stringify(snapshot), {
    access: 'private',
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: 'application/json; charset=utf-8',
    cacheControlMaxAge: 60,
  });
}

async function readSnapshot() {
  const { get } = await import('@vercel/blob');
  const result = await get(SNAPSHOT_PATH, { access: 'private', useCache: false });
  if (!result || result.statusCode !== 200 || !result.stream) return null;
  return new Response(result.stream).json();
}

function filterSnapshot(snapshot, query = {}) {
  const view = ['animals', 'deaths', 'entries', 'exits'].includes(query.view) ? query.view : 'animals';
  const search = text(query.q).toLowerCase();
  const sex = text(query.sex).toUpperCase();
  const minWeight = number(query.minWeight);
  const maxWeight = number(query.maxWeight);
  const page = Math.max(1, Math.trunc(number(query.page) || 1));
  const pageSize = Math.min(100, Math.max(10, Math.trunc(number(query.pageSize) || 50)));
  const sourceRecords = Array.isArray(snapshot[view]) ? snapshot[view] : [];
  const filtered = sourceRecords.filter((record) => {
    const searchable = `${record.brinco || ''} ${record.id || ''} ${record.motivo || ''} ${record.destino || ''}`.toLowerCase();
    if (search && !searchable.includes(search)) return false;
    if (view === 'animals' && sex && record.sexo !== sex) return false;
    if (view === 'animals' && minWeight !== null && (record.peso === null || record.peso < minWeight)) return false;
    if (view === 'animals' && maxWeight !== null && (record.peso === null || record.peso > maxWeight)) return false;
    return true;
  });
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * pageSize;
  return {
    source: snapshot.source,
    farmId: snapshot.farmId,
    farmName: snapshot.farmName,
    collectedAt: snapshot.collectedAt,
    summary: snapshot.summary,
    view,
    resultCount: filtered.length,
    page: safePage,
    pageSize,
    totalPages,
    records: filtered.slice(start, start + pageSize),
  };
}

function isUpdateAuthorized(request) {
  if (request.method === 'POST') return true;
  const cronSecret = process.env.CRON_SECRET;
  const authorization = request.headers.authorization || '';
  return Boolean(cronSecret && secretsEqual(authorization, `Bearer ${cronSecret}`));
}

function secretsEqual(left, right) {
  const leftBuffer = Buffer.from(String(left));
  const rightBuffer = Buffer.from(String(right));
  return leftBuffer.length === rightBuffer.length && crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

module.exports = {
  buildAgeGroups,
  buildSummary,
  calculateAgeMonths,
  collectData,
  collectSnapshot,
  filterSnapshot,
  isUpdateAuthorized,
  normalizeAnimal,
  normalizeDeath,
  normalizeEntry,
  normalizeExit,
  readSnapshot,
};
