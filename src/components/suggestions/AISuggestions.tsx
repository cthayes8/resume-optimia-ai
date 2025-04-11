import { Editor } from '@tiptap/core';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Check, X, Loader2 } from 'lucide-react';

interface AISuggestionsProps {
  editor: Editor;
}

export function AISuggestions({ editor }: AISuggestionsProps) {
  if (!editor?.extensionStorage?.aiSuggestion) {
    return null;
  }

  const storage = editor.extensionStorage.aiSuggestion;
  const suggestions = storage.getSuggestions() || [];
  const isLoading = storage.isLoading;
  const error = storage.error;

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardContent className="pt-6 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="mt-2 text-sm text-muted-foreground">Analyzing your resume...</p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="w-full">
        <CardContent className="pt-6">
          <p className="text-sm text-destructive">Error loading suggestions: {error.message}</p>
        </CardContent>
      </Card>
    );
  }

  if (!suggestions.length) {
    return (
      <Card className="w-full">
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground text-center">No suggestions available</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>AI Suggestions</CardTitle>
        <CardDescription>Click on highlighted text to see suggestions</CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] pr-4">
          {suggestions.map((suggestion) => {
            const rule = suggestion.rule;
            return (
              <div
                key={suggestion.id}
                className="mb-4 p-4 rounded-lg border"
                style={{
                  borderColor: rule.color,
                }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="font-medium text-sm" style={{ color: rule.color }}>
                      {rule.title}
                    </h4>
                    <p className="text-sm text-muted-foreground mt-1">
                      Original: <span className="font-mono">{suggestion.deleteText}</span>
                    </p>
                    <p className="text-sm text-foreground mt-1">
                      Suggestion: <span className="font-mono">{suggestion.replacementOptions[0]?.addText}</span>
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => editor.commands.rejectAiSuggestion(suggestion.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-primary hover:text-primary hover:bg-primary/10"
                      onClick={() =>
                        editor.commands.applyAiSuggestion({
                          suggestionId: suggestion.id,
                          replacementOptionId: suggestion.replacementOptions[0]?.id,
                        })
                      }
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </ScrollArea>
      </CardContent>
    </Card>
  );
} 