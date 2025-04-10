
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
    original: "Responsible for developing web applications",
    suggestion: "Engineered responsive web applications using React and TypeScript, increasing user engagement by 35%",
    accepted: false,
    type: "modify" as const,
  },
  {
    id: "2",
    original: "",
    suggestion: "Implemented automated testing protocols using Jest and Cypress, reducing bug reports by 48%",
    accepted: false,
    type: "add" as const,
  },
  {
    id: "3",
    original: "Managed a team of 3 developers",
    suggestion: "Led cross-functional team of developers, designers, and QA engineers to deliver projects under deadline and 15% under budget",
    accepted: false,
    type: "modify" as const,
  },
  {
    id: "4",
    original: "Created documentation",
    suggestion: "Authored comprehensive technical documentation and integration guides that reduced onboarding time by 40%",
    accepted: false,
    type: "modify" as const,
  },
  {
    id: "5",
    original: "Participated in meetings with stakeholders",
    suggestion: "Conducted biweekly stakeholder meetings to gather requirements and communicate project status, ensuring alignment with business objectives",
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

// Generate mock scores for the rubric categories
const generateMockScores = () => {
  return [
    { name: "Keyword Match", maxPoints: 20, score: 14 },
    { name: "Role Alignment", maxPoints: 15, score: 9 },
    { name: "Skills Match", maxPoints: 15, score: 10 },
    { name: "Achievements", maxPoints: 10, score: 5 },
    { name: "Experience Level", maxPoints: 10, score: 7 },
    { name: "Resume Structure", maxPoints: 10, score: 6 },
    { name: "Customization", maxPoints: 10, score: 4 },
    { name: "ATS Compatibility", maxPoints: 5, score: 3 },
    { name: "Grammar & Spelling", maxPoints: 3, score: 2 },
    { name: "Visual Appeal", maxPoints: 2, score: 1 }
  ];
};

export default function Results() {
  const [score, setScore] = useState(58);
  const [missingKeywords, setMissingKeywords] = useState(mockMissingKeywords);
  const [suggestions, setSuggestions] = useState(mockSuggestions);
  const [rubricScores, setRubricScores] = useState(generateMockScores());
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
        suggestion: "Optimized database queries, reducing server load by 60% and improving application response time by 3.2 seconds",
        accepted: false,
        type: "add" as const,
      });
      setSuggestions(newSuggestions);
      
      // Remove 2 missing keywords to show improvement
      setMissingKeywords(prev => prev.slice(2));
      
      // Update some of the rubric scores
      setRubricScores(prev => {
        const updated = [...prev];
        // Improve keyword match score
        updated[0].score = Math.min(updated[0].score + 2, updated[0].maxPoints);
        // Improve customization score
        updated[6].score = Math.min(updated[6].score + 2, updated[6].maxPoints);
        return updated;
      });
      
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
          onAcceptSuggestion={handleAcceptSuggestion}
          onRejectSuggestion={handleRejectSuggestion}
          onDownload={handleDownload}
          onReoptimize={handleReoptimize}
        />
      </DashboardLayout>
    </>
  );
}
