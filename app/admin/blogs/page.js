"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, ArrowLeft, Search, FileText, Eye, Copy, MoreHorizontal, CheckCircle2 } from "lucide-react";
import RichEditor from "@/components/admin/RichEditor";
import ImageUploader from "@/components/admin/ImageUploader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

export default function BlogsPage() {
    const [blogs, setBlogs] = useState([]);
    const [view, setView] = useState("list"); // 'list' | 'editor'
    const [editingBlog, setEditingBlog] = useState(null);

    useEffect(() => {
        fetchBlogs();
    }, []);

    async function fetchBlogs() {
        try {
            const res = await fetch("/api/blogs?limit=50");
            const data = await res.json();
            setBlogs(data);
        } catch (error) {
            toast.error("Failed to fetch blogs");
        }
    }

    async function handleDelete(id) {
        if (!confirm("Are you sure?")) return;
        try {
            await fetch(`/api/blogs/${id}`, { method: "DELETE" });
            toast.success("Blog deleted");
            fetchBlogs();
        } catch (error) {
            toast.error("Failed to delete blog");
        }
    }

    return (
        <div className="min-h-full">
            {view === "list" ? (
                <div className="space-y-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight text-gray-900">Blog Management</h1>
                            <p className="text-muted-foreground mt-1">Create and manage your news articles and posts.</p>
                        </div>
                        <Button onClick={() => { setEditingBlog(null); setView("editor"); }} className="bg-red-600 hover:bg-red-700 shadow-sm">
                            <Plus className="mr-2 h-4 w-4" /> New Blog Post
                        </Button>
                    </div>

                    <Card>
                        <CardHeader className="py-4 px-6 border-b bg-gray-50/50">
                            <div className="flex items-center justify-between">
                                <div className="relative w-64">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    <Input placeholder="Search posts..." className="pl-9 h-9" />
                                </div>
                                <span className="text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded-full">{blogs.length} Posts</span>
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader className="bg-gray-50/50">
                                    <TableRow>
                                        <TableHead className="w-[40%]">Title</TableHead>
                                        <TableHead className="hidden md:table-cell">Slug</TableHead>
                                        <TableHead className="hidden md:table-cell">Published</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {blogs.map((blog) => (
                                        <TableRow key={blog.id} className="group hover:bg-gray-50/50">
                                            <TableCell className="font-medium">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400 shrink-0 overflow-hidden">
                                                        {blog.image_url ? (
                                                            <img src={blog.image_url} alt="" className="w-full h-full object-cover" />
                                                        ) : (
                                                            <FileText className="w-5 h-5" />
                                                        )}
                                                    </div>
                                                    <span className="truncate">{blog.title}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="hidden md:table-cell text-muted-foreground truncate max-w-[150px]">{blog.slug}</TableCell>
                                            <TableCell className="hidden md:table-cell text-sm">{new Date(blog.published_at || blog.created_at).toLocaleDateString()}</TableCell>
                                            <TableCell>
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${blog.is_active ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}`}>
                                                    {blog.is_active ? "Published" : "Draft"}
                                                </span>
                                            </TableCell>
                                            <TableCell className="text-right space-x-2">
                                                <Button variant="ghost" size="sm" onClick={() => { setEditingBlog(blog); setView("editor"); }}>
                                                    <Pencil className="h-4 w-4 text-gray-500" />
                                                </Button>
                                                <Button variant="ghost" size="sm" onClick={() => handleDelete(blog.id)} className="text-red-500 hover:text-red-700 hover:bg-red-50">
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {blogs.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={5} className="text-center h-32 text-muted-foreground">
                                                No blog posts found.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </div>
            ) : (
                <BlogEditor
                    blog={editingBlog}
                    onCancel={() => { setView("list"); fetchBlogs(); }}
                    onSave={() => { setView("list"); fetchBlogs(); }}
                />
            )}
        </div>
    );
}

function BlogEditor({ blog, onCancel, onSave }) {
    const [formData, setFormData] = useState({
        title: blog?.title || "",
        slug: blog?.slug || "",
        content: blog?.content || "",
        excerpt: blog?.excerpt || "",
        image_url: blog?.image_url || "",
        is_active: blog?.is_active ?? true,
        published_at: blog?.published_at ? new Date(blog.published_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]
    });

    function handlePreview() {
        localStorage.setItem('previewData', JSON.stringify({
            type: 'blog',
            data: formData
        }));
        window.open('/admin/preview', '_blank');
    }

    async function handleSubmit(e) {
        e.preventDefault();
        try {
            const url = blog ? `/api/blogs/${blog.id}` : "/api/blogs";
            const method = blog ? "PUT" : "POST";

            const res = await fetch(url, {
                method,
                body: JSON.stringify(formData),
            });

            if (!res.ok) throw new Error("Failed to save");

            toast.success(blog ? "Updated successfully" : "Created successfully");
            onSave();
        } catch (error) {
            toast.error("Error saving blog");
        }
    }

    return (
        <div className="max-w-6xl mx-auto space-y-6 pb-20">
            <div className="flex items-center justify-between sticky top-16 z-30 bg-gray-50/95 backdrop-blur py-4 border-b -mx-8 px-8 mb-6">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="sm" onClick={onCancel}>
                        <ArrowLeft className="h-4 w-4 mr-2" /> Back
                    </Button>
                    <div>
                        <h1 className="text-xl font-bold flex items-center gap-2">
                            {formData.title || "Untitled Post"}
                        </h1>
                        <p className="text-xs text-gray-500">{blog ? "Editing existing post" : "Creating new post"}</p>
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
                    <Button onClick={handleSubmit} className="bg-red-600 hover:bg-red-700" size="sm">Save Post</Button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-6">
                    <Card>
                        <CardContent className="p-6 space-y-6">
                            <div className="space-y-2">
                                <Label>Post Title</Label>
                                <Input
                                    value={formData.title}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value, slug: !blog ? e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '') : formData.slug })}
                                    required
                                    className="text-lg font-medium"
                                    placeholder="Enter a catchy title..."
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Content</Label>
                                <div className="min-h-[500px]">
                                    <RichEditor
                                        value={formData.content}
                                        onChange={(val) => setFormData({ ...formData, content: val })}
                                        className="h-[450px]"
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="text-sm font-medium">Search engine listing</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="p-4 bg-gray-50 rounded-lg border-2 border-transparent hover:border-gray-200 transition-colors">
                                <div className="space-y-1">
                                    <h4 className="text-lg text-blue-700 hover:underline font-medium truncate">
                                        {formData.title || "Post Title"}
                                    </h4>
                                    <div className="text-sm text-green-700 flex items-center gap-1">
                                        https://example.com/blog/{formData.slug}
                                    </div>
                                    <p className="text-sm text-gray-600 line-clamp-2">
                                        {formData.excerpt || "Add an excerpt to see how this page might appear in search results."}
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label>URL handle</Label>
                                    <div className="flex rounded-md shadow-sm border">
                                        <span className="flex items-center px-3 rounded-l-md bg-gray-50 text-gray-500 text-sm border-r">
                                            https://.../blog/
                                        </span>
                                        <Input
                                            value={formData.slug}
                                            onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                                            className="flex-1 block w-full rounded-none rounded-r-md sm:text-sm border-0 focus:ring-0 p-2"
                                            required
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label>Excerpt / Meta Description</Label>
                                    <textarea
                                        className="w-full min-h-[100px] p-3 border rounded-md text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                        value={formData.excerpt}
                                        onChange={(e) => setFormData({ ...formData, excerpt: e.target.value })}
                                        placeholder="Brief description for list views and SEO..."
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-sm font-medium uppercase tracking-wide">Publishing</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
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
                            </div>

                            <div className="space-y-2">
                                <Label>Publish Date</Label>
                                <Input
                                    type="date"
                                    value={formData.published_at}
                                    onChange={(e) => setFormData({ ...formData, published_at: e.target.value })}
                                />
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="text-sm font-medium uppercase tracking-wide">Featured Image</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <ImageUploader
                                label=""
                                value={formData.image_url}
                                onChange={(val) => setFormData({ ...formData, image_url: val })}
                            />
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
