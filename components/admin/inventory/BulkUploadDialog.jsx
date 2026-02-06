'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { toast } from 'sonner'
import { FileUp, Info, AlertCircle, CheckCircle2, Download } from 'lucide-react'
import * as XLSX from 'xlsx'
import { apiCall } from '@/lib/api-client'
import { useQueryClient } from '@tanstack/react-query'

export function BulkUploadDialog({ open, onOpenChange }) {
    const [file, setFile] = useState(null)
    const [uploading, setUploading] = useState(false)
    const [results, setResults] = useState(null)
    const queryClient = useQueryClient()

    const handleFileChange = (e) => {
        const selectedFile = e.target.files[0]
        if (selectedFile) {
            setFile(selectedFile)
            setResults(null)
        }
    }

    const downloadTemplate = (format = 'xls') => {
        try {
            const templateData = [
                {
                    'Product Handle': 'cotton-tshirt',
                    'Product Name *': 'Cotton T-Shirt',
                    'SKU *': 'TS-RED-M',
                    'Option1 Name': 'Size',
                    'Option1 Value': 'M',
                    'Option2 Name': 'Color',
                    'Option2 Value': 'Red',
                    'MRP Price *': 799,
                    'Dealer Price': 650,
                    'Counter Price': 700,
                    'Recommended Price': 750,
                    'Shop Price': 749,
                    'Inventory': 50,
                    'Category': 'Apparel',
                    'Sub-Category': 'T-Shirts',
                    'Brand': 'Nike',
                    'Description': 'Soft cotton tee with premium finish',
                    'Short Description': 'Cotton T-Shirt',
                    'HSN Code': '6109',
                    'Is Featured': 'false',
                    'Is Active': 'true',
                    'Images': 'https://example.com/red-m-1.jpg, https://example.com/red-m-2.jpg'
                },
                {
                    'Product Handle': 'cotton-tshirt',
                    'Product Name *': 'Cotton T-Shirt',
                    'SKU *': 'TS-BLUE-L',
                    'Option1 Name': 'Size',
                    'Option1 Value': 'L',
                    'Option2 Name': 'Color',
                    'Option2 Value': 'Blue',
                    'MRP Price *': 849,
                    'Dealer Price': 700,
                    'Counter Price': 750,
                    'Recommended Price': 800,
                    'Shop Price': 799,
                    'Inventory': 30,
                    'Category': 'Apparel',
                    'Sub-Category': 'T-Shirts',
                    'Brand': 'Nike',
                    'Description': '',
                    'Short Description': '',
                    'HSN Code': '',
                    'Is Featured': '',
                    'Is Active': '',
                    'Images': 'https://example.com/blue-l-1.jpg'
                },
                {
                    'Product Handle': 'ceramic-vase',
                    'Product Name *': 'Ceramic Vase',
                    'SKU *': 'VASE-001',
                    'Option1 Name': '',
                    'Option1 Value': '',
                    'Option2 Name': '',
                    'Option2 Value': '',
                    'MRP Price *': 2499,
                    'Dealer Price': 2000,
                    'Counter Price': 2200,
                    'Recommended Price': 2300,
                    'Shop Price': 2399,
                    'Inventory': 15,
                    'Category': 'Home Decor',
                    'Sub-Category': '',
                    'Brand': '',
                    'Description': 'Handmade ceramic vase with artistic finish',
                    'Short Description': 'Handmade Ceramic Vase',
                    'HSN Code': '6913',
                    'Is Featured': 'true',
                    'Is Active': 'true',
                    'Images': 'https://example.com/vase-1.jpg'
                }
            ]

            const worksheet = XLSX.utils.json_to_sheet(templateData)
            const workbook = XLSX.utils.book_new()
            XLSX.utils.book_append_sheet(workbook, worksheet, 'Product Template')

            if (format === 'csv') {
                XLSX.writeFile(workbook, 'pavilion_product_template.csv', { bookType: 'csv' })
            } else if (format === 'xls') {
                // BIFF8 format for legacy Excel
                XLSX.writeFile(workbook, 'pavilion_product_template.xls', { bookType: 'biff8' })
            } else {
                XLSX.writeFile(workbook, 'pavilion_product_template.xlsx', { bookType: 'xlsx' })
            }

            toast.success(`Template (${format.toUpperCase()}) downloaded successfully!`)
        } catch (error) {
            console.error('Template download error:', error)
            toast.error('Failed to download template. Please try again.')
        }
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
                        size: row['Size'] || row.size,
                        color: row['Color'] || row.color,
                        mrp_price: row['MRP Price *'] || row['MRP Price'] || row.mrp_price,
                        dealer_price: row['Dealer Price'] || row.dealer_price,
                        counter_price: row['Counter Price'] || row.counter_price,
                        recommended_price: row['Recommended Price'] || row.recommended_price,
                        shop_price: row['Shop Price'] || row['Selling Price'] || row.shop_price || row.selling_price,
                        inventory: row['Inventory'] || row['Stock'] || row.inventory || row.stock_quantity,
                        category: row['Category *'] || row['Category'] || row.category,
                        sub_category: row['Sub-Category'] || row.sub_category,
                        brand: row['Brand *'] || row['Brand'] || row.brand,
                        description: row['Description'] || row.description,
                        short_description: row['Short Description'] || row.short_description,
                        hsn_code: row['HSN Code'] || row.hsn_code,
                        tax_class: row['Tax Class'] || row.tax_class,
                        buy_url: row['Buy URL'] || row.buy_url,
                        is_featured: row['Is Featured'] === 'true' || row['Is Featured'] === true || row.is_featured === true,
                        is_active: row['Is Active'] === 'false' ? false : true,
                        images: row['Images'] || row.images
                    }))

                    const response = await apiCall('/products/bulk', {
                        method: 'POST',
                        body: JSON.stringify(mappedData)
                    })

                    setResults(response)
                    queryClient.invalidateQueries(['products'])

                    const totalProducts = (response.created || 0) + (response.updated || 0);
                    const totalVariants = (response.variants_created || 0) + (response.variants_updated || 0);
                    if (response.errors.length === 0) {
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
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Bulk Product Upload</DialogTitle>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <Alert variant="info" className="bg-blue-50 border-blue-200">
                        <Info className="h-4 w-4 text-blue-600" />
                        <AlertTitle className="text-blue-800">Instructions</AlertTitle>
                        <AlertDescription className="text-blue-700 text-xs">
                            <p><strong>Supports product variants!</strong> Group rows by Product Handle to create multi-variant products (e.g. same T-Shirt in different sizes/colors).</p>
                            <p className="mt-1">Duplicate SKUs will update existing products & variants. Download template for format.</p>
                        </AlertDescription>
                    </Alert>

                    {!results ? (
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
                                        Excel (.xls)
                                    </Button>
                                    <Button
                                        variant="outline"
                                        className="flex-1 flex items-center gap-2"
                                        onClick={() => downloadTemplate('csv')}
                                    >
                                        <Download className="w-4 h-4" />
                                        CSV (.csv)
                                    </Button>
                                </div>
                                <a
                                    href="/example template file.csv"
                                    download
                                    className="text-xs text-blue-600 hover:underline flex items-center justify-center gap-1 mt-1"
                                >
                                    <Download className="w-3 h-3" />
                                    Still can't open? Click here for Direct CSV Download
                                </a>
                            </div>
                        </div>
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
                            disabled={!file || uploading}
                            onClick={handleUpload}
                        >
                            {uploading ? 'Uploading...' : 'Upload Products'}
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
