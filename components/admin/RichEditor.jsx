'use client';
import { useState, useMemo, useRef, useCallback } from 'react';
import dynamic from 'next/dynamic';
import 'react-quill/dist/quill.snow.css';
import { Button } from '@/components/ui/button';
import { Eye, Code } from 'lucide-react';

const ReactQuill = dynamic(() => import('react-quill'), {
    ssr: false,
    loading: () => <p className="p-4 text-gray-500">Loading Editor...</p>,
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
                [{ 'list': 'ordered' }, { 'list': 'bullet' }],
                ['blockquote', 'code-block'],
                [{ 'color': [] }, { 'background': [] }],
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
        <div className={`flex flex-col border rounded-md overflow-hidden bg-white ${className}`}>
            <div className="flex items-center justify-between px-2 py-1 bg-gray-50 border-b">
                <div className="flex gap-1">
                    <Button
                        type="button"
                        variant={mode === 'visual' ? 'secondary' : 'ghost'}
                        size="sm"
                        onClick={() => setMode('visual')}
                        className="h-8 text-xs"
                    >
                        <Eye className="w-3 h-3 mr-2" />
                        Visual
                    </Button>
                    <Button
                        type="button"
                        variant={mode === 'code' ? 'secondary' : 'ghost'}
                        size="sm"
                        onClick={() => setMode('code')}
                        className="h-8 text-xs font-mono"
                    >
                        <Code className="w-3 h-3 mr-2" />
                        Code
                    </Button>
                </div>
                <span className="text-[10px] text-gray-400 font-medium uppercase tracking-wider px-2">
                    {mode === 'visual' ? 'Rich Text Editor' : 'HTML Source Editor'}
                </span>
            </div>

            {mode === 'visual' ? (
                <div className="cms-editor-wrapper">
                    <ReactQuill
                        ref={quillRef}
                        theme="snow"
                        value={value || ''}
                        onChange={onChange}
                        modules={modules}
                        formats={formats}
                        className="h-[400px]"
                    />
                </div>
            ) : (
                <textarea
                    className="w-full h-[442px] p-4 font-mono text-sm bg-gray-900 text-gray-100 focus:outline-none resize-none"
                    value={value || ''}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder="<!-- Write your custom HTML here -->"
                    spellCheck={false}
                />
            )}
        </div>
    );
}

// Add global styles for the editor via a style tag or similar if CSS module not used
// Adjust height to match the toolbar height difference
