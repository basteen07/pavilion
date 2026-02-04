# Detailed View & UoM Persistence - Complete Fix Documentation

## Problem Statement

Users reported that when editing a quotation (draft or sent), the following issues occurred:

1. **Detailed View Not Preserved**: When a product had "detailed view enabled" (`is_detailed=true`), this flag was not being retained when editing the quotation later
2. **UoM Not Fully Implemented**: Unit of Measure field was added to the database but wasn't being properly saved/loaded in all scenarios
3. **State Not Persisting**: When switching from draft to sent status or back, the per-item detailed view and UoM states were lost
4. **PDF Missing UoM**: The PDF preview and download didn't include the UoM column

## Root Causes Identified

1. **handleSaveAndSend** was missing the `uom` field in the items mapping
2. **Quotation Loading** wasn't fully mapping all metadata fields (missing `payment_terms` and `comments`)
3. **PDF Generation** had the column headers and data positions wrong for displaying UoM
4. **API was correct** - The backend was properly saving and returning `is_detailed` and `uom` fields

## Fixes Implemented

### 1. Fixed `handleSaveAndSend` Function (Line ~936)
**Issue**: When saving and sending a quotation, the `uom` field wasn't included in the payload

**Before**:
```javascript
items: quotationItems.map(item => ({
    product_id: item.product_id,
    // ... other fields ...
    is_detailed: !!item.is_detailed
    // MISSING: uom field
}))
```

**After**:
```javascript
items: quotationItems.map(item => ({
    product_id: item.product_id,
    // ... other fields ...
    uom: item.uom || 'Single',  // ADDED
    is_detailed: !!item.is_detailed
}))
```

### 2. Fixed Quotation Loading (Line ~508)
**Issue**: When editing a saved quotation, `payment_terms` and `comments` fields weren't being loaded

**Before**:
```javascript
setQuotationDetails({
    quotation_number: quote.quotation_number,
    // ... other fields ...
    status: quote.status || 'Draft'
    // MISSING: payment_terms and comments
});
```

**After**:
```javascript
setQuotationDetails({
    quotation_number: quote.quotation_number,
    // ... other fields ...
    status: quote.status || 'Draft',
    payment_terms: quote.payment_terms || 'Net 30 Days',  // ADDED
    comments: quote.comments || ''  // ADDED
});
```

### 3. Fixed PDF Generation Headers (Line ~275)
**Issue**: PDF table header was missing UoM and column positions were wrong

**Before**:
```javascript
doc.text('Product', 20, currentY + 5)
doc.text('MRP', 105, currentY + 5)
doc.text('Your Price', 130, currentY + 5)
doc.text('GST', 160, currentY + 5)
doc.text('Qty', 180, currentY + 5)
// MISSING: UoM header
```

**After**:
```javascript
doc.text('Product', 20, currentY + 5)
doc.text('MRP', 105, currentY + 5)
doc.text('Your Price', 130, currentY + 5)
doc.text('GST', 160, currentY + 5)
doc.text('Qty', 173, currentY + 5)
doc.text('UoM', 185, currentY + 5)  // ADDED
```

### 4. Fixed PDF Data Row (Line ~357)
**Issue**: PDF wasn't displaying UoM values in the product rows

**Before**:
```javascript
doc.text(String(item.quantity || 1), 182, currentY + 3)
// MISSING: UoM value output
```

**After**:
```javascript
doc.text(String(item.quantity || 1), 173, currentY + 3)
doc.text(item.uom || 'Single', 185, currentY + 3)  // ADDED
```

## Data Flow Verification

### Create Quotation Flow ✓
1. User selects product → `is_detailed` toggle is available in product selection modal
2. Item is added to `quotationItems` array with `is_detailed` flag
3. `handleSave()` or `handleSaveAndSend()` maps items including `is_detailed` and `uom`
4. API receives payload and stores in database

### Edit Quotation Flow ✓
1. `fetchQuote()` loads existing quotation via API
2. API returns items with `is_detailed` and `uom` fields populated
3. Items are mapped with robust boolean conversion for `is_detailed`
4. Items are mapped with default 'Single' for `uom` if null
5. Per-item toggles and inputs display current state

### Save After Editing ✓
1. `handleSave()` maps all items including `is_detailed` and `uom`
2. API DELETE old items and INSERT new ones with all fields
3. Next load will retrieve correctly persisted values

## Important Implementation Details

### Boolean Handling for `is_detailed`
The field has multiple representations in the database and API calls:
- Database: PostgreSQL BOOLEAN type
- API payload: Can be `true`, `1`, `'1'`, or `'true'`
- Component: Converted to strict boolean with `!!value`

Robust conversion used throughout:
```javascript
const isDetailed = item.is_detailed === true ||
                   item.is_detailed === 1 ||
                   item.is_detailed === '1' ||
                   item.is_detailed === 'true';
```

### UoM Default Value
Default is set to 'Single' when:
- Product is added without explicit UoM
- UoM field is empty or null in database
- Loading from quotation without UoM value

```javascript
uom: item.uom || 'Single'
```

## Testing

A comprehensive test script has been created: `scripts/test-detailed-view-full-flow.js`

### Test Scenarios Covered:
1. ✓ Create quotation with `is_detailed=true` and `uom="Pair"`
2. ✓ Verify saved values are correct
3. ✓ Edit quotation to toggle `is_detailed` and change `uom`
4. ✓ Verify changes persisted
5. ✓ Save as Sent status
6. ✓ Edit sent quotation and verify preservation
7. ✓ Make additional edits
8. ✓ Final verification of all changes

### Running the Test:
```bash
ADMIN_TOKEN=your-token npm run test:detailed-view
# or
node scripts/test-detailed-view-full-flow.js
```

## Summary of Changes

| Component | File | Changes |
|-----------|------|---------|
| handleSaveAndSend | QuotationBuilder.jsx | Added `uom: item.uom \|\| 'Single'` to items mapping |
| Quotation Load | QuotationBuilder.jsx | Added `payment_terms` and `comments` field mapping |
| PDF Header | QuotationBuilder.jsx | Added UoM column header and adjusted column positions |
| PDF Data Row | QuotationBuilder.jsx | Added UoM value output in product rows |
| No Changes | lib/api/quotations.js | API was already correct ✓ |

## Verification Checklist

- [x] `is_detailed` flag is saved when creating quotation
- [x] `is_detailed` flag is retrieved when editing quotation
- [x] `is_detailed` flag can be toggled when editing
- [x] `is_detailed` changes are persisted across save/load cycles
- [x] `uom` field is saved when creating quotation
- [x] `uom` field is retrieved when editing quotation
- [x] `uom` field can be changed when editing
- [x] `uom` changes are persisted across save/load cycles
- [x] PDF displays UoM column header
- [x] PDF displays UoM value for each product
- [x] Sent quotations preserve `is_detailed` and `uom` on edit
- [x] Draft quotations preserve all fields

## Known Limitations

1. **UoM Field in Product Modal**: The detailed view toggle in the product selection modal (`modalDetailedView`) is for display purposes only - actual per-item control is in the quotation items list
2. **PDF Layout**: UoM column is narrow - consider adjusting PDF layout if longer UoM values are needed
3. **Backward Compatibility**: Old quotations without `uom` field will default to 'Single' - this is safe and expected

## Future Improvements

1. Add predefined UoM options (Pair, Dozen, Set, Box, etc.) as a dropdown instead of free text
2. Display UoM in the QuotationPreviewModal
3. Add UoM column to the quotations list view
4. Consider adding product-level default UoM that can be inherited
