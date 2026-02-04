# Visual Implementation Guide

## Component Interaction Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                     QuotationBuilder Component                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  STATE:                                                           │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ quotationItems: [                                            ││
│  │   {                                                           ││
│  │     product_id: 1,                                           ││
│  │     name: "Cricket Bat",                                    ││
│  │     quantity: 5,                                             ││
│  │     uom: "Pair",            ← UoM FIELD (NEW FIX)           ││
│  │     custom_price: 500,                                       ││
│  │     is_detailed: true,      ← DETAILED VIEW (FIXED)         ││
│  │     image: "/path/to/image"                                  ││
│  │     ...                                                       ││
│  │   }                                                           ││
│  │ ]                                                             ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                   │
│  ┌──────────────────────────────────────┐                        │
│  │  ITEM DISPLAY (Quotation Items List) │                        │
│  ├──────────────────────────────────────┤                        │
│  │ [Switch] 🔵 Brand                  ❌│  ← Detailed View Toggle│
│  │ 🖼️ Cricket Bat                       │                        │
│  │ High quality bat...                  │                        │
│  │                                      │                        │
│  │ ┌──────┐  ┌─────┐  ┌────┐  ┌────┐ │                        │
│  │ │Disc% │  │Qty  │  │UoM │  │ ₹  │  │  ← UoM FIELD DISPLAY  │
│  │ │  0   │  │  5  │  │Pair│  │500 │  │                        │
│  │ └──────┘  └─────┘  └────┘  └────┘  │                        │
│  └──────────────────────────────────────┘                        │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ handleSave()
                              ↓
                    PAYLOAD MAPPING
                    ┌──────────────────┐
                    │ items: [          │
                    │ {                 │
                    │  product_id: 1,   │
                    │  quantity: 5,     │
                    │  uom: "Pair",    │ ← ADDED IN FIX #1
                    │  is_detailed: T,  │
                    │  ...              │
                    │ }]                │
                    └──────────────────┘
                              │
                              │ API Call
                              ↓
                    ┌─────────────────────┐
                    │  /api/admin/         │
                    │  quotations/{id}     │
                    │  PUT                 │
                    └─────────────────────┘
                              │
                              │ Database
                              ↓
                    ┌──────────────────────────┐
                    │ quotation_items table    │
                    ├──────────────────────────┤
                    │ id  │ product_id │ uom    │ is_detailed
                    │ 1   │ 1          │ "Pair" │ true
                    │ 2   │ 2          │ "Dozen"│ false
                    └──────────────────────────┘
```

## Data Flow for Editing Quotation

```
FETCH EXISTING QUOTATION
        │
        ├─→ API: GET /api/admin/quotations/{id}
        │
        └─→ Returns:
            {
              quotation_number: "QT-2024-001",
              status: "Draft",
              payment_terms: "Net 30 Days",    ← ADDED IN FIX #2
              comments: "Special handling",    ← ADDED IN FIX #2
              items: [
                {
                  product_id: 1,
                  product_name: "Cricket Bat",
                  uom: "Pair",        ← RETRIEVED FROM DB
                  is_detailed: true,  ← RETRIEVED FROM DB
                  quantity: 5,
                  unit_price: 500,
                  ...
                }
              ]
            }
        │
        ├─→ setQuotationDetails()  ← FIX #2: Now includes payment_terms, comments
        │
        └─→ setQuotationItems()    ← Maps with robust conversion:
            items.map(item => ({
              ...item,
              uom: item.uom || 'Single',     ← Default if null
              is_detailed: item.is_detailed  ← Already boolean
            }))
        │
        ├─→ UI RENDERS with:
        │   - Detailed View toggle (shows current state)
        │   - UoM input field (shows current value)
        │
        └─→ USER EDITS and clicks SAVE
            │
            └─→ handleSave() includes BOTH fields
                handleSaveAndSend() includes BOTH fields (FIX #1)
```

## PDF Generation Flow

```
generatePDFDoc()
    │
    ├─→ TABLE HEADER (FIX #3)
    │   ┌────────────────────────────────┐
    │   │Product│MRP│Price│GST│Qty│UoM  │ ← UoM COLUMN ADDED
    │   │     x20  105  130  160 173 185 │ ← Fixed column positions
    │   └────────────────────────────────┘
    │
    └─→ PRODUCT ROW (FIX #4)
        FOR EACH item IN quotationItems:
        {
          IF is_detailed:
            - Show large product image (20x20mm)
            - Show product description
            - Extra spacing (15mm height)
          ELSE:
            - Normal spacing (8mm height)
          
          DISPLAY:
          - Product name
          - MRP price
          - Your price
          - GST rate
          - Quantity
          - UoM value ← NEW (line position = 185)
        }
        
        Example PDF output:
        ┌─────────────────────────────────────────────────┐
        │ Cricket Bat    │ ₹150 │ ₹500  │ 18% │ 5 │ Pair │
        │ [Image] High-q │      │       │     │   │      │
        │ uality bat...  │      │       │     │   │      │
        │                │      │       │     │   │      │
        │ Tennis Ball    │ ₹75  │ ₹50   │ 18% │10 │Dozen │
        │ Sports Bag     │ ₹1000│ ₹1000 │ 18% │ 1 │Single│
        │ [Image] Premium│      │       │     │   │      │
        │ quality bag... │      │       │     │   │      │
        └─────────────────────────────────────────────────┘
```

## State Persistence Across Edits

```
INITIAL SAVE (CREATE)
┌─────────────────────┐
│ user sets values    │
│ is_detailed: true   │
│ uom: "Pair"         │
└──────────┬──────────┘
           │ SAVE
           ↓
    ┌─────────────┐
    │   DATABASE  │
    │ is_detailed:│
    │    true ✓   │
    │ uom:"Pair"✓ │
    └──────┬──────┘
           │
FIRST EDIT (RELOAD)
           │
           ↓ FETCH
    ┌─────────────┐
    │   DATABASE  │
    │ Returns:    │
    │ is_detailed:│
    │   true      │
    │ uom:"Pair"  │
    └──────┬──────┘
           │
           ↓ MAP & LOAD
    ┌──────────────────────┐
    │ quotationItems[0]:    │
    │ is_detailed: true ✓  │
    │ uom: "Pair" ✓        │
    │ [Toggle shows ON]    │
    │ [Input shows "Pair"] │
    └──────┬───────────────┘
           │
USER EDITS │ Changes to:
           │ is_detailed: false
           │ uom: "Single"
           ↓
    ┌─────────────────────┐
    │   handleSave()      │
    │ Sends:              │
    │ is_detailed: false  │
    │ uom: "Single"       │
    └──────┬──────────────┘
           │ API PUT
           ↓
    ┌──────────────────┐
    │    DATABASE      │
    │ Updated to:      │
    │ is_detailed:false│
    │ uom:"Single"  ✓  │
    └──────┬───────────┘
           │
NEXT EDIT  │
           ↓ FETCH
    ┌──────────────────────┐
    │ quotationItems[0]:    │
    │ is_detailed: false ✓ │
    │ uom: "Single" ✓      │
    │ [Toggle shows OFF]   │
    │ [Input shows "Single"]
    └──────────────────────┘
           │
      CYCLE REPEATS...
```

## Fix Location Reference

```
QuotationBuilder.jsx
│
├─ handleSaveAndSend() [Line ~949]
│  └─ FIX #1: Add uom to items.map()
│
├─ Quotation Load Effect [Line ~517]
│  └─ FIX #2: Add payment_terms, comments to setQuotationDetails()
│
├─ generatePDFDoc() [Line ~283]
│  ├─ FIX #3: Add UoM header, adjust column positions
│  └─ FIX #4: Add UoM data output
│
├─ Item Display [Line ~1315]
│  └─ ALREADY WORKING:
│     - Switch for is_detailed toggle
│     - Input for uom field
│
└─ handleSave() [Line ~1007]
   └─ ALREADY CORRECT:
      - Includes uom in items.map()
      - Includes is_detailed in items.map()
```

## Key Classes & Methods

```javascript
// Main Component
class QuotationBuilder extends React.Component {
  
  // State that holds quotation items
  const [quotationItems, setQuotationItems] = useState([])
  
  // Load quotation for editing
  useEffect(() => {
    if (quoteId) {
      const quote = await apiCall(`/quotations/${quoteId}`)
      setQuotationItems(quote.items.map(item => ({
        ...item,
        is_detailed: item.is_detailed,    // Maps boolean
        uom: item.uom || 'Single'         // Maps or defaults
      })))
    }
  }, [quoteId])
  
  // Toggle detailed view for specific item
  function toggleItemDetail(index, val) {
    setQuotationItems(prev => prev.map((item, i) =>
      i === index ? { ...item, is_detailed: val } : item
    ))
  }
  
  // Update any item field including uom
  function updateItem(index, field, value) {
    setQuotationItems(prev => prev.map((item, i) =>
      i === index ? { ...item, [field]: value } : item
    ))
  }
  
  // Save quotation (handles both handleSave and handleSaveAndSend)
  async function handleSave() {
    const payload = {
      items: quotationItems.map(item => ({
        ...item,
        is_detailed: !!item.is_detailed,  // Convert to boolean
        uom: item.uom || 'Single'         // Use or default
      }))
    }
    await apiCall(`/quotations/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    })
  }
}
```

This completes the visual guide showing how all pieces fit together!
