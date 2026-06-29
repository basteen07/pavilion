const XLSX = require('xlsx');
const fs = require('fs');

async function run() {
    if (!fs.existsSync('Brand Names.xlsx')) {
        console.log('Brand Names.xlsx not found.');
        return;
    }

    const workbook = XLSX.readFile('Brand Names.xlsx');
    const sheetNames = workbook.SheetNames;
    console.log('Sheet Names:', sheetNames);

    for (const sheetName of sheetNames) {
        const sheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(sheet);
        console.log(`\nSheet "${sheetName}" has ${data.length} rows.`);
        console.log('Sample rows:', data.slice(0, 10));
    }
}

run().catch(console.error);
