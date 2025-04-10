
import { useState, useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle } from "lucide-react";

interface ResumeEditorProps {
  content: string;
  editable?: boolean;
  className?: string;
  onAccept?: () => void;
  onReject?: () => void;
  showActions?: boolean;
}

export default function ResumeEditor({
  content,
  editable = false,
  className = '',
  onAccept,
  onReject,
  showActions = false,
}: ResumeEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
    ],
    content,
    editable,
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
      <EditorContent editor={editor} />
      
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
    </div>
  );
}
