import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

/**
 * Formats currency
 */
const formatCurrency = (amount) => {
    if (amount === undefined || amount === null) return '-';
    return `₹${parseFloat(amount).toFixed(2)}`;
};

const PRICE_LABELS = {
    mrp_price: 'MRP',
    dealer_price: 'Dealer',
    counter_price: 'Counter',
    recommended_price: 'Recommended',
    shop_price: 'Shop'
};

/**
 * Generates and downloads a PDF Price List Report
 * @param {Array} data - List of products
 * @param {Object} filters - Applied filters for title
 * @param {Array} priceColumns - List of price keys to include (e.g. ['mrp_price', 'dealer_price'])
 */
export const generatePDF = (data, filters = {}, priceColumns = ['mrp_price', 'dealer_price']) => {
    const doc = new jsPDF();

    // -- Header --
    doc.setFontSize(20);
    doc.setTextColor(220, 38, 38); // Red color like Pavilion logo
    doc.text('Pavilion Sports', 14, 20);

    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Price List Report`, 14, 28);
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 33);

    let filterText = 'Filters: ';
    if (filters.brand) filterText += `Brand: ${filters.brand} | `;
    if (filters.category) filterText += `Category: ${filters.category} | `;
    if (filters.sub_category) filterText += `Sub-Category: ${filters.sub_category}`;
    if (filterText === 'Filters: ') filterText = 'All Products';

    doc.setFontSize(9);
    doc.text(filterText, 14, 38);

    // -- Group Data by Brand -- 
    // The user specifically asked for "grouped by brand"
    // We will sort data by Brand first then Name (API already does this, but good to ensure)

    // -- Dynamic Columns --
    const headRow = ['SKU', 'Product Name', 'Category'];
    priceColumns.forEach(key => headRow.push(PRICE_LABELS[key] || key));
    headRow.push('Stock');

    const tableBody = [];
    let lastBrand = null;
    const colCount = headRow.length;

    data.forEach(item => {
        // Brand Header Row
        if (item.brand_name !== lastBrand) {
            tableBody.push([{ content: item.brand_name || 'Unbranded', colSpan: colCount, styles: { fillColor: [240, 240, 240], fontStyle: 'bold', textColor: [50, 50, 50] } }]);
            lastBrand = item.brand_name;
        }

        // Product Row
        const row = [
            item.sku,
            item.name,
            item.category_name || '-'
        ];
        priceColumns.forEach(key => row.push(formatCurrency(item[key])));
        row.push(item.stock_quantity || '0');

        tableBody.push(row);

        // Variant Rows (if any)
        if (item.variants && item.variants.length > 0) {
            item.variants.forEach(variant => {
                const varRow = [
                    { content: `  ↳ ${variant.sku}`, styles: { fontStyle: 'italic' } },
                    { content: `${variant.size ? `Size: ${variant.size}` : ''} ${variant.color ? `Color: ${variant.color}` : ''}`.trim() || 'Variant', styles: { fontStyle: 'italic' } },
                    '-'
                ];
                priceColumns.forEach(key => varRow.push(formatCurrency(variant[key] || item[key])));
                varRow.push(variant.inventory || '0');

                tableBody.push(varRow);
            });
        }
    });

    const columnStyles = {
        0: { cellWidth: 35 }, // SKU
        1: { cellWidth: 'auto' }, // Name
        2: { cellWidth: 30 }, // Cat
    };

    // Add alignment for dynamic price columns + stock
    // SKU(0), Name(1), Cat(2) are fixed. Price cols start at index 3.
    for (let i = 0; i < priceColumns.length; i++) {
        columnStyles[3 + i] = { cellWidth: 25, halign: 'right' };
    }
    // Stock is last
    columnStyles[3 + priceColumns.length] = { cellWidth: 20, halign: 'center' };

    autoTable(doc, {
        head: [headRow],
        body: tableBody,
        startY: 45,
        theme: 'grid',
        styles: { fontSize: 8, cellPadding: 3 },
        headStyles: { fillColor: [220, 38, 38], textColor: 255, fontStyle: 'bold' },
        columnStyles: columnStyles,
        alternateRowStyles: { fillColor: [252, 252, 252] },
        margin: { top: 45 },
        didDrawPage: (data) => {
            // Footer
            const pageCount = doc.internal.getNumberOfPages();
            doc.setFontSize(8);
            doc.setTextColor(150);
            doc.text(`Page ${pageCount}`, data.settings.margin.left, doc.internal.pageSize.height - 10);
        }
    });

    doc.save(`price-list-${new Date().toISOString().slice(0, 10)}.pdf`);
};

/**
 * Generates and downloads an Excel file
 */
export const generateExcel = (data, priceColumns = ['mrp_price', 'dealer_price']) => {
    const flattenData = [];

    data.forEach(item => {
        const row = {
            Type: 'Product',
            SKU: item.sku,
            Name: item.name,
            Brand: item.brand_name,
            Category: item.category_name,
            SubCategory: item.sub_category_name,
        };

        // Add dynamic prices
        priceColumns.forEach(key => {
            row[PRICE_LABELS[key] || key] = item[key];
        });

        row.Stock = item.stock_quantity;
        flattenData.push(row);

        // Variants
        if (item.variants && item.variants.length > 0) {
            item.variants.forEach(v => {
                const varRow = {
                    Type: 'Variant',
                    SKU: v.sku,
                    Name: `${item.name} - ${v.size || ''} ${v.color || ''}`.trim(),
                    Brand: item.brand_name,
                    Category: item.category_name,
                    SubCategory: item.sub_category_name,
                };

                priceColumns.forEach(key => {
                    varRow[PRICE_LABELS[key] || key] = v[key] || item[key]; // Fallback to parent price if variant price missing (though unlikely in recent schema)
                });

                varRow.Stock = v.inventory;
                flattenData.push(varRow);
            });
        }
    });

    const worksheet = XLSX.utils.json_to_sheet(flattenData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Price List");

    // Auto-width columns (simple approximation)
    // 6 fixed columns + N price columns + 1 stock column
    const wscols = [
        { wch: 10 }, { wch: 10 }, { wch: 40 }, { wch: 15 }, { wch: 15 }, { wch: 15 }
    ];
    priceColumns.forEach(() => wscols.push({ wch: 12 }));
    wscols.push({ wch: 8 });

    worksheet['!cols'] = wscols;

    XLSX.writeFile(workbook, `price-list-${new Date().toISOString().slice(0, 10)}.xlsx`);
};

/**
 * Generates and downloads a CSV file
 */
export const generateCSV = (data, priceColumns = ['mrp_price', 'dealer_price']) => {
    const flattenData = [];

    data.forEach(item => {
        const row = {
            SKU: item.sku,
            Name: item.name,
            Brand: item.brand_name || '',
            Category: item.category_name || '',
            SubCategory: item.sub_category_name || '',
        };

        priceColumns.forEach(key => {
            row[PRICE_LABELS[key] || key] = item[key];
        });

        row.Stock = item.stock_quantity;
        flattenData.push(row);

        if (item.variants && item.variants.length > 0) {
            item.variants.forEach(v => {
                const varRow = {
                    SKU: v.sku,
                    Name: `${item.name} [${v.size || ''} ${v.color || ''}]`.trim(),
                    Brand: item.brand_name || '',
                    Category: item.category_name || '',
                    SubCategory: item.sub_category_name || '',
                };

                priceColumns.forEach(key => {
                    varRow[PRICE_LABELS[key] || key] = v[key] || item[key];
                });

                varRow.Stock = v.inventory;
                flattenData.push(varRow);
            });
        }
    });

    const worksheet = XLSX.utils.json_to_sheet(flattenData);
    const csvOutput = XLSX.utils.sheet_to_csv(worksheet);

    const blob = new Blob([csvOutput], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `price-list-${new Date().toISOString().slice(0, 10)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};
