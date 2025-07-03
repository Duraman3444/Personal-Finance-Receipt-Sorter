# BrainLift – Development & Knowledge Lift Document

> **Purpose:** This living document captures how *Receipt Sorter* was conceived, engineered, and continuously improved with AI-driven workflows. It also lists the knowledge sources (“brain lifts”) that informed each stage, so new contributors can ramp-up rapidly.

---

## 1. Product Snapshot

|  |  |
|---|---|
| **App Name** | Receipt Sorter |
| **Tagline** | *AI-Powered Personal Finance Dashboard* |
| **Platforms** | Windows / macOS / Linux (Electron) |
| **Core Stack** | Electron • TypeScript • Firebase • n8n • OpenAI GPT-4 |
| **Latest Release** | v1.5.0 – 2025-07-01 |

Main modules:
1. **Electron UI** – Dashboard, Categories, Analytics, AI Hub (Chart.js 4.4).  
2. **Embedded n8n** – OCR → GPT-4 → Firestore workflow spun up on demand.  
3. **Webhook Server** – Bridges n8n and Firebase for real-time updates.  
4. **Scripts** – CLI utilities for seeding data, batch exports, and smoke tests.

---

## 2. High-Level Development Timeline

| Phase | Highlights | Key PRs / Commits |
|-------|-----------|-------------------|
| **Ideation** | Defined MVP: drag-and-drop receipts, AI extraction, simple list UI | [`PR-000`](https://github.com/yourrepo/pr-000) |
| **Foundations** | Electron scaffold, Firebase config, Inbox watcher | [`PR-014`](https://github.com/yourrepo/pr-014) |
| **Automation** | Embedded n8n workflow, OCR + GPT-4 integration | [`PR-029`](https://github.com/yourrepo/pr-029) |
| **Analytics** | Chart.js dashboards, statistical endpoints | [`PR-042`](https://github.com/yourrepo/pr-042) |
| **AI Hub** | Insights, Budget Suggestions, Savings Advice | [`PR-055`](https://github.com/yourrepo/pr-055) |
| **UX Polish** | Theming, tray mode, auto-update, offline cache | [`PR-068`](https://github.com/yourrepo/pr-068) |

---

## 3. Step-by-Step Build Process

> **Tip:** Each bullet references the doc/resource that unlocked that step (📘).

1. **Electron Boilerplate** – Used *Electron Forge* quick-start and adapted to TypeScript.  
   📘 [Electron Docs – Quick Start](https://www.electronjs.org/docs/latest/tutorial/quick-start)
2. **Live-reload Dev Flow** – Integrated *Vite* for faster reloads.  
   📘 Blog: *Using Vite with Electron* (zvite.dev/electron)
3. **Inbox Automation** – `chokidar` watches `inbox/`, moves files into workflow input.  
   📘 `scripts/setup-n8n-workflow.ts`
4. **OCR Pipeline** – Leveraged Tesseract + Poppler for images/PDFs.  
   📘 `docs/OCR_SETUP.md`
5. **n8n Workflow** – Custom nodes for OCR, GPT-4 prompt, webhook.  
   📘 `workflows/receipt-processing-complete.json`
6. **AI Extraction** – Prompt engineered for JSON output, validated with `test-parse.ts`.  
   📘 OpenAI Function-Calling guide
7. **Realtime Firestore Sync** – Utilised indexed queries for Categories + Receipts.  
   📘 `docs/TECHNICAL_ARCHITECTURE.md`
8. **Analytics Dashboards** – Chart.js 4.4 UMD via CDN + custom hooks for dark/light theme.  
   📘 `renderer/index.html` lines 1860-1870
9. **AI Hub** – Consolidated GPT-4 endpoints for insights/advice/budgets, throttled via `src/services/firebase-service.ts`.  
   📘 `docs/SYNC_FEATURE.md`
10. **Packaging & Updates** – Auto-update with Electron-builder & GitHub Releases.  
    📘 *Electron-builder docs* + internal `scripts/sign-windows.ps1`

---

## 4. AI Workflow Deep-Dive

### 4.1 Receipt Parsing Prompt (GPT-4)
```jsonc
{
  "role": "system",
  "content": "You are a meticulous finance assistant… (see full prompt in src/prompts/receipt.gpt)"
}
```
*Returns:* vendor, date, total, category guess, sub-items.

### 4.2 Budget Suggestion Prompt
Located at `src/prompts/budget.gpt` – uses last 90-day spend, user-defined savings goal.

### 4.3 Smart Insights Prompt
`src/prompts/insights.gpt` – summarises anomalies/trends; feeds UI under *Analytics › Smart Insights*.

---

## 5. BrainLift Sources (Learning & Inspiration)

| Area | Doc / Link |
|------|------------|
| Project Vision | `PRD.md`, `docs/PROJECT_OVERVIEW.md` |
| Architecture | `docs/TECHNICAL_ARCHITECTURE.md`, Firebase & n8n docs |
| AI Techniques | OpenAI Cookbook, Anthropic Prompt Engineering Guide |
| OCR | Tesseract Wiki, `AUTOMATED_REPORTS_SETUP.md` |
| Charts | Chart.js 4 migration guide |
| Desktop UX | Microsoft Fluent UI, Mac Human Interface Guidelines |

> **Bookmark:** Share this link internally for instant onboarding:  
> `https://github.com/yourrepo/ReceiptSorter/blob/main/BrainLift.md`

---

## 6. Future Lift Ideas

1. **Multi-currency Support** – auto-convert & summarise spending by currency.
2. **Bank Sync** – import statements to complement receipts.
3. **LLM Fine-Tuning** – train on anonymised receipts for higher accuracy.
4. **Mobile Companion** – capture receipts on-the-go & sync via Firebase.

---

## 7. Changelog

| Date | Update |
|------|--------|
| 2025-07-03 | Initial BrainLift document created 🌟 |

---

### Licence

MIT – © 2025 FlowGenius 