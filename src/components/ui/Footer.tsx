import { Link } from "react-router-dom";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-muted/50 border-t">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="md:col-span-2">
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
              <span className="font-semibold text-lg">Resume ATS Optimizer</span>
            </Link>
            <p className="mt-4 text-foreground/70 max-w-md">
              Our AI-powered platform helps job seekers create ATS-optimized resumes 
              tailored to specific job descriptions, increasing their chances of landing interviews.
            </p>
            <div className="mt-6 flex space-x-4">
              <a href="#" className="text-foreground/70 hover:text-primary">
                <span className="sr-only">Twitter</span>
                <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84"></path>
                </svg>
              </a>
              <a href="#" className="text-foreground/70 hover:text-primary">
                <span className="sr-only">LinkedIn</span>
                <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
                </svg>
              </a>
            </div>
          </div>
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider">Resources</h3>
            <ul className="mt-4 space-y-2">
              <li>
                <Link to="/#how-it-works" className="text-foreground/70 hover:text-primary">
                  How It Works
                </Link>
              </li>
              <li>
                <Link to="/#benefits" className="text-foreground/70 hover:text-primary">
                  Benefits
                </Link>
              </li>
              <li>
                <Link to="/#pricing" className="text-foreground/70 hover:text-primary">
                  Pricing
                </Link>
              </li>
              <li>
                <Link to="/blog" className="text-foreground/70 hover:text-primary">
                  Blog
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider">Company</h3>
            <ul className="mt-4 space-y-2">
              <li>
                <Link to="#" className="text-foreground/70 hover:text-primary">
                  About Us
                </Link>
              </li>
              <li>
                <Link to="#" className="text-foreground/70 hover:text-primary">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link to="#" className="text-foreground/70 hover:text-primary">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link to="#" className="text-foreground/70 hover:text-primary">
                  Contact
                </Link>
              </li>
            </ul>
          </div>
        </div>
        <div className="mt-12 pt-8 border-t border-muted-foreground/20">
          <p className="text-center text-foreground/50 text-sm">
            &copy; {currentYear} Resume ATS Optimizer. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
