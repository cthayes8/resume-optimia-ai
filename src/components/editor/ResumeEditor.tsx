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
import { supabase } from '@/lib/supabase';
import { createResumeAIRules, aiConfig } from '@/config/aiPrompts';
import OpenAI from 'openai';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true // Note: In production, API calls should be made from the backend
});

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
  const [apiStatus, setApiStatus] = useState<'unknown' | 'online' | 'offline'>('unknown');
  const contentRef = useRef<HTMLDivElement>(null);
  const pageHeight = 11 * 96; // 11 inches in pixels at 96 DPI
  const marginHeight = 1 * 96; // 1 inch margins

  // Add a ref to track the loading state
  const hasLoadedSuggestions = useRef(false);
  const hasAttemptedInitialLoad = useRef(false);

  // Add state for job description modal
  const [showJobDescriptionModal, setShowJobDescriptionModal] = useState<boolean>(false);

  // Check if the API server is responsive
  useEffect(() => {
    async function checkApiStatus() {
      try {
        console.log("Checking API status...");
        const API_BASE_URL = 'http://localhost:3001';
        
        // First try health-check endpoint
        try {
          const response = await fetch(`${API_BASE_URL}/api/health-check`, { 
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
            signal: AbortSignal.timeout(3000)
          });
          
          if (response.ok) {
            console.log("API is online and responsive (health check)");
            setApiStatus('online');
            return;
          }
        } catch (healthCheckError) {
          console.log("Health check endpoint not available, trying api root");
        }
        
        // If health check fails, try the main API endpoint
        try {
          const response = await fetch(`${API_BASE_URL}/api`, { 
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
            signal: AbortSignal.timeout(3000)
          });
          
          if (response.ok) {
            console.log("API is online and responsive (root endpoint)");
            setApiStatus('online');
            return;
          }
        } catch (apiRootError) {
          console.log("API root endpoint not available either");
        }
        
        // If both fail, try a PING to the server without specific path
        try {
          const response = await fetch(`${API_BASE_URL}`, { 
            method: 'GET',
            signal: AbortSignal.timeout(3000)
          });
          
          if (response.ok || response.status < 500) {
            // Any non-server error response means server is up
            console.log("API server is responsive (base URL)");
            setApiStatus('online');
            return;
          }
        } catch (pingError) {
          console.error("Cannot connect to API server at all", pingError);
        }
        
        // If we get here, all checks failed
        console.warn("API is offline or unreachable");
        setApiStatus('offline');
      } catch (error) {
        console.error("API check failed completely:", error);
        setApiStatus('offline');
      }
    }
    
    checkApiStatus();
  }, []);

  useEffect(() => {
    async function fetchJobDescription() {
      try {
        console.log('Fetching job description for optimization ID:', optimizationId);
        
        // First try to get from optimization_sessions table
        const { data: sessionData, error: sessionError } = await supabase
          .from('optimization_sessions')
          .select(`
            id,
            job_description_id,
            job_descriptions (
              data
            )
          `)
          .eq('id', String(optimizationId))
          .maybeSingle();

        if (sessionError) {
          console.error('Error fetching optimization session:', sessionError);
        } else if (sessionData?.job_descriptions?.data) {
          // Extract job description from the related data
          const jdData = sessionData.job_descriptions.data;
          let extractedJD = '';
          
          if (typeof jdData === 'string') {
            extractedJD = jdData;
          } else if (typeof jdData === 'object' && jdData !== null) {
            if ('content' in jdData) {
              extractedJD = String(jdData.content);
            } else if ('job_description' in jdData) {
              extractedJD = String(jdData.job_description);
            }
          }
          
          if (extractedJD) {
            console.log('Job description loaded successfully from session');
            setJobDescription(extractedJD);
            return; // Exit early if we found the job description
          }
        }
        
        // Fallback: Look for job description directly in local storage
        const storedJobDescription = localStorage.getItem('resumeOptimia_results_jobDescription');
        if (storedJobDescription) {
          console.log('Using job description from localStorage');
          setJobDescription(storedJobDescription);
        } else {
          console.log('No job description found');
        }
      } catch (error) {
        console.error('Error fetching job description:', error);
      }
    }

    fetchJobDescription();
  }, [optimizationId]);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Highlight,
      Typography,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Underline,
      AiSuggestion.configure({
        appId: import.meta.env.VITE_TIPTAP_AI_APP_ID, 
        token: import.meta.env.VITE_TIPTAP_AI_JWT_TOKEN,
        baseUrl: aiConfig.baseUrl,
        rules: createResumeAIRules(jobDescription),
        initialSuggestions: [],
        initialRejections: [],
        debounceTimeout: aiConfig.debounceTimeout || 800,
        loadOnStart: aiConfig.loadOnStart,
        reloadOnUpdate: aiConfig.reloadOnUpdate,
        context: jobDescription || null,
        onLoadSuggestionsError: (error) => {
          console.error('Error loading AI suggestions:', error);
          setApiStatus('offline');
        },
      }),
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
      
      // Calculate page breaks based on content height
      if (contentRef.current) {
        const contentHeight = contentRef.current.scrollHeight;
        const totalPages = Math.ceil(contentHeight / pageHeight);
        
        const newPages = [];
        for (let i = 1; i <= totalPages; i++) {
          newPages.push(i);
        }
        
        setPages(newPages);
      }
    },
  });
  
  // Function to update job description
  const updateJobDescription = async (newJobDescription: string) => {
    setJobDescription(newJobDescription);
    setShowJobDescriptionModal(false);
    
    // Update context and rules in TipTap AI suggestion
    if (editor && editor.commands) {
      // Update the context
      if (editor.commands.setAiSuggestionContext) {
        editor.commands.setAiSuggestionContext(newJobDescription);
        console.log('Updated AI suggestion context with new job description');
      }
      
      // Update the rules with the new job description
      if (editor.commands.setAiSuggestionRules) {
        editor.commands.setAiSuggestionRules(createResumeAIRules(newJobDescription));
        console.log('Updated AI suggestion rules with new job description');
      }
      
      // Reload suggestions
      setTimeout(() => {
        if (editor.commands.loadAiSuggestions) {
          editor.commands.loadAiSuggestions();
          console.log('Reloading suggestions with new job description');
        }
      }, 1000);
    }
    
    // Update localStorage
    localStorage.setItem('resumeOptimia_results_jobDescription', newJobDescription);
    
    try {
      // Update database if we have a session ID
      if (optimizationId) {
        const { data: sessionData } = await supabase
          .from('optimization_sessions')
          .select('job_description_id')
          .eq('id', String(optimizationId))
          .maybeSingle();
        
        if (sessionData?.job_description_id) {
          const { error } = await supabase
            .from('job_descriptions')
            .update({ data: newJobDescription })
            .eq('id', sessionData.job_description_id);
            
          if (error) {
            console.error('Error updating job description in database:', error);
          } else {
            console.log('Job description updated in database');
          }
        }
      }
    } catch (error) {
      console.error('Error updating job description:', error);
    }
  };

  // Helper function to handle heading changes
  const handleHeadingChange = (value: string) => {
    if (!editor) return;
    
    if (value === 'p') {
      editor.chain().focus().setParagraph().run();
    } else {
      editor.chain().focus().toggleHeading({ level: parseInt(value) as Level }).run();
    }
  };

  // Load suggestions effect
  useEffect(() => {
    if (!editor) return;

    const loadSuggestions = async () => {
      try {
        console.log('Attempting to load AI suggestions...');
        console.log('Editor instance:', editor);
        console.log('Available extensions:', editor.extensionManager.extensions.map(ext => ext.name));
        console.log('Available commands:', Object.keys(editor.commands));
        
        const hasAiSuggestion = editor.extensionManager.extensions.some(
          extension => extension.name === 'aiSuggestion'
        );
        
        console.log('AI Suggestion extension available:', hasAiSuggestion);
        
        if (hasAiSuggestion && typeof editor.commands.loadAiSuggestions === 'function') {
          console.log('loadAiSuggestions command is available, calling it');
          editor.commands.loadAiSuggestions();
          console.log('loadAiSuggestions command called successfully');
        } else {
          console.error('loadAiSuggestions command not available or AI extension not fully initialized');
          console.log('Extension storage:', editor.extensionStorage);
        }
      } catch (error) {
        console.error('Error loading suggestions:', error);
        
        // Retry after a longer delay if loading fails
        setTimeout(() => {
          try {
            console.log('Retrying to load AI suggestions...');
            const hasAiSuggestion = editor.extensionManager.extensions.some(
              extension => extension.name === 'aiSuggestion'
            );
            
            console.log('On retry: AI Suggestion extension available:', hasAiSuggestion);
            
            if (hasAiSuggestion && typeof editor.commands.loadAiSuggestions === 'function') {
              editor.commands.loadAiSuggestions();
              console.log('Retry successful');
            } else {
              console.error('loadAiSuggestions command still unavailable on retry');
              // Try a different approach - access extension directly if possible
              try {
                const aiExtension = editor.extensionManager.extensions.find(
                  extension => extension.name === 'aiSuggestion'
                );
                console.log('Found AI extension directly:', aiExtension);
                
                if (aiExtension && aiExtension.storage && typeof aiExtension.storage.loadSuggestions === 'function') {
                  console.log('Trying to call loadSuggestions directly on extension storage');
                  aiExtension.storage.loadSuggestions();
                }
              } catch (directAccessError) {
                console.error('Direct extension access failed:', directAccessError);
              }
            }
          } catch (retryError) {
            console.error('Error loading suggestions after retry:', retryError);
          }
        }, 5000); // Longer retry delay
      }
    };

    // Add a longer delay to ensure the editor is fully initialized
    const timer = setTimeout(() => {
      loadSuggestions();
    }, 3000);
    
    return () => clearTimeout(timer);
  }, [editor, jobDescription]);

  // Add an effect to verify TipTap Pro extension initialization
  useEffect(() => {
    if (!editor) return;
    
    // Check if TipTap Pro extension is properly initialized
    const hasAiSuggestion = editor.extensionManager.extensions.some(
      extension => extension.name === 'aiSuggestion'
    );
    
    console.log('TipTap Pro AiSuggestion extension available:', hasAiSuggestion);
    
    // Check if key commands are available
    if (hasAiSuggestion) {
      console.log('Available editor commands:', Object.keys(editor.commands));
    }
  }, [editor]);

  if (!editor) {
    return null;
  }

  // Modal for job description input
  const JobDescriptionModal = () => {
    const [tempJobDescription, setTempJobDescription] = useState(jobDescription);
    
    if (!showJobDescriptionModal) return null;
    
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-3/4 max-w-3xl max-h-[80vh] flex flex-col">
          <h2 className="text-xl font-bold mb-4">Update Job Description</h2>
          <p className="text-sm text-gray-600 mb-2">Current job description has {jobDescription.length} characters. Paste the correct job description below:</p>
          
          <textarea 
            className="w-full flex-grow border rounded p-2 mb-4 font-mono text-sm"
            value={tempJobDescription}
            onChange={(e) => setTempJobDescription(e.target.value)}
            rows={15}
          />
          
          <div className="flex justify-end gap-2">
            <Button 
              variant="outline" 
              onClick={() => setShowJobDescriptionModal(false)}
            >
              Cancel
            </Button>
            <Button 
              onClick={() => updateJobDescription(tempJobDescription)}
            >
              Update Job Description
            </Button>
          </div>
        </div>
      </div>
    );
  };

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

                <Toggle
                  pressed={editor.isActive('underline')}
                  onPressedChange={() => editor.chain().focus().toggleUnderline().run()}
                  aria-label="Toggle underline"
                >
                  <UnderlineIcon className="h-4 w-4" />
                </Toggle>

                <div className="h-6 w-px bg-border" />

                <Toggle
                  pressed={editor.isActive('bulletList')}
                  onPressedChange={() => editor.chain().focus().toggleBulletList().run()}
                  aria-label="Toggle bullet list"
                >
                  <List className="h-4 w-4" />
                </Toggle>

                <Toggle
                  pressed={editor.isActive('orderedList')}
                  onPressedChange={() => editor.chain().focus().toggleOrderedList().run()}
                  aria-label="Toggle ordered list"
                >
                  <ListOrdered className="h-4 w-4" />
                </Toggle>

                <div className="h-6 w-px bg-border" />

                <Toggle
                  pressed={editor.isActive({ textAlign: 'left' })}
                  onPressedChange={() => editor.chain().focus().setTextAlign('left').run()}
                  aria-label="Align left"
                >
                  <AlignLeft className="h-4 w-4" />
                </Toggle>

                <Toggle
                  pressed={editor.isActive({ textAlign: 'center' })}
                  onPressedChange={() => editor.chain().focus().setTextAlign('center').run()}
                  aria-label="Align center"
                >
                  <AlignCenter className="h-4 w-4" />
                </Toggle>

                <Toggle
                  pressed={editor.isActive({ textAlign: 'right' })}
                  onPressedChange={() => editor.chain().focus().setTextAlign('right').run()}
                  aria-label="Align right"
                >
                  <AlignRight className="h-4 w-4" />
                </Toggle>

                <Toggle
                  pressed={editor.isActive({ textAlign: 'justify' })}
                  onPressedChange={() => editor.chain().focus().setTextAlign('justify').run()}
                  aria-label="Align justify"
                >
                  <AlignJustify className="h-4 w-4" />
                </Toggle>

                <div className="h-6 w-px bg-border ml-auto" />
                
                {/* Error message indicator (kept as it's basic UI feedback) */}
                {apiStatus === 'offline' && (
                  <div className="flex items-center ml-2 text-red-500">
                    <span className="text-xs">Error loading suggestions.</span>
                    <Button 
                      variant="link" 
                      size="sm"
                      className="text-xs p-0 h-auto ml-2"
                      onClick={() => {
                        if (editor && editor.commands.loadAiSuggestions) {
                          editor.commands.loadAiSuggestions();
                        }
                      }}
                    >
                      Try again
                    </Button>
                  </div>
                )}
                
                {/* Debug button */}
                <Button 
                  variant="outline" 
                  size="sm"
                  className="text-xs h-7"
                  onClick={() => {
                    if (editor.commands.loadAiSuggestions) {
                      editor.commands.loadAiSuggestions();
                    }
                  }}
                >
                  Debug
                </Button>
              </div>
              <div ref={contentRef} className="p-4">
                <EditorContent editor={editor} />
                
                {/* Page break indicators */}
                <div className="relative">
                  {pages.slice(1).map((page, index) => (
                    <div 
                      key={page}
                      className="absolute w-full border-t border-dashed border-gray-300 flex justify-center"
                      style={{ 
                        top: (pageHeight * (index + 1)) - marginHeight + 'px',
                      }}
                    >
                      <span className="bg-gray-100 text-gray-500 text-xs px-2 -mt-2">
                        Page {page}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
          <div className="w-96">
            <div className="sticky top-16 space-y-4">
              <Button 
                className="w-full"
                onClick={() => setShowJobDescriptionModal(true)}
              >
                Edit Job Description
              </Button>
              
              {/* Keep just the Load AI Suggestions button */}
              <Button 
                className="w-full"
                onClick={() => {
                  if (editor && editor.commands.loadAiSuggestions) {
                    editor.commands.loadAiSuggestions();
                    console.log("Manually loaded AI suggestions");
                  }
                }}
              >
                Load AI Suggestions
              </Button>
            </div>
          </div>
        </div>
      </div>
      
      <JobDescriptionModal />
    </div>
  );
} 