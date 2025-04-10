
import { Target, Search, ThumbsUp, TrendingUp, RefreshCw, Clock } from "lucide-react";

export default function Benefits() {
  const benefits = [
    {
      title: "ATS Keyword Optimization",
      description: "Our AI identifies and adds missing keywords from the job description to help your resume pass ATS filters.",
      icon: Target,
    },
    {
      title: "Real-Time Compatibility Score",
      description: "See exactly how well your resume matches the job requirements with our real-time scoring system.",
      icon: Search,
    },
    {
      title: "Industry-Specific Tailoring",
      description: "Get recommendations tailored to your specific industry and job title to stand out from the competition.",
      icon: ThumbsUp,
    },
    {
      title: "Improved Interview Chances",
      description: "Our users report a 3x increase in interview invitations after optimizing their resumes with our AI.",
      icon: TrendingUp,
    },
    {
      title: "Unlimited Revisions",
      description: "Try different versions of your resume for different jobs without starting from scratch each time.",
      icon: RefreshCw,
    },
    {
      title: "Save Hours of Editing Time",
      description: "What would take hours to research and implement manually is done in minutes with our AI assistant.",
      icon: Clock,
    }
  ];

  return (
    <section id="benefits" className="py-16 md:py-24">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
            Why Use AI for Resume Optimization?
          </h2>
          <p className="mt-4 text-lg text-foreground/70 max-w-2xl mx-auto">
            Stand out in today's competitive job market with an AI-optimized resume
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {benefits.map((benefit, index) => (
            <div key={index} className="flex flex-col p-6 bg-background rounded-lg shadow-sm border card-hover">
              <div className="rounded-full bg-primary/10 p-3 w-12 h-12 flex items-center justify-center mb-4">
                <benefit.icon className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">{benefit.title}</h3>
              <p className="text-foreground/70 flex-grow">{benefit.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
