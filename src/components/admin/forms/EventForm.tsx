"use client";

import { useActionState } from "react";
import { Loader2 } from "lucide-react";
import { createEventAction, updateEventAction } from "@/lib/actions/event-actions";
import { initialActionState } from "@/lib/actions/types";
import { Label, inputClasses, FieldError, FormAlert } from "@/components/ui/Common";
import { Button } from "@/components/ui/Button";
import { ImageUploadField } from "@/components/admin/ImageUploadField";
import type { Event, EventCategory } from "@/generated/prisma/client";

function toDateInputValue(date?: Date | null): string {
  if (!date) return "";
  return new Date(date).toISOString().slice(0, 10);
}

export function EventForm({ event, categories }: { event?: Event; categories: EventCategory[] }) {
  const action = event ? updateEventAction : createEventAction;
  const [state, formAction, isPending] = useActionState(action, initialActionState);
  const fe = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="space-y-6">
      <FormAlert message={state.error} />
      {event && <input type="hidden" name="id" value={event.id} />}

      <div className="bg-white rounded-lg border border-line p-6 space-y-5">
        <div>
          <Label htmlFor="title" required>Title</Label>
          <input id="title" name="title" required defaultValue={event?.title} className={inputClasses} />
          <FieldError messages={fe.title} />
        </div>
        <div>
          <Label htmlFor="slug">URL Slug</Label>
          <input id="slug" name="slug" placeholder="Auto-generated from title if left blank" defaultValue={event?.slug} className={`${inputClasses} font-data`} />
        </div>
        <div>
          <Label htmlFor="shortDescription">Short Description</Label>
          <input id="shortDescription" name="shortDescription" defaultValue={event?.shortDescription ?? ""} className={inputClasses} />
        </div>
        <ImageUploadField name="imageUrl" category="EVENT" label="Event Banner" defaultUrl={event?.imageUrl} />
        <div>
          <Label htmlFor="description" required>Full Description</Label>
          <textarea id="description" name="description" required rows={8} defaultValue={event?.description} className={inputClasses} />
          <FieldError messages={fe.description} />
        </div>
      </div>

      <div className="bg-white rounded-lg border border-line p-6 grid sm:grid-cols-2 gap-5">
        <div>
          <Label htmlFor="startDate" required>Start Date</Label>
          <input id="startDate" name="startDate" type="date" required defaultValue={toDateInputValue(event?.startDate)} className={inputClasses} />
          <FieldError messages={fe.startDate} />
        </div>
        <div>
          <Label htmlFor="endDate" required>End Date</Label>
          <input id="endDate" name="endDate" type="date" required defaultValue={toDateInputValue(event?.endDate)} className={inputClasses} />
          <FieldError messages={fe.endDate} />
        </div>
        <div>
          <Label htmlFor="startTime">Start Time</Label>
          <input id="startTime" name="startTime" type="time" defaultValue={event?.startTime ?? ""} className={inputClasses} />
        </div>
        <div>
          <Label htmlFor="endTime">End Time</Label>
          <input id="endTime" name="endTime" type="time" defaultValue={event?.endTime ?? ""} className={inputClasses} />
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="venue" required>Venue</Label>
          <input id="venue" name="venue" required defaultValue={event?.venue} className={inputClasses} />
          <FieldError messages={fe.venue} />
        </div>
        <div>
          <Label htmlFor="organizer">Organizer</Label>
          <input id="organizer" name="organizer" defaultValue={event?.organizer ?? ""} className={inputClasses} />
        </div>
        <div>
          <Label htmlFor="contactInfo">Contact Info</Label>
          <input id="contactInfo" name="contactInfo" defaultValue={event?.contactInfo ?? ""} className={inputClasses} />
        </div>
        <div>
          <Label htmlFor="registrationLink">Registration Link</Label>
          <input id="registrationLink" name="registrationLink" type="url" defaultValue={event?.registrationLink ?? ""} className={inputClasses} />
          <FieldError messages={fe.registrationLink} />
        </div>
        <div>
          <Label htmlFor="externalLink">External Link</Label>
          <input id="externalLink" name="externalLink" type="url" defaultValue={event?.externalLink ?? ""} className={inputClasses} />
          <FieldError messages={fe.externalLink} />
        </div>
      </div>

      <div className="bg-white rounded-lg border border-line p-6 grid sm:grid-cols-3 gap-5">
        <div>
          <Label htmlFor="categoryId">Category</Label>
          <select id="categoryId" name="categoryId" defaultValue={event?.categoryId ?? ""} className={inputClasses}>
            <option value="">No category</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor="status">Status</Label>
          <select id="status" name="status" defaultValue={event?.status ?? "DRAFT"} className={inputClasses}>
            <option value="DRAFT">Draft</option>
            <option value="PUBLISHED">Published</option>
            <option value="ARCHIVED">Archived</option>
          </select>
        </div>
        <div className="flex items-end pb-2.5">
          <label className="flex items-center gap-2.5 text-sm text-ink cursor-pointer">
            <input type="checkbox" name="featured" defaultChecked={event?.featured} className="h-4 w-4 rounded border-line text-primary-800" />
            Feature this event
          </label>
        </div>
      </div>

      <Button type="submit" disabled={isPending}>
        {isPending && <Loader2 size={15} className="animate-spin" />}
        {isPending ? "Saving…" : event ? "Save Changes" : "Create Event"}
      </Button>
    </form>
  );
}
