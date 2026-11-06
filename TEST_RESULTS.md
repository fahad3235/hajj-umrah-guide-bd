# Hajj & Umrah Guide BD — test results (factory run #256, 2026-11-06 15:00 slot)

## Unit tests — 29/29 PASS
`node tests/logic.test.js`
- Hajj: 8 steps in day order (ihram-mina → arafat → muzdalifah → rami-aqabah → tawaf-ifadah → tashriq → day13 → farewell); every step has day + EN/BN title, when, todo, mistake; day badges cover 8, 9, 10, 11–12, 13 and farewell; ids unique.
- Umrah: 6 steps in order (ihram → tawaf → maqam → zamzam → sai → halq); every step bilingual with title, when, todo, mistake.
- Duas: 12, each with Arabic + transliteration + EN/BN title + meaning; ids unique (talbiyah, arafat, rami, farewell, zamzam, safa present); Arabic verified free of diacritics (no U+064B–U+0652); Talbiyah Arabic spot-checked; Arafat dua contains the shahada phrase.
- Packing: 5 categories, 30 items total (7/6/5/6/6), all bilingual, ids unique.
- Cost planner: 8 fields listed; costTotal sums (100000+20000+5000 = 125000); perDay 120000/20 = 6000 and 100000/3 = 33333 (rounded); parseAmount rejects negatives, text, scientific notation and comma-grouped numbers; parseDays accepts 1–90, rejects 0/91/text/decimals.
- Countdown: parseDate accepts 2028-02-29, rejects 2027-02-29, 2027-13-01, 2027-04-31; daysUntil same-day 0, next-day 1, past −1, 2026-11-06 → 2027-01-01 = 56; leap-safe (Feb 28 → Mar 1 is 2 days in 2028, 1 day in 2027); null on invalid input.
- Quiz: 10 questions, 4 options each, valid answer indexes, expected answer key [2,0,1,1,0,1,1,1,2,1], correct-option strings verified (Tawaf 7, Wuquf at Arafat, Muzdalifah, Umrah order, Tashriq 11–13, Sa'i 7, Rami 7).
- i18n: EN/BN key sets identical (78 keys), all strings non-empty in both languages, all 8 cost labels present; bnDigits("17") = "১৭", bnDigits("120,000") = "১২০,০০০".

## Headless-Chrome smoke — 47/47 PASS
`node smoke/smoke.mjs` (raw CDP, headless_shell-1187, file://)
- Renders: title, 7 tabs, 8 hajj steps, day badge "8 Dhul-Hijjah", Farewell Tawaf last, footer disclaimer.
- Learned mark toggles, saves to localStorage, persists across reload.
- Umrah tab: 6 steps, Ihram first, Halq last.
- Duas tab: 12 cards, 12 Arabic blocks, Talbiyah present; search "arafat" → 1 card; clearing restores 12; no-match search shows empty state.
- Packing tab: 30 items, 5 categories, "0 of 30" at start; tick → "1 of 30"; tick persists across reload.
- Cost planner: 9 inputs; empty state before input; package 100000 + visa 20000, 20 days → total BDT 120,000, per-day BDT 6,000; "abc" amount shows inline error; days=0 shows inline days error.
- Countdown: empty state; 2027-01-01 → 56 days to go (computed from run date); date persists in localStorage; 2020-01-01 → "departed" text; empty date → inline error.
- Quiz flow: Q1 correct ("7") → feedback; remaining 9 answered correctly → result 10/10, best score 10 saved, 10-item review list.
- Language: toggle to Bengali (title "হজ ও ওমরাহ গাইড বিডি"), Bengali digit ১, persists across reload, toggles back.
- Mobile: no horizontal overflow at 390px.
- Zero console errors, zero page exceptions.

## Repairs during this run
- Smoke script only (no app bugs): CDP `Runtime.evaluate` shares one global lexical scope, so re-declaring `const s` / `const el` across eval calls threw `SyntaxError: Identifier has already been declared` — changed those eval-local declarations to `var`.
- One smoke check read the Hajj title while the Quiz tab was active — fixed by clicking the Hajj tab first (test bug, not app bug).
- Two stray em-dash characters in comments (app.js, smoke.mjs) broke the pure-ASCII rule — replaced with ASCII hyphens; final `grep -rP '[^\x00-\x7F]'` over js/*.js, *.html, *.css, smoke, tests = 0 matches.

## Sources
All source files pure ASCII (Bengali/Arabic as \uXXXX escapes in JS, numeric entities in HTML) — verified with `grep -rP '[^\x00-\x7F]'` = 0 matches. Zero network requests in source (no CDN, fonts, or external images) — verified with grep for http/https URLs = none.
