# Blast — AI-Powered Error Diagnosis for VS Code

Paste an error, get the fix. Built-in knowledge base hits 76+ rules across 5 languages — instant, offline, zero config. No match? AI deep analysis kicks in automatically.

![VS Code](https://img.shields.io/badge/VS%20Code-^1.80.0-blue)
![Version](https://img.shields.io/badge/version-0.5.0-purple)
![License](https://img.shields.io/badge/license-MIT-green)

---

## Features

- **Instant KB Match** — 76+ error patterns for Python, JavaScript/TypeScript, Go, Rust, Java, Docker. Matches in milliseconds, no internet needed.
- **AI Deep Analysis** — When the KB doesn't have an answer, Blast calls an AI (OpenAI-compatible API) to diagnose the error and suggest fixes.
- **Dual Display** — KB match + AI analysis shown side-by-side. Best of both worlds.
- **Code Fix Snippets** — Many rules include ready-to-paste `code_fix`.
- **One-Click Copy** — Copy the full analysis with a single button.
- **Custom Knowledge Base** — Save AI results to your own KB. Import/export as JSON.
- **Multi-Language UI** — English, 中文, 日本語, 한국어, Deutsch, Français, Español, Português.
- **Run & Fix** — Run the current file and auto-analyze the output (`Ctrl+Alt+R`).
- **Context Menu** — Right-click any error text → "Blast: Analyze Selected Error".

---

## Quick Start

### Install

Download the latest `.vsix` from [Releases](https://github.com/zyz-124/blast/releases), then:

```bash
code --install-extension blast-0.5.0.vsix
```

Reload VS Code (`Ctrl+Shift+P` → `Developer: Reload Window`).

### Use

1. Click the ⚡ Blast icon in the Activity Bar
2. Paste an error message into the Analyze tab
3. Click **Analyze** — or press `Ctrl+Alt+R` to run the current file and auto-analyze

---

## How It Works

```
Your Error
    │
    ▼
┌─────────────┐    hit    ┌──────────────┐
│  KB Engine   │─────────▶│  Instant Fix  │
│  76+ rules   │          │  + Code Snippet│
└─────────────┘          └──────────────┘
    │ miss
    ▼
┌─────────────┐
│  AI Engine   │──▶ Deep analysis + solution steps
│  (OpenAI API)│──▶ Option: 💾 Save to My KB
└─────────────┘
```

- **KB hit** → response under 50ms, fully offline
- **KB miss** → AI takes over, result displayed alongside "no exact match" notice

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+Alt+R` | Run current file and analyze output |
| `Ctrl+Alt+B` | Analyze selected error text |

---

## Configuration

All settings accessible via **Blast** sidebar → **Settings** tab, or `settings.json`:

### Display

| Key | Default | Description |
|-----|---------|-------------|
| `blast.locale` | `"en"` | UI language (`en`, `zh`, `ja`, `ko`, `de`, `fr`, `es`, `pt`) |
| `blast.showConfidence` | `true` | Show match confidence % |

### Runner Commands

| Key | Default | Description |
|-----|---------|-------------|
| `blast.runner.python` | `python` | Python runner |
| `blast.runner.javascript` | `node` | JavaScript runner |
| `blast.runner.typescript` | `npx ts-node` | TypeScript runner |
| `blast.runner.go` | `go run` | Go runner |
| `blast.runner.ruby` | `ruby` | Ruby runner |

### AI Provider

| Key | Default | Description |
|-----|---------|-------------|
| `blast.ai.provider` | `"openai"` | Provider preset (`openai`, `deepseek`, `custom`) |
| `blast.ai.endpoint` | `"https://api.openai.com/v1"` | API endpoint (any OpenAI-compatible) |
| `blast.ai.model` | `"gpt-4o-mini"` | Model name |
| `blast.ai.maxTokens` | `2000` | Max response tokens |
| `blast.ai.temperature` | `0.3` | Creativity (0–2) |

API Key is stored in VS Code's **SecretStorage** — never in plaintext config.

---

## AI Setup

Blast works with any OpenAI-compatible API. Here are tested providers:

| Provider | Endpoint | China Access |
|----------|----------|:---:|
| OpenAI | `https://api.openai.com/v1` | ❌ |
| DeepSeek | `https://api.deepseek.com/v1` | ✅ |
| OpenRouter | `https://openrouter.ai/api/v1` | ❌ |
| Custom | Your endpoint | Depends |

1. Open the **Analyze** tab
2. Fill in **Endpoint URL**, **Model Name**, and **API Key**
3. Click **Save** then **Test** — green "✅ Connected" means you're good

> **Tip:** If you're in China, use DeepSeek (`api.deepseek.com`) — domestic access, new users get free credits.

---

## Custom Knowledge Base

Blast saves custom entries to `.vscode/blast-custom.json` in your workspace.

- **Save to My KB** — AI results can be saved for future instant matching
- **Import / Export** — Share KB packs as JSON files
- **Full-Text Search** — Index tab lets you search all built-in + custom rules

---

## Development

```bash
git clone https://github.com/zyz-124/blast.git
cd blast
npm install
npm run compile
# To package:
npm run package
```

- Zero runtime dependencies (pure TypeScript + VS Code API)
- 30/30 unit tests for the matching engine
- AI client uses standard `fetch()` — no extra SDKs

---

## License

MIT © 2024

---

*⚡ Stop Googling errors. Blast them.*
