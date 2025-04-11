import { useEffect, useState } from 'react';
import { KeywordMatch } from '@/types/keywords';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2 } from 'lucide-react';
import { analyzeKeywords } from '@/utils/keywordAnalysis';

interface KeywordAnalysisProps {
  jobDescription: string;
  resumeContent: string;
}

export function KeywordAnalysis({ jobDescription, resumeContent }: KeywordAnalysisProps) {
  const [keywords, setKeywords] = useState<KeywordMatch[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function analyzeKeywordsLocally() {
      if (!jobDescription || !resumeContent) return;
      
      setLoading(true);
      setError(null);
      
      try {
        const data = analyzeKeywords(jobDescription, resumeContent);
        setKeywords(data);
      } catch (err) {
        setError('Failed to analyze keywords');
      } finally {
        setLoading(false);
      }
    }

    analyzeKeywordsLocally();
  }, [jobDescription, resumeContent]);

  if (loading) {
    return (
      <Card className="w-full">
        <CardContent className="pt-6 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="mt-2 text-sm text-muted-foreground">Extracting keywords...</p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="w-full">
        <CardContent className="pt-6">
          <p className="text-sm text-destructive">{error}</p>
        </CardContent>
      </Card>
    );
  }

  const getMatchTypeColor = (matchType: KeywordMatch['matchType']) => {
    switch (matchType) {
      case 'direct':
        return 'bg-green-500 text-white';
      case 'synonym':
        return 'bg-blue-500 text-white';
      case 'semantic':
        return 'bg-yellow-500 text-white';
      case 'none':
        return 'bg-red-500 text-white';
      default:
        return 'bg-gray-500 text-white';
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Keywords</CardTitle>
        <CardDescription>Analysis of important keywords from the job description</CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] pr-4">
          {keywords.map((keyword) => (
            <div
              key={keyword.keyword}
              className="mb-4 p-4 rounded-lg border"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h4 className="font-medium">{keyword.keyword}</h4>
                    <Badge className={getMatchTypeColor(keyword.matchType)}>
                      {keyword.matchType}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{keyword.explanation}</p>
                  {keyword.confidence > 0 && (
                    <div className="mt-2">
                      <div className="h-2 w-full bg-gray-200 rounded-full">
                        <div
                          className="h-2 bg-primary rounded-full"
                          style={{ width: `${keyword.confidence * 100}%` }}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Match confidence: {Math.round(keyword.confidence * 100)}%
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </ScrollArea>
      </CardContent>
    </Card>
  );
} 