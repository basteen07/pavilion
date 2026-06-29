const fs = require('fs');

if (fs.existsSync('clean-hierarchy.json')) {
    const data = JSON.parse(fs.readFileSync('clean-hierarchy.json', 'utf8'));
    console.log('clean-hierarchy.json structure:');
    
    // Find the tag English Willow Cricket Bats
    // Recursively search for any object with name: 'English Willow Cricket Bats'
    function search(obj, path = '') {
        if (!obj) return;
        if (obj.name === 'English Willow Cricket Bats') {
            console.log(`Found tag at path ${path}:`, obj);
        }
        if (Array.isArray(obj)) {
            obj.forEach((item, idx) => search(item, `${path}[${idx}]`));
        } else if (typeof obj === 'object') {
            for (const [key, val] of Object.entries(obj)) {
                search(val, path ? `${path}.${key}` : key);
            }
        }
    }
    search(data);
} else {
    console.log('clean-hierarchy.json not found');
}
