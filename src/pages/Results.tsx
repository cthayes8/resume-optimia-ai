
import { useState, useEffect } from "react";
import { Helmet } from "react-helmet";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/layout/DashboardLayout";
import OptimizationResults from "@/components/dashboard/OptimizationResults";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { ArrowLeft } from "lucide-react";

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
  const navigate = useNavigate();
  const { toast } = useToast();

  // Calculate a new score whenever suggestions are accepted/rejected
  useEffect(() => {
    const acceptedCount = suggestions.filter(s => s.accepted).length;
    const newScore = Math.min(58 + Math.floor((acceptedCount / suggestions.length) * 40), 98);
    setScore(newScore);
  }, [suggestions]);

  const handleAcceptSuggestion = (id: string) => {
    setSuggestions(prev => 
      prev.map(s => s.id === id ? { ...s, accepted: true } : s)
    );
    toast({
      title: "Suggestion applied",
      description: "The suggestion has been applied to your resume",
    });
  };

  const handleRejectSuggestion = (id: string) => {
    setSuggestions(prev => 
      prev.map(s => s.id === id ? { ...s, accepted: false } : s)
    );
  };

  const handleDownload = () => {
    toast({
      title: "Resume downloaded",
      description: "Your optimized resume has been downloaded",
    });
    
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
          onDownload={handleDownload}
          onReoptimize={handleReoptimize}
        />
      </DashboardLayout>
    </>
  );
}
