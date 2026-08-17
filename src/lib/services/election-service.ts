import "server-only";
import { db } from "@/lib/db";
import { ContentStatus } from "@/generated/prisma/client";
import type { ElectionInput } from "@/lib/validations/content";

export async function getCurrentPublishedElection() {
  return db.election.findFirst({
    where: { status: ContentStatus.PUBLISHED },
    include: { candidates: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function listElectionsForAdmin() {
  return db.election.findMany({ orderBy: { createdAt: "desc" }, include: { candidates: true } });
}

export async function getElectionForAdmin(id: string) {
  return db.election.findUnique({ where: { id }, include: { candidates: true } });
}

export async function createElection(input: ElectionInput, adminId: string) {
  return db.election.create({
    data: {
      title: input.title,
      description: input.description || null,
      status: input.status,
      nominationStart: input.nominationStart ?? null,
      nominationEnd: input.nominationEnd ?? null,
      votingDate: input.votingDate ?? null,
      venueOrMethod: input.venueOrMethod || null,
      resultsSummary: input.resultsSummary || null,
      createdById: adminId,
    },
  });
}

export async function updateElection(id: string, input: ElectionInput) {
  return db.election.update({
    where: { id },
    data: {
      title: input.title,
      description: input.description || null,
      status: input.status,
      nominationStart: input.nominationStart ?? null,
      nominationEnd: input.nominationEnd ?? null,
      votingDate: input.votingDate ?? null,
      venueOrMethod: input.venueOrMethod || null,
      resultsSummary: input.resultsSummary || null,
    },
  });
}

export async function deleteElection(id: string) {
  return db.election.delete({ where: { id } });
}
