import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Highlight from '@tiptap/extension-highlight';
import Typography from '@tiptap/extension-typography';
import TextAlign from '@tiptap/extension-text-align';
import Underline from '@tiptap/extension-underline';
import { Level } from '@tiptap/extension-heading';
import AiSuggestion from '@tiptap-pro/extension-ai-suggestion';
import { useCallback, useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { 
  Bold, 
  Italic, 
  Underline as UnderlineIcon, 
  AlignLeft, 
  AlignCenter, 
  AlignRight,
  List,
  ListOrdered,
  AlignJustify
} from 'lucide-react';
import { Toggle } from '@/components/ui/toggle';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import './ai-suggestion.css';
import { AISuggestions } from '@/components/suggestions/AISuggestions';
import { supabase } from '@/lib/supabase';
import { createResumeAIRules, aiConfig } from '@/config/aiPrompts';
import { KeywordAnalysis } from '@/components/keywords/KeywordAnalysis';

interface ResumeEditorProps {
  content: string;
  onChange: (content: string) => void;
  optimizationId: number;
}

export default function ResumeEditor({
  content,
  onChange,
  optimizationId,
}: ResumeEditorProps) {
  const [pages, setPages] = useState<number[]>([]);
  const [jobDescription, setJobDescription] = useState<string>('');
  const contentRef = useRef<HTMLDivElement>(null);
  const pageHeight = 11 * 96; // 11 inches in pixels at 96 DPI
  const marginHeight = 1 * 96; // 1 inch margins

  useEffect(() => {
    async function fetchJobDescription() {
      try {
        const { data, error } = await supabase
          .from('optimizations')
          .select('job_description')
          .eq('id', optimizationId)
          .single();

        if (error) throw error;
        if (data) {
          setJobDescription(data.job_description);
        }
      } catch (error) {
        console.error('Error fetching job description:', error);
      }
    }

    if (optimizationId) {
      fetchJobDescription();
    }
  }, [optimizationId]);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3]
        },
        bulletList: {
          keepMarks: true,
          keepAttributes: false,
        },
        orderedList: {
          keepMarks: true,
          keepAttributes: false,
        },
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph', 'bulletList', 'orderedList', 'listItem'],
        alignments: ['left', 'center', 'right', 'justify'],
        defaultAlignment: 'left'
      }),
      Highlight.configure({
        multicolor: true,
      }),
      Typography,
      Underline,
      AiSuggestion.configure({
        rules: createResumeAIRules(jobDescription),
        appId: import.meta.env.VITE_TIPTAP_AI_APP_ID,
        token: import.meta.env.VITE_TIPTAP_AI_JWT_TOKEN,
        ...aiConfig,
      })
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
      calculatePages();
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-xl max-w-none focus:outline-none',
        spellcheck: 'false',
      },
    },
  });

  const calculatePages = useCallback(() => {
    if (!contentRef.current) return;
    
    const contentHeight = contentRef.current.scrollHeight;
    const pageCount = Math.ceil(contentHeight / (pageHeight - marginHeight * 2));
    setPages(Array.from({ length: pageCount }, (_, i) => i + 1));
  }, [pageHeight, marginHeight]);

  useEffect(() => {
    calculatePages();
    window.addEventListener('resize', calculatePages);
    return () => window.removeEventListener('resize', calculatePages);
  }, [calculatePages]);

  useEffect(() => {
    if (editor) {
      editor.commands.loadAiSuggestions();
    }
  }, [editor]);

  const handleHeadingChange = (value: string) => {
    if (value === 'p') {
      editor?.chain().focus().setParagraph().run();
    } else {
      const level = parseInt(value) as Level;
      editor?.chain().focus().toggleHeading({ level }).run();
    }
  };

  if (!editor) {
    return null;
  }

  return (
    <div className="relative">
      <div className="bg-gray-100 min-h-screen py-16 px-4">
        <div className="flex gap-8 max-w-[1200px] mx-auto">
          <div className="flex-1">
            <div className="bg-white rounded-lg shadow-sm">
              <div className="sticky top-0 z-10 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60 rounded-t-lg border-b p-2 flex items-center gap-2 w-full">
                <Select
                  value={editor.isActive('heading', { level: 1 }) ? '1' :
                         editor.isActive('heading', { level: 2 }) ? '2' :
                         editor.isActive('heading', { level: 3 }) ? '3' : 'p'}
                  onValueChange={handleHeadingChange}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Style" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="p">Paragraph</SelectItem>
                    <SelectItem value="1">Heading 1</SelectItem>
                    <SelectItem value="2">Heading 2</SelectItem>
                    <SelectItem value="3">Heading 3</SelectItem>
                  </SelectContent>
                </Select>

                <div className="h-6 w-px bg-border" />

                <Toggle
                  pressed={editor.isActive('bold')}
                  onPressedChange={() => editor.chain().focus().toggleBold().run()}
                  aria-label="Toggle bold"
                >
                  <Bold className="h-4 w-4" />
                </Toggle>

                <Toggle
                  pressed={editor.isActive('italic')}
                  onPressedChange={() => editor.chain().focus().toggleItalic().run()}
                  aria-label="Toggle italic"
                >
                  <Italic className="h-4 w-4" />
                </Toggle>

                <div className="h-6 w-px bg-border" />

                <div className="flex gap-2">
                  <Button
                    variant={editor.isActive('bulletList') ? 'secondary' : 'outline'}
                    size="icon"
                    onClick={() => editor.chain().focus().toggleBulletList().run()}
                  >
                    <List className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={editor.isActive('orderedList') ? 'secondary' : 'outline'}
                    size="icon"
                    onClick={() => editor.chain().focus().toggleOrderedList().run()}
                  >
                    <ListOrdered className="h-4 w-4" />
                  </Button>
                </div>

                <div className="h-6 w-px bg-border" />

                <div className="flex gap-2">
                  <Button
                    variant={editor.isActive({ textAlign: 'left' }) ? 'secondary' : 'outline'}
                    size="icon"
                    onClick={() => editor.chain().focus().setTextAlign('left').run()}
                  >
                    <AlignLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={editor.isActive({ textAlign: 'center' }) ? 'secondary' : 'outline'}
                    size="icon"
                    onClick={() => editor.chain().focus().setTextAlign('center').run()}
                  >
                    <AlignCenter className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={editor.isActive({ textAlign: 'right' }) ? 'secondary' : 'outline'}
                    size="icon"
                    onClick={() => editor.chain().focus().setTextAlign('right').run()}
                  >
                    <AlignRight className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={editor.isActive({ textAlign: 'justify' }) ? 'secondary' : 'outline'}
                    size="icon"
                    onClick={() => editor.chain().focus().setTextAlign('justify').run()}
                  >
                    <AlignJustify className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div ref={contentRef} className="p-4">
                <EditorContent editor={editor} />
              </div>
            </div>
          </div>
          
          <div className="w-[400px] sticky top-[80px] self-start space-y-4">
            {editor && <AISuggestions editor={editor} />}
            {jobDescription && editor && (
              <KeywordAnalysis 
                jobDescription={jobDescription} 
                resumeContent={editor.getHTML()} 
              />
            )}
          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        /* Add new styles for metrics grid layout */
        .metrics-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 1rem;
          padding: 1rem;
        }

        .metrics-grid > div {
          min-width: 0; /* Prevent overflow in grid items */
        }

        @page {
          size: letter;
          margin: 1in;
        }

        @media print {
          body {
            background: white !important;
            margin: 0;
            padding: 0;
          }
          
          .print-shadow {
            box-shadow: none !important;
          }
          
          .print-rounded {
            border-radius: 0 !important;
          }
          
          .print-padding {
            padding: 1in !important;
          }

          .editor-content {
            padding: 0;
          }
        }

        /* Basic content spacing */
        .ProseMirror > * + * {
          margin-top: 0.75em;
        }

        /* List Styles */
        .ProseMirror ul {
          list-style-type: disc;
          padding-left: 1.5em;
          margin-left: 0.5em;
        }

        .ProseMirror ol {
          list-style-type: decimal;
          padding-left: 1.5em;
          margin-left: 0.5em;
        }

        .ProseMirror ul li,
        .ProseMirror ol li {
          margin: 0.2em 0;
          position: relative;
        }

        .ProseMirror ul li::marker,
        .ProseMirror ol li::marker {
          color: inherit;
        }

        .ProseMirror ul[data-type="bulletList"] li {
          list-style-type: disc;
        }

        .ProseMirror ul[data-type="bulletList"] li li {
          list-style-type: circle;
        }

        .ProseMirror ul[data-type="bulletList"] li li li {
          list-style-type: square;
        }

        /* Ensure proper page breaks */
        .ProseMirror p, 
        .ProseMirror h1,
        .ProseMirror h2,
        .ProseMirror h3,
        .ProseMirror ul,
        .ProseMirror ol {
          break-inside: avoid;
          page-break-inside: avoid;
        }

        /* Prevent orphans and widows */
        .ProseMirror p {
          orphans: 3;
          widows: 3;
        }

        /* Keep headings with their content */
        .ProseMirror h1,
        .ProseMirror h2,
        .ProseMirror h3 {
          break-after: avoid;
          page-break-after: avoid;
        }

        /* Keep lists together */
        .ProseMirror ul,
        .ProseMirror ol {
          break-before: avoid;
          page-break-before: avoid;
        }

        /* Add ruler lines */
        .ProseMirror {
          background-image: 
            linear-gradient(rgba(0,0,0,0.05) 1px, transparent 1px);
          background-size: 100% 24px;
          background-position: 0 -1px;
          min-height: 11in;
        }

        .prose {
          max-width: none;
        }

        .prose :where(p):not(:where([class~="not-prose"] *)) {
          margin-top: 0.5em;
          margin-bottom: 0.5em;
        }

        .prose :where(ul):not(:where([class~="not-prose"] *)) {
          list-style-type: disc;
          padding-left: 1.5em;
        }

        .prose :where(ol):not(:where([class~="not-prose"] *)) {
          list-style-type: decimal;
          padding-left: 1.5em;
        }

        .prose :where(li):not(:where([class~="not-prose"] *)) {
          margin-top: 0.2em;
          margin-bottom: 0.2em;
        }

        /* Hide scrollbar but keep functionality */
        .editor-content {
          scrollbar-width: none;
          -ms-overflow-style: none;
        }
        .editor-content::-webkit-scrollbar {
          display: none;
        }
      `}} />
    </div>
  );
} 