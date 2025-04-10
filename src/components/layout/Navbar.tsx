
import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Menu, X, ChevronDown } from "lucide-react";

export function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full glass-effect border-b">
      <div className="container px-4 sm:px-6 lg:px-8 flex h-16 items-center justify-between">
        <div className="flex items-center">
          <Link to="/" className="flex items-center gap-2">
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
            <span className="font-semibold text-lg text-foreground">Resume ATS Optimizer</span>
          </Link>
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-6">
          <Link to="/#how-it-works" className="text-foreground/70 hover:text-foreground transition-colors">
            How It Works
          </Link>
          <Link to="/#benefits" className="text-foreground/70 hover:text-foreground transition-colors">
            Benefits
          </Link>
          <Link to="/#pricing" className="text-foreground/70 hover:text-foreground transition-colors">
            Pricing
          </Link>
          <Link to="/auth" className="ml-4">
            <Button variant="outline" className="rounded-full">
              Sign In
            </Button>
          </Link>
          <Link to="/auth?signup=true">
            <Button className="rounded-full">
              Get Started
            </Button>
          </Link>
        </nav>

        {/* Mobile Menu Button */}
        <button 
          className="md:hidden p-2" 
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          aria-label="Toggle menu"
        >
          {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="md:hidden py-4 px-4 sm:px-6 lg:px-8 shadow-lg border-b animate-fade-in">
          <nav className="flex flex-col space-y-4">
            <Link 
              to="/#how-it-works" 
              className="text-foreground/70 hover:text-foreground transition-colors p-2"
              onClick={() => setIsMenuOpen(false)}
            >
              How It Works
            </Link>
            <Link 
              to="/#benefits" 
              className="text-foreground/70 hover:text-foreground transition-colors p-2"
              onClick={() => setIsMenuOpen(false)}
            >
              Benefits
            </Link>
            <Link 
              to="/#pricing" 
              className="text-foreground/70 hover:text-foreground transition-colors p-2"
              onClick={() => setIsMenuOpen(false)}
            >
              Pricing
            </Link>
            <Link 
              to="/auth" 
              className="p-2"
              onClick={() => setIsMenuOpen(false)}
            >
              <Button variant="outline" className="w-full rounded-full">
                Sign In
              </Button>
            </Link>
            <Link 
              to="/auth?signup=true" 
              className="p-2"
              onClick={() => setIsMenuOpen(false)}
            >
              <Button className="w-full rounded-full">
                Get Started
              </Button>
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}

export default Navbar;
