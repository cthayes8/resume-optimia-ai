import { useState, useEffect } from "react";
import { Helmet } from "react-helmet";
import { useNavigate, useLocation } from "react-router-dom";
import DashboardLayout from "@/components/layout/DashboardLayout";
import OptimizationResults from "@/components/dashboard/OptimizationResults";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import mammoth from 'mammoth';
import * as pdfjs from 'pdfjs-dist';

// Set worker path for PDF.js
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

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
  const [resumeContent, setResumeContent] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [jobDescriptionId, setJobDescriptionId] = useState<string | null>(null);
  const [optimizationSessionId, setOptimizationSessionId] = useState<string | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();
  
  // Get parameters from URL
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const resumeId = searchParams.get('resumeId');

  // Fetch resume content and job description when component mounts
  useEffect(() => {
    const fetchData = async () => {
      if (!resumeId) {
        toast({
          title: "Error",
          description: "No resume selected",
          variant: "destructive",
        });
        navigate('/optimize');
        return;
      }

      setIsLoading(true);
      console.log('Starting data fetch for ID:', resumeId);

      try {
        // First, get the file path and data from the resumes table
        const { data: resume, error: resumeError } = await supabase
          .from('resumes')
          .select('file_path, data')
          .eq('id', resumeId)
          .limit(1)
          .maybeSingle();

        if (resumeError) {
          console.error('Resume fetch error:', resumeError);
          throw new Error(`Failed to fetch resume: ${resumeError.message}`);
        }
        
        if (!resume) {
          throw new Error('Resume not found');
        }

        if (!resume.file_path) {
          throw new Error('No file path found for resume');
        }

        // Get the latest optimization session for this resume
        const { data: session, error: sessionError } = await supabase
          .from('optimization_sessions')
          .select(`
            job_description_id,
            job_descriptions (
              data
            )
          `)
          .eq('resume_id', resumeId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        console.log('Found optimization session:', session);

        // Try to get job description from various sources
        let jobDescContent = '';

        // 1. Try getting from the optimization session's job description
        if (session?.job_descriptions?.data) {
          const data = session.job_descriptions.data;
          console.log('Found job description data:', data);
          
          if (typeof data === 'string' && data !== 'Default job description') {
            jobDescContent = data;
          } else if (typeof data === 'object' && data !== null) {
            const objData = data as Record<string, unknown>;
            if ('content' in objData && objData.content !== 'Default job description') {
              jobDescContent = String(objData.content);
            } else if ('job_description' in objData && objData.job_description !== 'Default job description') {
              jobDescContent = String(objData.job_description);
            }
          }

          if (jobDescContent) {
            console.log('Using job description from optimization session:', jobDescContent.substring(0, 100) + '...');
          }
        }

        // 2. If still no content, try resume data
        if (!jobDescContent && resume.data && typeof resume.data === 'object' && 'job_description' in resume.data) {
          const content = resume.data.job_description as string;
          if (content && content !== 'Default job description') {
            console.log('Using job description from resume data:', content.substring(0, 100) + '...');
            jobDescContent = content;
          }
        }

        // Set the job description if we found valid content
        if (jobDescContent) {
          setJobDescription(jobDescContent);
        } else {
          console.log('No valid job description found in any source');
          // Don't set a default job description, leave it empty
        }

        // Extract the correct path from the full URL
        const filePath = resume.file_path.includes('resume-files/') 
          ? resume.file_path.split('resume-files/')[1]
          : resume.file_path;

        console.log('Downloading file with path:', filePath);
        
        // Download the actual file from storage
        const { data: fileData, error: downloadError } = await supabase.storage
          .from('resume-files')
          .download(filePath);

        if (downloadError) {
          console.error('File download error:', downloadError);
          throw new Error(`Failed to download file: ${downloadError.message}`);
        }

        if (!fileData) {
          throw new Error('No file data received');
        }

        console.log('File downloaded, converting to HTML...');
        
        // Convert the file to HTML using mammoth
        const arrayBuffer = await fileData.arrayBuffer();
        const result = await mammoth.convertToHtml({ arrayBuffer });
        setResumeContent(result.value);
        setIsLoading(false);
      } catch (error) {
        console.error('Error fetching resume:', error);
        toast({
          title: "Error",
          description: error instanceof Error ? error.message : "Failed to load resume content",
          variant: "destructive",
        });
        setIsLoading(false);
        navigate('/optimize');
      }
    };

    fetchData();
  }, [resumeId, navigate, toast]);

  // Update the job description creation effect
  useEffect(() => {
    const createJobDescription = async () => {
      if (!resumeId || !jobDescription || jobDescription === 'Default job description') return;

      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user?.id) return;

        // Create a job description entry
        const { data: jobDesc, error: jobDescError } = await supabase
          .from('job_descriptions')
          .insert({
            user_id: user.id,
            data: {
              content: jobDescription,
            },
            created_at: new Date().toISOString()
          })
          .select('id')
          .single();

        if (jobDescError) throw jobDescError;
        
        if (jobDesc) {
          setJobDescriptionId(jobDesc.id);
          
          // Create an optimization session with the new job description
          const { data: session, error: sessionError } = await supabase
            .from('optimization_sessions')
            .insert({
              user_id: user.id,
              resume_id: resumeId,
              job_description_id: jobDesc.id,
              created_at: new Date().toISOString()
            })
            .select('id')
            .single();

          if (!sessionError && session) {
            setOptimizationSessionId(session.id);
          }
        }
      } catch (error) {
        console.error('Error creating job description:', error);
      }
    };

    createJobDescription();
  }, [resumeId, jobDescription]);

  // Remove the separate optimization session effect since we create it with the job description
  useEffect(() => {
    const updateOptimizationSession = async () => {
      if (!optimizationSessionId) return;

      try {
        await supabase
          .from('optimization_sessions')
          .update({
            report: { 
              score_before: 58,
              score_after: score,
            }
          })
          .eq('id', optimizationSessionId);
      } catch (error) {
        console.error('Error updating optimization session:', error);
      }
    };

    updateOptimizationSession();
  }, [optimizationSessionId, score]);

  const handleDownload = () => {
    // Download logic
  };

  const handleReoptimize = () => {
    // Reoptimize logic
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
        
        {isLoading ? (
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="animate-pulse text-muted-foreground">
              Loading resume content...
            </div>
          </div>
        ) : resumeContent && jobDescription ? (
          <OptimizationResults 
            score={score}
            jobDescription={jobDescription}
            scoringRubric={scoringRubric}
            onDownload={handleDownload}
            onReoptimize={handleReoptimize}
            resumeContent={resumeContent}
            onResumeContentChange={setResumeContent}
            optimizationId={Number(optimizationSessionId)}
          />
        ) : (
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-muted-foreground">
              {!resumeContent ? "No resume content available" : "No job description available"}
            </div>
          </div>
        )}
      </DashboardLayout>
    </>
  );
}
