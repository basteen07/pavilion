const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

async function dump() {
    try {
        const filePath = path.join(__dirname, 'Category Code List.xlsx');
        const workbook = XLSX.readFile(filePath);
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        fs.writeFileSync('excel-dump.json', JSON.stringify(data, null, 2));
        console.log('Dumped to excel-dump.json');
    } catch (err) {
        console.error(err);
    }
}

dump();
