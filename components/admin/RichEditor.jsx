'use client';
import { useState, useMemo, useRef, useCallback } from 'react';
import dynamic from 'next/dynamic';
import 'react-quill/dist/quill.snow.css';
import { Button } from '@/components/ui/button';
import { Eye, Code } from 'lucide-react';
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { Separator } from "@/components/ui/separator"

// Correctly handle Forward Ref with Dynamic Import to fix "Function components cannot be given refs"
const ReactQuill = dynamic(
    async () => {
        const { default: RQ } = await import('react-quill');
        return function Comp({ forwardedRef, ...props }) {
            return <RQ ref={forwardedRef} {...props} />;
        };
    },
    {
        ssr: false,
        loading: () => <div className="h-[400px] w-full flex items-center justify-center bg-gray-50 text-gray-400">Loading Editor...</div>,
    }
);

export default function RichEditor({ value, onChange, className }) {
    const [mode, setMode] = useState('visual'); // 'visual' | 'code'
    const quillRef = useRef(null);

    const mediaHandler = useCallback(() => {
        const input = document.createElement('input');
        input.setAttribute('type', 'file');
        // Allow images and videos, and multiple selection
        input.setAttribute('accept', 'image/*,video/*');
        input.setAttribute('multiple', '');
        input.click();

        input.onchange = async () => {
            const files = Array.from(input.files || []);
            if (files.length === 0) return;

            // Process each file sequentially
            for (const file of files) {
                const formData = new FormData();
                formData.append('file', file);

                try {
                    const token = localStorage.getItem('token');
                    if (!token) {
                        alert('You must be logged in to upload media');
                        return;
                    }

                    const res = await fetch('/api/upload', {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${token}`
                        },
                        body: formData,
                    });

                    if (!res.ok) {
                        const errData = await res.json().catch(() => ({}));
                        console.error(`Upload failed for ${file.name}:`, errData);
                        continue;
                    }

                    const data = await res.json();

                    if (data.url) {
                        if (!quillRef.current) continue;

                        const quill = quillRef.current.getEditor();
                        // Get range, ensuring focused or end
                        const range = quill.getSelection(true) || { index: quill.getLength() };

                        const isVideo = file.type.startsWith('video/');
                        quill.insertEmbed(range.index, isVideo ? 'video' : 'image', data.url);
                        // Move cursor after the inserted item
                        quill.setSelection(range.index + 1);
                    }
                } catch (error) {
                    console.error('Media upload failed', error);
                }
            }
        };
    }, []);

    const modules = useMemo(() => ({
        toolbar: {
            container: [
                [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
                ['bold', 'italic', 'underline', 'strike'],
                [{ 'color': [] }, { 'background': [] }],
                [{ 'list': 'ordered' }, { 'list': 'bullet' }],
                [{ 'align': [] }],
                ['blockquote', 'code-block'],
                ['link', 'image', 'video'],
                ['clean']
            ],
            handlers: {
                image: mediaHandler,
                video: mediaHandler
            }
        },
    }), [mediaHandler]);

    const formats = [
        'header',
        'bold', 'italic', 'underline', 'strike',
        'list', 'bullet',
        'align',
        'color', 'background',
        'blockquote', 'code-block',
        'link', 'image', 'video'
    ];

    return (
        <div className={`flex flex-col border rounded-lg overflow-hidden bg-white shadow-sm ring-1 ring-gray-200 ${className}`}>
            <div className="flex items-center justify-between px-3 py-2 bg-gray-50/50 border-b">
                <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                        {mode === 'visual' ? 'Rich Text' : 'Source Code'}
                    </span>
                </div>

                <div className="flex items-center gap-2">
                    <div className="flex items-center bg-white rounded-md border p-1 shadow-sm">
                        <Button
                            type="button"
                            variant={mode === 'visual' ? 'secondary' : 'ghost'}
                            size="sm"
                            onClick={() => setMode('visual')}
                            className={`h-7 px-3 text-xs ${mode === 'visual' ? 'shadow-sm bg-white' : ''}`}
                        >
                            <Eye className="w-3.5 h-3.5 mr-2" />
                            Visual
                        </Button>
                        <Button
                            type="button"
                            variant={mode === 'code' ? 'secondary' : 'ghost'}
                            size="sm"
                            onClick={() => setMode('code')}
                            className={`h-7 px-3 text-xs font-mono ${mode === 'code' ? 'shadow-sm bg-white' : ''}`}
                        >
                            <Code className="w-3.5 h-3.5 mr-2" />
                            Code
                        </Button>
                    </div>
                </div>
            </div>

            <div className="relative min-h-[400px]">
                {mode === 'visual' ? (
                    <div className="cms-editor-wrapper h-full">
                        <ReactQuill
                            forwardedRef={quillRef}
                            theme="snow"
                            value={value || ''}
                            onChange={onChange}
                            modules={modules}
                            formats={formats}
                            className="h-[400px] border-none"
                        />
                    </div>
                ) : (
                    <textarea
                        className="w-full h-full min-h-[442px] p-4 font-mono text-sm bg-gray-950 text-gray-50 focus:outline-none resize-none"
                        value={value || ''}
                        onChange={(e) => onChange(e.target.value)}
                        placeholder="<!-- Write your custom HTML here -->"
                        spellCheck={false}
                    />
                )}
            </div>
        </div>
    );
}
