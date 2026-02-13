'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { toast } from 'sonner'
import { MapPin, Clock, ArrowLeft, Send, CheckCircle2 } from 'lucide-react'
import Link from 'next/link'

export default function JobDetailsPage() {
    const params = useParams()
    const router = useRouter()
    const [job, setJob] = useState(null)
    const [loading, setLoading] = useState(true)
    const [submitting, setSubmitting] = useState(false)
    const [success, setSuccess] = useState(false)

    // Form State
    const [formData, setFormData] = useState({
        full_name: '',
        email: '',
        phone: '',
        linkedin_url: '',
        portfolio_url: '',
        cover_letter: ''
    })

    useEffect(() => {
        async function fetchJob() {
            try {
                // Fetch all jobs and find the one matching ID (since we don't have a single job API yet)
                // In a larger app, we'd make a specific API endpoint for this.
                const res = await fetch('/api/careers')
                const data = await res.json()
                const foundJob = data.find(j => j.id === params.id)

                if (foundJob) {
                    setJob(foundJob)
                } else {
                    toast.error('Job not found')
                    router.push('/careers')
                }
            } catch (error) {
                console.error('Error fetching job:', error)
                toast.error('Failed to load job details')
            } finally {
                setLoading(false)
            }
        }

        if (params.id) {
            fetchJob()
        }
    }, [params.id, router])

    const handleSubmit = async (e) => {
        e.preventDefault()
        setSubmitting(true)

        try {
            const res = await fetch('/api/careers/apply', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    job_id: job.id,
                    ...formData
                })
            })

            const data = await res.json()

            if (!res.ok) throw new Error(data.error || 'Failed to submit application')

            setSuccess(true)
            toast.success('Application submitted successfully!')
            window.scrollTo({ top: 0, behavior: 'smooth' })
        } catch (error) {
            toast.error(error.message)
        } finally {
            setSubmitting(false)
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
            </div>
        )
    }

    if (!job) return null

    if (success) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
                <Card className="max-w-xl w-full text-center p-8">
                    <CardContent className="space-y-6 pt-6">
                        <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center text-green-600 mb-4">
                            <CheckCircle2 className="w-8 h-8" />
                        </div>
                        <h1 className="text-3xl font-bold text-gray-900">Application Received!</h1>
                        <p className="text-gray-600 text-lg">
                            Thank you for applying for the <span className="font-semibold text-gray-900">{job.title}</span> position.
                            We have sent a confirmation email to <span className="font-medium">{formData.email}</span>.
                        </p>
                        <div className="bg-blue-50 p-4 rounded-lg text-blue-700 text-sm">
                            Our team will review your application and get back to you shortly.
                        </div>
                        <Button asChild className="w-full bg-gray-900 hover:bg-gray-800" size="lg">
                            <Link href="/careers">Back to Careers</Link>
                        </Button>
                    </CardContent>
                </Card>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto">
                <Button variant="ghost" asChild className="mb-6 hover:bg-transparent hover:text-red-600 p-0">
                    <Link href="/careers" className="flex items-center gap-2">
                        <ArrowLeft className="w-4 h-4" /> Back to Jobs
                    </Link>
                </Button>

                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    {/* Header */}
                    <div className="bg-gray-900 text-white p-8 md:p-10">
                        <Badge className="bg-red-600 hover:bg-red-700 mb-4 text-white border-0">{job.type}</Badge>
                        <h1 className="text-3xl md:text-4xl font-bold mb-4">{job.title}</h1>
                        <div className="flex flex-wrap gap-6 text-gray-300">
                            <span className="flex items-center gap-2"><MapPin className="w-5 h-5 text-red-500" /> {job.location || 'Remote'}</span>
                            <span className="flex items-center gap-2"><Clock className="w-5 h-5 text-red-500" /> Posted recently</span>
                        </div>
                    </div>

                    <div className="grid md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-gray-100">
                        {/* Job Details Column */}
                        <div className="md:col-span-2 p-8 md:p-10 space-y-8">
                            <div>
                                <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                                    About the Role
                                </h2>
                                <div
                                    className="prose prose-red prose-sm sm:prose-base max-w-none text-gray-600 leading-relaxed"
                                    dangerouslySetInnerHTML={{ __html: job.description }}
                                />
                            </div>

                            {job.requirements && (
                                <div>
                                    <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                                        Requirements
                                    </h2>
                                    <div
                                        className="prose prose-red prose-sm sm:prose-base max-w-none text-gray-600 leading-relaxed"
                                        dangerouslySetInnerHTML={{ __html: job.requirements }}
                                    />
                                </div>
                            )}
                        </div>

                        {/* Application Form Column */}
                        <div className="bg-gray-50/50 p-8 md:p-10">
                            <div className="sticky top-8">
                                <h3 className="text-xl font-bold mb-6">Apply Now</h3>
                                <form onSubmit={handleSubmit} className="space-y-5">
                                    <div className="space-y-2">
                                        <Label htmlFor="full_name">Full Name *</Label>
                                        <Input
                                            id="full_name"
                                            required
                                            placeholder="John Doe"
                                            value={formData.full_name}
                                            onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                                            className="bg-white"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="email">Email Address *</Label>
                                        <Input
                                            id="email"
                                            type="email"
                                            required
                                            placeholder="john@example.com"
                                            value={formData.email}
                                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                            className="bg-white"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="phone">Phone Number *</Label>
                                        <Input
                                            id="phone"
                                            type="tel"
                                            required
                                            placeholder="+91 98765 43210"
                                            value={formData.phone}
                                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                            className="bg-white"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="linkedin">LinkedIn Profile</Label>
                                        <Input
                                            id="linkedin"
                                            type="url"
                                            placeholder="https://linkedin.com/in/..."
                                            value={formData.linkedin_url}
                                            onChange={(e) => setFormData({ ...formData, linkedin_url: e.target.value })}
                                            className="bg-white"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="portfolio">Portfolio / Website</Label>
                                        <Input
                                            id="portfolio"
                                            type="url"
                                            placeholder="https://..."
                                            value={formData.portfolio_url}
                                            onChange={(e) => setFormData({ ...formData, portfolio_url: e.target.value })}
                                            className="bg-white"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="cover_letter">Cover Letter</Label>
                                        <Textarea
                                            id="cover_letter"
                                            placeholder="Tell us why you're a great fit..."
                                            className="min-h-[150px] bg-white resize-none"
                                            value={formData.cover_letter}
                                            onChange={(e) => setFormData({ ...formData, cover_letter: e.target.value })}
                                        />
                                    </div>

                                    <Button
                                        type="submit"
                                        className="w-full bg-red-600 hover:bg-red-700 h-12 text-lg font-medium shadow-lg shadow-red-200 transition-all hover:shadow-xl hover:shadow-red-300"
                                        disabled={submitting}
                                    >
                                        {submitting ? (
                                            <>Converting...</> // Joke placeholder, actually just "Submitting..."
                                        ) : (
                                            <>Submit Application <Send className="ml-2 w-4 h-4" /></>
                                        )}
                                    </Button>
                                    <p className="text-xs text-center text-gray-500">
                                        By applying, you agree to our Privacy Policy.
                                    </p>
                                </form>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
