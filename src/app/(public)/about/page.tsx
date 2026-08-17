import type { Metadata } from "next";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { getAboutContent } from "@/lib/services/content-service";

export const metadata: Metadata = { title: "About Us" };
export const dynamic = "force-dynamic";

function Section({ title, content }: { title: string; content: string | null }) {
  if (!content) return null;
  return (
    <div className="py-8 border-b border-line last:border-0">
      <h2 className="font-display font-bold text-xl text-primary-950 mb-3">{title}</h2>
      <div className="prose-content whitespace-pre-line">{content}</div>
    </div>
  );
}

export default async function AboutPage() {
  const about = await getAboutContent();
  const hasAnyContent = [
    about.mission,
    about.vision,
    about.coreValues,
    about.history,
    about.objectives,
    about.leadershipMessage,
  ].some(Boolean);

  return (
    <div className="bg-white">
      <div className="bg-primary-950 text-white">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-16 text-center">
          <SectionHeading kicker="Who We Are" title="About the Association" align="center" onDark />
        </div>
      </div>

      {about.imageUrl && (
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 -mt-8">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={about.imageUrl}
            alt="Acme University Students' Association"
            className="w-full aspect-[21/9] object-cover rounded-lg shadow-md border border-line"
          />
        </div>
      )}

      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-12">
        {hasAnyContent ? (
          <>
            <Section title="Our Mission" content={about.mission} />
            <Section title="Our Vision" content={about.vision} />
            <Section title="Core Values" content={about.coreValues} />
            <Section title="A Message from Leadership" content={about.leadershipMessage} />
            <Section title="Our History" content={about.history} />
            <Section title="Our Objectives" content={about.objectives} />
          </>
        ) : (
          <p className="text-slate text-center py-16">
            Content for this page hasn&apos;t been added yet — an administrator can publish the mission, vision,
            and history from the Admin dashboard.
          </p>
        )}
      </div>
    </div>
  );
}
