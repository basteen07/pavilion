const fs = require('fs');

let content = fs.readFileSync('temp_tags.json', 'utf8');
if (content.startsWith('\uFEFF')) {
    content = content.slice(1);
}
const data = JSON.parse(content);
const filtered = data.value.filter(t => t.sub_category_id === 4);
console.log(JSON.stringify(filtered, null, 2));
