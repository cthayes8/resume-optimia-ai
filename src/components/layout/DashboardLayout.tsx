
import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { 
  LayoutDashboard, 
  FileText, 
  History, 
  Settings, 
  LogOut, 
  Menu, 
  X, 
  ChevronRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useIsMobile } from "@/hooks/use-mobile";
import { toast } from "sonner";

const navigationItems = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Optimize Resume", href: "/optimize", icon: FileText },
  { name: "Past Optimizations", href: "/history", icon: History },
  { name: "Account Settings", href: "/settings", icon: Settings },
];

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  const handleLogout = () => {
    // Clear any saved user data
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    
    // Display success notification
    toast.success("Successfully signed out");
    
    // Redirect to home page
    navigate("/");
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && isMobile && (
        <div 
          className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div 
        className={`${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } fixed inset-y-0 left-0 z-50 w-64 bg-sidebar border-r border-sidebar-border md:translate-x-0 md:static md:z-0 transition-transform duration-300 ease-in-out`}
      >
        <div className="flex h-16 items-center px-6 border-b border-sidebar-border">
          <Link to="/dashboard" className="flex items-center gap-2">
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
            <span className="font-semibold text-sidebar-foreground">ATS Optimizer</span>
          </Link>
          {isMobile && (
            <Button
              variant="ghost"
              size="icon"
              className="ml-auto"
              onClick={() => setSidebarOpen(false)}
            >
              <X size={20} />
            </Button>
          )}
        </div>
        <ScrollArea className="h-[calc(100vh-64px)] py-4">
          <nav className="px-2 space-y-1">
            {navigationItems.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`flex items-center gap-3 px-3 py-2 rounded-md group transition-colors ${
                    isActive
                      ? "bg-sidebar-accent text-sidebar-primary font-medium"
                      : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  }`}
                  onClick={() => isMobile && setSidebarOpen(false)}
                >
                  <item.icon size={20} />
                  <span>{item.name}</span>
                  {isActive && (
                    <ChevronRight size={16} className="ml-auto" />
                  )}
                </Link>
              );
            })}
          </nav>
          <div className="mt-auto pt-4 px-2">
            <Button
              variant="ghost"
              className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              onClick={handleLogout}
            >
              <LogOut size={20} className="mr-3" />
              Sign Out
            </Button>
          </div>
        </ScrollArea>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 border-b flex items-center px-6">
          {isMobile && (
            <Button
              variant="ghost"
              size="icon"
              className="mr-4"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu size={20} />
            </Button>
          )}
          <h1 className="text-xl font-semibold">
            {navigationItems.find(
              (item) => item.href === location.pathname
            )?.name || "Dashboard"}
          </h1>
        </header>
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
