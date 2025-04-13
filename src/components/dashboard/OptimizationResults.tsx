import { useMemo, useState, useEffect, useRef } from "react";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Download, RefreshCw } from "lucide-react";
import ResumeEditor from "@/components/editor/ResumeEditor";
import {
  TooltipProvider,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { KeywordMatch } from '@/types/keywords';
import { API_CONFIG, getApiUrl, handleApiError } from "@/config/api";

interface CategoryScore {
  name: string;
  max: number;
  score: number;
  description: string;
}

interface OptimizationResultsProps {
  jobDescription: string;
  resumeContent: string;
  onResumeContentChange: (content: string) => void;
  optimizationId: number;
  onDownload: () => void;
}

export default function OptimizationResults({
  jobDescription,
  resumeContent,
  onResumeContentChange,
  optimizationId,
  onDownload,
}: OptimizationResultsProps) {
  const [keywordAnalysis, setKeywordAnalysis] = useState<KeywordMatch[]>([]);
  const [totalScore, setTotalScore] = useState<number>(0);
  const [categoryScores, setCategoryScores] = useState<CategoryScore[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const analysisRef = useRef({
    keywordAnalysis: [],
    totalScore: 0,
    categoryScores: []
  });

  const fetchAnalysis = async () => {
    if (!jobDescription || !resumeContent) {
      console.log('Missing required content for analysis');
      return;
    }

    // If we already have analysis results, don't fetch again
    if (analysisRef.current.keywordAnalysis.length > 0) {
      console.log('Using cached analysis results');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Analyze keywords
      const keywordResponse = await fetch(getApiUrl('ANALYZE_KEYWORDS'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          jobDescription: jobDescription.trim(), 
          resumeContent: resumeContent.trim() 
        }),
      });

      if (!keywordResponse.ok) {
        const errorData = await keywordResponse.json().catch(() => ({}));
        throw new Error(`HTTP error! status: ${keywordResponse.status}, message: ${errorData.error || 'Unknown error'}`);
      }

      const keywordResult = await keywordResponse.json();
      
      if (!keywordResult || !keywordResult.keywords) {
        throw new Error('Invalid keyword analysis response');
      }
      
      setKeywordAnalysis(keywordResult.keywords);
      analysisRef.current.keywordAnalysis = keywordResult.keywords;

      // Get resume score
      const metricsResponse = await fetch(getApiUrl('SCORE_RESUME'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          jobDescription: jobDescription.trim(), 
          resumeContent: resumeContent.trim(),
          keywordAnalysis: keywordResult
        }),
      });

      if (!metricsResponse.ok) {
        const errorData = await metricsResponse.json().catch(() => ({}));
        throw new Error(`HTTP error! status: ${metricsResponse.status}, message: ${errorData.error || 'Unknown error'}`);
      }

      const metricsResult = await metricsResponse.json();
      
      setTotalScore(metricsResult.totalScore);
      setCategoryScores(metricsResult.categoryScores || []);
      analysisRef.current.totalScore = metricsResult.totalScore;
      analysisRef.current.categoryScores = metricsResult.categoryScores || [];
      setRetryCount(0); // Reset retry count on success
    } catch (error) {
      console.error('Error in analysis:', error);
      const errorMessage = handleApiError(error);
      setError(errorMessage);
      
      // Implement retry logic
      if (retryCount < API_CONFIG.RETRY_ATTEMPTS) {
        setRetryCount(prev => prev + 1);
        setTimeout(fetchAnalysis, 2000 * (retryCount + 1)); // Exponential backoff
      } else {
        // Keep existing data if analysis fails after retries
        if (keywordAnalysis.length === 0) {
          setKeywordAnalysis([]);
        }
        if (totalScore === 0) {
          setTotalScore(0);
        }
        if (categoryScores.length === 0) {
          setCategoryScores([]);
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Initial fetch on mount only
  useEffect(() => {
    fetchAnalysis();
    // Cleanup function to prevent state updates on unmount
    return () => {
      analysisRef.current = {
        keywordAnalysis: [],
        totalScore: 0,
        categoryScores: []
      };
    };
  }, []); // Empty dependency array - only run once on mount

  // Handle content changes without triggering immediate analysis
  useEffect(() => {
    // Clear cached results when content changes
    analysisRef.current = {
      keywordAnalysis: [],
      totalScore: 0,
      categoryScores: []
    };
  }, [jobDescription, resumeContent]);

  const scoreColor = useMemo(() => {
    if (totalScore >= 80) return "text-green-500";
    if (totalScore >= 60) return "text-yellow-500";
    return "text-red-500";
  }, [totalScore]);

  const scoreMessage = useMemo(() => {
    if (totalScore >= 80) return "Great match! Your resume is well-optimized for this job.";
    if (totalScore >= 60) return "Good start. Some improvements could help your chances.";
    return "Your resume needs significant optimization for this job.";
  }, [totalScore]);

  const getScoreVariant = (score: number, max: number) => {
    const percentage = (score / max) * 100;
    if (percentage >= 70) return "success";
    if (percentage >= 40) return "warning";
    return "danger";
  };

  // Split scoring rubric into two columns
  const firstColumnMetrics = categoryScores.slice(0, 5);
  const secondColumnMetrics = categoryScores.slice(5, 10);

  return (
    <div className="flex flex-col min-h-screen">
      <div className="flex-shrink-0 space-y-6 p-6 pb-0">
        {/* Score and Keywords Section */}
        <div className="grid gap-6 md:grid-cols-[2fr,1fr]">
          <div className="space-y-6 pr-8">
            <div className="flex items-center gap-4">
              <div>
                <h2 className="text-2xl font-bold">ATS Compatibility Score</h2>
                <p className="text-muted-foreground">{scoreMessage}</p>
              </div>
              <div className={`text-4xl font-bold ml-auto ${scoreColor}`}>
                {isLoading ? "..." : `${Math.round(totalScore)}%`}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchAnalysis}
                disabled={isLoading}
                className="ml-2"
              >
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              </Button>
            </div>

            {isLoading ? (
              <div className="text-center py-4">
                <p className="text-muted-foreground">Analyzing resume...</p>
              </div>
            ) : error ? (
              <div className="text-center py-4">
                <p className="text-red-500">{error}</p>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {keywordAnalysis.map((analysis) => (
                  <Tooltip key={analysis.keyword}>
                    <TooltipTrigger>
                      <Badge
                        variant={analysis.found ? 'default' : 'secondary'}
                        className={`px-2 py-1 text-sm ${analysis.found ? 'bg-green-500/20 text-green-700 hover:bg-green-500/30' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                      >
                        {analysis.keyword}
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-xs">
                        {analysis.found ? 'Found in resume' : 'Not found in resume'}
                      </p>
                    </TooltipContent>
                  </Tooltip>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4 p-4 bg-muted/30 rounded-lg">
            {/* First Column */}
            <div className="space-y-3">
              {firstColumnMetrics.map((category) => {
                const scorePercentage = (category.score / category.max) * 100;
                const variant = getScoreVariant(category.score, category.max);
                
                return (
                  <TooltipProvider key={category.name}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="space-y-1 cursor-help">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-foreground/90">{category.name}</span>
                          </div>
                          <Progress value={scorePercentage} variant={variant} className="h-1.5" />
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="right">
                        <p>Score: {category.score}/{category.max}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                );
              })}
            </div>

            {/* Second Column */}
            <div className="space-y-3">
              {secondColumnMetrics.map((category) => {
                const scorePercentage = (category.score / category.max) * 100;
                const variant = getScoreVariant(category.score, category.max);
                
                return (
                  <TooltipProvider key={category.name}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="space-y-1 cursor-help">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-foreground/90">{category.name}</span>
                          </div>
                          <Progress value={scorePercentage} variant={variant} className="h-1.5" />
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="right">
                        <p>Score: {category.score}/{category.max}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Editor Section */}
      <div className="flex-1 p-6 pt-4">
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-end mb-4 flex-shrink-0">
            <Button variant="outline" onClick={onDownload}>
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
          </div>
          <div className="flex-1 bg-white rounded-lg shadow">
            <ResumeEditor
              content={resumeContent}
              onChange={onResumeContentChange}
              jobDescription={jobDescription}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
