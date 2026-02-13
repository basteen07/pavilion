'use client'

import { useState, useEffect } from 'react'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Label } from "@/components/ui/label"
import { Loader2, Mail } from 'lucide-react'
import { apiCall } from '@/lib/api-client'

export function SenderSelectionDialog({ open, onOpenChange, onConfirm, recipientEmails = [] }) {
    const [senders, setSenders] = useState([])
    const [selectedSender, setSelectedSender] = useState('primary')
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        if (open) {
            console.log('[SenderSelectionDialog] Opening and fetching senders...');
            setLoading(true)
            apiCall('/admin/config/email-senders', { skipAuthRedirect: true })
                .then(data => {
                    console.log('[SenderSelectionDialog] Senders fetched success:', data?.senders?.length || 0);
                    const list = data?.senders || []
                    setSenders(list)
                    if (list.length > 0) setSelectedSender(list[0].key)
                })
                .catch(err => {
                    console.error('[SenderSelectionDialog] Senders fetch error:', err);
                    // Provide a fallback primary sender so the dialog is still usable
                    const fallback = [{ key: 'primary', name: 'Primary Email', email: 'Default SMTP' }];
                    setSenders(fallback);
                    setSelectedSender('primary');
                })
                .finally(() => setLoading(false))
        }
    }, [open])

    const handleConfirm = () => {
        onConfirm(selectedSender)
        onOpenChange(false)
    }

    return (
        <AlertDialog open={open} onOpenChange={onOpenChange}>
            <AlertDialogContent className="max-w-md">
                <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center gap-2">
                        <Mail className="w-5 h-5 text-blue-600" />
                        Select Sender Email
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                        Choose which email account to send this quotation from.
                        {recipientEmails.length > 0 && (
                            <span className="block mt-2 text-xs text-gray-500">
                                Sending to: <strong>{recipientEmails.join(', ')}</strong>
                            </span>
                        )}
                    </AlertDialogDescription>
                </AlertDialogHeader>

                <div className="py-4 space-y-3">
                    {loading ? (
                        <div className="flex items-center justify-center py-6">
                            <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                        </div>
                    ) : senders.length === 0 ? (
                        <p className="text-sm text-gray-500 text-center py-4">No sender accounts configured.</p>
                    ) : (
                        senders.map((sender) => {
                            const isSelected = selectedSender === sender.key;
                            return (
                                <div
                                    key={sender.key}
                                    className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${isSelected
                                        ? 'border-blue-500 bg-blue-50/50'
                                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                        }`}
                                    onClick={() => setSelectedSender(sender.key)}
                                >
                                    {/* Visual radio indicator */}
                                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${isSelected ? 'border-blue-600' : 'border-gray-300'}`}>
                                        {isSelected && <div className="w-2 h-2 rounded-full bg-blue-600" />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="text-sm font-semibold text-gray-900">{sender.name}</div>
                                        <div className="text-xs text-gray-500 truncate">{sender.email}</div>
                                    </div>
                                    {sender.key === 'primary' && (
                                        <span className="text-[10px] px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full font-bold uppercase">
                                            Primary
                                        </span>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>

                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                        onClick={handleConfirm}
                        disabled={senders.length === 0 || loading}
                        className="bg-green-600 hover:bg-green-700 text-white"
                    >
                        <Mail className="w-4 h-4 mr-2" />
                        Send Email
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    )
}
