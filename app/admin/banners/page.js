"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Image as ImageIcon, ExternalLink } from "lucide-react";
import ImageUploader from "@/components/admin/ImageUploader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";

export default function BannersPage() {
    const [banners, setBanners] = useState([]);
    const [loading, setLoading] = useState(true);
    const [open, setOpen] = useState(false);
    const [editingBanner, setEditingBanner] = useState(null);

    useEffect(() => {
        fetchBanners();
    }, []);

    async function fetchBanners() {
        try {
            const res = await fetch("/api/banners");
            const data = await res.json();
            setBanners(data);
        } catch (error) {
            toast.error("Failed to fetch banners");
        } finally {
            setLoading(false);
        }
    }

    async function handleDelete(id) {
        if (!confirm("Are you sure you want to delete this banner?")) return;
        try {
            await fetch(`/api/banners/${id}`, { method: "DELETE" });
            toast.success("Banner deleted");
            fetchBanners();
        } catch (error) {
            toast.error("Failed to delete banner");
        }
    }

    const handleEdit = (banner) => {
        setEditingBanner(banner);
        setOpen(true);
    };

    const handleAddNew = () => {
        setEditingBanner(null);
        setOpen(true);
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-gray-900">Banner Management</h1>
                    <p className="text-muted-foreground mt-1">Manage homepage hero sliders and promotional images.</p>
                </div>
                <Button onClick={handleAddNew} className="bg-red-600 hover:bg-red-700 shadow-sm">
                    <Plus className="mr-2 h-4 w-4" /> Add New Banner
                </Button>
            </div>

            <Card>
                <CardHeader className="py-4 px-6 border-b bg-gray-50/50">
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-sm font-medium uppercase tracking-wider text-gray-500">Active Banners</CardTitle>
                        <span className="text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded-full">{banners.length} Items</span>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader className="bg-gray-50/50">
                                <TableRow>
                                    <TableHead className="w-[80px] hidden md:table-cell text-center">Order</TableHead>
                                    <TableHead className="w-[120px]">Preview</TableHead>
                                    <TableHead>Details</TableHead>
                                    <TableHead className="hidden md:table-cell w-[100px]">Status</TableHead>
                                    <TableHead className="text-right w-[100px]">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {banners.map((banner) => (
                                    <TableRow key={banner.id} className="group hover:bg-gray-50/50 transition-colors">
                                        <TableCell className="hidden md:table-cell text-center font-medium text-gray-500">
                                            {banner.display_order}
                                        </TableCell>
                                        <TableCell>
                                            <div className="h-14 w-24 relative rounded-md overflow-hidden bg-gray-100 border shadow-sm group-hover:shadow-md transition-all">
                                                <img src={banner.desktop_image_url} alt={banner.title} className="w-full h-full object-cover" />
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-col">
                                                <span className="font-semibold text-gray-900">{banner.title}</span>
                                                {banner.link && (
                                                    <span className="text-xs text-blue-600 flex items-center gap-1 mt-0.5">
                                                        <ExternalLink className="w-3 h-3" /> {banner.link}
                                                    </span>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell className="hidden md:table-cell">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${banner.is_active ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                                                }`}>
                                                {banner.is_active ? "Active" : "Inactive"}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => handleEdit(banner)}>
                                                    <Pencil className="h-4 w-4 text-gray-600" />
                                                </Button>
                                                <Button variant="outline" size="icon" className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => handleDelete(banner.id)}>
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {banners.length === 0 && !loading && (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center h-32 text-muted-foreground">
                                            <div className="flex flex-col items-center justify-center gap-2">
                                                <ImageIcon className="w-8 h-8 opacity-20" />
                                                <p>No banners found. Create one to get started.</p>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            <BannerDialog
                open={open}
                onOpenChange={setOpen}
                banner={editingBanner}
                onSuccess={() => { setOpen(false); fetchBanners(); }}
            />
        </div>
    );
}

function BannerDialog({ open, onOpenChange, banner, onSuccess }) {
    const isEditing = !!banner;
    const [formData, setFormData] = useState({
        title: '',
        desktop_image_url: '',
        mobile_image_url: '',
        link: '',
        display_order: 0,
        is_active: true
    })

    useEffect(() => {
        if (banner) {
            setFormData({
                title: banner.title,
                desktop_image_url: banner.desktop_image_url,
                mobile_image_url: banner.mobile_image_url,
                link: banner.link || '',
                display_order: banner.display_order,
                is_active: banner.is_active
            })
        } else {
            setFormData({
                title: '',
                desktop_image_url: '',
                mobile_image_url: '',
                link: '',
                display_order: 0,
                is_active: true
            })
        }
    }, [banner])

    async function onSubmit(e) {
        e.preventDefault();
        try {
            const url = isEditing ? `/api/banners/${banner.id}` : "/api/banners";
            const method = isEditing ? "PUT" : "POST";

            const res = await fetch(url, {
                method,
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(formData),
            });

            if (!res.ok) throw new Error("Failed to save");

            toast.success(isEditing ? "Banner updated" : "Banner created");
            onSuccess();
        } catch (error) {
            toast.error("Error saving banner");
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{isEditing ? "Edit Banner" : "Add Banner"}</DialogTitle>
                </DialogHeader>
                <form onSubmit={onSubmit} className="space-y-6 py-4">
                    <div className="space-y-2">
                        <Label>Banner Title</Label>
                        <Input
                            value={formData.title}
                            onChange={e => setFormData({ ...formData, title: e.target.value })}
                            placeholder="e.g., Summer Sale 2024"
                            required
                        />
                    </div>

                    <ImageUploader
                        label="Desktop Image (Landscape)"
                        folder="banners"
                        value={formData.desktop_image_url}
                        onChange={val => setFormData({ ...formData, desktop_image_url: val })}
                    />

                    <ImageUploader
                        label="Mobile Image (Portrait - Optional)"
                        folder="banners"
                        value={formData.mobile_image_url}
                        onChange={val => setFormData({ ...formData, mobile_image_url: val })}
                    />

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Link URL</Label>
                            <Input
                                value={formData.link}
                                onChange={e => setFormData({ ...formData, link: e.target.value })}
                                placeholder="/collections/summer-sale"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Display Order</Label>
                            <Input
                                type="number"
                                value={formData.display_order}
                                onChange={e => setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })}
                            />
                        </div>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border">
                        <div className="space-y-0.5">
                            <Label className="text-base">Active Status</Label>
                            <p className="text-xs text-muted-foreground">Visible on the homepage</p>
                        </div>
                        <Switch
                            checked={formData.is_active}
                            onCheckedChange={val => setFormData({ ...formData, is_active: val })}
                        />
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                        <Button type="submit" className="bg-red-600 hover:bg-red-700">Save Banner</Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
