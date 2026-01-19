'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import Color from '@tiptap/extension-color';
import { TextStyle } from '@tiptap/extension-text-style';
import Highlight from '@tiptap/extension-highlight';
import { useCallback } from 'react';
import {
    Bold, Italic, Underline as UnderlineIcon,
    List, ListOrdered, Quote, Heading1, Heading2, Heading3,
    AlignLeft, AlignCenter, AlignRight, AlignJustify,
    Link as LinkIcon, Image as ImageIcon, Undo, Redo,
    Code, Eraser, Type
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";

const MenuBar = ({ editor }) => {
    const addImage = useCallback(() => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = async () => {
            if (input.files?.length) {
                const file = input.files[0];
                const formData = new FormData();
                formData.append('file', file);

                try {
                    const token = localStorage.getItem('token');
                    const res = await fetch('/api/upload', {
                        method: 'POST',
                        headers: { 'Authorization': `Bearer ${token}` },
                        body: formData,
                    });
                    const data = await res.json();
                    if (data.url) {
                        editor.chain().focus().setImage({ src: data.url }).run();
                    }
                } catch (error) {
                    console.error('Image upload failed', error);
                }
            }
        };
        input.click();
    }, [editor]);

    const setLink = useCallback(() => {
        const previousUrl = editor.getAttributes('link').href;
        const url = window.prompt('URL', previousUrl);

        if (url === null) return;
        if (url === '') {
            editor.chain().focus().extendMarkRange('link').unsetLink().run();
            return;
        }

        editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
    }, [editor]);

    if (!editor) return null;

    const items = [
        { icon: Bold, label: 'Bold', action: () => editor.chain().focus().toggleBold().run(), active: 'bold' },
        { icon: Italic, label: 'Italic', action: () => editor.chain().focus().toggleItalic().run(), active: 'italic' },
        { icon: UnderlineIcon, label: 'Underline', action: () => editor.chain().focus().toggleUnderline().run(), active: 'underline' },
        { icon: Code, label: 'Code', action: () => editor.chain().focus().toggleCode().run(), active: 'code' },
        { type: 'separator' },
        { icon: Heading1, label: 'H1', action: () => editor.chain().focus().toggleHeading({ level: 1 }).run(), active: { heading: { level: 1 } } },
        { icon: Heading2, label: 'H2', action: () => editor.chain().focus().toggleHeading({ level: 2 }).run(), active: { heading: { level: 2 } } },
        { icon: Heading3, label: 'H3', action: () => editor.chain().focus().toggleHeading({ level: 3 }).run(), active: { heading: { level: 3 } } },
        { type: 'separator' },
        { icon: List, label: 'Bullet List', action: () => editor.chain().focus().toggleBulletList().run(), active: 'bulletList' },
        { icon: ListOrdered, label: 'Ordered List', action: () => editor.chain().focus().toggleOrderedList().run(), active: 'orderedList' },
        { icon: Quote, label: 'Blockquote', action: () => editor.chain().focus().toggleBlockquote().run(), active: 'blockquote' },
        { type: 'separator' },
        { icon: AlignLeft, label: 'Left', action: () => editor.chain().focus().setTextAlign('left').run(), active: { textAlign: 'left' } },
        { icon: AlignCenter, label: 'Center', action: () => editor.chain().focus().setTextAlign('center').run(), active: { textAlign: 'center' } },
        { icon: AlignRight, label: 'Right', action: () => editor.chain().focus().setTextAlign('right').run(), active: { textAlign: 'right' } },
        { type: 'separator' },
        { icon: LinkIcon, label: 'Link', action: setLink, active: 'link' },
        { icon: ImageIcon, label: 'Image', action: addImage },
        { type: 'separator' },
        { icon: Undo, label: 'Undo', action: () => editor.chain().focus().undo().run() },
        { icon: Redo, label: 'Redo', action: () => editor.chain().focus().redo().run() },
        { icon: Eraser, label: 'Clear Format', action: () => editor.chain().focus().unsetAllMarks().clearNodes().run() },
    ];

    return (
        <TooltipProvider>
            <div className="flex flex-wrap items-center gap-1 p-2 bg-gray-50 border-b border-gray-200">
                {items.map((item, index) => (
                    item.type === 'separator' ? (
                        <div key={index} className="w-px h-6 bg-gray-300 mx-1" />
                    ) : (
                        <Tooltip key={index}>
                            <TooltipTrigger asChild>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={item.action}
                                    className={`h-8 w-8 p-0 ${item.active && editor.isActive(item.active) ? 'bg-gray-200 text-red-600' : ''}`}
                                >
                                    <item.icon className="w-4 h-4" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>{item.label}</TooltipContent>
                        </Tooltip>
                    )
                ))}
            </div>
        </TooltipProvider>
    );
};

export default function TiptapEditor({ value, onChange, className }) {
    const editor = useEditor({
        immediatelyRender: false,
        extensions: [
            StarterKit,
            Image,
            Link.configure({ openOnClick: false }),
            Underline,
            TextStyle,
            Color,
            Highlight,
            TextAlign.configure({ types: ['heading', 'paragraph'] }),
        ],
        content: value || '',
        onUpdate: ({ editor }) => {
            onChange(editor.getHTML());
        },
        editorProps: {
            attributes: {
                class: 'prose prose-sm sm:prose-base lg:prose-lg xl:prose-2xl focus:outline-none min-h-[300px] p-4 max-w-none',
            },
        },
    });

    return (
        <div className={`border rounded-md overflow-hidden bg-white shadow-sm ring-1 ring-gray-200 ${className}`}>
            <MenuBar editor={editor} />
            <EditorContent editor={editor} />
        </div>
    );
}
