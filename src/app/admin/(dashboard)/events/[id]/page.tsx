import { notFound } from "next/navigation";
import { EventForm } from "@/components/admin/forms/EventForm";
import { getEventForAdmin, listEventCategories } from "@/lib/services/event-service";

export const metadata = { title: "Edit Event" };
export const dynamic = "force-dynamic";

export default async function EditEventPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [event, categories] = await Promise.all([getEventForAdmin(id), listEventCategories()]);
  if (!event) notFound();

  return (
    <div className="max-w-3xl">
      <h1 className="font-display font-bold text-2xl text-primary-950 mb-6">Edit Event</h1>
      <EventForm event={event} categories={categories} />
    </div>
  );
}
