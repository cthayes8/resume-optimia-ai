
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
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import ResumeEditor from "./ResumeEditor";

interface ScoringCategory {
  name: string;
  maxPoints: number;
  description: string;
  score: number;
}

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
  scoringRubric: ScoringCategory[];
  onAcceptSuggestion: (id: string) => void;
  onRejectSuggestion: (id: string) => void;
  onSuggestionContentChange?: (id: string, content: string) => void;
  onDownload: () => void;
  onReoptimize: () => void;
}

export default function OptimizationResults({
  score,
  missingKeywords,
  suggestions,
  scoringRubric,
  onAcceptSuggestion,
  onRejectSuggestion,
  onSuggestionContentChange,
  onDownload,
  onReoptimize
}: OptimizationResultsProps) {
  const [selectedSuggestion, setSelectedSuggestion] = useState<string | null>(null);
  
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

  const activeSuggestion = useMemo(() => {
    return suggestions.find(s => s.id === selectedSuggestion);
  }, [selectedSuggestion, suggestions]);

  const handleContentChange = (content: string) => {
    if (selectedSuggestion && onSuggestionContentChange) {
      onSuggestionContentChange(selectedSuggestion, content);
    }
  };

  return (
    <div className="space-y-6">
      {/* ATS Compatibility Score section */}
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
              
              <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                {scoringRubric.slice(0, 5).map((category) => {
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
                
                {scoringRubric.slice(5, 10).map((category) => {
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

      {/* Missing Keywords Section */}
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

      {/* AI Suggestions Section with side-by-side layout */}
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
        
        <div className="flex flex-col md:flex-row">
          {/* Left side: Suggestions list */}
          <div className="md:w-1/2 border-r">
            <ScrollArea className="h-[500px]">
              <div className="space-y-4 p-6">
                {suggestions.map((suggestion) => (
                  <div
                    key={suggestion.id}
                    className={`p-4 rounded-lg border ${
                      suggestion.accepted
                        ? "bg-green-500/5 border-green-500/20"
                        : suggestion.id === selectedSuggestion
                        ? "bg-blue-500/5 border-blue-500/20"
                        : "bg-background"
                    } cursor-pointer transition-colors`}
                    onClick={() => setSelectedSuggestion(suggestion.id)}
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
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="capitalize">
                            {suggestion.type}
                          </Badge>
                          {suggestion.accepted && (
                            <Badge className="bg-green-500 text-white">Applied</Badge>
                          )}
                        </div>
                        
                        <div className="mt-2">
                          <ResumeEditor 
                            content={suggestion.suggestion} 
                            editable={false}
                            className="text-sm line-clamp-2 overflow-hidden"
                          />
                        </div>
                        
                        {!suggestion.accepted && (
                          <Button 
                            size="sm" 
                            className="mt-2 w-full"
                            onClick={(e) => {
                              e.stopPropagation();
                              onAcceptSuggestion(suggestion.id);
                            }}
                          >
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Apply
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
          
          {/* Right side: Preview of selected suggestion */}
          <div className="md:w-1/2 p-6">
            {activeSuggestion ? (
              <div>
                <h4 className="text-lg font-medium mb-4">Preview Suggestion</h4>
                
                {activeSuggestion.original && (
                  <div className="mb-6">
                    <h5 className="text-sm font-medium text-foreground/70 mb-2">Original Content</h5>
                    <div className="bg-muted/50 rounded p-4">
                      <ResumeEditor 
                        content={activeSuggestion.original} 
                        editable={false}
                      />
                    </div>
                  </div>
                )}
                
                <div>
                  <h5 className="text-sm font-medium text-primary mb-2">Suggested Change</h5>
                  <div className="bg-primary/5 rounded p-4">
                    <ResumeEditor 
                      content={activeSuggestion.suggestion} 
                      editable={!activeSuggestion.accepted}
                      showActions={!activeSuggestion.accepted}
                      onAccept={() => onAcceptSuggestion(activeSuggestion.id)}
                      onReject={() => setSelectedSuggestion(null)}
                      onChange={handleContentChange}
                    />
                  </div>
                </div>
                
                {activeSuggestion.accepted && (
                  <Button 
                    size="sm" 
                    variant="outline"
                    className="mt-4"
                    onClick={() => onRejectSuggestion(activeSuggestion.id)}
                  >
                    Undo Application
                  </Button>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-center p-6">
                <div className="max-w-xs">
                  <h4 className="text-lg font-medium mb-2">Select a suggestion</h4>
                  <p className="text-foreground/70">
                    Click on a suggestion from the left panel to preview and apply it to your resume
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
        
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
