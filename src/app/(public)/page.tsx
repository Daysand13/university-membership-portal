import { BookOpen, Vote, HandHeart, Users, CalendarDays, GraduationCap } from "lucide-react";
import { Hero } from "@/components/home/Hero";
import { CTACard } from "@/components/home/CTACard";
import { NewsCard } from "@/components/news/NewsCard";
import { EventCard } from "@/components/events/EventCard";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { LinkButton } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/Common";
import { getActiveHeroSlides, getSiteSettings } from "@/lib/services/content-service";
import { getFeaturedNews } from "@/lib/services/news-service";
import { getUpcomingEventsForHome } from "@/lib/services/event-service";
import { listHomepageAlumni } from "@/lib/services/alumni-showcase-service";
import { AlumniCard } from "@/components/alumni/AlumniCard";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [slides, news, events, siteSettings, homepageAlumni] = await Promise.all([
    getActiveHeroSlides(),
    getFeaturedNews(3),
    getUpcomingEventsForHome(3),
    getSiteSettings(),
    listHomepageAlumni(4),
  ]);

  return (
    <>
      <Hero slides={slides} siteTitle={siteSettings.siteTitle} />

      {/* Latest news */}
      <section className="bg-surface-muted">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
          <div className="flex flex-wrap items-end justify-between gap-4 mb-10">
            <SectionHeading kicker="Stay Informed" title="Latest News" />
            <LinkButton href="/news" variant="outline" size="sm">
              View all news
            </LinkButton>
          </div>
          {news.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {news.map((article) => (
                <NewsCard key={article.id} article={article} />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<CalendarDays size={28} />}
              title="No news published yet"
              description="Articles published from the admin dashboard will appear here."
            />
          )}
        </div>
      </section>

      {/* Upcoming events */}
      <section className="bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
          <div className="flex flex-wrap items-end justify-between gap-4 mb-10">
            <SectionHeading kicker="Mark Your Calendar" title="Upcoming Events" />
            <LinkButton href="/events" variant="outline" size="sm">
              View all events
            </LinkButton>
          </div>
          {events.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {events.map((event) => (
                <EventCard key={event.id} event={{ ...event, category: null }} />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<CalendarDays size={28} />}
              title="No upcoming events scheduled"
              description="Published events will appear here as soon as they're added."
            />
          )}
        </div>
      </section>

      {/* Our Proud Alumni — the same featured records as the alumni page,
          limited to those an admin ticked "show on homepage". Renders
          nothing at all until someone is featured, so the homepage never
          shows an empty shell. */}
      {homepageAlumni.length > 0 && (
        <section className="bg-surface-muted">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
            <div className="flex flex-wrap items-end justify-between gap-4 mb-10">
              <SectionHeading kicker="Life After Graduation" title="Our Proud Alumni" />
              <LinkButton href="/alumni" variant="outline" size="sm">
                Meet our alumni
              </LinkButton>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {homepageAlumni.map((alumnus) => (
                <AlumniCard key={alumnus.id} alumnus={alumnus} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Membership / Library / Elections / Donate */}
      <section className="bg-primary-950">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
          <SectionHeading
            kicker="Get Involved"
            title="Everything you need, in one portal"
            align="center"
            onDark
          />
          <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
            <CTACard
              icon={Users}
              title="Membership Portal"
              description="Enroll for membership or sign in to your member dashboard."
              href="/membership"
              linkLabel="Join or sign in"
            />
            <CTACard
              icon={BookOpen}
              title="Resource Library"
              description="Browse and download official documents, forms, and past materials."
              href="/library"
              linkLabel="Browse the library"
            />
            <CTACard
              icon={Vote}
              title="Elections"
              description="Nomination dates, candidate information, and results as they're announced."
              href="/elections"
              linkLabel="View election info"
            />
            <CTACard
              icon={HandHeart}
              title="Donate"
              description="Support the association's work with a contribution, large or small."
              href="/donate"
              linkLabel="See how to give"
            />
            <CTACard
              icon={GraduationCap}
              title="Alumni"
              description="Connect with fellow graduates, find a mentor, and stay in touch."
              href="/alumni"
              linkLabel="Visit the alumni network"
            />
          </div>
        </div>
      </section>

      {/* Contact strip */}
      <section className="bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-14 flex flex-col sm:flex-row items-center justify-between gap-6 border-t border-line">
          <div>
            <h3 className="font-display font-bold text-xl text-primary-950">Have a question?</h3>
            <p className="text-sm text-slate mt-1">Our team typically responds within one business day.</p>
          </div>
          <LinkButton href="/contact" variant="primary">
            Contact Us
          </LinkButton>
        </div>
      </section>
    </>
  );
}
