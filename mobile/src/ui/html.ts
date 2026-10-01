/**
 * Rich text from the website's editor, as plain words.
 *
 * Rather than render the HTML in a web view — heavy, and a way for markup to
 * misbehave — the tags are stripped and the words and paragraph breaks kept.
 * Plain text reads better aloud anyway, which is how several members meet
 * it. One copy, for articles and announcements alike.
 */
export function readable(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|h[1-6]|li)>/gi, "\n\n")
    .replace(/<li>/gi, "• ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
