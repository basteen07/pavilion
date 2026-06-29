const fs = require('fs');
const path = require('path');

const ids = [
  '46973de4-137e-4959-8519-edad917f8da3',
  '1eec376c-4bb9-4492-ae13-79457addac82',
  'b5aacfb4-123a-4c87-9eca-9ee66c9d44ff',
  '70286c06-4728-4c06-892d-287b6679a769',
  '6a8ba48c-167f-4a26-b8a1-9ed9c404255a',
  '7a429bd7-bbec-4cf9-b6de-0cd1d98c1382',
  'bc4fc984-99b9-4fdd-990e-1cd7bdaf3017'
];

const filesToSearch = [
  'metadata-dump.json',
  'excel-dump.json',
  'clean-hierarchy.json',
  'cats_data.json',
  'sub_cats_debug.json',
  'sub_cats_tags.json',
  'temp_subcats.json'
];

for (const file of filesToSearch) {
    if (fs.existsSync(file)) {
        try {
            const content = fs.readFileSync(file, 'utf8');
            ids.forEach(id => {
                if (content.includes(id)) {
                    console.log(`Found ID "${id}" in file: ${file}`);
                    // Try to print some context around the ID
                    const index = content.indexOf(id);
                    const context = content.substring(Math.max(0, index - 200), Math.min(content.length, index + 250));
                    console.log(`Context:\n${context}\n`);
                }
            });
        } catch (e) {
            console.error(`Error reading ${file}:`, e);
        }
    }
}
