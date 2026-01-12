'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { Loader2, Save, Globe, Code, LineChart } from 'lucide-react'
import { apiCall } from '@/lib/api-client'
import { useMutation, useQuery } from '@tanstack/react-query'

export default function SiteSettingsPage() {
    const [metaTitle, setMetaTitle] = useState('')
    const [metaDescription, setMetaDescription] = useState('')
    const [headScripts, setHeadScripts] = useState('')
    const [bodyScripts, setBodyScripts] = useState('')
    const [googleAnalyticsId, setGoogleAnalyticsId] = useState('')

    const { data: settings, isLoading } = useQuery({
        queryKey: ['site-settings'],
        queryFn: async () => await apiCall('/site-settings')
    })

    useEffect(() => {
        if (settings) {
            setMetaTitle(settings.meta_title || '')
            setMetaDescription(settings.meta_description || '')
            setHeadScripts(settings.head_scripts || '')
            setBodyScripts(settings.body_scripts || '')
            setGoogleAnalyticsId(settings.google_analytics_id || '')
        }
    }, [settings])

    const mutation = useMutation({
        mutationFn: async (data) => {
            return await apiCall('/site-settings', {
                method: 'POST',
                body: JSON.stringify(data)
            })
        },
        onSuccess: () => {
            toast.success('Site settings updated successfully')
        },
        onError: (err) => {
            toast.error(err.message || 'Failed to update settings')
        }
    })

    const handleSubmit = (e) => {
        e.preventDefault()
        mutation.mutate({
            meta_title: metaTitle,
            meta_description: metaDescription,
            head_scripts: headScripts,
            body_scripts: bodyScripts,
            google_analytics_id: googleAnalyticsId
        })
    }

    if (isLoading) {
        return (
            <div className="flex h-[50vh] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        )
    }

    return (
        <div className="space-y-6 max-w-5xl mx-auto pb-10">
            <div>
                <h2 className="text-3xl font-bold tracking-tight">Site Settings</h2>
                <p className="text-muted-foreground">Manage global website configuration, SEO, and analytics.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">
                {/* SEO Section */}
                <Card>
                    <CardHeader>
                        <div className="flex items-center gap-2">
                            <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
                                <Globe className="w-5 h-5" />
                            </div>
                            <div>
                                <CardTitle>SEO Configuration</CardTitle>
                                <CardDescription>Default meta tags for the website.</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label>Global Meta Title</Label>
                            <Input
                                value={metaTitle}
                                onChange={(e) => setMetaTitle(e.target.value)}
                                placeholder="Pavilion Sports - Premium B2B Equipment"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Global Meta Description</Label>
                            <Textarea
                                value={metaDescription}
                                onChange={(e) => setMetaDescription(e.target.value)}
                                placeholder="Enter the default description for your website..."
                                rows={3}
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* Analytics Section */}
                <Card>
                    <CardHeader>
                        <div className="flex items-center gap-2">
                            <div className="p-2 bg-orange-100 rounded-lg text-orange-600">
                                <LineChart className="w-5 h-5" />
                            </div>
                            <div>
                                <CardTitle>Analytics</CardTitle>
                                <CardDescription>Connect Google Analytics/Tag Manager.</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label>Google Analytics Measurement ID</Label>
                            <div className="relative">
                                <div className="absolute left-3 top-2.5 font-bold text-gray-500">G-</div>
                                <Input
                                    value={googleAnalyticsId.replace(/^G-/, '')} // Display without prefix if user types it, handled in UI logic usually but let's just assume clean ID
                                    onChange={(e) => setGoogleAnalyticsId('G-' + e.target.value.replace(/^G-/, ''))}
                                    className="pl-8 uppercase"
                                    placeholder="XXXXXXXXXX"
                                />
                            </div>
                            <p className="text-[10px] text-muted-foreground">Enter your Measurement ID (e.g., G-1234567890)</p>
                        </div>
                    </CardContent>
                </Card>

                {/* Scripts Section */}
                <Card>
                    <CardHeader>
                        <div className="flex items-center gap-2">
                            <div className="p-2 bg-purple-100 rounded-lg text-purple-600">
                                <Code className="w-5 h-5" />
                            </div>
                            <div>
                                <CardTitle>Custom Scripts</CardTitle>
                                <CardDescription>Inject custom JavaScript or CSS into your site.</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="space-y-2">
                            <Label className="font-mono text-xs uppercase tracking-wider text-gray-500">
                                &lt;HEAD&gt; Scripts
                            </Label>
                            <Textarea
                                value={headScripts}
                                onChange={(e) => setHeadScripts(e.target.value)}
                                placeholder="<script>...</script> or <meta ... />"
                                className="font-mono text-xs min-h-[150px] bg-slate-50"
                            />
                            <p className="text-[10px] text-muted-foreground">These will be injected into the <code>&lt;head&gt;</code> of every page.</p>
                        </div>
                        <div className="space-y-2">
                            <Label className="font-mono text-xs uppercase tracking-wider text-gray-500">
                                &lt;BODY&gt; Scripts
                            </Label>
                            <Textarea
                                value={bodyScripts}
                                onChange={(e) => setBodyScripts(e.target.value)}
                                placeholder="<script>...</script>"
                                className="font-mono text-xs min-h-[150px] bg-slate-50"
                            />
                            <p className="text-[10px] text-muted-foreground">These will be injected at the end of the <code>&lt;body&gt;</code> tag.</p>
                        </div>
                    </CardContent>
                </Card>

                <div className="flex justify-end pt-4">
                    <Button type="submit" size="lg" disabled={mutation.isPending} className="gap-2 min-w-[150px]">
                        {mutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        Save Settings
                    </Button>
                </div>
            </form>
        </div>
    )
}
