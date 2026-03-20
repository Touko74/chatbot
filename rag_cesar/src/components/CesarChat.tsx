"use client";
// src/components/CesarChat.tsx

import { useState, useRef, useEffect, KeyboardEvent, DragEvent } from "react";

interface Source {
  source: string;
  page?: string | number;
  extrait: string;
}

interface Message {
  role: "user" | "bot";
  content: string;
  sources?: Source[];
}

interface UploadedFile {
  name: string;
  status: "ok" | "error";
}

const EXAMPLES = [
  "Quel est le taux d'amortissement pour du matériel informatique ?",
  "Quel est le plafond de remboursement pour un repas client ?",
  "Quels sont les taux de TVA applicables en France ?",
  "Quelles opérations faire pour la clôture annuelle ?",
  "Comment comptabiliser une provision pour créance douteuse ?",
];

// ── Logo César ────────────────────────────────────────────────────────────────
function CesarLogo({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="40" height="40" rx="10" fill="#FF7043"/>
      <text x="50%" y="54%" dominantBaseline="middle" textAnchor="middle"
        fontFamily="Georgia, serif" fontWeight="700" fontSize="22" fill="white">
        C
      </text>
      <circle cx="30" cy="10" r="5" fill="#FFD54F"/>
      <text x="30" y="13.5" dominantBaseline="middle" textAnchor="middle"
        fontFamily="Georgia, serif" fontWeight="700" fontSize="7" fill="#BF360C">
        R
      </text>
    </svg>
  );
}

// ── Composant principal ────────────────────────────────────────────────────────
export default function CesarChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  function autoResize() {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 140) + "px";
  }

  function handleKey(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendQuestion();
    }
  }

  async function handleUpload(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);

    const formData = new FormData();
    Array.from(files).forEach((f) => formData.append("files", f));

    try {
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (data.success) {
        setUploadedFiles((prev) => [
          ...prev,
          ...data.files.map((f: string) => ({ name: f, status: "ok" as const })),
        ]);
      } else {
        alert("Erreur upload : " + data.error);
      }
    } catch {
      alert("Impossible de contacter le serveur.");
    } finally {
      setUploading(false);
    }
  }

  function onDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragOver(false);
    handleUpload(e.dataTransfer.files);
  }

  async function sendQuestion() {
    const q = question.trim();
    if (!q || loading) return;
    setQuestion("");
    setMessages((prev) => [...prev, { role: "user", content: q }]);
    setLoading(true);

    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q }),
      });
      const data = await res.json();
      setMessages((prev) => [
        ...prev,
        data.error
          ? { role: "bot", content: "⚠️ " + data.error }
          : { role: "bot", content: data.answer, sources: data.sources },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "bot", content: "⚠️ Impossible de contacter le serveur." },
      ]);
    } finally {
      setLoading(false);
      textareaRef.current?.focus();
    }
  }

  return (
    <div style={{
      display: "flex", height: "100vh",
      background: "#0d0f14", color: "#e2e8f0",
      fontFamily: "'Segoe UI', system-ui, sans-serif",
    }}>

      {/* ── SIDEBAR ──────────────────────────────────────────────── */}
      <aside style={{
        width: 256, flexShrink: 0,
        borderRight: "1px solid #1e2130",
        background: "#111318",
        display: "flex", flexDirection: "column", gap: 0,
        overflowY: "auto",
      }}>

        {/* Logo César */}
        <div style={{
          padding: "20px 16px 16px",
          borderBottom: "1px solid #1e2130",
          display: "flex", alignItems: "center", gap: 10,
        }}>
          <CesarLogo size={38} />
          <div>
            <div style={{ fontWeight: 700, fontSize: 16, letterSpacing: "-0.3px", color: "#fff" }}>
              RAG César
            </div>
            <div style={{ fontSize: 11, color: "#64748b" }}>
              propulsé par Mistral AI
            </div>
          </div>
        </div>

        {/* Upload zone */}
        <div style={{ padding: "16px 12px 8px" }}>
          <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.8px", color: "#64748b", marginBottom: 8 }}>
            Vos documents
          </p>

          <div
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            style={{
              border: `2px dashed ${dragOver ? "#FF7043" : uploading ? "#FFD54F" : "#2e3248"}`,
              borderRadius: 10,
              padding: "14px 10px",
              textAlign: "center",
              cursor: "pointer",
              transition: "all 0.2s",
              background: dragOver ? "rgba(255,112,67,0.05)" : "transparent",
              marginBottom: 8,
            }}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,.txt"
              style={{ display: "none" }}
              onChange={(e) => handleUpload(e.target.files)}
            />
            {uploading ? (
              <>
                <div style={{ fontSize: 20, marginBottom: 4 }}>⏳</div>
                <p style={{ fontSize: 12, color: "#FFD54F", margin: 0 }}>Indexation...</p>
              </>
            ) : (
              <>
                <div style={{ fontSize: 22, marginBottom: 4 }}>📂</div>
                <p style={{ fontSize: 12, color: "#94a3b8", margin: 0 }}>
                  Glisse tes PDF / TXT<br />
                  <span style={{ fontSize: 11, color: "#64748b" }}>ou clique pour choisir</span>
                </p>
              </>
            )}
          </div>

          {/* Fichiers uploadés */}
          {uploadedFiles.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 8 }}>
              {uploadedFiles.map((f, i) => (
                <div key={i} style={{
                  display: "flex", alignItems: "center", gap: 6,
                  background: "#1a1f2e", borderRadius: 6, padding: "5px 8px",
                }}>
                  <span style={{ fontSize: 12, color: "#34d399" }}>✓</span>
                  <span style={{ fontSize: 11, color: "#94a3b8", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {f.name}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Exemples */}
        <div style={{ padding: "0 12px 12px", flex: 1 }}>
          <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.8px", color: "#64748b", marginBottom: 8 }}>
            Questions types
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            {EXAMPLES.map((q) => (
              <button
                key={q}
                onClick={() => { setQuestion(q); textareaRef.current?.focus(); }}
                style={{
                  textAlign: "left", fontSize: 12, color: "#94a3b8",
                  background: "#1a1f2e", border: "1px solid #1e2130",
                  borderRadius: 8, padding: "8px 10px", cursor: "pointer",
                  lineHeight: 1.4, transition: "all 0.15s",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.borderColor = "#FF7043";
                  (e.currentTarget as HTMLButtonElement).style.color = "#FF7043";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.borderColor = "#1e2130";
                  (e.currentTarget as HTMLButtonElement).style.color = "#94a3b8";
                }}
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      </aside>

      {/* ── MAIN ─────────────────────────────────────────────────── */}
      <main style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>

        {/* Header */}
        <header style={{
          display: "flex", alignItems: "center", gap: 12,
          padding: "14px 24px",
          borderBottom: "1px solid #1e2130",
          background: "#111318",
        }}>
          <CesarLogo size={32} />
          <div>
            <h1 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#fff", letterSpacing: "-0.3px" }}>
              César — Assistant Comptable IA
            </h1>
            <p style={{ margin: 0, fontSize: 12, color: "#64748b" }}>
              RAG · LangChain.js · Mistral AI
            </p>
          </div>
          <div style={{
            marginLeft: "auto", display: "flex", alignItems: "center", gap: 6,
            background: "#0d2010", border: "1px solid #1a3d1a",
            color: "#34d399", fontSize: 11, fontWeight: 600,
            padding: "4px 12px", borderRadius: 20,
          }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#34d399", display: "inline-block", animation: "pulse 2s infinite" }} />
            Connecté
          </div>
        </header>

        {/* Messages */}
        <div style={{
          flex: 1, overflowY: "auto",
          padding: "24px", display: "flex", flexDirection: "column", gap: 20,
        }}>
          {messages.length === 0 && !loading && (
            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div style={{ textAlign: "center", color: "#64748b", maxWidth: 400 }}>
                <CesarLogo size={56} />
                <p style={{ marginTop: 16, fontSize: 15, lineHeight: 1.6 }}>
                  <span style={{ color: "#e2e8f0", fontWeight: 600 }}>Bonjour, je suis César !</span><br />
                  Uploadez vos documents comptables et posez-moi<br />
                  vos questions — je cherche dans vos fichiers.
                </p>
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} style={{
              display: "flex", flexDirection: "column",
              alignItems: msg.role === "user" ? "flex-end" : "flex-start",
              gap: 8,
            }}>
              {msg.role === "bot" && (
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                  <CesarLogo size={20} />
                  <span style={{ fontSize: 12, color: "#64748b", fontWeight: 600 }}>César</span>
                </div>
              )}
              <div style={{
                maxWidth: "82%",
                padding: "12px 16px",
                borderRadius: msg.role === "user" ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                fontSize: 14, lineHeight: 1.65, whiteSpace: "pre-wrap",
                background: msg.role === "user" ? "#FF7043" : "#1a1f2e",
                color: msg.role === "user" ? "#fff" : "#e2e8f0",
                border: msg.role === "bot" ? "1px solid #1e2130" : "none",
              }}>
                {msg.content}
              </div>

              {/* Sources */}
              {msg.sources && msg.sources.length > 0 && (
                <div style={{ maxWidth: "82%", display: "flex", flexDirection: "column", gap: 5 }}>
                  <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.7px", color: "#64748b", margin: 0 }}>
                    📎 Sources
                  </p>
                  {msg.sources.map((s, j) => (
                    <div key={j} style={{
                      background: "#0d0f14", border: "1px solid #1e2130",
                      borderRadius: 8, padding: "8px 12px",
                    }}>
                      <p style={{ margin: 0, fontSize: 11, fontFamily: "monospace", fontWeight: 700, color: "#FF7043" }}>
                        {s.source}{s.page ? ` · ${s.page}` : ""}
                      </p>
                      <p style={{ margin: "4px 0 0", fontSize: 11, color: "#64748b", lineHeight: 1.5 }}>
                        {s.extrait}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}

          {/* Loading */}
          {loading && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <CesarLogo size={20} />
                <span style={{ fontSize: 12, color: "#64748b", fontWeight: 600 }}>César</span>
              </div>
              <div style={{
                background: "#1a1f2e", border: "1px solid #1e2130",
                borderRadius: "16px 16px 16px 4px",
                padding: "12px 16px", fontSize: 14, color: "#64748b",
                display: "flex", alignItems: "center", gap: 8,
              }}>
                Recherche dans les documents
                <span style={{ display: "flex", gap: 3 }}>
                  {[0, 1, 2].map((i) => (
                    <span key={i} style={{
                      width: 5, height: 5, borderRadius: "50%",
                      background: "#FF7043", display: "inline-block",
                      animation: `bounce 1.2s infinite ${i * 0.15}s`,
                    }} />
                  ))}
                </span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div style={{
          padding: "12px 24px 20px",
          borderTop: "1px solid #1e2130",
          display: "flex", gap: 10, alignItems: "flex-end",
        }}>
          <textarea
            ref={textareaRef}
            value={question}
            onChange={(e) => { setQuestion(e.target.value); autoResize(); }}
            onKeyDown={handleKey}
            placeholder="Posez votre question comptable… (Entrée pour envoyer)"
            rows={1}
            style={{
              flex: 1, background: "#1a1f2e",
              border: "1px solid #1e2130", color: "#e2e8f0",
              fontSize: 14, padding: "12px 16px",
              borderRadius: 12, resize: "none", outline: "none",
              fontFamily: "inherit", lineHeight: 1.5,
              minHeight: 50, maxHeight: 140,
              transition: "border-color 0.15s",
            }}
            onFocus={(e) => { e.currentTarget.style.borderColor = "#FF7043"; }}
            onBlur={(e) => { e.currentTarget.style.borderColor = "#1e2130"; }}
          />
          <button
            onClick={sendQuestion}
            disabled={loading || !question.trim()}
            style={{
              background: loading || !question.trim() ? "#2e3248" : "#FF7043",
              color: "#fff", border: "none", fontFamily: "inherit",
              fontSize: 14, fontWeight: 600, padding: "12px 20px",
              borderRadius: 12, cursor: loading || !question.trim() ? "not-allowed" : "pointer",
              transition: "all 0.15s", whiteSpace: "nowrap",
            }}
          >
            Envoyer →
          </button>
        </div>
      </main>

      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        @keyframes bounce { 0%,80%,100%{transform:scale(0.7);opacity:0.4} 40%{transform:scale(1);opacity:1} }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        html, body { height: 100%; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #2e3248; border-radius: 4px; }
      `}</style>
    </div>
  );
}
