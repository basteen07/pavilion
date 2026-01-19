'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
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
    MoreVertical, ExternalLink, Calculator, Pencil
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { apiCall } from '@/lib/api-client';
import { toast } from 'sonner';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { format } from 'date-fns';
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem,
    DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';

export default function CustomerDetailPage({ params }) {
    const id = params.id;
    const router = useRouter();
    const queryClient = useQueryClient();
    const [isEditing, setIsEditing] = useState(false);
    const [contactModalOpen, setContactModalOpen] = useState(false);
    const [editingContactIndex, setEditingContactIndex] = useState(null);
    const [editingContact, setEditingContact] = useState({ name: '', email: '', phone: '', designation: '' });
    const [selectedCustomerTypeId, setSelectedCustomerTypeId] = useState('');

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

    const { data: quotationsData = { quotations: [] }, isLoading: isLoadingQuotes } = useQuery({
        queryKey: ['quotations', 'customer', id],
        queryFn: () => apiCall(`/quotations?customer_id=${id}`),
    });

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

    if (isLoadingCustomer) return <div className="p-8 text-center">Loading customer...</div>;
    if (!customer) return <div className="p-8 text-center text-red-500">Customer not found</div>;

    const handleSave = (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData.entries());
        data.contacts = customer.contacts; // Maintain existing contacts for now if not editing them in the main form
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

    const updateContactField = (index, field, value) => {
        const newContacts = [...customer.contacts];
        newContacts[index][field] = value;
        // This is a local update, maybe we should have a Save button for contacts too
        // but for now let's just update mutation
        updateMutation.mutate({ ...customer, contacts: newContacts });
    };

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
                                {customer.company_name || customer.name}
                            </h1>
                            <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                                {customer.customer_type_name || 'General'}
                            </Badge>
                        </div>
                        <p className="text-muted-foreground mt-1 text-sm flex items-center gap-2">
                            Customer ID: <code className="bg-gray-100 px-1 rounded">{id.slice(0, 8)}...</code>
                        </p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Link href={`/admin/inventory/quotations/new?customer_id=${id}`}>
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

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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
                                <div className="space-y-2">
                                    <Label htmlFor="company_name">Company Name</Label>
                                    <Input id="company_name" name="company_name" defaultValue={customer.company_name} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="name">Display Name *</Label>
                                    <Input id="name" name="name" defaultValue={customer.name} required />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="email">Primary Email *</Label>
                                    <Input id="email" name="email" type="email" defaultValue={customer.email} required />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="phone">Phone</Label>
                                    <Input id="phone" name="phone" defaultValue={customer.phone} />
                                </div>
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
                                                    {type.name} ({type.base_price_type === 'dealer' ? '+' : '-'}{type.percentage}%)
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="gst_number">GSTIN</Label>
                                    <Input id="gst_number" name="gst_number" defaultValue={customer.gst_number} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="address">Address</Label>
                                    <Textarea id="address" name="address" defaultValue={customer.address} rows={3} />
                                </div>
                                <Button type="submit" className="w-full bg-red-600">Save Changes</Button>
                            </form>
                        ) : (
                            <div className="space-y-6">
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
                <Card className="h-full">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0">
                        <CardTitle className="text-lg flex items-center gap-2">
                            <UserCircle2 className="w-5 h-5 text-gray-400" />
                            Contact Persons
                        </CardTitle>
                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={openAddContactModal}>
                            <Plus className="w-4 h-4" />
                        </Button>
                    </CardHeader>
                    <CardContent className="space-y-4">
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
                                    <div className="grid grid-cols-1 gap-1 text-xs">
                                        <div className="flex items-center gap-2 text-gray-600">
                                            <Mail className="w-3 h-3" />
                                            {contact.email || 'No email'}
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

                {/* Column 3: Quotation History */}
                <Card className="h-full">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0">
                        <CardTitle className="text-lg flex items-center gap-2">
                            <FileText className="w-5 h-5 text-gray-400" />
                            Quotation History
                        </CardTitle>
                        <Badge variant="outline">{quotationsData.quotations.length}</Badge>
                    </CardHeader>
                    <CardContent>
                        {isLoadingQuotes ? (
                            <div className="text-center py-8 text-muted-foreground">Loading...</div>
                        ) : quotationsData.quotations.length === 0 ? (
                            <div className="text-center py-12 text-muted-foreground">
                                <FileText className="w-12 h-12 mx-auto text-gray-200 mb-4" />
                                <p className="text-sm">No quotations generated yet</p>
                                <Link href={`/admin/inventory/quotations/new?customer_id=${id}`}>
                                    <Button variant="outline" size="sm" className="mt-4">Create First Quote</Button>
                                </Link>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {quotationsData.quotations.map((quote) => (
                                    <div key={quote.id} className="p-4 border rounded-lg hover:border-gray-400 transition-all group">
                                        <div className="flex justify-between items-start mb-2">
                                            <div>
                                                <p className="font-mono text-xs text-red-600 font-bold">{quote.quotation_number}</p>
                                                <p className="text-[10px] text-muted-foreground">{format(new Date(quote.created_at), 'PPP')}</p>
                                            </div>
                                            <Badge variant={quote.status === 'Sent' ? 'success' : 'secondary'} className="text-[10px] uppercase">
                                                {quote.status}
                                            </Badge>
                                        </div>
                                        <div className="flex items-center justify-between mt-4">
                                            <p className="text-sm font-bold">₹{parseFloat(quote.total_amount).toLocaleString()}</p>
                                            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                {quote.status === 'Draft' && (
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        className="h-8 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                                        onClick={() => sendQuoteMutation.mutate(quote.id)}
                                                    >
                                                        <Send className="w-3 h-3 mr-1" /> Send
                                                    </Button>
                                                )}
                                                <Link href={`/admin/inventory/quotations/${quote.id}`}>
                                                    <Button size="sm" variant="ghost" className="h-8 text-xs">
                                                        <ExternalLink className="w-3 h-3 mr-1" /> View
                                                    </Button>
                                                </Link>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
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
        </div >
    );
}
