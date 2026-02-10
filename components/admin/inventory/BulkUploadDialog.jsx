'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { toast } from 'sonner'
import { FileUp, Info, AlertCircle, CheckCircle2, Download } from 'lucide-react'
import * as XLSX from 'xlsx'
import ExcelJS from 'exceljs'
import { apiCall } from '@/lib/api-client'
import { Progress } from "@/components/ui/progress"
import { useQueryClient } from '@tanstack/react-query'

export function BulkUploadDialog({ open, onOpenChange }) {
    const [file, setFile] = useState(null)
    const [uploading, setUploading] = useState(false)
    const [uploadProgress, setUploadProgress] = useState(0)
    const [processedTotal, setProcessedTotal] = useState(0)
    const [results, setResults] = useState(null)
    const [masters, setMasters] = useState(null)
    const [view, setView] = useState('upload') // 'upload' or 'grid'
    const [gridData, setGridData] = useState([])
    const queryClient = useQueryClient()

    useEffect(() => {
        if (open) {
            apiCall('/admin/bulk-template-masters')
                .then(data => {
                    console.log('Bulk Template Masters Loaded:', data);
                    setMasters(data);
                })
                .catch(err => {
                    console.error('Failed to load masters:', err);
                    toast.error('Failed to load master data');
                })
        }
    }, [open])

    const handleFileChange = (e) => {
        const selectedFile = e.target.files[0]
        if (selectedFile) {
            setFile(selectedFile)
            setResults(null)
        }
    }

    const downloadTemplate = async (format = 'xls') => {
        try {
            if (format === 'csv') {
                // Keep CSV simple with XLSX
                const templateData = [{
                    'Product Handle': 'example-product-1',
                    'Product Name *': 'Example Product Name',
                    'SKU *': 'SKU-001',
                    'Option1 Name': 'Size',
                    'Option1 Value': 'M',
                    'MRP Price *': 999,
                    'Dealer Price': 800,
                    'Collection': masters?.collections?.[0]?.name || '',
                    'Category': masters?.categories?.[0]?.name || '',
                    'Sub-Category': masters?.subCategories?.[0]?.name || '',
                    'Tag': masters?.tags?.[0]?.name || '',
                    'Brand': masters?.brands?.[0]?.name || '',
                    'Unit/UoM': 'Nos',
                    'Description': 'Full description'
                }]
                const worksheet = XLSX.utils.json_to_sheet(templateData)
                const workbook = XLSX.utils.book_new()
                XLSX.utils.book_append_sheet(workbook, worksheet, 'Product Template')
                XLSX.writeFile(workbook, 'pavilion_product_template.csv', { bookType: 'csv' })
                toast.success('CSV Template downloaded!')
                return
            }

            if (!masters) {
                toast.error('Master data not loaded yet. Please wait...')
                return
            }

            // Advanced Excel with ExcelJS
            const workbook = new ExcelJS.Workbook()
            const templateSheet = workbook.addWorksheet('Product Template')
            const masterSheet = workbook.addWorksheet('MasterLists')

            // Define Columns
            const columns = [
                { header: 'Product Handle (Optional)', key: 'handle', width: 25 },
                { header: 'Product Name *', key: 'name', width: 40 },
                { header: 'SKU *', key: 'sku', width: 20 },
                { header: 'Option1 Name', key: 'opt1n', width: 15 },
                { header: 'Option1 Value', key: 'opt1v', width: 15 },
                { header: 'Option2 Name', key: 'opt2n', width: 15 },
                { header: 'Option2 Value', key: 'opt2v', width: 15 },
                { header: 'Option3 Name', key: 'opt3n', width: 15 },
                { header: 'Option3 Value', key: 'opt3v', width: 15 },
                { header: 'Option4 Name', key: 'opt4n', width: 15 },
                { header: 'Option4 Value', key: 'opt4v', width: 15 },
                { header: 'Size', key: 'size', width: 10 },
                { header: 'Color', key: 'color', width: 15 },
                { header: 'MRP Price *', key: 'mrp', width: 15 },
                { header: 'Dealer Price', key: 'dealer', width: 15 },
                { header: 'Counter Price', key: 'counter', width: 15 },
                { header: 'Recommended Price', key: 'rec', width: 15 },
                { header: 'Shop Price', key: 'shop', width: 15 },
                { header: 'Collection', key: 'coll', width: 20 },
                { header: 'Category *', key: 'cat', width: 20 },
                { header: 'Sub-Category', key: 'sub', width: 20 },
                { header: 'Tag', key: 'tag', width: 20 },
                { header: 'Brand *', key: 'brand', width: 20 },
                { header: 'Description', key: 'desc', width: 50 },
                { header: 'Short Description', key: 'short_desc', width: 30 },
                { header: 'HSN Code', key: 'hsn', width: 15 },
                { header: 'Tax Class', key: 'tax', width: 15 },
                { header: 'Buy URL', key: 'url', width: 30 },
                { header: 'Unit/UoM', key: 'unit', width: 10 },
                { header: 'Images', key: 'imgs', width: 40 }
            ]

            // Apply columns and headers
            templateSheet.columns = columns

            // Style headers
            templateSheet.getRow(1).font = { bold: true }
            templateSheet.getRow(1).fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFE0E0E0' }
            }

            // Add Note for Variants
            templateSheet.getCell('A1').note = {
                texts: [
                    { font: { bold: true }, text: 'Variant Grouping:\n' },
                    { text: '1. (Recommended) Use the same "Product Handle" for variants.\n' },
                    { text: '2. (Alternative) Use the same "Product Name" (rows must be together) to group variants automatically if handle is empty.' }
                ]
            }

            // ADD SAMPLE ROW (Aligned with 28 columns)
            const sampleRow = [
                'sample-product-1', // A (Handle)
                'Sample Product T-Shirt', // B (Name)
                'SKU-SAMPLE-001', // C (SKU)
                'Size', // D (Opt1 Name)
                'L', // E (Opt1 Val)
                'Color', // F (Opt2 Name)
                'Blue', // G (Opt2 Val)
                '', // H (Opt3 Name)
                '', // I (Opt3 Val)
                '', // J (Opt4 Name)
                '', // K (Opt4 Val)
                'L', // L (Size)
                'Blue', // M (Color)
                1500, // N (MRP)
                1000, // O (Dealer)
                0, // P (Counter)
                0, // Q (Rec)
                0, // R (Shop)
                masters.collections?.[0]?.name || '', // S (Coll)
                masters.categories?.[0]?.name || '',  // T (Cat)
                '', // U (Sub)
                '', // V (Tag)
                '', // W (Brand)
                'This is a sample description.', // X (Desc)
                'Sample Short Desc', // Y (Short Desc)
                '999999', // Z (HSN)
                '18', // AA (Tax Class)
                '', // AB (Buy URL)
                '1', // AC (Unit)
                '' // AD (Images)
            ]
            templateSheet.addRow(sampleRow)

            // Improved sanitization for Excel compliance
            const sanitize = (name) => {
                let s = name
                    .toLowerCase()
                    .replace(/[^a-z0-9]/g, '_')
                    .replace(/_+/g, '_')
                    .replace(/^_|_$/g, '') || 'unnamed';
                // Excel names cannot start with a number
                if (/^[0-9]/.test(s)) s = '_' + s;
                return s;
            }

            // MasterLists Populating
            // 1. Collections (Column A)
            const colList = (masters?.collections?.length || 0) > 0 ? masters.collections.map(c => c.name) : ['No Collections']
            masterSheet.getColumn(1).values = ['Collections', ...colList]
            workbook.definedNames.add(`MasterLists!$A$2:$A$${colList.length + 1}`, 'CollectionList')

            // 2. Global Lists (all items for fallback)
            const allCats = (masters?.categories?.length || 0) > 0 ? masters.categories.map(c => c.name) : ['No Categories']
            const allSubs = (masters?.subCategories?.length || 0) > 0 ? masters.subCategories.map(s => s.name) : ['No Sub-Categories']
            const allTgs = (masters?.tags?.length || 0) > 0 ? masters.tags.map(t => t.name) : ['No Tags']

            masterSheet.getColumn(8).values = ['AllCategories', ...allCats]
            workbook.definedNames.add(`MasterLists!$H$2:$H$${allCats.length + 1}`, 'AllCategoryList')

            masterSheet.getColumn(9).values = ['AllSubCategories', ...allSubs]
            workbook.definedNames.add(`MasterLists!$I$2:$I$${allSubs.length + 1}`, 'AllSubCategoryList')

            masterSheet.getColumn(10).values = ['AllTags', ...allTgs]
            workbook.definedNames.add(`MasterLists!$J$2:$J$${allTgs.length + 1}`, 'AllTagList')

            // 3. Mapping Tables for VLOOKUP
            // Collection -> Category Mapping (Cols B & C)
            const collCatMap = (masters?.collections || []).map(coll => [coll.name, sanitize('cat_' + coll.name)])
            masterSheet.getColumn(2).values = ['Collection', ...collCatMap.map(r => r[0])]
            masterSheet.getColumn(3).values = ['RangeName', ...collCatMap.map(r => r[1])]
            workbook.definedNames.add(`MasterLists!$B$2:$C$${Math.max(2, collCatMap.length + 1)}`, 'CollectionCategoryMap')

            // Category -> Sub-Category Mapping (Cols D & E)
            const catSubMap = (masters?.categories || []).map(cat => [cat.name, sanitize('sub_' + cat.name)])
            masterSheet.getColumn(4).values = ['Category', ...catSubMap.map(r => r[0])]
            masterSheet.getColumn(5).values = ['RangeName', ...catSubMap.map(r => r[1])]
            workbook.definedNames.add(`MasterLists!$D$2:$E$${Math.max(2, catSubMap.length + 1)}`, 'CategorySubCategoryMap')

            // Sub-Category -> Tag Mapping (Cols F & G)
            const subTagMap = (masters?.subCategories || []).map(sub => [sub.name, sanitize('tag_' + sub.name)])
            masterSheet.getColumn(6).values = ['SubCategory', ...subTagMap.map(r => r[0])]
            masterSheet.getColumn(7).values = ['RangeName', ...subTagMap.map(r => r[1])]
            workbook.definedNames.add(`MasterLists!$F$2:$G$${Math.max(2, subTagMap.length + 1)}`, 'SubCategoryTagMap')

            // 4. Brands (Column K)
            const brandList = (masters?.brands?.length || 0) > 0 ? masters.brands.map(b => b.name) : ['Generic']
            masterSheet.getColumn(11).values = ['Brands', ...brandList]
            workbook.definedNames.add(`MasterLists!$K$2:$K$${brandList.length + 1}`, 'BrandList')

            // 5. Static Lists (Tax, Active, Featured)
            const taxRates = ['0', '5', '12', '18', '28']
            const bools = ['TRUE', 'FALSE']
            masterSheet.getColumn(30).values = ['TaxRates', ...taxRates] // Col AD
            workbook.definedNames.add(`MasterLists!$AD$2:$AD$${taxRates.length + 1}`, 'TaxRateList')

            masterSheet.getColumn(31).values = ['Booleans', ...bools] // Col AE
            workbook.definedNames.add(`MasterLists!$AE$2:$AE$${bools.length + 1}`, 'BooleanList')

            // 6. Child Ranges (Start from Col M)
            let currentCol = 13;

            // Categories by Collection
            (masters?.collections || []).forEach(coll => {
                const cats = (masters?.categories || []).filter(c => c.parent_collection_id === coll.id).map(c => c.name);
                const list = cats.length > 0 ? cats : ['No Categories'];
                masterSheet.getColumn(currentCol).values = [coll.name, ...list];
                workbook.definedNames.add(`MasterLists!$${masterSheet.getColumn(currentCol).letter}$2:$${masterSheet.getColumn(currentCol).letter}$${list.length + 1}`, sanitize('cat_' + coll.name));
                currentCol++;
            });

            // Sub-Categories by Category
            (masters?.categories || []).forEach(cat => {
                const subs = (masters?.subCategories || []).filter(s => s.category_id === cat.id).map(s => s.name);
                const list = subs.length > 0 ? subs : ['No Sub-Categories'];
                masterSheet.getColumn(currentCol).values = [cat.name, ...list];
                workbook.definedNames.add(`MasterLists!$${masterSheet.getColumn(currentCol).letter}$2:$${masterSheet.getColumn(currentCol).letter}$${list.length + 1}`, sanitize('sub_' + cat.name));
                currentCol++;
            });

            // Tags by Sub-Category
            (masters?.subCategories || []).forEach(sub => {
                const tgs = (masters?.tags || []).filter(t => t.sub_category_id === sub.id).map(t => t.name);
                const list = tgs.length > 0 ? tgs : ['No Tags'];
                masterSheet.getColumn(currentCol).values = [sub.name, ...list];
                workbook.definedNames.add(`MasterLists!$${masterSheet.getColumn(currentCol).letter}$2:$${masterSheet.getColumn(currentCol).letter}$${list.length + 1}`, sanitize('tag_' + sub.name));
                currentCol++;
            });

            // Brands by Category
            const catBrandMapping = [];
            (masters?.categories || []).forEach(cat => {
                const brs = (masters?.brands || []).filter(b => b.category_id === cat.id).map(b => b.name);
                if (brs.length > 0) {
                    const rangeName = sanitize('br_cat_' + cat.name);
                    masterSheet.getColumn(currentCol).values = [cat.name, ...brs];
                    workbook.definedNames.add(`MasterLists!$${masterSheet.getColumn(currentCol).letter}$2:$${masterSheet.getColumn(currentCol).letter}$${brs.length + 1}`, rangeName);
                    catBrandMapping.push([cat.name, rangeName]);
                    currentCol++;
                }
            });

            // Category -> Brand Mapping Table (New Cols)
            const catBrMapStartCol = currentCol;
            masterSheet.getColumn(catBrMapStartCol).values = ['Category', ...catBrandMapping.map(r => r[0])];
            masterSheet.getColumn(catBrMapStartCol + 1).values = ['RangeName', ...catBrandMapping.map(r => r[1])];
            workbook.definedNames.add(`MasterLists!$${masterSheet.getColumn(catBrMapStartCol).letter}$2:$${masterSheet.getColumn(catBrMapStartCol + 1).letter}$${Math.max(2, catBrandMapping.length + 1)}`, 'CategoryBrandMap');
            currentCol += 2;

            // Brands by Sub-Category
            const subBrandMapping = [];
            (masters?.subCategories || []).forEach(sub => {
                const brs = (masters?.brands || []).filter(b => b.sub_category_id === sub.id).map(b => b.name);
                if (brs.length > 0) {
                    const rangeName = sanitize('br_sub_' + sub.name);
                    masterSheet.getColumn(currentCol).values = [sub.name, ...brs];
                    workbook.definedNames.add(`MasterLists!$${masterSheet.getColumn(currentCol).letter}$2:$${masterSheet.getColumn(currentCol).letter}$${brs.length + 1}`, rangeName);
                    subBrandMapping.push([sub.name, rangeName]);
                    currentCol++;
                }
            });
            // Sub-Category -> Brand Mapping Table
            const subBrMapStartCol = currentCol
            masterSheet.getColumn(subBrMapStartCol).values = ['SubCategory', ...subBrandMapping.map(r => r[0])]
            masterSheet.getColumn(subBrMapStartCol + 1).values = ['RangeName', ...subBrandMapping.map(r => r[1])]
            workbook.definedNames.add(`MasterLists!$${masterSheet.getColumn(subBrMapStartCol).letter}$2:$${masterSheet.getColumn(subBrMapStartCol + 1).letter}$${Math.max(2, subBrandMapping.length + 1)}`, 'SubCategoryBrandMap')
            currentCol += 2

            // Unit List (Added to master)
            const unitList = ['1', 'pair', 'Nos', 'Kg', 'Ltr', 'Pcs']
            masterSheet.getColumn(32).values = ['Units', ...unitList] // Col AF
            workbook.definedNames.add(`MasterLists!$AF$2:$AF$${unitList.length + 1}`, 'UnitList')

            // Empty List (for failed lookups)
            masterSheet.getCell('AG2').value = '- No Matches -'
            workbook.definedNames.add('MasterLists!$AG$2:$AG$2', 'EmptyList')

            // Apply Data Validation to 100 rows
            for (let i = 2; i <= 101; i++) {
                // Collection (Column S)
                templateSheet.getCell(`S${i}`).dataValidation = {
                    type: 'list',
                    allowBlank: true,
                    formulae: ['=CollectionList'],
                    showErrorMessage: true,
                    errorTitle: 'Invalid Collection',
                    error: 'Please select a collection from the list'
                }

                // Category (Column T) - Cascading
                templateSheet.getCell(`T${i}`).dataValidation = {
                    type: 'list',
                    allowBlank: true,
                    formulae: [`=IF(S${i}="", AllCategoryList, IF(ISERROR(VLOOKUP(S${i}, CollectionCategoryMap, 2, FALSE)), EmptyList, INDIRECT(VLOOKUP(S${i}, CollectionCategoryMap, 2, FALSE))))`],
                    showErrorMessage: true,
                    errorTitle: 'Invalid Category',
                    error: 'Please select a category from the list'
                }

                // Sub-Category (Column U) - Cascading
                templateSheet.getCell(`U${i}`).dataValidation = {
                    type: 'list',
                    allowBlank: true,
                    formulae: [`=IF(T${i}="", AllSubCategoryList, IF(ISERROR(VLOOKUP(T${i}, CategorySubCategoryMap, 2, FALSE)), EmptyList, INDIRECT(VLOOKUP(T${i}, CategorySubCategoryMap, 2, FALSE))))`],
                    showErrorMessage: true,
                    errorTitle: 'Invalid Sub-Category',
                    error: 'Please select a sub-category from the list'
                }

                // Tag (Column V) - Cascading
                templateSheet.getCell(`V${i}`).dataValidation = {
                    type: 'list',
                    allowBlank: true,
                    formulae: [`=IF(U${i}="", AllTagList, IF(ISERROR(VLOOKUP(U${i}, SubCategoryTagMap, 2, FALSE)), EmptyList, INDIRECT(VLOOKUP(U${i}, SubCategoryTagMap, 2, FALSE))))`],
                    showErrorMessage: true,
                    errorTitle: 'Invalid Tag',
                    error: 'Please select a tag from the list'
                }

                // Brand (Column W) - Cascading
                templateSheet.getCell(`W${i}`).dataValidation = {
                    type: 'list',
                    allowBlank: true,
                    formulae: [`=IF(U${i}<>"", IF(ISERROR(VLOOKUP(U${i}, SubCategoryBrandMap, 2, FALSE)), EmptyList, INDIRECT(VLOOKUP(U${i}, SubCategoryBrandMap, 2, FALSE))), IF(T${i}<>"", IF(ISERROR(VLOOKUP(T${i}, CategoryBrandMap, 2, FALSE)), EmptyList, INDIRECT(VLOOKUP(T${i}, CategoryBrandMap, 2, FALSE))), BrandList))`],
                    showErrorMessage: true,
                    errorTitle: 'Invalid Brand',
                    error: 'Please select a brand from the list'
                }

                // Tax (Column AA)
                templateSheet.getCell(`AA${i}`).dataValidation = {
                    type: 'list',
                    allowBlank: true,
                    formulae: ['=TaxRateList'],
                    showErrorMessage: true,
                    errorTitle: 'Invalid Tax',
                    error: 'Please select a tax rate'
                }

                // Unit (Column AC)
                templateSheet.getCell(`AC${i}`).dataValidation = {
                    type: 'list',
                    allowBlank: true,
                    formulae: ['=UnitList'],
                    showErrorMessage: true,
                    errorTitle: 'Invalid Unit',
                    error: 'Please select a unit from the list'
                }
            }

            // Hide master sheet
            masterSheet.state = 'hidden'

            // Write File
            const buffer = await workbook.xlsx.writeBuffer()
            const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
            const url = window.URL.createObjectURL(blob)
            const anchor = document.createElement('a')
            anchor.href = url
            anchor.download = 'pavilion_advanced_template.xlsx'
            anchor.click()
            window.URL.revokeObjectURL(url)

            toast.success('Advanced Template downloaded with dropdowns!')
        } catch (error) {
            console.error('Template download error:', error)
            toast.error('Failed to download template. Please try again.')
        }
    }

    const handleGridSubmit = async () => {
        if (gridData.length === 0) return;
        setUploading(true);
        setUploadProgress(0);
        setProcessedTotal(0);

        let aggregateResults = {
            created: 0,
            updated: 0,
            variants_created: 0,
            variants_updated: 0,
            skipped: 0,
            errors: []
        };

        const BATCH_SIZE = 500;
        const totalRows = gridData.length;

        try {
            for (let i = 0; i < totalRows; i += BATCH_SIZE) {
                const batch = gridData.slice(i, i + BATCH_SIZE);
                const response = await apiCall('/products/bulk', {
                    method: 'POST',
                    body: JSON.stringify(batch)
                });

                aggregateResults.created += (response.created || 0);
                aggregateResults.updated += (response.updated || 0);
                aggregateResults.variants_created += (response.variants_created || 0);
                aggregateResults.variants_updated += (response.variants_updated || 0);
                aggregateResults.skipped += (response.skipped || 0);
                if (response.errors) {
                    aggregateResults.errors.push(...response.errors);
                }

                const processed = Math.min(i + BATCH_SIZE, totalRows);
                setProcessedTotal(processed);
                setUploadProgress(Math.round((processed / totalRows) * 100));
            }

            setResults(aggregateResults);
            queryClient.invalidateQueries(['products']);
            toast.success('Grid data processed successfully!');
        } catch (error) {
            console.error('Grid submit error:', error);
            toast.error('Failed to submit grid data');
        } finally {
            setUploading(false);
        }
    }

    const addGridRow = () => {
        setGridData([...gridData, {
            product_name: '',
            sku: '',
            mrp_price: 0,
            dealer_price: 0,
            counter_price: 0,
            recommended_price: 0,
            shop_price: 0,
            collection: '',
            category: '',
            sub_category: '',
            tag: '',
            brand: '',
            unit: '',
            option1_name: 'Size',
            option1_value: '',
            option2_name: 'Color',
            option2_value: '',
            option3_name: '',
            option3_value: '',
            option4_name: '',
            option4_value: '',
            _id: Math.random().toString(36).substr(2, 9)
        }]);
    }

    const updateGridRow = (id, updates) => {
        setGridData(prev => prev.map(row => {
            if (row._id === id) {
                const newRow = { ...row, ...updates };
                // Reset child fields if parent changes
                if (updates.collection !== undefined) {
                    newRow.category = '';
                    newRow.sub_category = '';
                    newRow.tag = '';
                } else if (updates.category !== undefined) {
                    newRow.sub_category = '';
                    newRow.tag = '';
                } else if (updates.sub_category !== undefined) {
                    newRow.tag = '';
                }
                return newRow;
            }
            return row;
        }));
    }

    const removeGridRow = (id) => {
        setGridData(prev => prev.filter(row => row._id !== id));
    }

    const handleUpload = async () => {
        if (!file) return

        setUploading(true)
        try {
            const reader = new FileReader()
            reader.onload = async (e) => {
                try {
                    const data = new Uint8Array(e.target.result)
                    const workbook = XLSX.read(data, { type: 'array' })
                    const sheetName = workbook.SheetNames[0]
                    const worksheet = workbook.Sheets[sheetName]
                    const jsonData = XLSX.utils.sheet_to_json(worksheet)

                    if (jsonData.length === 0) {
                        toast.error('Excel file is empty')
                        setUploading(false)
                        return
                    }

                    // Map user-friendly headers to internal keys
                    const mappedData = jsonData.map(row => ({
                        product_handle: row['Product Handle'] || row.product_handle,
                        product_name: row['Product Name *'] || row['Product Name'] || row.product_name,
                        name: row['Product Name *'] || row['Product Name'] || row.name,
                        sku: row['SKU *'] || row['SKU'] || row.sku,
                        option1_name: row['Option1 Name'] || row.option1_name,
                        option1_value: row['Option1 Value'] || row.option1_value,
                        option2_name: row['Option2 Name'] || row.option2_name,
                        option2_value: row['Option2 Value'] || row.option2_value,
                        option3_name: row['Option3 Name'] || row.option3_name,
                        option3_value: row['Option3 Value'] || row.option3_value,
                        option4_name: row['Option4 Name'] || row.option4_name,
                        option4_value: row['Option4 Value'] || row.option4_value,
                        size: row['Size'] || row.size,
                        color: row['Color'] || row.color,
                        mrp_price: row['MRP Price *'] || row['MRP Price'] || row.mrp_price,
                        dealer_price: row['Dealer Price'] || row.dealer_price,
                        counter_price: row['Counter Price'] || row.counter_price,
                        recommended_price: row['Recommended Price'] || row.recommended_price,
                        shop_price: row['Shop Price'] || row['Selling Price'] || row.shop_price || row.selling_price,
                        category: row['Category *'] || row['Category'] || row.category,
                        sub_category: row['Sub-Category'] || row.sub_category,
                        tag: row['Tag'] || row.tag,
                        brand: row['Brand *'] || row['Brand'] || row.brand,
                        collection: row['Collection'] || row.collection,
                        unit: row['Unit/UoM'] || row['Unit'] || row.unit || row.uom,
                        description: row['Description'] || row.description,
                        short_description: row['Short Description'] || row.short_description,
                        hsn_code: row['HSN Code'] || row.hsn_code,
                        tax_class: row['Tax Class'] || row.tax_class,
                        buy_url: row['Buy URL'] || row.buy_url,
                        is_featured: true,
                        is_active: true,
                        images: row['Images'] || row.images
                    }))

                    const totalRows = mappedData.length;
                    setUploadProgress(0);
                    setProcessedTotal(0);

                    let aggregateResults = {
                        created: 0,
                        updated: 0,
                        variants_created: 0,
                        variants_updated: 0,
                        skipped: 0,
                        errors: []
                    };

                    const BATCH_SIZE = 500;

                    for (let i = 0; i < totalRows; i += BATCH_SIZE) {
                        const batch = mappedData.slice(i, i + BATCH_SIZE);
                        const response = await apiCall('/products/bulk', {
                            method: 'POST',
                            body: JSON.stringify(batch)
                        });

                        aggregateResults.created += (response.created || 0);
                        aggregateResults.updated += (response.updated || 0);
                        aggregateResults.variants_created += (response.variants_created || 0);
                        aggregateResults.variants_updated += (response.variants_updated || 0);
                        aggregateResults.skipped += (response.skipped || 0);
                        if (response.errors) {
                            aggregateResults.errors.push(...response.errors);
                        }

                        const processed = Math.min(i + BATCH_SIZE, totalRows);
                        setProcessedTotal(processed);
                        setUploadProgress(Math.round((processed / totalRows) * 100));
                    }

                    setResults(aggregateResults);
                    queryClient.invalidateQueries(['products']);

                    const totalProducts = (aggregateResults.created || 0) + (aggregateResults.updated || 0);
                    const totalVariants = (aggregateResults.variants_created || 0) + (aggregateResults.variants_updated || 0);
                    if (aggregateResults.errors.length === 0) {
                        toast.success(`Successfully processed ${totalProducts} products and ${totalVariants} variants`)
                    } else if (totalProducts > 0 || totalVariants > 0) {
                        toast.warning(`Processed with some errors. Products: ${totalProducts}, Variants: ${totalVariants}`)
                    } else {
                        toast.error('Failed to process any products')
                    }
                } catch (err) {
                    toast.error('Error parsing Excel file')
                } finally {
                    setUploading(false)
                }
            }
            reader.readAsArrayBuffer(file)
        } catch (error) {
            toast.error('Upload failed')
            setUploading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className={view === 'grid' && !results ? "sm:max-w-[1200px]" : "sm:max-w-[500px]"}>
                <DialogHeader>
                    <div className="flex items-center justify-between">
                        <DialogTitle>Bulk Product Upload</DialogTitle>
                        <div className="flex bg-gray-100 p-1 rounded-lg">
                            <button
                                className={`px-3 py-1 text-xs rounded-md transition-all ${view === 'upload' ? 'bg-white shadow-sm font-semibold' : 'text-gray-500 hover:text-gray-700'}`}
                                onClick={() => { setView('upload'); setResults(null); }}
                            >
                                File Upload
                            </button>
                            <button
                                className={`px-3 py-1 text-xs rounded-md transition-all ${view === 'grid' ? 'bg-white shadow-sm font-semibold' : 'text-gray-500 hover:text-gray-700'}`}
                                onClick={() => { setView('grid'); setResults(null); if (gridData.length === 0) addGridRow(); }}
                            >
                                Advanced Grid Entry
                            </button>
                        </div>
                    </div>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <Alert variant="info" className="bg-blue-50 border-blue-200">
                        <Info className="h-4 w-4 text-blue-600" />
                        <AlertTitle className="text-blue-800">Instructions</AlertTitle>
                        <AlertDescription className="text-blue-700 text-xs">
                            <p><strong>Auto Variant Grouping!</strong> Same Product Name rows are grouped. Duplicate SKUs are skipped for safety.</p>
                            <p className="mt-1">Group variants by Name or Handle. Highly scalable batch processing.</p>
                        </AlertDescription>
                    </Alert>

                    {!results ? (
                        view === 'upload' ? (
                            <div className="space-y-4">
                                <div className="border-2 border-dashed border-gray-200 rounded-lg p-8 text-center hover:border-red-300 transition-colors">
                                    <input
                                        type="file"
                                        id="bulk-file"
                                        className="hidden"
                                        accept=".xlsx, .xls, .csv"
                                        onChange={handleFileChange}
                                    />
                                    <label htmlFor="bulk-file" className="cursor-pointer">
                                        <FileUp className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                                        <p className="text-sm font-medium text-gray-900">
                                            {file ? file.name : 'Click to select Excel or CSV file'}
                                        </p>
                                        <p className="text-xs text-gray-500 mt-1">
                                            Max size: 5MB
                                        </p>
                                    </label>
                                </div>

                                <div className="flex flex-col gap-2">
                                    <div className="flex gap-2">
                                        <Button
                                            variant="outline"
                                            className="flex-1 flex items-center gap-2"
                                            onClick={() => downloadTemplate('xls')}
                                        >
                                            <Download className="w-4 h-4" />
                                            Advanced Excel (.xls)
                                        </Button>
                                    </div>
                                    <p className="text-[10px] text-gray-500 text-center">
                                        Excel file includes dropdowns for Collections, Categories, Sub-Categories, Tags, and Brands.
                                    </p>
                                </div>

                                {uploading && (
                                    <div className="mt-8 space-y-3">
                                        <div className="flex justify-between text-xs font-medium text-gray-600">
                                            <span>Processing...</span>
                                            <span className="text-red-600">{uploadProgress}%</span>
                                        </div>
                                        <Progress value={uploadProgress} className="h-2 bg-gray-100" indicatorClassName="bg-red-600 transition-all duration-300" />
                                        <div className="flex justify-between items-center px-1">
                                            <p className="text-[10px] text-gray-500 italic">
                                                Rows: {processedTotal}
                                            </p>
                                            <p className="text-[10px] font-bold text-gray-700">
                                                {uploadProgress === 100 ? 'Finalizing...' : 'Please do not close'}
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="space-y-4 max-h-[500px] overflow-auto border rounded-lg p-2 bg-gray-50">
                                <div className="min-w-[1200px]">
                                    <table className="w-full border-collapse bg-white">
                                        <thead>
                                            <tr className="bg-gray-100 sticky top-0 z-10">
                                                <th className="px-3 py-2 border text-left text-[10px] font-bold text-gray-600 uppercase">Product Name *</th>
                                                <th className="px-3 py-2 border text-left text-[10px] font-bold text-gray-600 uppercase">SKU *</th>
                                                <th className="px-3 py-2 border text-left text-[10px] font-bold text-gray-600 uppercase">Opt 1 (Name:Val)</th>
                                                <th className="px-3 py-2 border text-left text-[10px] font-bold text-gray-600 uppercase">Opt 2 (Name:Val)</th>
                                                <th className="px-3 py-2 border text-left text-[10px] font-bold text-gray-600 uppercase">Opt 3 (Name:Val)</th>
                                                <th className="px-3 py-2 border text-left text-[10px] font-bold text-gray-600 uppercase">Opt 4 (Name:Val)</th>
                                                <th className="px-3 py-2 border text-right text-[10px] font-bold text-gray-600 uppercase">MRP *</th>
                                                <th className="px-3 py-2 border text-right text-[10px] font-bold text-gray-600 uppercase">Dealer *</th>
                                                <th className="px-3 py-2 border text-right text-[10px] font-bold text-gray-600 uppercase">Counter</th>
                                                <th className="px-3 py-2 border text-right text-[10px] font-bold text-gray-600 uppercase">Rec. Price</th>
                                                <th className="px-3 py-2 border text-right text-[10px] font-bold text-gray-600 uppercase">Shop Price</th>
                                                <th className="px-3 py-2 border text-left text-[10px] font-bold text-gray-600 uppercase">Collection</th>
                                                <th className="px-3 py-2 border text-left text-[10px] font-bold text-gray-600 uppercase">Category</th>
                                                <th className="px-3 py-2 border text-left text-[10px] font-bold text-gray-600 uppercase">Sub-Category</th>
                                                <th className="px-3 py-2 border text-left text-[10px] font-bold text-gray-600 uppercase">Tag</th>
                                                <th className="px-3 py-2 border text-left text-[10px] font-bold text-gray-600 uppercase">Brand</th>
                                                <th className="px-3 py-2 border text-left text-[10px] font-bold text-gray-600 uppercase">Unit/UoM</th>
                                                <th className="px-3 py-2 border text-center text-[10px] font-bold text-gray-600 uppercase sticky right-0 bg-gray-100">Action</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {gridData.map((row) => {
                                                const availableCategories = masters?.categories.filter(c => {
                                                    if (!row.collection) return true;
                                                    const collId = masters.collections.find(coll => coll.name === row.collection)?.id;
                                                    return c.parent_collection_id === collId;
                                                }) || [];

                                                const availableSubCategories = masters?.subCategories.filter(sc => {
                                                    if (!row.category) return true;
                                                    const catId = masters.categories.find(cat => cat.name === row.category)?.id;
                                                    return sc.category_id === catId;
                                                }) || [];

                                                const availableTags = masters?.tags.filter(t => {
                                                    if (!row.sub_category) return true;
                                                    const subId = masters.subCategories.find(sc => sc.name === row.sub_category)?.id;
                                                    return t.sub_category_id === subId;
                                                }) || [];

                                                return (
                                                    <tr key={row._id} className="border-b hover:bg-gray-50">
                                                        <td className="p-1 border">
                                                            <input
                                                                className="w-full text-xs p-1 border-none focus:ring-1 focus:ring-red-500 rounded"
                                                                value={row.product_name}
                                                                onChange={(e) => updateGridRow(row._id, { product_name: e.target.value })}
                                                                placeholder="Name"
                                                            />
                                                        </td>
                                                        <td className="p-1 border">
                                                            <input
                                                                className="w-full text-xs p-1 border-none focus:ring-1 focus:ring-red-500 rounded"
                                                                value={row.sku}
                                                                onChange={(e) => updateGridRow(row._id, { sku: e.target.value })}
                                                                placeholder="SKU"
                                                            />
                                                        </td>
                                                        <td className="p-1 border w-32">
                                                            <div className="flex gap-1">
                                                                <input className="w-1/2 text-[9px] p-0.5 border-none focus:ring-0" value={row.option1_name} onChange={(e) => updateGridRow(row._id, { option1_name: e.target.value })} placeholder="Name" />
                                                                <span className="text-gray-300">:</span>
                                                                <input className="w-1/2 text-[9px] p-0.5 border-none focus:ring-0" value={row.option1_value} onChange={(e) => updateGridRow(row._id, { option1_value: e.target.value })} placeholder="Value" />
                                                            </div>
                                                        </td>
                                                        <td className="p-1 border w-32">
                                                            <div className="flex gap-1">
                                                                <input className="w-1/2 text-[9px] p-0.5 border-none focus:ring-0" value={row.option2_name} onChange={(e) => updateGridRow(row._id, { option2_name: e.target.value })} placeholder="Name" />
                                                                <span className="text-gray-300">:</span>
                                                                <input className="w-1/2 text-[9px] p-0.5 border-none focus:ring-0" value={row.option2_value} onChange={(e) => updateGridRow(row._id, { option2_value: e.target.value })} placeholder="Value" />
                                                            </div>
                                                        </td>
                                                        <td className="p-1 border w-32">
                                                            <div className="flex gap-1">
                                                                <input className="w-1/2 text-[9px] p-0.5 border-none focus:ring-0" value={row.option3_name} onChange={(e) => updateGridRow(row._id, { option3_name: e.target.value })} placeholder="Name" />
                                                                <span className="text-gray-300">:</span>
                                                                <input className="w-1/2 text-[9px] p-0.5 border-none focus:ring-0" value={row.option3_value} onChange={(e) => updateGridRow(row._id, { option3_value: e.target.value })} placeholder="Value" />
                                                            </div>
                                                        </td>
                                                        <td className="p-1 border w-32">
                                                            <div className="flex gap-1">
                                                                <input className="w-1/2 text-[9px] p-0.5 border-none focus:ring-0" value={row.option4_name} onChange={(e) => updateGridRow(row._id, { option4_name: e.target.value })} placeholder="Name" />
                                                                <span className="text-gray-300">:</span>
                                                                <input className="w-1/2 text-[9px] p-0.5 border-none focus:ring-0" value={row.option4_value} onChange={(e) => updateGridRow(row._id, { option4_value: e.target.value })} placeholder="Value" />
                                                            </div>
                                                        </td>
                                                        <td className="p-1 border w-20">
                                                            <input
                                                                className="w-full text-xs p-1 border-none focus:ring-1 focus:ring-red-500 rounded text-right"
                                                                type="number"
                                                                value={row.mrp_price}
                                                                onChange={(e) => updateGridRow(row._id, { mrp_price: parseFloat(e.target.value) || 0 })}
                                                            />
                                                        </td>
                                                        <td className="p-1 border w-20">
                                                            <input
                                                                className="w-full text-xs p-1 border-none focus:ring-1 focus:ring-red-500 rounded text-right"
                                                                type="number"
                                                                value={row.dealer_price}
                                                                onChange={(e) => updateGridRow(row._id, { dealer_price: parseFloat(e.target.value) || 0 })}
                                                            />
                                                        </td>
                                                        <td className="p-1 border w-20">
                                                            <input
                                                                className="w-full text-xs p-1 border-none focus:ring-1 focus:ring-red-500 rounded text-right"
                                                                type="number"
                                                                value={row.counter_price}
                                                                onChange={(e) => updateGridRow(row._id, { counter_price: parseFloat(e.target.value) || 0 })}
                                                            />
                                                        </td>
                                                        <td className="p-1 border w-20">
                                                            <input
                                                                className="w-full text-xs p-1 border-none focus:ring-1 focus:ring-red-500 rounded text-right"
                                                                type="number"
                                                                value={row.recommended_price}
                                                                onChange={(e) => updateGridRow(row._id, { recommended_price: parseFloat(e.target.value) || 0 })}
                                                            />
                                                        </td>
                                                        <td className="p-1 border w-20">
                                                            <input
                                                                className="w-full text-xs p-1 border-none focus:ring-1 focus:ring-red-500 rounded text-right"
                                                                type="number"
                                                                value={row.shop_price}
                                                                onChange={(e) => updateGridRow(row._id, { shop_price: parseFloat(e.target.value) || 0 })}
                                                            />
                                                        </td>
                                                        <td className="p-1 border">
                                                            <select
                                                                className="w-full text-xs p-1 border-none bg-transparent focus:ring-1 focus:ring-red-500 rounded"
                                                                value={row.collection}
                                                                onChange={(e) => updateGridRow(row._id, { collection: e.target.value })}
                                                            >
                                                                <option value="">Select</option>
                                                                {masters?.collections.map(c => (
                                                                    <option key={c.id} value={c.name}>{c.name}</option>
                                                                ))}
                                                            </select>
                                                        </td>
                                                        <td className="p-1 border">
                                                            <select
                                                                className="w-full text-xs p-1 border-none bg-transparent focus:ring-1 focus:ring-red-500 rounded"
                                                                value={row.category}
                                                                onChange={(e) => updateGridRow(row._id, { category: e.target.value })}
                                                                disabled={!row.collection && masters?.collections.length > 0}
                                                            >
                                                                <option value="">Select</option>
                                                                {availableCategories.map(c => (
                                                                    <option key={c.id} value={c.name}>{c.name}</option>
                                                                ))}
                                                            </select>
                                                        </td>
                                                        <td className="p-1 border">
                                                            <select
                                                                className="w-full text-xs p-1 border-none bg-transparent focus:ring-1 focus:ring-red-500 rounded"
                                                                value={row.sub_category}
                                                                onChange={(e) => updateGridRow(row._id, { sub_category: e.target.value })}
                                                                disabled={!row.category}
                                                            >
                                                                <option value="">Select</option>
                                                                {availableSubCategories.map(s => (
                                                                    <option key={s.id} value={s.name}>{s.name}</option>
                                                                ))}
                                                            </select>
                                                        </td>
                                                        <td className="p-1 border">
                                                            <select
                                                                className="w-full text-xs p-1 border-none bg-transparent focus:ring-1 focus:ring-red-500 rounded"
                                                                value={row.tag}
                                                                onChange={(e) => updateGridRow(row._id, { tag: e.target.value })}
                                                                disabled={!row.sub_category}
                                                            >
                                                                <option value="">Select</option>
                                                                {availableTags.map(t => (
                                                                    <option key={t.id} value={t.name}>{t.name}</option>
                                                                ))}
                                                            </select>
                                                        </td>
                                                        <td className="p-1 border">
                                                            <select
                                                                className="w-full text-xs p-1 border-none bg-transparent focus:ring-1 focus:ring-red-500 rounded"
                                                                value={row.brand}
                                                                onChange={(e) => updateGridRow(row._id, { brand: e.target.value })}
                                                            >
                                                                <option value="">Select</option>
                                                                {masters?.brands.map(b => (
                                                                    <option key={b.id} value={b.name}>{b.name}</option>
                                                                ))}
                                                            </select>
                                                        </td>
                                                        <td className="p-1 border">
                                                            <input
                                                                className="w-full text-xs p-1 border-none focus:ring-1 focus:ring-red-500 rounded"
                                                                value={row.unit}
                                                                onChange={(e) => updateGridRow(row._id, { unit: e.target.value })}
                                                                placeholder="e.g. Nos"
                                                            />
                                                        </td>
                                                        <td className="p-1 border text-center sticky right-0 bg-white">
                                                            <button
                                                                className="p-1 text-gray-400 hover:text-red-500 rounded transition-colors"
                                                                onClick={() => removeGridRow(row._id)}
                                                            >
                                                                <AlertCircle className="w-4 h-4" />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                                <Button
                                    variant="ghost"
                                    className="w-full border-2 border-dashed border-gray-200 text-gray-500 hover:text-gray-700 hover:border-gray-300 h-10"
                                    onClick={addGridRow}
                                >
                                    + Add Another Product
                                </Button>
                            </div>
                        )
                    ) : (
                        <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                                <div className="bg-green-50 p-3 rounded-lg border border-green-100 text-center">
                                    <p className="text-xl font-bold text-green-700">{results.created || 0}</p>
                                    <p className="text-[10px] text-green-600 uppercase font-semibold">New Products</p>
                                </div>
                                <div className="bg-blue-50 p-3 rounded-lg border border-blue-100 text-center">
                                    <p className="text-xl font-bold text-blue-700">{results.updated || 0}</p>
                                    <p className="text-[10px] text-blue-600 uppercase font-semibold">Updated Products</p>
                                </div>
                                <div className="bg-emerald-50 p-3 rounded-lg border border-emerald-100 text-center">
                                    <p className="text-xl font-bold text-emerald-700">{results.variants_created || 0}</p>
                                    <p className="text-[10px] text-emerald-600 uppercase font-semibold">New Variants</p>
                                </div>
                                <div className="bg-cyan-50 p-3 rounded-lg border border-cyan-100 text-center">
                                    <p className="text-xl font-bold text-cyan-700">{results.variants_updated || 0}</p>
                                    <p className="text-[10px] text-cyan-600 uppercase font-semibold">Updated Variants</p>
                                </div>
                                <div className="bg-amber-50 p-3 rounded-lg border border-amber-100 text-center col-span-2">
                                    <p className="text-xl font-bold text-amber-700">{results.skipped || 0}</p>
                                    <p className="text-[10px] text-amber-600 uppercase font-semibold">Skipped (Duplicate SKU)</p>
                                </div>
                            </div>

                            {results.errors.length > 0 && (
                                <div className="bg-red-50 p-4 rounded-lg border border-red-100 max-h-[200px] overflow-auto">
                                    <div className="flex items-center gap-2 text-red-700 mb-2">
                                        <AlertCircle className="w-4 h-4" />
                                        <p className="text-sm font-semibold">Errors Found ({results.errors.length})</p>
                                    </div>
                                    <ul className="text-xs text-red-600 space-y-1 list-disc pl-4">
                                        {results.errors.map((error, idx) => (
                                            <li key={idx}>{error}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            <Button
                                variant="outline"
                                className="w-full"
                                onClick={() => {
                                    setResults(null);
                                    setFile(null);
                                }}
                            >
                                Upload Another File
                            </Button>
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="ghost" onClick={() => onOpenChange(false)}>
                        {results ? 'Close' : 'Cancel'}
                    </Button>
                    {!results && (
                        <Button
                            className="bg-red-600"
                            disabled={view === 'upload' ? (!file || uploading) : (gridData.length === 0 || uploading)}
                            onClick={view === 'upload' ? handleUpload : handleGridSubmit}
                        >
                            {uploading ? 'Processing...' : (view === 'upload' ? 'Upload Products' : 'Submit Grid Data')}
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
