// Hajj & Umrah Guide BD - app logic. Vanilla JS, no deps, localStorage only.
(function () {
  "use strict";
  var DATA = window.HAJJ_DATA;
  var I18N = window.HAJJ_I18N;
  var bnDigits = window.HAJJ_BN_DIGITS;
  var LOGIC = DATA.logic;
  var LS_KEY = "hajj-umrah-guide-bd-v1";

  var state = loadState();
  var lang = state.lang || "en";
  var tab = "hajj";
  var quiz = null; // {idx, answers[], picked}
  var duaQuery = "";

  function loadState() {
    try {
      var raw = localStorage.getItem(LS_KEY);
      if (raw) { var s = JSON.parse(raw); if (s && typeof s === "object") return s; }
    } catch (e) { /* corrupted storage -> fresh state */ }
    return { learned: {}, packing: {}, best: null, lang: "en", cost: {}, days: "", departure: "" };
  }
  function saveState() {
    try { localStorage.setItem(LS_KEY, JSON.stringify(state)); } catch (e) { /* storage full/blocked */ }
  }
  function t(key) {
    var s = (I18N[lang] && I18N[lang][key]) || I18N.en[key] || key;
    return s;
  }
  function fmt(key, vars) {
    var s = t(key);
    Object.keys(vars || {}).forEach(function (k) {
      s = s.split("{" + k + "}").join(vars[k]);
    });
    return s;
  }
  function loc(n) { return lang === "bn" ? bnDigits(n) : String(n); }
  function fmtNum(n) {
    var s = String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return lang === "bn" ? bnDigits(s) : s;
  }
  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }
  function todayISO() {
    var d = new Date();
    function p(n) { return (n < 10 ? "0" : "") + n; }
    return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate());
  }

  // ---------- learned tracking ----------
  function totalLearnable() { return DATA.hajj.length + DATA.umrah.length; }
  function learnedCount() {
    return Object.keys(state.learned || {}).filter(function (k) { return state.learned[k]; }).length;
  }
  function toggleLearned(id) {
    state.learned = state.learned || {};
    state.learned[id] = !state.learned[id];
    saveState();
    render();
  }

  // ---------- steps (hajj / umrah) ----------
  function stepsHTML(list, prefix) {
    var h = '<ol class="steps">';
    list.forEach(function (s, i) {
      var id = prefix + "-" + s.id;
      var done = !!(state.learned && state.learned[id]);
      h += '<li class="card step' + (done ? " done" : "") + '">'
        + '<div class="step-head"><span class="step-no">' + loc(i + 1) + '</span>'
        + '<span class="step-title">' + esc(s[lang].title) + '</span>'
        + '<span class="day-badge">' + esc(lang === "bn" ? s.dayBn : s.dayEn) + '</span></div>'
        + '<p><span class="field-label">' + esc(t("whenLabel")) + ':</span> ' + esc(s[lang].when) + '</p>'
        + '<p><span class="field-label">' + esc(t("todoLabel")) + ':</span> ' + esc(s[lang].todo) + '</p>'
        + '<p><span class="field-label">' + esc(t("mistakeLabel")) + ':</span> ' + esc(s[lang].mistake) + '</p>'
        + '<button class="learn-btn" data-learn="' + id + '">' + esc(t(done ? "learned" : "markLearned")) + '</button>'
        + '</li>';
    });
    h += '</ol>';
    return h;
  }

  function hajjHTML() {
    var h = '<h2>' + esc(t("hajjTitle")) + '</h2><p class="intro">' + esc(t("hajjIntro")) + '</p>';
    h += stepsHTML(DATA.hajj, "hajj");
    h += progressHTML();
    return h;
  }
  function umrahHTML() {
    var h = '<h2>' + esc(t("umrahTitle")) + '</h2><p class="intro">' + esc(t("umrahIntro")) + '</p>';
    h += stepsHTML(DATA.umrah, "umrah");
    return h;
  }

  // ---------- duas ----------
  function duaMatches(d, q) {
    if (!q) return true;
    var hay = (d.translit + " " + d.en.title + " " + d.en.meaning + " " + d.bn.title + " " + d.bn.meaning).toLowerCase();
    return hay.indexOf(q.toLowerCase()) !== -1;
  }
  function duaListHTML() {
    var list = DATA.duas.filter(function (d) { return duaMatches(d, duaQuery); });
    if (list.length === 0) return '<p class="empty">' + esc(t("searchEmpty")) + '</p>';
    var h = "";
    list.forEach(function (d) {
      h += '<div class="card dua-card"><p class="dua-title">' + esc(d[lang].title) + '</p>'
        + '<p class="arabic" dir="rtl" lang="ar">' + esc(d.ar) + '</p>'
        + '<p class="translit"><b>' + esc(t("transliterationLabel")) + ':</b> ' + esc(d.translit) + '</p>'
        + '<p class="meaning"><b>' + esc(t("meaningLabel")) + ':</b> ' + esc(d[lang].meaning) + '</p></div>';
    });
    return h;
  }
  function duasHTML() {
    var h = '<h2>' + esc(t("duasTitle")) + '</h2><p class="intro">' + esc(t("duasIntro")) + '</p>'
      + '<input class="search" id="dua-search" type="search" placeholder="' + esc(t("searchPlaceholder")) + '" value="' + esc(duaQuery) + '" aria-label="' + esc(t("searchPlaceholder")) + '">'
      + '<div id="dua-list">' + duaListHTML() + '</div>';
    return h;
  }

  // ---------- packing ----------
  function packingTotals() {
    var total = 0, done = 0;
    DATA.packing.forEach(function (c) {
      c.items.forEach(function (it) {
        total += 1;
        if (state.packing && state.packing[it.id]) done += 1;
      });
    });
    return { total: total, done: done };
  }
  function packingOverallHTML() {
    var p = packingTotals();
    var pct = p.total ? Math.round(100 * p.done / p.total) : 0;
    var h = '<p id="packing-overall"><b>' + esc(fmt("packingOverall", { a: loc(p.done), b: loc(p.total), c: loc(pct) })) + '</b></p>'
      + '<div class="bar"><div class="bar-fill" id="packing-bar" style="width:' + pct + '%"></div></div>';
    if (p.done === p.total && p.total > 0) h += '<p class="best">' + esc(t("packingDone")) + '</p>';
    return h;
  }
  function packingHTML() {
    var h = '<h2>' + esc(t("packingTitle")) + '</h2><p class="intro">' + esc(t("packingIntro")) + '</p>';
    h += packingOverallHTML();
    DATA.packing.forEach(function (c) {
      var cTotal = c.items.length;
      var cDone = c.items.filter(function (it) { return state.packing && state.packing[it.id]; }).length;
      h += '<h3 class="pack-cat">' + esc(c[lang]) + ' <span class="cat-count" data-cat="' + c.id + '">' + loc(cDone) + '/' + loc(cTotal) + '</span></h3><ul class="pack-list">';
      c.items.forEach(function (it) {
        var checked = !!(state.packing && state.packing[it.id]);
        h += '<li><label class="pack-item' + (checked ? " done" : "") + '"><input type="checkbox" data-pack="' + it.id + '"' + (checked ? " checked" : "") + '><span>' + esc(it[lang]) + '</span></label></li>';
      });
      h += '</ul>';
    });
    h += '<button class="danger" id="packing-reset">' + esc(t("packingReset")) + '</button>';
    return h;
  }
  function updatePackingProgress() {
    var p = packingTotals();
    var pct = p.total ? Math.round(100 * p.done / p.total) : 0;
    var overall = document.getElementById("packing-overall");
    if (overall) overall.innerHTML = '<b>' + esc(fmt("packingOverall", { a: loc(p.done), b: loc(p.total), c: loc(pct) })) + '</b>';
    var bar = document.getElementById("packing-bar");
    if (bar) bar.style.width = pct + "%";
    DATA.packing.forEach(function (c) {
      var cDone = c.items.filter(function (it) { return state.packing && state.packing[it.id]; }).length;
      var el = document.querySelector('.cat-count[data-cat="' + c.id + '"]');
      if (el) el.textContent = loc(cDone) + '/' + loc(c.items.length);
    });
  }

  // ---------- cost planner ----------
  function costFieldHTML(f) {
    var val = (state.cost && state.cost[f] != null) ? state.cost[f] : "";
    return '<label class="field"><span>' + esc(t("cost" + f.charAt(0).toUpperCase() + f.slice(1))) + ' (BDT)</span>'
      + '<input type="text" inputmode="decimal" id="cost-' + f + '" value="' + esc(val) + '" placeholder="0">'
      + '<p class="field-error" id="err-' + f + '"></p></label>';
  }
  function costHTML() {
    var h = '<h2>' + esc(t("costTitle")) + '</h2><p class="intro">' + esc(t("costIntro")) + '</p>';
    h += '<div class="form-grid">';
    DATA.costFields.forEach(function (f) { h += costFieldHTML(f); });
    var daysVal = state.days != null ? state.days : "";
    h += '<label class="field"><span>' + esc(t("costDays")) + '</span>'
      + '<input type="text" inputmode="numeric" id="cost-days" value="' + esc(daysVal) + '" placeholder="14">'
      + '<p class="field-error" id="err-days"></p></label>';
    h += '</div>';
    h += '<div class="cost-results" id="cost-results"></div>';
    h += '<button class="danger" id="cost-clear">' + esc(t("costClear")) + '</button>';
    return h;
  }
  function updateCostResults() {
    var box = document.getElementById("cost-results");
    if (!box) return;
    var amounts = {}, anyEntered = false, allValid = true;
    DATA.costFields.forEach(function (f) {
      var el = document.getElementById("cost-" + f);
      var err = document.getElementById("err-" + f);
      if (!el) return;
      var raw = el.value;
      if (raw.trim() !== "") anyEntered = true;
      var v = LOGIC.parseAmount(raw);
      if (v == null) {
        allValid = false;
        el.classList.add("invalid");
        if (err) err.textContent = t("invalidAmount");
      } else {
        el.classList.remove("invalid");
        if (err) err.textContent = "";
        amounts[f] = v;
      }
    });
    var daysEl = document.getElementById("cost-days");
    var daysErr = document.getElementById("err-days");
    var days = null, daysValid = true;
    if (daysEl) {
      if (daysEl.value.trim() !== "") {
        days = LOGIC.parseDays(daysEl.value);
        if (days == null) {
          daysValid = false;
          daysEl.classList.add("invalid");
          if (daysErr) daysErr.textContent = t("invalidDays");
        } else {
          daysEl.classList.remove("invalid");
          if (daysErr) daysErr.textContent = "";
        }
      } else {
        daysEl.classList.remove("invalid");
        if (daysErr) daysErr.textContent = "";
      }
    }
    if (!anyEntered) {
      box.innerHTML = '<p class="empty">' + esc(t("costEmpty")) + '</p>';
      return;
    }
    if (!allValid || !daysValid) {
      box.innerHTML = '';
      return;
    }
    var total = LOGIC.costTotal(amounts);
    var h = '<div class="cost-line total"><span>' + esc(t("costTotal")) + '</span><b id="cost-total">BDT ' + esc(fmtNum(total)) + '</b></div>';
    if (days) {
      h += '<div class="cost-line"><span>' + esc(t("costPerDay")) + '</span><b id="cost-perday">BDT ' + esc(fmtNum(LOGIC.perDay(total, days))) + '</b></div>';
    }
    box.innerHTML = h;
  }

  // ---------- countdown ----------
  function countdownResultHTML() {
    if (!state.departure) return '<p class="empty">' + esc(t("countdownEmpty")) + '</p>';
    var days = LOGIC.daysUntil(state.departure, todayISO());
    if (days == null) return '<p class="empty">' + esc(t("countdownInvalid")) + '</p>';
    var h = '';
    if (days > 0) h = '<p class="countdown-big" id="countdown-days">' + esc(fmt("countdownDaysLeft", { a: loc(days) })) + '</p>';
    else if (days === 0) h = '<p class="countdown-big" id="countdown-days">' + esc(t("countdownToday")) + '</p>';
    else h = '<p class="countdown-big" id="countdown-days">' + esc(fmt("countdownDeparted", { a: loc(-days) })) + '</p>';
    h += '<p class="countdown-date">' + esc(state.departure) + '</p>';
    return h;
  }
  function countdownHTML() {
    var h = '<h2>' + esc(t("countdownTitle")) + '</h2><p class="intro">' + esc(t("countdownIntro")) + '</p>';
    h += '<div class="form-row"><label class="field"><span>' + esc(t("countdownLabel")) + '</span>'
      + '<input type="date" id="departure-date" value="' + esc(state.departure || "") + '">'
      + '<p class="field-error" id="countdown-error"></p></label>'
      + '<button class="primary" id="countdown-save">' + esc(t("countdownSave")) + '</button>'
      + '<button class="danger" id="countdown-clear">' + esc(t("countdownClear")) + '</button></div>';
    h += '<div id="countdown-result">' + countdownResultHTML() + '</div>';
    return h;
  }

  // ---------- quiz ----------
  function quizHTML() {
    var h = '<h2>' + esc(t("quizTitle")) + '</h2><p class="intro">' + esc(t("quizIntro")) + '</p>';
    if (state.best != null) h += '<p class="best">' + esc(fmt("bestLabel", { a: loc(state.best), b: loc(DATA.quiz.length) })) + '</p>';
    if (!quiz) {
      h += '<button class="primary" id="quiz-start">' + esc(t("startQuiz")) + '</button>';
      return h;
    }
    if (quiz.idx >= DATA.quiz.length) {
      var score = quiz.answers.filter(function (a, i) { return a === DATA.quiz[i].answer; }).length;
      h += '<p class="score">' + esc(fmt("scoreLabel", { a: loc(score), b: loc(DATA.quiz.length) })) + '</p>';
      h += '<ol class="review">';
      DATA.quiz.forEach(function (q, i) {
        var ok = quiz.answers[i] === q.answer;
        h += '<li class="card review-' + (ok ? "ok" : "bad") + '"><b>' + esc(q[lang].q) + '</b><p>'
          + esc(ok ? t("correctLabel") : fmt("wrongLabel", { a: q[lang].options[q.answer] })) + '</p>'
          + '<p class="why">' + esc(q[lang].why) + '</p></li>';
      });
      h += '</ol>';
      h += '<button class="primary" id="quiz-retake">' + esc(t("retakeQuiz")) + '</button>';
      return h;
    }
    var q = DATA.quiz[quiz.idx];
    var picked = quiz.picked;
    h += '<p class="q-count">' + esc(fmt("questionLabel", { a: loc(quiz.idx + 1), b: loc(DATA.quiz.length) })) + '</p>';
    h += '<div class="card quiz-card"><p class="q-text">' + esc(q[lang].q) + '</p><div class="options">';
    q[lang].options.forEach(function (opt, i) {
      var cls = "opt";
      if (picked != null) {
        if (i === q.answer) cls += " opt-correct";
        else if (i === picked) cls += " opt-wrong";
        else cls += " opt-dim";
      }
      h += '<button class="' + cls + '" data-opt="' + i + '"' + (picked != null ? " disabled" : "") + '>' + esc(opt) + '</button>';
    });
    h += '</div>';
    if (picked != null) {
      var ok = picked === q.answer;
      h += '<p class="feedback ' + (ok ? "fb-ok" : "fb-bad") + '">' + esc(ok ? t("correctLabel") : fmt("wrongLabel", { a: q[lang].options[q.answer] })) + '</p>';
      h += '<p class="why">' + esc(q[lang].why) + '</p>';
      h += '<button class="primary" id="quiz-next">' + esc(quiz.idx === DATA.quiz.length - 1 ? t("seeResults") : t("nextQuestion")) + '</button>';
    }
    h += '</div>';
    return h;
  }

  function progressHTML() {
    var total = totalLearnable();
    var done = learnedCount();
    var h = '<div class="card progress-card"><h3>' + esc(t("progressTitle")) + '</h3>'
      + '<p>' + esc(fmt("progressLearned", { a: loc(done), b: loc(total) })) + '</p>'
      + '<div class="bar"><div class="bar-fill" style="width:' + Math.round(100 * done / total) + '%"></div></div>'
      + '<p>' + (state.best != null ? esc(fmt("progressQuiz", { a: loc(state.best) })) : esc(t("progressEmpty"))) + '</p>'
      + '<button class="danger" id="reset-progress">' + esc(t("resetProgress")) + '</button></div>';
    return h;
  }

  function render() {
    document.documentElement.lang = lang === "bn" ? "bn" : "en";
    document.querySelectorAll("[data-i18n]").forEach(function (el) {
      el.textContent = t(el.getAttribute("data-i18n"));
    });
    document.getElementById("lang-toggle").textContent = t("langToggle");
    document.querySelectorAll(".tab").forEach(function (el) {
      el.classList.toggle("active", el.getAttribute("data-tab") === tab);
      el.setAttribute("aria-selected", el.getAttribute("data-tab") === tab ? "true" : "false");
    });
    var main = document.getElementById("main");
    if (tab === "hajj") main.innerHTML = hajjHTML();
    else if (tab === "umrah") main.innerHTML = umrahHTML();
    else if (tab === "duas") main.innerHTML = duasHTML();
    else if (tab === "packing") main.innerHTML = packingHTML();
    else if (tab === "cost") main.innerHTML = costHTML();
    else if (tab === "countdown") main.innerHTML = countdownHTML();
    else if (tab === "quiz") main.innerHTML = quizHTML();
    if (tab === "cost") updateCostResults();
  }

  // ---------- events ----------
  document.addEventListener("click", function (ev) {
    var el = ev.target.closest("[data-tab],[data-learn],#lang-toggle,#quiz-start,#quiz-next,#quiz-retake,#reset-progress,#packing-reset,#cost-clear,#countdown-save,#countdown-clear,[data-opt]");
    if (!el) return;
    if (el.hasAttribute("data-tab")) { tab = el.getAttribute("data-tab"); render(); return; }
    if (el.id === "lang-toggle") {
      lang = lang === "en" ? "bn" : "en";
      state.lang = lang; saveState(); render(); return;
    }
    if (el.hasAttribute("data-learn")) { toggleLearned(el.getAttribute("data-learn")); return; }
    if (el.id === "quiz-start") { quiz = { idx: 0, answers: [], picked: null }; render(); return; }
    if (el.id === "quiz-retake") { quiz = { idx: 0, answers: [], picked: null }; render(); return; }
    if (el.id === "quiz-next") {
      quiz.answers[quiz.idx] = quiz.picked;
      quiz.idx += 1; quiz.picked = null;
      if (quiz.idx >= DATA.quiz.length) {
        var score = quiz.answers.filter(function (a, i) { return a === DATA.quiz[i].answer; }).length;
        if (state.best == null || score > state.best) { state.best = score; saveState(); }
      }
      render(); return;
    }
    if (el.id === "reset-progress") {
      if (window.confirm(t("resetConfirm"))) {
        state.learned = {}; state.packing = {}; state.best = null; saveState(); render();
      }
      return;
    }
    if (el.id === "packing-reset") {
      state.packing = {}; saveState(); render(); return;
    }
    if (el.id === "cost-clear") {
      state.cost = {}; state.days = ""; saveState(); render(); return;
    }
    if (el.id === "countdown-save") {
      var input = document.getElementById("departure-date");
      var err = document.getElementById("countdown-error");
      var v = input ? input.value : "";
      if (!LOGIC.parseDate(v)) {
        if (err) err.textContent = t("countdownInvalid");
        return;
      }
      if (err) err.textContent = "";
      state.departure = v; saveState();
      var box = document.getElementById("countdown-result");
      if (box) box.innerHTML = countdownResultHTML();
      return;
    }
    if (el.id === "countdown-clear") {
      state.departure = ""; saveState(); render(); return;
    }
    if (el.hasAttribute("data-opt") && quiz && quiz.picked == null) {
      quiz.picked = parseInt(el.getAttribute("data-opt"), 10);
      render(); return;
    }
  });

  document.addEventListener("change", function (ev) {
    var el = ev.target.closest("[data-pack]");
    if (!el) return;
    state.packing = state.packing || {};
    state.packing[el.getAttribute("data-pack")] = el.checked;
    saveState();
    var label = el.closest(".pack-item");
    if (label) label.classList.toggle("done", el.checked);
    updatePackingProgress();
  });

  document.addEventListener("input", function (ev) {
    var el = ev.target;
    if (!el || !el.id) return;
    if (el.id === "dua-search") {
      duaQuery = el.value;
      var list = document.getElementById("dua-list");
      if (list) list.innerHTML = duaListHTML();
      return;
    }
    if (el.id.indexOf("cost-") === 0) {
      state.cost = state.cost || {};
      if (el.id === "cost-days") { state.days = el.value; }
      else { state.cost[el.id.slice(5)] = el.value; }
      saveState();
      updateCostResults();
    }
  });

  render();
})();
