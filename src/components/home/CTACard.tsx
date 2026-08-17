import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ArrowRight } from "lucide-react";

export function CTACard({
  icon: Icon,
  title,
  description,
  href,
  linkLabel,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  href: string;
  linkLabel: string;
}) {
  return (
    <Link
      href={href}
      className="group flex flex-col bg-white rounded-lg border border-line p-6 hover:border-primary-300 hover:shadow-[var(--shadow-card-hover)] transition-all"
    >
      <div className="w-11 h-11 rounded-lg bg-primary-50 text-primary-800 flex items-center justify-center group-hover:bg-primary-800 group-hover:text-white transition-colors">
        <Icon size={20} />
      </div>
      <h3 className="mt-4 font-display font-bold text-lg text-primary-950">{title}</h3>
      <p className="mt-1.5 text-sm text-slate leading-relaxed flex-1">{description}</p>
      <span className="mt-4 text-sm font-semibold text-primary-800 inline-flex items-center gap-1 group-hover:gap-2 transition-all">
        {linkLabel} <ArrowRight size={14} />
      </span>
    </Link>
  );
}
