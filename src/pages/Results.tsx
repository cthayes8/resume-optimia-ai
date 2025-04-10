import { useState, useEffect } from "react";
import { Helmet } from "react-helmet";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/layout/DashboardLayout";
import OptimizationResults from "@/components/dashboard/OptimizationResults";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

// Mock data for demonstration
const mockSuggestions = [
  {
    id: "1",
    original: "<p>Responsible for developing web applications</p>",
    suggestion: "<p>Engineered responsive web applications using <strong>React</strong> and <strong>TypeScript</strong>, increasing user engagement by <em>35%</em></p>",
    accepted: false,
    type: "modify" as const,
  },
  {
    id: "2",
    original: "",
    suggestion: "<p>Implemented automated testing protocols using <strong>Jest</strong> and <strong>Cypress</strong>, reducing bug reports by <em>48%</em></p>",
    accepted: false,
    type: "add" as const,
  },
  {
    id: "3",
    original: "<p>Managed a team of 3 developers</p>",
    suggestion: "<p>Led cross-functional team of developers, designers, and QA engineers to deliver projects under deadline and <em>15% under budget</em></p>",
    accepted: false,
    type: "modify" as const,
  },
  {
    id: "4",
    original: "<p>Created documentation</p>",
    suggestion: "<p>Authored comprehensive technical documentation and integration guides that reduced onboarding time by <em>40%</em></p>",
    accepted: false,
    type: "modify" as const,
  },
  {
    id: "5",
    original: "<p>Participated in meetings with stakeholders</p>",
    suggestion: "<p>Conducted biweekly stakeholder meetings to gather requirements and communicate project status, ensuring alignment with business objectives</p>",
    accepted: false,
    type: "modify" as const,
  },
];

const mockMissingKeywords = [
  "Docker",
  "CI/CD",
  "AWS",
  "Agile methodologies",
  "Backend architecture",
  "GraphQL",
];

// Resume scoring rubric categories
const scoringRubric = [
  { name: "Keyword Match", maxPoints: 20, description: "% of keywords from the job description found in the resume", score: 14 },
  { name: "Role Alignment", maxPoints: 15, description: "Match of job titles, responsibilities, and domain expertise", score: 9 },
  { name: "Skills Match", maxPoints: 15, description: "Technical and soft skills aligned with the JD (tools, platforms, traits)", score: 10 },
  { name: "Achievements", maxPoints: 10, description: "Impact shown using metrics, results, KPIs", score: 5 },
  { name: "Experience Level", maxPoints: 10, description: "Seniority and years of experience appropriate to role", score: 7 },
  { name: "Resume Structure", maxPoints: 10, description: "Clear sections, logical format, easy to read and scan", score: 6 },
  { name: "Customization", maxPoints: 10, description: "Resume is tailored to this specific job (title, summary, bullet focus)", score: 4 },
  { name: "ATS Compatibility", maxPoints: 5, description: "Proper formatting (no tables/images), standard fonts, parsable sections", score: 3 },
  { name: "Grammar & Spelling", maxPoints: 3, description: "No typos, clean grammar, professional tone", score: 2 },
  { name: "Visual Appeal", maxPoints: 2, description: "Clean layout, modern font, good use of white space", score: 1 },
];

export default function Results() {
  const [score, setScore] = useState(58);
  const [missingKeywords, setMissingKeywords] = useState(mockMissingKeywords);
  const [suggestions, setSuggestions] = useState(mockSuggestions);
  const [optimizationSessionId, setOptimizationSessionId] = useState<string | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  // Calculate a new score whenever suggestions are accepted/rejected
  useEffect(() => {
    const acceptedCount = suggestions.filter(s => s.accepted).length;
    const newScore = Math.min(58 + Math.floor((acceptedCount / suggestions.length) * 40), 98);
    setScore(newScore);
  }, [suggestions]);

  // Save optimization session when component mounts
  useEffect(() => {
    const saveOptimizationSession = async () => {
      try {
        // Get user ID if authenticated
        const { data: { user } } = await supabase.auth.getUser();
        const userId = user?.id;

        if (userId) {
          // Create a new optimization session - adjust to match the schema
          const { data, error } = await supabase
            .from('optimization_sessions')
            .insert({
              user_id: userId,
              report: { 
                score_before: 58,
                score_after: score,
                missing_keywords: missingKeywords
              },
              resume_id: userId, // Mocked value to satisfy not-null constraint
              job_description_id: userId, // Mocked value to satisfy not-null constraint
              created_at: new Date().toISOString()
            })
            .select('id')
            .single();

          if (error) throw error;
          
          if (data) {
            setOptimizationSessionId(data.id);
            
            // Save each suggestion with structure matching the schema
            for (const suggestion of suggestions) {
              await supabase
                .from('optimizations')
                .insert({
                  user_id: userId,
                  job_description: suggestion.original,
                  optimized_resume: suggestion.suggestion,
                  original_resume: suggestion.original || "<empty>",
                  metrics: {
                    type: suggestion.type,
                    accepted: suggestion.accepted
                  }
                });
            }
            
            console.log('Optimization session saved with ID:', data.id);
          }
        }
      } catch (error) {
        console.error('Error saving optimization session:', error);
      }
    };

    saveOptimizationSession();
  }, []);

  // Update the optimization session in Supabase when score changes
  useEffect(() => {
    const updateOptimizationScore = async () => {
      if (optimizationSessionId) {
        try {
          const { error } = await supabase
            .from('optimization_sessions')
            .update({ 
              report: { score_after: score },
              updated_at: new Date().toISOString()
            })
            .eq('id', optimizationSessionId);

          if (error) throw error;
        } catch (error) {
          console.error('Error updating optimization score:', error);
        }
      }
    };

    updateOptimizationScore();
  }, [score, optimizationSessionId]);

  const handleAcceptSuggestion = async (id: string) => {
    setSuggestions(prev => 
      prev.map(s => s.id === id ? { ...s, accepted: true } : s)
    );
    
    // Update the suggestion in Supabase
    if (optimizationSessionId) {
      try {
        const suggestion = suggestions.find(s => s.id === id);
        if (suggestion) {
          const { error } = await supabase
            .from('optimizations')
            .update({ 
              metrics: { 
                type: suggestion.type, 
                accepted: true 
              } 
            })
            .eq('id', parseInt(id)); // Convert string to number

          if (error) throw error;
        }
      } catch (error) {
        console.error('Error updating suggestion:', error);
      }
    }
    
    toast({
      title: "Suggestion applied",
      description: "The suggestion has been applied to your resume",
    });
  };

  const handleRejectSuggestion = async (id: string) => {
    setSuggestions(prev => 
      prev.map(s => s.id === id ? { ...s, accepted: false } : s)
    );
    
    // Update the suggestion in Supabase
    if (optimizationSessionId) {
      try {
        const suggestion = suggestions.find(s => s.id === id);
        if (suggestion) {
          const { error } = await supabase
            .from('optimizations')
            .update({ 
              metrics: { 
                type: suggestion.type, 
                accepted: false
              } 
            })
            .eq('id', parseInt(id)); // Convert string to number

          if (error) throw error;
        }
      } catch (error) {
        console.error('Error updating suggestion:', error);
      }
    }
  };

  const handleSuggestionContentChange = (id: string, newContent: string) => {
    setSuggestions(prev => 
      prev.map(s => s.id === id ? { ...s, suggestion: newContent } : s)
    );
  };

  const handleDownload = async () => {
    toast({
      title: "Resume downloaded",
      description: "Your optimized resume has been downloaded",
    });
    
    // Save the optimized resume to Supabase
    if (optimizationSessionId) {
      try {
        // Combine all accepted suggestions into a single HTML document
        const optimizedContent = suggestions
          .filter(s => s.accepted)
          .map(s => s.suggestion)
          .join('');
        
        const { data: { user } } = await supabase.auth.getUser();
        const userId = user?.id;
        
        if (userId) {
          const { error } = await supabase
            .from('optimized_resumes')
            .insert({
              session_id: optimizationSessionId,
              data: { content: optimizedContent, score: score },
            });

          if (error) throw error;
        }
      } catch (error) {
        console.error('Error saving optimized resume:', error);
      }
    }
    
    // In a real app, this would trigger the download of the optimized resume
    console.log("Downloading optimized resume...");
  };

  const handleReoptimize = () => {
    toast({
      title: "Reoptimizing resume",
      description: "Generating new suggestions based on current content",
    });
    
    // In a real app, this would trigger a reanalysis with the AI
    setTimeout(() => {
      const newSuggestions = [...suggestions];
      // Add a new suggestion to demonstrate a reoptimization
      newSuggestions.push({
        id: "6",
        original: "",
        suggestion: "<p>Optimized database queries, reducing server load by <strong>60%</strong> and improving application response time by <em>3.2 seconds</em></p>",
        accepted: false,
        type: "add" as const,
      });
      setSuggestions(newSuggestions);
      
      // Remove 2 missing keywords to show improvement
      setMissingKeywords(prev => prev.slice(2));
      
      toast({
        title: "Reoptimization complete",
        description: "New suggestions have been generated",
      });
    }, 2000);
  };

  return (
    <>
      <Helmet>
        <title>Optimization Results - Resume ATS Optimizer</title>
      </Helmet>
      
      <DashboardLayout>
        <div className="flex items-center mb-8">
          <Button 
            variant="ghost" 
            className="mr-4"
            onClick={() => navigate('/optimize')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h2 className="text-2xl font-bold tracking-tight">
              Optimization Results
            </h2>
            <p className="text-muted-foreground">
              Review and apply AI-suggested improvements to your resume
            </p>
          </div>
        </div>
        
        <OptimizationResults 
          score={score}
          missingKeywords={missingKeywords}
          suggestions={suggestions}
          scoringRubric={scoringRubric}
          onAcceptSuggestion={handleAcceptSuggestion}
          onRejectSuggestion={handleRejectSuggestion}
          onSuggestionContentChange={handleSuggestionContentChange}
          onDownload={handleDownload}
          onReoptimize={handleReoptimize}
        />
      </DashboardLayout>
    </>
  );
}
