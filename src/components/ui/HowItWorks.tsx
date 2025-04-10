
import { FileUp, BookOpen, Download } from "lucide-react";

export default function HowItWorks() {
  const steps = [
    {
      title: "Upload Your Resume & Job Description",
      description: "Upload your existing resume and paste the job description or URL. Our AI will analyze both to identify gaps and opportunities.",
      icon: FileUp,
    },
    {
      title: "Review AI Suggestions",
      description: "Our AI analyzes your resume against the job description, highlights key missing skills, and suggests targeted improvements in real-time.",
      icon: BookOpen,
    },
    {
      title: "Download Your Optimized Resume",
      description: "Accept the suggestions you like, make any final edits, and download your ATS-optimized resume ready to submit to employers.",
      icon: Download,
    }
  ];

  return (
    <section id="how-it-works" className="py-16 md:py-24 bg-muted/50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold tracking-tight md:text-4xl">How It Works</h2>
          <p className="mt-4 text-lg text-foreground/70 max-w-2xl mx-auto">
            Our AI-powered platform makes resume optimization simple and effective
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {steps.map((step, index) => (
            <div key={index} className="bg-background rounded-lg p-6 shadow-sm border card-hover">
              <div className="relative">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 mb-6">
                  <step.icon className="h-6 w-6 text-primary" />
                </div>
                <span className="absolute top-0 right-0 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                  {index + 1}
                </span>
              </div>
              <h3 className="text-xl font-semibold mb-3">{step.title}</h3>
              <p className="text-foreground/70">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
