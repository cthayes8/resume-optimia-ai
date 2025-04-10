
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';

interface ResumeEditorProps {
  content: string;
  editable?: boolean;
  className?: string;
}

export default function ResumeEditor({
  content,
  editable = false,
  className = '',
}: ResumeEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
    ],
    content,
    editable,
  });

  return (
    <div className={`prose max-w-none ${className}`}>
      <EditorContent editor={editor} />
    </div>
  );
}
