interface SectionHeadingProps {
  kicker?: string;
  title: string;
  description?: string;
  align?: "left" | "center";
  onDark?: boolean;
  /** "h1" when this is the page's own title; every page needs exactly one. */
  as?: "h1" | "h2";
}

export function SectionHeading({ kicker, title, description, align = "left", onDark = false, as: Heading = "h2" }: SectionHeadingProps) {
  return (
    <div className={align === "center" ? "text-center mx-auto max-w-2xl" : ""}>
      {kicker && <p className={`kicker ${onDark ? "kicker-on-dark" : ""} mb-2`}>{kicker}</p>}
      <Heading
        className={`text-2xl sm:text-3xl font-bold text-balance ${onDark ? "text-white" : "text-primary-950"}`}
      >
        {title}
      </Heading>
      <span className={`section-heading-rule mt-3 ${align === "center" ? "mx-auto" : ""}`} />
      {description && (
        <p className={`mt-4 text-base leading-relaxed ${onDark ? "text-primary-100" : "text-slate"}`}>
          {description}
        </p>
      )}
    </div>
  );
}
