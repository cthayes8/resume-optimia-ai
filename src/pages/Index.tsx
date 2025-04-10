
import { Helmet } from "react-helmet";
import Navbar from "@/components/layout/Navbar";
import HomeHero from "@/components/ui/HomeHero";
import HowItWorks from "@/components/ui/HowItWorks";
import Benefits from "@/components/ui/Benefits";
import Testimonials from "@/components/ui/Testimonials";
import PricingPlans from "@/components/ui/PricingPlans";
import Footer from "@/components/ui/Footer";

export default function Index() {
  return (
    <>
      <Helmet>
        <title>Resume ATS Optimizer - Get Past the Bots, Land More Interviews</title>
        <meta name="description" content="AI-powered resume optimization to beat applicant tracking systems and land more interviews. Upload your resume and job description for instant analysis." />
      </Helmet>
      
      <div className="flex flex-col min-h-screen">
        <Navbar />
        <main className="flex-grow">
          <HomeHero />
          <HowItWorks />
          <Benefits />
          <Testimonials />
          <PricingPlans />
        </main>
        <Footer />
      </div>
    </>
  );
}
