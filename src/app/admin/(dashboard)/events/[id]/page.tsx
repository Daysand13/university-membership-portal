import { notFound } from "next/navigation";
import { EventForm } from "@/components/admin/forms/EventForm";
import { getEventForAdmin, listEventCategories } from "@/lib/services/event-service";

export const metadata = { title: "Edit Event" };
export const dynamic = "force-dynamic";

export default async function EditEventPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ created?: string }>;
}) {
  const { id } = await params;
  const { created } = await searchParams;
  const [event, categories] = await Promise.all([getEventForAdmin(id), listEventCategories()]);
  if (!event) notFound();

  return (
    <div className="max-w-3xl">
      <h1 className="font-display font-bold text-2xl text-primary-950 mb-6">Edit Event</h1>
      {created === "1" && (
        <div role="status" className="mb-5 rounded-lg border border-success bg-success-light text-success px-4 py-3 text-sm font-medium">
          Event created. It appears on the website once its status is Published.
        </div>
      )}
      <EventForm event={event} categories={categories} />
    </div>
  );
}
