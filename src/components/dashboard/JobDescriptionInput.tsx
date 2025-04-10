
import { useState } from "react";
import { Link2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/use-toast";

interface JobDescriptionInputProps {
  onSubmit: (data: { type: 'description' | 'url', content: string }) => void;
}

export default function JobDescriptionInput({ onSubmit }: JobDescriptionInputProps) {
  const [jobDescription, setJobDescription] = useState("");
  const [jobUrl, setJobUrl] = useState("");
  const [activeTab, setActiveTab] = useState<"description" | "url">("description");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = () => {
    if (activeTab === "description" && !jobDescription.trim()) {
      toast({
        title: "Job description required",
        description: "Please enter a job description",
        variant: "destructive",
      });
      return;
    }

    if (activeTab === "url" && !jobUrl.trim()) {
      toast({
        title: "Job URL required",
        description: "Please enter a job posting URL",
        variant: "destructive",
      });
      return;
    }

    if (activeTab === "url" && !isValidUrl(jobUrl)) {
      toast({
        title: "Invalid URL",
        description: "Please enter a valid URL",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    // Simulate API call delay
    setTimeout(() => {
      const content = activeTab === "description" ? jobDescription : jobUrl;
      onSubmit({ type: activeTab, content });
      setIsLoading(false);
    }, 1500);
  };

  const isValidUrl = (url: string) => {
    try {
      new URL(url);
      return true;
    } catch (e) {
      return false;
    }
  };

  return (
    <div className="space-y-4 w-full">
      <Tabs 
        defaultValue="description" 
        className="w-full"
        onValueChange={(value) => setActiveTab(value as "description" | "url")}
      >
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="description">
            <Search className="h-4 w-4 mr-2" />
            Paste Job Description
          </TabsTrigger>
          <TabsTrigger value="url">
            <Link2 className="h-4 w-4 mr-2" />
            Job Posting URL
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="description" className="mt-4">
          <Textarea
            placeholder="Paste the job description here..."
            className="min-h-[200px] resize-none"
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
          />
        </TabsContent>
        
        <TabsContent value="url" className="mt-4">
          <div className="space-y-2">
            <Input
              placeholder="https://example.com/job-posting"
              value={jobUrl}
              onChange={(e) => setJobUrl(e.target.value)}
            />
            <p className="text-xs text-foreground/60">
              We'll automatically extract the job description from this URL.
            </p>
          </div>
        </TabsContent>
      </Tabs>

      <Button 
        className="w-full" 
        onClick={handleSubmit}
        disabled={isLoading}
      >
        {isLoading ? "Processing..." : "Analyze Resume Against Job"}
      </Button>
    </div>
  );
}
