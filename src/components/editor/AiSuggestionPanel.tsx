import { Editor } from '@tiptap/react'
import { TextSelection } from '@tiptap/pm/state'
import { Button } from '@/components/ui/button'
import { useEffect, useState, useRef } from 'react'
import { Loader2 } from 'lucide-react'
import '@/components/suggestions/extension-styles.css'
import '@/components/suggestions/styles.scss'
import debounce from 'lodash/debounce'
import type { AiSuggestionRule } from '@tiptap-pro/extension-ai-suggestion'

// These types should match the TipTap extension's types as closely as possible
// without extending the type system via declaration merging
interface ReplacementOption {
  id: string
  addText: string
  reasoning?: string
  category?: string
  metadata?: {
    category?: string
  }
}

interface Suggestion {
  id: string
  deleteText: string
  replacementOptions: ReplacementOption[]
  context?: string
  category?: string
  deleteRange?: { from: number; to: number }
  deleteSlice?: any
  rule?: any
  isSelected?: boolean
  isRejected?: boolean
  metadata?: {
    category?: string
  }
}

// Let's update the mapping of categories for display
const CATEGORY_LABELS = {
  'action-verbs': 'Action Verbs',
  'quantify-achievements': 'Quantify Achievements',
  'technical-skills': 'Technical Skills', 
  'industry-keywords': 'Industry Keywords',
  'concise-language': 'Concise Language',
  'accomplishment-focus': 'Focus on Accomplishments',
  'general': 'General Improvements'
};

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
      try {
        const aiStorage = editor.storage.aiSuggestion;
        
        if (!aiStorage) {
          console.log('No AI storage available');
          setLoading(false);
          return;
        }

        // Log the raw storage state
        console.log('AI Storage State:', {
          storage: aiStorage,
          suggestions: aiStorage.getSuggestions?.(),
          decorations: aiStorage.decorations,
          loading: aiStorage.isLoading,
          hasDecorations: !!aiStorage.decorations && aiStorage.decorations.size > 0
        });

        // Get suggestions from storage
        let storageSuggestions = [];
        
        // Check all possible ways to access suggestions
        if (typeof aiStorage.getSuggestions === 'function') {
          storageSuggestions = aiStorage.getSuggestions() || [];
        } else if (Array.isArray(aiStorage.suggestions)) {
          storageSuggestions = aiStorage.suggestions;
        } else if (Array.isArray(aiStorage.raw?.suggestions)) {
          storageSuggestions = aiStorage.raw.suggestions;
        }

        if (storageSuggestions.length > 0) {
          console.log('Raw suggestions found in storage:', storageSuggestions.length, 'suggestions');
        }
        
        // Process suggestions to ensure proper structure
        const processedSuggestions = storageSuggestions
          .filter(s => s !== null && typeof s === 'object')
          .map(s => {
            // Ensure we have valid suggestion data
            if (!s.deleteText && typeof s.deleteText !== 'string') {
              console.log('Invalid suggestion (missing deleteText):', s);
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
              category: opt.metadata?.category || opt.category || s.metadata?.category || s.category || 'General Improvements'
            }));

            return {
              id: s.id || Math.random().toString(36).substr(2, 9),
              deleteText: s.deleteText,
              replacementOptions: processedOptions.length > 0 ? processedOptions : [{
                id: `default-${s.id}`,
                addText: s.deleteText,
                reasoning: 'No specific improvements suggested',
                category: 'General Improvements'
              }],
              context: s.context || getFullSentenceContext(s.deleteText, aiStorage),
              category: s.metadata?.category || s.category || 'General Improvements',
              deleteRange: s.deleteRange,
              deleteSlice: s.deleteSlice,
              rule: s.rule,
              isSelected: false,
              isRejected: false,
              metadata: {
                category: s.metadata?.category || s.category || 'General Improvements'
              }
            };
          }).filter(Boolean); // Remove any null suggestions

        if (processedSuggestions.length > 0) {
          console.log('Processed Suggestions:', processedSuggestions.length, 'suggestions');
        }
        
        // Only update state if we have valid suggestions or if we've transitioned from loading to not loading
        if (processedSuggestions.length > 0 || lastSuggestionCount.current > 0 || aiStorage.isLoading === false) {
          setSuggestions(processedSuggestions);
          lastSuggestionCount.current = processedSuggestions.length;
        }
        
        setLoading(aiStorage.isLoading === true);
        setError(aiStorage.error || null);
      } catch (err) {
        console.error('Error processing suggestions:', err);
        setLoading(false);
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
    // Get the category from either metadata or directly from the suggestion
    const category = s.metadata?.category || s.category || s.rule?.id || 'general';
    
    // Get the display label for the category
    const displayCategory = CATEGORY_LABELS[category as keyof typeof CATEGORY_LABELS] || category || 'General Improvements';
    
    if (!acc[displayCategory]) {
      acc[displayCategory] = [];
    }
    acc[displayCategory].push(s);
    return acc;
  }, {} as Record<string, Suggestion[]>);

  const apply = (id: string) => {
    console.log('Applying suggestion:', id);
    try {
      processingRef.current = true;
      
      // Get the suggestion from our state
      const suggestion = suggestions.find(s => s.id === id);
      if (!suggestion) {
        console.error('Suggestion not found in local state:', id);
        return;
      }
      
      // Get the editor state and document
      const { state } = editor.view;
      const { doc } = state;
      
      // Find the exact text in the document
      const deleteText = suggestion.deleteText;
      let foundRange = null;
      
      // Try to find the exact text first
      doc.nodesBetween(0, doc.content.size, (node, pos) => {
        if (node.isText && node.text && node.text.includes(deleteText)) {
          const start = pos + node.text.indexOf(deleteText);
          foundRange = { from: start, to: start + deleteText.length };
          return false; // Stop searching once found
        }
        return true; // Continue searching
      });
      
      // If not found, try a fuzzy match or partial match
      if (!foundRange) {
        // Try to match just the first 15-20 chars of the text
        const shortenedText = deleteText.substring(0, Math.min(20, deleteText.length));
        if (shortenedText.length > 10) {
          doc.nodesBetween(0, doc.content.size, (node, pos) => {
            if (node.isText && node.text && node.text.includes(shortenedText)) {
              // Find where the short match starts
              const matchIndex = node.text.indexOf(shortenedText);
              const start = pos + matchIndex;
              // Either use the actual text length if it fully matches, or just the shortened length
              const end = node.text.substring(matchIndex).startsWith(deleteText) 
                ? start + deleteText.length
                : start + shortenedText.length;
              
              foundRange = { from: start, to: end };
              console.log('Found partial match for text', { shortenedText, fullText: deleteText, match: node.text.substring(matchIndex, matchIndex + 30) });
              return false;
            }
            return true;
          });
        }
      }
      
      if (!foundRange) {
        console.error('Could not find text to replace:', deleteText);
        setError(new Error(`Could not find text to replace. It may have been modified.`));
        return;
      }
      
      // Get the replacement text from the first option
      const replacementOption = suggestion.replacementOptions?.[0];
      if (!replacementOption || !replacementOption.addText) {
        console.error('No valid replacement option found for suggestion:', id);
        setError(new Error('No valid replacement found'));
        return;
      }
      
      const addText = replacementOption.addText;
      
      // Apply the replacement using the transaction API directly
      const tr = editor.view.state.tr;
      tr.delete(foundRange.from, foundRange.to);
      tr.insert(foundRange.from, editor.view.state.schema.text(addText));
      editor.view.dispatch(tr);
      
      // Update local state to remove the suggestion
      setSuggestions(prev => prev.filter(s => s.id !== id));
    } catch (err) {
      console.error('Error applying suggestion:', err);
      setError(err instanceof Error ? err : new Error('Failed to apply suggestion'));
    } finally {
      processingRef.current = false;
    }
  }
  
  const reject = (id: string) => {
    console.log('Rejecting suggestion:', id);
    try {
      processingRef.current = true;
      
      // Update local state to mark the suggestion as rejected
      setSuggestions(prev =>
        prev.map(s => s.id === id ? { ...s, isRejected: true } : s)
      );
    } catch (err) {
      console.error('Error rejecting suggestion:', err);
      setError(err instanceof Error ? err : new Error('Failed to reject suggestion'));
    } finally {
      processingRef.current = false;
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
