# 🍃 Quiet Space — AI Journal

> **Because doom-scrolling social media until 3 AM and crying over your NIFTY 50 trading options losses is not a therapy plan.** 

Welcome to **Quiet Space**—a private, local-only, offline-first digital sanctuary for your mind. It takes your raw daily thoughts, gym plateaus, fitness setbacks, and minor financial breakdowns, filters them through a local LLM API of your choice, and mirrors them back as structured, first-person insights. 

It is completely client-side, local-first, and serverless. Your private keys and thoughts stay on your device, stored inside your browser's local cache. No databases, no trackers, no cloud leaks.

---

## 📸 Dashboard Overview

![Quiet Space Dashboard](public/screenshots/dashboard.png)
*A minimalist, responsive dashboard designed to inspire peace and reflection.*

---

## ✨ Features

- **Personalized First-Person Insights**: AI extracts problems, learnings, strengths, and motivational quotes from your logs written in the first person (using *I*, *my*, *me*) so they read as your own reflections.
- **Bring Your Own Key (BYOK)**: Supports Google Gemini, OpenAI (ChatGPT), and Anthropic (Claude) APIs.
- **Direct Client Connection (Safe & Private)**: All API keys and journal logs are stored locally in your browser's `localStorage` and sent directly to the model endpoints. No backend servers, no tracking, and no database leaks.
- **Usage & Cost Tracking**: Monitor your token consumption (today and all-time) with a built-in estimator reflecting public API pricing.
- **Backup & Control**: Download your memories as a JSON backup file or import existing logs. Wipe all local data anytime with a high-safety confirmation mechanism.
- **Granular Widget Control**: Erase or refresh individual widgets independently to save API tokens and refine specific insights.

---

## 🚀 Local Installation

Ensure you have [Node.js](https://nodejs.org) installed on your system.

### 1. Clone the repository
```bash
git clone https://github.com/your-username/QuietSpace.git
cd QuietSpace
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Start the Local Server
```bash
npm run dev
```

### 4. Open in Browser
Visit the local server address (usually `http://localhost:5173`) in your browser.

---

## 🔑 LLM Setup Guide (Wizard)

Setting up your intelligence engine is simple and happens entirely in the floating bottom-right of your page.

| Step 1: Select LLM Provider | Step 2: Configure API Key & Model |
| --- | --- |
| ![Select Provider](public/screenshots/provider_select.png) | ![Configure API Key](public/screenshots/api_config.png) |
| Click the key icon in the bottom-right and select your provider (Gemini, ChatGPT, or Claude). | Enter your personal API key, select a model version, and click **Save Config**. |

### 💡 API Keys Source:
- **Google Gemini**: Get a free or pay-as-you-go key from [Google AI Studio](https://aistudio.google.com/).
- **OpenAI ChatGPT**: Generate a developer key from [OpenAI Developer Console](https://platform.openai.com/).
- **Anthropic Claude**: Create an API key in the [Anthropic Console](https://console.anthropic.com/).

---

## 💾 Local Storage Schema

All configuration and data is stored locally under:
- `AI_JOURNAL_DATA`: Contains your logs and widget insights.
- `AI_JOURNAL_API_KEY_<provider>`: Stores your respective keys.
- `AI_JOURNAL_USAGE`: Keeps track of token usage records.
