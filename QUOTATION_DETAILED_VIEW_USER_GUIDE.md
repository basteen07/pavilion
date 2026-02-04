# Quotation Detailed View & UoM - User Guide

## Overview

This document explains how the "Detailed View" toggle and "Unit of Measure (UoM)" field work in the quotation system, and how they are preserved when editing quotations.

## Detailed View Feature

### What is Detailed View?

When you enable "Detailed View" for a product in a quotation, it:
1. Shows the product image (larger thumbnail) in the quotation view
2. Displays the product's short description
3. Shows additional product details when viewing/editing the quotation
4. Includes the product image in the PDF preview

### How to Enable/Disable Detailed View

#### When Adding Products:
1. Click "Add Products" button in the quotation builder
2. Products appear in a table
3. The "Detailed View" toggle applies to the **current product selection session**
4. Check the toggle to show detailed information for products as you're selecting them

#### When Editing Quotation Items:
1. In the quotation items list (below "Add Products"), each item has a switch toggle on the left
2. Toggle the switch ON/OFF for each individual product
3. Changes are applied immediately in the preview
4. When you save, the detailed view setting for each product is preserved

### Detailed View Persistence

✓ **Detailed view settings are now fully preserved:**
- When you save a quotation (Draft or Sent), the detailed view setting for each product is saved
- When you edit an existing quotation, the detailed view settings load correctly
- You can toggle detailed view on/off while editing and the changes will persist
- This works across Draft → Sent → Completed status transitions

## Unit of Measure (UoM) Field

### What is UoM?

Unit of Measure specifies the quantity unit for each product. Examples:
- **Single** (individual pieces)
- **Pair** (2 items together)
- **Dozen** (12 items)
- **Set** (grouped items)
- **Box** (packaged items)
- Any custom unit relevant to your business

### How to Set UoM

#### When Adding Products:
- Default UoM is "Single" for all new products
- You can change it after adding the product to the quotation

#### When Editing Quotation Items:
1. Find the "UoM" field in the quotation items list
2. It's located after the "Qty" field in the pricing row
3. Click to edit and type the desired unit of measure
4. Examples: Pair, Dozen, Set, Box, etc.

### UoM Persistence

✓ **UoM values are now fully preserved:**
- When you save a quotation (Draft or Sent), the UoM for each product is saved
- When you edit an existing quotation, the UoM loads correctly
- You can change UoM while editing and the changes will persist
- If a quotation doesn't have a UoM set, it defaults to "Single"

## PDF Preview and Download

### What's Included in PDF:
- Product names
- MRP (reference price)
- Your Price (customer-specific price)
- GST rate
- **Qty** (quantity)
- **UoM** (unit of measure) ← NEW
- Product image (if detailed view is enabled)
- Product description (if detailed view is enabled)

### PDF Generation:
1. Click "Preview" button to see the PDF in the preview modal
2. Click "Download PDF" to download the quotation
3. All detailed view and UoM settings are included in the PDF

## Complete Workflow Example

### Scenario: Creating and Editing a Quotation with Multiple Products

**Step 1: Create Quotation**
```
1. Select a customer
2. Click "Add Products"
3. Enable "Detailed View" toggle (shows larger images, descriptions)
4. Select Products:
   - Cricket Bat (Pair) → with detailed view
   - Tennis Ball (Dozen) → without detailed view
   - Sports Bag (Single) → with detailed view
5. Click "Add Selected"
```

**Step 2: Adjust Items**
```
In the quotation items list below:
- Item 1 (Cricket Bat):
  - Toggle: ON (detailed view enabled)
  - Qty: 5
  - UoM: Pair
  - Price: ₹500 each
  
- Item 2 (Tennis Ball):
  - Toggle: OFF (detailed view disabled)
  - Qty: 100
  - UoM: Dozen
  - Price: ₹50 each
  
- Item 3 (Sports Bag):
  - Toggle: ON (detailed view enabled)
  - Qty: 10
  - UoM: Single
  - Price: ₹1000 each
```

**Step 3: Save as Draft**
```
All settings saved:
✓ Cricket Bat: Detailed view ON, UoM=Pair, Qty=5
✓ Tennis Ball: Detailed view OFF, UoM=Dozen, Qty=100
✓ Sports Bag: Detailed view ON, UoM=Single, Qty=10
```

**Step 4: Edit the Draft Later**
```
When you open the quotation for editing:
- All detailed view toggles show correct state
- All UoM values are populated
- You can change any of these settings
- Changes persist when you save
```

**Step 5: Send Quotation**
```
- Click "Save & Send"
- Quotation status changes to "Sent"
- All detailed view and UoM settings are preserved
- PDF includes all these settings
```

**Step 6: Edit Sent Quotation**
```
Even after sending:
- Open the quotation for editing
- All previous settings (detailed view, UoM) are loaded correctly
- You can make changes
- Changes persist when you save again
```

## Troubleshooting

### Q: Detailed View Toggle Shows Wrong State When Editing?
**A:** This is now fixed. When you open an existing quotation, the detailed view toggle for each item should show the saved state. If not, try refreshing the page.

### Q: UoM Showing "Single" for Items I Set to Different Values?
**A:** 
- Check if the quotation was created before the UoM feature was fully implemented
- Quotations without saved UoM default to "Single" - this is expected
- You can update the UoM value and save again

### Q: Changes Not Saving When I Edit UoM?
**A:** 
- Make sure to click the "Save Draft" or "Save Changes" button
- The UoM field accepts any text input
- Default is "Single" if left blank

### Q: PDF Doesn't Show Images Even with Detailed View Enabled?
**A:** 
- Images must be available in the product data
- Check that the product has images in the product catalog
- Some products may not have images available

## Best Practices

1. **Set UoM Carefully**: Use consistent unit naming across quotations (e.g., always "Pair" not "pair" or "PAIR")
2. **Detailed View**: Enable only for products you want to highlight (controls PDF presentation)
3. **Review Before Sending**: Check the PDF preview to confirm all settings look correct
4. **Maintain History**: Keep different versions of quotations if requirements change

## Technical Notes for Admins

- **Database Field**: `is_detailed` (BOOLEAN) in `quotation_items` table
- **Default Value**: false (no detailed view)
- **Persistence**: Automatic via API, no additional configuration needed
- **Backward Compatibility**: Old quotations without this field will show as `false`
