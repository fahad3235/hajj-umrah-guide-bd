// Hajj & Umrah Guide BD - logic unit tests. Plain node assert, no deps.
// Run: node tests/logic.test.js
const assert = require('assert');
const DATA = require('../js/data');
const I18N = require('../js/i18n');
const L = DATA.logic;

let n = 0;
function check(name, fn) { n += 1; fn(); console.log('ok - ' + name); }

// --- hajj steps ---
check('hajj has 8 steps in day order (ihram-mina .. farewell)', () => {
  assert.strictEqual(DATA.hajj.length, 8);
  assert.deepStrictEqual(DATA.hajj.map(s => s.id),
    ['ihram-mina', 'arafat', 'muzdalifah', 'rami-aqabah', 'tawaf-ifadah', 'tashriq', 'day13', 'farewell']);
});
check('hajj steps all have day + EN/BN title, when, todo, mistake', () => {
  DATA.hajj.forEach(s => {
    assert.ok(s.dayEn && s.dayBn, s.id + ' day');
    ['en', 'bn'].forEach(l => {
      assert.ok(s[l].title && s[l].when && s[l].todo && s[l].mistake, s.id + ' ' + l);
    });
  });
});
check('hajj day badges cover 8, 9, 10, 11-12, 13 and farewell', () => {
  const days = DATA.hajj.map(s => s.dayEn);
  assert.ok(days[0].includes('8 Dhul-Hijjah'));
  assert.ok(days[1].includes('9 Dhul-Hijjah'));
  assert.ok(days[3].includes('10 Dhul-Hijjah'));
  assert.ok(days[5].includes('11'));
  assert.ok(days[6].includes('13 Dhul-Hijjah'));
  assert.ok(days[7].includes('Makkah'));
});
check('hajj step ids are unique', () => {
  const ids = DATA.hajj.map(s => s.id);
  assert.strictEqual(new Set(ids).size, ids.length);
});

// --- umrah steps ---
check('umrah has 6 steps in order (ihram .. halq)', () => {
  assert.strictEqual(DATA.umrah.length, 6);
  assert.deepStrictEqual(DATA.umrah.map(s => s.id),
    ['ihram', 'tawaf', 'maqam', 'zamzam', 'sai', 'halq']);
});
check('umrah steps all have EN/BN title, when, todo, mistake', () => {
  DATA.umrah.forEach(s => {
    ['en', 'bn'].forEach(l => {
      assert.ok(s[l].title && s[l].when && s[l].todo && s[l].mistake, s.id + ' ' + l);
    });
  });
});

// --- duas ---
check('duas: 12, each with Arabic + transliteration + EN/BN title + meaning', () => {
  assert.strictEqual(DATA.duas.length, 12);
  DATA.duas.forEach(d => {
    assert.ok(d.ar.length > 3, d.id + ' arabic');
    assert.ok(d.translit.length > 3, d.id + ' translit');
    assert.ok(d.en.title && d.en.meaning, d.id + ' en');
    assert.ok(d.bn.title && d.bn.meaning, d.id + ' bn');
  });
});
check('dua ids are unique and include talbiyah + arafat + rami + farewell', () => {
  const ids = DATA.duas.map(d => d.id);
  assert.strictEqual(new Set(ids).size, ids.length);
  ['talbiyah', 'arafat', 'rami', 'farewell', 'zamzam', 'safa'].forEach(id => {
    assert.ok(ids.includes(id), id + ' present');
  });
});
check('arabic has NO diacritics (no chars U+064B-U+0652)', () => {
  DATA.duas.forEach(d => {
    for (const ch of d.ar) {
      const cp = ch.codePointAt(0);
      assert.ok(!(cp >= 0x064B && cp <= 0x0652), d.id + ' diacritic U+' + cp.toString(16));
    }
  });
});
check('talbiyah arabic is the standard opening', () => {
  const t = DATA.duas.find(d => d.id === 'talbiyah');
  assert.ok(t.ar.indexOf('\u0644\u0628\u064a\u0643 \u0627\u0644\u0644\u0647\u0645 \u0644\u0628\u064a\u0643') !== -1);
  assert.ok(t.translit.indexOf('Labbayk') === 0);
});
check('arafat dua contains the shahada phrase', () => {
  const a = DATA.duas.find(d => d.id === 'arafat');
  assert.ok(a.ar.indexOf('\u0644\u0627 \u0627\u0644\u0647 \u0627\u0644\u0627 \u0627\u0644\u0644\u0647') !== -1);
});

// --- packing ---
check('packing: 5 categories, 30 items total', () => {
  assert.strictEqual(DATA.packing.length, 5);
  assert.deepStrictEqual(DATA.packing.map(c => c.id),
    ['documents', 'ihram', 'toiletries', 'health', 'money']);
  const total = DATA.packing.reduce((a, c) => a + c.items.length, 0);
  assert.strictEqual(total, 30);
});
check('packing categories have 7/6/5/6/6 items, all bilingual, ids unique', () => {
  assert.deepStrictEqual(DATA.packing.map(c => c.items.length), [7, 6, 5, 6, 6]);
  const ids = [];
  DATA.packing.forEach(c => {
    assert.ok(c.en && c.bn, c.id + ' name');
    c.items.forEach(it => {
      assert.ok(it.en && it.bn, it.id + ' text');
      ids.push(it.id);
    });
  });
  assert.strictEqual(new Set(ids).size, ids.length);
});

// --- cost planner ---
check('costFields lists the 8 planner fields', () => {
  assert.deepStrictEqual(DATA.costFields,
    ['package', 'visa', 'airfare', 'hotel', 'food', 'transport', 'shopping', 'other']);
});
check('costTotal sums fields, ignores missing ones', () => {
  assert.strictEqual(L.costTotal({ package: 100000, visa: 20000, food: 5000 }), 125000);
  assert.strictEqual(L.costTotal({}), 0);
  assert.strictEqual(L.costTotal({ package: 0, other: 0 }), 0);
});
check('perDay divides and rounds (120000/20=6000, 100000/3=33333)', () => {
  assert.strictEqual(L.perDay(120000, 20), 6000);
  assert.strictEqual(L.perDay(100000, 3), 33333);
  assert.strictEqual(L.perDay(5000, 0), null);
});
check('parseAmount: empty=0, integers/decimals ok, negatives and text rejected', () => {
  assert.strictEqual(L.parseAmount(''), 0);
  assert.strictEqual(L.parseAmount('  2500 '), 2500);
  assert.strictEqual(L.parseAmount('99.50'), 99.5);
  assert.strictEqual(L.parseAmount('-5'), null);
  assert.strictEqual(L.parseAmount('abc'), null);
  assert.strictEqual(L.parseAmount('12e3'), null);
  assert.strictEqual(L.parseAmount('1,000'), null);
});
check('parseDays: 1..90 ok, 0/91/text/decimals rejected', () => {
  assert.strictEqual(L.parseDays('1'), 1);
  assert.strictEqual(L.parseDays('90'), 90);
  assert.strictEqual(L.parseDays('14'), 14);
  assert.strictEqual(L.parseDays('0'), null);
  assert.strictEqual(L.parseDays('91'), null);
  assert.strictEqual(L.parseDays('abc'), null);
  assert.strictEqual(L.parseDays('7.5'), null);
});

// --- countdown / dates ---
check('parseDate accepts valid dates, rejects impossible ones', () => {
  assert.deepStrictEqual(L.parseDate('2028-02-29'), { y: 2028, m: 2, d: 29 });
  assert.strictEqual(L.parseDate('2027-02-29'), null, '2027 not a leap year');
  assert.strictEqual(L.parseDate('2027-13-01'), null);
  assert.strictEqual(L.parseDate('2027-04-31'), null);
  assert.strictEqual(L.parseDate('2027-00-10'), null);
  assert.strictEqual(L.parseDate('not-a-date'), null);
  assert.strictEqual(L.parseDate(''), null);
});
check('daysUntil: same day 0, next day 1, past negative', () => {
  assert.strictEqual(L.daysUntil('2026-11-06', '2026-11-06'), 0);
  assert.strictEqual(L.daysUntil('2026-11-07', '2026-11-06'), 1);
  assert.strictEqual(L.daysUntil('2026-11-05', '2026-11-06'), -1);
  assert.strictEqual(L.daysUntil('2027-01-01', '2026-11-06'), 56);
});
check('daysUntil is leap-safe: Feb 28 -> Mar 1 is 2 in 2028, 1 in 2027', () => {
  assert.strictEqual(L.daysUntil('2028-03-01', '2028-02-28'), 2);
  assert.strictEqual(L.daysUntil('2027-03-01', '2027-02-28'), 1);
  assert.strictEqual(L.daysUntil('2028-02-29', '2028-02-28'), 1);
});
check('daysUntil returns null on invalid input', () => {
  assert.strictEqual(L.daysUntil('2027-02-29', '2027-02-28'), null);
  assert.strictEqual(L.daysUntil('2027-01-01', 'garbage'), null);
});

// --- quiz ---
check('quiz: 10 questions, 4 options each, answer index valid, why present', () => {
  assert.strictEqual(DATA.quiz.length, 10);
  DATA.quiz.forEach((q, i) => {
    assert.strictEqual(q.en.options.length, 4, 'q' + i + ' en options');
    assert.strictEqual(q.bn.options.length, 4, 'q' + i + ' bn options');
    assert.ok(Number.isInteger(q.answer) && q.answer >= 0 && q.answer < 4, 'q' + i + ' answer');
    assert.ok(q.en.q && q.en.why && q.bn.q && q.bn.why, 'q' + i + ' text');
  });
});
check('quiz answer key matches the guide', () => {
  assert.deepStrictEqual(DATA.quiz.map(q => q.answer), [2, 0, 1, 1, 0, 1, 1, 1, 2, 1]);
});
check('quiz correct options are the expected strings', () => {
  assert.strictEqual(DATA.quiz[0].en.options[2], '7');
  assert.strictEqual(DATA.quiz[1].en.options[0], 'Standing at Arafat on 9 Dhul-Hijjah');
  assert.strictEqual(DATA.quiz[2].en.options[1], 'Muzdalifah');
  assert.strictEqual(DATA.quiz[3].en.options[1], 'Ihram, Tawaf, 2 rakat, Zamzam, Sa\'i, Halq');
  assert.strictEqual(DATA.quiz[5].en.options[1], '11th, 12th, 13th Dhul-Hijjah');
  assert.strictEqual(DATA.quiz[8].en.options[2], '7');
  assert.strictEqual(DATA.quiz[9].en.options[1], '7');
});

// --- i18n ---
check('i18n EN and BN have identical key sets', () => {
  const ek = Object.keys(I18N.I18N.en).sort();
  const bk = Object.keys(I18N.I18N.bn).sort();
  assert.deepStrictEqual(bk, ek);
});
check('i18n: every string non-empty in both languages', () => {
  Object.keys(I18N.I18N.en).forEach(k => {
    assert.ok(I18N.I18N.en[k].length > 0, 'en.' + k);
    assert.ok(I18N.I18N.bn[k].length > 0, 'bn.' + k);
  });
});
check('i18n: all 8 cost field labels exist in both languages', () => {
  DATA.costFields.forEach(f => {
    const key = 'cost' + f.charAt(0).toUpperCase() + f.slice(1);
    assert.ok(I18N.I18N.en[key] && I18N.I18N.bn[key], key);
  });
});
check('bnDigits converts 0-9 to Bengali digits', () => {
  assert.strictEqual(I18N.bnDigits('17'), '\u09e7\u09ed');
  assert.strictEqual(I18N.bnDigits('2026'), '\u09e8\u09e6\u09e8\u09ec');
  assert.strictEqual(I18N.bnDigits('120,000'), '\u09e7\u09e8\u09e6,\u09e6\u09e6\u09e6');
  assert.strictEqual(I18N.bnDigits('Question 3 of 10'), 'Question \u09e9 of \u09e7\u09e6');
});

console.log('\n' + n + '/' + n + ' unit tests passed');
