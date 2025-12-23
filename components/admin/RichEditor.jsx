'use client';
import { useState, useMemo, useRef, useCallback } from 'react';
import dynamic from 'next/dynamic';
import 'react-quill/dist/quill.snow.css';
import { Button } from '@/components/ui/button';
import { Eye, Code } from 'lucide-react';
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { Separator } from "@/components/ui/separator"

const ReactQuill = dynamic(() => import('react-quill'), {
    ssr: false,
    loading: () => <div className="h-[400px] w-full flex items-center justify-center bg-gray-50 text-gray-400">Loading Editor...</div>,
});

export default function RichEditor({ value, onChange, className }) {
    const [mode, setMode] = useState('visual'); // 'visual' | 'code'
    const quillRef = useRef(null);

    const imageHandler = useCallback(() => {
        const input = document.createElement('input');
        input.setAttribute('type', 'file');
        input.setAttribute('accept', 'image/*');
        input.click();

        input.onchange = async () => {
            const file = input.files[0];
            if (!file) return;

            const formData = new FormData();
            formData.append('file', file);

            try {
                const res = await fetch('/api/upload', {
                    method: 'POST',
                    body: formData,
                });
                const data = await res.json();

                if (data.url) {
                    const quill = quillRef.current.getEditor();
                    const range = quill.getSelection();
                    quill.insertEmbed(range.index, 'image', data.url);
                }
            } catch (error) {
                console.error('Image upload failed', error);
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
                ['blockquote', 'code-block'],
                ['link', 'image', 'video'],
                ['clean']
            ],
            handlers: {
                image: imageHandler
            }
        },
    }), [imageHandler]);

    const formats = [
        'header',
        'bold', 'italic', 'underline', 'strike',
        'list', 'bullet',
        'blockquote', 'code-block',
        'color', 'background',
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
                            ref={quillRef}
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

// Add global styles for the editor via a style tag or similar if CSS module not used
// Adjust height to match the toolbar height difference
