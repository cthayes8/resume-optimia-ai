import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Link2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/use-toast";

interface JobDescriptionInputProps {
  resumeId: string;
}

export default function JobDescriptionInput({ resumeId }: JobDescriptionInputProps) {
  const [jobDescription, setJobDescription] = useState("");
  const [jobUrl, setJobUrl] = useState("");
  const [activeTab, setActiveTab] = useState<"description" | "url">("description");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const SCRAPINGBEE_API_KEY = import.meta.env.VITE_SCRAPINGBEE_API_KEY;

  const handleSubmit = async () => {
    const isDescriptionTab = activeTab === "description";
    const content = isDescriptionTab ? jobDescription.trim() : jobUrl.trim();

    if (!content) {
      toast({
        title: isDescriptionTab ? "Job description required" : "Job URL required",
        description: `Please enter a ${isDescriptionTab ? "job description" : "valid job posting URL"}`,
        variant: "destructive",
      });
      return;
    }

    if (!isDescriptionTab && !isValidUrl(content)) {
      toast({
        title: "Invalid URL",
        description: "Please enter a valid URL",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    let finalDescription = content;

    if (!isDescriptionTab) {
      try {
        const response = await fetch(`https://app.scrapingbee.com/api/v1?api_key=${SCRAPINGBEE_API_KEY}&url=${encodeURIComponent(content)}&extract_rules={\"text\":\"body\"}`);
        const data = await response.json();
        finalDescription = data?.text || "";

        if (!finalDescription.trim()) {
          throw new Error("Scraped content was empty");
        }
      } catch (error) {
        toast({
          title: "Scraping failed",
          description: "We couldn’t extract the job description. Please paste it manually.",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }
    }

    localStorage.setItem("resumeOptimia_results_jobDescription", finalDescription);
    navigate(`/optimize/results?resumeId=${resumeId}`);
  };

  const isValidUrl = (url: string) => {
    try {
      new URL(url);
      return true;
    } catch {
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
