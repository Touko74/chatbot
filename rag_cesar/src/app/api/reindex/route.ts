// src/app/api/reindex/route.ts
import { NextResponse } from "next/server";
import { buildVectorstore } from "@/lib/rag";
import * as fs from "fs";
import * as path from "path";

export async function POST() {
  try {
    const vPath = path.join(process.cwd(), "vectorstore_index");
    if (fs.existsSync(vPath)) fs.rmSync(vPath, { recursive: true });
    await buildVectorstore();
    return NextResponse.json({ success: true, message: "Index recréé !" });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erreur inconnue";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
