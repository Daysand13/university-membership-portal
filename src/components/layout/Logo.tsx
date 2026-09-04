import Link from "next/link";

export function Logo({
  siteTitle,
  logoUrl,
  onDark = false,
}: {
  siteTitle: string;
  logoUrl?: string | null;
  onDark?: boolean;
}) {
  return (
    <Link href="/" className="flex items-center gap-2.5 min-w-0">
      {logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={logoUrl} alt={siteTitle} className="w-9 h-9 object-contain shrink-0" />
      ) : (
        <svg width="34" height="34" viewBox="0 0 40 40" fill="none" aria-hidden="true" className="shrink-0">
          <path
            d="M20 2 L36 9 V19 C36 29 29.5 35.5 20 38 C10.5 35.5 4 29 4 19 V9 Z"
            fill={onDark ? "#C9971F" : "#24266B"}
          />
          <path
            d="M20 2 L36 9 V19 C36 29 29.5 35.5 20 38 C10.5 35.5 4 29 4 19 V9 Z"
            stroke={onDark ? "#14153D" : "#C9971F"}
            strokeWidth="1.5"
          />
          <path
            d="M13 17.5L20 13L27 17.5V25L20 29.5L13 25V17.5Z"
            fill={onDark ? "#14153D" : "#ffffff"}
            opacity="0.92"
          />
          <text
            x="20"
            y="24.5"
            textAnchor="middle"
            fontFamily="Georgia, serif"
            fontSize="9"
            fontWeight="700"
            fill={onDark ? "#C9971F" : "#24266B"}
          >
            AU
          </text>
        </svg>
      )}
      <span className="leading-tight min-w-0">
        <span
          className={`block font-display font-bold text-[15px] sm:text-base leading-snug ${onDark ? "text-white" : "text-primary-950"}`}
        >
          {siteTitle}
        </span>
        <span
          className={`hidden sm:block text-[10px] tracking-wide uppercase ${onDark ? "text-primary-200" : "text-slate"}`}
        >
          Membership &amp; Information Portal
        </span>
      </span>
    </Link>
  );
}
