
import { Helmet } from "react-helmet";
import { Link } from "react-router-dom";
import { FileText, BarChart2 } from "lucide-react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import DashboardCard from "@/components/dashboard/DashboardCard";
import { Button } from "@/components/ui/button";

export default function Dashboard() {
  // Mock user data - would come from auth context in real app
  const user = {
    name: "John Doe",
    email: "john@example.com",
    recentOptimizations: 2,
    plan: "Free",
  };

  return (
    <>
      <Helmet>
        <title>Dashboard - Resume ATS Optimizer</title>
      </Helmet>
      
      <DashboardLayout>
        <div className="mb-8">
          <h2 className="text-2xl font-bold tracking-tight">
            Welcome back, {user.name}
          </h2>
          <p className="text-muted-foreground">
            Optimize your resume to increase your interview chances
          </p>
        </div>
        
        <div className="grid gap-6 sm:grid-cols-2">
          <DashboardCard
            title="Create New Optimization"
            description="Optimize your resume for a specific job"
            icon={<FileText />}
            linkTo="/optimize"
          >
            <p className="text-sm text-foreground/70 mb-4">
              Upload your resume and job description to get AI-powered optimization suggestions.
            </p>
            <Button className="w-full">
              Start New Optimization
            </Button>
          </DashboardCard>
          
          <DashboardCard
            title="Recent Optimizations"
            description="View your recent resume optimizations"
            icon={<BarChart2 />}
            linkTo="/history"
          >
            <div className="space-y-4">
              <p className="text-sm text-foreground/70">
                You have {user.recentOptimizations} recent optimization{user.recentOptimizations !== 1 && 's'}.
              </p>
              <Button variant="outline" className="w-full">
                View History
              </Button>
            </div>
          </DashboardCard>
        </div>
        
        <div className="mt-10 border rounded-lg p-6 bg-muted/20">
          <div className="flex flex-col sm:flex-row items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Upgrade to Pro</h3>
              <p className="text-foreground/70 mt-1">
                Get unlimited optimizations and premium features
              </p>
            </div>
            <Link to="/settings" className="mt-4 sm:mt-0">
              <Button>Upgrade Now</Button>
            </Link>
          </div>
        </div>
      </DashboardLayout>
    </>
  );
}
