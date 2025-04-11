import { useMemo, useState, useEffect } from "react";
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

interface OptimizationResultsProps {
  score: number;
  jobDescription: string;
  resumeContent: string;
  onResumeContentChange: (content: string) => void;
  optimizationId: number;
  scoringRubric: Array<{
    name: string;
    score: number;
    maxPoints: number;
    description: string;
  }>;
  onDownload: () => void;
  onReoptimize: () => void;
}

export default function OptimizationResults({
  score,
  jobDescription,
  resumeContent,
  onResumeContentChange,
  optimizationId,
  scoringRubric,
  onDownload,
  onReoptimize,
}: OptimizationResultsProps) {
  const [keywordAnalysis, setKeywordAnalysis] = useState([]);
  const [missingKeywords, setMissingKeywords] = useState<string[]>([]);

  useEffect(() => {
    const fetchKeywordAnalysis = async () => {
      if (!jobDescription || !resumeContent) {
        console.log('Missing required content for keyword analysis');
        return;
      }

      try {
        const response = await fetch('/.netlify/functions/analyze-keywords', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ jobDescription, resumeContent }),
        });

        if (!response.ok) {
          throw new Error('Failed to fetch keyword analysis');
        }

        const data = await response.json();
        console.log('Keyword analysis results:', data);
        setKeywordAnalysis(data.keywords);
      } catch (error) {
        console.error('Error fetching keyword analysis:', error);
      }
    };

    fetchKeywordAnalysis();
  }, [jobDescription, resumeContent]);

  const scoreColor = useMemo(() => {
    if (score >= 80) return "text-green-500";
    if (score >= 60) return "text-yellow-500";
    return "text-red-500";
  }, [score]);

  const scoreMessage = useMemo(() => {
    if (score >= 80) return "Great match! Your resume is well-optimized for this job.";
    if (score >= 60) return "Good start. Some improvements could help your chances.";
    return "Your resume needs significant optimization for this job.";
  }, [score]);

  const getScoreVariant = (score: number, maxPoints: number) => {
    const percentage = (score / maxPoints) * 100;
    if (percentage >= 70) return "success";
    if (percentage >= 40) return "warning";
    return "danger";
  };

  // Split scoring rubric into two columns
  const firstColumnMetrics = scoringRubric.slice(0, 5);
  const secondColumnMetrics = scoringRubric.slice(5, 10);

  return (
    <div className="space-y-6 p-6">
      {/* Score and Keywords Section */}
      <div className="grid gap-6 md:grid-cols-[2fr,1fr]">
        <div className="space-y-6 pr-8">
          <div className="flex items-center gap-4">
            <div>
              <h2 className="text-2xl font-bold">ATS Compatibility Score</h2>
              <p className="text-muted-foreground">{scoreMessage}</p>
            </div>
            <div className={`text-4xl font-bold ml-auto ${scoreColor}`}>
              {score}%
            </div>
          </div>

          {keywordAnalysis.map((analysis) => (
            <Tooltip key={analysis.keyword}>
              <TooltipTrigger>
                <Badge
                  variant={analysis.importance === 'required' ? 'destructive' : 'secondary'}
                  className="px-2 py-1 text-sm"
                >
                  {analysis.keyword}
                </Badge>
              </TooltipTrigger>
              {analysis.context && (
                <TooltipContent>
                  <p className="max-w-xs text-xs">{analysis.context}</p>
                </TooltipContent>
              )}
            </Tooltip>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-4 p-4 bg-muted/30 rounded-lg">
          {/* First Column */}
          <div className="space-y-3">
            {firstColumnMetrics.map((category) => {
              const scorePercentage = (category.score / category.maxPoints) * 100;
              const variant = getScoreVariant(category.score, category.maxPoints);
              
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
                      <p>{category.description}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              );
            })}
          </div>

          {/* Second Column */}
          <div className="space-y-3">
            {secondColumnMetrics.map((category) => {
              const scorePercentage = (category.score / category.maxPoints) * 100;
              const variant = getScoreVariant(category.score, category.maxPoints);
              
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
                      <p>{category.description}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              );
            })}
          </div>
        </div>
      </div>

      {/* Resume Content */}
      <div className="space-y-4 overflow-x-auto">
        <div className="flex items-center justify-between sticky top-0 z-20 bg-background pb-4">
          <h3 className="text-lg font-semibold">Resume Content</h3>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onDownload}>
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
            <Button variant="outline" onClick={onReoptimize}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Reoptimize
            </Button>
          </div>
        </div>
        <div className="min-w-[8.5in]">
          <ResumeEditor
            content={resumeContent}
            onChange={onResumeContentChange}
            optimizationId={optimizationId}
          />
        </div>
      </div>
    </div>
  );
}
