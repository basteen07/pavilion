'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Briefcase, MapPin, Clock, ArrowRight, CheckCircle2 } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

export default function CareersPage() {
    const [jobs, setJobs] = useState([])
    const [loading, setLoading] = useState(true)
    const [selectedJob, setSelectedJob] = useState(null)

    useEffect(() => {
        async function fetchJobs() {
            try {
                const res = await fetch('/api/careers')
                const data = await res.json()
                setJobs(data)
            } catch (error) {
                console.error('Failed to load jobs', error)
            } finally {
                setLoading(false)
            }
        }
        fetchJobs()
    }, [])

    return (
        <div className="flex flex-col min-h-screen bg-gray-50">


            <main className="flex-1">
                {/* Hero Section */}
                <section className="relative bg-gray-900 text-white py-24 lg:py-32 overflow-hidden">
                    <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1526676037777-05a232554f77?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center opacity-20"></div>
                    <div className="container relative z-10 text-center">
                        <Badge variant="outline" className="mb-4 text-gray-300 border-gray-600 px-4 py-1">Careers at Pavilion</Badge>
                        <h1 className="text-4xl md:text-6xl font-bold mb-6 tracking-tight">Join the Game Changers</h1>
                        <p className="text-xl text-gray-300 max-w-2xl mx-auto mb-8 leading-relaxed">
                            We are looking for passionate individuals to help us revolutionize the sports equipment industry. Explore our opportunities and find your fit.
                        </p>
                        <Button size="lg" className="bg-red-600 hover:bg-red-700 text-lg px-8 h-14" onClick={() => document.getElementById('openings').scrollIntoView({ behavior: 'smooth' })}>
                            View Open Positions <ArrowRight className="ml-2 w-5 h-5" />
                        </Button>
                    </div>
                </section>

                {/* Why Join Us */}
                <section className="py-20 bg-white">
                    <div className="container">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            {[
                                { title: 'Impact', desc: 'Work on products used by professionals and aspiring athletes nationwide.', icon: Briefcase },
                                { title: 'Growth', desc: 'Continuous learning opportunities and career advancement paths.', icon: ArrowRight },
                                { title: 'Culture', desc: 'A passionate, sports-loving team that values collaboration and innovation.', icon: CheckCircle2 }
                            ].map((item, i) => (
                                <Card key={i} className="border-0 shadow-none bg-gray-50/50 hover:bg-red-50 transition-colors duration-300">
                                    <CardContent className="p-8 text-center space-y-4">
                                        <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
                                            <item.icon className="w-6 h-6" />
                                        </div>
                                        <h3 className="text-xl font-bold">{item.title}</h3>
                                        <p className="text-gray-500">{item.desc}</p>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Job Listings */}
                <section id="openings" className="py-20">
                    <div className="container max-w-4xl">
                        <div className="text-center mb-12">
                            <h2 className="text-3xl font-bold mb-4">Current Openings</h2>
                            <p className="text-gray-600">Find the role that's right for you.</p>
                        </div>

                        {loading ? (
                            <div className="text-center py-20">
                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto"></div>
                            </div>
                        ) : jobs.length === 0 ? (
                            <div className="text-center py-20 bg-white rounded-2xl shadow-sm border border-gray-100">
                                <p className="text-lg text-gray-500">No current openings. Check back later!</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {jobs.map((job) => (
                                    <Card key={job.id} className="overflow-hidden hover:shadow-md transition-shadow cursor-pointer border-l-4 border-l-transparent hover:border-l-red-600 px-2" onClick={() => setSelectedJob(job)}>
                                        <CardContent className="p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                            <div className="space-y-1">
                                                <h3 className="text-xl font-bold group-hover:text-red-600 transition-colors">{job.title}</h3>
                                                <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                                                    <span className="flex items-center gap-1"><MapPin className="w-4 h-4" /> {job.location}</span>
                                                    <span className="flex items-center gap-1"><Clock className="w-4 h-4" /> {job.type}</span>
                                                </div>
                                            </div>
                                            <Button variant="outline" className="shrink-0">Details & Apply</Button>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        )}
                    </div>
                </section>
            </main>


            <Dialog open={!!selectedJob} onOpenChange={(open) => !open && setSelectedJob(null)}>
                <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-bold">{selectedJob?.title}</DialogTitle>
                        <DialogDescription className="flex items-center gap-4 pt-2">
                            <Badge variant="secondary" className="rounded-md">{selectedJob?.type}</Badge>
                            <span className="flex items-center gap-1 text-sm"><MapPin className="w-3 h-3" /> {selectedJob?.location}</span>
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-6 pt-4">
                        <div className="prose max-w-none">
                            <h3 className="text-lg font-semibold mb-2">About the Role</h3>
                            <div dangerouslySetInnerHTML={{ __html: selectedJob?.description }} className="text-gray-600 text-sm leading-relaxed" />
                        </div>

                        {selectedJob?.requirements && (
                            <div className="prose max-w-none">
                                <h3 className="text-lg font-semibold mb-2">Requirements</h3>
                                <div dangerouslySetInnerHTML={{ __html: selectedJob?.requirements }} className="text-gray-600 text-sm leading-relaxed" />
                            </div>
                        )}

                        <div className="bg-gray-50 p-6 rounded-lg space-y-4 border">
                            <h3 className="font-semibold">Apply for this position</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1"><Label>Full Name</Label><Input placeholder="John Doe" /></div>
                                <div className="space-y-1"><Label>Email</Label><Input placeholder="john@example.com" /></div>
                                <div className="space-y-1"><Label>Phone</Label><Input placeholder="+91..." /></div>
                                <div className="space-y-1"><Label>Resume Link (LinkedIn/Portfolio)</Label><Input placeholder="https://..." /></div>
                                <div className="col-span-2 space-y-1"><Label>Cover Letter</Label><Textarea placeholder="Tell us why you're a great fit..." /></div>
                            </div>
                            <Button className="w-full bg-red-600 hover:bg-red-700">Submit Application</Button>
                            <p className="text-xs text-gray-400 text-center">By submitting, you agree to our privacy policy.</p>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    )
}
