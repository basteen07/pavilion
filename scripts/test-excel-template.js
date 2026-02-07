
const ExcelJS = require('exceljs');

async function testTemplateGeneration() {
    console.log("Starting Excel Template Logic Verification...");

    const workbook = new ExcelJS.Workbook();
    const templateSheet = workbook.addWorksheet('Product Template');
    const masterSheet = workbook.addWorksheet('MasterLists');

    // Mock Masters Data
    const masters = {
        collections: [{ id: 1, name: 'Summer Collection' }, { id: 2, name: 'Winter Collection' }],
        categories: [
            { id: 10, name: 'Men', parent_collection_id: 1 },
            { id: 11, name: 'Women', parent_collection_id: 1 }
        ],
        subCategories: [
            { id: 100, name: 'Shirts', category_id: 10 },
            { id: 101, name: 'Trousers', category_id: 10 },
            { id: 102, name: 'Dresses', category_id: 11 }
        ],
        tags: [
            { id: 1000, name: 'Formal', sub_category_id: 100 },
            { id: 1001, name: 'Casual', sub_category_id: 100 }
        ],
        brands: [
            { id: 500, name: 'Nike', category_id: null, sub_category_id: null }, // Global
            { id: 501, name: 'Adidas', category_id: 10, sub_category_id: null }, // Cat specific
            { id: 502, name: 'Puma', category_id: 10, sub_category_id: 100 }   // Sub specific
        ]
    };

    // --- LOGIC FROM BulkUploadDialog.jsx START ---

    // Sanitization
    const specialChars = [' ', '-', '&', '(', ')', '.', '/', ',', "'", '+', '%', '@', '#', '!', '*', '$', '?', ';', ':', '[', ']', '{', '}', '~', '^', '=', '|', '<', '>', '`', '"', '\\'];
    const sanitize = (name) => {
        let cleanName = name.toLowerCase();
        specialChars.forEach(char => {
            cleanName = cleanName.split(char).join('_');
        });
        return '_' + cleanName;
    };

    const getSanitizedFormula = (cellRef, prefix = '') => {
        let formula = cellRef;
        specialChars.forEach(char => {
            const safeChar = char === '"' ? '""' : char;
            formula = `SUBSTITUTE(${formula}, "${safeChar}", "_")`;
        });
        return `INDIRECT("${prefix}" & LOWER(${formula}))`;
    };

    if (!workbook.model.definedNames) {
        workbook.model.definedNames = [];
    }

    // 1. Collections
    const colList = masters.collections.length > 0 ? masters.collections.map(c => c.name) : ['No Collections'];
    masterSheet.getColumn(1).values = ['Collections', ...colList];
    const colRange = `'MasterLists'!$A$2:$A$${colList.length + 1}`;
    workbook.model.definedNames.push({ name: 'CollectionList', ranges: [colRange] });

    let currentCol = 2;

    // 2. Categories
    masters.collections.forEach(coll => {
        const cats = masters.categories.filter(c => c.parent_collection_id === coll.id).map(c => c.name);
        const list = cats.length > 0 ? cats : ['No Categories'];
        masterSheet.getColumn(currentCol).values = [coll.name, ...list];
        const range = `'MasterLists'!$${masterSheet.getColumn(currentCol).letter}$2:$${masterSheet.getColumn(currentCol).letter}$${list.length + 1}`;
        workbook.model.definedNames.push({ name: sanitize('coll_' + coll.name), ranges: [range] });
        currentCol++;
    });

    // 3. Sub-Cats
    masters.categories.forEach(cat => {
        const subs = masters.subCategories.filter(s => s.category_id === cat.id).map(s => s.name);
        const list = subs.length > 0 ? subs : ['No Sub-Categories'];
        masterSheet.getColumn(currentCol).values = [cat.name, ...list];
        const range = `'MasterLists'!$${masterSheet.getColumn(currentCol).letter}$2:$${masterSheet.getColumn(currentCol).letter}$${list.length + 1}`;
        workbook.model.definedNames.push({ name: sanitize('cat_' + cat.name), ranges: [range] });
        currentCol++;
    });

    // 4. Brands Logic
    const globalBrands = masters.brands.filter(b => !b.category_id && !b.sub_category_id).map(b => b.name);
    if (globalBrands.length > 0) {
        masterSheet.getColumn(currentCol).values = ['GlobalBrands', ...globalBrands];
        const range = `'MasterLists'!$${masterSheet.getColumn(currentCol).letter}$2:$${masterSheet.getColumn(currentCol).letter}$${globalBrands.length + 1}`;
        workbook.model.definedNames.push({ name: 'Brand_Global', ranges: [range] });
        currentCol++;
    }

    // Data Validation Application (Row 2)
    const i = 2;
    const collRef = `O${i}`;
    const catRef = `P${i}`;
    const subRef = `Q${i}`;

    const catValidation = {
        type: 'list',
        allowBlank: true,
        formulae: [getSanitizedFormula(collRef, '_coll_')]
    };

    // --- LOGIC END ---

    // VERIFICATION
    console.log("\n--- VERIFICATION RESULTS ---");

    // 1. Check Named Ranges
    console.log("\n1. Defined Names (Named Ranges):");
    workbook.model.definedNames.forEach(dn => {
        console.log(`   Name: ${dn.name}, Range: ${dn.ranges[0]}`);
    });

    // 2. Check Formulas
    console.log("\n2. Data Validation Formulas (Row 2):");
    console.log(`   Category Dropdown Formula (Dependent on Collection ${collRef}):`);
    console.log(`   ${getSanitizedFormula(collRef, '_coll_')}`);

    console.log(`   Sub-Category Dropdown Formula (Dependent on Category ${catRef}):`);
    console.log(`   ${getSanitizedFormula(catRef, '_cat_')}`);

    // 3. Sanity Check
    const hasSingleQuotes = workbook.model.definedNames.every(dn => dn.ranges[0].includes("'MasterLists'"));
    console.log(`\n3. Sanity Check: All ranges use single quotes? ${hasSingleQuotes ? 'PASS' : 'FAIL'}`);

    const sampleSanitize = sanitize('Summer Collection');
    console.log(`   Sanitization Test ('Summer Collection' -> '_summer_collection'): ${sampleSanitize === '_summer_collection' ? 'PASS' : 'FAIL (' + sampleSanitize + ')'}`);

}

testTemplateGeneration().catch(console.error);
