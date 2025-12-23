"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, ArrowLeft, Search, LayoutList, Globe, Eye, Copy, MoreHorizontal, CheckCircle2 } from "lucide-react";
import RichEditor from "@/components/admin/RichEditor";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

export default function CMSPages() {
    const [pages, setPages] = useState([]);
    const [view, setView] = useState("list");
    const [editingPage, setEditingPage] = useState(null);

    useEffect(() => {
        fetchPages();
    }, []);

    async function fetchPages() {
        try {
            const res = await fetch("/api/cms-pages");
            const data = await res.json();
            setPages(Array.isArray(data) ? data : []);
        } catch (error) {
            toast.error("Failed to fetch pages");
            setPages([]);
        }
    }

    async function handleDelete(id) {
        if (!confirm("Are you sure?")) return;
        try {
            await fetch(`/api/cms-pages/${id}`, { method: "DELETE" });
            toast.success("Page deleted");
            fetchPages();
        } catch (error) {
            toast.error("Failed to delete page");
        }
    }

    return (
        <div className="min-h-full">
            {view === "list" ? (
                <div className="space-y-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight text-gray-900">CMS Page Management</h1>
                            <p className="text-muted-foreground mt-1">Manage static pages like About Us, Privacy Policy, etc.</p>
                        </div>
                        <Button onClick={() => { setEditingPage(null); setView("editor"); }} className="bg-red-600 hover:bg-red-700 shadow-sm">
                            <Plus className="mr-2 h-4 w-4" /> New CMS Page
                        </Button>
                    </div>

                    <Card>
                        <CardHeader className="py-4 px-6 border-b bg-gray-50/50">
                            <div className="flex items-center justify-between">
                                <div className="relative w-64">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    <Input placeholder="Search pages..." className="pl-9 h-9" />
                                </div>
                                <span className="text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded-full">{pages.length} Pages</span>
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader className="bg-gray-50/50">
                                    <TableRow>
                                        <TableHead>Title</TableHead>
                                        <TableHead className="hidden md:table-cell">Slug</TableHead>
                                        <TableHead className="hidden md:table-cell">Last Updated</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {pages.map((page) => (
                                        <TableRow key={page.id} className="group hover:bg-gray-50/50">
                                            <TableCell className="font-medium">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                                                        <LayoutList className="w-4 h-4" />
                                                    </div>
                                                    <span>{page.title}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="hidden md:table-cell text-muted-foreground">/{page.slug}</TableCell>
                                            <TableCell className="hidden md:table-cell text-sm">{new Date(page.updated_at || page.created_at).toLocaleDateString()}</TableCell>
                                            <TableCell>
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${page.is_active ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}`}>
                                                    {page.is_active ? "Active" : "Inactive"}
                                                </span>
                                            </TableCell>
                                            <TableCell className="text-right space-x-2">
                                                <Button variant="ghost" size="sm" onClick={() => { setEditingPage(page); setView("editor"); }}>
                                                    <Pencil className="h-4 w-4 text-gray-500" />
                                                </Button>
                                                <Button variant="ghost" size="sm" onClick={() => handleDelete(page.id)} className="text-red-500 hover:text-red-700 hover:bg-red-50">
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {pages.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={5} className="text-center h-32 text-muted-foreground">
                                                No pages found.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </div>
            ) : (
                <CMSPageEditor
                    page={editingPage}
                    onCancel={() => { setView("list"); fetchPages(); }}
                    onSave={() => { setView("list"); fetchPages(); }}
                />
            )}
        </div>
    );
}

function CMSPageEditor({ page, onCancel, onSave }) {
    const [formData, setFormData] = useState({
        title: page?.title || "",
        slug: page?.slug || "",
        content: page?.content || "",
        meta_title: page?.meta_title || "",
        meta_description: page?.meta_description || "",
        is_active: page?.is_active ?? true,
        template: page?.template || "default",
    });

    const [seoHover, setSeoHover] = useState(false);

    function handlePreview() {
        localStorage.setItem('previewData', JSON.stringify({
            type: 'cms-page',
            data: formData
        }));
        window.open('/admin/preview', '_blank');
    }

    async function handleSubmit(e) {
        e.preventDefault();
        try {
            const url = page ? `/api/cms-pages/${page.id}` : "/api/cms-pages";
            const method = page ? "PUT" : "POST";

            const res = await fetch(url, {
                method,
                body: JSON.stringify(formData),
            });

            if (!res.ok) throw new Error("Failed to save");

            toast.success(page ? "Updated successfully" : "Created successfully");
            onSave();
        } catch (error) {
            toast.error("Error saving page");
        }
    }

    return (
        <div className="max-w-6xl mx-auto space-y-6 pb-20">
            <div className="flex items-center justify-between sticky top-16 z-30 bg-gray-50/95 backdrop-blur py-4 border-b -mx-8 px-8 mb-6">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="sm" onClick={onCancel} className="text-gray-500 hover:text-gray-900">
                        <ArrowLeft className="h-4 w-4 mr-2" />
                    </Button>
                    <div>
                        <h1 className="text-xl font-bold flex items-center gap-2">
                            {formData.title || "Untitled Page"}
                        </h1>
                        <p className="text-xs text-gray-500">{page ? "Editing existing page" : "Creating new page"}</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={handlePreview} size="sm">
                        <Eye className="w-4 h-4 mr-2" /> Preview
                    </Button>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm">
                                More actions <MoreHorizontal className="w-4 h-4 ml-2" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => toast.info("Duplicate functionality coming soon")}>
                                <Copy className="w-4 h-4 mr-2" /> Duplicate
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                    <Button onClick={handleSubmit} className="bg-red-600 hover:bg-red-700" size="sm">Save</Button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Content Column */}
                <div className="lg:col-span-2 space-y-6">
                    <Card>
                        <CardContent className="p-6 space-y-6">
                            <div className="space-y-2">
                                <Label>Title</Label>
                                <Input
                                    value={formData.title}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value, slug: !page ? e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '') : formData.slug })}
                                    required
                                    className="text-lg font-medium"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Content</Label>
                                <RichEditor
                                    value={formData.content}
                                    onChange={(val) => setFormData({ ...formData, content: val })}
                                    className="h-[500px]"
                                />
                            </div>
                        </CardContent>
                    </Card>

                    {/* SEO Section */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-sm font-medium">Search engine listing</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="p-4 bg-gray-50 rounded-lg border-2 border-transparent hover:border-gray-200 transition-colors cursor-pointer" onMouseEnter={() => setSeoHover(true)} onMouseLeave={() => setSeoHover(false)}>
                                <div className="space-y-1">
                                    <h4 className="text-lg text-blue-700 hover:underline font-medium truncate">
                                        {formData.meta_title || formData.title || "Page Title"}
                                    </h4>
                                    <div className="text-sm text-green-700 flex items-center gap-1">
                                        https://example.com/pages/{formData.slug}
                                    </div>
                                    <p className="text-sm text-gray-600 line-clamp-2">
                                        {formData.meta_description || "Add a meta description to see how this page might appear in search results."}
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label className="flex justify-between">
                                        Page title
                                        <span className="text-xs text-gray-400">{formData.meta_title.length}/70 characters used</span>
                                    </Label>
                                    <Input
                                        value={formData.meta_title}
                                        onChange={(e) => setFormData({ ...formData, meta_title: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="flex justify-between">
                                        Meta description
                                        <span className="text-xs text-gray-400">{formData.meta_description.length}/160 characters used</span>
                                    </Label>
                                    <textarea
                                        className="w-full min-h-[100px] p-3 border rounded-md text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                        value={formData.meta_description}
                                        onChange={(e) => setFormData({ ...formData, meta_description: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>URL handle</Label>
                                    <div className="flex rounded-md shadow-sm border">
                                        <span className="flex items-center px-3 rounded-l-md bg-gray-50 text-gray-500 text-sm border-r">
                                            https://.../pages/
                                        </span>
                                        <input
                                            value={formData.slug}
                                            onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                                            className="flex-1 block w-full rounded-none rounded-r-md sm:text-sm border-0 focus:ring-0 p-2"
                                        />
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Sidebar Column */}
                <div className="space-y-6">
                    <Card>
                        <CardContent className="p-4 space-y-4">
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <h3 className="font-semibold text-sm">Visibility</h3>
                                    <div className="text-xs text-gray-500">
                                        {formData.is_active ? "Visible" : "Hidden"}
                                    </div>
                                </div>

                                <RadioGroup
                                    value={formData.is_active ? "visible" : "hidden"}
                                    onValueChange={(val) => setFormData({ ...formData, is_active: val === "visible" })}
                                >
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="visible" id="r-visible" />
                                        <Label htmlFor="r-visible" className="font-normal cursor-pointer">Visible</Label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="hidden" id="r-hidden" />
                                        <Label htmlFor="r-hidden" className="font-normal cursor-pointer">Hidden</Label>
                                    </div>
                                </RadioGroup>

                                {formData.is_active && (
                                    <div className="bg-gray-50 p-2 rounded text-xs text-gray-500 flex items-start gap-2">
                                        <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
                                        <span>Visible as of {new Date().toLocaleDateString()}</span>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-semibold">Template</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Select value={formData.template} onValueChange={(val) => setFormData({ ...formData, template: val })}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select template" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="default">Default Page</SelectItem>
                                    <SelectItem value="about">About Us</SelectItem>
                                    <SelectItem value="contact">Contact Page</SelectItem>
                                    <SelectItem value="full-width">Full Width</SelectItem>
                                </SelectContent>
                            </Select>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
