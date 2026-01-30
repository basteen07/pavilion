'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
    ArrowLeft, Save, Plus, Trash2, Mail, Phone,
    MapPin, Building2, UserCircle2, FileText, Send,
    MoreVertical, ExternalLink, Calculator, Pencil, Search, Calendar,
    ChevronLeft, ChevronRight, Download, Eye, PenLine, Loader2, Clock
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { apiCall } from '@/lib/api-client';
import { toast } from 'sonner';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { format } from 'date-fns';
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem,
    DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { QuotationPreviewModal } from '@/components/admin/QuotationPreviewModal';
import { PaginationControls } from '@/components/admin/PaginationControls';
import jsPDF from 'jspdf';

export default function CustomerDetailPage({ params }) {
    const id = params.id;
    const router = useRouter();
    const queryClient = useQueryClient();
    const [isEditing, setIsEditing] = useState(false);
    const [contactModalOpen, setContactModalOpen] = useState(false);
    const [editingContactIndex, setEditingContactIndex] = useState(null);
    const [editingContact, setEditingContact] = useState({ name: '', email: '', phone: '', designation: '' });
    const [selectedCustomerTypeId, setSelectedCustomerTypeId] = useState('');

    // Quotation List State
    const [quoteSearch, setQuoteSearch] = useState('');
    const [quoteDateFilter, setQuoteDateFilter] = useState('');
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(5);
    const [previewOpen, setPreviewOpen] = useState(false);
    const [selectedQuoteForPreview, setSelectedQuoteForPreview] = useState(null);
    const [selectedIds, setSelectedIds] = useState(new Set());

    const { data: customer, isLoading: isLoadingCustomer } = useQuery({
        queryKey: ['customers', id],
        queryFn: () => apiCall(`/customers/${id}`),
        onSuccess: (data) => {
            if (data?.customer_type_id) setSelectedCustomerTypeId(data.customer_type_id.toString());
        }
    });

    const { data: customerTypes = [] } = useQuery({
        queryKey: ['customer-types'],
        queryFn: () => apiCall('/customer-types'),
    });

    const { data: quotationsData = { quotations: [], total: 0, totalPages: 1 }, isLoading: isLoadingQuotes } = useQuery({
        queryKey: ['quotations', 'customer', id, page, pageSize, quoteSearch, quoteDateFilter],
        queryFn: () => {
            const params = new URLSearchParams({
                customer_id: id,
                page: page.toString(),
                limit: pageSize.toString(),
                search: quoteSearch
            });
            if (quoteDateFilter) params.append('date_from', quoteDateFilter);

            return apiCall(`/quotations?${params}`);
        },
    });

    const { data: timeline = [], isLoading: isLoadingTimeline } = useQuery({
        queryKey: ['customer-timeline', id],
        queryFn: () => apiCall(`/admin/activity-logs/customer/${id}`)
    });

    // Checkbox handlers (moved after quotationsData is defined)
    const allSelected = quotationsData?.quotations?.length > 0 && selectedIds.size === quotationsData.quotations.length;

    const handleSelectAll = (checked) => {
        if (checked) {
            setSelectedIds(new Set(quotationsData.quotations.map(q => q.id)));
        } else {
            setSelectedIds(new Set());
        }
    };

    const handleSelectOne = (quoteId, checked) => {
        const newSelected = new Set(selectedIds);
        if (checked) {
            newSelected.add(quoteId);
        } else {
            newSelected.delete(quoteId);
        }
        setSelectedIds(newSelected);
    };

    const updateMutation = useMutation({
        mutationFn: (data) => apiCall(`/customers/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
        onSuccess: () => {
            queryClient.invalidateQueries(['customers', id]);
            toast.success('Customer updated successfully');
            setIsEditing(false);
        },
        onError: (err) => toast.error(err.message)
    });

    const sendQuoteMutation = useMutation({
        mutationFn: (quoteId) => apiCall(`/quotations/${quoteId}`, { method: 'PUT', body: JSON.stringify({ status: 'Sent' }) }),
        onSuccess: () => {
            queryClient.invalidateQueries(['quotations', 'customer', id]);
            toast.success('Quotation marked as sent');
        },
        onError: (err) => toast.error(err.message)
    });

    if (isLoadingCustomer) return <div className="p-8 text-center bg-gray-50 h-screen flex items-center justify-center">Loading customer...</div>;
    if (!customer) return <div className="p-8 text-center text-red-500 bg-gray-50 h-screen flex items-center justify-center">Customer not found</div>;

    // ... (Handlers for Customer/Contact Save - unchanged) ...
    const handleSave = (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData.entries());
        data.contacts = customer.contacts;
        updateMutation.mutate(data);
    };

    const togglePrimaryContact = (contactIndex) => {
        const newContacts = customer.contacts.map((c, i) => ({
            ...c,
            is_primary: i === contactIndex
        }));
        updateMutation.mutate({ ...customer, contacts: newContacts });
    };

    const openAddContactModal = () => {
        setEditingContactIndex(null);
        setEditingContact({ name: '', email: '', phone: '', designation: '', is_primary: false });
        setContactModalOpen(true);
    };

    const openEditContactModal = (index, contact) => {
        setEditingContactIndex(index);
        setEditingContact({ ...contact });
        setContactModalOpen(true);
    };

    const saveContact = () => {
        let newContacts = [...(customer.contacts || [])];
        if (editingContactIndex !== null) {
            newContacts[editingContactIndex] = editingContact;
        } else {
            newContacts.push(editingContact);
        }
        updateMutation.mutate({ ...customer, contacts: newContacts });
        setContactModalOpen(false);
    };

    const removeContact = (index) => {
        const newContacts = customer.contacts.filter((_, i) => i !== index);
        if (customer.contacts[index].is_primary && newContacts.length > 0) {
            newContacts[0].is_primary = true;
        }
        updateMutation.mutate({ ...customer, contacts: newContacts });
    };

    // Helper to get primary contact details (duplicated from list for robustness in PDF)
    const getPrimaryContact = (quote) => {
        const snapshot = quote.customer_snapshot || {};
        const contacts = Array.isArray(snapshot.contacts) ? snapshot.contacts : [];
        let contact = contacts.find(c => c.is_primary);
        if (!contact && contacts.length > 0) contact = contacts[0];
        return {
            name: contact?.name || snapshot.primary_contact || snapshot.contact_person || 'N/A',
            designation: contact?.designation || '',
            phone: contact?.phone || snapshot.phone || 'N/A',
            email: contact?.email || snapshot.email || ''
        };
    };

    async function handleView(quoteId) {
        try {
            const quote = await apiCall(`/quotations/${quoteId}`)
            if (quote.error) throw new Error(quote.error)

            const previewData = {
                ...quote,
                customer_snapshot: quote.customer_snapshot || quote.customer || {},
                items: quote.items || [],
                subtotal: parseFloat(quote.subtotal || 0),
                discount_amount: parseFloat(quote.discount_amount || 0),
                gst: parseFloat(quote.gst || 0),
                total_amount: parseFloat(quote.total_amount || 0)
            }
            setSelectedQuoteForPreview(previewData)
            setPreviewOpen(true)
        } catch (e) {
            toast.error("Failed to load details")
        }
    }

    async function handleDownload(quoteId) {
        try {
            const quote = await apiCall(`/quotations/${quoteId}`)
            if (quote.error) throw new Error(quote.error)

            const doc = new jsPDF()

            // Header
            try {
                const logoUrl = '/pavilion-sports.png'
                doc.addImage(logoUrl, 'PNG', 14, 12, 45, 12)
            } catch (e) {
                console.error('Logo add error:', e)
            }

            // Watermark (background logo)
            try {
                const logoUrl = '/pavilion-sports.png'
                doc.saveGraphicsState();
                doc.setGState(new doc.GState({ opacity: 0.04 }));
                doc.addImage(logoUrl, 'PNG', 30, 80, 150, 45, undefined, 'FAST');
                doc.restoreGraphicsState();
            } catch (e) {
                console.error('Watermark add error:', e)
            }

            doc.setFontSize(22);
            doc.setFont("helvetica", "bold");
            doc.setTextColor(220, 38, 38); // Brand Red
            doc.text("QUOTATION", 150, 20);

            doc.setFontSize(10);
            doc.setTextColor(40);
            doc.setFont("helvetica", "normal");

            // Customer Info
            const cust = quote.customer_snapshot || {};
            const contact = getPrimaryContact(quote); // Use the helper

            doc.text(`To: ${cust.company_name || quote.customer_name || 'Customer'}`, 14, 40);

            // Enhanced Contact Details in PDF
            let yPos = 45;
            if (contact.name && contact.name !== 'N/A') {
                const designationStr = contact.designation ? ` (${contact.designation})` : '';
                doc.text(`Attn: ${contact.name}${designationStr}`, 14, yPos);
                yPos += 5;
            }

            if (contact.email) {
                doc.text(`Email: ${contact.email}`, 14, yPos);
                yPos += 5;
            }

            if (contact.phone && contact.phone !== 'N/A') {
                doc.text(`Phone: ${contact.phone}`, 14, yPos);
                yPos += 5;
            }

            // Meta
            doc.text(`Reference: ${quote.quotation_number}`, 150, 40);
            doc.text(`Date: ${new Date(quote.created_at).toLocaleDateString()}`, 150, 45);

            // Table needs to start lower if contact info is long
            let y = Math.max(65, yPos + 10);
            doc.setDrawColor(220, 38, 38); // Brand Red for lines
            doc.line(14, y, 196, y);
            y += 10;
            doc.setFont("helvetica", "bold");
            doc.setTextColor(220, 38, 38);
            doc.text("Item", 14, y);
            doc.text("Qty", 120, y);
            doc.text("Price", 140, y);
            doc.text("Total", 170, y);
            y += 5;
            doc.line(14, y, 196, y);
            doc.setFont("helvetica", "normal");
            doc.setTextColor(40);
            y += 10;

            quote.items.forEach(item => {
                const name = item.product_name || item.name || '';
                const qty = item.quantity;
                const price = parseFloat(item.unit_price);
                const total = parseFloat(item.line_total || (qty * price));

                doc.text(name.substring(0, 40), 14, y);
                doc.text(qty.toString(), 120, y);
                doc.text(price.toFixed(2), 140, y);
                doc.text(total.toFixed(2), 170, y);

                if (item.product_slug || item.slug) {
                    const slug = item.product_slug || item.slug;
                    const productLink = `${window.location.origin}/product/${slug}`;
                    doc.setFontSize(8);
                    doc.setTextColor(220, 38, 38);
                    doc.text('View Product', 14, y + 4);
                    doc.link(14, y + 2, 20, 4, { url: productLink });
                    doc.setFontSize(10);
                    doc.setTextColor(40);
                    y += 14;
                } else {
                    y += 10;
                }
            });

            y += 10;
            doc.line(14, y, 196, y);
            y += 10;

            const total = parseFloat(quote.total_amount);
            doc.setFont("helvetica", "bold");
            doc.text(`Total Amount: ₹${total.toFixed(2)}`, 140, y);

            doc.save(`${quote.quotation_number}.pdf`);
            toast.success('Download started')

        } catch (error) {
            console.error(error)
            toast.error('Failed to download PDF')
        }
    }


    return (
        <div className="space-y-6 pb-20">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link href="/admin/customers">
                        <Button variant="ghost" size="icon">
                            <ArrowLeft className="w-5 h-5" />
                        </Button>
                    </Link>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-3xl font-bold tracking-tight text-gray-900">
                                {customer.entity_type === 'business' ? (customer.company_name || customer.name) : customer.name}
                            </h1>
                            <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                                {customer.customer_type_name || 'General'}
                            </Badge>
                        </div>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Link href={`/admin/quotations?new=true&customer_id=${id}`}>
                        <Button variant="outline">
                            <Plus className="w-4 h-4 mr-2" />
                            New Quotation
                        </Button>
                    </Link>
                    <Button onClick={() => setIsEditing(!isEditing)} variant={isEditing ? 'outline' : 'default'} className={isEditing ? '' : 'bg-red-600 hover:bg-red-700'}>
                        {isEditing ? 'Cancel Edit' : 'Edit Profile'}
                    </Button>
                </div>
            </div>

            <div className="flex flex-col gap-6">
                {/* Top Row: Basic Info & Contacts */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Column 1: Basic Info */}
                    <Card className="h-full">
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Building2 className="w-5 h-5 text-gray-400" />
                                Business Info
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {isEditing ? (
                                <form onSubmit={handleSave} className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label>Entity Type</Label>
                                            <div className="flex gap-4 pt-2">
                                                <label className="flex items-center gap-2 cursor-pointer">
                                                    <input
                                                        type="radio"
                                                        name="entity_type"
                                                        value="individual"
                                                        defaultChecked={customer.entity_type === 'individual' || !customer.entity_type}
                                                        className="accent-red-600 w-4 h-4"
                                                        onChange={(e) => {
                                                            // Optional: visual toggle logic if needed, but form submission handles it
                                                            // For full reactivity, might need state, but this is simple edit form
                                                        }}
                                                    />
                                                    <span className="text-sm font-medium">Individual</span>
                                                </label>
                                                <label className="flex items-center gap-2 cursor-pointer">
                                                    <input
                                                        type="radio"
                                                        name="entity_type"
                                                        value="business"
                                                        defaultChecked={customer.entity_type === 'business'}
                                                        className="accent-red-600 w-4 h-4"
                                                    />
                                                    <span className="text-sm font-medium">Business</span>
                                                </label>
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="company_name">Company Name</Label>
                                            <Input id="company_name" name="company_name" defaultValue={customer.company_name} placeholder={customer.entity_type === 'individual' ? '(Optional)' : 'Required for Business'} />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="name">Display Name *</Label>
                                            <Input id="name" name="name" defaultValue={customer.name} required />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="email">Primary Email *</Label>
                                            <Input id="email" name="email" type="email" defaultValue={customer.email} required />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="phone">Phone</Label>
                                            <Input id="phone" name="phone" defaultValue={customer.phone} />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="customer_type_id">Customer Type</Label>
                                            <input type="hidden" name="customer_type_id" value={selectedCustomerTypeId} />
                                            <Select
                                                defaultValue={customer.customer_type_id?.toString()}
                                                onValueChange={setSelectedCustomerTypeId}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select type" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {customerTypes.map(type => (
                                                        <SelectItem key={type.id} value={type.id.toString()}>
                                                            {type.name}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="gst_number">GSTIN</Label>
                                            <Input id="gst_number" name="gst_number" defaultValue={customer.gst_number} />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="address">Address</Label>
                                        <Textarea id="address" name="address" defaultValue={customer.address} rows={3} />
                                    </div>
                                    <Button type="submit" className="w-full bg-red-600">Save Changes</Button>
                                </form>
                            ) : (
                                <div className="space-y-6">
                                    <div className="grid grid-cols-2 gap-6">
                                        <div className="space-y-1">
                                            <Label className="text-xs text-muted-foreground uppercase">Email</Label>
                                            <p className="text-sm font-medium flex items-center gap-2">
                                                <Mail className="w-4 h-4 text-gray-400" />
                                                {customer.email}
                                            </p>
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-xs text-muted-foreground uppercase">Phone</Label>
                                            <p className="text-sm font-medium flex items-center gap-2">
                                                <Phone className="w-4 h-4 text-gray-400" />
                                                {customer.phone || 'Not specified'}
                                            </p>
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-xs text-muted-foreground uppercase">GSTIN</Label>
                                            <p className="text-sm font-medium">
                                                {customer.gst_number || 'No GSTIN'}
                                            </p>
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-xs text-muted-foreground uppercase">Billing Address</Label>
                                            <p className="text-sm font-medium leading-relaxed flex items-start gap-2">
                                                <MapPin className="w-4 h-4 text-gray-400 mt-0.5" />
                                                {customer.address || 'No address provided'}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                                        <div className="flex items-center justify-between mb-2">
                                            <Label className="text-xs text-muted-foreground uppercase">Pricing Rule</Label>
                                            <Calculator className="w-4 h-4 text-gray-400" />
                                        </div>
                                        <p className="text-sm font-semibold text-gray-900">
                                            {customer.customer_type_name || 'General'}
                                        </p>
                                        <p className="text-xs text-gray-500 mt-1">
                                            {customer.customer_type_name
                                                ? (customer.base_price_type === 'dealer'
                                                    ? `Dealer Price + ${customer.percentage}% Markup`
                                                    : `MRP Price - ${customer.percentage}% Discount`)
                                                : 'No specific pricing rule applied.'
                                            }
                                        </p>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Column 2: Contacts */}
                    <Card className="h-full flex flex-col">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 border-b">
                            <CardTitle className="text-lg flex items-center gap-2">
                                <UserCircle2 className="w-5 h-5 text-gray-400" />
                                Contact Persons
                            </CardTitle>
                            <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={openAddContactModal}>
                                <Plus className="w-4 h-4" />
                            </Button>
                        </CardHeader>
                        <CardContent className="space-y-4 pt-6 flex-grow overflow-y-auto max-h-[400px] scrollbar-thin scrollbar-thumb-gray-200">
                            {(customer.contacts || []).length === 0 ? (
                                <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
                                    <p className="text-sm">No contacts added</p>
                                    <Button variant="link" size="sm" onClick={openAddContactModal}>Add your first contact</Button>
                                </div>
                            ) : (
                                customer.contacts.map((contact, idx) => (
                                    <div key={idx} className={`p-4 border rounded-lg space-y-3 relative group transition-colors ${contact.is_primary ? 'bg-red-50/30 border-red-100' : 'hover:border-gray-300'}`}>
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <p className="font-semibold text-sm flex items-center gap-2">
                                                    {contact.name || 'Unnamed Contact'}
                                                    {contact.is_primary && (
                                                        <Badge className="bg-red-100 text-red-700 text-[10px] h-4 hover:bg-red-100">PRIMARY</Badge>
                                                    )}
                                                </p>
                                                <p className="text-xs text-muted-foreground">{contact.designation || 'No designation'}</p>
                                            </div>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8">
                                                        <MoreVertical className="w-4 h-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    {!contact.is_primary && (
                                                        <DropdownMenuItem onClick={() => togglePrimaryContact(idx)}>
                                                            Set as Primary
                                                        </DropdownMenuItem>
                                                    )}
                                                    <DropdownMenuItem onClick={() => removeContact(idx)} className="text-red-600 focus:text-red-600">
                                                        <Trash2 className="w-4 h-4 mr-2" /> Remove Contact
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => openEditContactModal(idx, contact)}>
                                                        <Pencil className="w-3 h-3 mr-2" /> Edit Details
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4 text-xs">
                                            <div className="flex items-center gap-2 text-gray-600">
                                                <Mail className="w-3 h-3" />
                                                <span className="truncate max-w-[150px]" title={contact.email}>{contact.email || 'No email'}</span>
                                            </div>
                                            <div className="flex items-center gap-2 text-gray-600">
                                                <Phone className="w-3 h-3" />
                                                {contact.phone || 'No phone'}
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Bottom Row: Quotation History & Timeline */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Quotation History - Left 2 columns */}
                    <Card className="lg:col-span-2 border-none shadow-sm overflow-hidden">
                        <CardHeader className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b pb-4">
                            <div className="flex items-center gap-4">
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <FileText className="w-5 h-5 text-gray-400" />
                                    Quotation History
                                </CardTitle>
                                <Badge variant="outline" className="bg-gray-100">{quotationsData.total}</Badge>
                            </div>
                            <div className="flex items-center gap-3 w-full sm:w-auto">
                                <div className="relative w-full sm:w-[200px]">
                                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
                                    <Input
                                        placeholder="Search Quote # or Customer..."
                                        className="pl-9 h-9 text-xs"
                                        value={quoteSearch}
                                        onChange={(e) => {
                                            setQuoteSearch(e.target.value);
                                            setPage(1);
                                        }}
                                    />
                                </div>
                                <div className="relative w-full sm:w-[150px]">
                                    <Input
                                        type="date"
                                        className="h-9 text-xs"
                                        value={quoteDateFilter}
                                        onChange={(e) => {
                                            setQuoteDateFilter(e.target.value);
                                            setPage(1);
                                        }}
                                    />
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader className="bg-gray-50">
                                    <TableRow>
                                        <TableHead className="w-[50px] pl-6">
                                            <Checkbox
                                                checked={allSelected}
                                                onCheckedChange={handleSelectAll}
                                            />
                                        </TableHead>
                                        <TableHead>Ref No.</TableHead>
                                        <TableHead>Customer</TableHead>
                                        <TableHead>Primary Contact</TableHead>
                                        <TableHead>Date</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right pr-6">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {isLoadingQuotes ? (
                                        <TableRow>
                                            <TableCell colSpan={7} className="text-center py-8">
                                                <Loader2 className="w-6 h-6 animate-spin mx-auto text-gray-400" />
                                            </TableCell>
                                        </TableRow>
                                    ) : quotationsData.quotations.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                                                <div className="text-center py-12 text-muted-foreground">
                                                    <FileText className="w-12 h-12 mx-auto text-gray-200 mb-4" />
                                                    <p className="text-sm mb-4">No quotations generated yet</p>
                                                    <Link href={`/admin/quotations?new=true&customer_id=${id}`}>
                                                        <Button variant="outline" size="sm">Create First Quote</Button>
                                                    </Link>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        quotationsData.quotations.map((quote) => (
                                            <TableRow key={quote.id} className="hover:bg-gray-50/50">
                                                <TableCell className="pl-6">
                                                    <Checkbox
                                                        checked={selectedIds.has(quote.id)}
                                                        onCheckedChange={(checked) => handleSelectOne(quote.id, checked)}
                                                    />
                                                </TableCell>
                                                <TableCell className="font-medium">{quote.reference_number || quote.quotation_number}</TableCell>
                                                <TableCell>
                                                    <div className="font-medium text-gray-900">{quote.company_name || quote.customer_name || 'Walking Customer'}</div>
                                                    <div className="text-xs text-gray-500">{quote.customer_snapshot?.email || quote.customer_email}</div>
                                                </TableCell>
                                                <TableCell className="max-w-[200px]">
                                                    <div className="truncate">
                                                        <div className="font-medium text-sm flex items-center gap-1">
                                                            {getPrimaryContact(quote).name}
                                                            {getPrimaryContact(quote).designation && <span className="text-xs text-gray-400">({getPrimaryContact(quote).designation})</span>}
                                                        </div>
                                                        <div className="text-xs text-gray-500">{getPrimaryContact(quote).phone}</div>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-gray-500">{format(new Date(quote.created_at), 'dd MMM yyyy')}</TableCell>
                                                <TableCell>
                                                    <Badge
                                                        variant="outline"
                                                        className={
                                                            quote.status === 'Sent' ? "bg-green-50 text-green-700 border-green-200" :
                                                                quote.status === 'Draft' ? "bg-gray-100 text-gray-700 border-gray-200" :
                                                                    "bg-blue-50 text-blue-700 border-blue-200"
                                                        }
                                                    >
                                                        {quote.status}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-right pr-6">
                                                    <div className="flex justify-end items-center gap-2">
                                                        <Button
                                                            size="icon"
                                                            variant="ghost"
                                                            className="h-8 w-8 text-gray-500 hover:bg-gray-100"
                                                            onClick={() => handleView(quote.id)}
                                                            title="View Quotation"
                                                        >
                                                            <Eye className="w-4 h-4" />
                                                        </Button>
                                                        {quote.status === 'Draft' && (
                                                            <Link href={`/admin/quotations?new=true&id=${quote.id}`}>
                                                                <Button size="icon" variant="ghost" className="h-8 w-8 text-amber-600 hover:bg-amber-50" title="Edit Quote">
                                                                    <PenLine className="w-4 h-4" />
                                                                </Button>
                                                            </Link>
                                                        )}
                                                        <Button
                                                            size="icon"
                                                            variant="ghost"
                                                            className="h-8 w-8 text-gray-500 hover:bg-gray-100"
                                                            onClick={() => handleDownload(quote.id)}
                                                            title="Download PDF"
                                                        >
                                                            <Download className="w-4 h-4" />
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>

                            {/* Enhanced Pagination */}
                            <PaginationControls
                                currentPage={page}
                                totalPages={quotationsData.totalPages}
                                onPageChange={setPage}
                                itemsPerPage={pageSize}
                                onItemsPerPageChange={setPageSize}
                                totalItems={quotationsData.total}
                            />
                        </CardContent>
                    </Card>

                    {/* Event Timeline - Right column */}
                    <Card className="h-full flex flex-col shadow-sm">
                        <CardHeader className="border-b bg-gray-50/30">
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Clock className="w-5 h-5 text-amber-600" /> Event Timeline
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-6 flex-grow overflow-y-auto max-h-[500px] scrollbar-thin">
                            {isLoadingTimeline ? (
                                <div className="flex justify-center py-8">
                                    <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                                </div>
                            ) : timeline.length === 0 ? (
                                <div className="text-center py-8 text-muted-foreground">
                                    <Clock className="w-12 h-12 mx-auto text-gray-200 mb-4" />
                                    <p className="text-sm">No activity yet</p>
                                </div>
                            ) : (
                                <div className="space-y-4 relative before:absolute before:inset-0 before:left-2 before:w-0.5 before:bg-gray-100 before:h-full">
                                    {timeline.map((event) => (
                                        <div key={event.id} className="relative pl-8 pb-1">
                                            <div className={`absolute left-[0px] top-1 w-5 h-5 rounded-full border-2 bg-white z-10 flex items-center justify-center
                                                ${event.event_type.includes('quotation') ? 'border-orange-500 text-orange-500 bg-orange-50' :
                                                    event.event_type === 'email_sent' ? 'border-blue-500 text-blue-500 bg-blue-50' :
                                                        event.event_type === 'profile_update' ? 'border-indigo-500 text-indigo-500 bg-indigo-50' :
                                                            'border-gray-300'}`}
                                            >
                                                {event.event_type.includes('quotation') ? <FileText className="w-2.5 h-2.5" /> :
                                                    event.event_type === 'email_sent' ? <Mail className="w-2.5 h-2.5" /> :
                                                        <Clock className="w-2.5 h-2.5" />}
                                            </div>
                                            <div className="flex flex-col">
                                                <div className="flex items-center justify-between gap-4">
                                                    <span className="text-xs font-bold text-gray-900 capitalize">{event.event_type.replace(/_/g, ' ')}</span>
                                                    <span className="text-[10px] text-muted-foreground">{format(new Date(event.created_at), 'MMM d, h:mm a')}</span>
                                                </div>
                                                <p className="text-sm mt-1 text-gray-600 leading-snug">{event.description}</p>
                                                {event.admin_name && (
                                                    <span className="text-[10px] text-gray-500 mt-1 font-medium bg-gray-100 px-2 py-0.5 rounded-full w-fit">
                                                        by {event.admin_name}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
            {/* Contact Edit Modal */}
            <Dialog open={contactModalOpen} onOpenChange={setContactModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editingContactIndex !== null ? 'Edit Contact' : 'Add New Contact'}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Name</Label>
                            <Input value={editingContact.name} onChange={(e) => setEditingContact({ ...editingContact, name: e.target.value })} />
                        </div>
                        <div className="space-y-2">
                            <Label>Email</Label>
                            <Input value={editingContact.email} onChange={(e) => setEditingContact({ ...editingContact, email: e.target.value })} />
                        </div>
                        <div className="space-y-2">
                            <Label>Phone</Label>
                            <Input value={editingContact.phone} onChange={(e) => setEditingContact({ ...editingContact, phone: e.target.value })} />
                        </div>
                        <div className="space-y-2">
                            <Label>Designation</Label>
                            <Input value={editingContact.designation} onChange={(e) => setEditingContact({ ...editingContact, designation: e.target.value })} />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setContactModalOpen(false)}>Cancel</Button>
                        <Button onClick={saveContact} disabled={!editingContact.name}>Save Contact</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Quotation Preview Modal */}
            {selectedQuoteForPreview && (
                <QuotationPreviewModal
                    open={previewOpen}
                    onOpenChange={setPreviewOpen}
                    quotation={selectedQuoteForPreview}
                    onDownload={() => handleDownload(selectedQuoteForPreview.id)}
                />
            )}
        </div >
    );
}
