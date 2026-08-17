interface SectionHeadingProps {
  kicker?: string;
  title: string;
  description?: string;
  align?: "left" | "center";
  onDark?: boolean;
}

export function SectionHeading({ kicker, title, description, align = "left", onDark = false }: SectionHeadingProps) {
  return (
    <div className={align === "center" ? "text-center mx-auto max-w-2xl" : ""}>
      {kicker && <p className={`kicker ${onDark ? "kicker-on-dark" : ""} mb-2`}>{kicker}</p>}
      <h2
        className={`text-2xl sm:text-3xl font-bold text-balance ${onDark ? "text-white" : "text-primary-950"}`}
      >
        {title}
      </h2>
      <span className={`section-heading-rule mt-3 ${align === "center" ? "mx-auto" : ""}`} />
      {description && (
        <p className={`mt-4 text-base leading-relaxed ${onDark ? "text-primary-100" : "text-slate"}`}>
          {description}
        </p>
      )}
    </div>
  );
}
