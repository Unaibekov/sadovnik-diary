const assert = require('node:assert/strict');
const test = require('node:test');

const {
  buildRealisticReportBundle,
  validateRealisticReportBundle,
} = require('../../scripts/realisticReportGenerator');

test('realistic report bundle contains 10 employee reports and one golden report', async () => {
  const bundle = await buildRealisticReportBundle({ seed: 'unit-seed-1' });

  assert.equal(bundle.employeeReports.length, 10);
  assert.equal(Boolean(bundle.goldenReport), true);
  assert.equal(bundle.goldenReport.fileName, 'golden-integration-report.zip');
});

test('realistic report validator accepts the generated bundle', async () => {
  const bundle = await buildRealisticReportBundle({ seed: 'unit-seed-2' });

  assert.doesNotThrow(() => validateRealisticReportBundle(bundle));
});

test('derived child batches inherit the parent culture identity', async () => {
  const bundle = await buildRealisticReportBundle({ seed: 'unit-seed-3' });
  const cards = bundle.employeeReports.flatMap((entry) => entry.report.cards);
  const cardsById = new Map(cards.map((card) => [card.cardId, card]));
  const derivedCards = cards.filter((card) => ['cloned', 'problemIsolation'].includes(card.originType));

  assert.ok(derivedCards.length > 0);

  derivedCards.forEach((card) => {
    const parentCard = cardsById.get(card.parentCardId);

    assert.ok(parentCard, `missing parent for ${card.cardId}`);
    assert.equal(card.cultureName, parentCard.cultureName);
    assert.equal(card.speciesName, parentCard.speciesName);
    assert.equal(card.varietyName, parentCard.varietyName);
  });
});
