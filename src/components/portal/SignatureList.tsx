import type { SignatureLine } from "@/lib/services/advocacy-service";

/**
 * The names on a campaign — patrons' endorsements or alumni co-signatures.
 * The same list in both portals, so a signature looks the same wherever it
 * is read.
 */
export function SignatureList({ lines }: { lines: SignatureLine[] }) {
  return (
    <ul className="divide-y divide-line">
      {lines.map((line) => (
        <li key={line.id} className="py-3 first:pt-0 last:pb-0">
          <p className="font-semibold text-primary-950 break-words">
            {line.name}
            {line.isMine && <span className="text-sm font-normal text-slate"> (you)</span>}
          </p>
          {line.description && <p className="text-sm text-slate break-words">{line.description}</p>}
          {line.comment && <p className="text-[15px] text-ink mt-1 italic">&ldquo;{line.comment}&rdquo;</p>}
        </li>
      ))}
    </ul>
  );
}
