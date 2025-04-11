import { useState } from "react";
import { FileUp, File, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/components/ui/use-toast";
import { Input } from "@/components/ui/input";

export default function ResumeUpload({ onUploadComplete }: { onUploadComplete?: (file: File, name: string) => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [resumeName, setResumeName] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const { toast } = useToast();

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const validateAndSetFile = (file: File) => {
    const validTypes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];
    
    if (!validTypes.includes(file.type)) {
      toast({
        title: "Invalid file type",
        description: "Please upload a PDF or Word document (.pdf, .doc, .docx)",
        variant: "destructive",
      });
      return;
    }
    
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please upload a file smaller than 5MB",
        variant: "destructive",
      });
      return;
    }
    
    setFile(file);
  };

  const removeFile = () => {
    setFile(null);
    setProgress(0);
  };

  const simulateUpload = () => {
    if (!resumeName.trim()) {
      toast({
        title: "Name required",
        description: "Please enter a name for your resume",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    setProgress(0);

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setUploading(false);
          
          if (onUploadComplete && file) {
            onUploadComplete(file, resumeName.trim());
          }
          
          toast({
            title: "Upload complete",
            description: `${resumeName} has been uploaded successfully.`,
          });
          
          return 100;
        }
        return prev + 10;
      });
    }, 300);
  };

  const getFileIcon = () => {
    if (!file) return null;
    
    const fileType = file.name.split('.').pop()?.toLowerCase();
    
    if (fileType === 'pdf') {
      return <File className="h-8 w-8 text-red-500" />;
    } else if (fileType === 'doc' || fileType === 'docx') {
      return <File className="h-8 w-8 text-blue-500" />;
    } else {
      return <File className="h-8 w-8 text-gray-500" />;
    }
  };

  return (
    <div className="w-full space-y-4">
      {!file ? (
        <div
          className={`border-2 border-dashed rounded-lg p-6 text-center ${
            dragActive ? "border-primary bg-primary/5" : "border-border"
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <input
            id="resume-upload"
            type="file"
            accept=".pdf,.doc,.docx"
            className="hidden"
            onChange={handleFileChange}
          />
          <div className="mx-auto flex flex-col items-center justify-center space-y-4">
            <div className="rounded-full bg-primary/10 p-3">
              <FileUp className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-base font-medium">
                Drag and drop your resume here
              </p>
              <p className="text-sm text-foreground/70 mt-1">
                or{" "}
                <label
                  htmlFor="resume-upload"
                  className="text-primary hover:text-primary/80 cursor-pointer"
                >
                  browse files
                </label>
              </p>
            </div>
            <p className="text-xs text-foreground/50">
              Supports PDF, DOC, DOCX (Max 5MB)
            </p>
          </div>
        </div>
      ) : (
        <div className="rounded-lg border p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {getFileIcon()}
              <div>
                <p className="text-sm font-medium truncate max-w-[200px]">
                  {file.name}
                </p>
                <p className="text-xs text-foreground/50">
                  {(file.size / 1024).toFixed(1)} KB
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={removeFile}
              disabled={uploading}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="mt-4">
            <Input
              placeholder="Enter resume name"
              value={resumeName}
              onChange={(e) => setResumeName(e.target.value)}
              disabled={uploading}
            />
          </div>
          
          {uploading && (
            <Progress value={progress} className="mt-3 h-2" />
          )}
          
          {!uploading && progress < 100 && (
            <Button 
              className="w-full mt-3" 
              onClick={simulateUpload}
              disabled={uploading || !resumeName.trim()}
            >
              Upload Resume
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
