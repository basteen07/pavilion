'use client'

import MediaBrowser from '@/components/admin/media/MediaBrowser'

export default function ImageLibraryPage() {
    return (
        <div className="space-y-4">
            <div>
                <h1 className="text-2xl font-bold">Image Library</h1>
                <p className="text-sm text-gray-500">
                    Every image uploaded in the admin, organised by folder. Drag images onto the grid to upload them to the open folder.
                </p>
            </div>
            <MediaBrowser mode="manage" />
        </div>
    )
}
