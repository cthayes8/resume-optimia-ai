import { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
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
      console.log('Starting data fetch for resume ID:', resumeId);

      try {
        // First, get the resume data
        const { data: resume, error: resumeError } = await supabase
          .from('resumes')
          .select('id, file_path, data, created_at')
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

        console.log('Resume data found:', resume);
        
        // Create or get optimization session
        const { data: { user } } = await supabase.auth.getUser();
        if (!user?.id) {
          throw new Error('User not authenticated');
        }

        // Get or create an optimization session
        let sessionId = null;
        const { data: existingSession, error: sessionQueryError } = await supabase
          .from('optimization_sessions')
          .select('id, job_description_id, job_descriptions(data)')
          .eq('resume_id', resumeId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        console.log('Existing optimization session:', existingSession);

        let jobDescriptionContent = '';

        // If no existing session or if we need to create a new job description
        if (!existingSession) {
          console.log('No existing optimization session found, creating new one...');
          
          // Create default job description if none exists
          const defaultJobDesc = "Software Engineer with strong experience in React, TypeScript, and Node.js. Knowledge of cloud services and API development. Excellent problem-solving skills and ability to work in a team environment.";
          
          // Create job description entry
          const { data: newJobDesc, error: jobDescError } = await supabase
            .from('job_descriptions')
            .insert({
              user_id: user.id,
              data: {
                content: defaultJobDesc
              },
              created_at: new Date().toISOString()
            })
            .select('id')
            .single();

          if (jobDescError) {
            console.error('Error creating job description:', jobDescError);
            throw new Error(`Failed to create job description: ${jobDescError.message}`);
          }
          
          console.log('Created new job description:', newJobDesc);
          
          // Create optimization session
          const { data: newSession, error: sessionError } = await supabase
            .from('optimization_sessions')
            .insert({
              user_id: user.id,
              resume_id: resumeId,
              job_description_id: newJobDesc.id,
              created_at: new Date().toISOString()
            })
            .select('id')
            .single();

          if (sessionError) {
            console.error('Error creating optimization session:', sessionError);
            throw new Error(`Failed to create optimization session: ${sessionError.message}`);
          }
          
          console.log('Created new optimization session:', newSession);
          
          sessionId = newSession.id;
          jobDescriptionContent = defaultJobDesc;
        } else {
          // Use existing session
          sessionId = existingSession.id;
          
          // Try to get job description content
          if (existingSession.job_descriptions?.data) {
            const data = existingSession.job_descriptions.data;
            console.log('Found job description data:', data);
            
            if (typeof data === 'string') {
              jobDescriptionContent = data;
            } else if (typeof data === 'object' && data !== null) {
              if ('content' in data) {
                jobDescriptionContent = String(data.content);
              } else if ('job_description' in data) {
                jobDescriptionContent = String(data.job_description);
              }
            }
          }
          
          // If still no content, use default
          if (!jobDescriptionContent) {
            jobDescriptionContent = "Software Engineer with strong experience in React, TypeScript, and Node.js. Knowledge of cloud services and API development. Excellent problem-solving skills and ability to work in a team environment.";
          }
        }

        // Set optimization session ID
        setOptimizationSessionId(sessionId);
        console.log('Using optimization session ID:', sessionId);

        // Set job description
        setJobDescription(jobDescriptionContent);
        console.log('Job description content set:', jobDescriptionContent.substring(0, 100) + '...');

        // Get resume content
        let content = '';
        
        // 1. Check if content is already in the resume data
        if (resume.data && typeof resume.data === 'object' && 'content' in resume.data) {
          content = resume.data.content as string;
          console.log('Found content in resume data');
        } 
        
        // 2. Otherwise, download and convert the file
        if (!content && resume.file_path) {
          console.log('No content in resume data, downloading file...');
          
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
          content = result.value;
          
          console.log('File converted to HTML, length:', content.length);
          
          // Save content to resume data for future use
          try {
            const currentData = resume.data || {};
            await supabase.from('resumes').update({
              data: {
                ...(typeof currentData === 'object' ? currentData : {}),
                content
              }
            }).eq('id', resumeId);
            
            console.log('Updated resume with HTML content');
          } catch (error) {
            console.error('Failed to update resume with content:', error);
            // Continue anyway, not fatal
          }
        }
        
        if (!content) {
          throw new Error('Failed to get resume content from any source');
        }

        // Set the resume content
        setResumeContent(content);
        console.log('Resume content set, length:', content.length);
        
        // Create an optimization record for this session
        try {
          const { data: optimizedResume, error: optimizedResumeError } = await supabase
            .from('optimized_resumes')
            .upsert({
              session_id: sessionId,
              file_path: resume.file_path,
              data: content
            })
            .select('id');
            
          if (!optimizedResumeError && optimizedResume) {
            console.log('Created optimized resume record:', optimizedResume);
          }
        } catch (error) {
          console.error('Error creating optimized resume record:', error);
          // Continue anyway, not fatal
        }

        setIsLoading(false);
      } catch (error) {
        console.error('Error in fetchData:', error);
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
            jobDescription={jobDescription}
            resumeContent={resumeContent}
            onResumeContentChange={setResumeContent}
            optimizationId={Number(optimizationSessionId)}
            onDownload={handleDownload}
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
