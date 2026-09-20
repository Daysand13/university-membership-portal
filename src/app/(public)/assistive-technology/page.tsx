import { permanentRedirect } from "next/navigation";

/**
 * The Software Hub became Tech & Tutorials, which is a different address.
 * Links in old emails, Telegram posts and anyone's bookmarks still work.
 */
export default function AssistiveTechnologyRedirect() {
  permanentRedirect("/tech-tutorials");
}
