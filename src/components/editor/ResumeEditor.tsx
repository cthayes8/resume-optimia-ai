import {
  useEditor,
  EditorContent,
  FloatingMenu,
  BubbleMenu,
  EditorProvider,
} from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Highlight from '@tiptap/extension-highlight';
import Typography from '@tiptap/extension-typography';
import TextAlign from '@tiptap/extension-text-align';
import TextStyle from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import Underline from '@tiptap/extension-underline';
import { Image } from '@tiptap/extension-image';
import Table from '@tiptap/extension-table';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import TableRow from '@tiptap/extension-table-row';
import { ExportDocx } from '@tiptap-pro/extension-export-docx';
import { ImportDocx } from '@tiptap-pro/extension-import-docx';
import AiSuggestion, { type AiSuggestionOptions, type AiSuggestionRule } from '@tiptap-pro/extension-ai-suggestion';
import Ai from '@tiptap-pro/extension-ai';
import CharacterCount from '@tiptap/extension-character-count';
import Focus from '@tiptap/extension-focus';
import FontFamily from '@tiptap/extension-font-family';
import Placeholder from '@tiptap/extension-placeholder';
import Subscript from '@tiptap/extension-subscript';
import Superscript from '@tiptap/extension-superscript';
import { createResumeAIRules, aiConfig } from '@/config/aiPrompts';
import AiSuggestionPanel from './AiSuggestionPanel';
import { useRef, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, Type, AlignLeft, AlignCenter, AlignRight, Superscript as SuperscriptIcon, Subscript as SubscriptIcon } from 'lucide-react';
import mammoth from 'mammoth';
import * as pdfjs from 'pdfjs-dist';
import { Decoration } from '@tiptap/pm/view'
import '@/components/suggestions/extension-styles.css'
import '@/components/suggestions/styles.scss'


// Set worker path for PDF.js
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

interface ResumeEditorProps {
  content: string;
  onChange: (content: string) => void;
  jobDescription: string;
}

const rules: AiSuggestionRule[] = [
  {
    id: 'action-verbs',
    title: 'Use Action Verbs',
    prompt: 'Replace passive or weak verbs with strong action verbs that demonstrate impact and leadership.',
    color: '#FF5630',
    backgroundColor: '#FFEBE6',
    metadata: { category: 'impact' }
  },
  {
    id: 'quantify-achievements',
    title: 'Quantify Achievements',
    prompt: 'Add specific numbers, percentages, or metrics to quantify achievements and demonstrate impact.',
    color: '#36B37E',
    backgroundColor: '#E3FCEF',
    metadata: { category: 'metrics' }
  },
  {
    id: 'technical-skills',
    title: 'Technical Skills',
    prompt: 'Highlight relevant technical skills, tools, and technologies used in each experience.',
    color: '#00B8D9',
    backgroundColor: '#E6FCFF',
    metadata: { category: 'skills' }
  },
  {
    id: 'industry-keywords',
    title: 'Industry Keywords',
    prompt: 'Include industry-specific keywords and phrases from the job description.',
    color: '#6554C0',
    backgroundColor: '#EAE6FF',
    metadata: { category: 'keywords' }
  },
  {
    id: 'concise-language',
    title: 'Concise Language',
    prompt: 'Make language more concise by removing unnecessary words and phrases.',
    color: '#FFAB00',
    backgroundColor: '#FFFAE6',
    metadata: { category: 'clarity' }
  },
  {
    id: 'accomplishment-focus',
    title: 'Focus on Accomplishments',
    prompt: 'Emphasize accomplishments and results rather than just listing job duties.',
    color: '#FF8B00',
    backgroundColor: '#FFF0E6',
    metadata: { category: 'impact' }
  }
]

export default function ResumeEditor({ content, onChange, jobDescription }: ResumeEditorProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [characterCount, setCharacterCount] = useState({ characters: 0, words: 0 });
  const hasInitializedRef = useRef(false);
  const shouldRefreshRef = useRef(false);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        bulletList: {
          keepMarks: true,
          keepAttributes: true,
        },
        orderedList: {
          keepMarks: true,
          keepAttributes: true,
        },
      }),
      Image.configure({
        inline: true,
      }),
      Highlight,
      Typography,
      TextStyle,
      Color,
      Underline,
      TextAlign.configure({
        types: ['heading', 'paragraph', 'bulletList', 'orderedList', 'listItem'],
        defaultAlignment: 'left',
      }),
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableCell,
      TableHeader,
      FontFamily.configure({
        types: ['textStyle'],
      }),
      Focus.configure({
        className: 'has-focus',
        mode: 'all',
      }),
      CharacterCount.configure({
        limit: null,
      }),
      Placeholder.configure({
        placeholder: 'Start typing your resume...',
      }),
      Subscript,
      Superscript,
      ExportDocx.configure({
        onCompleteExport: (result: Blob) => {
          setIsLoading(false);
          const url = URL.createObjectURL(result);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'optimized-resume.docx';
          a.click();
          URL.revokeObjectURL(url);
        },
      }),
      ImportDocx.configure({
        appId: import.meta.env.VITE_TIPTAP_AI_APP_ID,
        token: import.meta.env.VITE_TIPTAP_AI_JWT_TOKEN,
      }),
      Ai.configure({
        appId: import.meta.env.VITE_TIPTAP_AI_APP_ID,
        token: import.meta.env.VITE_TIPTAP_AI_JWT_TOKEN,
        autocompletion: true,
      }),
      AiSuggestion.configure({
        appId: import.meta.env.VITE_TIPTAP_AI_APP_ID,
        token: import.meta.env.VITE_TIPTAP_AI_JWT_TOKEN,
        rules: rules,
        debounceTimeout: 2000,
        loadOnStart: true,
        reloadOnUpdate: false,
        context: jobDescription || '',
        async resolver({ defaultResolver, ...options }) {
          if (!hasInitializedRef.current) {
            console.log('Initial AI Suggestion load');
            hasInitializedRef.current = true;
          } else if (!shouldRefreshRef.current) {
            console.log('Skipping automatic AI refresh');
            return [];
          }
          
          shouldRefreshRef.current = false;

          console.log('AI Suggestion Resolver Called:', {
            options,
            rules,
            jobDescription
          });
          
          return defaultResolver({
            ...options,
            apiResolver: async ({ html, rules }) => {
              try {
                console.log('Making API request with:', {
                  contentLength: html?.length,
                  rulesCount: rules?.length,
                });

                const htmlChunks = html.split(/(<\/p>|<\/h[1-6]>)/).filter(Boolean).map((chunk, index) => ({
                  id: `chunk-${index}`,
                  html: chunk,
                  generateSuggestions: true
                }));

                console.log('Created chunks:', {
                  totalChunks: htmlChunks.length,
                  sampleChunk: htmlChunks[0]
                });

                const response = await fetch('/api/suggestions', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({ 
                    html,
                    htmlChunks,
                    rules 
                  }),
                });

                if (!response.ok) {
                  const errorText = await response.text();
                  console.error('Suggestions API error:', {
                    status: response.status,
                    statusText: response.statusText,
                    error: errorText
                  });
                  throw new Error(`Failed to fetch suggestions: ${response.status} ${errorText}`);
                }

                const data = await response.json();
                console.log('Received suggestions response:', data);
                return data;
              } catch (error) {
                console.error('Error in suggestions resolver:', error);
                throw error;
              }
            },
          });
        }
      }),
    ],
    content,
    onCreate: ({ editor }) => {
      console.log('Editor Created with context:', jobDescription);
      if (!hasInitializedRef.current) {
        setTimeout(() => {
          editor.commands.loadAiSuggestions();
        }, 1000);
      }
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
      setCharacterCount({
        characters: editor.storage.characterCount.characters(),
        words: editor.storage.characterCount.words(),
      });

      const storage = editor.storage.aiSuggestion;
      if (storage) {
        const suggestions = storage.getSuggestions?.();
        console.log('AI Suggestion State:', {
          suggestions: suggestions?.length || 0,
          decorations: storage.decorations?.length || 0,
          isLoading: storage.isLoading,
          error: storage.error,
          rawSuggestions: suggestions
        });
      }
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose-base lg:prose-lg xl:prose-2xl max-w-none focus:outline-none min-h-[500px] p-4 prose-headings:font-bold prose-h1:text-3xl prose-h2:text-2xl prose-h3:text-xl prose-p:my-2 prose-ul:my-2 prose-ol:my-2 prose-li:my-1',
      },
    },
  });

  // Cleanup editor on unmount
  useEffect(() => {
    return () => {
      if (editor) {
        editor.destroy();
      }
      hasInitializedRef.current = false;
    };
  }, [editor]);

  // Update editor content when prop changes
  useEffect(() => {
    if (editor && content) {
      if (editor.getHTML() !== content) {
        editor.commands.setContent(content);
      }
    }
  }, [content, editor]);

  const handleDocxImport = async (arrayBuffer: ArrayBuffer) => {
    try {
      const result = await mammoth.convertToHtml({ 
        arrayBuffer,
      }, {
        styleMap: [
          "p[style-name='Normal'] => p:fresh",
          "p[style-name='Heading 1'] => h1:fresh",
          "p[style-name='Heading 2'] => h2:fresh",
          "p[style-name='Heading 3'] => h3:fresh",
          "p[style-name='Title'] => h1:fresh",
          "p[style-name='Subtitle'] => h2:fresh",
          "b => strong",
          "i => em",
          "u => u",
          "strike => s",
          "p:unordered-list(1) => ul > li:fresh",
          "p:unordered-list(2) => ul > li:fresh",
          "p:ordered-list(1) => ol > li:fresh",
          "p:ordered-list(2) => ol > li:fresh"
        ],
        ignoreEmptyParagraphs: false
      });

      // Clean up the HTML
      let cleanContent = result.value
        .replace(/<div[^>]*>/g, '')
        .replace(/<\/div>/g, '')
        .replace(/\s+class="[^"]*"/g, '')
        .replace(/\s+style="[^"]*"/g, '')
        .replace(/\s+align="[^"]*"/g, '')
        .replace(/<p>\s*<\/p>/g, '<p><br></p>')
        .replace(/\n\s*\n/g, '\n')
        .replace(/(<p[^>]*>)\s*(<br\s*\/?>)?\s*(<\/p>)/g, '<p><br></p>')
        .trim();

      editor?.commands.setContent(cleanContent);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to import document'));
    }
  };

  const handlePdfImport = async (arrayBuffer: ArrayBuffer) => {
    try {
      const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
      let content = '';
      
      // Extract text from all pages
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items
          .map((item: any) => item.str)
          .join(' ');
        
        // Add page break between pages except for the last page
        content += `<p>${pageText}</p>${i < pdf.numPages ? '<hr />' : ''}`;
      }

      editor?.commands.setContent(content);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to import PDF'));
    }
  };

  useEffect(() => {
    if (!editor || !content || !content.startsWith('data:')) return;

    setIsLoading(true);
    setError(null);

    const [header, base64Content] = content.split(',');
    const binaryContent = atob(base64Content);
    const array = new Uint8Array(binaryContent.length);
    for (let i = 0; i < binaryContent.length; i++) {
      array[i] = binaryContent.charCodeAt(i);
    }

    const arrayBuffer = array.buffer;
    const fileType = header.toLowerCase();

    editor.chain().clearContent().run();

    if (fileType.includes('pdf')) {
      handlePdfImport(arrayBuffer)
        .finally(() => setIsLoading(false));
    } else if (fileType.includes('wordprocessingml') || fileType.includes('msword')) {
      handleDocxImport(arrayBuffer)
        .finally(() => setIsLoading(false));
    } else {
      setError(new Error('Unsupported file type. Please upload a PDF, DOC, or DOCX file.'));
      setIsLoading(false);
    }
  }, [editor, content]);

  const handleRefresh = () => {
    if (editor) {
      shouldRefreshRef.current = true;
      editor.commands.loadAiSuggestions();
    }
  };

  if (!editor) {
    return <div>Loading editor...</div>;
  }

  const handleExport = () => {
    setIsLoading(true);
    editor.chain().exportDocx().run();
  };

  return (
    <div className="flex w-full h-full">
      <div className="flex-1 flex flex-col">
        <div className="border-b p-2 flex items-center gap-2 bg-white sticky top-0 z-10 shadow-sm flex-shrink-0">
          <Button
            onClick={handleExport}
            disabled={editor.isEmpty || isLoading}
            variant="outline"
            size="sm"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              'Export DOCX'
            )}
          </Button>

          <div className="h-6 w-px bg-gray-200 mx-2" />
          
          <div className="flex items-center gap-1">
            <Button
              onClick={() => editor.chain().focus().toggleBold().run()}
              disabled={!editor.can().chain().focus().toggleBold().run()}
              variant="ghost"
              size="sm"
              className={editor.isActive('bold') ? 'bg-muted' : ''}
            >
              B
            </Button>
            
            <Button
              onClick={() => editor.chain().focus().toggleItalic().run()}
              disabled={!editor.can().chain().focus().toggleItalic().run()}
              variant="ghost"
              size="sm"
              className={editor.isActive('italic') ? 'bg-muted' : ''}
            >
              I
            </Button>
            
            <Button
              onClick={() => editor.chain().focus().toggleUnderline().run()}
              disabled={!editor.can().chain().focus().toggleUnderline().run()}
              variant="ghost"
              size="sm"
              className={editor.isActive('underline') ? 'bg-muted' : ''}
            >
              U
            </Button>

            <Button
              onClick={() => editor.chain().focus().toggleSubscript().run()}
              disabled={!editor.can().chain().focus().toggleSubscript().run()}
              variant="ghost"
              size="sm"
              className={editor.isActive('subscript') ? 'bg-muted' : ''}
            >
              <SubscriptIcon className="h-4 w-4" />
            </Button>

            <Button
              onClick={() => editor.chain().focus().toggleSuperscript().run()}
              disabled={!editor.can().chain().focus().toggleSuperscript().run()}
              variant="ghost"
              size="sm"
              className={editor.isActive('superscript') ? 'bg-muted' : ''}
            >
              <SuperscriptIcon className="h-4 w-4" />
            </Button>
          </div>

          <div className="h-6 w-px bg-gray-200 mx-2" />
          
          <div className="flex items-center gap-1">
            <Button
              onClick={() => editor.chain().focus().setTextAlign('left').run()}
              variant="ghost"
              size="sm"
              className={editor.isActive({ textAlign: 'left' }) ? 'bg-muted' : ''}
            >
              <AlignLeft className="h-4 w-4" />
            </Button>
            
            <Button
              onClick={() => editor.chain().focus().setTextAlign('center').run()}
              variant="ghost"
              size="sm"
              className={editor.isActive({ textAlign: 'center' }) ? 'bg-muted' : ''}
            >
              <AlignCenter className="h-4 w-4" />
            </Button>
            
            <Button
              onClick={() => editor.chain().focus().setTextAlign('right').run()}
              variant="ghost"
              size="sm"
              className={editor.isActive({ textAlign: 'right' }) ? 'bg-muted' : ''}
            >
              <AlignRight className="h-4 w-4" />
            </Button>
          </div>

          <Button
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            variant="ghost"
            size="sm"
            className={editor.isActive('bulletList') ? 'bg-muted' : ''}
          >
            •
          </Button>
          
          <Button
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            variant="ghost"
            size="sm"
            className={editor.isActive('orderedList') ? 'bg-muted' : ''}
          >
            1.
          </Button>

          <Button
            onClick={() => editor.chain().focus().sinkListItem('listItem').run()}
            disabled={!editor.can().sinkListItem('listItem')}
            variant="ghost"
            size="sm"
          >
            →
          </Button>
          
          <Button
            onClick={() => editor.chain().focus().liftListItem('listItem').run()}
            disabled={!editor.can().liftListItem('listItem')}
            variant="ghost"
            size="sm"
          >
            ←
          </Button>
        </div>

        <div className="flex-1 relative bg-white overflow-auto">
          {isLoading && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white z-50">
              <div className="flex items-center gap-2">
                <Loader2 className="h-5 w-5 animate-spin" />
                Processing...
              </div>
            </div>
          )}
          {error && (
            <div className="mb-4 p-4 bg-red-100 text-red-700 rounded-md border border-red-200">
              {error.message}
            </div>
          )}
          <EditorContent 
            editor={editor} 
            className="h-full prose prose-sm sm:prose-base lg:prose-lg xl:prose-2xl max-w-none p-4 focus:outline-none prose-headings:font-bold prose-h1:text-3xl prose-h2:text-2xl prose-h3:text-xl prose-p:my-2 prose-ul:my-2 prose-ol:my-2 prose-li:my-1" 
          />
          <div className="absolute bottom-2 right-2 text-sm text-gray-500">
            {characterCount.words} words, {characterCount.characters} characters
          </div>
        </div>
      </div>

      <div className="w-[320px] border-l bg-gray-50 flex flex-col h-full">
        <AiSuggestionPanel editor={editor} />
      </div>

      <BubbleMenu
        editor={editor}
        tippyOptions={{ duration: 100 }}
        className="bg-white shadow-lg border rounded-lg p-1 flex gap-1"
      >
        <Button
          onClick={() => editor.chain().focus().toggleBold().run()}
          variant="ghost"
          size="sm"
          className={editor.isActive('bold') ? 'bg-muted' : ''}
        >
          B
        </Button>
        <Button
          onClick={() => editor.chain().focus().toggleItalic().run()}
          variant="ghost"
          size="sm"
          className={editor.isActive('italic') ? 'bg-muted' : ''}
        >
          I
        </Button>
        <Button
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          variant="ghost"
          size="sm"
          className={editor.isActive('underline') ? 'bg-muted' : ''}
        >
          U
        </Button>
      </BubbleMenu>

      <FloatingMenu
        editor={editor}
        tippyOptions={{ duration: 100 }}
        className="bg-white shadow-lg border rounded-lg p-1"
      >
        <Button
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          variant="ghost"
          size="sm"
          className={editor.isActive('heading', { level: 1 }) ? 'bg-muted' : ''}
        >
          H1
        </Button>
        <Button
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          variant="ghost"
          size="sm"
          className={editor.isActive('heading', { level: 2 }) ? 'bg-muted' : ''}
        >
          H2
        </Button>
        <Button
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          variant="ghost"
          size="sm"
          className={editor.isActive('bulletList') ? 'bg-muted' : ''}
        >
          •
        </Button>
      </FloatingMenu>
    </div>
  );
}
