import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { KeywordMatch } from '@/types/keywords';

interface KeywordAnalysisProps {
  jobDescription: string;
  resumeContent: string;
}

export function KeywordAnalysis({ jobDescription, resumeContent }: KeywordAnalysisProps) {
  const [keywordAnalysis, setKeywordAnalysis] = useState<KeywordMatch[]>([]);
  const [score, setScore] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchKeywordAnalysis = async () => {
      if (!jobDescription || !resumeContent) {
        console.log('Missing required content for keyword analysis');
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch('http://localhost:3001/api/analyze-keywords', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ jobDescription, resumeContent }),
        });

        if (!response.ok) {
          throw new Error('Failed to analyze keywords');
        }

        const result = await response.json();
        setKeywordAnalysis(result.keywords);
        setScore(result.score);
      } catch (error) {
        console.error('Error analyzing keywords:', error);
        setError(error instanceof Error ? error.message : 'Failed to analyze keywords');
      } finally {
        setIsLoading(false);
      }
    };

    fetchKeywordAnalysis();
  }, [jobDescription, resumeContent]);

  const getMatchTypeColor = (matchType: string) => {
    switch (matchType) {
      case 'direct':
        return 'bg-green-100 text-green-800';
      case 'synonym':
        return 'bg-blue-100 text-blue-800';
      case 'semantic':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Analyzing Keywords...</CardTitle>
          <CardDescription>Please wait while we analyze your resume</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Error</CardTitle>
          <CardDescription className="text-red-500">{error}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Keyword Analysis</CardTitle>
        <CardDescription>
          Match score: {score.toFixed(1)}%
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2">
          {keywordAnalysis.map((analysis) => (
            <Tooltip key={analysis.keyword}>
              <TooltipTrigger>
                <Badge
                  className={`${getMatchTypeColor(analysis.matchType)} cursor-help`}
                  variant="secondary"
                >
                  {analysis.keyword}
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                <p className="max-w-xs text-sm">
                  <span className="font-semibold">Match type:</span> {analysis.matchType}
                  <br />
                  <span className="font-semibold">Confidence:</span> {(analysis.confidence * 100).toFixed(1)}%
                  <br />
                  {analysis.explanation}
                </p>
              </TooltipContent>
            </Tooltip>
          ))}
        </div>
      </CardContent>
    </Card>
  );
} 