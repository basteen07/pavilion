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
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto w-full p-0 bg-white text-slate-900">
                {/* PDF-Like Header */}
                <div className="bg-white px-8 py-6 border-b border-gray-100">
                    <div className="flex justify-between items-start">
                        {/* Left: Logo & Address */}
                        <div className="flex flex-col gap-2">
                            <img src="/pavilion-sports.png" alt="Pavilion Sports" className="h-10 object-contain w-fit" />
                            <div className="text-[10px] text-gray-500 mt-2 space-y-0.5 leading-tight">
                                <p className="font-medium text-gray-700">Pavilion Sports</p>
                                <p>The Pavilion 30, Wallajah Road Near Chepauk Stadium</p>
                                <p>Chennai - 600002 Tamil Nadu, India</p>
                                <p>Email: info@pavilionsports.com | Web: www.pavilionsports.com</p>
                            </div>
                        </div>

                        {/* Right: Quotation Title & Meta */}
                        <div className="text-right">
                            <h1 className="text-2xl font-bold text-gray-800 tracking-tight">Quotation</h1>
                            <p className="text-sm text-gray-500 font-medium mt-1">#{quotation.quotation_number || quotation.reference_number}</p>

                            <div className="mt-4 flex flex-col gap-1 text-xs">
                                <div className="flex justify-end gap-2 text-gray-600">
                                    <span>Date:</span>
                                    <span className="font-semibold text-gray-900">{quotation.issue_date || (quotation.created_at ? format(new Date(quotation.created_at), 'yyyy-MM-dd') : 'N/A')}</span>
                                </div>
                                <div className="flex justify-end gap-2 text-gray-600">
                                    <span>Valid Until:</span>
                                    <span className="font-semibold text-gray-900">{quotation.valid_until || '30 Days'}</span>
                                </div>
                                <div className="flex justify-end gap-2 text-gray-600">
                                    <span>Payment:</span>
                                    <span className="font-semibold text-gray-900">{quotation.payment_terms || 'Net 30 Days'}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="px-8 py-6 space-y-6">
                    {/* Bill To Section */}
                    <div className="bg-gray-50/50 p-4 rounded-lg border border-gray-100">
                        <div className="flex gap-10">
                            <div className="w-20 pt-1">
                                <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">BILL TO:</span>
                            </div>
                            <div className="flex-1">
                                <p className="font-bold text-gray-900 text-sm">
                                    {quotation.customer_snapshot?.company_name || quotation.customer_snapshot?.name || quotation.company_name || quotation.customer_name || 'Walking Customer'}
                                </p>
                                {(() => {
                                    const primaryContact = quotation.customer_snapshot?.contacts?.find(c => c.is_primary);
                                    if (primaryContact) {
                                        return (
                                            <div className="mt-2 text-xs text-gray-600 space-y-0.5">
                                                <p><span className="font-medium text-gray-900">Attn:</span> {primaryContact.name}</p>
                                                {primaryContact.designation && <p>{primaryContact.designation}</p>}
                                                {primaryContact.phone && <p>Ph: {primaryContact.phone}</p>}
                                            </div>
                                        )
                                    }
                                    return null;
                                })()}

                                <div className="mt-3 text-xs text-gray-500 leading-relaxed max-w-md">
                                    {quotation.customer_snapshot?.address || quotation.address || ''}
                                </div>

                                <div className="mt-3 grid grid-cols-2 max-w-sm gap-2 text-xs">
                                    <div className="flex gap-2">
                                        <span className="font-bold text-gray-700">Phone:</span>
                                        <span className="text-gray-600">{quotation.customer_snapshot?.phone || quotation.customer_phone || '-'}</span>
                                    </div>
                                    <div className="flex gap-2">
                                        <span className="font-bold text-gray-700">Email:</span>
                                        <span className="text-gray-600">{quotation.customer_snapshot?.email || quotation.customer_email || '-'}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Grouped Items Table - Matching PDF Colors exactly */}
                    <div className="border border-gray-200 rounded-sm overflow-hidden text-xs">
                        {/* Header - Graphite/Dark Gray */}
                        <div className="bg-[#374151] text-white flex font-bold py-2 px-4 uppercase tracking-wider">
                            <div className="w-[45%]">Product</div>
                            <div className="w-[10%] text-center">UoM</div>
                            <div className="w-[15%] text-right">Your Price</div>
                            <div className="w-[10%] text-center">GST</div>
                            <div className="w-[10%] text-center">Qty</div>
                            <div className="w-[10%] text-right">Total</div>
                        </div>

                        {/* Grouped Content */}
                        {Object.entries(groupedBySub).map(([subCat, brands], subIdx) => (
                            <div key={subIdx}>
                                {/* Sub-Category Header - Gray-200 */}
                                <div className="bg-gray-200 px-4 py-1.5 border-b border-gray-300">
                                    <span className="font-bold text-gray-700 uppercase tracking-wide text-[11px]">{subCat}</span>
                                </div>

                                {/* Brand Groups */}
                                {Object.entries(brands).map(([brand, items], brandIdx) => (
                                    <div key={brandIdx}>
                                        {/* Brand Header - Blue-50 */}
                                        <div className="bg-blue-50 px-4 py-1 border-b border-blue-100">
                                            <span className="font-bold text-blue-700 uppercase tracking-wider text-[10px]">{brand}</span>
                                        </div>

                                        {/* Products */}
                                        <div className="divide-y divide-gray-100">
                                            {items.map((item, idx) => {
                                                const unitPrice = getNum(item.custom_price || item.unit_price);
                                                const quantity = getNum(item.quantity) || 1;
                                                const total = unitPrice * quantity;

                                                // Handle images for detailed view
                                                let images = [];
                                                if (item.is_detailed) {
                                                    if (Array.isArray(item.images)) {
                                                        images = item.images;
                                                    } else if (typeof item.images === 'string') {
                                                        try {
                                                            const parsed = JSON.parse(item.images);
                                                            images = Array.isArray(parsed) ? parsed : [parsed];
                                                        } catch (e) {
                                                            images = [item.images];
                                                        }
                                                    } else if (item.image_url || item.image) {
                                                        images = [item.image_url || item.image];
                                                    }
                                                }

                                                return (
                                                    <div key={idx} className="flex px-4 py-3 hover:bg-gray-50 items-start">
                                                        <div className="w-[45%] pr-4">
                                                            <div className="flex justify-between items-start">
                                                                <div className="flex-1">
                                                                    <div className="flex items-center gap-2 flex-wrap">
                                                                        <span className="font-medium text-gray-800">{item.name || item.product_name}</span>
                                                                        {item.slug && (
                                                                            <a
                                                                                href={`https://www.pavilionsports.com/product/${item.slug}`}
                                                                                target="_blank"
                                                                                rel="noreferrer"
                                                                                className="text-blue-600 hover:text-blue-800 text-[10px] font-bold"
                                                                            >
                                                                                [View]
                                                                            </a>
                                                                        )}
                                                                    </div>
                                                                    {item.is_detailed && item.short_description && (
                                                                        <p className="text-[10px] text-gray-500 mt-1 leading-tight line-clamp-3">{item.short_description}</p>
                                                                    )}
                                                                </div>

                                                                {/* Horizontal Images on Right */}
                                                                {item.is_detailed && images.length > 0 && (
                                                                    <div className="flex gap-2 ml-4 shrink-0">
                                                                        {images.slice(0, 4).map((img, i) => (
                                                                            <div key={i} className="w-12 h-16 bg-gray-50 border border-gray-100 rounded-sm overflow-hidden shadow-sm">
                                                                                <img src={img} alt="" className="w-full h-full object-cover" />
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <div className="w-[10%] text-center text-gray-700">
                                                            {item.uom || 'Single'}
                                                        </div>
                                                        <div className="w-[15%] text-right font-bold text-gray-900">
                                                            Rs. {unitPrice.toLocaleString()}
                                                        </div>
                                                        <div className="w-[10%] text-center text-gray-600">
                                                            {String(item.gst_rate || '18').replace('%', '')}%
                                                        </div>
                                                        <div className="w-[10%] text-center font-medium text-gray-900">
                                                            {quantity}
                                                        </div>
                                                        <div className="w-[10%] text-right font-black text-gray-900">
                                                            Rs. {total.toLocaleString()}
                                                        </div>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ))}
                    </div>

                    {/* Terms & Conditions - Always show */}
                    <div className="mt-8 space-y-4 pt-4 border-t border-gray-100">
                        <div>
                            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Terms & Conditions:</h3>
                            <p className="text-xs text-gray-500 whitespace-pre-line leading-relaxed">{termsToShow || 'No specific terms.'}</p>
                        </div>

                        {quotation.comments && (
                            <div className="pt-4 border-t border-gray-100">
                                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Comments / Special Instructions:</h3>
                                <p className="text-xs text-gray-500 whitespace-pre-line leading-relaxed">{quotation.comments}</p>
                            </div>
                        )}

                        {bankDetails && (
                            <div className="pt-4 border-t border-gray-100">
                                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Bank Details:</h3>
                                <p className="text-xs text-gray-500 whitespace-pre-line leading-relaxed font-mono bg-gray-50 p-3 rounded">{bankDetails}</p>
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="text-center py-4 mt-8 border-t border-gray-200">
                        <p className="text-[10px] text-gray-400 uppercase tracking-widest">This is a computer-generated quotation. No signature required.</p>
                        <div className="mt-6 flex justify-center">
                            <Button onClick={onDownload} className="bg-red-600 hover:bg-red-700 text-white gap-2 shadow-lg hover:shadow-xl transition-all">
                                <Download className="w-4 h-4" /> Download PDF
                            </Button>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}