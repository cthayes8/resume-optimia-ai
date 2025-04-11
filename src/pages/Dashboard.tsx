import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet";
import { FileText, BarChart } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";

export default function Dashboard() {
  const { user } = useAuth();
  const [recentOptimizations, setRecentOptimizations] = useState(0);
  const [isProUser, setIsProUser] = useState(false);

  useEffect(() => {
    const fetchUserData = async () => {
      if (user?.id) {
        // Fetch user's subscription status
        const { data: userData, error } = await supabase
          .from('users')
          .select('subscription_type')
          .eq('id', user.id)
          .single();
        
        if (!error && userData) {
          setIsProUser(userData.subscription_type === 'pro');
        }

        // Fetch recent optimizations count
        const { data: resumes, error: resumesError } = await supabase
          .from('resumes')
          .select('id')
          .eq('user_id', user.id);
        
        if (!resumesError && resumes) {
          setRecentOptimizations(resumes.length);
        }
      }
    };

    fetchUserData();
  }, [user]);

  return (
    <>
      <Helmet>
        <title>Dashboard | Resume Optimia</title>
      </Helmet>

      <DashboardLayout>
        <div className="space-y-8">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Welcome back, {user?.user_metadata?.full_name || 'User'}</h2>
            <p className="text-muted-foreground">
              Optimize your resume to increase your interview chances
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Create New Optimization Card */}
            <div className="bg-card rounded-lg border p-6">
              <div className="flex items-start gap-4">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <FileText className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1">
                  <h2 className="text-xl font-semibold">Create New Optimization</h2>
                  <p className="text-muted-foreground mt-2">
                    Optimize your resume for a specific job
                  </p>
                  <p className="text-sm text-muted-foreground mt-4">
                    Upload your resume and job description to get AI-powered optimization suggestions.
                  </p>
                  <Link to="/optimize">
                    <Button className="mt-6">Start New Optimization</Button>
                  </Link>
                </div>
              </div>
            </div>

            {/* Recent Optimizations Card */}
            <div className="bg-card rounded-lg border p-6">
              <div className="flex items-start gap-4">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <BarChart className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1">
                  <h2 className="text-xl font-semibold">Recent Optimizations</h2>
                  <p className="text-muted-foreground mt-2">
                    View your recent resume optimizations
                  </p>
                  <p className="text-sm text-muted-foreground mt-4">
                    You have {recentOptimizations} recent optimizations.
                  </p>
                  <Link to="/history">
                    <Button variant="outline" className="mt-6">View History</Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* Upgrade to Pro Card - Only shown for non-pro users */}
          {!isProUser && (
            <div className="mt-8 bg-card rounded-lg border p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold">Upgrade to Pro</h2>
                  <p className="text-muted-foreground mt-2">
                    Get unlimited optimizations and premium features
                  </p>
                </div>
                <Link to="/settings">
                  <Button variant="default">Upgrade Now</Button>
                </Link>
              </div>
            </div>
          )}
        </div>
      </DashboardLayout>
    </>
  );
}
