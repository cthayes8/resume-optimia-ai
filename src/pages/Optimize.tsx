
import { useState } from "react";
import { Helmet } from "react-helmet";
import { useNavigate } from "react-router-dom";
import { FileUp, FileText, ChevronRight } from "lucide-react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import ResumeUpload from "@/components/dashboard/ResumeUpload";
import JobDescriptionInput from "@/components/dashboard/JobDescriptionInput";
import { useToast } from "@/components/ui/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

export default function Optimize() {
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [jobData, setJobData] = useState<{ type: 'description' | 'url', content: string } | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleUploadComplete = (file: File) => {
    setResumeFile(file);
  };

  const handleJobSubmit = (data: { type: 'description' | 'url', content: string }) => {
    setJobData(data);
  };

  const handleAnalyze = () => {
    if (!resumeFile) {
      toast({
        title: "Resume required",
        description: "Please upload your resume before analyzing",
        variant: "destructive",
      });
      return;
    }

    if (!jobData) {
      toast({
        title: "Job information required",
        description: "Please provide a job description or URL",
        variant: "destructive",
      });
      return;
    }

    setIsAnalyzing(true);
    
    // Simulate API call for resume analysis
    setTimeout(() => {
      setIsAnalyzing(false);
      navigate("/results");
    }, 3000);
  };

  const canAnalyze = resumeFile && jobData;

  return (
    <>
      <Helmet>
        <title>Optimize Resume - Resume ATS Optimizer</title>
      </Helmet>
      
      <DashboardLayout>
        <div className="mb-8">
          <h2 className="text-2xl font-bold tracking-tight">
            Optimize Your Resume
          </h2>
          <p className="text-muted-foreground">
            Upload your resume and provide a job description to get started
          </p>
        </div>
        
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground mr-2">
                  1
                </div>
                <span>Upload Your Resume</span>
              </CardTitle>
              <CardDescription>
                Upload your existing resume in PDF or Word format
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResumeUpload onUploadComplete={handleUploadComplete} />
              
              {resumeFile && (
                <div className="mt-4 flex items-center text-sm text-green-500">
                  <FileText className="h-4 w-4 mr-2" />
                  <span>Resume uploaded successfully</span>
                </div>
              )}
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground mr-2">
                  2
                </div>
                <span>Add Job Details</span>
              </CardTitle>
              <CardDescription>
                Paste a job description or provide a job posting URL
              </CardDescription>
            </CardHeader>
            <CardContent>
              <JobDescriptionInput onSubmit={handleJobSubmit} />
              
              {jobData && (
                <div className="mt-4 flex items-center text-sm text-green-500">
                  <FileText className="h-4 w-4 mr-2" />
                  <span>Job details added successfully</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
        
        <div className="mt-8 text-center">
          <Separator className="my-8" />
          
          <Button 
            size="lg" 
            disabled={!canAnalyze || isAnalyzing} 
            onClick={handleAnalyze}
            className="px-8 py-6 text-lg rounded-full"
          >
            {isAnalyzing ? (
              "Analyzing Resume..."
            ) : (
              <>
                Analyze and Optimize Resume
                <ChevronRight className="ml-2 h-5 w-5" />
              </>
            )}
          </Button>
          
          {!canAnalyze && (
            <p className="mt-4 text-sm text-foreground/70">
              Please complete both steps above to continue
            </p>
          )}
        </div>
      </DashboardLayout>
    </>
  );
}
