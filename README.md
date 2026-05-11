# Seedance 2.0 Video PoC

A small playground for testing BytePlus' Seedance 2.0 video generation models from your phone or laptop. You write a one-line idea, an AI turns it into a detailed cinematic prompt, and you get back a short video in about a minute.

## What you can do

- Type a logline. Claude (via OpenRouter) expands it into the seven structured fields Seedance expects — subject, setting, action, camera, lighting/style, audio, constraints — and you can edit any of them before generating.
- Pick a model: **Seedance 2.0**, **Seedance 2.0 fast**, or **both** side-by-side to compare quality vs. speed.
- Choose duration (4 or 6 seconds), aspect ratio (9:16 or 16:9), and toggle audio.
- Watch a live progress card while it generates — queued → polling → succeeded, with elapsed time and current task status — so you know it isn't stuck.
- See an estimated cost before you click Generate, based on your past runs.
- Browse a history of every generation with the inline video, token count, and exact USD spent.
- Check your live OpenRouter balance and a local resource-pack estimate for BytePlus.

> Everything (API keys, history, prompts) lives only in your browser's localStorage — nothing is sent to a server other than BytePlus and OpenRouter when you call them. Generated videos use BytePlus' 24-hour temporary URLs, so download anything you want to keep.

## Getting started

1. Create a BytePlus key in the [BytePlus ModelArk console](https://console.byteplus.com/ark/region:ark+ap-southeast-1/apiKey) (ap-southeast-1 region).
2. Create an OpenRouter key at [openrouter.ai/keys](https://openrouter.ai/keys).
3. Open the app, go to **Settings**, and paste both. You're ready.

---

## For developers

Next.js 14 (App Router) + Tailwind, no external SDKs.

```bash
npm install
npm run dev
```

**Deploy:** push to GitHub, import into Vercel. No environment variables required — the app proxies user-supplied keys at request time.

Key files: `app/page.tsx` (single-page UI), `app/api/byteplus/*` and `app/api/openrouter/*` (proxy routes), `lib/pricing.ts` and `lib/estimate-cost.ts` (cost math).
