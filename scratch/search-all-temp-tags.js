const fs = require('fs');

let content = fs.readFileSync('temp_tags.json', 'utf8');
if (content.startsWith('\uFEFF')) {
    content = content.slice(1);
}
const data = JSON.parse(content);
const tags = data.value || data;

const targetIds = [
  '46973de4-137e-4959-8519-edad917f8da3',
  '1eec376c-4bb9-4492-ae13-79457addac82',
  'b5aacfb4-123a-4c87-9eca-9ee66c9d44ff',
  '70286c06-4728-4c06-892d-287b6679a769',
  '6a8ba48c-167f-4a26-b8a1-9ed9c404255a',
  '7a429bd7-bbec-4cf9-b6de-0cd1d98c1382',
  'bc4fc984-99b9-4fdd-990e-1cd7bdaf3017'
];

tags.forEach(tag => {
    if (tag.brand_ids) {
        tag.brand_ids.forEach(bid => {
            if (targetIds.includes(bid)) {
                console.log(`Found target ID "${bid}" in tag: "${tag.name}" (sub_category_id: ${tag.sub_category_id})`);
            }
        });
    }
});
