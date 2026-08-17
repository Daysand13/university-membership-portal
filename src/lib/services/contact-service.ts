import "server-only";
import { db } from "@/lib/db";
import type { ContactMessageInput } from "@/lib/validations/content";
import { sendEmail } from "@/lib/email/client";
import { adminNewContactMessageEmail } from "@/lib/email/templates";
import { getSiteSettings } from "./content-service";

export async function submitContactMessage(input: ContactMessageInput) {
  const message = await db.contactMessage.create({
    data: {
      name: input.name,
      email: input.email,
      phone: input.phone || null,
      subject: input.subject,
      message: input.message,
    },
  });

  await db.notification.create({
    data: {
      type: "NEW_MESSAGE",
      title: `New contact message from ${input.name}`,
      link: `/admin/contact-messages`,
    },
  });

  try {
    const settings = await getSiteSettings();
    const notifyTo = settings.generalEmail || settings.adminEmail;
    if (notifyTo) {
      const { subject, html } = adminNewContactMessageEmail({
        name: input.name,
        subject: input.subject,
        reviewUrl: `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/admin/contact-messages`,
      });
      await sendEmail({ to: notifyTo, subject, html });
    }
  } catch (err) {
    console.error("[contact] failed to notify admins:", err);
  }

  return message;
}

export async function listContactMessages(params?: { status?: "NEW" | "READ" | "ARCHIVED" }) {
  return db.contactMessage.findMany({
    where: params?.status ? { status: params.status } : {},
    orderBy: { createdAt: "desc" },
  });
}

export async function markMessageRead(id: string) {
  return db.contactMessage.update({ where: { id }, data: { status: "READ" } });
}

export async function archiveMessage(id: string) {
  return db.contactMessage.update({ where: { id }, data: { status: "ARCHIVED" } });
}
