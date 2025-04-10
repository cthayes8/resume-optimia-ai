
import { useState, useEffect } from 'react';
import { useEditor, EditorContent, BubbleMenu } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Highlight from '@tiptap/extension-highlight';
import TextAlign from '@tiptap/extension-text-align';
import Typography from '@tiptap/extension-typography';
import Link from '@tiptap/extension-link';
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, Bold, Italic, Underline as UnderlineIcon, 
  AlignLeft, AlignCenter, AlignRight, Heading1, Heading2, List, ListOrdered, Link as LinkIcon, Highlighter } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface ResumeEditorProps {
  content: string;
  editable?: boolean;
  className?: string;
  onAccept?: () => void;
  onReject?: () => void;
  showActions?: boolean;
  onChange?: (html: string) => void;
}

export default function ResumeEditor({
  content,
  editable = false,
  className = '',
  onAccept,
  onReject,
  showActions = false,
  onChange,
}: ResumeEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Highlight.configure({
        multicolor: true,
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
        alignments: ['left', 'center', 'right'],
      }),
      Typography,
      Link.configure({
        openOnClick: true,
        linkOnPaste: true,
      }),
    ],
    content,
    editable,
    onUpdate: ({ editor }) => {
      onChange?.(editor.getHTML());
    },
  });

  // Update content when it changes externally
  useEffect(() => {
    if (editor && content) {
      // Only update if content is different to avoid cursor jumps
      if (editor.getHTML() !== content) {
        editor.commands.setContent(content);
      }
    }
  }, [content, editor]);

  return (
    <div className={`prose max-w-none ${className}`}>
      {editor && editable && (
        <BubbleMenu editor={editor} tippyOptions={{ duration: 100 }}>
          <div className="flex items-center gap-1 p-1 rounded-md bg-background border shadow-sm">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    className="h-8 w-8 p-0"
                    onClick={() => editor.chain().focus().toggleBold().run()}
                    data-active={editor.isActive('bold') ? "true" : "false"}
                  >
                    <Bold className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Bold</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    className="h-8 w-8 p-0"
                    onClick={() => editor.chain().focus().toggleItalic().run()}
                    data-active={editor.isActive('italic') ? "true" : "false"}
                  >
                    <Italic className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Italic</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    className="h-8 w-8 p-0"
                    onClick={() => editor.chain().focus().toggleUnderline().run()}
                    data-active={editor.isActive('underline') ? "true" : "false"}
                  >
                    <UnderlineIcon className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Underline</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    className="h-8 w-8 p-0"
                    onClick={() => editor.chain().focus().toggleHighlight().run()}
                    data-active={editor.isActive('highlight') ? "true" : "false"}
                  >
                    <Highlighter className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Highlight</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <span className="w-px h-5 bg-border mx-1"></span>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    className="h-8 w-8 p-0"
                    onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                    data-active={editor.isActive('heading', { level: 1 }) ? "true" : "false"}
                  >
                    <Heading1 className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Heading 1</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    className="h-8 w-8 p-0"
                    onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                    data-active={editor.isActive('heading', { level: 2 }) ? "true" : "false"}
                  >
                    <Heading2 className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Heading 2</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <span className="w-px h-5 bg-border mx-1"></span>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    className="h-8 w-8 p-0"
                    onClick={() => editor.chain().focus().toggleBulletList().run()}
                    data-active={editor.isActive('bulletList') ? "true" : "false"}
                  >
                    <List className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Bullet List</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    className="h-8 w-8 p-0"
                    onClick={() => editor.chain().focus().toggleOrderedList().run()}
                    data-active={editor.isActive('orderedList') ? "true" : "false"}
                  >
                    <ListOrdered className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Ordered List</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <span className="w-px h-5 bg-border mx-1"></span>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    className="h-8 w-8 p-0"
                    onClick={() => editor.chain().focus().setTextAlign('left').run()}
                    data-active={editor.isActive({ textAlign: 'left' }) ? "true" : "false"}
                  >
                    <AlignLeft className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Align Left</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    className="h-8 w-8 p-0"
                    onClick={() => editor.chain().focus().setTextAlign('center').run()}
                    data-active={editor.isActive({ textAlign: 'center' }) ? "true" : "false"}
                  >
                    <AlignCenter className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Align Center</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    className="h-8 w-8 p-0"
                    onClick={() => editor.chain().focus().setTextAlign('right').run()}
                    data-active={editor.isActive({ textAlign: 'right' }) ? "true" : "false"}
                  >
                    <AlignRight className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Align Right</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </BubbleMenu>
      )}

      <div className={`editor-content ${editable ? 'min-h-[200px] border p-4 rounded-md' : ''}`}>
        <EditorContent editor={editor} />
      </div>
      
      {showActions && (
        <div className="flex justify-end gap-2 mt-4">
          <Button 
            size="sm" 
            variant="outline" 
            className="text-red-500 border-red-200 hover:bg-red-50 hover:text-red-600"
            onClick={onReject}
          >
            <XCircle className="h-4 w-4 mr-2" />
            Reject
          </Button>
          <Button 
            size="sm"
            className="text-green-500 bg-green-50 hover:bg-green-100 hover:text-green-600 border-green-200"
            onClick={onAccept}
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            Accept
          </Button>
        </div>
      )}
      
      <style>
        {`
        [data-active="true"] {
          background-color: rgb(243 244 246);
          color: rgb(79 70 229);
        }
        .editor-content :global(p) {
          margin: 0.5em 0;
        }
        .editor-content :global(ul), .editor-content :global(ol) {
          padding-left: 1.5em;
        }
        .editor-content :global(.is-editor-empty:first-child::before) {
          color: #adb5bd;
          content: attr(data-placeholder);
          float: left;
          height: 0;
          pointer-events: none;
        }
      `}
      </style>
    </div>
  );
}
