const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, 'json');
const files = [];
function walk(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) walk(target);
    else if (entry.name.endsWith('.json')) files.push(target);
  }
}
walk(root);
for (const file of files) JSON.parse(fs.readFileSync(file, 'utf8'));
console.log(`Validated ${files.length} JSON files.`);
