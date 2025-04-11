import { Helmet } from "react-helmet-async";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/ui/Footer";

// Mock blog data - replace with real data from your backend
const blogPosts = [
  {
    id: 1,
    title: "10 Tips to Make Your Resume ATS-Friendly",
    description: "Learn the essential strategies to optimize your resume for Applicant Tracking Systems and increase your chances of landing interviews.",
    date: "March 20, 2024",
    readTime: "5 min read",
    category: "Resume Tips",
  },
  {
    id: 2,
    title: "Understanding Modern ATS Systems",
    description: "A deep dive into how Applicant Tracking Systems work and what they look for in resumes.",
    date: "March 18, 2024",
    readTime: "7 min read",
    category: "ATS Insights",
  },
  {
    id: 3,
    title: "The Impact of AI on Resume Screening",
    description: "Explore how artificial intelligence is changing the way companies screen resumes and what it means for job seekers.",
    date: "March 15, 2024",
    readTime: "6 min read",
    category: "Industry Trends",
  },
];

export default function Blog() {
  return (
    <>
      <Helmet>
        <title>Blog | Resume ATS Optimizer</title>
        <meta 
          name="description" 
          content="Expert insights, tips, and strategies for optimizing your resume and navigating modern job application systems." 
        />
      </Helmet>

      <div className="flex flex-col min-h-screen">
        <Navbar />
        
        <main className="flex-grow container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-4xl font-bold mb-2">Resume Optimization Blog</h1>
            <p className="text-muted-foreground mb-8">
              Expert insights and tips to help you land your dream job
            </p>

            <div className="grid gap-6">
              {blogPosts.map((post) => (
                <Card key={post.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-muted-foreground">{post.category}</span>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>{post.date}</span>
                        <span>•</span>
                        <span>{post.readTime}</span>
                      </div>
                    </div>
                    <CardTitle className="text-2xl">{post.title}</CardTitle>
                    <CardDescription className="mt-2">{post.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button variant="outline" asChild>
                      <Link to={`/blog/${post.id}`}>Read More</Link>
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </main>

        <Footer />
      </div>
    </>
  );
} 