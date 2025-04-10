
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface Testimonial {
  text: string;
  author: {
    name: string;
    title: string;
    avatar?: string;
  };
}

export default function Testimonials() {
  const testimonials: Testimonial[] = [
    {
      text: "I went from zero callbacks to four interview requests in a single week after optimizing my resume with this tool. The AI suggestions were spot-on for my industry.",
      author: {
        name: "Sarah J.",
        title: "Marketing Professional",
      },
    },
    {
      text: "As someone who struggled with highlighting the right skills, this AI tool was a game-changer. My resume now gets past ATS systems that previously rejected me.",
      author: {
        name: "Michael T.",
        title: "Software Engineer",
      },
    },
    {
      text: "The job-specific keyword suggestions helped me tailor my resume perfectly. I landed an interview at my dream company after months of silence.",
      author: {
        name: "Elena R.",
        title: "Project Manager",
      },
    },
  ];

  return (
    <section className="py-16 md:py-24 bg-muted/30">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
            Trusted by Job Seekers
          </h2>
          <p className="mt-4 text-lg text-foreground/70 max-w-2xl mx-auto">
            See how our AI has helped candidates land more interviews
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <div
              key={index}
              className="bg-background p-6 rounded-lg shadow-sm border card-hover"
            >
              <div className="space-y-4">
                <div className="relative">
                  <svg
                    className="absolute top-0 left-0 transform -translate-x-6 -translate-y-8 h-16 w-16 text-primary/10"
                    fill="currentColor"
                    viewBox="0 0 32 32"
                    aria-hidden="true"
                  >
                    <path d="M9.352 4C4.456 7.456 1 13.12 1 19.36c0 5.088 3.072 8.064 6.624 8.064 3.36 0 5.856-2.688 5.856-5.856 0-3.168-2.208-5.472-5.088-5.472-.576 0-1.344.096-1.536.192.48-3.264 3.552-7.104 6.624-9.024L9.352 4zm16.512 0c-4.8 3.456-8.256 9.12-8.256 15.36 0 5.088 3.072 8.064 6.624 8.064 3.264 0 5.856-2.688 5.856-5.856 0-3.168-2.304-5.472-5.184-5.472-.576 0-1.248.096-1.44.192.48-3.264 3.456-7.104 6.528-9.024L25.864 4z" />
                  </svg>
                  <p className="relative text-foreground/90 mt-4">
                    {testimonial.text}
                  </p>
                </div>
                <div className="flex items-center mt-6">
                  <Avatar className="h-10 w-10 mr-3">
                    <AvatarImage src={testimonial.author.avatar} />
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {testimonial.author.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{testimonial.author.name}</p>
                    <p className="text-sm text-foreground/70">
                      {testimonial.author.title}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-16 text-center">
          <p className="text-lg font-medium">Trusted by professionals from companies like</p>
          <div className="mt-8 flex flex-wrap justify-center gap-8 opacity-50">
            <div className="h-8 text-foreground/70 flex items-center font-bold text-xl">GOOGLE</div>
            <div className="h-8 text-foreground/70 flex items-center font-bold text-xl">MICROSOFT</div>
            <div className="h-8 text-foreground/70 flex items-center font-bold text-xl">AMAZON</div>
            <div className="h-8 text-foreground/70 flex items-center font-bold text-xl">APPLE</div>
            <div className="h-8 text-foreground/70 flex items-center font-bold text-xl">META</div>
          </div>
        </div>
      </div>
    </section>
  );
}
