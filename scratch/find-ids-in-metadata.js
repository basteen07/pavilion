const fs = require('fs');

const metadata = JSON.parse(fs.readFileSync('metadata_clean.json', 'utf8'));

const ids = [
  '7baa3bd3-7ff2-4dcc-96d9-1b4e3e1ff517',
  '0b60d25c-3ffe-4bf6-b72d-323877093ba9',
  '8e28254d-ca38-4c73-afa2-93eb3dcbcfa4',
  '94d2c90e-0962-4bb1-bbed-b5cc95a06e7f',
  '138fc576-3558-4644-939b-cd81619d3b3c',
  '83a2bd95-f354-45b2-b679-27c1ec3f870e',
  'e67f0c7f-8729-4c28-8859-266bb351dbfc',
  '46973de4-137e-4959-8519-edad917f8da3',
  '1eec376c-4bb9-4492-ae13-79457addac82',
  'b5aacfb4-123a-4c87-9eca-9ee66c9d44ff',
  '70286c06-4728-4c06-892d-287b6679a769',
  '6a8ba48c-167f-4a26-b8a1-9ed9c404255a',
  '7a429bd7-bbec-4cf9-b6de-0cd1d98c1382',
  'bc4fc984-99b9-4fdd-990e-1cd7bdaf3017'
];

console.log('Searching in metadata_clean.json...');

// Let's traverse the JSON recursively and find any object containing these IDs
function search(obj, path = '') {
    if (!obj) return;
    if (typeof obj === 'string') {
        if (ids.includes(obj)) {
            console.log(`Found ID "${obj}" at path: ${path}`);
        }
        return;
    }
    if (Array.isArray(obj)) {
        obj.forEach((item, idx) => search(item, `${path}[${idx}]`));
        return;
    }
    if (typeof obj === 'object') {
        for (const [key, val] of Object.entries(obj)) {
            search(val, path ? `${path}.${key}` : key);
        }
    }
}

search(metadata);
