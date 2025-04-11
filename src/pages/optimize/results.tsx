import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import ResumeEditor from "@/components/editor/ResumeEditor";
import { KeywordAnalysis } from '@/components/keywords/KeywordAnalysis';

interface OptimizationResultsProps {
  resumeContent: string;
  onResumeContentChange: (content: string) => void;
  score: number;
  missingKeywords: string[];
  suggestions: any[];
  scoringRubric: any[];
  onAcceptSuggestion: (id: string) => void;
  onRejectSuggestion: (id: string) => void;
  onSuggestionContentChange: (id: string, content: string) => void;
  onDownload: () => void;
  onReoptimize: () => void;
  jobDescription: string;
  optimizationSessionId: string;
}

export default function OptimizationResults({ 
  resumeContent,
  onResumeContentChange,
  score,
  missingKeywords,
  suggestions,
  scoringRubric,
  onAcceptSuggestion,
  onRejectSuggestion,
  onSuggestionContentChange,
  onDownload,
  onReoptimize,
  jobDescription,
  optimizationSessionId
}: OptimizationResultsProps) {
  return (
    <div className="container mx-auto p-4">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Optimization Results</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Review AI-powered suggestions to improve your resume
        </p>
      </div>

      <div className="grid gap-6">
        {/* ATS Score Section */}
        <Card>
          <CardHeader>
            <CardTitle>ATS Compatibility Score</CardTitle>
            <CardDescription>
              Your resume needs significant optimization for this job.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold mb-4">{score}%</div>
          </CardContent>
        </Card>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Resume Content Section */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Resume Content</CardTitle>
                <CardDescription>
                  Edit your resume with AI-powered suggestions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResumeEditor
                  content={resumeContent}
                  onChange={onResumeContentChange}
                  optimizationId={Number(optimizationSessionId)}
                />
              </CardContent>
            </Card>

            {/* AI Suggestions Section */}
            <Card>
              <CardHeader>
                <CardTitle>AI Suggestions</CardTitle>
                <CardDescription>
                  Recommended improvements for your resume
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {suggestions.map((suggestion, index) => (
                    <Card key={index}>
                      <CardContent className="pt-6">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">
                              {suggestion.section}
                            </span>
                            <span className="text-xs text-muted-foreground capitalize">
                              {suggestion.type}
                            </span>
                          </div>
                          {suggestion.original && (
                            <div className="text-sm bg-muted/50 p-2 rounded">
                              <div className="font-medium text-xs mb-1">Original</div>
                              {suggestion.original}
                            </div>
                          )}
                          <div className="text-sm bg-primary/10 p-2 rounded">
                            <div className="font-medium text-xs mb-1">Suggested</div>
                            {suggestion.suggested}
                          </div>
                          <div className="flex justify-end gap-2 mt-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => onRejectSuggestion(suggestion.id)}
                            >
                              Reject
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => onAcceptSuggestion(suggestion.id)}
                            >
                              Apply
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Scoring Rubric Section */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle>Scoring Rubric</CardTitle>
                <CardDescription>
                  Detailed breakdown of your resume score
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {scoringRubric.map((category, index) => (
                    <div key={index}>
                      <div className="flex justify-between mb-1">
                        <span className="text-sm font-medium">{category.name}</span>
                        <span className="text-sm text-muted-foreground">
                          {category.score}/{category.maxPoints}
                        </span>
                      </div>
                      <div className="h-2 bg-muted rounded-full">
                        <div
                          className="h-full bg-primary rounded-full"
                          style={{
                            width: `${(category.score / category.maxPoints) * 100}%`,
                          }}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {category.description}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Keyword Analysis Section */}
        <KeywordAnalysis jobDescription={jobDescription} resumeContent={resumeContent} />

        {/* Action Buttons */}
        <div className="flex justify-end gap-4 mt-6">
          <Button variant="outline" onClick={onReoptimize}>
            Reoptimize
          </Button>
          <Button onClick={onDownload}>
            Download
          </Button>
        </div>
      </div>
    </div>
  );
} 