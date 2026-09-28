'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { toast } from 'sonner'
import { FileUp, Info, AlertCircle, CheckCircle2, Download, Check, ChevronsUpDown } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import * as XLSX from 'xlsx'
import ExcelJS from 'exceljs'
import { apiCall } from '@/lib/api-client'
import { Progress } from "@/components/ui/progress"
import { useQueryClient } from '@tanstack/react-query'

// Template / export layout. Column letters (A..AF) are referenced by the dropdown validations below.
const TEMPLATE_COLUMNS = [
    { header: 'Product Handle (Optional)', key: 'product_handle', width: 25 }, // A
    { header: 'Product Name *', key: 'product_name', width: 40 },              // B
    { header: 'SKU *', key: 'sku', width: 20 },                                // C
    { header: 'Option1 Name', key: 'option1_name', width: 15 },                // D
    { header: 'Option1 Value', key: 'option1_value', width: 15 },              // E
    { header: 'Option2 Name', key: 'option2_name', width: 15 },                // F
    { header: 'Option2 Value', key: 'option2_value', width: 15 },              // G
    { header: 'Option3 Name', key: 'option3_name', width: 15 },                // H
    { header: 'Option3 Value', key: 'option3_value', width: 15 },              // I
    { header: 'Option4 Name', key: 'option4_name', width: 15 },                // J
    { header: 'Option4 Value', key: 'option4_value', width: 15 },              // K
    { header: 'Size', key: 'size', width: 10 },                                // L
    { header: 'Color', key: 'color', width: 15 },                              // M
    { header: 'MRP Price *', key: 'mrp_price', width: 15 },                    // N
    { header: 'Dealer Price', key: 'dealer_price', width: 15 },                // O
    { header: 'Counter Price', key: 'counter_price', width: 15 },              // P
    { header: 'Recommended Price', key: 'recommended_price', width: 15 },      // Q
    { header: 'Shop Price', key: 'shop_price', width: 15 },                    // R
    { header: 'Collection', key: 'collection', width: 20 },                    // S
    { header: 'Category *', key: 'category', width: 20 },                      // T
    { header: 'Sub-Category', key: 'sub_category', width: 20 },                // U
    { header: 'Tag', key: 'tag', width: 20 },                                  // V
    { header: 'Brand *', key: 'brand', width: 20 },                            // W
    { header: 'Description', key: 'description', width: 50 },                  // X
    { header: 'Short Description', key: 'short_description', width: 30 },      // Y
    { header: 'HSN Code', key: 'hsn_code', width: 15 },                        // Z
    { header: 'Tax Class', key: 'tax_class', width: 15 },                      // AA
    { header: 'Buy URL', key: 'buy_url', width: 30 },                          // AB
    { header: 'Unit/UoM', key: 'unit', width: 10 },                            // AC
    { header: 'Images', key: 'images', width: 40 },                            // AD
    { header: 'Active', key: 'is_active', width: 10 },                         // AE
    { header: 'Featured', key: 'is_featured', width: 10 }                      // AF
]

// Normalised header (lowercase, no spaces/symbols/"(optional)") -> row field.
// Accepts the template headers, older templates and snake_case keys.
const HEADER_ALIASES = {
    producthandle: 'product_handle', handle: 'product_handle',
    productname: 'product_name', name: 'product_name',
    sku: 'sku',
    option1name: 'option1_name', option1value: 'option1_value',
    option2name: 'option2_name', option2value: 'option2_value',
    option3name: 'option3_name', option3value: 'option3_value',
    option4name: 'option4_name', option4value: 'option4_value',
    size: 'size', color: 'color', colour: 'color',
    mrpprice: 'mrp_price', mrp: 'mrp_price',
    dealerprice: 'dealer_price', counterprice: 'counter_price', recommendedprice: 'recommended_price',
    shopprice: 'shop_price', sellingprice: 'shop_price',
    collection: 'collection', category: 'category', subcategory: 'sub_category', tag: 'tag', brand: 'brand',
    description: 'description', shortdescription: 'short_description',
    hsncode: 'hsn_code', hsn: 'hsn_code',
    taxclass: 'tax_class', tax: 'tax_class', gst: 'tax_class', gstpercentage: 'tax_class',
    buyurl: 'buy_url',
    unituom: 'unit', unit: 'unit', uom: 'unit',
    images: 'images', image: 'images',
    active: 'is_active', isactive: 'is_active',
    featured: 'is_featured', isfeatured: 'is_featured'
}

const normalizeHeader = (h) => String(h).toLowerCase().replace(/\(optional\)/g, '').replace(/[^a-z0-9]/g, '')

// Must match the server's grouping so a product and its variants always travel in the same batch
const productGroupKey = (row) => {
    const handle = String(row.product_handle ?? '').trim()
    if (handle) return `h:${handle}`
    const name = String(row.product_name ?? '').trim().toLowerCase()
    return name ? `n:${name}` : `s:${String(row.sku ?? '').trim()}`
}

const BATCH_SIZE = 500

function GridBrandSelect({ row, availableBrands, updateGridRow }) {
    const [open, setOpen] = useState(false)
    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button type="button" variant="outline" role="combobox" aria-expanded={open} className="w-full text-xs h-7 px-2 justify-between bg-transparent border-none focus:ring-1 focus:ring-red-500 shadow-none hover:bg-gray-50 text-left font-normal rounded">
                    <span className="truncate">{row.brand ? row.brand : "Select"}</span>
                    <ChevronsUpDown className="ml-1 h-3 w-3 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[200px] p-0" align="start">
                <Command>
                    <CommandInput placeholder="Search brand..." className="h-8 text-xs" />
                    <CommandList>
                        <CommandEmpty>No brand found.</CommandEmpty>
                        <CommandGroup>
                            {availableBrands.map(b => (
                                <CommandItem key={b.id} value={b.name} onSelect={() => { updateGridRow(row._id, { brand: b.name }); setOpen(false); }}>
                                    <Check className={`mr-2 h-3 w-3 ${row.brand === b.name ? "opacity-100" : "opacity-0"}`} />
                                    {b.name}
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    )
}

export function BulkUploadDialog({ open, onOpenChange }) {
    const [file, setFile] = useState(null)
    const [uploading, setUploading] = useState(false)
    const [uploadProgress, setUploadProgress] = useState(0)
    const [processedTotal, setProcessedTotal] = useState(0)
    const [results, setResults] = useState(null)
    const [masters, setMasters] = useState(null)
    const [view, setView] = useState('upload') // 'upload' | 'grid' | 'export'
    const [gridData, setGridData] = useState([])
    // 'create_only': existing SKUs are skipped | 'upsert': existing SKUs get the changed values
    const [uploadMode, setUploadMode] = useState('create_only')
    const [exportFilters, setExportFilters] = useState({
        collection_id: '', category_id: '', sub_category_id: '', brand_id: '', status: 'all', search: ''
    })
    const [exporting, setExporting] = useState(false)
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
        // Allow re-selecting the same (edited) file later
        e.target.value = ''
    }

    // Builds the Excel workbook with dropdowns. dataRows are objects keyed by TEMPLATE_COLUMNS keys.
    const buildWorkbook = (dataRows) => {
        const workbook = new ExcelJS.Workbook()
        const templateSheet = workbook.addWorksheet('Product Template')
        const masterSheet = workbook.addWorksheet('MasterLists')

        templateSheet.columns = TEMPLATE_COLUMNS

        // Keep SKU and HSN as text so leading zeros / long numbers survive editing
        templateSheet.getColumn('C').numFmt = '@'
        templateSheet.getColumn('Z').numFmt = '@'

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
                { text: '2. (Alternative) Use the same "Product Name" (rows must be together) to group variants automatically if handle is empty.\n' },
                { font: { bold: true }, text: 'Updating: ' },
                { text: 'SKU identifies the product. Blank cells keep the current value.' }
            ]
        }

        dataRows.forEach(row => templateSheet.addRow(row))

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
        const brandList = Array.from(
            new Set(
                (masters?.brands || [])
                    .map(b => (b?.name || '').toString().trim())
                    .filter(Boolean)
            )
        ).sort((a, b) => a.localeCompare(b))
        const finalBrandList = brandList.length > 0 ? brandList : ['Generic']
        masterSheet.getColumn(11).values = ['Brands', ...finalBrandList]
        workbook.definedNames.add(`MasterLists!$K$2:$K$${finalBrandList.length + 1}`, 'BrandList')

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

        // Keep brand list global in template to always show all brands

        // Unit List (Added to master)
        const unitList = ['1', 'pair', 'Nos', 'Kg', 'Ltr', 'Pcs']
        masterSheet.getColumn(32).values = ['Units', ...unitList] // Col AF
        workbook.definedNames.add(`MasterLists!$AF$2:$AF$${unitList.length + 1}`, 'UnitList')

        // Empty List (for failed lookups)
        masterSheet.getCell('AG2').value = '- No Matches -'
        workbook.definedNames.add('MasterLists!$AG$2:$AG$2', 'EmptyList')

        // Apply Data Validation to the data rows plus 100 empty rows
        const lastRow = dataRows.length + 101
        for (let i = 2; i <= lastRow; i++) {
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

            // Brand (Column W) - Global List
            templateSheet.getCell(`W${i}`).dataValidation = {
                type: 'list',
                allowBlank: true,
                formulae: ['=BrandList'],
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

            // Active / Featured (Columns AE, AF)
            for (const col of ['AE', 'AF']) {
                templateSheet.getCell(`${col}${i}`).dataValidation = {
                    type: 'list',
                    allowBlank: true,
                    formulae: ['=BooleanList'],
                    showErrorMessage: true,
                    errorTitle: 'Invalid Value',
                    error: 'Please select TRUE or FALSE'
                }
            }
        }

        // Hide master sheet
        masterSheet.state = 'hidden'
        return workbook
    }

    const saveWorkbook = async (workbook, fileName) => {
        const buffer = await workbook.xlsx.writeBuffer()
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
        const url = window.URL.createObjectURL(blob)
        const anchor = document.createElement('a')
        anchor.href = url
        anchor.download = fileName
        anchor.click()
        window.URL.revokeObjectURL(url)
    }

    const downloadTemplate = async () => {
        if (!masters) {
            toast.error('Master data not loaded yet. Please wait...')
            return
        }
        try {
            const sampleRow = {
                product_handle: 'sample-product-1',
                product_name: 'Sample Product T-Shirt',
                sku: 'SKU-SAMPLE-001',
                option1_name: 'Size',
                option1_value: 'L',
                option2_name: 'Color',
                option2_value: 'Blue',
                size: 'L',
                color: 'Blue',
                mrp_price: 1500,
                dealer_price: 1000,
                counter_price: 0,
                recommended_price: 0,
                shop_price: 0,
                collection: masters.collections?.[0]?.name || '',
                category: masters.categories?.[0]?.name || '',
                brand: masters.brands?.[0]?.name || '',
                description: 'This is a sample description.',
                short_description: 'Sample Short Desc',
                hsn_code: '999999',
                tax_class: '18',
                unit: '1',
                is_active: 'TRUE',
                is_featured: 'TRUE'
            }
            await saveWorkbook(buildWorkbook([sampleRow]), 'pavilion_advanced_template.xlsx')
            toast.success('Advanced Template downloaded with dropdowns!')
        } catch (error) {
            console.error('Template download error:', error)
            toast.error('Failed to download template. Please try again.')
        }
    }

    const downloadExport = async () => {
        if (!masters) {
            toast.error('Master data not loaded yet. Please wait...')
            return
        }
        setExporting(true)
        try {
            const params = new URLSearchParams()
            Object.entries(exportFilters).forEach(([k, v]) => { if (v && v !== 'all') params.append(k, v) })
            const data = await apiCall(`/products/export?${params}`)
            if (!data.rows?.length) {
                toast.error('No products match these filters')
                return
            }
            const date = new Date().toISOString().slice(0, 10)
            await saveWorkbook(buildWorkbook(data.rows), `pavilion_products_${date}.xlsx`)
            toast.success(`Exported ${data.products} products (${data.rows.length} SKUs)`)
        } catch (error) {
            console.error('Export error:', error)
            toast.error(error.message || 'Failed to export products')
        } finally {
            setExporting(false)
        }
    }

    // Sends rows in batches (a product and its variants are never split) and aggregates the results
    const submitRows = async (rows) => {
        setUploading(true)
        setUploadProgress(0)
        setProcessedTotal(0)

        const groups = new Map()
        rows.forEach(row => {
            const k = productGroupKey(row)
            if (!groups.has(k)) groups.set(k, [])
            groups.get(k).push(row)
        })
        const batches = []
        let current = []
        for (const groupRows of groups.values()) {
            if (current.length > 0 && current.length + groupRows.length > BATCH_SIZE) {
                batches.push(current)
                current = []
            }
            current.push(...groupRows)
        }
        if (current.length > 0) batches.push(current)

        const totals = {
            mode: uploadMode,
            created: 0,
            updated: 0,
            variants_created: 0,
            variants_updated: 0,
            unchanged: 0,
            skipped: 0,
            errors: [],
            warnings: []
        }
        let processed = 0

        try {
            for (const batch of batches) {
                try {
                    const response = await apiCall('/products/bulk', {
                        method: 'POST',
                        body: JSON.stringify({ rows: batch, mode: uploadMode })
                    })
                    for (const k of ['created', 'updated', 'variants_created', 'variants_updated', 'unchanged', 'skipped']) {
                        totals[k] += response[k] || 0
                    }
                    totals.errors.push(...(response.errors || []))
                    totals.warnings.push(...(response.warnings || []))
                } catch (err) {
                    const rowNos = batch.map(r => r._row).filter(Boolean)
                    const range = rowNos.length ? ` (rows ${Math.min(...rowNos)}-${Math.max(...rowNos)})` : ''
                    totals.errors.push(`Batch failed${range}: ${err.message}`)
                }
                processed += batch.length
                setProcessedTotal(processed)
                setUploadProgress(Math.round((processed / rows.length) * 100))
            }

            setResults(totals)
            queryClient.invalidateQueries(['products'])

            const changed = totals.created + totals.updated + totals.variants_created + totals.variants_updated
            if (totals.errors.length === 0) {
                toast.success(`Done: ${totals.created + totals.variants_created} added, ${totals.updated + totals.variants_updated} updated`)
            } else if (changed > 0) {
                toast.warning('Processed with some errors - see details')
            } else if (totals.skipped > 0 || totals.unchanged > 0) {
                toast.warning('No changes saved - see details')
            } else {
                toast.error('Failed to process any products')
            }
        } finally {
            setUploading(false)
        }
    }

    const handleGridSubmit = async () => {
        if (gridData.length === 0) return;
        await submitRows(gridData.map((row, index) => ({ ...row, _row: index + 1 })));
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
            const buffer = await file.arrayBuffer()
            const workbook = XLSX.read(new Uint8Array(buffer), { type: 'array' })
            const sheetName = workbook.SheetNames.includes('Product Template') ? 'Product Template' : workbook.SheetNames[0]
            const jsonData = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName])

            // Map headers to row fields; keep the Excel row number for error messages
            const mappedData = jsonData.map(raw => {
                const row = { _row: (raw.__rowNum__ ?? 0) + 1 }
                for (const [header, value] of Object.entries(raw)) {
                    const field = HEADER_ALIASES[normalizeHeader(header)]
                    if (field && row[field] === undefined) row[field] = value
                }
                return row
            }).filter(row => Object.keys(row).length > 1)

            if (mappedData.length === 0) {
                toast.error('Excel file is empty')
                setUploading(false)
                return
            }

            await submitRows(mappedData)
        } catch (err) {
            console.error('Upload error:', err)
            toast.error('Error parsing Excel file')
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
                            <button
                                className={`px-3 py-1 text-xs rounded-md transition-all ${view === 'export' ? 'bg-white shadow-sm font-semibold' : 'text-gray-500 hover:text-gray-700'}`}
                                onClick={() => { setView('export'); setResults(null); }}
                            >
                                Export / Update
                            </button>
                        </div>
                    </div>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <Alert variant="info" className="bg-blue-50 border-blue-200">
                        <Info className="h-4 w-4 text-blue-600" />
                        <AlertTitle className="text-blue-800">Instructions</AlertTitle>
                        <AlertDescription className="text-blue-700 text-xs">
                            <p><strong>SKU is the unique key.</strong> Existing products are never deleted. Duplicate SKUs in the file are skipped.</p>
                            <p className="mt-1">Variants are grouped by Product Handle (or by Product Name when the handle is empty).</p>
                            <p className="mt-1">To edit existing products: use <strong>Export / Update</strong> to download them, change the values, then upload with <strong>Add new + update existing</strong>. Blank cells keep the current value.</p>
                        </AlertDescription>
                    </Alert>

                    {!results && view !== 'export' && (
                        <div className="space-y-1">
                            <p className="text-xs font-semibold text-gray-700">If a SKU already exists:</p>
                            <div className="grid grid-cols-2 gap-2">
                                {[
                                    { value: 'create_only', title: 'Add new only', hint: 'Existing SKUs are skipped' },
                                    { value: 'upsert', title: 'Add new + update existing', hint: 'Only changed values are updated' }
                                ].map(option => (
                                    <button
                                        key={option.value}
                                        type="button"
                                        disabled={uploading}
                                        onClick={() => setUploadMode(option.value)}
                                        className={`text-left p-2 rounded-lg border transition-all ${uploadMode === option.value ? 'border-red-500 bg-red-50' : 'border-gray-200 hover:border-gray-300'}`}
                                    >
                                        <p className="text-xs font-semibold text-gray-900">{option.title}</p>
                                        <p className="text-[10px] text-gray-500">{option.hint}</p>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {!results ? (
                        view === 'export' ? (
                            <div className="space-y-3">
                                <p className="text-xs text-gray-600">
                                    Download existing products (one row per SKU) in the upload format. Edit the values in Excel,
                                    then upload the file in <strong>File Upload</strong> with <strong>Add new + update existing</strong>.
                                </p>
                                <div className="grid grid-cols-2 gap-2">
                                    <label className="text-[10px] font-semibold text-gray-600 uppercase space-y-1">
                                        <span>Collection</span>
                                        <select
                                            className="w-full text-xs p-2 border rounded-md bg-white normal-case font-normal"
                                            value={exportFilters.collection_id}
                                            onChange={(e) => setExportFilters(f => ({ ...f, collection_id: e.target.value, category_id: '', sub_category_id: '' }))}
                                        >
                                            <option value="">All Collections</option>
                                            {(masters?.collections || []).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                        </select>
                                    </label>
                                    <label className="text-[10px] font-semibold text-gray-600 uppercase space-y-1">
                                        <span>Category</span>
                                        <select
                                            className="w-full text-xs p-2 border rounded-md bg-white normal-case font-normal"
                                            value={exportFilters.category_id}
                                            onChange={(e) => setExportFilters(f => ({ ...f, category_id: e.target.value, sub_category_id: '' }))}
                                        >
                                            <option value="">All Categories</option>
                                            {(masters?.categories || [])
                                                .filter(c => !exportFilters.collection_id || c.parent_collection_id === exportFilters.collection_id)
                                                .map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                        </select>
                                    </label>
                                    <label className="text-[10px] font-semibold text-gray-600 uppercase space-y-1">
                                        <span>Sub-Category</span>
                                        <select
                                            className="w-full text-xs p-2 border rounded-md bg-white normal-case font-normal"
                                            value={exportFilters.sub_category_id}
                                            onChange={(e) => setExportFilters(f => ({ ...f, sub_category_id: e.target.value }))}
                                            disabled={!exportFilters.category_id}
                                        >
                                            <option value="">All Sub-Categories</option>
                                            {(masters?.subCategories || [])
                                                .filter(s => s.category_id === exportFilters.category_id)
                                                .map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                        </select>
                                    </label>
                                    <label className="text-[10px] font-semibold text-gray-600 uppercase space-y-1">
                                        <span>Brand</span>
                                        <select
                                            className="w-full text-xs p-2 border rounded-md bg-white normal-case font-normal"
                                            value={exportFilters.brand_id}
                                            onChange={(e) => setExportFilters(f => ({ ...f, brand_id: e.target.value }))}
                                        >
                                            <option value="">All Brands</option>
                                            {(masters?.brands || []).map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                                        </select>
                                    </label>
                                    <label className="text-[10px] font-semibold text-gray-600 uppercase space-y-1">
                                        <span>Status</span>
                                        <select
                                            className="w-full text-xs p-2 border rounded-md bg-white normal-case font-normal"
                                            value={exportFilters.status}
                                            onChange={(e) => setExportFilters(f => ({ ...f, status: e.target.value }))}
                                        >
                                            <option value="all">Active + Inactive</option>
                                            <option value="active">Active only</option>
                                            <option value="inactive">Inactive only</option>
                                        </select>
                                    </label>
                                    <label className="text-[10px] font-semibold text-gray-600 uppercase space-y-1">
                                        <span>Search (name / SKU)</span>
                                        <input
                                            className="w-full text-xs p-2 border rounded-md bg-white normal-case font-normal"
                                            value={exportFilters.search}
                                            onChange={(e) => setExportFilters(f => ({ ...f, search: e.target.value }))}
                                            placeholder="Optional"
                                        />
                                    </label>
                                </div>
                                <Button
                                    className="w-full bg-red-600 flex items-center gap-2"
                                    disabled={exporting || !masters}
                                    onClick={downloadExport}
                                >
                                    <Download className="w-4 h-4" />
                                    {exporting ? 'Preparing file...' : 'Download Products (.xlsx)'}
                                </Button>
                            </div>
                        ) : view === 'upload' ? (
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
                                            onClick={downloadTemplate}
                                        >
                                            <Download className="w-4 h-4" />
                                            Advanced Excel (.xlsx)
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

                                                const availableBrands = masters?.brands || [];



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
                                                            <GridBrandSelect
                                                                row={row}
                                                                availableBrands={availableBrands}
                                                                updateGridRow={updateGridRow}
                                                            />
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
                                <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 text-center">
                                    <p className="text-xl font-bold text-gray-700">{results.unchanged || 0}</p>
                                    <p className="text-[10px] text-gray-600 uppercase font-semibold">Unchanged</p>
                                </div>
                                <div className="bg-amber-50 p-3 rounded-lg border border-amber-100 text-center">
                                    <p className="text-xl font-bold text-amber-700">{results.skipped || 0}</p>
                                    <p className="text-[10px] text-amber-600 uppercase font-semibold">
                                        {results.mode === 'upsert' ? 'Skipped (Duplicate in file)' : 'Skipped (SKU exists)'}
                                    </p>
                                </div>
                            </div>

                            {results.warnings?.length > 0 && (
                                <div className="bg-amber-50 p-4 rounded-lg border border-amber-100 max-h-[160px] overflow-auto">
                                    <div className="flex items-center gap-2 text-amber-700 mb-2">
                                        <Info className="w-4 h-4" />
                                        <p className="text-sm font-semibold">Warnings ({results.warnings.length})</p>
                                    </div>
                                    <ul className="text-xs text-amber-700 space-y-1 list-disc pl-4">
                                        {results.warnings.slice(0, 200).map((warning, idx) => (
                                            <li key={idx}>{warning}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}

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
                    {!results && view !== 'export' && (
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
