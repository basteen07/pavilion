# Detailed View Saving - Troubleshooting Guide

## New Diagnostic Tools Created

### 1. Database Diagnostic Script
**File**: `scripts/diagnose-detailed-view.js`

Run this to check the database state:
```bash
node scripts/diagnose-detailed-view.js
```

**What it checks:**
- Column exists and has correct data type
- NULL values in is_detailed column
- Data distribution (how many items have true/false)
- Recent quotations with their detailed view count
- Sample items with is_detailed values
- Can insert and retrieve test data

### 2. Quick Test Script
**File**: `scripts/quick-test-detailed-view.js`

Run this to test the full save/load cycle:
```bash
ADMIN_TOKEN=your-token node scripts/quick-test-detailed-view.js
```

**What it tests:**
1. Create quotation with is_detailed=true
2. Fetch to verify saved
3. Edit to toggle is_detailed=false
4. Fetch to verify update
5. Edit to toggle back to true
6. Final verification

## Enhanced Logging Added

### Frontend (QuotationBuilder.jsx)

**When adding a product:**
```
[addSingleProduct] Added: Product Name | is_detailed: true | modalDetailedView: true
```

**When loading a quotation:**
```
[QuotationLoad] Item: Product Name | DB is_detailed: 1 | Converted: true
```

**When toggling detailed view:**
```
Toggling Item 0 Detailed View to: false
```

**When saving:**
```
=== SAVING QUOTATION ===
Payload items with is_detailed: [{name: "Product 1", is_detailed: true}, ...]
Update response items: [{name: "Product 1", is_detailed: true}, ...]
```

### Backend (lib/api/quotations.js)

**When creating/updating:**
```
[CreateQuotation] Saving item Product Name | is_detailed: true → true
[UpdateQuotation] Saving item Product Name | is_detailed: true → true
```

**When fetching:**
```
[GetQuotationById] Retrieved items for quote 123:
  - Product Name: is_detailed=true (type: boolean)
```

## How to Diagnose

### Step 1: Open Browser DevTools
1. Press F12 to open Developer Tools
2. Go to "Console" tab
3. Keep it open while testing

### Step 2: Create a Test Quotation
1. Create new quotation
2. Select customer
3. Add one product with detailed view ENABLED (toggle is ON)
4. Save as Draft

**Look for console messages:**
```
[addSingleProduct] Added: ... | is_detailed: true | modalDetailedView: true
=== SAVING QUOTATION ===
Payload items with is_detailed: [{..., is_detailed: true}, ...]
```

### Step 3: Edit the Quotation
1. Open the quotation you just created
2. Check if the detailed view toggle is ON (should be)
3. Toggle it OFF
4. Save

**Look for console messages:**
```
[QuotationLoad] Item: ... | DB is_detailed: 1 | Converted: true
Toggling Item 0 Detailed View to: false
=== SAVING QUOTATION ===
Payload items with is_detailed: [{..., is_detailed: false}, ...]
```

### Step 4: Re-open and Verify
1. Close the quotation and re-open it
2. Check if the toggle is OFF (should be after our last save)

**Look for console messages:**
```
[QuotationLoad] Item: ... | DB is_detailed: 0 | Converted: false
```

## Common Issues & Solutions

### Issue 1: Toggle Shows Wrong State When Loading
**Symptom**: Open quotation, toggle shows OFF but should be ON

**Diagnose**:
```
[QuotationLoad] Item: ... | DB is_detailed: NULL | Converted: false
```
OR
```
[QuotationLoad] Item: ... | DB is_detailed: 0 | Converted: false
```

**Possible Causes**:
- Data not saved properly to database
- Item was never saved with is_detailed=true
- Database NULL/false instead of true

**Fix**:
1. Run database diagnostic: `node scripts/diagnose-detailed-view.js`
2. Check sample items section - what values are stored?
3. Run quick test: `node scripts/quick-test-detailed-view.js`

### Issue 2: Toggle Changes But Doesn't Persist
**Symptom**: Toggle changes in UI but doesn't save after clicking "Save"

**Diagnose**:
```
Toggling Item 0 Detailed View to: false
=== SAVING QUOTATION ===
Payload items with is_detailed: [{..., is_detailed: false}, ...]
```
BUT then when loading:
```
[QuotationLoad] Item: ... | DB is_detailed: 1 | Converted: true
```

**Possible Cause**:
- API is not processing the save correctly
- Value sent is false but database still shows true

**Check API Logs**:
```
[UpdateQuotation] Saving item ... | is_detailed: false → false
```

If this says `false → false` but database has `true`, there's a database-level issue.

### Issue 3: Database Shows Wrong Type
**Symptom**: `diagnose-detailed-view.js` shows:
```
is_detailed=f: 10 items
is_detailed=t: 5 items
is_detailed=NULL: 20 items
```

**Issue**: Many NULL values mean older items weren't created with is_detailed field

**Fix**:
- These will default to false (good)
- To fully populate, edit each quotation and resave
- Or run migration script

### Issue 4: Type Mismatch
**Symptom**: Console shows:
```
DB is_detailed: 1 | Converted: true  (type: number)
DB is_detailed: "1" | Converted: false (type: string - WRONG!)
```

**Issue**: String "1" is being treated as false

**Fix**: 
- The conversion logic should handle this
- Check that all conversions are using `=== true || === 1 || === '1' || === 'true'`
- Both frontend AND backend must have this logic

## Step-by-Step Resolution

### If Detailed View Not Saving:

1. **Check Frontend is Sending It**:
   - Open DevTools Console
   - Create test quotation with detailed=ON
   - Look for: `Payload items with is_detailed: [...{is_detailed: true}...]`
   - ✓ If you see this, frontend is correct
   - ✗ If you don't see this, check QuotationBuilder.jsx handleSave()

2. **Check API is Receiving It**:
   - Look at server logs (if running locally)
   - Should see: `[CreateQuotation] Saving item ... | is_detailed: true → true`
   - ✓ If you see this, API is receiving it
   - ✗ If you don't, API might be stripping it

3. **Check Database is Storing It**:
   - Run: `node scripts/diagnose-detailed-view.js`
   - Look for your test item in "Sample quotation items"
   - Should show: `is_detailed=true`
   - ✓ If true/1/t, database is storing correctly
   - ✗ If false/0/f/NULL, database isn't storing

4. **Check API is Returning It**:
   - Look at API response when fetching
   - In DevTools Network tab, check quotation GET response
   - Should have: `"is_detailed": true`
   - ✓ If present and correct, API is returning it
   - ✗ If missing or wrong, check SELECT query

5. **Check Frontend is Displaying It**:
   - Load quotation in UI
   - Look for console: `[QuotationLoad] Item: ... | DB is_detailed: 1 | Converted: true`
   - Toggle should show as ON
   - ✓ If toggle is ON, frontend is displaying correctly
   - ✗ If toggle is OFF, mapping logic might be wrong

## If Still Not Working

### Collect This Information

1. **Console Output**:
   - Screenshot or copy console logs when creating and loading quotation
   - Include timestamps

2. **Database State**:
   - Run: `node scripts/diagnose-detailed-view.js`
   - Save output

3. **API Response**:
   - Open DevTools Network tab
   - Create quotation with detailed=ON
   - Check PUT request body in "Request" tab
   - Check response body in "Response" tab
   - Screenshot both

4. **Frontend State**:
   - Check toggle appears ON/OFF as expected
   - Screenshot UI

### Report With

- What you expect to happen
- What actually happens
- Which step fails (create, save, load, display)
- Console logs from both frontend and server
- Database diagnostic output
- Network request/response screenshots

## New Changes in This Update

### Frontend Changes:
- Enhanced logging in handleSave(), addSingleProduct(), toggleItemDetail(), and loading logic
- Better boolean conversion: `item.is_detailed === true || === 1 || === '1' || === 'true'`

### Backend Changes:
- Changed from `$12::boolean` casting to explicit JavaScript boolean conversion
- This ensures `false` values are preserved (not converted to NULL)
- Added comprehensive logging at each save point
- Added logging in GET response

### Why This Matters:
- `::boolean` PostgreSQL cast might treat some falsy values as NULL
- Explicit JS conversion: `? true : false` ensures proper boolean
- Logging at each step helps identify where the value is lost

## Testing Checklist

- [ ] Run `node scripts/diagnose-detailed-view.js` - check column exists
- [ ] Run `node scripts/quick-test-detailed-view.js` - test full cycle
- [ ] Create quotation in UI with detailed view ON
- [ ] Check console for save logs
- [ ] Reload and check toggle state
- [ ] Toggle OFF and save
- [ ] Reload and verify OFF state
- [ ] Check database directly (optional): `SELECT is_detailed FROM quotation_items WHERE quotation_id = X;`
