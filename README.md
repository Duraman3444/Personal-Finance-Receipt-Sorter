# Receipt Sorter – AI-Powered Personal Finance Dashboard

<p align="center">
  <img src="https://user-images.githubusercontent.com/placeholder/logo.png" alt="Receipt Sorter" height="120">
</p>

> Automate receipt capture, track spending, and let AI craft budgets & insights – all from a beautiful desktop app.

---

## ✨ 2025 Highlights

• **AI Hub** – One-click *Insights*, *Budget Suggestions*, and *Savings Advice* powered by GPT-4.<br/>
• **Smart Budgets** – ML + transaction history → personalised monthly budgets with live status bars.<br/>
• **Real-time Analytics** – Gorgeous Chart.js dashboards (spending trends, category breakdowns, top vendors …).<br/>
• **Inbox Automation** – Drop receipts (images/PDF/TXT) into `inbox/` and watch them appear seconds later.<br/>
• **Embedded n8n** – Zero-config workflow engine (OCR ➡️ GPT-4 ➡️ Firestore). Starts automatically.<br/>
• **Offline-first Sync** – Firebase cache keeps data available even with flaky internet.<br/>
• **Cross-platform** – Electron app for Windows, macOS & Linux with auto-update and tray-mode.

---

## 🚀 Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Provide credentials (.env)
cp .env.example .env && code .env  # add OPENAI_KEY + Firebase keys

# 3. Launch everything
npm run dev        # starts Electron + embedded n8n + webhook
```

At first launch the app will:
1. Spin-up n8n on `localhost:5678` if not already running
2. Verify OCR tools (Tesseract & Poppler) are available – prompts with links if missing
3. Create the default `inbox/` & `firebase/` caches

Drop a sample file from `Inbox Backup/` into `inbox/` and watch the magic ✨

---

## 📂 Project Tour

| Page | What you get |
|------|--------------|
| **Dashboard** | Quick links, system status (Firebase / n8n / OpenAI) |
| **Receipts** | Live list with search / filters, export (CSV / JSON / Analytics report) |
| **Categories** | Custom icons & colours, budgets, sub-categories, progress bars |
| **Analytics** | 5 interactive charts + *Smart Insights* (GPT-4) |
| **AI Hub** | Generate Insights · Suggest Budgets · Savings Advice |
| **Settings** | Auto-start, theme, developer tools |

---

## 🧠 AI Features

| Feature | Prompt |
|---------|--------|
| **Insights** | "Give me 3 observations about my spending in the last month." |
| **Budget** | "Suggest monthly budgets optimised for 20% savings." |
| **Advice** | "List 5 actionable tips to cut recurring costs." |

All prompts are open-sourced in `src/prompts/` so you can tweak them to your liking.

---

## 🏗️ Architecture

```text
┌──────────┐  file drop  ┌────────┐   OCR+AI   ┌─────────┐
│  inbox/  ├────────────▶│  n8n   ├────────────▶ webhook │
└──────────┘             └────────┘             └─────────┘
       ▲                                          │
       │ real-time                                ▼
┌───────────────────────────────────────────────────────────┐
│                   Firebase (Firestore)                   │
└───────────────────────────────────────────────────────────┘
                       ▲        ▲
                       │        │
             Electron UI   Scripts & API
```

---

## 🔧 Scripts

| Script | Purpose |
|--------|---------|
| `npm run dev` | Start Electron app (auto spawns n8n + webhook) |
| `npm run n8n` | Standalone n8n instance |
| `npm run webhook` | Standalone webhook listener (port 3001) |
| `npm run full-stack` | All of the above in parallel |
| `npm run test:integration` | End-to-end health check |

---

## 🛠️ Requirements

• Node 18+ • Git • Tesseract-OCR • Poppler (for PDFs) • OpenAI API key • Firebase project

Windows users can grab OCR tools via [Chocolatey](https://chocolatey.org/):
```powershell
choco install tesseract
choco install poppler
```

---

## 📚 Further Reading

- [Setup Guide](SETUP.md)
- [Workflow Docs](workflows/README.md)
- [API Spec](docs/API_DOCUMENTATION.md)
- [Technical Architecture](docs/TECHNICAL_ARCHITECTURE.md)

---

## 🤝 Contributing

Pull Requests are welcome! Please run `npm run test:integration` before opening a PR.

---

## © 2025 FlowGenius

Made with 💜 by the FlowGenius team. Licensed under MIT. 