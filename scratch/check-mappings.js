const fs = require('fs');

const mappings = JSON.parse(fs.readFileSync('product_mappings.json', 'utf8'));

// Filter mappings where sub_category_id is 4
const filtered = mappings.filter(m => m.sub_category_id === 4);

console.log('Mappings for sub_category_id 4 in product_mappings.json:');
console.log(JSON.stringify(filtered, null, 2));

// Let's also check if any of the brand_ids in these mappings correspond to the extra IDs we have
const extraIds = [
  '46973de4-137e-4959-8519-edad917f8da3',
  '1eec376c-4bb9-4492-ae13-79457addac82',
  'b5aacfb4-123a-4c87-9eca-9ee66c9d44ff',
  '70286c06-4728-4c06-892d-287b6679a769',
  '6a8ba48c-167f-4a26-b8a1-9ed9c404255a',
  '7a429bd7-bbec-4cf9-b6de-0cd1d98c1382',
  'bc4fc984-99b9-4fdd-990e-1cd7bdaf3017'
];

filtered.forEach(m => {
    if (extraIds.includes(m.brand_id)) {
        console.log(`Found mapping with brand_id: "${m.brand_id}"`);
    }
});
