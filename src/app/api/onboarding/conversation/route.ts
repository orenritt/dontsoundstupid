import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { userProfiles } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { parseTranscriptAsync } from "@/lib/parse-transcript";
import { createLogger } from "@/lib/logger";

const log = createLogger("onboarding:conversation");

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;
  const ulog = log.child({ userId });

  const { transcript, inputMethod } = await request.json();
  if (!transcript || transcript.length < 20) {
    ulog.warn({ transcriptLength: transcript?.length ?? 0 }, "Transcript too short");
    return NextResponse.json(
      { error: "Please tell us more (at least a few sentences)" },
      { status: 400 }
    );
  }

  ulog.info({ inputMethod: inputMethod || "text", transcriptLength: transcript.length }, "Saving conversation transcript");

  await db
    .update(userProfiles)
    .set({
      conversationTranscript: transcript,
      conversationInputMethod: inputMethod || "text",
      updatedAt: new Date(),
    })
    .where(eq(userProfiles.userId, userId));

  ulog.info("Transcript saved, firing parseTranscriptAsync in background");

  parseTranscriptAsync(userId, transcript).catch(() => {
    // Error already logged and error row written inside parseTranscriptAsync
  });

  return NextResponse.json({ ok: true });
}
