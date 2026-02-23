import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import OpenAI from "openai";
import { createLogger } from "@/lib/logger";

const log = createLogger("transcribe");

const MAX_FILE_SIZE = 25 * 1024 * 1024; // Whisper limit: 25 MB

let _openai: OpenAI | null = null;
function getOpenAI(): OpenAI {
  if (!_openai) _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return _openai;
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const audioFile = formData.get("audio") as File | null;

  if (!audioFile) {
    return NextResponse.json({ error: "No audio file provided" }, { status: 400 });
  }

  if (audioFile.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: "Audio file too large (max 25 MB)" }, { status: 400 });
  }

  const start = Date.now();
  log.info({ userId: session.user.id, size: audioFile.size, type: audioFile.type }, "Transcription request");

  try {
    const response = await getOpenAI().audio.transcriptions.create({
      file: audioFile,
      model: "whisper-1",
      response_format: "text",
    });

    const ms = Date.now() - start;
    log.info({ userId: session.user.id, ms, chars: response.length }, "Transcription complete");

    return NextResponse.json({ text: response });
  } catch (err) {
    const ms = Date.now() - start;
    log.error({ err, userId: session.user.id, ms }, "Transcription failed");
    return NextResponse.json(
      { error: "Transcription failed. Please try again." },
      { status: 500 },
    );
  }
}
