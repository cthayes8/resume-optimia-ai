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
import { supabase } from "@/lib/supabase";

// Local storage keys for persisting state
const STORAGE_KEY_PREFIX = 'resumeOptimia_';
const RESUME_TYPE_KEY = `${STORAGE_KEY_PREFIX}selectedResumeType`;
const RESUME_ID_KEY = `${STORAGE_KEY_PREFIX}selectedResumeId`;
const JOB_DESC_KEY = `${STORAGE_KEY_PREFIX}jobDescription`;
const JOB_URL_KEY = `${STORAGE_KEY_PREFIX}jobUrl`;

export default function Optimize() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [userSubscription, setUserSubscription] = useState<string | null>(null);
  
  // Initialize state from localStorage or defaults
  const [selectedResumeType, setSelectedResumeType] = useState<"saved" | "new">(() => {
    const saved = localStorage.getItem(RESUME_TYPE_KEY);
    return (saved as "saved" | "new") || "saved";
  });
  
  const [selectedResumeId, setSelectedResumeId] = useState<string>(() => {
    return localStorage.getItem(RESUME_ID_KEY) || "";
  });
  
  const [jobDescription, setJobDescription] = useState(() => {
    return localStorage.getItem(JOB_DESC_KEY) || "";
  });
  
  const [jobUrl, setJobUrl] = useState(() => {
    return localStorage.getItem(JOB_URL_KEY) || "";
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editingResume, setEditingResume] = useState<Resume | null>(null);
  const [newResumeName, setNewResumeName] = useState("");

  // Persist state to localStorage when it changes
  useEffect(() => {
    localStorage.setItem(RESUME_TYPE_KEY, selectedResumeType);
  }, [selectedResumeType]);
  
  useEffect(() => {
    localStorage.setItem(RESUME_ID_KEY, selectedResumeId);
  }, [selectedResumeId]);
  
  useEffect(() => {
    localStorage.setItem(JOB_DESC_KEY, jobDescription);
  }, [jobDescription]);
  
  useEffect(() => {
    localStorage.setItem(JOB_URL_KEY, jobUrl);
  }, [jobUrl]);

  useEffect(() => {
    const checkSubscription = async () => {
      if (user?.id) {
        const { data: userData, error } = await supabase
          .from('users')
          .select('subscription_type')
          .eq('id', user.id)
          .single();
        
        if (!error && userData) {
          setUserSubscription(userData.subscription_type);
        }
      }
    };

    checkSubscription();
  }, [user]);

  // Custom state updaters that also update localStorage
  const updateSelectedResumeType = (value: "saved" | "new") => {
    setSelectedResumeType(value);
    localStorage.setItem(RESUME_TYPE_KEY, value);
  };
  
  const updateSelectedResumeId = (value: string) => {
    setSelectedResumeId(value);
    localStorage.setItem(RESUME_ID_KEY, value);
  };
  
  const updateJobDescription = (value: string) => {
    setJobDescription(value);
    localStorage.setItem(JOB_DESC_KEY, value);
  };
  
  const updateJobUrl = (value: string) => {
    setJobUrl(value);
    localStorage.setItem(JOB_URL_KEY, value);
  };

  const loadResumes = useCallback(async () => {
    try {
      console.log('Loading resumes for user:', user?.id);
      const userResumes = await getUserResumes(user!.id);
      console.log('Loaded resumes:', userResumes);
      setResumes(userResumes);
      
      // If we have a selectedResumeId from localStorage, validate it exists in the loaded resumes
      if (selectedResumeId && !userResumes.some(r => r.id === selectedResumeId)) {
        // If the resume no longer exists, clear the selection
        updateSelectedResumeId("");
      }
    } catch (error) {
      console.error('Error loading resumes:', error);
      toast({
        title: "Error loading resumes",
        description: "Failed to load your saved resumes. Please try again.",
        variant: "destructive",
      });
    }
  }, [user, toast, selectedResumeId]);

  useEffect(() => {
    if (user?.id) {
      loadResumes();
    }
  }, [user?.id, loadResumes]);

  const handleResumeClick = useCallback((resumeId: string) => {
    console.log('Resume clicked:', resumeId);
    updateSelectedResumeId(resumeId);
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
        updateSelectedResumeId("");
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

  const handleFileUpload = async (file: File, name: string) => {
    if (!user) return;

    setIsLoading(true);
    try {
      await uploadResume(file, user.id, name);
      await loadResumes();
      toast({
        title: "Resume uploaded",
        description: "Your resume has been successfully uploaded.",
      });
      updateSelectedResumeType("saved");
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
    if (!user) {
      toast({
        title: "Not logged in",
        description: "Please log in to optimize your resume.",
        variant: "destructive",
      });
      return;
    }

    if (!selectedResumeId) {
      toast({
        title: "No resume selected",
        description: "Please select or upload a resume first.",
        variant: "destructive",
      });
      return;
    }

    if (!jobDescription.trim() && !jobUrl.trim()) {
      toast({
        title: "Job information required",
        description: "Please enter a job description or URL.",
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

      // Store optimization data in localStorage
      localStorage.setItem(`${STORAGE_KEY_PREFIX}selectedResumeId`, selectedResumeId);
      localStorage.setItem(`${STORAGE_KEY_PREFIX}activeJobDescription`, jobDescription.trim());
      localStorage.setItem(`${STORAGE_KEY_PREFIX}activeJobUrl`, jobUrl.trim());

      // Navigate to results page with required state
      navigate("/optimize/results", {
        state: {
          resumeId: selectedResumeId,
          source: 'optimize',
          jobDescription: jobDescription.trim(),
          jobUrl: jobUrl.trim()
        }
      });
    } catch (error) {
      console.error('Error starting optimization:', error);
      toast({
        title: "Optimization failed",
        description: error instanceof Error ? error.message : "Failed to start optimization",
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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Select Resume</CardTitle>
              <CardDescription>Choose from your saved resumes or upload a new one</CardDescription>
            </CardHeader>
            <CardContent>
              <RadioGroup 
                defaultValue={selectedResumeType}
                className="mb-4"
                onValueChange={(value) => updateSelectedResumeType(value as "saved" | "new")}
              >
                <div className="flex items-center space-x-2 mb-2">
                  <RadioGroupItem value="saved" id="saved" />
                  <Label htmlFor="saved">Select a saved resume</Label>
                </div>
                {selectedResumeType === "saved" && (
                  <div className="pl-6 space-y-2 my-2">
                    {renderResumeList}
                    {resumes.length === 0 && (
                      <p className="text-sm text-muted-foreground">
                        No saved resumes found. Please upload a resume.
                      </p>
                    )}
                  </div>
                )}
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="new" id="new" />
                  <Label htmlFor="new">Upload a new resume</Label>
                </div>
                {selectedResumeType === "new" && (
                  <div className="pl-6 mt-2">
                    <ResumeUpload
                      onUploadComplete={(file, name) => handleFileUpload(file, name)}
                    />
                  </div>
                )}
              </RadioGroup>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Job Details</CardTitle>
              <CardDescription>Enter the job description or paste the job posting URL</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="description">
                <TabsList className="mb-4">
                  <TabsTrigger value="description">Job Description</TabsTrigger>
                  <TabsTrigger value="url">Job URL</TabsTrigger>
                </TabsList>

                <TabsContent value="description">
                  <Textarea
                    placeholder="Paste the full job description here..."
                    className="min-h-40 mb-4"
                    value={jobDescription}
                    onChange={(e) => updateJobDescription(e.target.value)}
                  />
                </TabsContent>

                <TabsContent value="url">
                  <Input
                    placeholder="https://example.com/jobs/software-engineer"
                    className="mb-4"
                    value={jobUrl}
                    onChange={(e) => updateJobUrl(e.target.value)}
                  />
                </TabsContent>
              </Tabs>

              <Button
                className="w-full"
                onClick={handleOptimize}
                disabled={isLoading}
              >
                {isLoading ? "Processing..." : "Start Optimization"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={isEditingName} onOpenChange={setIsEditingName}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Resume Name</DialogTitle>
            <DialogDescription>
              Enter a new name for your resume.
            </DialogDescription>
          </DialogHeader>
          <Input 
            value={newResumeName} 
            onChange={(e) => setNewResumeName(e.target.value)}
            placeholder="Resume name"
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
