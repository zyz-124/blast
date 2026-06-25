# Blast — AI-Powered Error Diagnosis for VS Code

Paste an error, get the fix. Built-in knowledge base hits 99+ rules across 5 languages — instant, offline, zero config. No match? AI deep analysis kicks in automatically. **v0.7.0** ships a fully redesigned UI with immersive visual feedback, glassmorphism, and gradient themes.

![VS Code](https://img.shields.io/badge/VS%20Code-^1.80.0-blue)
![Version](https://img.shields.io/badge/version-0.7.0-purple)
![License](https://img.shields.io/badge/license-MIT-green)

---

## Why Blast?

Most error helpers either give you a wall of text or require you to copy-paste to a chatbot. Blast does both — **and shows them side by side**:

- **Built-in KB** (76 → 99 rules): offline, instant, with `code_fix` snippets you can copy.
- **AI fallback** (7 providers): OpenAI, DeepSeek, 智谱 GLM, 阿里百炼 Qwen, 硅基流动, OpenRouter, or any custom OpenAI-compatible endpoint.
- **Side-by-side display** — KB match + AI deep analysis in the same result page.
- **Save AI results to My KB** — turn one-off AI answers into permanent offline rules.

---

## Features

### ⚡ Core
- **99+ KB rules** — Python, JavaScript/TypeScript, Go, Rust, Java, Docker, plus Common (git, npm, env). Bilingual EN/中文.
- **AI deep analysis** — 7 providers, OpenAI-compatible API, multi-language responses.
- **Dual display** — KB match + AI analysis side-by-side when KB hits; AI-only when it misses.
- **Code Fix snippets** — ready-to-paste fixes for many rules.
- **One-click copy** — copy the full analysis result.

### 🎨 v0.7.0 Visual Overhaul
- **Three color presets** — `bp` (purple), `bp3` (cyan), `bpGlow` (magenta-to-cyan gradient)
- **Glassmorphism** — translucent panels with `backdrop-filter` blur
- **Gradient backgrounds** — radial color washes in the sidebar
- **Pulsing glow buttons** — focus-state light rings
- **`blast-rise` entrance animation** — staggered fade-in for result cards
- **AI loading spinner** — animated indicator while waiting for the LLM
- **Compact mode** — denser spacing for small screens
- **Auto theme** — light/dark/auto follow VS Code color scheme

### 🌍 I18n
8 UI languages: English, 中文, 日本語, 한국어, Deutsch, Français, Español, Português.

### 🛠 Workflow
- **Run & Fix** — `Ctrl+Alt+R` runs the current file and auto-analyzes stderr
- **Analyze selection** — `Ctrl+Alt+B` on any selected error text
- **Context menu** — right-click → "Blast: Analyze Selected Error"
- **Custom KB** — save AI results to `.vscode/blast-custom.json`, import/export as JSON
- **Full-text search** — Index tab searches all built-in + custom rules
- **Tested** — 30/30 unit tests for the matching engine

---

## Quick Start

### Install

Download the latest `.vsix` from [Releases](https://github.com/zyz-124/blast/releases), then:

```bash
code --install-extension blast-0.7.0.vsix
```

Reload VS Code (`Ctrl+Shift+P` → `Developer: Reload Window`).

### Use

1. Click the ⚡ Blast icon in the Activity Bar
2. Paste an error message into the **Analyze** tab
3. Click **Analyze** — or press `Ctrl+Alt+R` to run the current file and auto-analyze

---

## How It Works

```
Your Error
    │
    ▼
┌─────────────┐    hit    ┌──────────────────────────┐
│  KB Engine   │─────────▶│  Instant Fix + code_fix   │
│  99+ rules   │          │  + AI deep analysis (async)│
└─────────────┘          └──────────────────────────┘
    │ miss
    ▼
┌─────────────┐
│  AI Engine   │──▶ Deep analysis + solution steps
│  7 providers │──▶ Option: 💾 Save to My KB
└─────────────┘
```

- **KB hit** → response under 50ms, fully offline
- **AI** → 2–6s roundtrip, follows UI language

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+Alt+R` | Run current file and analyze output |
| `Ctrl+Alt+B` | Analyze selected error text |

---

## Configuration

All settings accessible via the **Blast** sidebar.

### Display

| Key | Default | Description |
|-----|---------|-------------|
| `blast.locale` | `"en"` | UI language (en/zh/ja/ko/de/fr/es/pt) |
| `blast.showConfidence` | `true` | Show match confidence % |
| `blast.appearance.colorPreset` | `"bp"` | `bp` / `bp3` / `bpGlow` |
| `blast.appearance.theme` | `"auto"` | `light` / `dark` / `auto` |
| `blast.appearance.fontSize` | `13` | px |
| `blast.appearance.compact` | `false` | compact spacing |

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
| `blast.ai.provider` | `"deepseek"` | `openai` / `deepseek` / `zhipu` / `dashscope` / `siliconflow` / `openrouter` / `custom` |
| `blast.ai.endpoint` | `"https://api.deepseek.com/v1"` | OpenAI-compatible endpoint |
| `blast.ai.model` | `"deepseek-chat"` | Model name |
| `blast.ai.maxTokens` | `2000` | Max response tokens |
| `blast.ai.temperature` | `0.3` | Creativity (0–2) |

API Key is stored in VS Code's **SecretStorage** — never in plaintext config.

---

## AI Setup

1. Open the **Analyze** tab
2. Pick a **Provider** (or stick with DeepSeek default)
3. Fill in **API Key** (and override endpoint/model if needed)
4. Click **Save** then **Test** — green "✅ Connected" means you're good

**Recommended for China:** DeepSeek (`api.deepseek.com`) — domestic access, new users get free credits.

**Recommended globally:** OpenAI (`api.openai.com`) or OpenRouter (free tier).

---

## Custom Knowledge Base

Blast saves custom entries to `.vscode/blast-custom.json` in your workspace.

- **Save to My KB** — AI results can be saved for future instant matching
- **Import / Export** — Share KB packs as JSON files
- **Full-Text Search** — Index tab lets you search all built-in + custom rules
- **Deduplication** — same `id` overrides; new entries merged

---

## Development

```bash
git clone https://github.com/zyz-124/blast.git
cd blast
npm install
npm run compile
npm test
# To package:
npm run package
```

- Zero runtime dependencies (pure TypeScript + VS Code API)
- 30/30 unit tests for the matching engine
- AI client uses standard `fetch()` — no extra SDKs

---

## Changelog

### v0.7.0 — Visual Overhaul
- Three color presets (`bp`, `bp3`, `bpGlow`)
- Glassmorphism + gradient backgrounds
- Pulsing glow focus rings
- `blast-rise` entrance animation
- AI loading spinner
- 7 AI providers (OpenAI, DeepSeek, 智谱, 阿里百炼, 硅基流动, OpenRouter, Custom)
- 4 appearance options (color preset, theme, font size, compact mode)
- 99+ KB rules with full 中文 translation

### v0.5.0
- AI-powered core analysis with KB as fast cache
- AI i18n (responses follow UI language)
- Full 中文 translation of KB titles + steps
- UI beautification: purple gradient, rounded cards, JetBrains Mono

### v0.4.0
- Settings, Analyze, My KB, Index tabs
- Custom KB import/export
- Confidence display
- Run-and-fix workflow

### v0.3.0
- Simplified UX: single button + context menu + `Ctrl+Alt+R`
- 44 KB rules (bilingual)

### v0.2.0
- First working release: pure TypeScript, 19/19 tests passing

---

## License

MIT © 2024 zyz-124

---

*⚡ Stop Googling errors. Blast them.*
