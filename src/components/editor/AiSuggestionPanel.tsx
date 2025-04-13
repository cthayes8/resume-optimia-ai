import { Editor } from '@tiptap/react'
import { TextSelection } from '@tiptap/pm/state'
import { Button } from '@/components/ui/button'
import { useEffect, useState, useRef } from 'react'
import { Loader2 } from 'lucide-react'
import '@/components/suggestions/extension-styles.css'
import '@/components/suggestions/styles.scss'
import debounce from 'lodash/debounce'
import type { AiSuggestionRule } from '@tiptap-pro/extension-ai-suggestion'

// Extend the Editor events type
declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    aiSuggestion: {
      loadAiSuggestions: (rules?: AiSuggestionRule[]) => ReturnType
      loadAiSuggestionsDebounced: (rules?: AiSuggestionRule[]) => ReturnType
      applyAiSuggestion: (attrs: { suggestionId: string }) => ReturnType
      rejectAiSuggestion: (id: string) => ReturnType
      applyAllAiSuggestions: () => ReturnType
      setAiSuggestionContext: (context: string) => ReturnType
    }
  }
}

interface ReplacementOption {
  id: string
  addText: string
  reasoning?: string
  category?: string
}

interface Suggestion {
  id: string
  deleteText: string
  replacementOptions: ReplacementOption[]
  context?: string
  category?: string
  deleteRange?: { from: number; to: number }
  isSelected?: boolean
  isRejected?: boolean
}

interface AiSuggestionPanelProps {
  editor: Editor | null
}

export default function AiSuggestionPanel({ editor }: AiSuggestionPanelProps) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const lastSuggestionCount = useRef(0)
  const processingRef = useRef(false)

  // Helper function to get full sentence context
  const getFullSentenceContext = (text: string, storage: any) => {
    try {
      const doc = editor?.view.state.doc
      if (!doc) return text

      // Find the text in the document
      let fullContext = text
      doc.descendants((node, pos) => {
        if (node.isText && node.text?.includes(text)) {
          // Get the parent paragraph or heading
          let parent = doc.resolve(pos).parent
          if (parent.type.name === 'paragraph' || parent.type.name === 'heading') {
            fullContext = parent.textContent
          }
          return false
        }
      })
      return fullContext
    } catch (err) {
      console.error('Error getting full sentence context:', err)
      return text
    }
  }

  useEffect(() => {
    if (!editor) return;

    // Define update handler
    const updateHandler = () => {
      const aiStorage = editor.storage.aiSuggestion;
      if (aiStorage) {
        // Log the raw storage state
        console.log('AI Storage State:', {
          raw: aiStorage,
          suggestions: aiStorage.getSuggestions?.(),
          decorations: aiStorage.decorations,
          loading: aiStorage.isLoading,
        });

        // Get suggestions using the documented method
        const storageSuggestions = aiStorage.getSuggestions?.() || [];
        console.log('Raw suggestions from storage:', storageSuggestions);
        
        // Process suggestions to ensure proper structure
        const processedSuggestions = storageSuggestions.map(s => {
          // Ensure we have valid suggestion data
          if (!s || !s.deleteText) {
            console.log('Invalid suggestion:', s);
            return null;
          }

          // Ensure replacementOptions is always an array
          const options = Array.isArray(s.replacementOptions) 
            ? s.replacementOptions 
            : s.replacementOptions ? [s.replacementOptions] : [];

          // Add required properties to each option
          const processedOptions = options.map(opt => ({
            id: opt.id || Math.random().toString(36).substr(2, 9),
            addText: opt.addText || '',
            reasoning: opt.reasoning || 'Improves clarity and professionalism',
            category: opt.metadata?.category || s.metadata?.category || 'General Improvements'
          }));

          return {
            id: s.id,
            deleteText: s.deleteText,
            replacementOptions: processedOptions,
            context: s.context || getFullSentenceContext(s.deleteText, aiStorage),
            category: s.metadata?.category || 'General Improvements',
            deleteRange: s.deleteRange,
            isSelected: false,
            isRejected: false
          };
        }).filter(Boolean); // Remove any null suggestions

        console.log('Processed Suggestions:', processedSuggestions);
        
        // Only update state if we have valid suggestions
        if (processedSuggestions.length > 0) {
          setSuggestions(processedSuggestions);
        }
        
        setLoading(aiStorage.isLoading || false);
        setError(aiStorage.error || null);
      }
    };

    // Initial state
    updateHandler();

    // Subscribe to both update and transaction events
    editor.on('update', updateHandler);
    editor.on('transaction', updateHandler);

    return () => {
      editor.off('update', updateHandler);
      editor.off('transaction', updateHandler);
    };
  }, [editor]);

  // Update scroll to suggestion function
  const scrollToSuggestion = (id: string) => {
    const suggestion = suggestions.find(s => s.id === id)
    if (!suggestion?.deleteRange) return

    editor?.commands.focus()
    const { from } = suggestion.deleteRange
    
    // Create selection at the suggestion position
    const selection = TextSelection.create(
      editor?.state.doc,
      from,
      from
    )
    
    if (selection) {
      // Dispatch transaction with new selection
      editor?.view.dispatch(editor?.state.tr.setSelection(selection))
      
      // Scroll the DOM element into view
      const domElement = editor?.view.dom
      if (domElement) {
        domElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    }
  }

  // Group suggestions by category
  const groupedSuggestions = suggestions.reduce((acc, s) => {
    const category = s.category || 'General Improvements'
    if (!acc[category]) {
      acc[category] = []
    }
    acc[category].push(s)
    return acc
  }, {} as Record<string, Suggestion[]>)

  const apply = (id: string) => {
    console.log('Applying suggestion:', id)
    try {
      processingRef.current = true
      editor?.commands.applyAiSuggestion({ suggestionId: id })
      // Update local state immediately
      setSuggestions(prev => 
        prev.filter(s => s.id !== id)
      )
    } catch (err) {
      console.error('Error applying suggestion:', err)
      setError(err instanceof Error ? err : new Error('Failed to apply suggestion'))
    } finally {
      processingRef.current = false
    }
  }
  
  const reject = (id: string) => {
    console.log('Rejecting suggestion:', id)
    try {
      processingRef.current = true
      editor?.commands.rejectAiSuggestion(id)
      // Update local state immediately
      setSuggestions(prev =>
        prev.map(s => s.id === id ? { ...s, isRejected: true } : s)
      )
    } catch (err) {
      console.error('Error rejecting suggestion:', err)
      setError(err instanceof Error ? err : new Error('Failed to reject suggestion'))
    } finally {
      processingRef.current = false
    }
  }

  const handleRefresh = () => {
    if (editor) {
      setLoading(true);
      console.log('Manually refreshing suggestions...');
      editor.commands.loadAiSuggestions();
    }
  };

  if (!editor) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500">
        <p>Editor not initialized</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <div className="border-b p-4 bg-white flex-shrink-0">
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-lg font-medium">AI Suggestions</h2>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={loading}
              aria-label="Refresh suggestions"
            >
              Refresh
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => editor.commands.applyAllAiSuggestions()}
              disabled={suggestions.length === 0 || loading}
              aria-label="Apply all suggestions"
            >
              Apply All
            </Button>
          </div>
        </div>
      </div>

      <div 
        className="flex-1 overflow-y-auto p-4"
        role="region"
        aria-label="AI Suggestions"
      >
        {loading ? (
          <div className="flex items-center justify-center h-32 text-gray-500" role="status">
            <Loader2 className="h-5 w-5 animate-spin mr-2" aria-hidden="true" />
            <span>Analyzing your resume...</span>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-32 text-red-500" role="alert">
            <p className="text-sm mb-2">{error.message}</p>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleRefresh}
              aria-label="Try loading suggestions again"
            >
              Try Again
            </Button>
          </div>
        ) : suggestions.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32" role="status">
            <p className="text-sm text-muted-foreground text-center mb-2">
              No suggestions available
            </p>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleRefresh}
              aria-label="Check for new suggestions"
            >
              Check Again
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedSuggestions).map(([category, items]) => (
              <div key={category} className="space-y-4" role="group" aria-label={category}>
                <h3 className="text-md font-semibold text-gray-700">{category}</h3>
                {items.map((s) => (
                  <div 
                    key={s.id} 
                    className={`p-4 bg-white border rounded-lg shadow-sm transition-all ${
                      s.isSelected ? 'ring-2 ring-primary' : ''
                    } ${
                      s.isRejected ? 'opacity-50' : ''
                    }`}
                    role="article"
                    aria-label={`Suggestion for: ${s.deleteText}`}
                    tabIndex={0}
                  >
                    <div className="mb-4">
                      <div className="flex justify-between items-center mb-2">
                        <div className="text-sm text-gray-600">Current text:</div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => scrollToSuggestion(s.id)}
                          className="h-6 px-2"
                          aria-label="Scroll to this text in editor"
                        >
                          <span className="sr-only">Scroll to text</span>
                          🔍
                        </Button>
                      </div>
                      <div 
                        className="text-sm text-red-500 line-through mb-4 bg-red-50 p-2 rounded break-words whitespace-pre-wrap"
                        role="text"
                        aria-label="Text to be replaced"
                      >
                        {s.deleteText}
                      </div>
                      <div className="text-sm text-gray-600 mb-2">Suggested improvements:</div>
                      <div className="space-y-4">
                        {s.replacementOptions.map((option) => (
                          <div 
                            key={option.id} 
                            className="bg-green-50 p-2 rounded"
                            role="text"
                            aria-label="Suggested replacement"
                          >
                            <div className="text-sm text-green-600 mb-2 break-words whitespace-pre-wrap">
                              {option.addText}
                            </div>
                            <div className="text-xs text-gray-500 italic">
                              Why? {option.reasoning}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {!s.isRejected && (
                        <Button 
                          size="sm" 
                          onClick={() => apply(s.id)}
                          aria-label="Apply this suggestion"
                        >
                          Apply
                        </Button>
                      )}
                      {!s.isRejected && (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => reject(s.id)}
                          aria-label="Reject this suggestion"
                        >
                          Reject
                        </Button>
                      )}
                      {s.isRejected && (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => apply(s.id)}
                          aria-label="Undo rejection of this suggestion"
                        >
                          Undo Reject
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
