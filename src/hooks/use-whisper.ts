"use client";

import { useState, useRef, useCallback } from "react";

interface UseWhisperReturn {
  recording: boolean;
  transcribing: boolean;
  error: string | null;
  startRecording: () => void;
  stopRecording: () => Promise<string | null>;
  toggleRecording: () => void;
}

/**
 * Records audio via MediaRecorder and transcribes it using the /api/transcribe
 * endpoint (OpenAI Whisper). Handles chunked recording — each stop/start cycle
 * sends a segment to the server and returns the transcript text.
 */
export function useWhisper(
  onTranscript: (text: string) => void,
): UseWhisperReturn {
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const segmentTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const SEGMENT_INTERVAL_MS = 8_000;

  const sendChunks = useCallback(
    async (chunks: Blob[]): Promise<string | null> => {
      if (chunks.length === 0) return null;

      const mimeType = mediaRecorderRef.current?.mimeType ?? "audio/webm";
      const blob = new Blob(chunks, { type: mimeType });

      if (blob.size < 1000) return null;

      setTranscribing(true);
      try {
        const form = new FormData();
        const ext = mimeType.includes("mp4") ? "mp4" : "webm";
        form.append("audio", blob, `recording.${ext}`);

        const res = await fetch("/api/transcribe", {
          method: "POST",
          body: form,
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || `Transcription failed (${res.status})`);
        }

        const { text } = await res.json();
        const trimmed = (text as string).trim();
        if (trimmed) {
          onTranscript(trimmed);
          return trimmed;
        }
        return null;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Transcription failed");
        return null;
      } finally {
        setTranscribing(false);
      }
    },
    [onTranscript],
  );

  const flushSegment = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state !== "recording") return;

    recorder.stop();

    const pending = [...chunksRef.current];
    chunksRef.current = [];

    sendChunks(pending).then(() => {
      if (mediaRecorderRef.current && streamRef.current) {
        try {
          const next = new MediaRecorder(streamRef.current, {
            mimeType: recorder.mimeType,
          });
          next.ondataavailable = (e) => {
            if (e.data.size > 0) chunksRef.current.push(e.data);
          };
          mediaRecorderRef.current = next;
          next.start();
        } catch {
          // stream may have been stopped
        }
      }
    });
  }, [sendChunks]);

  const startRecording = useCallback(async () => {
    setError(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/mp4")
          ? "audio/mp4"
          : "audio/webm";

      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.start();
      setRecording(true);

      segmentTimerRef.current = setInterval(flushSegment, SEGMENT_INTERVAL_MS);
    } catch (err) {
      if (err instanceof DOMException && err.name === "NotAllowedError") {
        setError("Microphone access denied. Please allow microphone access and try again.");
      } else {
        setError(err instanceof Error ? err.message : "Could not access microphone");
      }
    }
  }, [flushSegment]);

  const stopRecording = useCallback(async (): Promise<string | null> => {
    if (segmentTimerRef.current) {
      clearInterval(segmentTimerRef.current);
      segmentTimerRef.current = null;
    }

    const recorder = mediaRecorderRef.current;
    if (!recorder) {
      setRecording(false);
      return null;
    }

    return new Promise<string | null>((resolve) => {
      if (recorder.state === "inactive") {
        const pending = [...chunksRef.current];
        chunksRef.current = [];
        cleanup();
        sendChunks(pending).then(resolve);
        return;
      }

      recorder.onstop = () => {
        const pending = [...chunksRef.current];
        chunksRef.current = [];
        cleanup();
        sendChunks(pending).then(resolve);
      };
      recorder.stop();
    });

    function cleanup() {
      mediaRecorderRef.current = null;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      setRecording(false);
    }
  }, [sendChunks]);

  const toggleRecording = useCallback(() => {
    if (recording) {
      stopRecording();
    } else {
      startRecording();
    }
  }, [recording, startRecording, stopRecording]);

  return { recording, transcribing, error, startRecording, stopRecording, toggleRecording };
}
