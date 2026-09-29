'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import MediaBrowser from '@/components/admin/media/MediaBrowser'

// "Choose from Library" dialog. onPick(items) receives the selected library items ({ id, url, alt, ... }).
export default function MediaLibraryPicker({ open, onOpenChange, onPick, initialFolder = '', maxSelect = 1 }) {
    const [selected, setSelected] = useState([])

    const close = (value) => {
        if (!value) setSelected([])
        onOpenChange(value)
    }

    return (
        <Dialog open={open} onOpenChange={close}>
            <DialogContent className="sm:max-w-[1100px] h-[85vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>Image Library</DialogTitle>
                    <DialogDescription>
                        {maxSelect === 1 ? 'Click an image to select it.' : `Click images to select them (up to ${maxSelect}).`} You can also upload new images here.
                    </DialogDescription>
                </DialogHeader>
                <div className="flex-1 min-h-0">
                    {/* Mounted only while open so each opening starts with a fresh selection */}
                    {open && (
                        <MediaBrowser mode="pick" initialFolder={initialFolder} maxSelect={maxSelect} onSelectionChange={setSelected} />
                    )}
                </div>
                <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => close(false)}>Cancel</Button>
                    <Button
                        type="button"
                        className="bg-red-600"
                        disabled={selected.length === 0}
                        onClick={() => {
                            onPick(selected)
                            close(false)
                        }}
                    >
                        {selected.length > 1 ? `Use ${selected.length} images` : 'Use image'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
