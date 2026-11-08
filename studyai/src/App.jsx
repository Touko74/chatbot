import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  GraduationCap, Send, Plus, Trash2, Key, Eye, EyeOff,
  BookOpen, Calculator, FlaskConical, PenTool, Code, Globe,
  Clock, MessageSquare, TrendingUp, Target, Flame, Award,
  ChevronRight, X, BarChart2, Calendar, CheckCircle, Circle,
  Sparkles, ExternalLink, AlertCircle
} from 'lucide-react';

/* ─────────────────────────────────────────
   CONSTANTS
───────────────────────────────────────── */
const SYSTEM_PROMPT = `Tu es StudyAI, un assistant pédagogique intelligent pour étudiants.

## Format de réponse OBLIGATOIRE
Structure chaque réponse ainsi :

**🎯 Réponse directe** — 1-2 phrases max.

**📖 Explication**
Développe avec titres ##, listes à puces, exemples concrets.

**💡 À retenir**
Points clés en **gras**.

**🔗 Pour aller plus loin** *(si pertinent)*

## Règles
- Titres ##/### pour structurer
- **Gras** pour les termes importants  
- Listes à puces pour les énumérations
- Blocs de code pour formules/code
- Maximum 3-4 phrases par paragraphe
- Réponds en français sauf si l'étudiant écrit autrement`;

const SUGGESTIONS = [
  { icon: BookOpen, label: 'Résumer un cours', color: '#d4d4d4' },
  { icon: Calculator, label: 'Résoudre un exercice', color: '#e5e5e5' },
  { icon: FlaskConical, label: 'Expliquer un concept', color: '#e5e5e5' },
  { icon: PenTool, label: 'Plan de dissertation', color: '#e5e5e5' },
  { icon: Code, label: 'Aide en programmation', color: '#bdbdbd' },
  { icon: Globe, label: 'Préparer un exposé', color: '#cfcfcf' },
];

// ── Fournisseur d'API (change ces 2 lignes pour changer de fournisseur) ──
const API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const API_MODEL = 'openai/gpt-oss-20b';
// Mistral : 'https://api.mistral.ai/v1/chat/completions' + 'mistral-small-latest'

const SUBJECTS = ['Mathématiques','Physique','Chimie','Biologie','Histoire','Géo','Littérature','Philosophie','Anglais','Informatique','Économie','Droit','Autre'];

/* ─────────────────────────────────────────
   STORAGE HELPERS
───────────────────────────────────────── */
const LS = {
  get: (k, fallback) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : fallback; } catch { return fallback; } },
  set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
};

/* ─────────────────────────────────────────
   MARKDOWN PARSER
───────────────────────────────────────── */
function parseInline(text) {
  const parts = [];
  const re = /(\*\*(.+?)\*\*|\*(.+?)\*|`([^`]+)`)/g;
  let last = 0, m;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    if (m[2]) parts.push(<strong key={m.index} style={{ color: '#fafafa', fontWeight: 600 }}>{m[2]}</strong>);
    else if (m[3]) parts.push(<em key={m.index} style={{ color: '#e5e5e5' }}>{m[3]}</em>);
    else if (m[4]) parts.push(<code key={m.index} style={{ fontFamily: 'Fira Code, monospace', fontSize: 12, background: 'rgba(255,255,255,0.15)', color: '#d4d4d4', padding: '1px 6px', borderRadius: 4, border: '1px solid rgba(255,255,255,0.2)' }}>{m[4]}</code>);
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts.length ? parts : text;
}

function Markdown({ text }) {
  const lines = text.split('\n');
  const els = [];
  let i = 0;
  while (i < lines.length) {
    const l = lines[i];
    if (!l.trim()) { els.push(<div key={i} style={{ height: 8 }} />); i++; continue; }
    if (l.startsWith('### ')) { els.push(<h3 key={i} style={{ fontSize: 13, fontWeight: 600, color: '#e5e5e5', margin: '12px 0 5px', fontFamily: 'Fira Code, monospace' }}>{parseInline(l.slice(4))}</h3>); i++; continue; }
    if (l.startsWith('## ')) { els.push(<h2 key={i} style={{ fontSize: 15, fontWeight: 700, color: '#f2f2f2', margin: '16px 0 7px', paddingBottom: 6, borderBottom: '1px solid rgba(255,255,255,0.13)' }}>{parseInline(l.slice(3))}</h2>); i++; continue; }
    if (l.startsWith('---')) { els.push(<hr key={i} style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.13)', margin: '10px 0' }} />); i++; continue; }
    if (l.startsWith('> ')) { els.push(<blockquote key={i} style={{ borderLeft: '3px solid #f5f5f5', paddingLeft: 12, margin: '8px 0', color: '#8a8a8a', fontStyle: 'italic' }}>{parseInline(l.slice(2))}</blockquote>); i++; continue; }
    if (l.startsWith('- ') || l.startsWith('* ')) {
      const items = [];
      while (i < lines.length && (lines[i].startsWith('- ') || lines[i].startsWith('* '))) {
        items.push(<li key={i} style={{ margin: '4px 0', lineHeight: 1.65 }}>{parseInline(lines[i].slice(2))}</li>);
        i++;
      }
      els.push(<ul key={`ul${i}`} style={{ paddingLeft: 18, margin: '6px 0', color: '#c9c9c9' }}>{items}</ul>);
      continue;
    }
    if (/^\d+\.\s/.test(l)) {
      const items = [];
      while (i < lines.length && /^\d+\.\s/.test(lines[i])) {
        items.push(<li key={i} style={{ margin: '4px 0', lineHeight: 1.65 }}>{parseInline(lines[i].replace(/^\d+\.\s/, ''))}</li>);
        i++;
      }
      els.push(<ol key={`ol${i}`} style={{ paddingLeft: 18, margin: '6px 0', color: '#c9c9c9' }}>{items}</ol>);
      continue;
    }
    if (l.startsWith('```')) {
      const lang = l.slice(3).trim();
      const code = [];
      i++;
      while (i < lines.length && !lines[i].startsWith('```')) { code.push(lines[i]); i++; }
      els.push(
        <div key={i} style={{ margin: '10px 0', borderRadius: 10, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.15)' }}>
          {lang && <div style={{ background: '#0e0e0e', padding: '4px 12px', fontSize: 10, color: '#6a6a6a', fontFamily: 'Fira Code, monospace', borderBottom: '1px solid rgba(255,255,255,0.13)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>{lang}</div>}
          <pre style={{ background: '#0a0a0a', padding: '12px 14px', margin: 0, overflowX: 'auto', fontSize: 12, fontFamily: 'Fira Code, monospace', lineHeight: 1.65, color: '#d4d4d4' }}>{code.join('\n')}</pre>
        </div>
      );
      i++; continue;
    }
    els.push(<p key={i} style={{ margin: '4px 0', lineHeight: 1.75, color: '#c9c9c9' }}>{parseInline(l)}</p>);
    i++;
  }
  return <div>{els}</div>;
}

/* ─────────────────────────────────────────
   API KEY MODAL
───────────────────────────────────────── */
function ApiKeyModal({ onSubmit }) {
  const [key, setKey] = useState('');
  const [show, setShow] = useState(false);
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(3,3,3,0.97)', backdropFilter: 'blur(24px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ position: 'absolute', top: '20%', left: '30%', width: 500, height: 500, background: 'radial-gradient(circle, rgba(255,255,255,0.13) 0%, transparent 70%)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: '20%', right: '25%', width: 400, height: 400, background: 'radial-gradient(circle, rgba(255,255,255,0.11) 0%, transparent 70%)', pointerEvents: 'none' }} />
      <div style={{ background: 'linear-gradient(160deg, #0b0b0b 0%, #141414 100%)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 28, padding: '52px 48px', width: '100%', maxWidth: 460, boxShadow: '0 40px 80px rgba(0,0,0,0.7)', position: 'relative', overflow: 'hidden', animation: 'fadeUp 0.4s cubic-bezier(.16,1,.3,1)' }}>
        <div style={{ position: 'absolute', top: 0, left: '15%', right: '15%', height: 1, background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)' }} />

        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ width: 64, height: 64, margin: '0 auto 18px', background: 'linear-gradient(135deg, rgba(255,255,255,0.2), rgba(255,255,255,0.1))', border: '1px solid rgba(255,255,255,0.25)', borderRadius: 18, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <GraduationCap size={28} color="#e5e5e5" />
          </div>
          <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.03em', background: 'linear-gradient(135deg, #fafafa 0%, #e5e5e5 50%, #d4d4d4 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: 8 }}>StudyAI</h1>
          <p style={{ fontSize: 14, color: '#7c7c7c', lineHeight: 1.6 }}>Ton assistant pédagogique intelligent.<br/>Entre ta clé API Groq pour commencer.</p>
        </div>

        <label style={{ display: 'block', fontSize: 10, fontWeight: 500, color: '#6a6a6a', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 7, fontFamily: 'Fira Code, monospace' }}>Clé API Groq</label>
        <div style={{ position: 'relative', marginBottom: 10 }}>
          <input
            type={show ? 'text' : 'password'}
            placeholder="gsk_... colle ta clé ici"
            value={key}
            onChange={e => setKey(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && key.trim() && onSubmit(key.trim())}
            autoFocus
            style={{ width: '100%', padding: '13px 44px 13px 14px', background: '#141414', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 12, color: '#f2f2f2', fontFamily: 'Fira Code, monospace', fontSize: 13, outline: 'none', transition: 'border-color .2s', boxSizing: 'border-box' }}
            onFocus={e => e.target.style.borderColor = 'rgba(255,255,255,0.4)'}
            onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.15)'}
          />
          <button onClick={() => setShow(!show)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#5a5a5a', padding: 4, display: 'flex' }}>
            {show ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
        </div>
        <p style={{ fontSize: 11, color: '#4a4a4a', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 5 }}>
          <ExternalLink size={10} />
          Gratuit sur <a href="https://console.groq.com/keys" target="_blank" rel="noreferrer" style={{ color: '#f5f5f5', textDecoration: 'none' }}>console.groq.com</a>
        </p>
        <button
          onClick={() => key.trim() && onSubmit(key.trim())}
          disabled={!key.trim()}
          style={{ width: '100%', padding: 14, background: key.trim() ? 'linear-gradient(135deg, #ffffff, #b8b8b8)' : 'rgba(255,255,255,0.04)', border: 'none', borderRadius: 12, color: key.trim() ? '#0a0a0a' : '#4a4a4a', fontSize: 14, fontWeight: 600, cursor: key.trim() ? 'pointer' : 'not-allowed', transition: 'all .2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontFamily: 'Bricolage Grotesque, sans-serif', boxShadow: key.trim() ? '0 8px 24px rgba(255,255,255,0.3)' : 'none' }}
        >
          <Sparkles size={15} /> Lancer StudyAI
        </button>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────
   TRACKER PANEL
───────────────────────────────────────── */
function TrackerPanel({ tracker, onUpdate }) {
  const [newSubject, setNewSubject] = useState('');
  const [newGoal, setNewGoal] = useState('');
  const [showAdd, setShowAdd] = useState(false);

  const today = new Date().toDateString();
  const stats = {
    streak: tracker.streak || 0,
    todayMsgs: tracker.sessions?.filter(s => new Date(s.date).toDateString() === today).length || 0,
    totalMsgs: tracker.totalMessages || 0,
    subjects: tracker.subjects || [],
    goals: tracker.goals || [],
  };

  const addSubject = () => {
    if (!newSubject.trim()) return;
    const updated = { ...tracker, subjects: [...(tracker.subjects || []), { name: newSubject, sessions: 0, lastStudied: null, color: `hsl(${Math.random() * 360}, 65%, 65%)` }] };
    onUpdate(updated);
    setNewSubject('');
  };

  const addGoal = () => {
    if (!newGoal.trim()) return;
    const updated = { ...tracker, goals: [...(tracker.goals || []), { id: Date.now(), text: newGoal, done: false, createdAt: new Date().toISOString() }] };
    onUpdate(updated);
    setNewGoal('');
  };

  const toggleGoal = (id) => {
    const updated = { ...tracker, goals: tracker.goals.map(g => g.id === id ? { ...g, done: !g.done } : g) };
    onUpdate(updated);
  };

  const removeGoal = (id) => {
    const updated = { ...tracker, goals: tracker.goals.filter(g => g.id !== id) };
    onUpdate(updated);
  };

  return (
    <div style={{ height: '100%', overflowY: 'auto', padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
        {[
          { icon: Flame, label: 'Série', value: `${stats.streak}j`, color: '#e5e5e5' },
          { icon: MessageSquare, label: "Aujourd'hui", value: stats.todayMsgs, color: '#d4d4d4' },
          { icon: TrendingUp, label: 'Total', value: stats.totalMsgs, color: '#e5e5e5' },
        ].map(({ icon: Icon, label, value, color }) => (
          <div key={label} style={{ background: '#121212', border: '1px solid rgba(255,255,255,0.11)', borderRadius: 12, padding: '12px 10px', textAlign: 'center' }}>
            <Icon size={16} color={color} style={{ margin: '0 auto 6px' }} />
            <div style={{ fontSize: 18, fontWeight: 700, color, letterSpacing: '-0.02em' }}>{value}</div>
            <div style={{ fontSize: 10, color: '#5a5a5a', marginTop: 2, fontFamily: 'Fira Code, monospace' }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Objectifs */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#5a5a5a', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: 'Fira Code, monospace' }}>Objectifs</div>
          <button onClick={() => setShowAdd(!showAdd)} style={{ background: 'none', border: 'none', color: '#f5f5f5', cursor: 'pointer', fontSize: 11, display: 'flex', alignItems: 'center', gap: 3 }}>
            <Plus size={12} /> Ajouter
          </button>
        </div>

        {showAdd && (
          <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
            <input
              value={newGoal}
              onChange={e => setNewGoal(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && (addGoal(), setShowAdd(false))}
              placeholder="Nouvel objectif..."
              autoFocus
              style={{ flex: 1, padding: '7px 10px', background: '#121212', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 8, color: '#f2f2f2', fontSize: 12, outline: 'none', fontFamily: 'Bricolage Grotesque, sans-serif' }}
            />
            <button onClick={() => { addGoal(); setShowAdd(false); }} style={{ padding: '7px 12px', background: '#f5f5f5', border: 'none', borderRadius: 8, color: '#0a0a0a', cursor: 'pointer', fontSize: 12 }}>+</button>
          </div>
        )}

        {stats.goals.length === 0 ? (
          <div style={{ fontSize: 12, color: '#4a4a4a', textAlign: 'center', padding: '12px 0' }}>Aucun objectif défini</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {stats.goals.map(g => (
              <div key={g.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', background: '#121212', border: '1px solid rgba(255,255,255,0.04)', borderRadius: 9, transition: 'all .15s' }}>
                <button onClick={() => toggleGoal(g.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: g.done ? '#e5e5e5' : '#4a4a4a', flexShrink: 0, display: 'flex' }}>
                  {g.done ? <CheckCircle size={15} /> : <Circle size={15} />}
                </button>
                <span style={{ flex: 1, fontSize: 12, color: g.done ? '#5a5a5a' : '#a8a8a8', textDecoration: g.done ? 'line-through' : 'none', lineHeight: 1.4 }}>{g.text}</span>
                <button onClick={() => removeGoal(g.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#383838', padding: 2, display: 'flex', transition: 'color .15s' }}
                  onMouseEnter={e => e.currentTarget.style.color = '#f87171'}
                  onMouseLeave={e => e.currentTarget.style.color = '#383838'}>
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Matières suivies */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#5a5a5a', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: 'Fira Code, monospace' }}>Matières</div>
        </div>

        <div style={{ display: 'flex', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
          {SUBJECTS.map(s => (
            <button key={s} onClick={() => {
              const exists = (tracker.subjects || []).find(x => x.name === s);
              if (!exists) {
                onUpdate({ ...tracker, subjects: [...(tracker.subjects || []), { name: s, sessions: 0, lastStudied: null, color: `hsl(${Math.random() * 360}, 65%, 65%)` }] });
              }
            }} style={{ fontSize: 11, padding: '4px 8px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.13)', background: (tracker.subjects || []).find(x => x.name === s) ? 'rgba(255,255,255,0.15)' : '#121212', color: (tracker.subjects || []).find(x => x.name === s) ? '#e5e5e5' : '#5a5a5a', cursor: 'pointer', transition: 'all .15s' }}>
              {s}
            </button>
          ))}
        </div>

        {(stats.subjects.length === 0) ? (
          <div style={{ fontSize: 12, color: '#4a4a4a', textAlign: 'center', padding: '8px 0' }}>Clique sur une matière pour l'ajouter</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {stats.subjects.map(s => (
              <div key={s.name} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', background: '#121212', border: '1px solid rgba(255,255,255,0.04)', borderRadius: 9 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: s.color, flexShrink: 0 }} />
                <span style={{ flex: 1, fontSize: 12, color: '#a8a8a8' }}>{s.name}</span>
                <span style={{ fontSize: 10, color: '#5a5a5a', fontFamily: 'Fira Code, monospace' }}>{s.sessions} session{s.sessions !== 1 ? 's' : ''}</span>
                <button onClick={() => onUpdate({ ...tracker, subjects: tracker.subjects.filter(x => x.name !== s.name) })} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#383838', display: 'flex', transition: 'color .15s' }}
                  onMouseEnter={e => e.currentTarget.style.color = '#f87171'}
                  onMouseLeave={e => e.currentTarget.style.color = '#383838'}>
                  <X size={11} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Progression globale */}
      <div style={{ background: '#121212', border: '1px solid rgba(255,255,255,0.11)', borderRadius: 12, padding: '14px 14px' }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: '#5a5a5a', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: 'Fira Code, monospace', marginBottom: 10 }}>Objectifs complétés</div>
        {stats.goals.length === 0 ? (
          <div style={{ fontSize: 12, color: '#4a4a4a' }}>Aucun objectif</div>
        ) : (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#7c7c7c', marginBottom: 6 }}>
              <span>{stats.goals.filter(g => g.done).length}/{stats.goals.length} complétés</span>
              <span style={{ color: '#e5e5e5' }}>{Math.round(stats.goals.filter(g => g.done).length / stats.goals.length * 100)}%</span>
            </div>
            <div style={{ background: '#0a0a0a', borderRadius: 4, height: 6, overflow: 'hidden' }}>
              <div style={{ width: `${stats.goals.filter(g => g.done).length / stats.goals.length * 100}%`, height: '100%', background: 'linear-gradient(90deg, #f5f5f5, #d4d4d4)', borderRadius: 4, transition: 'width .5s ease' }} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────
   MAIN APP
───────────────────────────────────────── */
export default function App() {
  const [apiKey, setApiKey] = useState(() => LS.get('sa_key', ''));
  const [showModal, setShowModal] = useState(!LS.get('sa_key', ''));
  const [conversations, setConversations] = useState(() => LS.get('sa_convs', []));
  const [activeId, setActiveId] = useState(() => { const c = LS.get('sa_convs', []); return c.length ? c[0].id : null; });
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('chat'); // 'chat' | 'tracker'
  const [tracker, setTracker] = useState(() => LS.get('sa_tracker', { streak: 0, totalMessages: 0, subjects: [], goals: [], sessions: [], lastDate: null }));
  const messagesRef = useRef(null);
  const textareaRef = useRef(null);

  const activeConv = conversations.find(c => c.id === activeId);
  const messages = activeConv ? activeConv.messages : [];

  // Scroll to bottom
  useEffect(() => {
    if (messagesRef.current) messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
  }, [messages, loading]);

  // Save conversations
  const saveConvs = useCallback((convs) => {
    setConversations(convs);
    LS.set('sa_convs', convs);
  }, []);

  // Save tracker
  const saveTracker = useCallback((t) => {
    setTracker(t);
    LS.set('sa_tracker', t);
  }, []);

  // Update streak
  const updateStreak = useCallback(() => {
    const today = new Date().toDateString();
    const last = tracker.lastDate;
    const yesterday = new Date(Date.now() - 86400000).toDateString();
    let streak = tracker.streak || 0;
    if (last !== today) {
      streak = last === yesterday ? streak + 1 : 1;
    }
    return streak;
  }, [tracker]);

  const newConversation = useCallback(() => {
    const id = Date.now().toString();
    const conv = { id, title: 'Nouvelle conversation', messages: [], createdAt: new Date().toISOString() };
    const updated = [conv, ...conversations];
    saveConvs(updated);
    setActiveId(id);
    setError('');
  }, [conversations, saveConvs]);

  const deleteConversation = useCallback((id, e) => {
    e.stopPropagation();
    const updated = conversations.filter(c => c.id !== id);
    saveConvs(updated);
    if (activeId === id) setActiveId(updated.length ? updated[0].id : null);
  }, [conversations, activeId, saveConvs]);

  const send = async (text) => {
    const msg = (text || input).trim();
    if (!msg || loading) return;
    setInput('');
    setError('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';

    let convId = activeId;
    let currentConvs = conversations;

    if (!convId) {
      const id = Date.now().toString();
      const conv = { id, title: msg.slice(0, 45) + (msg.length > 45 ? '…' : ''), messages: [], createdAt: new Date().toISOString() };
      currentConvs = [conv, ...conversations];
      saveConvs(currentConvs);
      setActiveId(id);
      convId = id;
    }

    const conv = currentConvs.find(c => c.id === convId);
    const newMessages = [...(conv?.messages || []), { role: 'user', content: msg }];
    const isFirst = conv?.messages.length === 0;

    const updatedConvs = currentConvs.map(c => c.id === convId
      ? { ...c, messages: newMessages, title: isFirst ? (msg.slice(0, 45) + (msg.length > 45 ? '…' : '')) : c.title }
      : c
    );
    saveConvs(updatedConvs);
    setLoading(true);

    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: API_MODEL,
          messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...newMessages],
          temperature: 0.7,
          max_tokens: 2048,
        }),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error?.message || `Erreur ${res.status}`); }
      const data = await res.json();
      const reply = data.choices[0].message.content;
      const withReply = [...newMessages, { role: 'assistant', content: reply }];
      const final = updatedConvs.map(c => c.id === convId ? { ...c, messages: withReply } : c);
      saveConvs(final);

      // Update tracker
      const today = new Date().toDateString();
      const newStreak = updateStreak();
      const newTracker = {
        ...tracker,
        streak: newStreak,
        totalMessages: (tracker.totalMessages || 0) + 1,
        lastDate: today,
        sessions: [...(tracker.sessions || []), { date: new Date().toISOString() }].slice(-200),
      };
      saveTracker(newTracker);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const timeAgo = (iso) => {
    const d = Math.floor((Date.now() - new Date(iso)) / 1000);
    if (d < 60) return 'maintenant';
    if (d < 3600) return `${Math.floor(d / 60)}min`;
    if (d < 86400) return `${Math.floor(d / 3600)}h`;
    return `${Math.floor(d / 86400)}j`;
  };

  return (
    <div style={{ height: '100vh', display: 'flex', background: '#080808', fontFamily: 'Bricolage Grotesque, sans-serif', overflow: 'hidden' }}>

      {/* CSS */}
      <style>{`
        @keyframes fadeUp { from { opacity:0; transform:translateY(14px) scale(.99); } to { opacity:1; transform:translateY(0) scale(1); } }
        @keyframes fadeIn { from { opacity:0; } to { opacity:1; } }
        @keyframes bounce { 0%,60%,100% { transform:translateY(0); opacity:.3; } 30% { transform:translateY(-7px); opacity:1; } }
        @keyframes shimmer { 0% { background-position:-300% 0; } 100% { background-position:300% 0; } }
        * { box-sizing:border-box; margin:0; padding:0; }
        ::-webkit-scrollbar { width:3px; }
        ::-webkit-scrollbar-thumb { background:#2a2a2a; border-radius:3px; }
        textarea { font-family:'Bricolage Grotesque', sans-serif !important; }
        textarea::placeholder { color:#3d3d3d; }
        body::after { content:''; position:fixed; inset:0; pointer-events:none; z-index:9999;
          background-image:url("data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
          opacity:.018; }
      `}</style>

      {showModal && <ApiKeyModal onSubmit={key => { LS.set('sa_key', key); setApiKey(key); setShowModal(false); }} />}

      {/* ── SIDEBAR ── */}
      <aside style={{ width: 255, flexShrink: 0, background: '#0b0b0b', borderRight: '1px solid rgba(255,255,255,0.1)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Logo + tabs */}
        <div style={{ padding: '18px 14px 12px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <div style={{ width: 32, height: 32, borderRadius: 9, background: 'linear-gradient(135deg, #ffffff, #b8b8b8)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 14px rgba(255,255,255,0.35)', flexShrink: 0 }}>
              <GraduationCap size={16} color="#0a0a0a" />
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 800, color: '#f2f2f2', letterSpacing: '-0.02em' }}>StudyAI</div>
              <div style={{ fontSize: 10, color: '#4a4a4a', fontFamily: 'Fira Code, monospace' }}>assistant · v2</div>
            </div>
            <button onClick={newConversation} style={{ marginLeft: 'auto', width: 26, height: 26, borderRadius: 7, border: 'none', background: 'rgba(255,255,255,0.12)', color: '#e5e5e5', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all .15s', flexShrink: 0 }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.22)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.12)'}>
              <Plus size={13} />
            </button>
          </div>

          {/* Tab switcher */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
            {[{ id: 'chat', icon: MessageSquare, label: 'Chat' }, { id: 'tracker', icon: BarChart2, label: 'Suivi' }].map(t => (
              <button key={t.id} onClick={() => setTab(t.id)} style={{ padding: '7px 0', borderRadius: 8, border: 'none', background: tab === t.id ? 'rgba(255,255,255,0.15)' : 'transparent', color: tab === t.id ? '#e5e5e5' : '#5a5a5a', fontSize: 12, fontWeight: tab === t.id ? 600 : 400, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, transition: 'all .15s', fontFamily: 'Bricolage Grotesque, sans-serif', border: tab === t.id ? '1px solid rgba(255,255,255,0.2)' : '1px solid transparent' }}>
                <t.icon size={13} /> {t.label}
              </button>
            ))}
          </div>
        </div>

        {tab === 'chat' ? (
          <>
            {/* Suggestions */}
            <div style={{ padding: '10px 10px 6px' }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: '#3d3d3d', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 5, paddingLeft: 4, fontFamily: 'Fira Code, monospace' }}>Suggestions</div>
              {SUGGESTIONS.map((s, i) => (
                <button key={i} onClick={() => send(s.label)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 8px', borderRadius: 8, border: 'none', background: 'transparent', color: '#6a6a6a', fontSize: 12, cursor: 'pointer', width: '100%', textAlign: 'left', transition: 'all .15s', fontFamily: 'Bricolage Grotesque, sans-serif' }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.color = '#a8a8a8'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#6a6a6a'; }}>
                  <s.icon size={12} color={s.color} style={{ flexShrink: 0 }} /> {s.label}
                </button>
              ))}
            </div>

            {/* Conversations */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '6px 8px' }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: '#3d3d3d', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 5, paddingLeft: 4, fontFamily: 'Fira Code, monospace' }}>
                Conversations {conversations.length > 0 && `(${conversations.length})`}
              </div>
              {conversations.length === 0 ? (
                <div style={{ fontSize: 12, color: '#383838', textAlign: 'center', padding: '16px 8px' }}>Aucune conversation</div>
              ) : conversations.map(c => (
                <div key={c.id} onClick={() => { setActiveId(c.id); setError(''); }} style={{ display: 'flex', alignItems: 'flex-start', gap: 6, padding: '8px 8px', borderRadius: 9, background: c.id === activeId ? 'rgba(255,255,255,0.1)' : 'transparent', border: `1px solid ${c.id === activeId ? 'rgba(255,255,255,0.18)' : 'transparent'}`, cursor: 'pointer', marginBottom: 2, transition: 'all .15s' }}
                  onMouseEnter={e => { if (c.id !== activeId) { e.currentTarget.style.background = 'rgba(255,255,255,0.02)'; } }}
                  onMouseLeave={e => { if (c.id !== activeId) { e.currentTarget.style.background = 'transparent'; } }}>
                  <div style={{ flex: 1, overflow: 'hidden' }}>
                    <div style={{ fontSize: 12, color: c.id === activeId ? '#e8e8e8' : '#7c7c7c', fontWeight: c.id === activeId ? 600 : 400, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: 2 }}>{c.title}</div>
                    <div style={{ fontSize: 10, color: '#3d3d3d', fontFamily: 'Fira Code, monospace', display: 'flex', alignItems: 'center', gap: 3 }}>
                      <Clock size={8} /> {timeAgo(c.createdAt)} · {Math.floor(c.messages.length / 2)} msg
                    </div>
                  </div>
                  <button onClick={e => deleteConversation(c.id, e)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#2e2e2e', padding: 2, transition: 'color .15s', flexShrink: 0, marginTop: 1 }}
                    onMouseEnter={e => e.currentTarget.style.color = '#f87171'}
                    onMouseLeave={e => e.currentTarget.style.color = '#2e2e2e'}>
                    <Trash2 size={11} />
                  </button>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <TrackerPanel tracker={tracker} onUpdate={saveTracker} />
          </div>
        )}

        {/* Bottom */}
        <div style={{ padding: '8px 10px 14px', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
          <button onClick={() => { LS.set('sa_key', ''); setApiKey(''); setShowModal(true); }} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '7px 8px', borderRadius: 8, border: 'none', background: 'transparent', color: '#3d3d3d', fontSize: 11, cursor: 'pointer', width: '100%', transition: 'all .15s', fontFamily: 'Bricolage Grotesque, sans-serif' }}
            onMouseEnter={e => { e.currentTarget.style.color = '#e5e5e5'; e.currentTarget.style.background = 'rgba(255,255,255,0.13)'; }}
            onMouseLeave={e => { e.currentTarget.style.color = '#3d3d3d'; e.currentTarget.style.background = 'transparent'; }}>
            <Key size={11} /> Changer la clé API
          </button>
        </div>
      </aside>

      {/* ── MAIN CHAT ── */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}>

        {/* Ambient */}
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: -100, right: -100, width: 500, height: 500, background: 'radial-gradient(circle, rgba(255,255,255,0.03) 0%, transparent 65%)' }} />
          <div style={{ position: 'absolute', bottom: -100, left: '10%', width: 400, height: 400, background: 'radial-gradient(circle, rgba(255,255,255,0.025) 0%, transparent 65%)' }} />
        </div>

        {/* Messages */}
        <div ref={messagesRef} style={{ flex: 1, overflowY: 'auto', padding: '28px 36px', display: 'flex', flexDirection: 'column', gap: 18, position: 'relative', zIndex: 1 }}>

          {messages.length === 0 && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 24, padding: '40px 0', animation: 'fadeIn .5s ease' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ width: 60, height: 60, margin: '0 auto 16px', background: 'linear-gradient(135deg, rgba(255,255,255,0.15), rgba(255,255,255,0.1))', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Sparkles size={26} color="#e5e5e5" />
                </div>
                <h2 style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.03em', background: 'linear-gradient(135deg, #f2f2f2, #e5e5e5 50%, #d4d4d4)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: 8 }}>
                  Prêt à étudier ?
                </h2>
                <p style={{ fontSize: 14, color: '#5a5a5a', maxWidth: 360, lineHeight: 1.6 }}>
                  Pose une question, colle ton cours, demande un résumé ou un exercice.
                </p>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, width: '100%', maxWidth: 520 }}>
                {SUGGESTIONS.map((s, i) => (
                  <button key={i} onClick={() => send(s.label)} style={{ padding: '13px 15px', borderRadius: 13, background: '#121212', border: '1px solid rgba(255,255,255,0.11)', color: '#7c7c7c', fontSize: 13, cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 8, transition: 'all .2s', fontFamily: 'Bricolage Grotesque, sans-serif' }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'; e.currentTarget.style.color = '#c9c9c9'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.11)'; e.currentTarget.style.color = '#7c7c7c'; e.currentTarget.style.transform = 'translateY(0)'; }}>
                    <s.icon size={14} color={s.color} style={{ flexShrink: 0 }} /> {s.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m, i) => {
            const isUser = m.role === 'user';
            return (
              <div key={i} style={{ display: 'flex', justifyContent: isUser ? 'flex-end' : 'flex-start', animation: i === messages.length - 1 ? 'fadeIn .3s ease' : 'none' }}>
                <div style={{ display: 'flex', gap: 10, flexDirection: isUser ? 'row-reverse' : 'row', alignItems: 'flex-start', maxWidth: isUser ? '58%' : '76%' }}>
                  <div style={{ width: 30, height: 30, borderRadius: 9, flexShrink: 0, marginTop: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', background: isUser ? 'linear-gradient(135deg, #ffffff, #b8b8b8)' : 'linear-gradient(135deg, #111111, #181818)', border: isUser ? 'none' : '1px solid rgba(255,255,255,0.13)', boxShadow: isUser ? '0 4px 14px rgba(255,255,255,0.3)' : 'none' }}>
                    {isUser ? <span style={{ fontSize: 13, fontWeight: 700, color: '#0a0a0a' }}>T</span> : <GraduationCap size={13} color="#e5e5e5" />}
                  </div>
                  <div style={{ padding: '11px 15px', borderRadius: isUser ? '17px 4px 17px 17px' : '4px 17px 17px 17px', background: isUser ? 'linear-gradient(140deg, rgba(255,255,255,0.18), rgba(255,255,255,0.15))' : '#121212', border: isUser ? '1px solid rgba(255,255,255,0.22)' : '1px solid rgba(255,255,255,0.1)', fontSize: 14, color: '#f2f2f2', lineHeight: 1.65 }}>
                    {isUser ? <p style={{ margin: 0 }}>{m.content}</p> : <Markdown text={m.content} />}
                  </div>
                </div>
              </div>
            );
          })}

          {loading && (
            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <div style={{ width: 30, height: 30, borderRadius: 9, background: 'linear-gradient(135deg, #111111, #181818)', border: '1px solid rgba(255,255,255,0.13)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <GraduationCap size={13} color="#e5e5e5" />
              </div>
              <div style={{ padding: '14px 18px', borderRadius: '4px 17px 17px 17px', background: 'linear-gradient(90deg, #121212 25%, #161616 50%, #121212 75%)', backgroundSize: '300% 100%', animation: 'shimmer 1.8s ease-in-out infinite', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', gap: 5 }}>
                {[0, 1, 2].map(i => <span key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: '#f5f5f5', display: 'inline-block', animation: `bounce .9s infinite ${i * 0.18}s` }} />)}
              </div>
            </div>
          )}

          {error && (
            <div style={{ alignSelf: 'center', padding: '9px 16px', borderRadius: 10, background: 'rgba(248,113,113,0.07)', border: '1px solid rgba(248,113,113,0.18)', color: '#f87171', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
              <AlertCircle size={14} /> {error}
            </div>
          )}
        </div>

        {/* Input */}
        <div style={{ padding: '14px 36px 22px', background: 'linear-gradient(to top, #080808 65%, transparent)', position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, background: '#121212', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 18, padding: '11px 13px', transition: 'border-color .2s, box-shadow .2s' }}
            onFocusCapture={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(255,255,255,0.13)'; }}
            onBlurCapture={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'; e.currentTarget.style.boxShadow = 'none'; }}>
            <textarea
              ref={textareaRef}
              value={input}
              onChange={e => { setInput(e.target.value); e.target.style.height = 'auto'; e.target.style.height = Math.min(e.target.scrollHeight, 130) + 'px'; }}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
              placeholder="Pose ta question, colle ton cours…"
              rows={1}
              style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: '#f2f2f2', fontSize: 14, resize: 'none', maxHeight: 130, lineHeight: 1.5, padding: '2px 0' }}
            />
            <button
              onClick={() => send()}
              disabled={!input.trim() || loading}
              style={{ width: 36, height: 36, borderRadius: 10, border: 'none', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: input.trim() ? 'pointer' : 'not-allowed', background: input.trim() ? 'linear-gradient(135deg, #ffffff, #b8b8b8)' : 'rgba(255,255,255,0.04)', color: input.trim() ? '#0a0a0a' : '#3d3d3d', transition: 'all .2s', boxShadow: input.trim() ? '0 4px 14px rgba(255,255,255,0.3)' : 'none' }}
              onMouseEnter={e => { if (input.trim()) e.currentTarget.style.transform = 'scale(1.08)'; }}
              onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}>
              <Send size={14} />
            </button>
          </div>
          <p style={{ textAlign: 'center', fontSize: 11, color: '#2e2e2e', marginTop: 7, fontFamily: 'Fira Code, monospace' }}>↵ envoyer · ⇧↵ nouvelle ligne</p>
        </div>
      </main>
    </div>
  );
}