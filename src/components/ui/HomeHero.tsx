import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, BarChart, CheckCircle, Clock } from "lucide-react";

export default function HomeHero() {
  return (
    <div className="relative overflow-hidden bg-background pt-20 pb-16 md:pb-24 lg:pb-32">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent" />
      
      <div className="container relative mx-auto px-4 sm:px-6 lg:px-8 flex flex-col items-center text-center">
        <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary mb-8">
          AI-Powered Resume Optimization
        </span>
        
        <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl md:text-6xl">
          Get Past the Bots,<br /> Land More Interviews
        </h1>
        
        <p className="mt-6 max-w-2xl text-lg text-foreground/70">
          Our AI analyzes your resume against job descriptions, identifies keyword gaps, 
          and suggests targeted improvements to help you pass Applicant Tracking Systems (ATS) 
          and land more interviews.
        </p>
        
        <div className="mt-10 flex flex-col sm:flex-row gap-4">
          <Link to="/auth/sign-up">
            <Button size="lg" className="rounded-full">
              Get Started
            </Button>
          </Link>
          <Link to="/#how-it-works">
            <Button variant="outline" className="text-md px-8 py-6 rounded-full">
              Learn How It Works
            </Button>
          </Link>
        </div>
        
        <div className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-4xl">
          <div className="flex flex-col items-center text-center p-4">
            <div className="rounded-full bg-primary/10 p-3 mb-4">
              <CheckCircle className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-lg font-semibold">ATS Optimized</h3>
            <p className="mt-2 text-sm text-foreground/70">Beat applicant tracking systems with AI-tailored keywords</p>
          </div>
          
          <div className="flex flex-col items-center text-center p-4">
            <div className="rounded-full bg-primary/10 p-3 mb-4">
              <BarChart className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-lg font-semibold">96% Match Rate</h3>
            <p className="mt-2 text-sm text-foreground/70">Our optimized resumes achieve 96% match rates with job descriptions</p>
          </div>
          
          <div className="flex flex-col items-center text-center p-4">
            <div className="rounded-full bg-primary/10 p-3 mb-4">
              <Clock className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-lg font-semibold">2-Minute Process</h3>
            <p className="mt-2 text-sm text-foreground/70">Upload and optimize in less than 2 minutes</p>
          </div>
        </div>
      </div>
    </div>
  );
}
