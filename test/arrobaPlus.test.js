const test = require('node:test');
const assert = require('node:assert/strict');

const {
  buildAgeGroups,
  calculateAgeMonths,
  filterSnapshot,
  isReadAuthorized,
  isUpdateAuthorized,
  normalizeAnimal,
  normalizeDeath,
  normalizeEntry,
  normalizeExit,
} = require('../api/_lib/arrobaPlus');

test('normalizeAnimal uses SISBOV as the displayed earring', () => {
  const animal = normalizeAnimal({
    idAnimal: 12,
    codeSisboV: '  BR-001  ',
    codeEarring: '',
    sex: 'f',
    weight: '312.5',
    weightInitial: '205',
    idadeMesAnimal: 18,
  });

  assert.equal(animal.brinco, 'BR-001');
  assert.equal(animal.sexo, 'F');
  assert.equal(animal.peso, 312.5);
  assert.equal(animal.pesoInicial, 205);
});

test('filterSnapshot filters and paginates without applying empty weight limits', () => {
  const animals = Array.from({ length: 25 }, (_, index) => ({
    id: index + 1,
    brinco: `FH-${String(index + 1).padStart(3, '0')}`,
    sexo: index % 2 ? 'F' : 'M',
    peso: 200 + index,
  }));
  const snapshot = {
    source: 'Arroba Plus',
    collectedAt: '2026-09-20T12:00:00.000Z',
    summary: { total: animals.length },
    animals,
  };

  const result = filterSnapshot(snapshot, { q: 'FH-0', sex: 'F', page: '2', pageSize: '10' });

  assert.equal(result.resultCount, 12);
  assert.equal(result.page, 2);
  assert.equal(result.totalPages, 2);
  assert.equal(result.records.length, 2);
  assert.ok(result.records.every((animal) => animal.sexo === 'F'));
});

test('filterSnapshot applies inclusive weight limits', () => {
  const snapshot = {
    summary: {},
    animals: [
      { id: 1, brinco: 'A', sexo: 'M', peso: 199 },
      { id: 2, brinco: 'B', sexo: 'M', peso: 200 },
      { id: 3, brinco: 'C', sexo: 'F', peso: 300 },
      { id: 4, brinco: 'D', sexo: 'F', peso: 301 },
    ],
  };

  const result = filterSnapshot(snapshot, { minWeight: '200', maxWeight: '300' });
  assert.deepEqual(result.records.map((animal) => animal.id), [2, 3]);
});

test('age groups cover the complete configured cattle range', () => {
  const groups = buildAgeGroups([0, 6, 7, 12, 13, 18, 19, 24, 25, 36, 37].map((idadeMeses) => ({ idadeMeses })));
  assert.deepEqual(groups.map((group) => group.total), [2, 2, 2, 2, 2, 1]);
});

test('age in months falls back to the animal birth date', () => {
  assert.equal(calculateAgeMonths('2025-08-21', new Date(2026, 8, 20)), 12);
  assert.equal(calculateAgeMonths('2026-09-20', new Date(2026, 8, 20)), 0);
  assert.equal(calculateAgeMonths('', new Date(2026, 8, 20)), null);
});

test('entry, death and exit records are normalized for the website', () => {
  const entry = normalizeEntry(
    { Id: 3703, Reason: 'nascimento', Start: '2026-09-18', Breed: 'Cruzamento Industrial' },
    new Map([[3703, 33]]),
  );
  const death = normalizeDeath({ idAnimal: 8, codeSisboV: 'FH-8', dateDead: '2026-08-26', causeDead: 223 });
  const exit = normalizeExit(
    { Id: 90, dateBoarding: '2026-10-01', customerName: 'Destino', statusDescription: 'Finalizada' },
    new Map([[90, 12]]),
  );

  assert.equal(entry.animais, 33);
  assert.equal(entry.motivo, 'nascimento');
  assert.equal(death.dataMorte, '2026-08-26');
  assert.equal(death.causaMorte, '223');
  assert.equal(exit.animais, 12);
  assert.equal(exit.destino, 'Destino');
});

test('filterSnapshot selects entries and deaths independently', () => {
  const snapshot = {
    summary: {},
    animals: [],
    deaths: [{ id: 1, brinco: 'FH-MORTE' }],
    entries: [{ id: 3703, motivo: 'nascimento' }, { id: 3699, motivo: 'carga' }],
    exits: [],
  };

  const entries = filterSnapshot(snapshot, { view: 'entries', q: 'nascimento' });
  const deaths = filterSnapshot(snapshot, { view: 'deaths' });
  assert.deepEqual(entries.records.map((record) => record.id), [3703]);
  assert.deepEqual(deaths.records.map((record) => record.id), [1]);
});

test('Arroba Plus endpoints require the configured secrets', () => {
  const previousReadSecret = process.env.ARROBAPLUS_READ_SECRET;
  const previousRefreshSecret = process.env.ARROBAPLUS_REFRESH_SECRET;
  process.env.ARROBAPLUS_READ_SECRET = 'read-secret';
  process.env.ARROBAPLUS_REFRESH_SECRET = 'refresh-secret';

  try {
    assert.equal(isReadAuthorized({ headers: { 'x-arrobaplus-secret': 'read-secret' } }), true);
    assert.equal(isReadAuthorized({ headers: { 'x-arrobaplus-secret': 'wrong' } }), false);
    assert.equal(isUpdateAuthorized({ headers: { 'x-refresh-secret': 'refresh-secret' } }), true);
    assert.equal(isUpdateAuthorized({ headers: { 'x-refresh-secret': 'wrong' } }), false);
  } finally {
    if (previousReadSecret === undefined) delete process.env.ARROBAPLUS_READ_SECRET;
    else process.env.ARROBAPLUS_READ_SECRET = previousReadSecret;
    if (previousRefreshSecret === undefined) delete process.env.ARROBAPLUS_REFRESH_SECRET;
    else process.env.ARROBAPLUS_REFRESH_SECRET = previousRefreshSecret;
  }
});
