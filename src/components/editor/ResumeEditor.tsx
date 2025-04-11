import {
  EditorProvider,
  useCurrentEditor,
  EditorContent,
} from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Highlight from '@tiptap/extension-highlight';
import Typography from '@tiptap/extension-typography';
import TextAlign from '@tiptap/extension-text-align';
import Underline from '@tiptap/extension-underline';
import AiSuggestion from '@tiptap-pro/extension-ai-suggestion';
import Ai from '@tiptap-pro/extension-ai';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { createResumeAIRules, aiConfig } from '@/config/aiPrompts';
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  List,
  ListOrdered,
} from 'lucide-react';

interface ResumeEditorProps {
  content: string;
  onChange: (content: string) => void;
  optimizationId: number;
  jobDescription: string;
}

export default function ResumeEditor({ content, onChange, optimizationId, jobDescription }: ResumeEditorProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const pageHeight = 11 * 96;
  const marginHeight = 1 * 96;
  const [pages, setPages] = useState<number[]>([]);

  const extensions = [
    StarterKit,
    Highlight,
    Typography,
    Underline,
    TextAlign.configure({ types: ['heading', 'paragraph'] }),
    Ai.configure({
      appId: import.meta.env.VITE_TIPTAP_AI_APP_ID,
      token: import.meta.env.VITE_TIPTAP_AI_JWT_TOKEN,
      autocompletion: true,
    }),
    AiSuggestion.configure({
      appId: import.meta.env.VITE_TIPTAP_AI_APP_ID,
      token: import.meta.env.VITE_TIPTAP_AI_JWT_TOKEN,
      baseUrl: aiConfig.baseUrl,
      rules: createResumeAIRules(jobDescription),
      debounceTimeout: aiConfig.debounceTimeout || 800,
      loadOnStart: aiConfig.loadOnStart,
      reloadOnUpdate: aiConfig.reloadOnUpdate,
      context: jobDescription,
    }),
  ];

  return (
    <EditorProvider
      slotBefore={<EditorToolbar jobDescription={jobDescription} />}
      extensions={extensions}
      content={content}
      onUpdate={({ editor }) => {
        onChange(editor.getHTML());
        if (contentRef.current) {
          const height = contentRef.current.scrollHeight;
          const totalPages = Math.ceil(height / pageHeight);
          setPages(Array.from({ length: totalPages }, (_, i) => i + 1));
        }
      }}
    >
      <div className="flex w-full">
        <div className="flex-1 bg-white rounded shadow-sm p-4 relative" ref={contentRef}>
          <EditorContent />
          {pages.slice(1).map((p, i) => (
            <div
              key={p}
              className="absolute w-full border-t border-dashed border-gray-300 flex justify-center"
              style={{ top: `${(pageHeight * (i + 1)) - marginHeight}px` }}
            >
              <span className="bg-gray-100 text-gray-500 text-xs px-2 -mt-2">Page {p}</span>
            </div>
          ))}
        </div>
        <div className="w-[320px] border-l bg-gray-50 p-4">
          <SuggestionSidebar />
        </div>
      </div>
    </EditorProvider>
  );
}

function EditorToolbar({ jobDescription }: { jobDescription: string }) {
  const { editor } = useCurrentEditor();

  useEffect(() => {
    if (editor && jobDescription) {
      editor.commands.setAiSuggestionContext(jobDescription);
      editor.commands.setAiSuggestionRules(createResumeAIRules(jobDescription));
      editor.commands.loadAiSuggestions();
    }
  }, [editor, jobDescription]);

  if (!editor) return null;

  return (
    <div className="flex items-center gap-2 px-4 py-3 border-b bg-muted">
      <Button variant="ghost" size="icon" onClick={() => editor.chain().focus().toggleBold().run()}><Bold className="w-4 h-4" /></Button>
      <Button variant="ghost" size="icon" onClick={() => editor.chain().focus().toggleItalic().run()}><Italic className="w-4 h-4" /></Button>
      <Button variant="ghost" size="icon" onClick={() => editor.chain().focus().toggleUnderline().run()}><UnderlineIcon className="w-4 h-4" /></Button>
      <Button variant="ghost" size="icon" onClick={() => editor.chain().focus().toggleBulletList().run()}><List className="w-4 h-4" /></Button>
      <Button variant="ghost" size="icon" onClick={() => editor.chain().focus().toggleOrderedList().run()}><ListOrdered className="w-4 h-4" /></Button>
    </div>
  );
}

function SuggestionSidebar() {
  const { editor } = useCurrentEditor();
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      const all = editor?.storage?.aiSuggestion?.suggestions || [];
      setSuggestions(all);
      if (all.length > 0) setLoading(false);
    }, 1000);
    return () => clearInterval(interval);
  }, [editor]);

  if (!editor) return null;

  const apply = (id: string) => editor.commands.applyAiSuggestion({ suggestionId: id });
  const reject = (id: string) => editor.commands.rejectAiSuggestion( id );

  return (
    <div className="suggestions-sidebar">
      <h3 className="font-semibold text-lg mb-4">AI Suggestions</h3>
      {loading ? (
        <p className="text-sm text-gray-500">Loading suggestions...</p>
      ) : suggestions.length === 0 ? (
        <p className="text-sm text-gray-500">No suggestions found.</p>
      ) : (
        <ul className="space-y-4">
          {suggestions.map((s) => (
            <li key={s.id} className="p-3 bg-white rounded shadow border">
              <p className="text-sm mb-2">{s.replacement}</p>
              <div className="flex gap-2">
                <Button size="sm" onClick={() => apply(s.id)}>Apply</Button>
                <Button variant="outline" size="sm" onClick={() => reject(s.id)}>Reject</Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
