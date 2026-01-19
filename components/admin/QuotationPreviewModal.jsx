import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Download, ExternalLink } from 'lucide-react'
import { format } from 'date-fns'

// Default Terms & Conditions
const DEFAULT_TERMS = `1. Prices are valid for 30 days from the quotation date.
2. Payment terms: 50% advance, balance before delivery.
3. Delivery: 7-14 working days from order confirmation.
4. All prices are exclusive of GST unless otherwise stated.
5. Goods once sold cannot be returned or exchanged.
6. This quotation is subject to stock availability.`;

export function QuotationPreviewModal({ open, onOpenChange, quotation, onDownload }) {
    if (!quotation) return null

    // Helper to safely get numbers
    const getNum = (val) => parseFloat(val) || 0

    // Group items by Category > Sub-Category > Brand
    const groupedItems = (quotation.items || []).reduce((acc, item) => {
        const cat = item.category_name || 'General';
        const subCat = item.sub_category_name || '';
        const brand = item.brand_name || item.brand || '';
        const groupKey = [cat, subCat, brand].filter(Boolean).join(' › ');

        if (!acc[groupKey]) acc[groupKey] = [];
        acc[groupKey].push(item);
        return acc;
    }, {});

    const termsToShow = quotation.terms_and_conditions || DEFAULT_TERMS;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto w-full p-0">
                {/* Compact Header */}
                <div className="bg-white border-b px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <img src="/pavilion-sports.png" alt="Pavilion Sports" className="h-8 object-contain" />
                        <div>
                            <h1 className="text-lg font-bold text-gray-900">Quotation</h1>
                            <p className="text-xs text-gray-500">#{quotation.quotation_number || quotation.reference_number}</p>
                        </div>
                    </div>
                    <Button onClick={onDownload} size="sm" className="bg-red-600 hover:bg-red-700 text-white gap-2">
                        <Download className="w-4 h-4" /> Download PDF
                    </Button>
                </div>

                <div className="p-6 space-y-6">
                    {/* Meta Info - Compact Row */}
                    <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                            <span className="text-[10px] font-bold text-gray-400 uppercase">Date</span>
                            <p className="font-medium text-gray-900">
                                {quotation.issue_date || (quotation.created_at ? format(new Date(quotation.created_at), 'dd MMM yyyy') : 'N/A')}
                            </p>
                        </div>
                        <div>
                            <span className="text-[10px] font-bold text-gray-400 uppercase">Valid Until</span>
                            <p className="font-medium text-gray-900">{quotation.valid_until || 'N/A'}</p>
                        </div>
                        <div>
                            <span className="text-[10px] font-bold text-gray-400 uppercase">Payment Terms</span>
                            <p className="font-medium text-gray-900">{quotation.payment_terms || 'Net 30 Days'}</p>
                        </div>
                    </div>

                    {/* Customer Info - Compact */}
                    <div className="bg-gray-50 p-4 rounded-lg">
                        <span className="text-[10px] font-bold text-gray-400 uppercase">Bill To</span>
                        <p className="font-bold text-gray-900 mt-1">
                            {quotation.customer_snapshot?.company_name || quotation.customer_snapshot?.name || quotation.company_name || quotation.customer_name || 'Walking Customer'}
                        </p>
                        <p className="text-sm text-gray-600 mt-1">
                            {quotation.customer_snapshot?.address || quotation.address || ''}
                        </p>
                        <div className="flex gap-4 mt-2 text-xs text-gray-500">
                            {quotation.customer_snapshot?.email && <span>{quotation.customer_snapshot.email}</span>}
                            {quotation.customer_snapshot?.phone && <span>{quotation.customer_snapshot.phone}</span>}
                        </div>
                    </div>

                    {/* Items Table - Grouped */}
                    <div className="border rounded-lg overflow-hidden">
                        {Object.entries(groupedItems).map(([groupName, items], groupIdx) => (
                            <div key={groupIdx}>
                                {/* Group Header - Compact */}
                                {Object.keys(groupedItems).length > 1 && (
                                    <div className="bg-gray-100 px-4 py-1.5 border-b">
                                        <span className="text-xs font-bold text-gray-600 uppercase tracking-wide">{groupName}</span>
                                    </div>
                                )}

                                {/* Items Table */}
                                <table className="w-full">
                                    {groupIdx === 0 && (
                                        <thead className="bg-gray-50 text-xs text-gray-600 uppercase">
                                            <tr>
                                                <th className="text-left px-4 py-2 font-semibold w-[45%]">Product</th>
                                                <th className="text-center px-2 py-2 font-semibold w-[10%]">Qty</th>
                                                <th className="text-right px-2 py-2 font-semibold w-[15%]">Price</th>
                                                <th className="text-center px-2 py-2 font-semibold w-[10%]">GST</th>
                                                <th className="text-right px-4 py-2 font-semibold w-[20%]">Total</th>
                                            </tr>
                                        </thead>
                                    )}
                                    <tbody>
                                        {items.map((item, idx) => (
                                            <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50/50">
                                                <td className="px-4 py-3">
                                                    <div className="font-medium text-gray-900 text-sm">{item.name || item.product_name}</div>
                                                    {item.slug && (
                                                        <a
                                                            href={`/product/${item.slug}`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="text-xs text-blue-600 hover:underline inline-flex items-center gap-1 mt-0.5"
                                                        >
                                                            View Product <ExternalLink className="w-3 h-3" />
                                                        </a>
                                                    )}
                                                </td>
                                                <td className="text-center px-2 py-3 text-sm">{item.quantity}</td>
                                                <td className="text-right px-2 py-3 text-sm font-medium">
                                                    ₹{getNum(item.custom_price || item.unit_price).toLocaleString()}
                                                </td>
                                                <td className="text-center px-2 py-3 text-xs text-gray-500">
                                                    {item.gst_rate || item.gst_percentage || '18'}%
                                                </td>
                                                <td className="text-right px-4 py-3 text-sm font-bold">
                                                    ₹{(getNum(item.custom_price || item.unit_price) * getNum(item.quantity)).toLocaleString()}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ))}
                    </div>

                    {/* Totals - Only if show_total is enabled */}
                    {quotation.show_total !== false && (
                        <div className="flex justify-end">
                            <div className="w-64 space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Subtotal:</span>
                                    <span className="font-medium">₹{getNum(quotation.subtotal).toLocaleString()}</span>
                                </div>

                                {getNum(quotation.discount_value) > 0 && (
                                    <div className="flex justify-between text-red-600">
                                        <span>Discount {quotation.discount_type === 'percentage' ? `(${quotation.discount_value}%)` : ''}:</span>
                                        <span>-₹{
                                            quotation.discount_type === 'percentage'
                                                ? (getNum(quotation.subtotal) * getNum(quotation.discount_value) / 100).toLocaleString()
                                                : getNum(quotation.discount_value).toLocaleString()
                                        }</span>
                                    </div>
                                )}

                                <div className="flex justify-between">
                                    <span className="text-gray-500">GST ({quotation.tax_rate || 18}%):</span>
                                    <span className="font-medium">₹{getNum(quotation.gst || quotation.tax).toLocaleString()}</span>
                                </div>

                                {getNum(quotation.shipping_cost) > 0 && (
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">Shipping:</span>
                                        <span className="font-medium">₹{getNum(quotation.shipping_cost).toLocaleString()}</span>
                                    </div>
                                )}

                                <div className="border-t pt-2 flex justify-between items-center">
                                    <span className="font-bold">Total</span>
                                    <span className="font-bold text-lg text-red-600">₹{getNum(quotation.total_amount || quotation.total).toLocaleString()}</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Terms & Conditions */}
                    <div className="pt-4 border-t">
                        <h4 className="text-[10px] font-bold text-gray-400 uppercase mb-2">Terms & Conditions</h4>
                        <p className="text-xs text-gray-500 whitespace-pre-line leading-relaxed">{termsToShow}</p>
                    </div>

                    {/* Footer */}
                    <div className="text-center pt-4 border-t">
                        <p className="text-[10px] text-gray-400">This is a computer-generated quotation. No signature required.</p>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}