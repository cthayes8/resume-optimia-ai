import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";

interface PlanFeature {
  title: string;
  included: boolean;
}

interface PricingPlan {
  name: string;
  price: string;
  description: string;
  features: PlanFeature[];
  buttonText: string;
  popular?: boolean;
}

export default function PricingPlans() {
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");

  const plans: PricingPlan[] = [
    {
      name: "Basic",
      price: billingCycle === "monthly" ? "$19.99" : "$199.99",
      description: "Perfect for active job seekers with a specific application in mind.",
      features: [
        { title: "5 resume optimizations", included: true },
        { title: "ATS keyword analysis", included: true },
        { title: "Job match scoring", included: true },
        { title: "AI-powered suggestions", included: true },
        { title: "Export to PDF", included: true },
        { title: "Access to templates", included: true },
        { title: "Industry-specific tailoring", included: true },
        { title: "Priority support", included: false },
        { title: "Unlimited optimizations", included: false },
      ],
      buttonText: "Get Started",
    },
    {
      name: "Pro",
      price: billingCycle === "monthly" ? "$49.99" : "$499.99",
      description: "For serious job hunters applying to multiple positions.",
      features: [
        { title: "Unlimited resume uploads", included: true },
        { title: "Unlimited optimizations", included: true },
        { title: "Advanced ATS keyword analysis", included: true },
        { title: "Detailed job match scoring", included: true },
        { title: "Enhanced AI suggestions", included: true },
        { title: "Export to multiple formats", included: true },
        { title: "Premium templates", included: true },
        { title: "Industry-specific tailoring", included: true },
        { title: "Priority support", included: true },
      ],
      buttonText: "Upgrade to Pro",
      popular: true,
    }
  ];

  return (
    <section id="pricing" className="py-16 md:py-24">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
            Transparent Pricing
          </h2>
          <p className="mt-4 text-lg text-foreground/70 max-w-2xl mx-auto">
            Choose the plan that fits your job search needs
          </p>

          <div className="mt-8 inline-flex items-center p-1 bg-muted rounded-full">
            <button
              className={`px-4 py-2 rounded-full text-sm font-medium ${
                billingCycle === "monthly"
                  ? "bg-background shadow-sm text-foreground"
                  : "text-foreground/60"
              }`}
              onClick={() => setBillingCycle("monthly")}
            >
              Monthly
            </button>
            <button
              className={`px-4 py-2 rounded-full text-sm font-medium ${
                billingCycle === "yearly"
                  ? "bg-background shadow-sm text-foreground"
                  : "text-foreground/60"
              }`}
              onClick={() => setBillingCycle("yearly")}
            >
              Yearly <span className="text-primary text-xs ml-1">Save 20%</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`rounded-xl border ${
                plan.popular
                  ? "border-primary/50 ring-1 ring-primary/20 shadow-lg"
                  : "border-border"
              } bg-background p-8 relative card-hover`}
            >
              {plan.popular && (
                <div className="absolute top-0 right-0 -mt-3 mr-6 bg-primary text-primary-foreground text-xs px-3 py-1 rounded-full font-medium">
                  Most Popular
                </div>
              )}
              <div className="mb-6">
                <h3 className="text-2xl font-bold">{plan.name}</h3>
                <div className="mt-4 flex items-baseline">
                  <span className="text-4xl font-extrabold tracking-tight">
                    {plan.price}
                  </span>
                  {plan.price !== "$0" && (
                    <span className="ml-1 text-foreground/70 text-sm font-medium">
                      /{billingCycle === "monthly" ? "month" : "year"}
                    </span>
                  )}
                </div>
                <p className="mt-2 text-foreground/70">{plan.description}</p>
              </div>

              <ul className="mt-6 space-y-4">
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex items-start">
                    <div
                      className={`flex-shrink-0 h-5 w-5 rounded-full flex items-center justify-center ${
                        feature.included
                          ? "text-primary"
                          : "text-foreground/30"
                      }`}
                    >
                      <Check size={16} />
                    </div>
                    <span
                      className={`ml-3 text-sm ${
                        feature.included
                          ? "text-foreground"
                          : "text-foreground/50 line-through"
                      }`}
                    >
                      {feature.title}
                    </span>
                  </li>
                ))}
              </ul>

              <div className="mt-8">
                <Link to="/auth/sign-up">
                  <Button
                    className={`w-full rounded-full ${
                      plan.popular
                        ? ""
                        : "bg-foreground/10 text-foreground hover:bg-foreground/20"
                    }`}
                    variant={plan.popular ? "default" : "outline"}
                  >
                    {plan.buttonText}
                  </Button>
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
