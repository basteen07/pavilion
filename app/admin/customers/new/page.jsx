'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Save, Plus, Trash2, UserPlus } from 'lucide-react';
import { apiCall } from '@/lib/api-client';
import { toast } from 'sonner';
import { useQuery, useMutation } from '@tanstack/react-query';
import Link from 'next/link';

export default function NewCustomerPage() {
    const router = useRouter();
    const [contacts, setContacts] = useState([
        { name: '', email: '', phone: '', designation: '', is_primary: true }
    ]);
    const [entityType, setEntityType] = useState('individual');

    const { data: customerTypes = [] } = useQuery({
        queryKey: ['customer-types'],
        queryFn: () => apiCall('/customer-types'),
    });

    const createMutation = useMutation({
        mutationFn: (data) => apiCall('/customers', { method: 'POST', body: JSON.stringify(data) }),
        onSuccess: (data) => {
            toast.success('Customer created successfully');
            router.push(`/admin/customers/${data.id}`);
        },
        onError: (err) => toast.error(err.message)
    });

    const addContact = () => {
        setContacts([...contacts, { name: '', email: '', phone: '', designation: '', is_primary: false }]);
    };

    const removeContact = (index) => {
        if (contacts.length === 1) return;
        const newContacts = contacts.filter((_, i) => i !== index);
        // If we removed the primary, set the first one as primary
        if (contacts[index].is_primary) {
            newContacts[0].is_primary = true;
        }
        setContacts(newContacts);
    };

    const updateContact = (index, field, value) => {
        const newContacts = [...contacts];
        if (field === 'is_primary') {
            newContacts.forEach((c, i) => c.is_primary = i === index);
        } else {
            newContacts[index][field] = value;
        }
        setContacts(newContacts);
    };

    function onSubmit(e) {
        e.preventDefault();
        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData.entries());
        data.entity_type = entityType;
        data.contacts = contacts;
        createMutation.mutate(data);
    }

    return (
        <div className="max-w-5xl mx-auto space-y-6 pb-20">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link href="/admin/customers">
                        <Button variant="ghost" size="icon">
                            <ArrowLeft className="w-5 h-5" />
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Add New Customer</h1>
                        <p className="text-muted-foreground mt-1">Create a new customer profile and set their pricing type.</p>
                    </div>
                </div>
            </div>

            <form onSubmit={onSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Column 1: Basic Info */}
                    <div className="md:col-span-2 space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg">Company / Basic Info</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <Label>Entity Type</Label>
                                        <div className="flex gap-4">
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <input
                                                    type="radio"
                                                    name="entity_type"
                                                    value="individual"
                                                    checked={entityType === 'individual'}
                                                    onChange={() => setEntityType('individual')}
                                                    className="accent-red-600 w-4 h-4"
                                                />
                                                <span className="text-sm font-medium">Individual</span>
                                            </label>
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <input
                                                    type="radio"
                                                    name="entity_type"
                                                    value="business"
                                                    checked={entityType === 'business'}
                                                    onChange={() => setEntityType('business')}
                                                    className="accent-red-600 w-4 h-4"
                                                />
                                                <span className="text-sm font-medium">Business</span>
                                            </label>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        {entityType === 'business' && (
                                            <div className="space-y-2">
                                                <Label htmlFor="company_name">Company Name *</Label>
                                                <Input id="company_name" name="company_name" required placeholder="e.g. Pavilion Sports Pvt Ltd" />
                                            </div>
                                        )}
                                        <div className="space-y-2">
                                            <Label htmlFor="gst_number">GST Number</Label>
                                            <Input id="gst_number" name="gst_number" placeholder="22AAAAA0000A1Z5" />
                                        </div>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="name">Full Name (Individual) *</Label>
                                        <Input id="name" name="name" required placeholder="Full Name" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="customer_type_id">Customer Type *</Label>
                                        <Select name="customer_type_id" required>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select Customer Type" />
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
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="email">Email *</Label>
                                        <Input id="email" name="email" type="email" required placeholder="customer@example.com" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="phone">Phone</Label>
                                        <Input id="phone" name="phone" placeholder="+91 00000 00000" />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="address">Address</Label>
                                    <Textarea id="address" name="address" placeholder="Full Billing Address" />
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <CardTitle className="text-lg">Contact Persons</CardTitle>
                                <Button type="button" variant="outline" size="sm" onClick={addContact}>
                                    <Plus className="w-4 h-4 mr-1" /> Add Contact
                                </Button>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {contacts.map((contact, index) => (
                                    <div key={index} className="p-4 border rounded-lg space-y-4 relative group">
                                        <div className="flex justify-between items-start">
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="radio"
                                                    checked={contact.is_primary}
                                                    onChange={() => updateContact(index, 'is_primary', true)}
                                                    className="w-4 h-4 text-red-600 focus:ring-red-500"
                                                />
                                                <Label className="text-sm font-medium">Primary Contact</Label>
                                            </div>
                                            {contacts.length > 1 && (
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    className="text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                                    onClick={() => removeContact(index)}
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            )}
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label className="text-xs">Name</Label>
                                                <Input
                                                    value={contact.name}
                                                    onChange={(e) => updateContact(index, 'name', e.target.value)}
                                                    placeholder="Contact Name"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-xs">Designation</Label>
                                                <Input
                                                    value={contact.designation}
                                                    onChange={(e) => updateContact(index, 'designation', e.target.value)}
                                                    placeholder="e.g. Purchase Manager"
                                                />
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label className="text-xs">Email</Label>
                                                <Input
                                                    type="email"
                                                    value={contact.email}
                                                    onChange={(e) => updateContact(index, 'email', e.target.value)}
                                                    placeholder="email@example.com"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-xs">Phone</Label>
                                                <Input
                                                    value={contact.phone}
                                                    onChange={(e) => updateContact(index, 'phone', e.target.value)}
                                                    placeholder="+91..."
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </CardContent>
                        </Card>
                    </div>

                    {/* Right Column: Actions / summary */}
                    <div className="space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg">Actions</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <Button type="submit" className="w-full bg-red-600 hover:bg-red-700" disabled={createMutation.isPending}>
                                    <Save className="w-4 h-4 mr-2" />
                                    {createMutation.isPending ? 'Creating...' : 'Save Customer'}
                                </Button>
                                <Button type="button" variant="outline" className="w-full" onClick={() => router.back()}>
                                    Cancel
                                </Button>
                            </CardContent>
                        </Card>

                        <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg">
                            <h4 className="text-sm font-semibold text-amber-800 flex items-center gap-2">
                                <UserPlus className="w-4 h-4" /> Tip
                            </h4>
                            <p className="text-xs text-amber-700 mt-1">
                                After saving, you will be redirected to the customer's detailed profile where you can see their quotation history.
                            </p>
                        </div>
                    </div>
                </div>
            </form>
        </div>
    );
}
