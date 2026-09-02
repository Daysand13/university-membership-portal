import Link from "next/link";
import { BookOpen, Vote, HandHeart, Users, ArrowRight, CalendarDays } from "lucide-react";
import { Hero } from "@/components/home/Hero";
import { CTACard } from "@/components/home/CTACard";
import { NewsCard } from "@/components/news/NewsCard";
import { EventCard } from "@/components/events/EventCard";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { LinkButton } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/Common";
import { getActiveHeroSlides, getAboutContent, getSiteSettings } from "@/lib/services/content-service";
import { getFeaturedNews } from "@/lib/services/news-service";
import { getUpcomingEventsForHome } from "@/lib/services/event-service";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [slides, about, news, events, siteSettings] = await Promise.all([
    getActiveHeroSlides(),
    getAboutContent(),
    getFeaturedNews(3),
    getUpcomingEventsForHome(3),
    getSiteSettings(),
  ]);

  return (
    <>
      <Hero slides={slides} siteTitle={siteSettings.siteTitle} />

      {/* Welcome / introduction */}
      <section className={`relative overflow-hidden ${about.imageUrl ? "bg-primary-950" : "bg-white"}`}>
        {about.imageUrl && (
          <>
            <div
              className="absolute inset-0 bg-cover bg-center"
              style={{ backgroundImage: `url(${about.imageUrl})` }}
            />
            <div
              className="absolute inset-0"
              style={{
                background:
                  "linear-gradient(180deg, rgba(10,31,68,0.90) 0%, rgba(10,31,68,0.84) 100%)",
              }}
            />
          </>
        )}
        <div className="relative mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-16 text-center">
          <SectionHeading
            kicker="Welcome"
            title="A community built around every student"
            align="center"
            onDark={!!about.imageUrl}
          />
          <p className={`mt-5 text-base leading-relaxed ${about.imageUrl ? "text-primary-100" : "text-slate"}`}>
            {about.mission ||
              "The Acme University Students' Association exists to represent, support, and connect every registered student — through news, events, resources, and a membership community that spans every faculty and campus."}
          </p>
          <div className="mt-6">
            <Link
              href="/about"
              className={`text-sm font-semibold inline-flex items-center gap-1 ${
                about.imageUrl ? "text-accent-400 hover:text-accent-300" : "text-primary-800 hover:text-accent-600"
              }`}
            >
              More about who we are <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </section>

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

      {/* Membership / Library / Elections / Donate */}
      <section className="bg-primary-950">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
          <SectionHeading
            kicker="Get Involved"
            title="Everything you need, in one portal"
            align="center"
            onDark
          />
          <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
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
