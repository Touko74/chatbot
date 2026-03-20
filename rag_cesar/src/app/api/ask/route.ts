// src/app/api/ask/route.ts
import { NextRequest, NextResponse } from "next/server";
import { loadVectorstore, getQAChain, Source } from "@/lib/rag";

export async function POST(req: NextRequest) {
  try {
    const { question } = await req.json();
    if (!question?.trim()) {
      return NextResponse.json({ error: "Question vide" }, { status: 400 });
    }

    const vectorstore = await loadVectorstore();
    const chain = await getQAChain(vectorstore);
    const result = await chain.call({ query: question });

    const seen = new Set<string>();
    const sources: Source[] = [];
    for (const doc of result.sourceDocuments ?? []) {
      const key = doc.metadata?.source + doc.pageContent.slice(0, 50);
      if (!seen.has(key)) {
        seen.add(key);
        sources.push({
          source: doc.metadata?.source ?? "Document inconnu",
          page: doc.metadata?.page ?? doc.metadata?.article ?? "",
          extrait: doc.pageContent.slice(0, 200) + "...",
        });
      }
    }

    return NextResponse.json({ answer: result.text, sources });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erreur inconnue";
    console.error("RAG error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
