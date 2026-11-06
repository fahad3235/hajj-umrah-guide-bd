// Hajj & Umrah Guide BD headless-Chrome smoke test (raw CDP, headless_shell).
// Run: node smoke/smoke.mjs
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import os from 'os';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const PAGE = 'file://' + path.resolve(DIR, '..', 'index.html');
const CHROME = process.env.HEADLESS_SHELL ||
  (process.env.HOME + '/.cache/ms-playwright/chromium_headless_shell-1187/chrome-linux/headless_shell');
const PORT = 9233;
const PROFILE = fs.mkdtempSync(path.join(os.tmpdir(), 'hugbd-smoke-'));

const results = [];
function check(name, cond, extra) {
  results.push([name, !!cond]);
  console.log((cond ? 'ok - ' : 'FAIL - ') + name + (extra !== undefined ? ' :: ' + extra : ''));
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function waitFor(fn, timeoutMs, label) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try { if (await fn()) return true; } catch (e) { /* retry */ }
    await sleep(200);
  }
  throw new Error('timeout waiting for: ' + label);
}

async function main() {
  const child = spawn(CHROME, [
    '--headless', '--no-sandbox', '--disable-gpu',
    '--user-data-dir=' + PROFILE,
    '--remote-debugging-port=' + PORT, '--remote-debugging-address=127.0.0.1',
    'about:blank',
  ], { stdio: 'ignore' });
  try {
    let version = null;
    await waitFor(async () => {
      const res = await fetch('http://127.0.0.1:' + PORT + '/json/version');
      if (!res.ok) return false;
      version = await res.json();
      return true;
    }, 20000, 'debugger port');
    const ws = new WebSocket(version.webSocketDebuggerUrl);
    await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
    let id = 0;
    const pending = new Map();
    const consoleErrors = [];
    const exceptions = [];
    const onMsg = (m) => {
      const msg = JSON.parse(m.data);
      if (msg.id && pending.has(msg.id)) {
        const { res, rej } = pending.get(msg.id);
        pending.delete(msg.id);
        if (msg.error) rej(new Error(JSON.stringify(msg.error))); else res(msg.result);
      }
      if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') {
        consoleErrors.push(msg.params.args.map((a) => a.value ?? a.description).join(' '));
      }
      if (msg.method === 'Runtime.exceptionThrown') {
        exceptions.push(msg.params.exceptionDetails.exception?.description || 'exception');
      }
    };
    ws.onmessage = onMsg;
    const send = (method, params) => new Promise((res, rej) => {
      const mid = ++id;
      pending.set(mid, { res, rej });
      ws.send(JSON.stringify({ id: mid, method, params: params || {} }));
    });
    const target = await (await fetch('http://127.0.0.1:' + PORT + '/json/new?about:blank', { method: 'PUT' })).json();
    const tws = new WebSocket(target.webSocketDebuggerUrl);
    await new Promise((res, rej) => { tws.onopen = res; tws.onerror = rej; });
    const tpending = new Map();
    let tid = 0;
    tws.onmessage = (m) => {
      const msg = JSON.parse(m.data);
      if (msg.id && tpending.has(msg.id)) {
        const { res, rej } = tpending.get(msg.id);
        tpending.delete(msg.id);
        if (msg.error) rej(new Error(JSON.stringify(msg.error))); else res(msg.result);
      }
      if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') {
        consoleErrors.push(msg.params.args.map((a) => a.value ?? a.description).join(' '));
      }
      if (msg.method === 'Runtime.exceptionThrown') {
        exceptions.push(msg.params.exceptionDetails.exception?.description || 'exception');
      }
    };
    const tsend = (method, params) => new Promise((res, rej) => {
      const mid = ++tid;
      tpending.set(mid, { res, rej });
      tws.send(JSON.stringify({ id: mid, method, params: params || {} }));
    });
    const teval = async (expr) => {
      const r = await tsend('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
      if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || 'eval failed');
      return r.result.value;
    };
    await tsend('Runtime.enable');
    await tsend('Page.enable');
    await tsend('Page.navigate', { url: PAGE });
    await waitFor(async () => (await teval('document.querySelectorAll(".steps .card").length')) === 8, 10000, 'hajj steps render');

    // 1. Static render - hajj tab default.
    check('app title is Hajj & Umrah Guide BD', await teval('document.querySelector("h1").textContent') === 'Hajj & Umrah Guide BD');
    check('7 tabs render', (await teval('document.querySelectorAll(".tab").length')) === 7);
    check('8 hajj steps render', (await teval('document.querySelectorAll(".steps .card").length')) === 8);
    check('day badge shows 8 Dhul-Hijjah on step 1', await teval('document.querySelector(".day-badge").textContent.includes("8 Dhul-Hijjah")'));
    check('farewell tawaf is last hajj step', await teval('document.querySelectorAll(".steps .card .step-title")[7].textContent.includes("Farewell Tawaf")'));
    check('footer disclaimer mentions not a fatwa', await teval('document.querySelector(".foot").textContent.includes("not a fatwa")'));

    // 2. Mark-as-learned toggles + persists.
    await teval('document.querySelectorAll("[data-learn]")[0].click()');
    await sleep(200);
    check('first hajj step marked learned', await teval('document.querySelectorAll(".steps .card.done").length') === 1);
    check('learned state saved to localStorage', await teval('JSON.parse(localStorage.getItem("hajj-umrah-guide-bd-v1")).learned["hajj-ihram-mina"] === true'));
    await tsend('Page.navigate', { url: PAGE });
    await waitFor(async () => (await teval('document.querySelectorAll(".steps .card").length')) === 8, 10000, 'reload');
    check('learned mark persists after reload', await teval('document.querySelectorAll(".steps .card.done").length') === 1);

    // 3. Umrah tab: 6 steps in order.
    await teval('document.querySelector("[data-tab=umrah]").click()');
    await sleep(200);
    check('6 umrah steps render', (await teval('document.querySelectorAll(".steps .card").length')) === 6);
    check('umrah starts with Ihram, ends with Halq', await teval('document.querySelectorAll(".steps .card .step-title")[0].textContent.includes("Ihram") && document.querySelectorAll(".steps .card .step-title")[5].textContent.includes("Halq")'));

    // 4. Duas tab: 12 cards, Arabic present, search filters.
    await teval('document.querySelector("[data-tab=duas]").click()');
    await sleep(200);
    check('12 dua cards render', (await teval('document.querySelectorAll(".dua-card").length')) === 12);
    check('arabic blocks render (12)', (await teval('document.querySelectorAll(".arabic").length')) === 12);
    check('talbiyah card present', await teval('document.getElementById("main").textContent.includes("Talbiyah")'));
    await teval('var s = document.getElementById("dua-search"); s.value = "arafat"; s.dispatchEvent(new Event("input", {bubbles: true}))');
    await sleep(200);
    check('search "arafat" filters to 1 dua', (await teval('document.querySelectorAll(".dua-card").length')) === 1);
    await teval('var s = document.getElementById("dua-search"); s.value = ""; s.dispatchEvent(new Event("input", {bubbles: true}))');
    await sleep(200);
    check('clearing search restores 12 duas', (await teval('document.querySelectorAll(".dua-card").length')) === 12);
    await teval('var s = document.getElementById("dua-search"); s.value = "zzz-no-match"; s.dispatchEvent(new Event("input", {bubbles: true}))');
    await sleep(200);
    check('no-match search shows empty state', await teval('document.querySelector(".empty") !== null'));

    // 5. Packing tab: 30 items, tick persists.
    await teval('document.querySelector("[data-tab=packing]").click()');
    await sleep(200);
    check('30 packing items render', (await teval('document.querySelectorAll(".pack-item").length')) === 30);
    check('5 packing categories render', (await teval('document.querySelectorAll(".pack-cat").length')) === 5);
    check('overall shows 0 of 30 at start', await teval('document.getElementById("packing-overall").textContent.includes("0 of 30")'));
    await teval('document.querySelector("[data-pack]").click()');
    await sleep(200);
    check('ticking 1 item shows 1 of 30', await teval('document.getElementById("packing-overall").textContent.includes("1 of 30")'));
    await tsend('Page.navigate', { url: PAGE });
    await waitFor(async () => (await teval('document.querySelectorAll(".steps .card").length')) === 8, 10000, 'reload 2');
    await teval('document.querySelector("[data-tab=packing]").click()');
    await sleep(200);
    check('packing tick persists after reload', await teval('document.querySelector("[data-pack]").checked === true'));

    // 6. Cost planner: sample numbers, validation.
    await teval('document.querySelector("[data-tab=cost]").click()');
    await sleep(200);
    check('8 cost fields + days field render', (await teval('document.querySelectorAll("#main input").length')) === 9);
    check('empty state shown before input', await teval('document.querySelector("#cost-results").textContent.includes("at least one amount")'));
    await teval('const set = (id, v) => { const el = document.getElementById(id); el.value = v; el.dispatchEvent(new Event("input", {bubbles: true})); }; set("cost-package", "100000"); set("cost-visa", "20000"); set("cost-days", "20");');
    await sleep(200);
    check('total shows BDT 120,000', await teval('document.getElementById("cost-total").textContent.includes("120,000")'));
    check('per-day shows BDT 6,000', await teval('document.getElementById("cost-perday").textContent.includes("6,000")'));
    await teval('var el = document.getElementById("cost-food"); el.value = "abc"; el.dispatchEvent(new Event("input", {bubbles: true}));');
    await sleep(200);
    check('invalid amount shows inline error', await teval('document.getElementById("err-food").textContent.length > 0'));
    await teval('var el = document.getElementById("cost-food"); el.value = ""; el.dispatchEvent(new Event("input", {bubbles: true})); var d = document.getElementById("cost-days"); d.value = "0"; d.dispatchEvent(new Event("input", {bubbles: true}));');
    await sleep(200);
    check('days=0 shows inline days error', await teval('document.getElementById("err-days").textContent.length > 0'));

    // 7. Countdown: future date, past date, invalid date.
    const now = new Date();
    const todayUTC = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
    const expectedFuture = Math.round((Date.UTC(2027, 0, 1) - todayUTC) / 86400000);
    await teval('document.querySelector("[data-tab=countdown]").click()');
    await sleep(200);
    check('countdown empty state shown', await teval('document.querySelector("#countdown-result").textContent.includes("No departure date")'));
    await teval('document.getElementById("departure-date").value = "2027-01-01"; document.getElementById("countdown-save").click();');
    await sleep(200);
    check('future date shows expected days to go', await teval('document.getElementById("countdown-days").textContent.includes("' + expectedFuture + '")'), 'expected ' + expectedFuture);
    check('departure date persists in localStorage', await teval('JSON.parse(localStorage.getItem("hajj-umrah-guide-bd-v1")).departure === "2027-01-01"'));
    await teval('document.getElementById("departure-date").value = "2020-01-01"; document.getElementById("countdown-save").click();');
    await sleep(200);
    check('past date shows departed text', await teval('document.getElementById("countdown-days").textContent.includes("departed")'));
    await teval('document.getElementById("departure-date").value = ""; document.getElementById("countdown-save").click();');
    await sleep(200);
    check('empty date shows inline error', await teval('document.getElementById("countdown-error").textContent.length > 0'));

    // 8. Quiz: answer all 10 correctly -> 10/10, best saved.
    await teval('document.querySelector("[data-tab=quiz]").click()');
    await sleep(200);
    check('quiz start button shown', await teval('!!document.getElementById("quiz-start")'));
    await teval('document.getElementById("quiz-start").click()');
    await sleep(200);
    check('quiz Q1 shown (Tawaf circuits)', await teval('document.querySelector(".q-text").textContent.includes("Tawaf")'));
    await teval('document.querySelectorAll(".opt")[2].click()'); // "7" correct
    await sleep(200);
    check('correct feedback shown for Q1', await teval('document.querySelector(".feedback").textContent.includes("Correct")'));
    for (let q = 0; q < 9; q++) {
      await teval('document.getElementById("quiz-next").click()');
      await sleep(150);
      await teval('document.querySelectorAll(".opt")[window.HAJJ_DATA.quiz[' + (q + 1) + '].answer].click()');
      await sleep(150);
    }
    await teval('document.getElementById("quiz-next").click()');
    await sleep(300);
    check('quiz result shows 10 / 10', await teval('document.querySelector(".score").textContent.includes("10 / 10")'));
    check('best score 10 saved', await teval('JSON.parse(localStorage.getItem("hajj-umrah-guide-bd-v1")).best === 10'));
    check('review list has 10 items', (await teval('document.querySelectorAll(".review li").length')) === 10);

    // 9. Language toggle to Bangla + persistence.
    await teval('document.getElementById("lang-toggle").click()');
    await sleep(300);
    check('title switches to Bengali', await teval('document.querySelector("h1").textContent') === '\u09b9\u099c \u0993 \u0993\u09ae\u09b0\u09be\u09b9 \u0997\u09be\u0987\u09a1 \u09ac\u09bf\u09a1\u09bf');
    check('hajj tab shows Bengali title after switch', await teval('document.querySelector("[data-tab=hajj]").click(), document.getElementById("main").textContent.includes("\u09b9\u099c, \u09a6\u09bf\u09a8\u09c7 \u09a6\u09bf\u09a8\u09c7")'));
    check('hajj step 1 shows Bengali digit \u09e7', await teval('document.querySelector(".steps .step-no").textContent') === '\u09e7');
    await tsend('Page.navigate', { url: PAGE });
    await waitFor(async () => (await teval('document.querySelectorAll(".steps .card").length')) === 8, 10000, 'reload BN');
    check('Bangla still active after reload', await teval('document.querySelector("h1").textContent') === '\u09b9\u099c \u0993 \u0993\u09ae\u09b0\u09be\u09b9 \u0997\u09be\u0987\u09a1 \u09ac\u09bf\u09a1\u09bf');
    await teval('document.getElementById("lang-toggle").click()');
    await sleep(300);
    check('toggle back to English', await teval('document.querySelector("h1").textContent') === 'Hajj & Umrah Guide BD');

    // 10. Mobile 390px: no horizontal overflow.
    await tsend('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
    await sleep(500);
    check('no overflow at 390px', await teval('document.documentElement.scrollWidth <= 391'));

    // 11. No console errors / exceptions.
    check('zero console errors', consoleErrors.length === 0, consoleErrors.join(' | '));
    check('zero page exceptions', exceptions.length === 0, exceptions.join(' | '));

    tws.close(); ws.close();
  } finally {
    child.kill();
    try { fs.rmSync(PROFILE, { recursive: true, force: true }); } catch (e) { /* ignore */ }
  }
  const failed = results.filter((r) => !r[1]).length;
  console.log(failed === 0 ? 'SMOKE PASS: ' + results.length + '/' + results.length : 'SMOKE FAIL: ' + failed + ' failures');
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((e) => { console.error('SMOKE ERROR:', e.message); process.exit(1); });
