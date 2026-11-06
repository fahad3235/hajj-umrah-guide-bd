# Hajj & Umrah Guide BD

Offline bilingual (English / বাংলা) Hajj & Umrah guide for Bangladeshi pilgrims — day-by-day Hajj steps, Umrah steps, a dua library, packing checklist, cost planner, departure countdown, and a self-check quiz. Hanafi practice as commonly taught in Bangladesh.

## Problem

A first-time pilgrim from Bangladesh faces a lot at once: the order of the Hajj rites across 8–13 Dhul-Hijjah, the six steps of Umrah, the duas for each stage, what to pack, what the trip will cost, and when to leave. Existing factory apps cover Salah how-to (namaz-guide-bd), Islamic history (seerah-timeline-bd) and travel documents (passport-guide-bd) — none teaches the Hajj/Umrah rituals themselves.

## Features

- **Hajj Steps** — 8 steps, day by day: 8th Ihram + Mina; 9th Wuquf at Arafat, then Muzdalifah; 10th Rami of Aqabah, Qurbani, Halq/Taqsir, Tawaf al-Ifadah + Sa'i; 11th–12th Rami of all 3 pillars + Mina nights; 13th optional Rami; Farewell Tawaf. Each step: day, when, what-to-do, common mistake. Mark-as-learned, persisted.
- **Umrah Steps** — 6 steps in order: Ihram at Miqat, Tawaf (7 circuits), 2 rakat at Maqam Ibrahim, Zamzam, Sa'i (7 laps), Halq/Taqsir. Same card format + mark-as-learned.
- **Dua Library** — 12 duas: Talbiyah, entering the Haram, Tawaf, at Maqam Ibrahim, Zamzam, Sa'i (Safa/Marwa), Arafat, Muzdalifah, Rami, Farewell. Each with Arabic (without diacritics), plain transliteration, EN + BN meaning. Search across transliteration/meaning.
- **Packing Checklist** — 5 categories (Documents, Ihram & Clothing, Toiletries, Health & Medicine, Money & Tech), 30 items, tick-off persisted, per-category + overall progress %.
- **Cost Planner** — user-entered BDT amounts: package, visa, airfare, hotel, food, local transport, shopping, other. Non-negative numbers only, inline errors. Shows total + per-day estimate (total ÷ trip days, 1–90). No preset prices anywhere.
- **Countdown** — set a departure date → days left (whole days), with "today" and "departed X days ago" states; invalid dates rejected inline; persists.
- **Quiz** — 10 hand-checked questions about Hajj/Umrah (Tawaf circuits, Wuquf, Muzdalifah, Umrah order, Talbiyah meaning, Days of Tashriq, what breaks Ihram, Farewell Tawaf ruling, Sa'i laps, Rami pebbles) with 4 options each, instant feedback + explanation, best score saved.
- **Bilingual** — full EN / বাংলা toggle, persisted, with Bengali digits. 100% offline, no account, no network requests. Mobile-first, verified at 390px.

## Stack

Vanilla HTML / CSS / JavaScript. No dependencies, no build step, no backend.

## Prerequisites

Any modern browser. For tests: Node.js 18+ and the headless Chromium shell used by the smoke test (Playwright `chromium_headless_shell-1187` cache path, overridable with `HEADLESS_SHELL`).

## Install & run

```bash
# just open it — no build step
open index.html        # or serve: python3 -m http.server
```

## Testing

```bash
node tests/logic.test.js   # 29 unit tests (step order, dua integrity, packing counts, cost math, leap-safe countdown, i18n parity, bnDigits)
node smoke/smoke.mjs       # 47 headless-Chrome checks (render, all 7 tabs, learned/packing/countdown persistence, cost calc + validation, quiz flow, BN toggle, 390px, zero console errors)
```

## Deployment

Static site — any static host or GitHub Pages (repo root, `main` branch).

## Limitations

- Educational guide, **not a fatwa**. Ritual details follow commonly taught **Hanafi** practice in Bangladesh — verify with your group leader or licensed agency, and apply only through official channels.
- Arabic is shown **without diacritics**; learn exact pronunciation from a teacher or a printed mushaf.
- No package prices, visa fees or flight fares are included — all money figures are entered by the user; get real figures from your agency and airline.
- No Hajj dates, visa status or flight tracking — use official channels for those.
- Progress, packing ticks, costs and scores live only in the browser's localStorage on one device.

## Status

Complete MVP. 29/29 unit tests and 47/47 headless-Chrome smoke checks pass, zero console errors.
