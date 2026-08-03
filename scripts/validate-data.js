const fs = require('node:fs');
const path = require('node:path');

const required = ['name', 'data_collected', 'shared_or_sold', 'risk_score', 'score_count', 'opt_out_or_delete', 'sources'];
const validRisks = new Set(['Low', 'Medium', 'High']);
const file = path.join(__dirname, '..', 'apps.json');
const { apps } = JSON.parse(fs.readFileSync(file, 'utf8'));
const seen = new Set();
const errors = [];

for (const app of apps) {
  for (const field of required) if (!app[field] && app[field] !== 0) errors.push(`${app.name || 'Unknown app'}: missing ${field}`);
  if (seen.has(app.name.toLowerCase())) errors.push(`${app.name}: duplicate name`);
  seen.add(app.name.toLowerCase());
  if (!validRisks.has(app.risk_score)) errors.push(`${app.name}: invalid risk_score ${app.risk_score}`);
  if (!Number.isInteger(app.score_count) || app.score_count < 1 || app.score_count > 10) errors.push(`${app.name}: score_count must be 1-10`);
  if (!Array.isArray(app.sources) || app.sources.some((source) => !/^https:\/\//.test(source))) errors.push(`${app.name}: sources must be HTTPS URLs`);
}

if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
console.log(`Validated ${apps.length} app records.`);
