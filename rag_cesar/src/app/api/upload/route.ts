// src/app/api/upload/route.ts
import { NextRequest, NextResponse } from "next/server";
import { buildVectorstore } from "@/lib/rag";
import * as fs from "fs";
import * as path from "path";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const files = formData.getAll("files") as File[];

    if (!files.length) {
      return NextResponse.json({ error: "Aucun fichier reçu" }, { status: 400 });
    }

    const docsDir = path.join(process.cwd(), "docs_sample");
    if (!fs.existsSync(docsDir)) fs.mkdirSync(docsDir, { recursive: true });

    const saved: string[] = [];
    for (const file of files) {
      const ext = file.name.split(".").pop()?.toLowerCase();
      if (!["pdf", "txt"].includes(ext ?? "")) continue;
      const buffer = Buffer.from(await file.arrayBuffer());
      fs.writeFileSync(path.join(docsDir, file.name), buffer);
      saved.push(file.name);
    }

    if (saved.length === 0) {
      return NextResponse.json({ error: "Formats acceptés : PDF, TXT" }, { status: 400 });
    }

    await buildVectorstore();
    return NextResponse.json({ success: true, files: saved });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erreur inconnue";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
