const test = require('node:test');
const assert = require('node:assert/strict');
const data = require('../apps.json');

test('app catalogue has unique, scored records', () => {
  const names = data.apps.map((app) => app.name.toLowerCase());
  assert.equal(new Set(names).size, names.length);
  for (const app of data.apps) {
    assert.match(app.risk_score, /^(Low|Medium|High)$/);
    assert.ok(app.score_count >= 1 && app.score_count <= 10);
    assert.ok(app.sources.length > 0);
  }
});
