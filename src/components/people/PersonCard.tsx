import { UserRound } from "lucide-react";

/** A person with a photo, name, position and short bio — leadership on About Us, patrons on the Patrons page. */
export function PersonCard({
  name,
  position,
  photoUrl,
  bio,
  size = "md",
  imageAlt,
}: {
  name: string;
  position: string;
  photoUrl: string | null;
  bio: string | null;
  size?: "md" | "lg";
  /** What the photo shows, where someone has described it; otherwise the person's name. */
  imageAlt?: string;
}) {
  const large = size === "lg";
  return (
    <div className={`bg-white rounded-lg border border-line text-center h-full ${large ? "p-6" : "p-5"}`}>
      <div
        className={`rounded-full bg-surface-muted border border-line overflow-hidden mx-auto mb-3 flex items-center justify-center text-slate-light ${
          large ? "w-28 h-28" : "w-20 h-20"
        }`}
      >
        {photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photoUrl} alt={imageAlt ?? name} className="w-full h-full object-cover" />
        ) : (
          <UserRound size={large ? 40 : 28} aria-hidden="true" />
        )}
      </div>
      <p className={`font-display font-bold text-primary-950 ${large ? "text-base" : "text-sm"}`}>{name}</p>
      <p className={`text-accent-600 font-semibold mt-0.5 ${large ? "text-sm" : "text-xs"}`}>{position}</p>
      {bio && <p className={`text-slate leading-relaxed mt-2 whitespace-pre-line ${large ? "text-sm" : "text-xs"}`}>{bio}</p>}
    </div>
  );
}
