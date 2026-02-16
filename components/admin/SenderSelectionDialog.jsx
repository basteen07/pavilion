'use client'

import { useState, useEffect } from 'react'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Label } from "@/components/ui/label"
import { Loader2, Mail, CheckCircle2, Circle } from 'lucide-react'
import { apiCall } from '@/lib/api-client'

export function SenderSelectionDialog({ open, onOpenChange, onConfirm, recipientEmails = [] }) {
    const [message, setMessage] = useState('')
    const [senders, setSenders] = useState([])
    const [selectedSender, setSelectedSender] = useState('primary')
    const [selectedRecipients, setSelectedRecipients] = useState([])
    const [loading, setLoading] = useState(false)

    // Sync recipients when opening
    useEffect(() => {
        if (open) {
            setSelectedRecipients([...recipientEmails])
            setMessage('') // Reset message on open
        }
    }, [open, recipientEmails])

    // Load senders once when opening
    useEffect(() => {
        if (open) {
            setLoading(true)
            apiCall('/admin/config/email-senders', { skipAuthRedirect: true })
                .then(data => {
                    const list = data?.senders || []

                    // Deduplicate by key
                    const uniqueSenders = Array.from(new Map(list.map(item => [item.key, item])).values());

                    // Double check if API returns duplicates differently
                    if (uniqueSenders.length !== list.length) {
                        console.warn('[SenderDialog] Duplicate senders found and removed');
                    }

                    setSenders(uniqueSenders)

                    // Stabilize selection: keep current if it exists in list, otherwise default to first
                    setSelectedSender(prev => {
                        if (uniqueSenders.some(s => s.key === prev)) return prev;
                        return uniqueSenders.length > 0 ? uniqueSenders[0].key : 'primary';
                    });
                })
                .catch(err => {
                    console.error('[SenderSelectionDialog] Fetch error:', err);
                    setSenders([{ key: 'primary', name: 'Primary Email', email: 'Default SMTP' }]);
                    setSelectedSender('primary');
                })
                .finally(() => setLoading(false))
        }
    }, [open])

    const handleConfirm = () => {
        // Ensure we pass clean values
        const finalSender = typeof selectedSender === 'string' ? selectedSender : 'primary';
        const finalRecipients = Array.isArray(selectedRecipients) ? selectedRecipients : recipientEmails;

        onConfirm(finalSender, finalRecipients, message)
        onOpenChange(false)
    }

    const toggleRecipient = (email) => {
        setSelectedRecipients(prev =>
            prev.includes(email)
                ? prev.filter(e => e !== email)
                : [...prev, email]
        )
    }

    return (
        <AlertDialog open={open} onOpenChange={onOpenChange}>
            <AlertDialogContent className="z-[9999] max-w-md bg-white border-2 border-gray-100 shadow-2xl rounded-3xl overflow-hidden p-0">
                <div className="p-6">
                    <AlertDialogHeader className="mb-6">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600">
                                <Mail className="w-6 h-6" />
                            </div>
                            <div>
                                <AlertDialogTitle className="text-xl font-bold text-gray-900">Send Quotation</AlertDialogTitle>
                                <AlertDialogDescription className="text-gray-500 text-sm">Review recipients and sender details.</AlertDialogDescription>
                            </div>
                        </div>
                    </AlertDialogHeader>

                    <div className="space-y-6">
                        {/* Recipient Section */}
                        {recipientEmails.length > 0 && (
                            <div className="space-y-3">
                                <Label className="text-xs font-bold text-gray-400 uppercase tracking-widest pl-1">Target Recipients</Label>
                                <div className="space-y-1 bg-gray-50/50 p-2 rounded-2xl border border-gray-100">
                                    {Array.from(new Set(recipientEmails)).map(email => {
                                        const isChecked = selectedRecipients.includes(email);
                                        return (
                                            <div
                                                key={email}
                                                className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all duration-200 ${isChecked ? 'bg-white shadow-sm ring-1 ring-black/5' : 'hover:bg-gray-100/50'}`}
                                                onClick={() => toggleRecipient(email)}
                                            >
                                                <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${isChecked ? 'bg-blue-600 border-blue-600 shadow-sm shadow-blue-200' : 'bg-white border-gray-300'}`}>
                                                    {isChecked && <div className="w-2.5 h-2.5 rounded-sm bg-white" />}
                                                </div>
                                                <span className={`text-sm font-medium transition-colors ${isChecked ? 'text-gray-900' : 'text-gray-500'}`}>{email}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Message Section - Optional */}
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <Label className="text-xs font-bold text-gray-400 uppercase tracking-widest pl-1">Message (Optional)</Label>
                            </div>
                            <textarea
                                className="w-full min-h-[80px] p-3 text-sm border-2 border-gray-100 rounded-xl bg-gray-50/50 focus:bg-white focus:border-blue-500 focus:outline-none transition-all resize-none placeholder:text-gray-400"
                                placeholder="Add a personal note to the email..."
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                            />
                        </div>

                        {/* Sender Section */}
                        <div className="space-y-3">
                            <Label className="text-xs font-bold text-gray-400 uppercase tracking-widest pl-1">Email Account</Label>
                            <div className="space-y-2">
                                {loading ? (
                                    <div className="flex flex-col items-center justify-center py-10 space-y-3">
                                        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                                        <p className="text-xs text-gray-400 font-medium">Fetching accounts...</p>
                                    </div>
                                ) : senders.length === 0 ? (
                                    <div className="text-center py-8 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
                                        <p className="text-sm text-gray-500">No sender accounts configured.</p>
                                    </div>
                                ) : (
                                    senders.map((sender, idx) => {
                                        const isSelected = selectedSender === sender.key;
                                        return (
                                            <div
                                                key={sender.key || `sender-${idx}`}
                                                className={`group relative flex items-center gap-4 p-4 rounded-2xl border-2 transition-all duration-300 cursor-pointer ${isSelected
                                                    ? 'border-blue-600 bg-blue-50/30' // Removed shadow-sm to see if it simplifies visual
                                                    : 'border-transparent bg-gray-50/50 hover:bg-gray-100/50'
                                                    }`}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setSelectedSender(sender.key);
                                                }}
                                            >
                                                {/* Visual indicator */}
                                                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-300 ${isSelected ? 'border-blue-600 bg-white scale-110' : 'border-gray-300 bg-white group-hover:border-gray-400'}`}>
                                                    {isSelected && <div className="w-3 h-3 rounded-full bg-blue-600 shadow-sm" />}
                                                </div>

                                                <div className="flex-1 min-w-0">
                                                    <div className={`text-sm font-bold transition-colors ${isSelected ? 'text-blue-900' : 'text-gray-700'}`}>{sender.name}</div>
                                                    <div className="text-xs text-gray-500 truncate mt-0.5">{sender.email}</div>
                                                </div>

                                                {sender.key === 'primary' && (
                                                    <span className="text-[10px] px-2.5 py-1 bg-blue-100 text-blue-700 rounded-full font-black uppercase tracking-tighter">
                                                        Primary
                                                    </span>
                                                )}

                                                {/* Selection check icon overlay */}
                                                {isSelected && (
                                                    <CheckCircle2 className="w-5 h-5 text-blue-600 absolute -top-2 -right-2 bg-white rounded-full shadow-lg z-10" />
                                                )}
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                <AlertDialogFooter className="p-6 bg-gray-50/80 border-t border-gray-100 gap-3">
                    <AlertDialogCancel className="h-12 px-6 rounded-2xl border-2 border-gray-200 hover:bg-white text-gray-600 font-semibold transition-all">Cancel</AlertDialogCancel>
                    <AlertDialogAction
                        onClick={(e) => {
                            e.preventDefault();
                            handleConfirm();
                        }}
                        disabled={senders.length === 0 || loading || selectedRecipients.length === 0}
                        className="h-12 flex-1 px-8 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-xl shadow-blue-200 transition-all active:translate-y-0.5 flex items-center justify-center gap-2"
                    >
                        <Mail className="w-5 h-5" />
                        Send Email
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    )
}

