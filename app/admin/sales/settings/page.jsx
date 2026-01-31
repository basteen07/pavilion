'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Save, Loader2, FileText, Settings, BadgePercent, ShieldCheck } from 'lucide-react'
import { apiCall } from '@/lib/api-client'
import { toast } from 'sonner'

export default function SalesSettingsPage() {
    const [isLoading, setIsLoading] = useState(true)
    const [isSaving, setIsSaving] = useState(false)
    const [settings, setSettings] = useState({
        sales_default_terms: '',
        quotation_prefix: 'QT',
        quotation_validity_days: '30',
        company_bank_details: ''
    })

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const data = await apiCall('/settings?keys=sales_default_terms,quotation_prefix,quotation_validity_days,company_bank_details')
                setSettings(prev => ({
                    ...prev,
                    ...data
                }))
            } catch (error) {
                toast.error('Failed to load settings')
            } finally {
                setIsLoading(false)
            }
        }
        fetchSettings()
    }, [])

    const handleSave = async () => {
        setIsSaving(true)
        try {
            await apiCall('/settings', {
                method: 'POST',
                body: JSON.stringify(settings)
            })
            toast.success('Settings saved successfully')
        } catch (error) {
            toast.error('Failed to save settings')
        } finally {
            setIsSaving(false)
        }
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-3xl font-bold tracking-tight">Sales Settings</h2>
                <p className="text-gray-500">Manage quotation defaults and sales configurations</p>
            </div>

            <Tabs defaultValue="quotations" className="space-y-6">
                <TabsList className="bg-white border p-1 rounded-xl shadow-sm">
                    <TabsTrigger value="quotations" className="rounded-lg px-6 py-2 transition-all">
                        <FileText className="w-4 h-4 mr-2" /> Quotations
                    </TabsTrigger>
                    <TabsTrigger value="legal" className="rounded-lg px-6 py-2 transition-all">
                        <ShieldCheck className="w-4 h-4 mr-2" /> Terms & Legal
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="quotations">
                    <Card className="border-none shadow-sm rounded-2xl overflow-hidden">
                        <CardHeader className="bg-white border-b border-gray-100">
                            <CardTitle className="text-lg">Quotation Configuration</CardTitle>
                            <CardDescription>Setup how your quotations are generated</CardDescription>
                        </CardHeader>
                        <CardContent className="p-6 space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 font-primary">
                                <div className="space-y-2">
                                    <Label className="text-sm font-bold text-gray-700">Quotation Prefix</Label>
                                    <Input
                                        value={settings.quotation_prefix}
                                        onChange={(e) => setSettings({ ...settings, quotation_prefix: e.target.value })}
                                        placeholder="e.g. QT"
                                        className="h-10 rounded-xl"
                                    />
                                    <p className="text-[10px] text-gray-400">Used for generated quotation numbers</p>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-sm font-bold text-gray-700">Default Validity (Days)</Label>
                                    <Input
                                        type="number"
                                        value={settings.quotation_validity_days}
                                        onChange={(e) => setSettings({ ...settings, quotation_validity_days: e.target.value })}
                                        placeholder="30"
                                        className="h-10 rounded-xl"
                                    />
                                    <p className="text-[10px] text-gray-400">Default number of days a quotation remains valid</p>
                                </div>
                                <div className="md:col-span-2 space-y-2">
                                    <Label className="text-sm font-bold text-gray-700">Bank Details for PDF</Label>
                                    <Textarea
                                        value={settings.company_bank_details}
                                        onChange={(e) => setSettings({ ...settings, company_bank_details: e.target.value })}
                                        placeholder="Account Name: Pavilion Sports\nAccount Number: ...\nIFSC: ..."
                                        className="min-h-[120px] rounded-xl"
                                    />
                                    <p className="text-[10px] text-gray-400">These details will be shown at the bottom of the quotation PDF</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="legal">
                    <Card className="border-none shadow-sm rounded-2xl overflow-hidden">
                        <CardHeader className="bg-white border-b border-gray-100">
                            <CardTitle className="text-lg">Terms and Conditions</CardTitle>
                            <CardDescription>Default wording for your sales documents</CardDescription>
                        </CardHeader>
                        <CardContent className="p-6">
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label className="text-sm font-bold text-gray-700">Default Quotation Terms</Label>
                                    <Textarea
                                        value={settings.sales_default_terms}
                                        onChange={(e) => setSettings({ ...settings, sales_default_terms: e.target.value })}
                                        placeholder="Enter default terms and conditions..."
                                        className="min-h-[300px] leading-relaxed rounded-xl font-sans"
                                    />
                                    <p className="text-[10px] text-gray-400 italic">This text will be automatically inserted into every new quotation builder session.</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            <div className="flex justify-end pt-4">
                <Button
                    className="bg-blue-600 hover:bg-blue-700 text-white px-8 h-12 rounded-xl font-bold shadow-lg shadow-blue-200 transition-all flex items-center gap-2"
                    onClick={handleSave}
                    disabled={isSaving}
                >
                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Save All Settings
                </Button>
            </div>
        </div>
    )
}
