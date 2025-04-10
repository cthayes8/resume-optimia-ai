import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  CheckCircle2,
  XCircle,
  AlertCircle,
  Download,
  CheckCircle,
  RefreshCw,
  Info
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface OptimizationResultsProps {
  score: number;
  missingKeywords: string[];
  suggestions: {
    id: string;
    original: string;
    suggestion: string;
    accepted: boolean;
    type: "add" | "modify" | "remove";
  }[];
  onAcceptSuggestion: (id: string) => void;
  onRejectSuggestion: (id: string) => void;
  onDownload: () => void;
  onReoptimize: () => void;
}

export default function OptimizationResults({
  score,
  missingKeywords,
  suggestions,
  onAcceptSuggestion,
  onRejectSuggestion,
  onDownload,
  onReoptimize
}: OptimizationResultsProps) {
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

  const acceptedCount = useMemo(() => {
    return suggestions.filter(s => s.accepted).length;
  }, [suggestions]);

  const getScoreVariant = (score: number, maxPoints: number) => {
    const percentage = (score / maxPoints) * 100;
    if (percentage >= 70) return "success";
    if (percentage >= 40) return "warning";
    return "danger";
  };

  return (
    <div className="space-y-6">
      <div className="bg-background rounded-lg p-6 border shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-start gap-6">
          <div className="flex-1">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold">ATS Compatibility Score</h3>
              <span className={`text-3xl font-bold ${scoreColor}`}>{score}%</span>
            </div>
            <Progress value={score} className="h-2" />
            <p className="mt-3 text-foreground/70">{scoreMessage}</p>
          </div>
          
          <div className="border-l hidden lg:block"></div>
          
          <div className="lg:w-1/2">
            <div className="space-y-2">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-6 w-6 float-right">
                      <Info className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent className="w-80">
                    <p className="text-sm">Our scoring system evaluates your resume on 10 key metrics (total: 100 points)</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <div className="space-y-1.5">
                {scoringRubric.map((category) => {
                  const scorePercentage = (category.score / category.maxPoints) * 100;
                  const variant = getScoreVariant(category.score, category.maxPoints);
                  
                  return (
                    <TooltipProvider key={category.name}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="space-y-0.5 cursor-help">
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-foreground/80">{category.name}</span>
                            </div>
                            <Progress value={scorePercentage} variant={variant} className="h-1" />
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
        </div>
      </div>

      {missingKeywords.length > 0 && (
        <div className="bg-background rounded-lg p-6 border shadow-sm">
          <h3 className="text-lg font-semibold mb-3">Missing Keywords</h3>
          <div className="flex flex-wrap gap-2">
            {missingKeywords.map((keyword, i) => (
              <Badge key={i} variant="outline" className="bg-red-500/10 text-red-500 hover:bg-red-500/20">
                {keyword}
              </Badge>
            ))}
          </div>
          <p className="mt-3 text-sm text-foreground/70">
            Including these keywords can significantly improve your ATS score
          </p>
        </div>
      )}

      <div className="bg-background rounded-lg border shadow-sm">
        <div className="p-6 border-b">
          <h3 className="text-xl font-semibold">AI Suggestions</h3>
          <p className="text-foreground/70 mt-1">
            Review and apply these suggestions to optimize your resume
          </p>
          <div className="flex items-center justify-between mt-4">
            <div className="text-sm">
              <span className="font-medium">{acceptedCount}</span> of{" "}
              <span className="font-medium">{suggestions.length}</span> suggestions applied
            </div>
            <Button size="sm" variant="outline" onClick={onReoptimize}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Reoptimize
            </Button>
          </div>
        </div>
        
        <ScrollArea className="h-[400px]">
          <div className="space-y-4 p-6">
            {suggestions.map((suggestion) => (
              <div
                key={suggestion.id}
                className={`p-4 rounded-lg border ${
                  suggestion.accepted
                    ? "bg-green-500/5 border-green-500/20"
                    : "bg-background"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-1">
                    {suggestion.type === "add" ? (
                      <AlertCircle className="h-5 w-5 text-yellow-500" />
                    ) : suggestion.type === "modify" ? (
                      <AlertCircle className="h-5 w-5 text-blue-500" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-500" />
                    )}
                  </div>
                  <div className="flex-1 space-y-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="capitalize">
                          {suggestion.type}
                        </Badge>
                        {suggestion.accepted && (
                          <Badge className="bg-green-500 text-white">Applied</Badge>
                        )}
                      </div>
                      
                      {suggestion.original && (
                        <div className="mt-2 p-2 bg-muted/50 rounded text-sm text-foreground/70 relative">
                          <span className="absolute -top-2 left-2 text-xs bg-background px-1 text-foreground/50">
                            Original
                          </span>
                          {suggestion.original}
                        </div>
                      )}
                      
                      <div className="mt-3 p-2 bg-primary/5 rounded text-sm relative">
                        <span className="absolute -top-2 left-2 text-xs bg-background px-1 text-primary">
                          Suggestion
                        </span>
                        {suggestion.suggestion}
                      </div>
                    </div>
                    
                    {!suggestion.accepted ? (
                      <div className="flex gap-2 mt-3">
                        <Button 
                          size="sm" 
                          className="flex-1"
                          onClick={() => onAcceptSuggestion(suggestion.id)}
                        >
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Apply
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="flex-1"
                          onClick={() => onRejectSuggestion(suggestion.id)}
                        >
                          <XCircle className="h-4 w-4 mr-2" />
                          Ignore
                        </Button>
                      </div>
                    ) : (
                      <Button 
                        size="sm" 
                        variant="outline"
                        className="mt-3 w-full"
                        onClick={() => onRejectSuggestion(suggestion.id)}
                      >
                        Undo
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
        
        <Separator />
        
        <div className="p-4 flex justify-end">
          <Button 
            size="lg" 
            onClick={onDownload}
            className="rounded-full px-6"
          >
            <Download className="h-4 w-4 mr-2" />
            Download Optimized Resume
          </Button>
        </div>
      </div>
    </div>
  );
}
