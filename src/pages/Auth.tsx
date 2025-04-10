
import { useState } from "react";
import { useSearchParams, Link, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";

export default function Auth() {
  const [searchParams] = useSearchParams();
  const isSignUp = searchParams.get('signup') === 'true';
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent, type: 'login' | 'signup') => {
    e.preventDefault();
    
    if (!email || !password) {
      toast({
        title: "Missing fields",
        description: "Please fill out all required fields",
        variant: "destructive",
      });
      return;
    }
    
    if (type === 'signup' && !name) {
      toast({
        title: "Name required",
        description: "Please enter your name",
        variant: "destructive",
      });
      return;
    }
    
    setIsLoading(true);
    
    // Simulate authentication
    setTimeout(() => {
      setIsLoading(false);
      
      if (type === 'login') {
        // Simulate successful login
        toast({
          title: "Login successful",
          description: "Welcome back!",
        });
      } else {
        // Simulate successful signup
        toast({
          title: "Account created",
          description: "Your account has been created successfully",
        });
      }
      
      // Redirect to dashboard
      navigate('/dashboard');
    }, 1500);
  };

  const handleDemoLogin = () => {
    setEmail("demo@example.com");
    setPassword("demo123");
    setIsLoading(true);
    
    // Simulate authentication
    setTimeout(() => {
      setIsLoading(false);
      toast({
        title: "Demo login successful",
        description: "Welcome to the demo account!",
      });
      
      // Redirect to dashboard
      navigate('/dashboard');
    }, 1500);
  };

  return (
    <>
      <Helmet>
        <title>{isSignUp ? "Sign Up" : "Sign In"} - Resume ATS Optimizer</title>
      </Helmet>
      
      <div className="min-h-screen flex flex-col items-center justify-center bg-muted/30 p-4">
        <Link to="/" className="flex items-center gap-2 mb-8">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-primary"
          >
            <path d="M8 3H7a2 2 0 0 0-2 2v5a2 2 0 0 0 2 2h1" />
            <path d="M15 3h1a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-1" />
            <path d="M8 21h8" />
            <path d="M12 3v18" />
            <path d="M19 7H5" />
            <path d="M19 17H5" />
          </svg>
          <span className="font-semibold text-lg">Resume ATS Optimizer</span>
        </Link>
        
        <Card className="w-full max-w-md shadow-lg">
          <Tabs defaultValue={isSignUp ? "signup" : "login"}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Sign In</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>
            
            <TabsContent value="login">
              <form onSubmit={(e) => handleSubmit(e, 'login')}>
                <CardHeader>
                  <CardTitle>Sign In</CardTitle>
                  <CardDescription>
                    Enter your email and password to access your account
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="name@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="password">Password</Label>
                      <Link to="#" className="text-xs text-primary hover:underline">
                        Forgot password?
                      </Link>
                    </div>
                    <Input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>
                  
                  <Button 
                    type="button" 
                    variant="outline" 
                    className="w-full" 
                    onClick={handleDemoLogin}
                    disabled={isLoading}
                  >
                    Demo Login (Try Me!)
                  </Button>
                </CardContent>
                <CardFooter className="flex flex-col">
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? "Signing in..." : "Sign In"}
                  </Button>
                  <p className="text-center text-sm mt-4 text-foreground/70">
                    Don't have an account?{" "}
                    <Link to="/auth?signup=true" className="text-primary hover:underline">
                      Sign up
                    </Link>
                  </p>
                </CardFooter>
              </form>
            </TabsContent>
            
            <TabsContent value="signup">
              <form onSubmit={(e) => handleSubmit(e, 'signup')}>
                <CardHeader>
                  <CardTitle>Create an Account</CardTitle>
                  <CardDescription>
                    Enter your information to create a new account
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <Input
                      id="name"
                      placeholder="John Doe"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email-signup">Email</Label>
                    <Input
                      id="email-signup"
                      type="email"
                      placeholder="name@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password-signup">Password</Label>
                    <Input
                      id="password-signup"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                    <p className="text-xs text-foreground/70">
                      Must be at least 8 characters
                    </p>
                  </div>
                  
                  <Button 
                    type="button" 
                    variant="outline" 
                    className="w-full" 
                    onClick={handleDemoLogin}
                    disabled={isLoading}
                  >
                    Try Demo Instead
                  </Button>
                </CardContent>
                <CardFooter className="flex flex-col">
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? "Creating account..." : "Create Account"}
                  </Button>
                  <p className="text-center text-sm mt-4 text-foreground/70">
                    Already have an account?{" "}
                    <Link to="/auth" className="text-primary hover:underline">
                      Sign in
                    </Link>
                  </p>
                </CardFooter>
              </form>
            </TabsContent>
          </Tabs>
        </Card>
      </div>
    </>
  );
}
