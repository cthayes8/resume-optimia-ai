import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Loader2, Wand2 } from 'lucide-react';
import { ResumeEditor } from '@/components/editor/ResumeEditor';
import { AISuggestions } from '@/components/suggestions/AISuggestions';

type SuggestionType = 'improvement' | 'addition' | 'removal';

interface Suggestion {
  id: string;
  type: SuggestionType;
  original: string;
  suggestion: string;
  explanation: string;
  section: string;
}

export default function OptimizePage() {
  const [content, setContent] = useState<string>("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleContentChange = (newContent: string) => {
    setContent(newContent);
  };

  const handleOptimize = async () => {
    setIsLoading(true);
    try {
      // TODO: Call AI service to get suggestions
      const mockSuggestions: Suggestion[] = [
        {
          id: "1",
          type: "improvement",
          original: "Managed a team",
          suggestion: "Led a cross-functional team of 5 engineers",
          explanation: "Be more specific about team size and composition",
          section: "experience"
        },
        {
          id: "2",
          type: "addition",
          original: "",
          suggestion: "Increased team productivity by 40% through process improvements",
          explanation: "Add quantifiable achievements",
          section: "experience"
        }
      ];
      setSuggestions(mockSuggestions);
    } catch (error) {
      console.error('Error getting suggestions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-6 max-w-7xl">
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Resume Optimizer</h1>
          <Button onClick={handleOptimize} disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Wand2 className="mr-2 h-4 w-4" />
                Optimize Resume
              </>
            )}
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Resume Editor</CardTitle>
              <CardDescription>
                Edit your resume content here. The AI will analyze it and provide suggestions for improvement.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResumeEditor
                content={content}
                onChange={handleContentChange}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>AI Suggestions</CardTitle>
              <CardDescription>
                Review and apply AI-generated suggestions to improve your resume.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AISuggestions
                suggestions={suggestions}
                onApplySuggestion={(suggestion) => {
                  // TODO: Implement applying suggestions
                  console.log('Applying suggestion:', suggestion);
                }}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
} 