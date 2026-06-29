const fs = require('fs');
if (fs.existsSync('clean-hierarchy.json')) {
    const data = JSON.parse(fs.readFileSync('clean-hierarchy.json', 'utf8'));
    console.log('Keys:', Object.keys(data));
    if (Array.isArray(data)) {
        console.log('Length:', data.length);
        console.log('Sample:', JSON.stringify(data.slice(0, 2), null, 2));
    } else {
        console.log('Type:', typeof data);
        console.log('Sample:', JSON.stringify(data, null, 2).substring(0, 1000));
    }
}
