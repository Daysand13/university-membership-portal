import { EventForm } from "@/components/admin/forms/EventForm";
import { listEventCategories } from "@/lib/services/event-service";

export const metadata = { title: "New Event" };
export const dynamic = "force-dynamic";

export default async function NewEventPage() {
  const categories = await listEventCategories();
  return (
    <div className="max-w-3xl">
      <h1 className="font-display font-bold text-2xl text-primary-950 mb-6">New Event</h1>
      <EventForm categories={categories} />
    </div>
  );
}
