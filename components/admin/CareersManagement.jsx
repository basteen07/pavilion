'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { toast } from 'sonner'
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
    SheetFooter
} from '@/components/ui/sheet'
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Plus, Edit, Trash2, Search, Briefcase, MapPin, Clock } from 'lucide-react'
import dynamic from 'next/dynamic'

// Dynamically import RichEditor to avoid SSR issues
const RichEditor = dynamic(() => import('@/components/admin/RichEditor'), { ssr: false })

const API_BASE = '/api'

async function apiCall(endpoint, options = {}) {
    const token = localStorage.getItem('token')
    const headers = {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers
    }

    const response = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers
    })

    return await response.json()
}

export default function CareersManagement() {
    const [jobs, setJobs] = useState([])
    const [filteredJobs, setFilteredJobs] = useState([])
    const [searchTerm, setSearchTerm] = useState('')
    const [isSheetOpen, setIsSheetOpen] = useState(false)
    const [editingJob, setEditingJob] = useState(null)
    const [deleteId, setDeleteId] = useState(null)
    const [formData, setFormData] = useState({
        title: '',
        location: '',
        type: 'Full-time',
        description: '',
        requirements: '',
        display_order: 0,
        is_active: true
    })

    useEffect(() => {
        loadJobs()
    }, [])

    useEffect(() => {
        if (!searchTerm) {
            setFilteredJobs(jobs)
        } else {
            const lower = searchTerm.toLowerCase()
            setFilteredJobs(jobs.filter(j =>
                j.title?.toLowerCase().includes(lower) ||
                j.location?.toLowerCase().includes(lower)
            ))
        }
    }, [searchTerm, jobs])

    async function loadJobs() {
        try {
            const data = await apiCall('/admin/careers')
            setJobs(data || [])
        } catch (error) {
            toast.error('Failed to load jobs')
        }
    }

    async function saveJob() {
        try {
            if (editingJob) {
                await apiCall(`/admin/careers/${editingJob.id}`, {
                    method: 'PUT',
                    body: JSON.stringify(formData)
                })
                toast.success('Job updated successfully')
            } else {
                await apiCall('/admin/careers', {
                    method: 'POST',
                    body: JSON.stringify(formData)
                })
                toast.success('Job created successfully')
            }
            setIsSheetOpen(false)
            resetForm()
            loadJobs()
        } catch (error) {
            toast.error('Failed to save job')
        }
    }

    async function confirmDelete() {
        if (!deleteId) return
        try {
            await apiCall(`/admin/careers/${deleteId}`, { method: 'DELETE' })
            toast.success('Job deleted')
            loadJobs()
        } catch (error) {
            toast.error('Failed to delete')
        } finally {
            setDeleteId(null)
        }
    }

    function resetForm() {
        setFormData({
            title: '',
            location: '',
            type: 'Full-time',
            description: '',
            requirements: '',
            display_order: jobs.length,
            is_active: true
        })
        setEditingJob(null)
    }

    function openCreate() {
        resetForm()
        setIsSheetOpen(true)
    }

    function openEdit(job) {
        setFormData(job)
        setEditingJob(job)
        setIsSheetOpen(true)
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Careers</h2>
                    <p className="text-muted-foreground">Manage job openings and opportunities.</p>
                </div>
                <Button onClick={openCreate}>
                    <Plus className="w-4 h-4 mr-2" />
                    Post Job
                </Button>
            </div>

            <div className="flex items-center gap-4 bg-white p-4 rounded-lg border shadow-sm">
                <div className="relative flex-1">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search jobs..."
                        className="pl-8 bg-gray-50/50"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
                {filteredJobs.length === 0 ? (
                    <div className="text-center py-12 bg-white rounded-lg border border-dashed">
                        <Briefcase className="mx-auto h-12 w-12 text-gray-400" />
                        <h3 className="mt-2 text-sm font-semibold text-gray-900">No jobs posted</h3>
                        <p className="mt-1 text-sm text-gray-500">Get started by creating a new job opening.</p>
                    </div>
                ) : (
                    filteredJobs.map((job) => (
                        <Card key={job.id} className="overflow-hidden hover:shadow-md transition-all">
                            <CardContent className="p-6 flex flex-col sm:flex-row gap-6 items-start sm:items-center">
                                <div className="flex-1 space-y-2">
                                    <div className="flex items-center gap-2">
                                        <h3 className="text-lg font-semibold text-gray-900">{job.title}</h3>
                                        <Badge variant={job.is_active ? "default" : "secondary"}>
                                            {job.is_active ? "Active" : "Closed"}
                                        </Badge>
                                    </div>
                                    <div className="flex items-center gap-4 text-sm text-gray-500">
                                        <div className="flex items-center gap-1">
                                            <MapPin className="w-4 h-4" />
                                            {job.location || 'Remote'}
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Clock className="w-4 h-4" />
                                            {job.type}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 w-full sm:w-auto justify-end border-t sm:border-t-0 pt-4 sm:pt-0">
                                    <Button size="sm" variant="outline" onClick={() => openEdit(job)}>
                                        <Edit className="w-4 h-4 mr-2" /> Edit
                                    </Button>
                                    <Button size="sm" variant="destructive" onClick={() => setDeleteId(job.id)}>
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>

            <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
                <SheetContent className="overflow-y-auto sm:max-w-2xl w-full">
                    <SheetHeader>
                        <SheetTitle>{editingJob ? 'Edit Job' : 'Post Job'}</SheetTitle>
                        <SheetDescription>
                            {editingJob ? 'Update job details.' : 'Create a new job opportunity.'}
                        </SheetDescription>
                    </SheetHeader>
                    <div className="space-y-6 pt-6 pb-20">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Job Title *</Label>
                                <Input
                                    value={formData.title}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                    placeholder="e.g. Senior Product Designer"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Job Type</Label>
                                <Input
                                    value={formData.type}
                                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                                    placeholder="e.g. Full-time, Contract"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Location</Label>
                            <Input
                                value={formData.location}
                                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                                placeholder="e.g. New York, Remote"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Description</Label>
                            <div className="h-[300px]">
                                <RichEditor
                                    value={formData.description}
                                    onChange={(val) => setFormData({ ...formData, description: val })}
                                    className="h-full"
                                />
                            </div>
                        </div>

                        <div className="pt-20 space-y-2">
                            <Label>Requirements</Label>
                            <div className="h-[200px]">
                                <RichEditor
                                    value={formData.requirements}
                                    onChange={(val) => setFormData({ ...formData, requirements: val })}
                                    className="h-full"
                                />
                            </div>
                        </div>

                        <div className="flex items-center justify-between rounded-lg border p-3 shadow-sm mt-32">
                            <div className="space-y-0.5">
                                <Label>Active Status</Label>
                                <p className="text-xs text-muted-foreground">Visible on careers page</p>
                            </div>
                            <Switch
                                checked={formData.is_active}
                                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                            />
                        </div>
                    </div>
                    <SheetFooter className="absolute bottom-0 left-0 right-0 bg-white p-4 border-t">
                        <Button variant="outline" onClick={() => setIsSheetOpen(false)}>Cancel</Button>
                        <Button onClick={saveJob}>
                            {editingJob ? 'Save Changes' : 'Post Job'}
                        </Button>
                    </SheetFooter>
                </SheetContent>
            </Sheet>

            <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the job posting.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700">Delete</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
