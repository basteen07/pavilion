const XLSX = require('xlsx');
const path = require('path');

try {
    const workbook = XLSX.readFile(path.join(__dirname, '..', 'Brand Names.xlsx'));
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet);
    
    const brandsSet = new Set();
    data.forEach(row => {
        // Collect from all possible Brand Name columns
        for (const key in row) {
            if (key.startsWith('Brand Name')) {
                const val = row[key];
                if (val && typeof val === 'string') {
                    const cleaned = val.trim();
                    if (cleaned) {
                        brandsSet.add(cleaned);
                    }
                }
            }
        }
    });

    const sortedBrands = Array.from(brandsSet).sort();
    console.log('Total unique brands extracted:', sortedBrands.length);
    console.log('Unique brands list:', JSON.stringify(sortedBrands, null, 2));
} catch (err) {
    console.error('Error reading excel:', err);
}
