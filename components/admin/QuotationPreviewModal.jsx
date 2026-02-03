import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Download, ExternalLink } from 'lucide-react'
import { format } from 'date-fns'

import { useState, useEffect } from 'react'

export function QuotationPreviewModal({ open, onOpenChange, quotation, onDownload }) {
    const [bankDetails, setBankDetails] = useState('')

    useEffect(() => {
        if (open) {
            const fetchBankDetails = async () => {
                try {
                    const { apiCall } = await import('@/lib/api-client')
                    const settings = await apiCall('/settings?keys=company_bank_details')
                    setBankDetails(settings.company_bank_details || '')
                } catch (e) {
                    console.error("Failed to fetch bank details:", e)
                }
            }
            fetchBankDetails()
        }
    }, [open])

    if (!quotation) return null

    // Helper to safely get numbers
    const getNum = (val) => parseFloat(val) || 0

    // Group items by Sub-Category → Brand (two-level hierarchy)
    const groupedBySub = (quotation.items || []).reduce((acc, item) => {
        const subCat = item.sub_category_name || 'General';
        const brand = item.brand_name || item.brand || 'Other';

        if (!acc[subCat]) acc[subCat] = {};
        if (!acc[subCat][brand]) acc[subCat][brand] = [];
        acc[subCat][brand].push(item);
        return acc;
    }, {});

    const termsToShow = quotation.terms_conditions || quotation.terms_and_conditions || '';

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto w-full p-0">
                {/* Corporate Header */}
                <div className="bg-gradient-to-r from-gray-900 to-gray-800 text-white px-8 py-5">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-6">
                            <img src="/pavilion-sports.png" alt="Pavilion Sports" className="h-9 object-contain" />
                            <div>
                                <h1 className="text-xl font-bold tracking-tight text-white leading-none">QUOTATION</h1>
                                <p className="text-xs text-gray-300 mt-1">#{quotation.quotation_number || quotation.reference_number}</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <div className="flex flex-col">
                                <span className="text-[10px] uppercase text-gray-400 font-bold tracking-wider">Issue Date</span>
                                <span className="text-sm font-semibold">{quotation.issue_date || (quotation.created_at ? format(new Date(quotation.created_at), 'dd MMM yyyy') : 'N/A')}</span>
                            </div>
                            <div className="flex flex-col mt-2">
                                <span className="text-[10px] uppercase text-gray-400 font-bold tracking-wider">Valid Until</span>
                                <span className="text-sm font-semibold">{quotation.valid_until || '30 Days'}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-8 space-y-8">
                    {/* Customer Information - Corporate Style */}
                    <div className="grid grid-cols-2 gap-8">
                        <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
                            <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-4">Bill To</h3>
                            <div className="space-y-2">
                                <p className="font-bold text-gray-900 text-lg">
                                    {quotation.customer_snapshot?.company_name || quotation.customer_snapshot?.name || quotation.company_name || quotation.customer_name || 'Walking Customer'}
                                </p>
                                <p className="text-sm text-gray-600">
                                    {quotation.customer_snapshot?.address || quotation.address || 'Address not available'}
                                </p>
                                <div className="flex flex-col gap-1 mt-3">
                                    {quotation.customer_snapshot?.email && (
                                        <p className="text-sm text-gray-600">Email: {quotation.customer_snapshot.email}</p>
                                    )}
                                    {quotation.customer_snapshot?.phone && (
                                        <p className="text-sm text-gray-600">Phone: {quotation.customer_snapshot.phone}</p>
                                    )}
                                    {(() => {
                                        const primaryContact = quotation.customer_snapshot?.contacts?.find(c => c.is_primary);
                                        if (!primaryContact) return null;
                                        return (
                                            <>
                                                <p className="text-sm font-bold text-gray-900 mt-2">Attn: {primaryContact.name}</p>
                                                {primaryContact.designation && <p className="text-xs text-gray-600">{primaryContact.designation}</p>}
                                                {primaryContact.phone && <p className="text-xs text-gray-600">Ph: {primaryContact.phone}</p>}
                                            </>
                                        );
                                    })()}
                                </div>
                            </div>
                        </div>
                        <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
                            <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-4">Quotation Details</h3>
                            <div className="space-y-3">
                                <div className="flex justify-between">
                                    <span className="text-sm text-gray-600">Payment Terms:</span>
                                    <span className="font-semibold text-gray-900">{quotation.payment_terms || 'Net 30 Days'}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-sm text-gray-600">Delivery:</span>
                                    <span className="font-semibold text-gray-900">7-14 Working Days</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-sm text-gray-600">Tax Rate:</span>
                                    <span className="font-semibold text-gray-900">{String(quotation.tax_rate || 18).replace('%', '')}% GST</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-sm text-gray-600">Status:</span>
                                    <span className="font-semibold text-gray-900">{quotation.status || 'Draft'}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Items Table - Grouped by Sub-Category → Brand */}
                    <div className="border border-gray-200 rounded-lg overflow-hidden">
                        {/* Table Header */}
                        <table className="w-full">
                            <thead className="bg-gray-50 border-b border-gray-200">
                                <tr>
                                    <th className="text-left px-6 py-4 font-semibold text-gray-700 text-sm uppercase tracking-wider w-[45%]">Product</th>
                                    <th className="text-right px-4 py-4 font-semibold text-gray-700 text-sm uppercase tracking-wider w-[15%]">MRP</th>
                                    <th className="text-right px-4 py-4 font-semibold text-gray-700 text-sm uppercase tracking-wider w-[15%]">Your Price</th>
                                    <th className="text-center px-6 py-4 font-semibold text-gray-700 text-sm uppercase tracking-wider w-[10%]">GST</th>
                                    <th className="text-center px-4 py-4 font-semibold text-gray-700 text-sm uppercase tracking-wider w-[10%]">Qty</th>
                                </tr>
                            </thead>
                        </table>

                        {/* Grouped Content */}
                        {Object.entries(groupedBySub).map(([subCat, brands], subIdx) => (
                            <div key={subIdx}>
                                {/* Sub-Category Header */}
                                <div className="bg-blue-50 px-6 py-2 border-b border-blue-100">
                                    <span className="font-bold text-blue-800 text-sm uppercase tracking-wide">{subCat}</span>
                                </div>

                                {/* Brand Groups */}
                                {Object.entries(brands).map(([brand, items], brandIdx) => (
                                    <div key={brandIdx}>
                                        {/* Brand Header */}
                                        <div className="bg-gray-50 px-6 py-1.5 border-b border-gray-100 pl-10">
                                            <span className="font-semibold text-gray-700 text-xs uppercase tracking-wider">{brand}</span>
                                        </div>

                                        {/* Products */}
                                        <table className="w-full">
                                            <tbody>
                                                {items.map((item, idx) => (
                                                    <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50/50">
                                                        <td className="px-6 py-3 w-[45%] pl-14">
                                                            <div className="flex gap-3">
                                                                {item.is_detailed && (item.image_url || item.image) && (
                                                                    <div className="w-10 h-10 rounded border bg-gray-50 overflow-hidden shrink-0">
                                                                        <img src={item.image_url || item.image} className="w-full h-full object-cover" />
                                                                    </div>
                                                                )}
                                                                <div className="flex-1 min-w-0">
                                                                    <div className="font-medium text-gray-900 text-sm">{item.name || item.product_name}</div>
                                                                    {item.is_detailed && item.short_description && (
                                                                        <div className="text-xs text-gray-500 mt-1 line-clamp-2">{item.short_description}</div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="text-right px-4 py-3 font-medium text-gray-600 w-[15%]">
                                                            ₹{getNum(item.mrp).toLocaleString()}
                                                        </td>
                                                        <td className="text-right px-4 py-3 font-semibold text-gray-900 w-[15%]">
                                                            ₹{getNum(item.custom_price || item.unit_price).toLocaleString()}
                                                        </td>
                                                        <td className="text-center px-6 py-3 text-sm text-gray-600 w-[10%]">
                                                            {String(item.gst_rate || '18').replace('%', '')}%
                                                        </td>
                                                        <td className="text-center px-4 py-3 font-medium text-gray-900 w-[10%]">
                                                            {item.quantity || 1}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                ))}
                            </div>
                        ))}
                    </div>

                    {/* NOTE: Grand Total / Pricing Summary is intentionally hidden per enterprise requirements */}
                    {/* Pricing calculations exist internally but are not shown in Preview or PDF */}

                    {/* Terms & Conditions - Corporate */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {termsToShow && (
                            <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
                                <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-4">Terms & Conditions</h3>
                                <p className="text-sm text-gray-600 whitespace-pre-line leading-relaxed">{termsToShow}</p>
                            </div>
                        )}
                        {bankDetails && (
                            <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
                                <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-4">Bank Details</h3>
                                <p className="text-sm text-gray-600 whitespace-pre-line leading-relaxed font-mono">{bankDetails}</p>
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="text-center py-6 border-t border-gray-200">
                        <p className="text-sm text-gray-500">This is a computer-generated quotation and does not require a signature.</p>
                        <div className="mt-4">
                            <Button onClick={onDownload} className="bg-red-600 hover:bg-red-700 text-white gap-2">
                                <Download className="w-4 h-4" /> Download PDF
                            </Button>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}