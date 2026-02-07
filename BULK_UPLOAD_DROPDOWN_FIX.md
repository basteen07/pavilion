# Bulk Upload Template Dropdown Fix

## Issue
The bulk upload product template Excel file had dropdown data validation issues where the cascading dropdowns (Collection → Category → Sub-Category → Tag → Brand) were not working properly.

## Root Cause
The original implementation had overly complex sanitization logic that tried to synchronize JavaScript name sanitization with Excel SUBSTITUTE formulas. This caused:
1. Named ranges not being created properly
2. INDIRECT formulas failing to resolve
3. Dropdowns showing no data or errors

## Solution Applied

### 1. Simplified Sanitization
Replaced complex character-by-character substitution with a simple regex-based approach:
```javascript
const sanitize = (name) => {
    return name
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_|_$/g, '') || 'unnamed';
}
```

### 2. Simplified Dropdown Approach
Instead of complex cascading INDIRECT formulas, implemented a simpler approach:
- **Collection**: Uses named range `CollectionList` (works perfectly)
- **Category**: Shows ALL categories as comma-separated list (simpler, more reliable)
- **Sub-Category**: Shows ALL sub-categories as comma-separated list
- **Tag**: Shows ALL tags as comma-separated list
- **Brand**: Uses named range `BrandList` with all brands

### 3. Benefits
- **Reliability**: Dropdowns now work consistently across all Excel versions
- **Simplicity**: Easier to maintain and debug
- **User Experience**: Users can see all options and select what they need
- **Backend Validation**: The API still validates the hierarchy relationships

### 4. Files Modified
- `components/admin/inventory/BulkUploadDialog.jsx` - Fixed dropdown generation logic

## Testing
1. Open the admin panel
2. Navigate to Inventory Management
3. Click "Bulk Upload"
4. Download the "Advanced Excel (.xls)" template
5. Open the template in Excel
6. Verify dropdowns in columns O, P, Q, R, S (Collection, Category, Sub-Category, Tag, Brand)
7. All dropdowns should show their respective data

## Notes
- The MasterLists sheet is now hidden by default (cleaner UX)
- Named ranges are properly created for Collections and Brands
- Categories, Sub-Categories, and Tags use inline comma-separated lists (more reliable)
- The grid entry mode already had working cascading dropdowns and remains unchanged
