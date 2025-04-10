
import { useState } from "react";
import { Helmet } from "react-helmet";
import { toast } from "sonner";
import { UserCog, Lock, CreditCard, Bell, LogOut } from "lucide-react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function Settings() {
  // User data - in a real app, this would come from context or API
  const [user, setUser] = useState({
    name: "John Doe",
    email: "john@example.com",
    profilePicture: "",
    plan: "free",
  });

  // Form states
  const [profileForm, setProfileForm] = useState({
    name: user.name,
    email: user.email,
  });

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  // Notification settings
  const [notifications, setNotifications] = useState({
    email: true,
    optimization: true,
    marketing: false,
  });

  // Handle profile update
  const handleProfileUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    // Simulate API call
    setTimeout(() => {
      setUser({
        ...user,
        name: profileForm.name,
        email: profileForm.email,
      });
      toast.success("Profile updated successfully");
    }, 500);
  };

  // Handle password update
  const handlePasswordUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error("New passwords don't match");
      return;
    }
    
    if (passwordForm.newPassword.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    
    // Simulate API call
    setTimeout(() => {
      setPasswordForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      toast.success("Password updated successfully");
    }, 500);
  };

  // Handle notification toggle
  const handleNotificationToggle = (key: keyof typeof notifications) => {
    setNotifications({
      ...notifications,
      [key]: !notifications[key],
    });
    
    toast.success(`${key.charAt(0).toUpperCase() + key.slice(1)} notifications ${!notifications[key] ? 'enabled' : 'disabled'}`);
  };

  // Handle logout
  const handleLogout = () => {
    // Simulate logout API call
    setTimeout(() => {
      window.location.href = "/";
    }, 500);
  };

  return (
    <>
      <Helmet>
        <title>Account Settings</title>
      </Helmet>
      
      <DashboardLayout>
        <div className="mb-8">
          <h2 className="text-2xl font-bold tracking-tight">Account Settings</h2>
          <p className="text-muted-foreground">
            Manage your account preferences and subscription
          </p>
        </div>
        
        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className="bg-card">
            <TabsTrigger value="profile" className="data-[state=active]:bg-background">
              <UserCog className="mr-2 h-4 w-4" />
              Profile
            </TabsTrigger>
            <TabsTrigger value="security" className="data-[state=active]:bg-background">
              <Lock className="mr-2 h-4 w-4" />
              Security
            </TabsTrigger>
            <TabsTrigger value="billing" className="data-[state=active]:bg-background">
              <CreditCard className="mr-2 h-4 w-4" />
              Subscription
            </TabsTrigger>
            <TabsTrigger value="notifications" className="data-[state=active]:bg-background">
              <Bell className="mr-2 h-4 w-4" />
              Notifications
            </TabsTrigger>
          </TabsList>
          
          {/* Profile Tab */}
          <TabsContent value="profile" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Profile Information</CardTitle>
                <CardDescription>
                  Update your account details and profile picture
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleProfileUpdate} className="space-y-6">
                  <div className="flex flex-col md:flex-row gap-6">
                    <div className="flex flex-col items-center gap-4">
                      <Avatar className="h-24 w-24">
                        <AvatarImage src={user.profilePicture} alt={user.name} />
                        <AvatarFallback className="text-lg">{user.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                      </Avatar>
                      <Button variant="outline" size="sm">
                        Change Photo
                      </Button>
                    </div>
                    
                    <div className="flex-1 space-y-4">
                      <div className="grid gap-2">
                        <Label htmlFor="name">Full Name</Label>
                        <Input 
                          id="name" 
                          value={profileForm.name}
                          onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                          placeholder="Your full name" 
                        />
                      </div>
                      
                      <div className="grid gap-2">
                        <Label htmlFor="email">Email Address</Label>
                        <Input 
                          id="email" 
                          type="email"
                          value={profileForm.email}
                          onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                          placeholder="Your email address" 
                        />
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex justify-end">
                    <Button type="submit">Save Changes</Button>
                  </div>
                </form>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Delete Account</CardTitle>
                <CardDescription>
                  Permanently delete your account and all of your data
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Once you delete your account, there is no going back. This action cannot be undone.
                </p>
                <Button variant="destructive">Delete Account</Button>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Security Tab */}
          <TabsContent value="security" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Change Password</CardTitle>
                <CardDescription>
                  Update your password to ensure account security
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handlePasswordUpdate} className="space-y-4">
                  <div className="grid gap-2">
                    <Label htmlFor="current-password">Current Password</Label>
                    <Input 
                      id="current-password" 
                      type="password"
                      value={passwordForm.currentPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                      placeholder="Enter your current password" 
                    />
                  </div>
                  
                  <div className="grid gap-2">
                    <Label htmlFor="new-password">New Password</Label>
                    <Input 
                      id="new-password" 
                      type="password"
                      value={passwordForm.newPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                      placeholder="Enter your new password" 
                    />
                  </div>
                  
                  <div className="grid gap-2">
                    <Label htmlFor="confirm-password">Confirm New Password</Label>
                    <Input 
                      id="confirm-password" 
                      type="password"
                      value={passwordForm.confirmPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                      placeholder="Confirm your new password" 
                    />
                  </div>
                  
                  <div className="flex justify-end">
                    <Button type="submit">Update Password</Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Billing Tab */}
          <TabsContent value="billing" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Subscription Plan</CardTitle>
                <CardDescription>
                  Manage your subscription and billing information
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="p-4 border rounded-lg bg-muted/30">
                  <div className="flex justify-between items-center mb-4">
                    <div>
                      <h3 className="text-lg font-medium">Current Plan</h3>
                      <div className="flex items-center mt-1">
                        <span className="text-muted-foreground mr-2">
                          {user.plan === "free" ? "Free Plan" : user.plan === "basic" ? "Basic Plan" : "Pro Plan"}
                        </span>
                        <Badge variant={user.plan === "free" ? "outline" : user.plan === "basic" ? "secondary" : "success"}>
                          {user.plan === "free" ? "Free" : user.plan === "basic" ? "Basic" : "Pro"}
                        </Badge>
                      </div>
                    </div>
                    
                    {user.plan === "free" ? (
                      <Button>Upgrade Now</Button>
                    ) : (
                      <Button variant="outline">Manage Plan</Button>
                    )}
                  </div>
                  
                  {user.plan !== "free" && (
                    <div className="text-sm text-muted-foreground">
                      <p>Your next billing date is on <span className="font-medium">May 15, 2025</span></p>
                    </div>
                  )}
                </div>
                
                {user.plan !== "free" && (
                  <>
                    <div className="space-y-4">
                      <h3 className="text-lg font-medium">Payment Method</h3>
                      <div className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center">
                          <div className="h-10 w-14 bg-muted rounded flex items-center justify-center mr-4">
                            <CreditCard className="h-6 w-6" />
                          </div>
                          <div>
                            <p className="font-medium">Visa ending in 4242</p>
                            <p className="text-sm text-muted-foreground">Expires 04/25</p>
                          </div>
                        </div>
                        <Button variant="ghost" size="sm">Change</Button>
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <h3 className="text-lg font-medium">Billing History</h3>
                      <div className="border rounded-lg divide-y">
                        <div className="p-4 flex justify-between items-center">
                          <div>
                            <p className="font-medium">April 15, 2025</p>
                            <p className="text-sm text-muted-foreground">
                              {user.plan === "basic" ? "Basic Plan - Monthly" : "Pro Plan - Monthly"}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-medium">{user.plan === "basic" ? "$19.99" : "$49.99"}</p>
                            <Button variant="ghost" size="sm" className="h-8 px-2">Receipt</Button>
                          </div>
                        </div>
                        <div className="p-4 flex justify-between items-center">
                          <div>
                            <p className="font-medium">March 15, 2025</p>
                            <p className="text-sm text-muted-foreground">
                              {user.plan === "basic" ? "Basic Plan - Monthly" : "Pro Plan - Monthly"}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-medium">{user.plan === "basic" ? "$19.99" : "$49.99"}</p>
                            <Button variant="ghost" size="sm" className="h-8 px-2">Receipt</Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Notifications Tab */}
          <TabsContent value="notifications" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Notification Preferences</CardTitle>
                <CardDescription>
                  Control how and when you receive notifications
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="email-notifications">Email Notifications</Label>
                      <p className="text-sm text-muted-foreground">
                        Receive important account updates via email
                      </p>
                    </div>
                    <Switch
                      id="email-notifications"
                      checked={notifications.email}
                      onCheckedChange={() => handleNotificationToggle('email')}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="optimization-notifications">Optimization Notifications</Label>
                      <p className="text-sm text-muted-foreground">
                        Get notified when your resume optimizations are complete
                      </p>
                    </div>
                    <Switch
                      id="optimization-notifications"
                      checked={notifications.optimization}
                      onCheckedChange={() => handleNotificationToggle('optimization')}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="marketing-notifications">Marketing Notifications</Label>
                      <p className="text-sm text-muted-foreground">
                        Receive updates about new features and special offers
                      </p>
                    </div>
                    <Switch
                      id="marketing-notifications"
                      checked={notifications.marketing}
                      onCheckedChange={() => handleNotificationToggle('marketing')}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
        
        <div className="mt-8">
          <Card className="bg-muted/30">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <LogOut className="h-5 w-5 text-muted-foreground" />
                  <span className="font-medium">Sign out from your account</span>
                </div>
                <Button variant="outline" onClick={handleLogout}>
                  Log Out
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    </>
  );
}
