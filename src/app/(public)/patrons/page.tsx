import type { Metadata } from "next";
import { Award, HandHeart, LogIn, Megaphone, UserPlus, Users } from "lucide-react";
import { LinkButton } from "@/components/ui/Button";
import { SectionHeading } from "@/components/ui/SectionHeading";

export const metadata: Metadata = { title: "Patrons" };

const ROLES = [
  {
    icon: Megaphone,
    title: "Champion inclusion",
    text: "Speak up for students with special needs on campus and beyond, and help open doors for them.",
  },
  {
    icon: Users,
    title: "Guide and mentor",
    text: "Share your experience with our members as they study, graduate and build their careers.",
  },
  {
    icon: HandHeart,
    title: "Support our work",
    text: "Help the association with advice, connections, resources or funding for its programmes.",
  },
];

const STEPS = [
  { title: "Apply online", text: "Tell us about yourself, your work, and how you'd like to support the association." },
  { title: "We review your application", text: "Our team looks at every application and emails you with the decision." },
  { title: "Sign in to the Patrons' Portal", text: "Once approved, sign in with your email address and the password you chose." },
];

export default function PatronsPage() {
  return (
    <div className="bg-surface-muted">
      <div className="bg-primary-950 text-white">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-14 text-center">
          <div className="w-14 h-14 rounded-full bg-accent-500 text-primary-950 flex items-center justify-center mx-auto mb-5">
            <Award size={26} aria-hidden="true" />
          </div>
          <SectionHeading
            kicker="Patrons"
            title="Become a Patron of the Association"
            description="Lecturers, professionals, benefactors and friends of the association who stand with students with special needs at the University of Education, Winneba."
            align="center"
            onDark
          />
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <LinkButton href="/patrons/register" size="lg">
              <UserPlus size={17} aria-hidden="true" /> Apply to Become a Patron
            </LinkButton>
            <LinkButton href="/patrons/login" variant="outline" size="lg" className="bg-white">
              <LogIn size={17} aria-hidden="true" /> Patron Sign In
            </LinkButton>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-14">
        <SectionHeading kicker="The role" title="What patrons do" align="center" />
        <ul className="mt-8 grid gap-5 sm:grid-cols-3">
          {ROLES.map(({ icon: Icon, title, text }) => (
            <li key={title} className="bg-white rounded-lg border border-line p-6">
              <div className="w-11 h-11 rounded-lg bg-primary-50 text-primary-800 flex items-center justify-center">
                <Icon size={20} aria-hidden="true" />
              </div>
              <h3 className="mt-4 font-display font-bold text-lg text-primary-950">{title}</h3>
              <p className="mt-1.5 text-sm text-slate leading-relaxed">{text}</p>
            </li>
          ))}
        </ul>

        <div className="mt-14">
          <SectionHeading kicker="How it works" title="Three simple steps" align="center" />
          <ol className="mt-8 grid gap-5 sm:grid-cols-3">
            {STEPS.map((step, i) => (
              <li key={step.title} className="bg-white rounded-lg border border-line p-6">
                <span className="w-8 h-8 rounded-full bg-primary-800 text-white text-sm font-bold flex items-center justify-center font-data">
                  {i + 1}
                </span>
                <h3 className="mt-4 font-display font-bold text-lg text-primary-950">{step.title}</h3>
                <p className="mt-1.5 text-sm text-slate leading-relaxed">{step.text}</p>
              </li>
            ))}
          </ol>
        </div>

        <div className="mt-12 text-center">
          <LinkButton href="/patrons/register" size="lg">
            Start Your Application
          </LinkButton>
        </div>
      </div>
    </div>
  );
}
