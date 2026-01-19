'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Edit2, Trash2, ArrowLeft } from 'lucide-react';
import { apiCall } from '@/lib/api-client';
import { toast } from 'sonner';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import Link from 'next/link';

export default function CustomerTypesPage() {
    const queryClient = useQueryClient();
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingType, setEditingType] = useState(null);
    const [formData, setFormData] = useState({ name: '', base_price_type: 'mrp', percentage: 0 });

    const { data: customerTypes = [], isLoading } = useQuery({
        queryKey: ['customer-types'],
        queryFn: () => apiCall('/customer-types'),
    });

    const createMutation = useMutation({
        mutationFn: (data) => apiCall('/customer-types', { method: 'POST', body: JSON.stringify(data) }),
        onSuccess: () => {
            queryClient.invalidateQueries(['customer-types']);
            toast.success('Customer type created successfully');
            closeDialog();
        },
        onError: (err) => toast.error(err.message)
    });

    const updateMutation = useMutation({
        mutationFn: (data) => apiCall(`/customer-types/${editingType.id}`, { method: 'PUT', body: JSON.stringify(data) }),
        onSuccess: () => {
            queryClient.invalidateQueries(['customer-types']);
            toast.success('Customer type updated successfully');
            closeDialog();
        },
        onError: (err) => toast.error(err.message)
    });

    const deleteMutation = useMutation({
        mutationFn: (id) => apiCall(`/customer-types/${id}`, { method: 'DELETE' }),
        onSuccess: () => {
            queryClient.invalidateQueries(['customer-types']);
            toast.success('Customer type deleted successfully');
        },
        onError: (err) => toast.error(err.message)
    });

    function openCreate() {
        setEditingType(null);
        setFormData({ name: '', base_price_type: 'mrp', percentage: 0 });
        setIsDialogOpen(true);
    }

    function openEdit(type) {
        setEditingType(type);
        setFormData({ name: type.name, base_price_type: type.base_price_type, percentage: type.percentage });
        setIsDialogOpen(true);
    }

    function closeDialog() {
        setIsDialogOpen(false);
        setEditingType(null);
    }

    function handleSubmit(e) {
        e.preventDefault();
        if (editingType) {
            updateMutation.mutate(formData);
        } else {
            createMutation.mutate(formData);
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link href="/admin/settings">
                        <Button variant="ghost" size="icon">
                            <ArrowLeft className="w-5 h-5" />
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Customer Types</h1>
                        <p className="text-muted-foreground mt-1">Manage pricing rules for different customer categories.</p>
                    </div>
                </div>
                <Button onClick={openCreate} className="bg-red-600 hover:bg-red-700">
                    <Plus className="w-4 h-4 mr-2" />
                    Add New Type
                </Button>
            </div>

            <Card>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Type Name</TableHead>
                            <TableHead>Base Price Root</TableHead>
                            <TableHead>Percentage Adjustment</TableHead>
                            <TableHead>Logic</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Loading...</TableCell>
                            </TableRow>
                        ) : customerTypes.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No customer types found</TableCell>
                            </TableRow>
                        ) : (
                            customerTypes.map((type) => (
                                <TableRow key={type.id}>
                                    <TableCell className="font-medium">{type.name}</TableCell>
                                    <TableCell className="capitalize">{type.base_price_type} Price</TableCell>
                                    <TableCell>{type.percentage}%</TableCell>
                                    <TableCell className="text-sm text-gray-600">
                                        {type.base_price_type === 'dealer'
                                            ? `Dealer Price + ${type.percentage}% (Markup)`
                                            : `MRP Price - ${type.percentage}% (Discount)`
                                        }
                                    </TableCell>
                                    <TableCell className="text-right space-x-2">
                                        <Button size="sm" variant="ghost" onClick={() => openEdit(type)}>
                                            <Edit2 className="w-4 h-4" />
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            className="text-red-500 hover:text-red-700"
                                            onClick={() => {
                                                if (confirm('Are you sure you want to delete this type?')) {
                                                    deleteMutation.mutate(type.id);
                                                }
                                            }}
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </Card>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editingType ? 'Edit Customer Type' : 'Add New Customer Type'}</DialogTitle>
                        <DialogDescription>
                            Define how pricing is calculated for this group of customers.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">Type Name</Label>
                            <Input
                                id="name"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                placeholder="e.g. Wholesaler, Retailer, Premium"
                                required
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="base_price">Base Price Reference</Label>
                                <Select
                                    value={formData.base_price_type}
                                    onValueChange={(val) => setFormData({ ...formData, base_price_type: val })}
                                >
                                    <SelectTrigger id="base_price">
                                        <SelectValue placeholder="Select base price" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="dealer">Dealer Price</SelectItem>
                                        <SelectItem value="mrp">MRP Price</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="percentage">Percentage (%)</Label>
                                <Input
                                    id="percentage"
                                    type="number"
                                    value={formData.percentage}
                                    onChange={(e) => setFormData({ ...formData, percentage: parseFloat(e.target.value) })}
                                    required
                                />
                            </div>
                        </div>
                        <div className="bg-blue-50 p-4 rounded-md text-sm text-blue-700 border border-blue-100">
                            <strong>Calculation Formula:</strong><br />
                            {formData.base_price_type === 'dealer'
                                ? `The product price will be Dealer Price plus ${formData.percentage || 0}% markup.`
                                : `The product price will be MRP minus ${formData.percentage || 0}% discount.`
                            }
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={closeDialog}>Cancel</Button>
                            <Button type="submit" className="bg-red-600 hover:bg-red-700" disabled={createMutation.isPending || updateMutation.isPending}>
                                {createMutation.isPending || updateMutation.isPending ? 'Saving...' : 'Save Type'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
