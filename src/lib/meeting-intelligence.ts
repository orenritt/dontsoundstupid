import { db } from "./db";
import {
  meetings,
  meetingAttendees,
  meetingIntelligence,
  users,
  userProfiles,
} from "./schema";
import { eq, and, sql } from "drizzle-orm";
import { chat } from "./llm";
import { createLogger } from "./logger";

const log = createLogger("meeting-intelligence");

export async function generateMeetingIntelligence(userId: string): Promise<number> {
  const ulog = log.child({ userId });

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  const [profile] = await db
    .select()
    .from(userProfiles)
    .where(eq(userProfiles.userId, userId))
    .limit(1);

  if (!user) return 0;

  const now = new Date();
  const twentyFourHoursOut = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  const upcomingMeetings = await db
    .select()
    .from(meetings)
    .where(
      and(
        eq(meetings.userId, userId),
        sql`${meetings.startTime} > ${now}`,
        sql`${meetings.startTime} <= ${twentyFourHoursOut}`
      )
    );

  let generated = 0;

  for (const meeting of upcomingMeetings) {
    const existing = await db
      .select({ id: meetingIntelligence.id })
      .from(meetingIntelligence)
      .where(eq(meetingIntelligence.meetingId, meeting.id))
      .limit(1);

    if (existing.length > 0) continue;

    const attendees = await db
      .select()
      .from(meetingAttendees)
      .where(eq(meetingAttendees.meetingId, meeting.id));

    if (attendees.length === 0) continue;

    try {
      const attendeeContext = attendees
        .map((a) => {
          const parts = [a.name || "Unknown"];
          if (a.title) parts.push(a.title);
          if (a.company) parts.push(`at ${a.company}`);
          if (a.enrichmentData) {
            const ed = a.enrichmentData;
            if (ed.topicsTheyCareAbout?.length) {
              parts.push(`Interests: ${ed.topicsTheyCareAbout.join(", ")}`);
            }
            if (ed.recentActivity?.length) {
              parts.push(`Recent: ${ed.recentActivity.slice(0, 2).join("; ")}`);
            }
          }
          return parts.join(" | ");
        })
        .join("\n");

      const userContext = [
        user.title ? `Role: ${user.title}` : null,
        user.company ? `Company: ${user.company}` : null,
        profile?.parsedInitiatives
          ? `Initiatives: ${(profile.parsedInitiatives as string[]).join(", ")}`
          : null,
      ]
        .filter(Boolean)
        .join("\n");

      const response = await chat(
        [
          {
            role: "system",
            content: `You generate pre-meeting intelligence briefs. Return valid JSON with this shape:
{
  "attendeeSummaries": [{ "name": string, "role": string|null, "company": string|null, "recentActivity": string[], "topicsTheyCareAbout": string[] }],
  "relevantTopics": string[],
  "suggestedTalkingPoints": string[]
}
Keep summaries concise. Focus on what would help the user prepare for this specific meeting.`,
          },
          {
            role: "user",
            content: `Meeting: "${meeting.title}"
Description: ${meeting.description || "None"}
Time: ${meeting.startTime.toISOString()}

About you:
${userContext}

Attendees:
${attendeeContext}

Generate meeting intelligence.`,
          },
        ],
        { model: "gpt-4o-mini", temperature: 0.3, maxTokens: 2048 }
      );

      let rawContent = response.content.trim();
      const fence = rawContent.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
      if (fence?.[1]) rawContent = fence[1].trim();

      const intel = JSON.parse(rawContent);

      await db.insert(meetingIntelligence).values({
        meetingId: meeting.id,
        attendeeSummaries: intel.attendeeSummaries || [],
        relevantTopics: intel.relevantTopics || [],
        suggestedTalkingPoints: intel.suggestedTalkingPoints || [],
        modelUsed: response.model,
      });

      generated++;
      ulog.info({ meetingId: meeting.id, meetingTitle: meeting.title }, "Meeting intelligence generated");
    } catch (err) {
      ulog.error({ err, meetingId: meeting.id }, "Failed to generate meeting intelligence");
    }
  }

  return generated;
}
