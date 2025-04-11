import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Upload, Trash2, Pencil } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { getUserResumes, uploadResume, deleteResume, updateResumeName, type Resume } from "@/services/resumes";
import { useAuth } from "@/contexts/AuthContext";
import ResumeUpload from "@/components/dashboard/ResumeUpload";

export default function Optimize() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedResumeType, setSelectedResumeType] = useState<"saved" | "new">("saved");
  const [selectedResumeId, setSelectedResumeId] = useState<string>("");
  const [jobDescription, setJobDescription] = useState("");
  const [jobUrl, setJobUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editingResume, setEditingResume] = useState<Resume | null>(null);
  const [newResumeName, setNewResumeName] = useState("");

  const loadResumes = useCallback(async () => {
    try {
      console.log('Loading resumes for user:', user?.id);
      const userResumes = await getUserResumes(user!.id);
      console.log('Loaded resumes:', userResumes);
      setResumes(userResumes);
    } catch (error) {
      console.error('Error loading resumes:', error);
      toast({
        title: "Error loading resumes",
        description: "Failed to load your saved resumes. Please try again.",
        variant: "destructive",
      });
    }
  }, [user, toast]);

  useEffect(() => {
    if (user?.id) {
      loadResumes();
    }
  }, [user?.id, loadResumes]);

  const handleResumeClick = useCallback((resumeId: string) => {
    console.log('Resume clicked:', resumeId);
    setSelectedResumeId(resumeId);
  }, []);

  const handleEditClick = useCallback((resume: Resume) => {
    setEditingResume(resume);
    setNewResumeName(resume.name || (typeof resume.data === 'object' && resume.data !== null ? (resume.data as { name?: string }).name : undefined) || `Resume ${resume.id.substring(0, 8)}`);
    setIsEditingName(true);
  }, []);

  const handleDeleteResume = useCallback(async (id: string) => {
    if (!user) return;

    try {
      await deleteResume(id, user.id);
      await loadResumes();
      if (selectedResumeId === id) {
        setSelectedResumeId("");
      }
      toast({
        title: "Resume deleted",
        description: "Your resume has been successfully deleted.",
      });
    } catch (error) {
      toast({
        title: "Delete failed",
        description: "Failed to delete your resume. Please try again.",
        variant: "destructive",
      });
    }
  }, [user, loadResumes, selectedResumeId, toast]);

  const renderResumeList = useMemo(() => {
    return resumes.map((resume) => (
      <div
        key={resume.id}
        className={`p-2 rounded-lg border cursor-pointer transition-colors ${
          selectedResumeId === resume.id ? 'bg-primary/10 border-primary' : 'hover:bg-muted'
        }`}
        onClick={() => handleResumeClick(resume.id)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            <div>
              <p className="font-medium text-sm">
                {resume.name || (typeof resume.data === 'object' && resume.data !== null ? (resume.data as { name?: string }).name : undefined) || `Resume ${resume.id.substring(0, 8)}`}
              </p>
              <p className="text-xs text-muted-foreground">
                Last modified: {new Date(resume.updated_at || resume.created_at || '').toLocaleDateString()}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                handleEditClick(resume);
              }}
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                handleDeleteResume(resume.id);
              }}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    ));
  }, [resumes, selectedResumeId, handleResumeClick, handleEditClick, handleDeleteResume]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    setIsLoading(true);
    try {
      // Extract name from file, removing extension
      const defaultName = file.name.replace(/\.[^/.]+$/, "");
      await uploadResume(file, user.id, defaultName);
      await loadResumes();
      toast({
        title: "Resume uploaded",
        description: "Your resume has been successfully uploaded.",
      });
      setSelectedResumeType("saved");
    } catch (error) {
      toast({
        title: "Upload failed",
        description: "Failed to upload your resume. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateResumeName = async () => {
    if (!editingResume || !user || !newResumeName.trim()) return;

    try {
      await updateResumeName(editingResume.id, newResumeName.trim(), user.id);
      await loadResumes();
      setIsEditingName(false);
      setEditingResume(null);
      toast({
        title: "Resume updated",
        description: "Your resume name has been successfully updated.",
      });
    } catch (error) {
      toast({
        title: "Update failed",
        description: "Failed to update resume name. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleOptimize = async () => {
    // Validate resume selection
    if (selectedResumeType === "saved" && !selectedResumeId) {
      toast({
        title: "Resume required",
        description: "Please select a resume to optimize.",
        variant: "destructive",
      });
      return;
    }

    // Validate job details
    if (!jobDescription.trim() && !jobUrl.trim()) {
      toast({
        title: "Job details required",
        description: "Please provide either a job description or URL.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      // Find the selected resume
      const selectedResume = resumes.find(r => r.id === selectedResumeId);
      if (!selectedResume) {
        throw new Error("Selected resume not found");
      }

      // Get the resume content
      let resumeContent = "";
      if (selectedResume.data && typeof selectedResume.data === 'object') {
        resumeContent = (selectedResume.data as any).content || "";
      }

      // Get the job details
      const jobDetails = jobDescription.trim() || jobUrl.trim();

      // TODO: Send to optimization API
      toast({
        title: "Starting optimization",
        description: "Your resume is being optimized. This may take a few moments.",
      });

      // For now, simulate the optimization process
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Navigate to the results page using React Router
      navigate(`/optimize/results?resumeId=${selectedResumeId}`);
    } catch (error) {
      console.error('Error optimizing resume:', error);
      toast({
        title: "Optimization failed",
        description: error instanceof Error ? error.message : "Failed to optimize your resume. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="container mx-auto p-4">
        <div className="mb-4">
          <h1 className="text-2xl font-bold">Create New Optimization</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Select a resume and provide job details to get AI-powered optimization suggestions
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-6xl mx-auto">
          {/* Resume Selection Section */}
          <Card className="h-fit">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Select Resume</CardTitle>
              <CardDescription className="text-sm">
                Choose from your saved resumes or upload a new one
              </CardDescription>
            </CardHeader>
            <CardContent>
              <RadioGroup
                value={selectedResumeType}
                onValueChange={(value) => setSelectedResumeType(value as "saved" | "new")}
                className="space-y-2"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="saved" id="saved" />
                  <Label htmlFor="saved">Select a saved resume</Label>
                </div>
                {selectedResumeType === "saved" && (
                  <div className="ml-6 space-y-2 max-h-[180px] overflow-y-auto">
                    {renderResumeList}
                  </div>
                )}

                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="new" id="new" />
                  <Label htmlFor="new">Upload a new resume</Label>
                </div>
                {selectedResumeType === "new" && (
                  <div className="ml-6">
                    <ResumeUpload
                      onUploadComplete={async (file, name) => {
                        if (!user) return;
                        setIsLoading(true);
                        try {
                          await uploadResume(file, user.id, name);
                          await loadResumes();
                          toast({
                            title: "Resume uploaded",
                            description: "Your resume has been successfully uploaded.",
                          });
                          setSelectedResumeType("saved");
                        } catch (error) {
                          toast({
                            title: "Upload failed",
                            description: "Failed to upload your resume. Please try again.",
                            variant: "destructive",
                          });
                        } finally {
                          setIsLoading(false);
                        }
                      }}
                    />
                  </div>
                )}
              </RadioGroup>
            </CardContent>
          </Card>

          {/* Job Details Section */}
          <Card className="h-fit">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Job Details</CardTitle>
              <CardDescription className="text-sm">
                Enter the job posting URL or paste the job description
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="url" className="space-y-2">
                <TabsList>
                  <TabsTrigger value="url">Job URL</TabsTrigger>
                  <TabsTrigger value="description">Job Description</TabsTrigger>
                </TabsList>
                <TabsContent value="url">
                  <div className="space-y-1">
                    <Label htmlFor="job-url" className="text-sm">Job Posting URL</Label>
                    <Input
                      id="job-url"
                      placeholder="https://..."
                      value={jobUrl}
                      onChange={(e) => setJobUrl(e.target.value)}
                    />
                  </div>
                </TabsContent>
                <TabsContent value="description">
                  <div className="space-y-1">
                    <Label htmlFor="job-description" className="text-sm">Job Description</Label>
                    <Textarea
                      id="job-description"
                      placeholder="Paste the job description here..."
                      className="min-h-[120px] max-h-[120px]"
                      value={jobDescription}
                      onChange={(e) => setJobDescription(e.target.value)}
                    />
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>

        <div className="max-w-6xl mx-auto mt-4">
          {/* Add debug info */}
          <div className="text-xs text-muted-foreground mb-2">
            <pre>
              {JSON.stringify({
                selectedResumeType,
                selectedResumeId,
                hasJobDescription: !!jobDescription,
                hasJobUrl: !!jobUrl,
                isLoading,
              }, null, 2)}
            </pre>
          </div>
          <Button
            className="w-full"
            size="lg"
            onClick={handleOptimize}
            disabled={
              (selectedResumeType === "saved" && !selectedResumeId) || 
              (!jobDescription.trim() && !jobUrl.trim()) || 
              isLoading
            }
          >
            {isLoading ? "Optimizing..." : "Start Optimization"}
          </Button>
        </div>
      </div>

      <Dialog open={isEditingName} onOpenChange={setIsEditingName}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Resume</DialogTitle>
            <DialogDescription>
              Enter a new name for your resume
            </DialogDescription>
          </DialogHeader>
          <Input
            value={newResumeName}
            onChange={(e) => setNewResumeName(e.target.value)}
            placeholder="Enter new name"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditingName(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateResumeName}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
