// src/lib/rag.ts
// Moteur RAG — LangChain.js + FAISS + Mistral AI

import { MistralAIEmbeddings } from "@langchain/mistralai";
import { ChatMistralAI } from "@langchain/mistralai";
import { FaissStore } from "@langchain/community/vectorstores/faiss";
import { RetrievalQAChain } from "langchain/chains";
import { PromptTemplate } from "@langchain/core/prompts";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { Document } from "@langchain/core/documents";
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { TextLoader } from "langchain/document_loaders/fs/text";
import * as fs from "fs";
import * as path from "path";

const VECTORSTORE_PATH = path.join(process.cwd(), "vectorstore_index");
const DOCS_DIR = path.join(process.cwd(), "docs_sample");
const MISTRAL_API_KEY = process.env.MISTRAL_API_KEY || "";

// ─────────────────────────────────────────
// PROMPT SPÉCIALISÉ COMPTABLE
// ─────────────────────────────────────────
const COMPTABLE_PROMPT = PromptTemplate.fromTemplate(`
Tu es César, un assistant comptable expert et sympathique.
Tu aides les comptables à trouver des informations précises dans leurs documents internes.

Règles :
- Réponds UNIQUEMENT en te basant sur le contexte fourni
- Si l'info n'est pas dans le contexte, dis-le clairement
- Cite toujours tes sources (article, document, page)
- Sois professionnel mais accessible
- Précise les dates d'application pour les règles fiscales

Contexte extrait des documents :
{context}

Question :
{question}

Réponse de César :`);

// ─────────────────────────────────────────
// DOCUMENTS DE DÉMO
// ─────────────────────────────────────────
function getDemoDocs(): Document[] {
  return [
    new Document({
      pageContent: `Code Général des Impôts — Article 39
Les charges déductibles comprennent :
- Les frais généraux de toute nature (loyers, charges locatives)
- Les amortissements du matériel (durée minimale : 3 ans pour matériel informatique)
- Les provisions pour créances douteuses (justification obligatoire)
Taux d'IS : 25% pour les exercices ouverts depuis le 01/01/2022.
Seuil PME : 15% sur les 42 500 premiers euros de bénéfice.`,
      metadata: { source: "Code Général des Impôts", article: "39" },
    }),
    new Document({
      pageContent: `Plan Comptable Général — Classe 6 : Comptes de charges
601 - Achats de matières premières
607 - Achats de marchandises
613 - Locations
615 - Entretien et réparations
616 - Primes d'assurances
621 - Personnel extérieur à l'entreprise
622 - Rémunérations d'intermédiaires et honoraires
Rappel : chaque charge doit être justifiée par une pièce comptable originale.`,
      metadata: { source: "Plan Comptable Général", classe: "6" },
    }),
    new Document({
      pageContent: `Procédure interne — Note de frais employés (mars 2024)
- Repas seul en déplacement : plafonné à 20,20 € (barème URSSAF 2024)
- Repas client : plafonné à 90 € TTC, nécessite liste des participants
- Transport : remboursement sur justificatifs (billet SNCF 2ème classe)
- Barème kilométrique 2024 pour 5 CV : 0,548 €/km jusqu'à 5 000 km
- Délai de soumission : 30 jours après la dépense
- Approbation requise : responsable direct + direction si > 500 €`,
      metadata: { source: "Procédure interne RH", version: "mars 2024" },
    }),
    new Document({
      pageContent: `TVA — Règles de déductibilité (DGFiP 2024)
Taux applicables en France :
- Taux normal : 20% (biens et services courants)
- Taux intermédiaire : 10% (restauration, travaux, transports)
- Taux réduit : 5,5% (produits alimentaires, livres)
- Taux particulier : 2,1% (médicaments remboursables, presse)
Conditions : TVA sur facture conforme, bien utilisé pour activité taxable.
Délai de réclamation : 31 décembre de la 2ème année suivant l'omission.`,
      metadata: { source: "Guide TVA DGFiP 2024" },
    }),
    new Document({
      pageContent: `Clôture annuelle — Checklist comptable
Opérations avant le 31/03 :
- Inventaire physique des stocks (FIFO ou CMUP)
- Revue créances clients > 6 mois (provision si risque avéré)
- Calcul des amortissements (tableau de dotation)
- Charges à payer (factures non reçues au 31/12)
- Rapprochement bancaire tous comptes
- Déclaration CVAE si CA > 500 000 €
- Liasse fiscale formulaire 2065 pour SA/SARL
Délais légaux : dépôt des comptes dans les 6 mois suivant la clôture.`,
      metadata: { source: "Procédure clôture interne", maj: "2024" },
    }),
  ];
}

// ─────────────────────────────────────────
// EMBEDDINGS
// ─────────────────────────────────────────
function getEmbeddings() {
  return new MistralAIEmbeddings({
    apiKey: MISTRAL_API_KEY,
    model: "mistral-embed",
  });
}

// ─────────────────────────────────────────
// CONSTRUCTION DE L'INDEX
// ─────────────────────────────────────────
export async function buildVectorstore(): Promise<FaissStore> {
  const embeddings = getEmbeddings();
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 800,
    chunkOverlap: 100,
  });

  let allDocs: Document[] = [];

  if (fs.existsSync(DOCS_DIR)) {
    const files = fs.readdirSync(DOCS_DIR);
    for (const file of files) {
      const filePath = path.join(DOCS_DIR, file);
      try {
        if (file.endsWith(".pdf")) {
          const loader = new PDFLoader(filePath);
          allDocs.push(...(await loader.load()));
        } else if (file.endsWith(".txt")) {
          const loader = new TextLoader(filePath);
          allDocs.push(...(await loader.load()));
        }
      } catch (e) {
        console.error(`Erreur chargement ${file}:`, e);
      }
    }
  }

  if (allDocs.length === 0) {
    console.log("Aucun document → documents de démo");
    allDocs = getDemoDocs();
  }

  const chunks = await splitter.splitDocuments(allDocs);
  console.log(`${chunks.length} chunks créés`);

  const vectorstore = await FaissStore.fromDocuments(chunks, embeddings);
  await vectorstore.save(VECTORSTORE_PATH);
  return vectorstore;
}

// ─────────────────────────────────────────
// CHARGEMENT
// ─────────────────────────────────────────
export async function loadVectorstore(): Promise<FaissStore> {
  const embeddings = getEmbeddings();
  if (fs.existsSync(VECTORSTORE_PATH)) {
    return await FaissStore.load(VECTORSTORE_PATH, embeddings);
  }
  return await buildVectorstore();
}

// ─────────────────────────────────────────
// CHAÎNE RAG
// ─────────────────────────────────────────
export async function getQAChain(vectorstore: FaissStore) {
  const llm = new ChatMistralAI({
    model: "mistral-large-latest",
    temperature: 0,
    apiKey: MISTRAL_API_KEY,
  });

  const retriever = vectorstore.asRetriever({ k: 4 });

  return RetrievalQAChain.fromLLM(llm, retriever, {
    returnSourceDocuments: true,
    verbose: false,
  });
}

export interface Source {
  source: string;
  page?: string | number;
  extrait: string;
}
