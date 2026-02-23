import { db } from "./db";
import {
  impressContacts,
  meetingAttendees,
  meetings,
  userProfiles,
} from "./schema";
import { eq, and, sql, isNull, lt } from "drizzle-orm";
import {
  enrichmentQueue,
  type EnrichmentPriority,
  type ContactTier,
} from "./enrichment-queue";
import { runImpressDeepDive } from "./impress-deep-dive";

interface AttendeeMatchResult {
  matched: true;
  contactId: string;
  contactTier: ContactTier;
  isStale: boolean;
}

interface AttendeeNoMatch {
  matched: false;
}

type DeduplicationResult = AttendeeMatchResult | AttendeeNoMatch;

/**
 * Deduplicates a calendar attendee against existing contacts.
 * Matches by email first, then by fuzzy name+company.
 */
export async function deduplicateAttendee(
  userId: string,
  attendeeEmail: string | null,
  attendeeName: string | null,
  attendeeCompany: string | null
): Promise<DeduplicationResult> {
  // Task 7.1: Email match
  if (attendeeEmail) {
    const emailNorm = attendeeEmail.toLowerCase().trim();
    const contacts = await db
      .select()
      .from(impressContacts)
      .where(
        and(
          eq(impressContacts.userId, userId),
          eq(impressContacts.active, true)
        )
      );

    const emailMatch = contacts.find((c) => {
      if (!c.linkedinUrl) return false;
      // Check if we stored email somewhere or if the LinkedIn URL domain matches
      return false;
    });

    // Direct email match — check if any contact's name matches email prefix patterns
    for (const contact of contacts) {
      if (!contact.name) continue;
      const contactNameParts = contact.name.toLowerCase().split(/\s+/);
      const emailPrefix = emailNorm.split("@")[0] || "";

      // Check if email clearly identifies this person
      const firstLast = contactNameParts.join(".");
      const firstDotLast = `${contactNameParts[0]}.${contactNameParts[contactNameParts.length - 1]}`;
      const firstLast2 = contactNameParts.join("");

      if (
        emailPrefix === firstLast ||
        emailPrefix === firstDotLast ||
        emailPrefix === firstLast2 ||
        emailPrefix === contactNameParts[0]
      ) {
        const tier: ContactTier =
          contact.source === "onboarding" ||
          contact.source === "settings" ||
          contact.source === "user-added" ||
          contact.source === "promoted-from-calendar"
            ? "core"
            : "temporary";

        return {
          matched: true,
          contactId: contact.id,
          contactTier: tier,
          isStale: isContactStale(contact.lastEnrichedAt, 90, 0.5),
        };
      }
    }
  }

  // Task 7.2: Fuzzy name+company match
  if (attendeeName) {
    const contacts = await db
      .select()
      .from(impressContacts)
      .where(
        and(
          eq(impressContacts.userId, userId),
          eq(impressContacts.active, true)
        )
      );

    for (const contact of contacts) {
      if (!contact.name) continue;

      const nameMatch = fuzzyNameMatch(attendeeName, contact.name);
      const companyMatch =
        !attendeeCompany ||
        !contact.company ||
        fuzzyCompanyMatch(attendeeCompany, contact.company);

      if (nameMatch && companyMatch) {
        const tier: ContactTier =
          contact.source === "onboarding" ||
          contact.source === "settings" ||
          contact.source === "user-added" ||
          contact.source === "promoted-from-calendar"
            ? "core"
            : "temporary";

        return {
          matched: true,
          contactId: contact.id,
          contactTier: tier,
          isStale: isContactStale(contact.lastEnrichedAt, 90, 0.5),
        };
      }
    }
  }

  return { matched: false };
}

function fuzzyNameMatch(a: string, b: string): boolean {
  const normA = a.toLowerCase().trim().replace(/[^a-z\s]/g, "");
  const normB = b.toLowerCase().trim().replace(/[^a-z\s]/g, "");
  if (normA === normB) return true;

  const partsA = normA.split(/\s+/).filter(Boolean);
  const partsB = normB.split(/\s+/).filter(Boolean);

  // Match if first and last name match (handles middle name differences)
  if (
    partsA.length >= 2 &&
    partsB.length >= 2 &&
    partsA[0] === partsB[0] &&
    partsA[partsA.length - 1] === partsB[partsB.length - 1]
  ) {
    return true;
  }

  return false;
}

function fuzzyCompanyMatch(a: string, b: string): boolean {
  const normA = a
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\b(inc|llc|ltd|corp|co|company|group|holdings)\b/g, "")
    .trim();
  const normB = b
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\b(inc|llc|ltd|corp|co|company|group|holdings)\b/g, "")
    .trim();

  return normA === normB || normA.includes(normB) || normB.includes(normA);
}

function isContactStale(
  lastEnrichedAt: Date | null,
  intervalDays: number,
  thresholdFraction: number
): boolean {
  if (!lastEnrichedAt) return true;
  const ageDays =
    (Date.now() - lastEnrichedAt.getTime()) / (1000 * 60 * 60 * 24);
  return ageDays > intervalDays * thresholdFraction;
}

/**
 * Processes attendees for a set of upcoming meetings.
 * Deduplicates against existing contacts, queues enrichment as needed.
 */
export async function processCalendarAttendees(
  userId: string
): Promise<void> {
  const [profile] = await db
    .select()
    .from(userProfiles)
    .where(eq(userProfiles.userId, userId))
    .limit(1);

  const reEnrichmentInterval = profile?.reEnrichmentIntervalDays ?? 90;

  const now = new Date();
  const sevenDaysOut = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const oneDayOut = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  const upcomingMeetings = await db
    .select()
    .from(meetings)
    .where(
      and(
        eq(meetings.userId, userId),
        sql`${meetings.startTime} > ${now}`,
        sql`${meetings.startTime} <= ${sevenDaysOut}`
      )
    );

  for (const meeting of upcomingMeetings) {
    const attendees = await db
      .select()
      .from(meetingAttendees)
      .where(eq(meetingAttendees.meetingId, meeting.id));

    const isWithin24h = meeting.startTime <= oneDayOut;
    const calendarPriority: EnrichmentPriority = isWithin24h
      ? "calendar-24h"
      : "calendar-7d";

    for (const attendee of attendees) {
      const result = await deduplicateAttendee(
        userId,
        attendee.email,
        attendee.name,
        attendee.company
      );

      if (result.matched) {
        // Task 7.3 / 8.2 / 8.4: Matched existing contact
        if (
          result.contactTier === "core" &&
          isContactStale(null, reEnrichmentInterval, 0.5)
        ) {
          // Task 8.2: Core contact is stale — queue re-enrichment
          const [contact] = await db
            .select()
            .from(impressContacts)
            .where(eq(impressContacts.id, result.contactId))
            .limit(1);

          if (
            contact &&
            isContactStale(
              contact.lastEnrichedAt,
              reEnrichmentInterval,
              0.5
            )
          ) {
            enrichmentQueue.enqueue({
              contactId: result.contactId,
              userId,
              priority: calendarPriority,
              contactTier: "core",
              depth: "full",
            });
          }
        }
        // Task 8.4: Matched temporary contact — reuse, no new contact created
      } else {
        // Task 8.3: No match — create temporary contact and queue light deep dive
        const [newContact] = await db
          .insert(impressContacts)
          .values({
            userId,
            linkedinUrl: attendee.linkedinUrl || `email:${attendee.email || "unknown"}`,
            name: attendee.name,
            title: attendee.title,
            company: attendee.company,
            source: "calendar",
            researchStatus: "pending",
            enrichmentDepth: "none",
          })
          .returning();

        if (newContact) {
          enrichmentQueue.enqueue({
            contactId: newContact.id,
            userId,
            priority: calendarPriority,
            contactTier: "temporary",
            depth: "light",
          });
        }
      }
    }
  }
}

/**
 * Processes the enrichment queue, running deep dives for queued jobs.
 */
export async function drainEnrichmentQueue(): Promise<number> {
  let processed = 0;
  let job = enrichmentQueue.dequeue();

  while (job) {
    try {
      await runImpressDeepDive(job.contactId, job.userId, {
        depth: job.depth,
        isReEnrichment: job.depth === "full" && processed > 0,
      });
      processed++;
    } catch (err) {
      console.error(
        `Enrichment job failed for contact ${job.contactId}:`,
        err
      );
    }
    job = enrichmentQueue.dequeue();
  }

  return processed;
}

/**
 * Daily staleness check: finds all core contacts past their re-enrichment interval
 * and queues them for background re-enrichment.
 */
export async function checkAndQueueStaleContacts(): Promise<number> {
  const profiles = await db.select().from(userProfiles);
  let queued = 0;

  for (const profile of profiles) {
    const intervalDays = profile.reEnrichmentIntervalDays ?? 90;
    const cutoff = new Date(
      Date.now() - intervalDays * 24 * 60 * 60 * 1000
    );

    const staleContacts = await db
      .select()
      .from(impressContacts)
      .where(
        and(
          eq(impressContacts.userId, profile.userId),
          eq(impressContacts.active, true),
          sql`${impressContacts.source} IN ('onboarding', 'settings', 'user-added', 'promoted-from-calendar')`,
          sql`(${impressContacts.lastEnrichedAt} IS NULL OR ${impressContacts.lastEnrichedAt} < ${cutoff})`
        )
      );

    for (const contact of staleContacts) {
      const wasEnqueued = enrichmentQueue.enqueue({
        contactId: contact.id,
        userId: profile.userId,
        priority: "scheduled-reenrichment",
        contactTier: "core",
        depth: "full",
      });
      if (wasEnqueued) queued++;
    }
  }

  return queued;
}
