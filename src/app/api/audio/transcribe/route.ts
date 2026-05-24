import { NextResponse } from "next/server";
import { writeFile, mkdir, unlink } from "fs/promises";
import fs from "fs";
import path from "path";
import Groq from "groq-sdk";
import { withAuth, withErrorHandler } from "@/lib/api-utils";

const ALLOWED_TYPES = [
  "audio/webm",
  "audio/wav",
  "audio/mp3",
  "audio/mp4",
  "audio/m4a",
  "audio/ogg",
  "audio/webm;codecs=opus",
];
const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25 MB

export const POST = withErrorHandler(
  withAuth(async (request) => {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "Aucun fichier audio fourni" },
        { status: 400 },
      );
    }

    // Validation MIME
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: `Format audio non supporté : ${file.type}` },
        { status: 400 },
      );
    }

    // Validation taille
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "Fichier audio trop volumineux (max 25 MB)" },
        { status: 400 },
      );
    }

    // Sauvegarde temporaire
    const tmpDir = path.join(process.cwd(), "tmp");
    await mkdir(tmpDir, { recursive: true });
    const tmpPath = path.join(tmpDir, `audio-${Date.now()}-${Math.random().toString(36).substring(2, 6)}.webm`);
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(tmpPath, buffer);

    try {
      // Transcription Groq Whisper
      const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
      const transcription = await groq.audio.transcriptions.create({
        file: fs.createReadStream(tmpPath),
        model: "whisper-large-v3-turbo",
        temperature: 0,
        response_format: "verbose_json",
      });

      const text = transcription.text?.trim() ?? "";

      return NextResponse.json({ text });
    } finally {
      // Nettoyage du fichier temporaire
      try {
        await unlink(tmpPath);
      } catch {
        // ignore cleanup errors
      }
    }
  }),
);
