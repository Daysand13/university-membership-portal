"use client";

import { useEffect, useId, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, HandHeart, Plus, Search } from "lucide-react";
import { markNotificationsSeenAction } from "@/lib/actions/patron-portal-actions";

export interface TopBarNotification {
  id: string;
  title: string;
  detail: string;
  href: string;
  at: string;
  unread: boolean;
}

const timeFormat = new Intl.DateTimeFormat("en-GH", { day: "numeric", month: "short", timeZone: "Africa/Accra" });

function NotificationsMenu({ items, unreadCount }: { items: TopBarNotification[]; unreadCount: number }) {
  const [open, setOpen] = useState(false);
  const [seen, setSeen] = useState(false);
  const [, startTransition] = useTransition();
  const containerRef = useRef<HTMLDivElement>(null);
  const menuId = useId();
  // Replies stay unread until the conversation itself is opened.
  const shownCount = seen ? items.filter((i) => i.unread && i.id.startsWith("thread-")).length : unreadCount;

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={menuId}
        aria-label={shownCount > 0 ? `Notifications, ${shownCount} new` : "Notifications"}
        onClick={() => {
          setOpen((v) => !v);
          if (!open && !seen && unreadCount > 0) {
            setSeen(true);
            startTransition(() => markNotificationsSeenAction());
          }
        }}
        className="relative flex items-center justify-center w-11 h-11 rounded-full text-primary-950 hover:bg-surface-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-600"
      >
        <Bell size={20} aria-hidden="true" />
        {shownCount > 0 && (
          <span className="absolute top-1.5 right-1.5 min-w-5 h-5 px-1 rounded-full bg-danger text-white text-[11px] font-bold flex items-center justify-center">
            {shownCount > 9 ? "9+" : shownCount}
          </span>
        )}
      </button>

      {open && (
        <div
          id={menuId}
          className="absolute right-0 mt-2 w-80 max-w-[calc(100vw-2rem)] rounded-xl border border-line bg-white shadow-card-hover z-50"
        >
          <p className="px-4 py-3 border-b border-line text-sm font-semibold text-primary-950">Notifications</p>
          {items.length === 0 ? (
            <p className="px-4 py-6 text-sm text-slate text-center">You&apos;re all caught up.</p>
          ) : (
            <ul className="max-h-96 overflow-y-auto divide-y divide-line">
              {items.map((item) => (
                <li key={item.id}>
                  <Link
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className="flex gap-3 px-4 py-3 hover:bg-surface-muted focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary-600"
                  >
                    <span
                      aria-hidden="true"
                      className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${item.unread ? "bg-danger" : "bg-transparent"}`}
                    />
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold text-primary-950">
                        {item.unread && <span className="sr-only">New: </span>}
                        {item.title}
                      </span>
                      <span className="block text-sm text-slate truncate">{item.detail}</span>
                      <span className="block text-xs text-slate-light mt-0.5">{timeFormat.format(new Date(item.at))}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * The Patrons' Portal additions to the portal header: search, the two quick
 * actions (as labelled icons — the header has no room for words beside the
 * logo and account menu), and notifications. Below extra-large screens the
 * search box becomes a button to the search page; on a phone the quick
 * actions are left to the Overview page, where both also appear.
 */
export function PatronTopBarTools({
  notifications,
  unreadCount,
}: {
  notifications: TopBarNotification[];
  unreadCount: number;
}) {
  const router = useRouter();
  const searchId = useId();

  return (
    <div className="flex items-center gap-1 sm:gap-1.5">
      <form
        role="search"
        className="hidden xl:block"
        onSubmit={(event) => {
          event.preventDefault();
          const q = String(new FormData(event.currentTarget).get("q") ?? "").trim();
          router.push(q ? `/patrons/dashboard/search?q=${encodeURIComponent(q)}` : "/patrons/dashboard/search");
        }}
      >
        <label htmlFor={searchId} className="sr-only">
          Search the Patrons&apos; Portal
        </label>
        <div className="relative">
          <Search size={16} aria-hidden="true" className="absolute left-3 top-1/2 -translate-y-1/2 text-slate" />
          <input
            id={searchId}
            name="q"
            type="search"
            placeholder="Search alumni, documents, announcements…"
            className="w-72 rounded-full border border-line bg-surface-muted pl-9 pr-3 py-2 text-sm text-ink placeholder:text-slate-light focus:border-primary-600 focus:ring-1 focus:ring-primary-600 outline-none"
          />
        </div>
      </form>
      <Link
        href="/patrons/dashboard/search"
        aria-label="Search"
        className="xl:hidden flex items-center justify-center w-11 h-11 rounded-full text-primary-950 hover:bg-surface-muted"
      >
        <Search size={20} aria-hidden="true" />
      </Link>

      <Link
        href="/patrons/dashboard/messages?tab=broadcast#compose"
        title="New Broadcast"
        className="hidden sm:flex items-center justify-center w-11 h-11 rounded-full text-primary-800 border border-primary-800 hover:bg-primary-50"
      >
        <Plus size={20} aria-hidden="true" />
        <span className="sr-only">New Broadcast</span>
      </Link>
      <Link
        href="/patrons/dashboard/finances#give"
        title="Make a Donation"
        className="hidden sm:flex items-center justify-center w-11 h-11 rounded-full bg-accent-500 text-primary-950 hover:bg-accent-600"
      >
        <HandHeart size={20} aria-hidden="true" />
        <span className="sr-only">Make a Donation</span>
      </Link>

      <NotificationsMenu items={notifications} unreadCount={unreadCount} />
    </div>
  );
}
