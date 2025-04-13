import { useEffect, useState, useCallback, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { createBrowserClient } from '@supabase/ssr';
import { User } from '@supabase/supabase-js';
import OptimizationResults from '@/components/dashboard/OptimizationResults';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2 } from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import mammoth from 'mammoth';
import * as pdfjs from 'pdfjs-dist';

// Set worker path for PDF.js
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

// Local storage key prefix
const STORAGE_KEY_PREFIX = 'resumeOptimia_';

interface LocationState {
  resumeId: string;
  source: string;
  resumeContent: string;
  jobDescription: string;
  jobUrl: string;
}

export default function Results() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const state = location.state as LocationState;
  
  // Memoize Supabase client creation to prevent recreation on every render
  const supabase = useMemo(() => createBrowserClient(
    import.meta.env.VITE_SUPABASE_URL!,
    import.meta.env.VITE_SUPABASE_ANON_KEY!
  ), []);
  
  // Memoize state initialization to prevent recalculation
  const initialResumeId = useMemo(() => {
    return state?.resumeId || localStorage.getItem(`${STORAGE_KEY_PREFIX}selectedResumeId`) || '';
  }, [state?.resumeId]);

  const initialJobDescription = useMemo(() => {
    return state?.jobDescription || 
           state?.jobUrl || 
           localStorage.getItem(`${STORAGE_KEY_PREFIX}activeJobDescription`) || 
           localStorage.getItem(`${STORAGE_KEY_PREFIX}activeJobUrl`) || 
           '';
  }, [state?.jobDescription, state?.jobUrl]);

  // State declarations
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [optimizationId, setOptimizationId] = useState<number | null>(null);
  const [resumeId, setResumeId] = useState(initialResumeId);
  const [resumeContent, setResumeContent] = useState('');
  const [jobDescription, setJobDescription] = useState(initialJobDescription);
  
  // Memoize the fetchResumeContent function
  const fetchResumeContent = useCallback(async () => {
    if (!resumeId) return;
    
    try {
      console.log('Fetching resume content for ID:', resumeId);
      const { data, error } = await supabase
        .from('resumes')
        .select('*')
        .eq('id', resumeId)
        .single();

      if (error) {
        console.error('Database error:', error);
        throw error;
      }

      console.log('Resume data:', data);

      if (!data || !data.data) {
        console.warn('No resume data found');
        throw new Error('Resume not found');
      }

      // Extract the file path from the data
      const filePath = data.data.url ? 
        data.data.url.split('/resume-files/')[1] : 
        `${user?.id}/${data.data.original_filename}`;

      if (!filePath) {
        console.error('No valid file path found in resume data:', data);
        throw new Error('Invalid resume file path');
      }

      console.log('Attempting to download file:', filePath);

      // Download the file from Supabase Storage
      const { data: fileData, error: downloadError } = await supabase
        .storage
        .from('resume-files')
        .download(filePath);

      if (downloadError) {
        console.error('File download error:', downloadError);
        throw new Error('Failed to download resume file');
      }

      // Convert the file to text based on type
      let content = '';
      const fileName = filePath.toLowerCase();

      if (fileName.endsWith('.pdf')) {
        // Handle PDF files with formatting
        const arrayBuffer = await fileData.arrayBuffer();
        const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
        const numPages = pdf.numPages;
        const textContent = [];
        
        for (let i = 1; i <= numPages; i++) {
          const page = await pdf.getPage(i);
          const text = await page.getTextContent();
          let lastY, textBlock = [];
          
          // Group text items by their vertical position to preserve layout
          text.items.forEach((item: any) => {
            const y = Math.round(item.transform[5]); // Vertical position
            if (lastY !== y && textBlock.length > 0) {
              textContent.push(textBlock.join(''));
              textBlock = [];
            }
            textBlock.push(item.str);
            lastY = y;
          });
          
          if (textBlock.length > 0) {
            textContent.push(textBlock.join(''));
          }
        }
        
        content = textContent.join('\n');
      } else if (fileName.endsWith('.docx')) {
        // Handle DOCX files with formatting
        const arrayBuffer = await fileData.arrayBuffer();
        const result = await mammoth.convertToHtml({ arrayBuffer }, {
          styleMap: [
            "p[style-name='Heading 1'] => h1:fresh",
            "p[style-name='Heading 2'] => h2:fresh",
            "p[style-name='Heading 3'] => h3:fresh",
            "b => strong",
            "i => em",
            "u => u",
            "strike => s",
            "p => p:fresh",
            "p[style-name='List Paragraph'] => li:fresh"
          ]
        });
        content = result.value;
      } else if (fileName.endsWith('.doc')) {
        throw new Error('Legacy .doc files are not supported. Please convert to .docx or PDF.');
      } else {
        throw new Error('Unsupported file format. Please upload a PDF or DOCX file.');
      }

      console.log('Extracted content type:', typeof content);
      console.log('Content length:', content?.length);

      if (!content || !content.trim()) {
        console.warn('Empty content extracted from file');
        throw new Error('Could not extract content from resume file');
      }

      setResumeContent(content);
    } catch (err) {
      console.error('Error fetching resume content:', err);
      setError(err instanceof Error ? err.message : 'Failed to load resume content');
    }
  }, [resumeId, user, supabase]);

  // Memoize resume content change handler
  const handleResumeContentChange = useCallback(async (content: string) => {
    setResumeContent(content);
    localStorage.setItem(`${STORAGE_KEY_PREFIX}resumeContent`, content);
    
    if (resumeId) {
      try {
        // Get the current resume data first
        const { data: currentResume, error: fetchError } = await supabase
          .from('resumes')
          .select('data')
          .eq('id', resumeId)
          .single();

        if (fetchError) {
          console.error('Error fetching current resume:', fetchError);
          return;
        }

        // Update only the content field while preserving other data
        const updatedData = {
          ...currentResume.data,
          content: content,
          last_modified: new Date().toISOString()
        };

        // Update the resume
        const { error: updateError } = await supabase
          .from('resumes')
          .update({ data: updatedData })
          .eq('id', resumeId);

        if (updateError) {
          console.error('Error updating resume content:', updateError);
        }
      } catch (error) {
        console.error('Error updating resume content:', error);
      }
    }
  }, [resumeId, supabase]);

  // Memoize download handler
  const handleDownload = useCallback(() => {
    // Create a Blob with HTML content and proper MIME type
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
  body {
    font-family: Arial, sans-serif;
    line-height: 1.6;
    margin: 40px;
  }
  h1, h2, h3 { margin-top: 0; }
  ul, ol { margin: 0; padding-left: 20px; }
  p { margin: 0 0 10px 0; }
  .text-center { text-align: center; }
  .text-right { text-align: right; }
</style>
</head>
<body>
${resumeContent}
</body>
</html>`;

    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'optimized-resume.html';
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  }, [resumeContent]);

  // Memoize createOptimizationSession
  const createOptimizationSession = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // First, create a job description entry
      const { data: jobDescData, error: jobDescError } = await supabase
        .from('job_descriptions')
        .insert([
          {
            user_id: user?.id,
            data: { content: jobDescription },
          },
        ])
        .select()
        .single();

      if (jobDescError) {
        throw new Error(jobDescError.message);
      }

      // Then create the optimization session with the job description ID
      const { data, error: insertError } = await supabase
        .from('optimization_sessions')
        .insert([
          {
            user_id: user?.id,
            resume_id: resumeId,
            job_description_id: jobDescData.id,
          },
        ])
        .select()
        .single();

      if (insertError) {
        throw new Error(insertError.message);
      }

      setOptimizationId(data.id);
      setIsLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setIsLoading(false);
    }
  }, [user, resumeId, jobDescription, supabase]);

  // Fetch resume content when resumeId changes
  useEffect(() => {
    if (resumeId) {
      fetchResumeContent();
    }
  }, [resumeId, fetchResumeContent]);

  // Create optimization session only when needed
  useEffect(() => {
    if (!user) {
      return;
    }

    if (!resumeId || !jobDescription) {
      navigate('/optimize', { replace: true });
      return;
    }

    // Only create session if we don't already have an optimizationId
    if (!optimizationId) {
      createOptimizationSession();
    }
  }, [user, resumeId, jobDescription, navigate, createOptimizationSession, optimizationId]);

  // Development-only logging
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('Results component rendered with:', {
        resumeId,
        resumeContent: resumeContent ? 'content present' : 'no content',
        jobDescription: jobDescription ? 'description present' : 'no description',
        optimizationId
      });
    }
  }, [resumeId, resumeContent, jobDescription, optimizationId]);

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex h-screen items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout>
        <div className="container mx-auto mt-8 max-w-2xl">
          <Alert variant="destructive">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </div>
      </DashboardLayout>
    );
  }

  if (!optimizationId) {
    return (
      <DashboardLayout>
        <div className="container mx-auto mt-8 max-w-2xl">
          <Alert>
            <AlertTitle>No optimization in progress</AlertTitle>
            <AlertDescription>
              Please start a new optimization from the optimize page.
            </AlertDescription>
          </Alert>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <OptimizationResults
        jobDescription={jobDescription}
        resumeContent={resumeContent}
        onResumeContentChange={handleResumeContentChange}
        optimizationId={optimizationId}
        onDownload={handleDownload}
      />
    </DashboardLayout>
  );
}
