import { NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { withAuth, withErrorHandler } from "@/lib/api-utils";

const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/svg+xml", "image/webp"];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

export const POST = withErrorHandler(
  withAuth(async (request) => {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "Aucun fichier fourni" },
        { status: 400 },
      );
    }

    // Validation du type MIME
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        {
          error: `Type de fichier non supporté. Types acceptés : PNG, JPG, SVG, WebP`,
        },
        { status: 400 },
      );
    }

    // Validation de la taille
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "Le fichier dépasse la taille maximale de 5 Mo" },
        { status: 400 },
      );
    }

    // Générer un nom de fichier unique
    const ext = file.type === "image/svg+xml" ? ".svg" : file.type === "image/webp" ? ".webp" : file.type === "image/png" ? ".png" : ".jpg";
    const uniqueName = `project-logo-${Date.now()}-${Math.random().toString(36).substring(2, 8)}${ext}`;

    // Chemin de sauvegarde dans public/uploads/projects/
    const uploadsDir = path.join(process.cwd(), "public", "uploads", "projects");

    // Créer le dossier s'il n'existe pas
    await mkdir(uploadsDir, { recursive: true });

    const filePath = path.join(uploadsDir, uniqueName);

    // Écrire le fichier
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(filePath, buffer);

    // URL relative accessible publiquement
    const url = `/uploads/projects/${uniqueName}`;

    return NextResponse.json({ url, name: uniqueName, size: file.size }, { status: 201 });
  }),
);
