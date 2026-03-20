# StudyAI — Assistant étudiant IA

Chatbot IA complet avec suivi étudiant, conversations persistantes, propulsé par Mistral AI.

## Démarrage rapide

```bash
npm install
npm start
```

Ouvre http://localhost:3000 → entre ta clé API Mistral → c'est parti.

## Fonctionnalités

- **Chat IA** avec Mistral (réponses structurées Markdown)
- **Conversations persistantes** — sauvegardées dans localStorage, titre auto-généré
- **Tracker de suivi** :
  - Série de jours consécutifs (streak)
  - Messages du jour / total
  - Objectifs à cocher
  - Matières suivies
  - Barre de progression
- **CSS from scratch** — Bricolage Grotesque + Fira Code, palette deep-space violet/bleu
- Grain texture subtile, effets ambient, animations fluides

## Structure

```
src/
└── App.jsx   ← tout en un seul fichier, simple à modifier
```

## Clé API

Gratuite sur https://console.mistral.ai
Stockée en localStorage — jamais envoyée ailleurs que l'API Mistral.
