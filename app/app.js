(function () {
'use strict';
const U = window.UI, ic = U.ic, toast = U.toast, ask = U.ask, esc = U.esc;

/* ---------- tiện ích ---------- */
const $ = (s, r) => (r || document).querySelector(s);
const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
const KEY = 'iuh-tinhoc-v1';
const NAMES = { IU01: 'Hiểu biết CNTT', IU02: 'Windows', IU03: 'Word', IU04: 'Excel', IU05: 'PowerPoint', IU06: 'Internet' };
const INT = [0, 1, 3, 7, 14]; // ngày lặp lại theo hộp Leitner
const BASE_TITLE = document.title;

function defaults() {
  return { examDate: '2026-10-21', plan: {}, q: {}, c: {}, mocks: [], errors: [], th: null, off: {}, tn: { attempts: [], draft: null }, mockDraft: null, theme: 'auto', lastBackup: 0 };
}
let S, saveState = { ok: true, t: 0 }, corruptNote = false;
try { localStorage.setItem('__t', '1'); localStorage.removeItem('__t'); } catch (e) { saveState.ok = false; }
try {
  const raw = localStorage.getItem(KEY);
  S = Object.assign(defaults(), raw ? JSON.parse(raw) : {});
} catch (e) {
  S = defaults(); corruptNote = true;
  try { localStorage.setItem(KEY + '-hong-' + Date.now(), localStorage.getItem(KEY) || ''); } catch (e2) { /* bỏ qua */ }
}
function save() {
  try { localStorage.setItem(KEY, JSON.stringify(S)); saveState = { ok: true, t: Date.now() }; } catch (e) { saveState = { ok: false, t: saveState.t }; }
  paintSave();
}
const hm = t => { const d = new Date(t), p = k => String(k).padStart(2, '0'); return p(d.getHours()) + ':' + p(d.getMinutes()); };
const dtFmt = t => { const d = new Date(t), p = k => String(k).padStart(2, '0'); return p(d.getDate()) + '/' + p(d.getMonth() + 1) + ' ' + p(d.getHours()) + ':' + p(d.getMinutes()); };
function paintSave() {
  const el = $('#savest'); if (!el) return;
  el.className = 'savest' + (saveState.ok ? '' : ' bad');
  el.innerHTML = saveState.ok ? ic('check', 14) + '<span>' + (saveState.t ? 'Đã lưu ' + hm(saveState.t) : 'Tự động lưu') + '</span>' : ic('alert', 14) + '<span>Không lưu được</span>';
}

const today = () => { const d = new Date(); return Math.floor((d.getTime() - d.getTimezoneOffset() * 60000) / 864e5); };
const dateToDay = s => Math.floor(Date.parse(s + 'T00:00:00Z') / 864e5);
const dayFmt = n => { const d = new Date(n * 864e5); return String(d.getUTCDate()).padStart(2, '0') + '/' + String(d.getUTCMonth() + 1).padStart(2, '0'); };
const hash = s => { let h = 5381; for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0; return (h >>> 0).toString(36); };
const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const mmss = s => { s = Math.max(0, Math.floor(s)); return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0'); };
const examLeft = () => dateToDay(S.examDate) - today();

/* ---------- thành phần giao diện nhỏ ---------- */
const badge = (t, k, title) => `<span class="badge ${k || ''}"${title ? ` title="${esc(title)}"` : ''}>${t}</span>`;
const bar = (pct, k) => `<div class="bar ${k || ''}" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct}"><i style="width:${pct}%"></i></div>`;
function ring(pct, big, small, kind, size) {
  const r = 42, c = 2 * Math.PI * r, s = size || 132;
  return `<div class="ring-w" style="width:${s}px;height:${s}px"><svg class="ring ${kind || ''}" viewBox="0 0 100 100" width="${s}" height="${s}" aria-hidden="true"><circle class="bg" cx="50" cy="50" r="${r}"/><circle class="fg" cx="50" cy="50" r="${r}" stroke-dasharray="${(c * Math.max(0, Math.min(100, pct)) / 100).toFixed(1)} ${c.toFixed(1)}"/></svg><div class="ring-t"><b>${big}</b><span>${small || ''}</span></div></div>`;
}
const pageHead = (title, sub, right) => `<div class="page-h"><div><h1>${title}</h1>${sub ? `<p>${sub}</p>` : ''}</div>${right ? `<div class="page-a">${right}</div>` : ''}</div>`;
const emptyBox = (icon, title, text, act) => `<div class="card empty"><div class="ei">${ic(icon, 26)}</div><b>${title}</b><p class="sm">${text}</p>${act || ''}</div>`;
const chipCb = (name, val, label, checked, dis) => `<label class="chip"><input type="checkbox" name="${name}" value="${val}" ${checked ? 'checked' : ''} ${dis ? 'disabled' : ''}><span>${label}</span></label>`;
const choice = (name, val, title, desc, checked, dis) => `<label class="choice"><input type="radio" name="${name}" value="${val}" ${checked ? 'checked' : ''} ${dis ? 'disabled' : ''}><span class="cx"><span class="dot"></span><span><b>${title}</b><small>${desc}</small></span></span></label>`;

/* ---------- dữ liệu ---------- */
const BANK = window.BANK || { modules: {} };
const MODS = Object.keys(BANK.modules);
const EX = BANK.exams || { total: 0, list: [] };   // đề IUH thật đã ghi nhận (src/de-thuc.json)
const PR = BANK.practice || [];                    // đề thực hành PDF quét từ ../de-thuc-hanh
const OFF = BANK.official || null;                 // đề mẫu IUH chính thức (src/de-mau-iuh.json)
const OFF_ID = 'iuh-mau';
if (OFF) PR.unshift({ id: OFF_ID, mod: 'Đề mẫu IUH', no: 0, title: OFF.title, min: OFF.min, file: OFF.files[0].file, name: OFF.files[0].path.split('/').pop(), kb: 0, src: OFF.src, official: true });
const prById = id => PR.find(p => p.id === id);
const prHref = p => encodeURI(p.file);
const IUH_PHASES = [['Windows', 10], ['Word', 30], ['PowerPoint', 10], ['Excel', 30], ['Kiểm tra lại', 10]];   // 90 phút, gợi ý của app
const secScore = s => Math.round(s.items.reduce((a, i) => a + (S.off && S.off[i.id] ? i.p : 0), 0) * 100) / 100;
const offScore = () => Math.round(OFF.sections.reduce((a, s) => a + secScore(s), 0) * 100) / 100;
const QS = [], CS = [];
MODS.forEach(m => {
  (BANK.modules[m].questions || []).forEach(x => QS.push(Object.assign({}, x, { m, id: m + '-' + hash(x.q), de: x.de || [] })));
  (BANK.modules[m].cards || []).forEach(x => CS.push(Object.assign({}, x, { m, id: m + '-' + hash(x.front) })));
});
const qOf = m => QS.filter(x => x.m === m);
const QMAP = new Map(QS.map(q => [q.id, q]));

/* ---------- tần suất trong đề thật ---------- */
// Chỉ có nghĩa khi EX.total > 0. Tần suất = số đề có câu này / tổng số đề đã ghi nhận.
const FREQ_ON = EX.total > 0 && QS.some(x => x.de.length);
const pctOf = n => Math.round(n / EX.total * 100);
const freqTag = x => (EX.total && x.de.length) ? badge(`Gặp ${x.de.length}/${EX.total} đề (${pctOf(x.de.length)}%)`, 'warn', 'Số đề IUH thật đã ghi nhận có câu này') : '';
function topicFreq() {
  const by = {};
  QS.forEach(x => {
    if (!x.de.length) return;
    const k = x.m + ' · ' + (x.topic || '(không rõ chủ đề)');
    const s = by[k] || (by[k] = new Set());
    x.de.forEach(d => s.add(d));   // số đề có ít nhất 1 câu thuộc chủ đề
  });
  return Object.keys(by).map(k => ({ k, n: by[k].size })).sort((a, b) => b.n - a.n || a.k.localeCompare(b.k, 'vi'));
}

/* ---------- lặp lại ngắt quãng ---------- */
function rate(store, id, ok) {
  const r = store[id] || (store[id] = { box: 0, due: 0, seen: 0, right: 0, wrong: 0 });
  r.seen++;
  if (ok) { r.right++; r.box = Math.min(r.box + 1, 4); } else { r.wrong++; r.box = 0; }
  r.due = today() + INT[r.box];
  save();
}
const isDue = (store, id) => store[id] && store[id].due <= today();
function buildQueue(items, store, mode, n) {
  let pool = items.slice();
  if (mode === 'wrong') pool = pool.filter(x => store[x.id] && store[x.id].wrong > 0 && store[x.id].box < 4);
  if (mode === 'random') return shuffle(pool).slice(0, n);
  if (mode === 'freq') {   // câu hay gặp trong đề thật trước, cùng tần suất thì câu đến hạn trước
    return shuffle(pool.filter(x => x.de && x.de.length))
      .sort((a, b) => b.de.length - a.de.length || (isDue(store, b.id) ? 1 : 0) - (isDue(store, a.id) ? 1 : 0))
      .slice(0, n);
  }
  const due = pool.filter(x => isDue(store, x.id)).sort((a, b) => store[a.id].due - store[b.id].due);
  const fresh = shuffle(pool.filter(x => !store[x.id]));
  const later = shuffle(pool.filter(x => store[x.id] && !isDue(store, x.id)));
  return due.concat(fresh, later).slice(0, n);
}
const pickedMods = () => $$('input[name=mod]:checked').map(i => i.value);
const modChips = (counter, all) => `<div class="chips" role="group" aria-label="Chọn mô đun">${MODS.map(m => chipCb('mod', m, `${m} ${NAMES[m] || ''} <small class="mut">(${counter(m)})</small>`, all !== false)).join('')}</div>`;

/* ---------- lộ trình ---------- */
// [tên, việc cần làm, tab mở nhanh]
const PLAN = [
  ['IU01: Hiểu biết CNTT', ['Đọc giao-trinh/IU01.pdf', 'Làm 30 câu IU01 trong tab Trắc nghiệm'], 'quiz'],
  ['IU02: Windows', ['Đọc IU02.pdf', 'Tự tạo folder, shortcut, tìm kiếm, chụp màn hình, nén/giải nén trên máy', 'Ôn thẻ IU02'], 'cards'],
  ['IU06: Internet + gộp trắc nghiệm', ['Đọc IU06.pdf', 'Làm trắc nghiệm IU01 + IU02 + IU06'], 'quiz'],
  ['Word 1', ['Định dạng ký tự/đoạn, tab, bullet, chèn ảnh, khổ giấy', 'Đọc IU03.pdf'], 'prac'],
  ['Word 2 + nhận thẻ thi', ['Bảng biểu, header/footer, đánh số trang, trang bìa, thuộc tính tài liệu', 'Nhận thẻ dự thi tại Cổng 4 (10.000đ)'], 'prac'],
  ['Đề Word', ['Làm 4 đề trong de-thuc-hanh/thuc-hanh-word, bấm giờ', 'Ghi lỗi vào Sổ lỗi'], 'prac'],
  ['Excel 1', ['Nhập liệu, định dạng ngày/tiền tệ, địa chỉ tuyệt đối ($), header/footer'], 'prac'],
  ['Excel 2: hàm thống kê', ['SUM, AVERAGE, MAX, MIN, COUNT, RANK, ROUND'], 'cards'],
  ['Excel 3: hàm điều kiện', ['IF, AND, OR, SUMIF, COUNTIF'], 'cards'],
  ['Excel 4: hàm chuỗi và ngày', ['LEFT, RIGHT, MID, LEN, TODAY, DAY, MONTH, YEAR'], 'cards'],
  ['Excel 5: dò tìm + biểu đồ', ['VLOOKUP, HLOOKUP, sắp xếp, lọc, biểu đồ'], 'prac'],
  ['Đề Excel', ['Làm 5 đề Excel (đề 1–5), bấm giờ', 'Ghi lỗi vào Sổ lỗi'], 'prac'],
  ['PowerPoint 1', ['Slide Master, nền slide, chèn ảnh/bảng/biểu đồ, hiệu ứng chuyển slide, animation'], 'prac'],
  ['PowerPoint 2 + liên kết Excel', ['Chèn bảng và biểu đồ liên kết từ Excel', 'Làm 5 đề PowerPoint'], 'prac'],
  ['Thi thử 1: đề mẫu IUH', ['Làm Đề mẫu IUH (90 phút, tab Đề thực hành), chấm bằng checklist', 'Ghi lỗi vào Sổ lỗi'], 'prac'],
  ['Sửa lỗi', ['Luyện lại phần yếu nhất (Excel hoặc Word)', 'Ôn Sổ lỗi'], 'errors'],
  ['Thi thử 2', ['Thi thử đề mau3 (120 phút)'], 'prac'],
  ['Thi thử 3', ['Thi thử đề mau4, rồi sửa lỗi'], 'prac'],
  ['Ôn trắc nghiệm tổng', ['Làm lần lượt các Đề trắc nghiệm (tab Đề trắc nghiệm), mỗi đề 20 câu, ôn lại câu sai', 'Thi thử lý thuyết 30 câu/30 phút', 'Thi thử đề mau5 nếu còn sức'], 'tn'],
  ['Chốt', ['Ôn nhẹ các lỗi hay sai, chuẩn bị CCCD + thẻ dự thi + bút bi', 'Ngủ sớm, không học thêm kiến thức mới'], 'errors'],
  ['NGÀY THI', ['Có mặt trước giờ thi 30 phút', 'Thực hành 17h45, lý thuyết 19h15 (theo thông báo, hãy kiểm tra lại thẻ dự thi)'], null]
];
const planDay = i => dateToDay(S.examDate) - (PLAN.length - 1 - i);

/* ---------- trạng thái phiên ---------- */
let tab = 'home';
let quiz = null;      // phiên trắc nghiệm tự do
let quizPre = null;   // chế độ chọn sẵn khi mở tab Trắc nghiệm
let deck = null;      // phiên thẻ
let mock = null;      // thi thử lý thuyết
let tick = null;
let KEYS = {};        // phím tắt của màn hình hiện tại

/* ---------- khung ứng dụng ---------- */
const NAVI = { home: ['Tổng quan', 'home'], plan: ['Lộ trình', 'calendar'], quiz: ['Trắc nghiệm', 'quiz'], tn: ['Đề trắc nghiệm', 'exam'], cards: ['Thẻ nhớ', 'cards'], prac: ['Đề thực hành', 'prac'], mock: ['Thi thử', 'timer'], errors: ['Sổ lỗi', 'book'] };
const GROUPS = [[null, ['home', 'plan']], ['Lý thuyết', ['quiz', 'tn', 'cards']], ['Thực hành', ['prac']], ['Thi thử và theo dõi', ['mock', 'errors']]];
const BOTTOM = ['home', 'quiz', 'tn', 'prac'];
const MORE = ['plan', 'cards', 'mock', 'errors'];
const BN = { home: 'Tổng quan', quiz: 'Luyện tập', tn: 'Đề thi', prac: 'Thực hành' };   // nhãn ngắn cho thanh dưới
const navItem = (k, cls, extra) => `<a href="#${k}" class="${cls}${tab === k ? ' on' : ''}" data-tab="${k}"${tab === k ? ' aria-current="page"' : ''}${extra || ''} title="${NAVI[k][0]}">${ic(NAVI[k][1], cls === 'bn' ? 22 : 20)}<span>${cls === 'bn' && BN[k] ? BN[k] : NAVI[k][0]}</span></a>`;
function renderShell() {
  $('#logoS').innerHTML = $('#logoT').innerHTML = ic('logo', 22);
  $('#tabs').innerHTML = GROUPS.map(g => (g[0] ? `<div class="nav-g">${g[0]}</div>` : '') + g[1].map(k => navItem(k, 'nav-i')).join('')).join('');
  const moreOn = MORE.includes(tab);
  $('#bnav').innerHTML = BOTTOM.map(k => navItem(k, 'bn')).join('') + `<button class="bn${moreOn ? ' on' : ''}" id="bmore" type="button" aria-haspopup="dialog">${ic('more', 22)}<span>Khác</span></button>`;
  $('#bmore').onclick = openSheet;
  const left = examLeft(), txt = left > 0 ? `Còn ${left} ngày đến kỳ thi` : left === 0 ? 'Hôm nay là ngày thi' : 'Đã qua ngày thi';
  const cls = 'exam-chip' + (left === 0 ? ' today' : left > 0 && left <= 3 ? ' urgent' : '');
  const short = left > 0 ? `Còn ${left} ngày` : txt, rest = left > 0 ? ` đến kỳ thi (${dayFmt(dateToDay(S.examDate))})` : ` (${dayFmt(dateToDay(S.examDate))})`;
  [$('#count'), $('#countS')].forEach(el => { el.className = cls; el.innerHTML = ic('clock', 15) + `<span>${short}<span class="cl">${rest}</span></span>`; });
  paintTheme(); paintSave();
}
function openSheet() {
  const sh = $('#sheet'), prev = document.activeElement;
  sh.innerHTML = `<div class="sheet-bd" data-x></div><div class="sheet-p" role="dialog" aria-modal="true" aria-label="Các mục khác"><div class="grab"></div><h2>Các mục khác</h2>${MORE.map(k => navItem(k, 'nav-i')).join('')}</div>`;
  sh.hidden = false; document.body.classList.add('noscroll');
  const close = () => { sh.hidden = true; sh.innerHTML = ''; document.body.classList.remove('noscroll'); document.removeEventListener('keydown', kd, true); if (prev && prev.focus) prev.focus(); };
  const kd = e => { if (e.key === 'Escape') { e.preventDefault(); close(); } };
  document.addEventListener('keydown', kd, true);
  sh.querySelector('[data-x]').onclick = close;
  $$('a', sh).forEach(a => a.addEventListener('click', () => { document.body.classList.remove('noscroll'); document.removeEventListener('keydown', kd, true); sh.hidden = true; }));
  $('a', sh).focus();
}
function applyTheme() {
  const r = document.documentElement;
  if (S.theme === 'light' || S.theme === 'dark') r.setAttribute('data-theme', S.theme); else r.removeAttribute('data-theme');
  const dark = S.theme === 'dark' || (S.theme !== 'light' && window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches);
  const m = $('meta[name=theme-color]'); if (m) m.setAttribute('content', dark ? '#0b0f17' : '#f3f5fa');
}
function paintTheme() {
  const b = $('#theme'), lab = { auto: 'Tự động theo hệ thống', light: 'Sáng', dark: 'Tối' }[S.theme] || 'Tự động theo hệ thống';
  b.innerHTML = ic(S.theme === 'dark' ? 'moon' : S.theme === 'light' ? 'sun' : 'auto', 20);
  b.setAttribute('aria-label', 'Giao diện: ' + lab + '. Bấm để đổi'); b.title = 'Giao diện: ' + lab;
}
$('#theme').onclick = () => { S.theme = { auto: 'light', light: 'dark', dark: 'auto' }[S.theme] || 'light'; save(); applyTheme(); paintTheme(); toast('Giao diện: ' + { auto: 'tự động theo hệ thống', light: 'sáng', dark: 'tối' }[S.theme], 'info', 1800); };

const VIEWS = {};
function setTab(t) { tab = t; render(); window.scrollTo(0, 0); const m = $('#view'); if (m) m.focus({ preventScroll: true }); }
function go(t) { const same = location.hash === '#' + t; tab = t; if (same) setTab(t); else location.hash = t; }   // đặt tab ngay để code gọi kèm (vd tnStart) vẽ đúng màn hình
window.addEventListener('hashchange', () => { const t = location.hash.slice(1); if (VIEWS[t]) setTab(t); });
document.addEventListener('click', e => {
  const t = e.target.closest('[data-tab]');
  if (t && t.tagName !== 'A') { e.preventDefault(); go(t.dataset.tab); }
  else if (t && !e.defaultPrevented && location.hash === '#' + t.dataset.tab) { e.preventDefault(); setTab(t.dataset.tab); }
});
document.addEventListener('keydown', e => {
  if (e.ctrlKey || e.metaKey || e.altKey || e.defaultPrevented) return;
  if (/^(INPUT|TEXTAREA|SELECT)$/.test((e.target.tagName || '')) && e.key !== 'Enter') return;
  if (!$('#modal').hidden || !$('#sheet').hidden) return;
  const fn = KEYS[e.key];
  if (fn && !(e.key === 'Enter' && /^(BUTTON|A|INPUT|SELECT|TEXTAREA)$/.test(e.target.tagName))) { e.preventDefault(); fn(); }
});
function saveBanner() {
  return `<div class="alert bad" role="alert">${ic('alert', 20)}<div class="a-body"><b>Trình duyệt không cho lưu dữ liệu.</b> Có thể bạn đang dùng chế độ ẩn danh hoặc đã chặn lưu trữ cho trang này. Kết quả làm bài sẽ mất khi đóng trang. Hãy mở bằng cửa sổ thường, hoặc tải file sao lưu ở mục Tổng quan sau mỗi buổi học.</div></div>`;
}
function render() {
  KEYS = {}; clearInterval(tick); tick = null;
  document.body.classList.remove('focus');
  renderShell();
  const v = $('#view');
  VIEWS[tab](v);
  if (!saveState.ok) v.insertAdjacentHTML('afterbegin', saveBanner());
  document.title = (NAVI[tab] ? NAVI[tab][0] + ' · ' : '') + BASE_TITLE;
}

/* ---------- tổng quan ---------- */
VIEWS.home = function (v) {
  const doneQ = Object.values(S.q).reduce((a, r) => a + r.seen, 0);
  const right = Object.values(S.q).reduce((a, r) => a + r.right, 0);
  const dueQ = QS.filter(x => isDue(S.q, x.id)).length;
  const dueC = CS.filter(x => isDue(S.c, x.id)).length;
  const lt = S.mocks.filter(m => m.type === 'lt');
  const best = lt.length ? Math.max.apply(null, lt.map(m => m.score)) : null;
  const done = PLAN.filter((_, i) => S.plan[i]).length;
  const idx = PLAN.findIndex((_, i) => planDay(i) === today());
  const thDone = new Set(S.mocks.filter(m => m.type === 'th' && m.exam).map(m => m.exam)).size;
  const tnDone = TNX.filter(x => tnAtts(x.n).length).length, draft = TN().draft;
  const nextTn = TNX.find(x => !tnAtts(x.n).length);
  const left = examLeft();

  const hero = `<section class="hero" aria-label="Việc hôm nay"><div>
      ${badge(idx >= 0 ? `Hôm nay · Ngày ${idx + 1}/${PLAN.length} · ${dayFmt(planDay(idx))}` : 'Hôm nay', 'inv')}
      <h2>${idx >= 0 ? esc(PLAN[idx][0]) : 'Hôm nay chưa có việc trong lộ trình'}</h2>
      ${idx >= 0 ? `<ul>${PLAN[idx][1].map(t => `<li>${esc(t)}</li>`).join('')}</ul>` : '<p>Ngày thi đã được đặt lệch với hôm nay. Bạn có thể chỉnh lại ngày thi ở mục Lộ trình.</p>'}
      <div class="row">${idx >= 0 && PLAN[idx][2] ? `<button class="btn inv" data-tab="${PLAN[idx][2]}">${ic('play', 16)} Bắt đầu</button>` : ''}<button class="btn ghost-inv" data-tab="plan">Xem lộ trình</button></div></div>
    <div class="hero-r"><div class="count-num">${Math.max(0, left)}</div><div>${left > 0 ? 'ngày đến kỳ thi' : left === 0 ? 'Hôm nay thi' : 'đã qua ngày thi'}<br><small>${dayFmt(dateToDay(S.examDate))}</small></div></div></section>`;

  const stats = [
    ['calendar', `${done}/${PLAN.length}`, 'Ngày lộ trình đã xong'],
    ['exam', `${tnDone}/${TNX.length}`, 'Đề trắc nghiệm đã làm'],
    ['prac', `${thDone}/${PR.length}`, 'Đề thực hành đã làm'],
    ['quiz', doneQ ? Math.round(right / doneQ * 100) + '%' : '–', `Tỉ lệ đúng (${doneQ} lượt)`],
    ['star', best == null ? '–' : best.toFixed(1), 'Điểm thi thử lý thuyết cao nhất'],
    ['refresh', `${dueQ + dueC}`, `Cần ôn hôm nay (${dueQ} câu, ${dueC} thẻ)`]
  ].map(s => `<div class="stat"><span class="si">${ic(s[0], 22)}</span><div><b>${s[1]}</b><span>${s[2]}</span></div></div>`).join('');

  const qa = [
    draft ? ['exam', `Tiếp tục Đề ${draft.n}`, `Đã trả lời ${draft.ans.filter(a => a >= 0).length}/${draft.ids.length} câu`, 'tn-resume']
      : nextTn ? ['exam', `Làm Đề trắc nghiệm ${nextTn.n}`, '20 câu, chấm điểm thang 10', 'tn-start:' + nextTn.n] : ['exam', 'Đề trắc nghiệm', 'Làm lại các đề để nâng điểm', 'tab:tn'],
    ['bolt', 'Luyện tập thông minh', dueQ ? `${dueQ} câu đến hạn ôn` : 'Câu mới và câu cần ôn', 'tab:quiz'],
    ['prac', 'Đề mẫu thực hành IUH', '90 phút, có checklist chấm điểm', 'tab:prac'],
    ['cards', 'Ôn thẻ nhớ', dueC ? `${dueC} thẻ đến hạn ôn` : 'Hàm Excel, phím tắt, thao tác', 'tab:cards']
  ].map(a => `<button class="qa" data-act="${a[3]}" type="button"><span class="qi">${ic(a[0], 22)}</span><span><b>${a[1]}</b><small>${a[2]}</small></span><span class="go">${ic('right', 18)}</span></button>`).join('');

  const mrows = MODS.map(m => {
    let s = 0, r = 0; qOf(m).forEach(x => { const z = S.q[x.id]; if (z) { s += z.seen; r += z.right; } });
    const pct = s ? Math.round(r / s * 100) : 0;
    return `<div class="meter"><div class="row sp sm"><b>${m} <span class="mut" style="font-weight:500">${NAMES[m] || ''}</span></b><span class="mut">${s ? pct + '% đúng · ' + s + ' lượt' : 'chưa làm'}</span></div>${bar(pct, pct >= 70 ? 'ok' : '')}</div>`;
  }).join('');

  let fhtml;
  if (!FREQ_ON) {
    fhtml = `<div class="alert info">${ic('info', 20)}<div class="a-body"><b>Chưa có xác suất xuất hiện.</b> Trung tâm Tin học IUH không công bố đề các năm, còn ${QS.length} câu trong app do Claude soạn từ giáo trình, không phải câu thi thật. Khi có đề thật, ghi vào <code>src/de-thuc.json</code> và gắn field <code>de</code> cho câu hỏi (xem README), rồi chạy lại <code>build_data.py</code>.</div></div>`;
  } else {
    const tf = topicFreq().slice(0, 12), hot = QS.filter(x => x.de.length).sort((a, b) => b.de.length - a.de.length).slice(0, 10);
    fhtml = `<p class="mut sm">Tính trên ${EX.total} đề IUH thật đã ghi nhận${EX.total < 5 ? '. <b>Mẫu nhỏ, chỉ nên coi là gợi ý ưu tiên</b>' : ''}. Đề ghi lại từ trí nhớ thường thiếu câu, nên tần suất thật có thể cao hơn.</p>
    <p class="b">Chủ đề xuất hiện nhiều nhất</p>
    ${tf.map(t => `<div class="stack" style="margin-bottom:10px"><div class="row sp sm"><span>${esc(t.k)}</span><span class="mut">${t.n}/${EX.total} đề (${pctOf(t.n)}%)</span></div>${bar(pctOf(t.n))}</div>`).join('')}
    <p class="b" style="margin-top:16px">Câu hay gặp nhất</p>
    ${hot.map(x => `<div class="li"><div class="grow"><div class="row">${badge(x.m, 'pri')}${freqTag(x)}</div><div style="margin-top:4px">${esc(x.q)}</div></div></div>`).join('')}`;
  }
  const dayBk = S.lastBackup ? Math.floor((Date.now() - S.lastBackup) / 864e5) : null;
  const hasData = doneQ > 0 || S.tn.attempts.length > 0 || S.mocks.length > 0;
  const bk = `<section class="card"><div class="card-h"><h2>Sao lưu và khôi phục</h2>${S.lastBackup ? badge(dayBk === 0 ? 'Đã sao lưu hôm nay' : `Sao lưu ${dayBk} ngày trước`, dayBk >= 3 && hasData ? 'warn' : 'ok') : badge(hasData ? 'Chưa sao lưu lần nào' : 'Chưa có dữ liệu', hasData ? 'warn' : '')}</div>
    <p class="mut sm">Tiến độ và kết quả lưu trong trình duyệt này (localStorage). Xoá "cookies và dữ liệu trang" sẽ mất sạch, đổi sang trình duyệt khác cũng không còn. Hãy tải file sao lưu sau mỗi buổi học.</p>
    <div class="row"><button class="btn sec" id="exp" type="button">${ic('download', 18)} Tải file sao lưu</button><button class="btn sec" id="imp" type="button">${ic('upload', 18)} Khôi phục từ file</button><input type="file" id="impf" accept="application/json,.json" class="hide"><button class="btn ghost" id="rst" type="button" style="color:var(--bad)">${ic('trash', 18)} Xoá toàn bộ tiến độ</button></div></section>`;

  v.innerHTML = pageHead('Tổng quan', 'Theo dõi tiến độ ôn thi và bắt đầu nhanh việc cần làm.') + hero + `<div class="stats">${stats}</div>
    <h2 class="sr">Bắt đầu nhanh</h2><div class="grid g2" style="margin-bottom:16px">${qa}</div>
    <section class="card"><div class="card-h"><h2>Độ chính xác theo mô đun</h2></div>${QS.length ? mrows : '<p class="mut">Chưa có dữ liệu câu hỏi.</p>'}</section>
    <section class="card"><div class="card-h"><h2>Tần suất trong đề thật</h2></div>${fhtml}</section>` + bk;

  $$('[data-act]', v).forEach(b => b.onclick = () => {
    const [k, a] = b.dataset.act.split(':');
    if (k === 'tab') go(a); else if (k === 'tn-start') { go('tn'); tnStart(+a); } else if (k === 'tn-resume') { go('tn'); tnResume(); }
  });
  $('#exp').onclick = () => {
    const blob = new Blob([JSON.stringify(S, null, 1)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'iuh-tien-do-' + new Date().toISOString().slice(0, 10) + '.json';
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    S.lastBackup = Date.now(); save(); toast('Đã tải file sao lưu', 'ok'); render();
  };
  $('#imp').onclick = () => $('#impf').click();
  $('#impf').onchange = e => {
    const f = e.target.files[0]; if (!f) return;
    const rd = new FileReader();
    rd.onload = async () => {
      let o; try { o = JSON.parse(rd.result); if (!o || typeof o !== 'object' || Array.isArray(o)) throw new Error('x'); } catch (x) { toast('File không phải bản sao lưu hợp lệ', 'bad'); return; }
      if (!await ask({ title: 'Khôi phục tiến độ?', text: 'Tiến độ hiện tại trong trình duyệt sẽ bị thay bằng nội dung của file.', ok: 'Khôi phục', danger: true })) return;
      S = Object.assign(defaults(), o); save(); applyTheme(); render(); toast('Đã khôi phục tiến độ', 'ok');
    };
    rd.readAsText(f);
  };
  $('#rst').onclick = async () => {
    if (!await ask({ title: 'Xoá toàn bộ tiến độ?', text: 'Mọi kết quả trắc nghiệm, đề đã làm, checklist và sổ lỗi sẽ bị xoá và không khôi phục được (trừ khi bạn đã tải file sao lưu).', ok: 'Xoá hết', danger: true })) return;
    const th = S.theme; S = defaults(); S.theme = th; save(); render(); toast('Đã xoá tiến độ', 'ok');
  };
};

/* ---------- lộ trình ---------- */
VIEWS.plan = function (v) {
  const done = PLAN.filter((_, i) => S.plan[i]).length, t = today(), pct = Math.round(done / PLAN.length * 100);
  v.innerHTML = pageHead('Lộ trình ôn thi', `${PLAN.length} ngày, tính lùi từ ngày thi. Đổi ngày thi thì cả lộ trình dịch theo.`) +
    `<section class="card"><div class="row sp" style="align-items:flex-end"><div class="field" style="margin:0;min-width:180px"><label for="exam">Ngày thi</label><input type="date" id="exam" value="${esc(S.examDate)}"></div>
      <div class="grow" style="min-width:200px"><div class="row sp sm"><b>${done}/${PLAN.length} ngày đã xong</b><span class="mut">${pct}%</span></div>${bar(pct, 'ok')}</div></div></section>
    <ol class="tl">${PLAN.map((p, i) => {
      const d = planDay(i), isT = d === t;
      return `<li class="tl-i ${isT ? 'today' : ''} ${S.plan[i] ? 'done' : ''}"><label class="cbw" title="Đánh dấu đã xong"><input type="checkbox" class="cb" data-d="${i}" ${S.plan[i] ? 'checked' : ''} aria-label="Ngày ${i + 1} đã xong"></label>
        <div class="tl-b"><div class="row sp"><span class="xs mut b">NGÀY ${i + 1} · ${dayFmt(d)}</span>${isT ? badge('Hôm nay', 'pri') : ''}</div><h3>${esc(p[0])}</h3>
        <ul>${p[1].map(x => `<li>${esc(x)}</li>`).join('')}</ul>${p[2] ? `<div class="row"><button class="btn sec sm" data-tab="${p[2]}" type="button">Mở mục này ${ic('right', 14)}</button></div>` : ''}</div></li>`;
    }).join('')}</ol>`;
  $('#exam').onchange = e => { if (e.target.value) { S.examDate = e.target.value; save(); render(); toast('Đã đổi ngày thi', 'ok', 1800); } };
  $$('[data-d]', v).forEach(c => c.onchange = () => { S.plan[c.dataset.d] = c.checked; save(); render(); });
};

/* ---------- màn làm bài dùng chung (Đề trắc nghiệm, Thi thử lý thuyết) ---------- */
// cfg: {label, items:[{q, opts}], ans, cur, timer():{text,low,expired}, onPick(j), onGo(i), onSubmit(), onExit?, onTimeout?}
function examUI(v, cfg) {
  document.body.classList.add('focus');
  const items = cfg.items, n = items.length, cur = cfg.cur, it = items[cur], ans = cfg.ans;
  const answered = () => ans.filter(a => a >= 0).length;
  v.innerHTML = `<div class="exam-h"><div class="row sp"><div class="row"><b>${esc(cfg.label)}</b><span class="badge" id="xa">${answered()}/${n} đã trả lời</span></div>
      <div class="row"><span class="timer" id="tm">${ic('clock', 16)}<span id="tmt">--:--</span></span>${cfg.onExit ? `<button class="btn sec sm" id="xexit" type="button">${ic('x', 16)} Thoát, giữ bài nháp</button>` : ''}</div></div>
      <div style="margin-top:10px">${bar(Math.round(answered() / n * 100))}</div></div>
    <section class="card"><div class="qnav" role="group" aria-label="Danh sách câu hỏi">${items.map((_, i) => `<button class="qn ${ans[i] >= 0 ? 'a' : ''} ${i === cur ? 'cur' : ''}" data-n="${i}" type="button" aria-label="Câu ${i + 1}${ans[i] >= 0 ? ', đã trả lời' : ''}"${i === cur ? ' aria-current="true"' : ''}>${i + 1}</button>`).join('')}</div>
      <div class="legend"><span><i></i>Chưa làm</span><span><i class="a"></i>Đã trả lời</span><span><i class="cur"></i>Đang xem</span></div></section>
    <section class="card"><div class="row">${badge(`Câu ${cur + 1}/${n}`, 'pri')}</div>
      <h2 class="q-text" id="qh" tabindex="-1">${esc(it.q)}</h2>
      <div role="group" aria-labelledby="qh">${it.opts.map((o, j) => `<button class="qopt ${ans[cur] === j ? 'sel' : ''}" data-j="${j}" type="button" aria-pressed="${ans[cur] === j}"><span class="k">${'ABCD'[j]}</span><span class="t">${esc(o)}</span></button>`).join('')}</div>
      <p class="kbd" style="margin:10px 0 0">Phím tắt: <kbd>A</kbd>–<kbd>D</kbd> hoặc <kbd>1</kbd>–<kbd>4</kbd> chọn đáp án · <kbd>←</kbd> <kbd>→</kbd> chuyển câu.</p></section>
    <div class="actionbar"><button class="btn sec fixed" id="xpv" type="button" ${cur === 0 ? 'disabled' : ''} aria-label="Câu trước">${ic('left', 18)}<span class="lbl">Trước</span></button>
      <button class="btn sec" id="xnx" type="button" ${cur === n - 1 ? 'disabled' : ''}><span>Câu sau</span>${ic('right', 18)}</button><span class="sp"></span><button class="btn" id="xsub" type="button">Nộp bài</button></div>`;
  const paint = () => {
    $$('[data-j]', v).forEach((b, j) => { const on = ans[cur] === j; b.classList.toggle('sel', on); b.setAttribute('aria-pressed', on); });
    const qn = $$('.qn', v)[cur]; qn.classList.add('a'); qn.setAttribute('aria-label', `Câu ${cur + 1}, đã trả lời`);
    $('#xa', v).textContent = `${answered()}/${n} đã trả lời`;
    $('.exam-h .bar>i', v).style.width = Math.round(answered() / n * 100) + '%';
    $('.exam-h .bar', v).setAttribute('aria-valuenow', Math.round(answered() / n * 100));
  };
  const pick = j => { if (j >= it.opts.length) return; cfg.onPick(j); paint(); };
  $$('[data-j]', v).forEach(b => b.onclick = () => pick(+b.dataset.j));
  $$('[data-n]', v).forEach(b => b.onclick = () => cfg.onGo(+b.dataset.n));
  $('#xpv').onclick = () => cfg.onGo(cur - 1);
  $('#xnx').onclick = () => cfg.onGo(cur + 1);
  $('#xsub').onclick = async () => {
    const blank = n - answered();
    if (blank && !await ask({ title: 'Nộp bài?', text: `Còn ${blank} câu chưa trả lời, các câu bỏ trống tính là sai. Bạn muốn nộp bài ngay?`, ok: 'Nộp bài', cancel: 'Làm tiếp' })) return;
    cfg.onSubmit();
  };
  if (cfg.onExit) $('#xexit').onclick = cfg.onExit;
  ['a', 'b', 'c', 'd'].forEach((k, j) => { KEYS[k] = KEYS[k.toUpperCase()] = KEYS[String(j + 1)] = () => pick(j); });
  KEYS.ArrowRight = () => { if (cur < n - 1) cfg.onGo(cur + 1); };
  KEYS.ArrowLeft = () => { if (cur > 0) cfg.onGo(cur - 1); };
  let fired = false;
  const upd = () => {
    const el = $('#tmt'); if (!el) { clearInterval(tick); return; }
    const t = cfg.timer(); el.textContent = t.text; $('#tm').classList.toggle('low', !!t.low);
    if (t.expired && !fired && cfg.onTimeout) { fired = true; clearInterval(tick); cfg.onTimeout(); }
  };
  upd(); tick = setInterval(upd, 500);
  if (cfg.focusQ) $('#qh').focus({ preventScroll: true });
}
function reviewCard(i, r) {
  const ok = r.pick === r.ans;
  return `<article class="card rv ${ok ? 'ok' : 'no'}"><div class="row sp"><div class="row">${badge(r.m, 'pri')}${r.topic ? badge(esc(r.topic)) : ''}</div>${ok ? badge('Đúng', 'ok') : badge(r.pick < 0 ? 'Bỏ trống' : 'Sai', 'bad')}</div>
    <h3 class="q-text"><span class="mut">Câu ${i + 1}.</span> ${esc(r.q)}</h3>
    ${r.opts.map((o, j) => `<div class="qopt ${j === r.ans ? 'ok' : j === r.pick ? 'no' : ''}"><span class="k">${'ABCD'[j]}</span><span class="t">${esc(o)}</span><span class="mk">${j === r.ans ? '✓ Đúng' : j === r.pick ? '✕ Bạn chọn' : ''}</span></div>`).join('')}
    <div class="exp"><b>Giải thích.</b> ${esc(r.explain || '')}</div></article>`;
}
const verdict = sc => sc >= 5 ? badge('Trên ngưỡng 5/10', 'ok') : badge('Dưới ngưỡng 5/10', 'bad');

/* ---------- trắc nghiệm tự do ---------- */
VIEWS.quiz = function (v) {
  if (!QS.length) { v.innerHTML = pageHead('Trắc nghiệm') + emptyBox('quiz', 'Chưa có câu hỏi', 'Chạy build_data.py để tạo data.js.'); return; }
  if (!quiz) return quizSetup(v);
  if (quiz.i >= quiz.list.length) return quizEnd(v);
  document.body.classList.add('focus');
  const it = quiz.list[quiz.i], n = quiz.list.length;
  const opts = quiz.order.map(k => it.options[k]), ans = quiz.order.indexOf(it.answer);
  v.innerHTML = `<div class="exam-h"><div class="row sp"><div class="row"><b>Luyện tập</b>${badge(`${quiz.i + 1}/${n}`)}</div><button class="btn sec sm" id="stop" type="button">${ic('x', 16)} Dừng</button></div><div style="margin-top:10px">${bar(Math.round(quiz.i / n * 100))}</div></div>
    <section class="card"><div class="row">${badge(`${it.m} ${NAMES[it.m] || ''}`, 'pri')}${it.topic ? badge(esc(it.topic)) : ''}${freqTag(it)}</div>
      <h2 class="q-text" id="qh" tabindex="-1">${esc(it.q)}</h2>
      <div role="group" aria-labelledby="qh">${opts.map((o, k) => `<button class="qopt" data-k="${k}" type="button"><span class="k">${'ABCD'[k]}</span><span class="t">${esc(o)}</span><span class="mk"></span></button>`).join('')}</div>
      <div id="fb" aria-live="polite"></div>
      <p class="kbd" style="margin:10px 0 0">Phím tắt: <kbd>A</kbd>–<kbd>D</kbd> hoặc <kbd>1</kbd>–<kbd>4</kbd> chọn đáp án · <kbd>Enter</kbd> câu tiếp.</p></section>
    <div class="actionbar hide" id="ab"><button class="btn" id="nx" type="button">${quiz.i + 1 >= n ? 'Xem kết quả' : 'Câu tiếp'} ${ic('right', 18)}</button></div>`;
  const btns = $$('.qopt', v); let answered = false;
  const pick = k => {
    if (answered || k >= btns.length) return; answered = true;
    const ok = k === ans;
    btns.forEach((x, j) => { x.disabled = true; if (j === ans) { x.classList.add('ok'); $('.mk', x).textContent = '✓ Đúng'; } else if (j === k) { x.classList.add('no'); $('.mk', x).textContent = '✕ Bạn chọn'; } });
    rate(S.q, it.id, ok); if (ok) quiz.right++;
    $('#fb').innerHTML = `<div class="fb ${ok ? '' : 'bad'}">${ic(ok ? 'check' : 'x', 22)}<div><b>${ok ? 'Chính xác!' : 'Chưa đúng'}</b>${esc(it.explain || '')}</div></div>`;
    $('#ab').classList.remove('hide'); $('#nx').focus({ preventScroll: true });
  };
  btns.forEach((b, k) => b.onclick = () => pick(k));
  const next = () => { if (!answered) return; quiz.i++; quizPrep(); render(); window.scrollTo(0, 0); };
  $('#nx').onclick = next;
  $('#stop').onclick = async () => { if (answered || await ask({ title: 'Dừng phiên luyện tập?', text: 'Các câu đã trả lời vẫn được ghi nhận.', ok: 'Dừng', cancel: 'Tiếp tục' })) { quiz = null; render(); } };
  ['a', 'b', 'c', 'd'].forEach((c, j) => { KEYS[c] = KEYS[c.toUpperCase()] = KEYS[String(j + 1)] = () => pick(j); });
  KEYS.Enter = KEYS.ArrowRight = next;
};
function quizPrep() { if (quiz.i < quiz.list.length) quiz.order = shuffle([0, 1, 2, 3].slice(0, quiz.list[quiz.i].options.length)); }
function quizSetup(v) {
  const dueQ = QS.filter(x => isDue(S.q, x.id)).length;
  const wrong = QS.filter(x => S.q[x.id] && S.q[x.id].wrong > 0 && S.q[x.id].box < 4).length;
  const pre = quizPre || 'srs'; quizPre = null;
  v.innerHTML = pageHead('Luyện trắc nghiệm', 'Chọn mô đun và chế độ, mỗi câu có giải thích ngay sau khi trả lời.') +
    `<div class="stats" style="grid-template-columns:repeat(3,1fr)"><div class="stat"><div><b>${QS.length}</b><span>Câu trong ngân hàng</span></div></div><div class="stat"><div><b>${dueQ}</b><span>Đến hạn ôn</span></div></div><div class="stat"><div><b>${wrong}</b><span>Từng sai, chưa thuộc</span></div></div></div>
    <section class="card"><div class="card-h"><h2>Mô đun</h2><div class="row"><button class="btn ghost sm" id="all" type="button">Chọn tất cả</button><button class="btn ghost sm" id="none" type="button">Bỏ chọn</button></div></div>${modChips(m => qOf(m).length)}</section>
    <section class="card"><div class="card-h"><h2>Chế độ</h2></div><div class="choices">
      ${choice('mode', 'srs', 'Thông minh', 'Câu đến hạn ôn trước, rồi câu mới', pre === 'srs')}
      ${choice('mode', 'wrong', 'Chỉ câu từng sai', 'Ôn lại những câu bạn đã làm sai', pre === 'wrong')}
      ${choice('mode', 'random', 'Ngẫu nhiên', 'Trộn đều các câu đã chọn', pre === 'random')}
      ${choice('mode', 'freq', 'Hay gặp trong đề thật', FREQ_ON ? `${QS.filter(x => x.de.length).length} câu có dữ liệu` : 'Chưa có dữ liệu đề thật', pre === 'freq', !FREQ_ON)}</div></section>
    <section class="card"><div class="field" style="margin:0"><label for="n">Số câu mỗi phiên</label><div class="row"><div class="stepper"><button class="btn sec sm" id="mn" type="button" aria-label="Giảm">−</button><input type="number" id="n" value="20" min="5" max="100" inputmode="numeric"><button class="btn sec sm" id="pl" type="button" aria-label="Tăng">+</button></div>${[10, 20, 30, 50].map(k => `<button class="btn ghost sm" data-set="${k}" type="button">${k} câu</button>`).join('')}</div></div></section>
    <button class="btn block" id="go" type="button" style="min-height:52px;font-size:1.05rem">${ic('play', 18)} Bắt đầu luyện tập</button>`;
  $('#all').onclick = () => $$('input[name=mod]').forEach(i => i.checked = true);
  $('#none').onclick = () => $$('input[name=mod]').forEach(i => i.checked = false);
  const nEl = $('#n'), setN = k => { nEl.value = Math.max(5, Math.min(100, (+nEl.value || 20) + k)); };
  $('#mn').onclick = () => setN(-5); $('#pl').onclick = () => setN(5);
  $$('[data-set]', v).forEach(b => b.onclick = () => { nEl.value = b.dataset.set; });
  $('#go').onclick = () => {
    const mods = pickedMods(); if (!mods.length) { toast('Chọn ít nhất 1 mô đun', 'warn'); return; }
    const mode = $('input[name=mode]:checked').value;
    const list = buildQueue(QS.filter(x => mods.includes(x.m)), S.q, mode, Math.max(5, Math.min(100, +nEl.value || 20)));
    if (!list.length) { toast('Không có câu nào phù hợp chế độ này', 'warn'); return; }
    quiz = { list, i: 0, right: 0 }; quizPrep(); render(); window.scrollTo(0, 0);
  };
}
function quizEnd(v) {
  const n = quiz.list.length, pct = Math.round(quiz.right / n * 100), wrong = n - quiz.right;
  v.innerHTML = pageHead('Kết thúc phiên luyện tập') + `<section class="card tc"><div class="row" style="justify-content:center">${ring(pct, `${quiz.right}/${n}`, 'câu đúng', pct >= 50 ? 'ok' : 'bad', 150)}</div>
    <p class="mut" style="margin-top:12px">${pct}% đúng. ${wrong ? `${wrong} câu sai sẽ quay lại trong lịch ôn.` : 'Không có câu sai, rất tốt.'}</p>
    <div class="row" style="justify-content:center"><button class="btn" id="again" type="button">${ic('refresh', 18)} Phiên mới</button>${wrong ? `<button class="btn sec" id="redo" type="button">Ôn các câu từng sai</button>` : ''}</div></section>`;
  $('#again').onclick = () => { quiz = null; render(); };
  const r = $('#redo'); if (r) r.onclick = () => { quiz = null; quizPre = 'wrong'; render(); };
}

/* ---------- đề trắc nghiệm cố định: 20 câu/đề, đánh số, chấm điểm, lưu localStorage ---------- */
const TN_PER = 20;
const TNX = (() => {
  const n = Math.max(1, Math.floor(QS.length / TN_PER)), ex = Array.from({ length: n }, () => []);
  QS.forEach((q, k) => ex[k % n].push(q));   // chia lần lượt theo thứ tự ngân hàng: mỗi đề trải đủ mô đun và chủ đề, cố định giữa các lần mở app
  return ex.map((qs, i) => ({ n: i + 1, qs: qs.map(q => ({ q, h: hash(q.id + '#' + (i + 1)) })).sort((a, b) => a.h < b.h ? -1 : a.h > b.h ? 1 : 0).map(x => x.q) }));
})();
const TN = () => (S.tn && S.tn.attempts) ? S.tn : (S.tn = { attempts: [], draft: null });
const tnScore = a => Math.round(a.ok / a.total * 100) / 10;   // thang 10, 1 chữ số thập phân
const tnAtts = n => TN().attempts.map((a, i) => ({ a, i })).filter(x => x.a.n === n);
let tnRun = null;   // {mode:'do', n, ids, ans, cur, t0} hoặc {mode:'review', att, wrongOnly}

function tnSaveDraft() { const r = tnRun; TN().draft = { n: r.n, ids: r.ids, ans: r.ans, cur: r.cur, sec: Math.floor((Date.now() - r.t0) / 1000) }; save(); }
async function tnStart(n) {
  const T = TN();
  if (T.draft && !await ask({ title: 'Thay bài nháp?', text: `Đang có bài nháp Đề ${T.draft.n} (đã trả lời ${T.draft.ans.filter(a => a >= 0).length}/${T.draft.ids.length} câu). Bắt đầu Đề ${n} sẽ thay thế bài nháp đó.`, ok: 'Bắt đầu Đề ' + n, danger: true })) return;
  const x = TNX.find(e => e.n === n);
  tnRun = { mode: 'do', n, ids: x.qs.map(q => q.id), ans: x.qs.map(() => -1), cur: 0, t0: Date.now(), focusQ: true };
  tnSaveDraft(); render(); window.scrollTo(0, 0);
}
function tnResume() {
  const d = TN().draft;
  if (!d || !d.ids.every(id => QMAP.has(id))) { TN().draft = null; save(); toast('Bài nháp không còn khớp ngân hàng câu hỏi nên đã bỏ.', 'warn'); render(); return; }
  tnRun = { mode: 'do', n: d.n, ids: d.ids, ans: d.ans, cur: d.cur, t0: Date.now() - d.sec * 1000, focusQ: true };
  render(); window.scrollTo(0, 0);
}
function tnFinish() {
  const r = tnRun, qs = r.ids.map(id => QMAP.get(id));
  let ok = 0;
  qs.forEach((q, i) => { const good = r.ans[i] === q.answer; if (good) ok++; rate(S.q, q.id, good); });   // câu sai vào lịch ôn, tab Trắc nghiệm/Sổ lỗi dùng chung
  const att = { n: r.n, t: Date.now(), ids: r.ids, ans: r.ans, ok, total: qs.length, sec: Math.floor((Date.now() - r.t0) / 1000) };
  TN().attempts.push(att); TN().draft = null; save();
  tnRun = { mode: 'review', att, wrongOnly: false };
  render(); window.scrollTo(0, 0);
}
VIEWS.tn = function (v) {
  if (!TNX[0].qs.length) { v.innerHTML = pageHead('Đề trắc nghiệm') + emptyBox('exam', 'Chưa có câu hỏi', 'Chạy build_data.py để tạo data.js.'); return; }
  if (tnRun && tnRun.mode === 'do') return tnDo(v);
  if (tnRun && tnRun.mode === 'review') return tnReview(v);
  tnList(v);
};
function tnList(v) {
  const T = TN(), d = T.draft;
  const bests = TNX.map(x => tnAtts(x.n).map(y => tnScore(y.a))).filter(s => s.length).map(s => Math.max.apply(null, s));
  v.innerHTML = pageHead('Đề trắc nghiệm', `${QS.length} câu chia cố định thành ${TNX.length} đề, mỗi đề ${TN_PER} câu trộn các mô đun. Nộp bài để chấm điểm thang 10 và xem đáp án, giải thích.`) +
    (d ? `<div class="alert"><span>${ic('clock', 20)}</span><div class="a-body"><b>Đang làm dở Đề ${d.n}</b> (đã trả lời ${d.ans.filter(a => a >= 0).length}/${d.ids.length} câu).<div class="row" style="margin-top:8px"><button class="btn sm" id="tnres" type="button">Tiếp tục làm</button><button class="btn sec sm" id="tndrop" type="button">Bỏ bài nháp</button></div></div></div>` : '') +
    `<div class="stats s3"><div class="stat"><span class="si">${ic('exam', 22)}</span><div><b>${bests.length}/${TNX.length}</b><span>Đề đã làm</span></div></div>
      <div class="stat"><span class="si">${ic('star', 22)}</span><div><b>${bests.length ? (bests.reduce((a, b) => a + b, 0) / bests.length).toFixed(1) : '–'}</b><span>Điểm cao nhất trung bình /10</span></div></div>
      <div class="stat"><span class="si">${ic('refresh', 22)}</span><div><b>${T.attempts.length}</b><span>Lượt làm bài</span></div></div></div>
    <div class="exgrid">${TNX.map(x => {
      const at = tnAtts(x.n), cnt = {}; x.qs.forEach(q => { cnt[q.m] = (cnt[q.m] || 0) + 1; });
      const best = at.length ? Math.max.apply(null, at.map(y => tnScore(y.a))) : null, last = at.length ? at[at.length - 1].a : null;
      return `<article class="ex ${at.length ? 'done' : ''}"><div class="ex-top"><h3>Đề ${x.n}</h3>${at.length ? badge(`Cao nhất ${best}/10`, best >= 5 ? 'ok' : 'warn') : badge('Chưa làm')}</div>
        <p class="mut sm" style="margin:0">${x.qs.length} câu${at.length ? ` · làm ${at.length} lần · gần nhất ${tnScore(last)}/10 (${dtFmt(last.t)})` : ''}</p>
        <details class="inl"><summary>Chi tiết${at.length ? ' và lịch sử' : ''} ${ic('down', 14).replace('class="ic"', 'class="ic chev"')}</summary>
          <p class="xs mut" style="margin:6px 0">Thành phần: ${Object.keys(cnt).map(m => `${m}×${cnt[m]}`).join(' · ')}</p>
          ${at.slice().reverse().map(y => `<div class="hist"><span>${dtFmt(y.a.t)} · <b>${tnScore(y.a)}/10</b> (${y.a.ok}/${y.a.total}) · ${mmss(y.a.sec)}</span><button class="btn sec sm" data-rv="${y.i}" type="button">Xem lại</button></div>`).join('')}</details>
        <div class="ex-act"><button class="btn" data-start="${x.n}" type="button">${at.length ? ic('refresh', 16) + ' Làm lại' : ic('play', 16) + ' Làm đề'}</button></div></article>`;
    }).join('')}</div>
    <div class="alert info">${ic('info', 20)}<div class="a-body">Kết quả, lịch sử và bài làm dở lưu trong trình duyệt này. Đây là câu soạn từ giáo trình, không phải câu thi thật của IUH. Hãy tải file sao lưu ở mục Tổng quan để không mất dữ liệu.</div></div>`;
  $$('[data-start]', v).forEach(b => b.onclick = () => tnStart(+b.dataset.start));
  $$('[data-rv]', v).forEach(b => b.onclick = () => { tnRun = { mode: 'review', att: T.attempts[+b.dataset.rv], wrongOnly: false }; render(); window.scrollTo(0, 0); });
  const rs = $('#tnres'), dr = $('#tndrop');
  if (rs) rs.onclick = tnResume;
  if (dr) dr.onclick = async () => { if (await ask({ title: 'Bỏ bài nháp?', text: `Bài làm dở của Đề ${d.n} sẽ bị xoá.`, ok: 'Bỏ bài nháp', danger: true })) { T.draft = null; save(); render(); } };
}
function tnDo(v) {
  const r = tnRun, qs = r.ids.map(id => QMAP.get(id));
  examUI(v, {
    label: 'Đề ' + r.n, cur: r.cur, ans: r.ans, focusQ: r.focusQ,
    items: qs.map(q => ({ q: q.q, opts: q.options })),
    timer: () => ({ text: mmss((Date.now() - r.t0) / 1000) }),
    onPick: j => { r.ans[r.cur] = j; r.focusQ = false; tnSaveDraft(); },
    onGo: i => { r.cur = i; r.focusQ = true; tnSaveDraft(); render(); },
    onSubmit: tnFinish,
    onExit: () => { tnSaveDraft(); tnRun = null; render(); toast('Đã lưu bài nháp, bạn có thể tiếp tục sau', 'ok'); }
  });
  r.focusQ = false;
}
function tnReview(v) {
  const r = tnRun, a = r.att, qs = a.ids.map(id => QMAP.get(id)), sc = tnScore(a), pass = sc >= 5;
  const by = {}; qs.forEach((q, i) => { if (!q) return; const b = by[q.m] || (by[q.m] = [0, 0]); b[1]++; if (a.ans[i] === q.answer) b[0]++; });
  const missing = qs.filter(q => !q).length, wrongN = qs.filter((q, i) => q && a.ans[i] !== q.answer).length;
  v.innerHTML = pageHead(`Đề ${a.n} · Kết quả`, dtFmt(a.t)) +
    `<section class="card"><div class="grid" style="grid-template-columns:auto 1fr;align-items:center;gap:20px">
      <div>${ring(sc * 10, sc, '/ 10', pass ? 'ok' : 'bad', 132)}</div>
      <div><div class="row">${verdict(sc)}${badge(`${a.ok}/${a.total} câu đúng`)}${badge('⏱ ' + mmss(a.sec))}</div>
      <p class="mut sm" style="margin:8px 0 0">Ngưỡng 5/10 lấy từ tài liệu bên thứ ba, hãy kiểm tra lại với Trung tâm.${missing ? ` ${missing} câu của lượt này không còn trong ngân hàng nên không hiện lại.` : ''}</p></div></div>
      <div style="margin-top:18px">${Object.keys(by).map(m => `<div class="meter"><div class="row sp sm"><b>${m} <span class="mut" style="font-weight:500">${NAMES[m] || ''}</span></b><span class="mut">${by[m][0]}/${by[m][1]}</span></div>${bar(Math.round(by[m][0] / by[m][1] * 100), by[m][0] === by[m][1] ? 'ok' : '')}</div>`).join('')}</div>
      <div class="row" style="margin-top:18px"><button class="btn" id="tnback" type="button">Về danh sách đề</button><button class="btn sec" id="tnagain" type="button">${ic('refresh', 18)} Làm lại Đề ${a.n}</button></div></section>
    <div class="row sp" style="margin:4px 0 12px"><h2 style="font-size:1.1rem">Xem lại từng câu</h2><div class="chips"><label class="chip"><input type="radio" name="flt" value="all" ${r.wrongOnly ? '' : 'checked'}><span>Tất cả (${a.total})</span></label><label class="chip"><input type="radio" name="flt" value="wrong" ${r.wrongOnly ? 'checked' : ''}><span>Chỉ câu sai (${wrongN})</span></label></div></div>
    ${qs.map((q, i) => {
      if (!q) return '';
      if (r.wrongOnly && a.ans[i] === q.answer) return '';
      return reviewCard(i, { q: q.q, m: q.m, topic: q.topic, opts: q.options, ans: q.answer, pick: a.ans[i], explain: q.explain });
    }).join('') || emptyBox('check', 'Không có câu sai', 'Bạn đã trả lời đúng mọi câu của lượt này.')}`;
  $('#tnback').onclick = () => { tnRun = null; render(); window.scrollTo(0, 0); };
  $('#tnagain').onclick = () => { tnRun = null; tnStart(a.n); };
  $$('input[name=flt]', v).forEach(i => i.onchange = () => { r.wrongOnly = i.value === 'wrong'; render(); });
}

/* ---------- thẻ nhớ ---------- */
VIEWS.cards = function (v) {
  if (!CS.length) { v.innerHTML = pageHead('Thẻ nhớ') + emptyBox('cards', 'Chưa có thẻ nhớ', 'Chạy build_data.py để tạo data.js.'); return; }
  if (!deck) {
    const due = CS.filter(x => isDue(S.c, x.id)).length;
    v.innerHTML = pageHead('Thẻ nhớ', `${CS.length} thẻ về hàm Excel, phím tắt, thao tác. Thẻ "chưa nhớ" quay lại ngay, thẻ "nhớ" lặp lại sau 1, 3, 7, 14 ngày.`) +
      `<div class="stats" style="grid-template-columns:repeat(2,1fr)"><div class="stat"><div><b>${CS.length}</b><span>Tổng số thẻ</span></div></div><div class="stat"><div><b>${due}</b><span>Đến hạn ôn</span></div></div></div>
      <section class="card"><div class="card-h"><h2>Mô đun</h2><div class="row"><button class="btn ghost sm" id="all" type="button">Chọn tất cả</button><button class="btn ghost sm" id="none" type="button">Bỏ chọn</button></div></div>${modChips(m => CS.filter(x => x.m === m).length)}</section>
      <section class="card"><div class="field" style="margin:0"><label for="n">Số thẻ mỗi phiên</label><div class="row"><div class="stepper"><button class="btn sec sm" id="mn" type="button" aria-label="Giảm">−</button><input type="number" id="n" value="20" min="5" max="100" inputmode="numeric"><button class="btn sec sm" id="pl" type="button" aria-label="Tăng">+</button></div></div></div></section>
      <button class="btn block" id="go" type="button" style="min-height:52px;font-size:1.05rem">${ic('play', 18)} Bắt đầu ôn thẻ</button>`;
    $('#all').onclick = () => $$('input[name=mod]').forEach(i => i.checked = true);
    $('#none').onclick = () => $$('input[name=mod]').forEach(i => i.checked = false);
    const nEl = $('#n'), setN = k => { nEl.value = Math.max(5, Math.min(100, (+nEl.value || 20) + k)); };
    $('#mn').onclick = () => setN(-5); $('#pl').onclick = () => setN(5);
    $('#go').onclick = () => {
      const mods = pickedMods(); if (!mods.length) { toast('Chọn ít nhất 1 mô đun', 'warn'); return; }
      const list = buildQueue(CS.filter(x => mods.includes(x.m)), S.c, 'srs', Math.max(5, Math.min(100, +nEl.value || 20)));
      deck = { list, i: 0, flip: false, know: 0 }; render(); window.scrollTo(0, 0);
    };
    return;
  }
  if (deck.i >= deck.list.length) {
    const n = deck.list.length, pct = Math.round(deck.know / n * 100);
    v.innerHTML = pageHead('Xong phiên thẻ nhớ') + `<section class="card tc"><div class="row" style="justify-content:center">${ring(pct, `${deck.know}/${n}`, 'thẻ nhớ được', pct >= 50 ? 'ok' : 'bad', 150)}</div>
      <p class="mut" style="margin-top:12px">Thẻ chưa nhớ sẽ quay lại ngay trong lịch ôn.</p><div class="row" style="justify-content:center"><button class="btn" id="again" type="button">${ic('refresh', 18)} Phiên mới</button></div></section>`;
    $('#again').onclick = () => { deck = null; render(); };
    return;
  }
  document.body.classList.add('focus');
  const c = deck.list[deck.i], n = deck.list.length;
  v.innerHTML = `<div class="exam-h"><div class="row sp"><div class="row"><b>Thẻ nhớ</b>${badge(`${deck.i + 1}/${n}`)}${badge(`${c.m}${c.topic ? ' · ' + esc(c.topic) : ''}`, 'pri')}</div><button class="btn sec sm" id="stop" type="button">${ic('x', 16)} Dừng</button></div><div style="margin-top:10px">${bar(Math.round(deck.i / n * 100))}</div></div>
    <div class="flash ${deck.flip ? 'flip' : ''}" id="fl"><div class="flash-in"><div class="face"><small>Câu hỏi</small>${esc(c.front)}</div><div class="face back" aria-hidden="${!deck.flip}"><small>Đáp án</small>${esc(c.back)}</div></div></div>
    <p class="kbd tc">Phím tắt: <kbd>Space</kbd> lật thẻ · <kbd>←</kbd> chưa nhớ · <kbd>→</kbd> nhớ</p>
    <div class="actionbar" id="ab"></div>`;
  const ab = $('#ab', v), fl = $('#fl', v);
  const next = ok => { rate(S.c, c.id, ok); if (ok) deck.know++; deck.i++; deck.flip = false; render(); };
  const showFront = () => { ab.innerHTML = `<button class="btn" id="flip" type="button">Lật thẻ xem đáp án</button>`; $('#flip', ab).onclick = flip; };
  const showBack = () => { ab.innerHTML = `<button class="btn bad" id="no" type="button">${ic('x', 18)} Chưa nhớ</button><button class="btn good" id="yes" type="button">${ic('check', 18)} Nhớ</button>`; $('#no', ab).onclick = () => next(false); $('#yes', ab).onclick = () => next(true); };
  function flip() { deck.flip = true; fl.classList.add('flip'); $('.face.back', fl).setAttribute('aria-hidden', 'false'); showBack(); $('#yes', ab).focus({ preventScroll: true }); }
  if (deck.flip) showBack(); else showFront();
  $('#stop').onclick = () => { deck = null; render(); };
  KEYS[' '] = () => { if (!deck.flip) flip(); };
  KEYS.ArrowLeft = () => { if (deck.flip) next(false); };
  KEYS.ArrowRight = () => { if (deck.flip) next(true); };
};

/* ---------- đề thực hành (tải/mở PDF, làm đề có đồng hồ) ---------- */
let pracFilter = 'all';
function pracStat(id) {
  const rs = S.mocks.filter(m => m.type === 'th' && m.exam === id);
  if (!rs.length) return null;
  const sc = rs.filter(m => m.self != null).map(m => m.self);
  return { n: rs.length, best: sc.length ? Math.max.apply(null, sc) : null, last: rs[rs.length - 1].day };
}
const SEGCOL = ['#2563eb', '#7c3aed', '#ea580c', '#059669'];
function offCard() {
  const st = pracStat(OFF_ID), href = f => esc(encodeURI(f));
  const total = offScore();
  return `<section class="card" aria-labelledby="offh" style="border-color:var(--pri)"><div class="card-h"><h2 id="offh">${esc(OFF.title)}</h2>${badge(`${OFF.min} phút`, 'pri')}${st ? badge(`Đã làm ${st.n} lần${st.best != null ? ' · cao nhất ' + st.best + '/10' : ''}`, 'ok') : ''}</div>
    <p class="mut sm">${esc(OFF.src)}. Đây là đề mẫu của chính Trung tâm Tin học IUH, hãy làm đề này trước các đề của trường khác.</p>
    <div class="seg" aria-hidden="true">${OFF.sections.map((s, i) => `<i style="flex:${s.points};background:${SEGCOL[i % 4]}"></i>`).join('')}</div>
    <div class="seg-l">${OFF.sections.map((s, i) => `<span style="--c:${SEGCOL[i % 4]}">${esc(s.name)} ${s.points}đ</span>`).join('')}<span style="--c:transparent"><b>Tổng 10đ</b></span></div>
    <div class="row" style="margin:16px 0 12px"><button class="btn" data-do="${OFF_ID}" type="button">${ic('play', 18)} Làm đề này (${OFF.min} phút)</button><a class="btn sec" href="${href(OFF.zip)}" download>${ic('download', 18)} Tải trọn bộ (zip)</a></div>
    <details class="acc" style="box-shadow:none"><summary>${ic('alert', 18)} Quy định ghi trong đề (${OFF.rules.length})<span class="chev">${ic('down', 18)}</span></summary><div class="acc-b"><ul style="margin:0;padding-left:1.2em">${OFF.rules.map(r => `<li style="margin:.4em 0">${esc(r)}</li>`).join('')}</ul></div></details>
    <details class="acc" style="box-shadow:none;margin-bottom:0"><summary>${ic('folder', 18)} Tải riêng từng file (${OFF.files.length})<span class="chev">${ic('down', 18)}</span></summary><div class="acc-b stack">${OFF.files.map(f => `<div><a href="${href(f.file)}" download class="wrapany">${ic('download', 14)} ${esc(f.label)}</a></div>`).join('')}<p class="mut xs" style="margin:0">Giải nén zip ra thư mục tạm, làm theo quy trình của đề: sao chép file dữ liệu vào thư mục <code>BaiThi...</code> rồi đổi tên.</p></div></details></section>
    <div class="sticky-sc" role="status"><div class="grow"><div class="row sp sm"><b>Chấm điểm đề mẫu theo từng ý</b><span class="mut">${OFF.sections.reduce((a, s) => a + s.items.filter(i => S.off[i.id]).length, 0)}/${OFF.sections.reduce((a, s) => a + s.items.length, 0)} ý</span></div>${bar(Math.round(total * 10), 'ok')}</div><b class="big" id="offsc">${total}<span class="mut sm">/10</span></b></div>
    <p class="mut sm">Tick ý bạn đã làm đúng, điểm cộng theo thang của đề. Ngưỡng đạt thực hành 5/10 lấy từ tài liệu bên thứ ba, hãy kiểm tra lại với Trung tâm. "Cách làm" và "Kết quả đúng" do Claude soạn, không phải đáp án chính thức.</p>
    ${OFF.sections.map((s, si) => `<details class="acc" ${si === 0 ? 'open' : ''}><summary><span style="width:10px;height:10px;border-radius:3px;background:${SEGCOL[si % 4]};flex:none"></span><span class="grow">${esc(s.name)} <span class="mut" style="font-weight:500">(${s.points}đ)</span></span>${badge(`<span id="ss-${esc(s.name)}">${secScore(s)}</span>/${s.points}đ`, 'pri')}<span class="chev">${ic('down', 18)}</span></summary>
      <div class="acc-b">${s.intro ? `<p class="mut sm">${esc(s.intro)}</p>` : ''}${s.items.map(i => `<div class="li ${S.off[i.id] ? 'done' : ''}"><label class="cbw"><input type="checkbox" class="cb" data-o="${i.id}" ${S.off[i.id] ? 'checked' : ''} aria-label="Đã làm: ${esc(i.t.slice(0, 80))}"></label><div class="grow"><div class="tt">${esc(i.t)} ${badge(i.p + 'đ')}</div>
        ${i.img ? `<img class="shot" src="${href(i.img)}" alt="Hình minh hoạ trong đề" loading="lazy">` : ''}
        <details class="inl"><summary>Cách làm${i.check ? ' và kết quả đúng' : ''} ${ic('down', 14).replace('class="ic"', 'class="ic chev"')}</summary><p class="sm" style="margin:6px 0">${esc(i.hint)}</p>${i.check ? `<div class="exp"><b>Kết quả đúng:</b> ${esc(i.check)}</div>` : ''}</details></div></div>`).join('')}</div></details>`).join('')}
    <div class="row" style="margin-bottom:16px"><button class="btn ghost" id="offrst" type="button">Bỏ tick tất cả</button></div>`;
}
VIEWS.prac = function (v) {
  if (!PR.length) { v.innerHTML = pageHead('Đề thực hành') + emptyBox('prac', 'Chưa có danh sách đề', 'Chạy build_data.py để tạo data.js (thư mục de-thuc-hanh phải nằm cạnh thư mục app).'); return; }
  const chips = [['all', 'Tất cả'], ['Trọn bộ', 'Trọn bộ 120 phút'], ['Word', 'Word'], ['Excel', 'Excel'], ['PowerPoint', 'PowerPoint']];
  const list = PR.filter(p => !p.official && (pracFilter === 'all' || p.mod === pracFilter));
  v.innerHTML = pageHead('Đề thực hành', 'Tải đề, làm trên Word/Excel/PowerPoint thật, bấm giờ và tự chấm điểm.') + (OFF ? offCard() : '') +
    `<section class="card"><div class="card-h"><h2>Đề của trường khác</h2>${badge(`${PR.length - (OFF ? 1 : 0)} đề PDF`)}</div>
    <p class="mut sm">ĐH KHTN và CĐKT Cao Thắng, dùng để luyện thao tác, <b>không phải đề IUH</b>. Đề "Trọn bộ" (Windows, Word, PowerPoint, Excel trong 120 phút) có cấu trúc gần bài thi thật nhất.</p>
    <details class="acc" style="box-shadow:none"><summary>${ic('info', 18)} Lưu ý khi làm các đề này<span class="chev">${ic('down', 18)}</span></summary><div class="acc-b sm">Đề theo mô đun yêu cầu lưu <code>D:\\CA1\\SBD.doc</code>, <code>SBD.xls</code>, <code>SBD.pptx</code> (SBD là số báo danh, ví dụ K26-017). Hãy tập lưu đúng thư mục và tên file, sai đường dẫn có thể mất trắng cả phần. Bảng dữ liệu hoặc "nội dung cho sẵn" trong đề thì gõ lại theo hình trong đề. Phần Windows cần tìm file <code>.TXT</code>/<code>.LOG</code> theo dung lượng: tìm trong <code>C:\\Windows</code>.</div></details>
    <div class="chips scroll" role="radiogroup" aria-label="Lọc đề">${chips.map(c => `<label class="chip"><input type="radio" name="pf" value="${esc(c[0])}" ${pracFilter === c[0] ? 'checked' : ''}><span>${c[1]}</span></label>`).join('')}</div></section>
    <div class="stack">${list.map(p => {
      const st = pracStat(p.id);
      return `<article class="card" style="margin:0"><div class="row sp"><div class="grow"><div class="row"><h3 style="font-size:1.02rem">${esc(p.title)}</h3>${badge(`${p.min} phút`)}${st ? badge(`Đã làm ${st.n} lần${st.best != null ? ' · cao nhất ' + st.best + '/10' : ''} · ${dayFmt(st.last)}`, 'ok') : ''}</div><p class="mut xs" style="margin:4px 0 0">${esc(p.src)} · ${p.kb} KB</p></div>
        <div class="row"><a class="btn sec sm" href="${esc(prHref(p))}" target="_blank" rel="noopener">${ic('ext', 15)} Mở</a><a class="btn sec sm" href="${esc(prHref(p))}" download="${esc(p.name)}">${ic('download', 15)} Tải</a><button class="btn sm" data-do="${esc(p.id)}" type="button">${ic('play', 15)} Làm đề</button></div></div></article>`;
    }).join('')}</div>`;
  $$('input[name=pf]', v).forEach(i => i.onchange = () => { pracFilter = i.value; render(); });
  $$('[data-do]', v).forEach(b => b.onclick = async () => {
    const p = prById(b.dataset.do);
    if (S.th && S.th.start && !await ask({ title: 'Thay đồng hồ đang chạy?', text: 'Đang có một đồng hồ thực hành chạy. Bắt đầu đề này sẽ thay thế đồng hồ đó.', ok: 'Bắt đầu đề mới', danger: true })) return;
    S.th = { start: Date.now(), exam: p.id, min: p.min }; save();
    if (!p.official) window.open(prHref(p), '_blank', 'noopener');   // .doc của đề mẫu IUH không xem được trong trình duyệt, tải zip rồi mở bằng Word
    mock = { th: true }; go('mock');
  });
  $$('[data-o]', v).forEach(c => c.onchange = () => {   // cập nhật tại chỗ để không đóng các mục "Cách làm"
    S.off[c.dataset.o] = c.checked; save();
    const sc = offScore(); $('#offsc').innerHTML = sc + '<span class="mut sm">/10</span>';
    $('.sticky-sc .bar>i', v).style.width = Math.round(sc * 10) + '%';
    const cnt = OFF.sections.reduce((a, s) => a + s.items.filter(i => S.off[i.id]).length, 0); $('.sticky-sc .mut', v).textContent = cnt + '/' + offItemsN() + ' ý';
    OFF.sections.forEach(s => { const el = $('#ss-' + s.name); if (el) el.textContent = secScore(s); });
    c.closest('.li').classList.toggle('done', c.checked);
  });
  const rst = $('#offrst');
  if (rst) rst.onclick = async () => { if (await ask({ title: 'Bỏ tick checklist?', text: 'Toàn bộ dấu tick của checklist đề mẫu sẽ bị xoá.', ok: 'Bỏ tick hết', danger: true })) { S.off = {}; save(); render(); } };
};
const offItemsN = () => OFF.sections.reduce((a, s) => a + s.items.length, 0);

/* ---------- thi thử ---------- */
const MIX = { IU01: 4, IU02: 6, IU03: 6, IU04: 6, IU05: 4, IU06: 4 };
const PHASES = [['Windows', 10], ['Word', 30], ['Excel', 40], ['PowerPoint', 25], ['Kiểm tra lại', 15]];
function mockSave() {
  if (!mock || !mock.list) return;
  S.mockDraft = { ids: mock.list.map(x => x.id), order: mock.order, ans: mock.ans, cur: mock.cur, end: mock.end, start: mock.start }; save();
}
function mockRestore() {
  const d = S.mockDraft;
  if (!d || !d.ids.every(id => QMAP.has(id))) { S.mockDraft = null; save(); return false; }
  mock = { list: d.ids.map(id => QMAP.get(id)), order: d.order, ans: d.ans, cur: d.cur, end: d.end, start: d.start, done: false };
  return true;
}
VIEWS.mock = function (v) {
  if (mock && !mock.done) return mockRun(v);
  if (mock && mock.done) return mockResult(v);
  const hist = S.mocks.slice(-8).reverse().map(m => `<div class="li"><div class="si" style="flex:none;width:36px;height:36px;border-radius:10px;display:grid;place-items:center;background:var(--pri-soft);color:var(--pri)">${ic(m.type === 'lt' ? 'quiz' : 'prac', 18)}</div><div class="grow"><b>${m.type === 'lt' ? `Lý thuyết · ${m.score.toFixed(1)}/10` : 'Thực hành' + (m.exam ? ' · ' + (prById(m.exam) ? prById(m.exam).title : m.exam) : '')}</b><div class="mut sm">${dayFmt(m.day)} · ${m.type === 'lt' ? `${m.correct}/${m.total} câu đúng` : `${m.min} phút, tự chấm ${m.self == null ? '–' : m.self + '/10'}`}</div></div></div>`).join('');
  const thRun = S.th && S.th.start, d = S.mockDraft;
  const phText = IUH_PHASES.map(p => p[0] + ' ' + p[1] + '′').join(' · ');
  const leftMs = d ? d.end - Date.now() : 0;
  v.innerHTML = pageHead('Thi thử', 'Tập làm bài trong điều kiện có bấm giờ, rồi xem kết quả và sửa lỗi.') +
    (d ? `<div class="alert"><span>${ic('clock', 20)}</span><div class="a-body"><b>Có bài thi thử lý thuyết đang làm dở</b> (đã trả lời ${d.ans.filter(a => a >= 0).length}/${d.ids.length} câu). ${leftMs > 0 ? `Còn ${mmss(leftMs / 1000)}.` : 'Đã hết giờ, bài sẽ được chấm ngay khi bạn mở lại.'}<div class="row" style="margin-top:8px"><button class="btn sm" id="ltres" type="button">${leftMs > 0 ? 'Tiếp tục làm' : 'Xem kết quả'}</button><button class="btn sec sm" id="ltdrop" type="button">Bỏ bài này</button></div></div></div>` : '') +
    `<div class="grid g2" style="margin-bottom:16px"><section class="card stack" style="margin:0"><div class="si" style="width:44px;height:44px;border-radius:12px;display:grid;place-items:center;background:var(--pri-soft);color:var(--pri)">${ic('quiz', 22)}</div><h2>Thi thử lý thuyết</h2>
      <p class="mut sm">30 câu trong 30 phút, trộn các mô đun, tự nộp khi hết giờ. Đạt khi từ 5/10 (15/30 câu) trở lên. Ngưỡng này lấy từ tài liệu bên thứ ba, hãy kiểm tra lại với Trung tâm. Bài làm dở tự lưu, đóng trang rồi mở lại vẫn tiếp tục được (đồng hồ vẫn chạy).</p>
      <button class="btn" id="lt" type="button">${ic('play', 18)} Bắt đầu thi thử 30 phút</button></section>
    <section class="card stack" style="margin:0"><div class="si" style="width:44px;height:44px;border-radius:12px;display:grid;place-items:center;background:var(--pri-soft);color:var(--pri)">${ic('prac', 22)}</div><h2>Thi thử thực hành</h2>
      <p class="mut sm">Đồng hồ 90 phút (đúng thời lượng đề mẫu IUH), gợi ý phân bổ: ${phText} (gợi ý của app, không phải quy định). Bạn tự làm trên Word/Excel/PowerPoint thật, app chỉ bấm giờ và ghi kết quả.</p>
      <div class="row"><button class="btn" id="th" type="button">${ic('play', 18)} ${thRun ? 'Xem đồng hồ đang chạy' : 'Bắt đầu đồng hồ 90 phút'}</button><button class="btn sec" data-tab="prac" type="button">Chọn đề để làm</button></div></section></div>
    <section class="card"><div class="card-h"><h2>Lịch sử gần đây</h2></div>${hist || '<p class="mut" style="margin:0">Chưa có lần thi thử nào.</p>'}</section>`;
  $('#lt').onclick = async () => {
    if (QS.length < 30) { toast('Chưa đủ 30 câu trong ngân hàng', 'warn'); return; }
    if (S.mockDraft && !await ask({ title: 'Thay bài đang làm dở?', text: 'Đang có một bài thi thử lý thuyết làm dở. Bắt đầu bài mới sẽ thay thế bài đó.', ok: 'Bắt đầu bài mới', danger: true })) return;
    let list = [];
    MODS.forEach(m => { list = list.concat(shuffle(qOf(m)).slice(0, MIX[m] || 0)); });
    if (list.length < 30) { const ids = new Set(list.map(x => x.id)); list = list.concat(shuffle(QS.filter(x => !ids.has(x.id))).slice(0, 30 - list.length)); }
    list = shuffle(list).slice(0, 30);
    mock = { list, order: list.map(x => shuffle([0, 1, 2, 3].slice(0, x.options.length))), ans: list.map(() => -1), cur: 0, end: Date.now() + 30 * 60000, start: Date.now(), done: false, focusQ: true };
    mockSave(); render(); window.scrollTo(0, 0);
  };
  $('#th').onclick = () => { if (!S.th || !S.th.start) { S.th = { start: Date.now(), min: 90 }; save(); } mock = { th: true }; render(); };
  const rs = $('#ltres'), dr = $('#ltdrop');
  if (rs) rs.onclick = () => { if (mockRestore()) { mock.focusQ = true; if (mock.end - Date.now() <= 0) finishMock(); else render(); window.scrollTo(0, 0); } else { toast('Bài nháp không còn khớp ngân hàng câu hỏi nên đã bỏ.', 'warn'); render(); } };
  if (dr) dr.onclick = async () => { if (await ask({ title: 'Bỏ bài thi thử?', text: 'Bài làm dở sẽ bị xoá và không được chấm.', ok: 'Bỏ bài', danger: true })) { S.mockDraft = null; save(); render(); } };
};
function mockRun(v) {
  if (mock.th) return thRun(v);
  examUI(v, {
    label: 'Thi thử lý thuyết', cur: mock.cur, ans: mock.ans, focusQ: mock.focusQ,
    items: mock.list.map((it, i) => ({ q: it.q, opts: mock.order[i].map(k => it.options[k]) })),
    timer: () => { const left = (mock.end - Date.now()) / 1000; return { text: mmss(left), low: left <= 300, expired: left <= 0 }; },
    onPick: j => { mock.ans[mock.cur] = j; mock.focusQ = false; mockSave(); },
    onGo: i => { mock.cur = i; mock.focusQ = true; mockSave(); render(); },
    onSubmit: finishMock,
    onTimeout: () => { toast('Hết giờ, bài được nộp tự động', 'warn'); finishMock(); },
    onExit: () => { mockSave(); mock = null; render(); toast('Đã lưu bài đang làm, đồng hồ vẫn chạy', 'ok'); }
  });
  mock.focusQ = false;
}
function finishMock() {
  clearInterval(tick);
  let c = 0;
  mock.list.forEach((it, i) => {
    const ok = mock.ans[i] >= 0 && mock.order[i][mock.ans[i]] === it.answer;
    if (ok) c++;
    const r = S.q[it.id] || (S.q[it.id] = { box: 0, due: 0, seen: 0, right: 0, wrong: 0 });
    r.seen++;
    if (ok) r.right++; else { r.wrong++; r.box = 0; r.due = today(); }
  });
  mock.correct = c; mock.score = c / mock.list.length * 10; mock.done = true;
  S.mocks.push({ type: 'lt', day: today(), correct: c, total: mock.list.length, score: mock.score });
  S.mockDraft = null; save(); render(); window.scrollTo(0, 0);
}
function mockResult(v) {
  const sc = mock.score, pass = sc >= 5;
  v.innerHTML = pageHead('Kết quả thi thử lý thuyết') + `<section class="card"><div class="grid" style="grid-template-columns:auto 1fr;align-items:center;gap:20px"><div>${ring(sc * 10, sc.toFixed(1), '/ 10', pass ? 'ok' : 'bad', 132)}</div>
      <div><div class="row">${verdict(sc)}${badge(`${mock.correct}/${mock.list.length} câu đúng`)}</div><p class="mut sm" style="margin:8px 0 0">Câu sai đã được đưa vào lịch ôn.</p></div></div>
      <div class="row" style="margin-top:16px"><button class="btn" id="back" type="button">Quay lại</button></div></section>
    <h2 style="font-size:1.1rem;margin:4px 0 12px">Xem lại từng câu</h2>
    ${mock.list.map((it, i) => reviewCard(i, { q: it.q, m: it.m, topic: it.topic, opts: mock.order[i].map(k => it.options[k]), ans: mock.order[i].indexOf(it.answer), pick: mock.ans[i], explain: it.explain })).join('')}`;
  $('#back').onclick = () => { mock = null; render(); };
}
function thRun(v) {
  const start = S.th && S.th.start;
  if (!start) { mock = null; render(); return; }
  const total = (S.th.min || 120), ex = S.th.exam && prById(S.th.exam);
  const phases = ((ex && ex.official) || (!ex && total === 90)) ? IUH_PHASES : total === 120 ? PHASES : [[ex ? ex.mod : 'Làm bài', total]];
  v.innerHTML = pageHead('Thi thử thực hành', ex ? esc(ex.title) : 'Đồng hồ ' + total + ' phút') +
    `<section class="card"><div class="tc"><div class="clock" id="tm" aria-live="off">--:--</div><div class="mut sm">thời gian còn lại</div></div><div id="ph" style="margin-top:14px"></div>
    <div class="alert info" style="margin:14px 0">${ic('info', 20)}<div class="a-body">${ex && ex.official ? 'Lưu bài vào đúng thư mục <code>BaiThi...</code> và đổi tên file đúng như đề. Không ghi họ tên hay mã sinh viên vào file bài làm (chấm theo phách).' : 'Nhớ lưu file đúng tên và đúng ổ đĩa theo dòng lưu ý đầu đề. Lưu sau mỗi phần.'}</div></div>
    <div class="row">${ex && ex.official ? `<a class="btn sec sm" href="${esc(encodeURI(OFF.zip))}" download>${ic('download', 15)} Tải bộ đề + dữ liệu (zip)</a><button class="btn sec sm" data-tab="prac" type="button">Xem checklist đề</button>` : ex ? `<a class="btn sec sm" href="${esc(prHref(ex))}" target="_blank" rel="noopener">${ic('ext', 15)} Mở lại đề (PDF)</a>` : ''}</div></section>
    <div class="row"><button class="btn" id="fin" type="button">${ic('check', 18)} Nộp bài và ghi kết quả</button><button class="btn sec" id="hide" type="button">Ẩn (đồng hồ vẫn chạy)</button></div>`;
  $('#hide').onclick = () => { mock = null; render(); };
  $('#fin').onclick = () => thFinish(v);
  const upd = () => {
    const el = $('#tm'); if (!el) { clearInterval(tick); return; }
    const el2 = (Date.now() - start) / 1000, left = total * 60 - el2;
    el.textContent = left >= 0 ? mmss(left) : '-' + mmss(-left); el.classList.toggle('over', left < 0);
    let acc = 0;
    $('#ph').innerHTML = phases.map((p, i) => {
      const a = acc * 60, b = (acc + p[1]) * 60; acc += p[1];
      const cls = el2 >= b ? 'past' : el2 >= a ? 'on' : '';
      return `<div class="ph ${cls}"><span class="pn">${cls === 'past' ? '✓' : i + 1}</span><div class="grow"><b>${p[0]}</b><span class="mut">${p[1]} phút</span></div></div>`;
    }).join('');
  };
  upd(); tick = setInterval(upd, 500);
}
function thFinish(v) {
  clearInterval(tick);
  const min = Math.round((Date.now() - S.th.start) / 60000);
  v.innerHTML = pageHead('Ghi kết quả thực hành') + `<section class="card"><p>Thời gian đã dùng: <b>${min} phút</b>. ${S.th.exam === OFF_ID ? 'Điểm bên dưới lấy từ checklist đề mẫu ở mục Đề thực hành, bạn có thể sửa.' : 'Chấm lại bài theo đề và nhập điểm tự chấm.'}</p>
    <div class="field" style="max-width:220px"><label for="self">Điểm tự chấm (0–10)</label><input type="number" id="self" min="0" max="10" step="0.05" inputmode="decimal" value="${S.th.exam === OFF_ID ? offScore() : ''}"></div>
    <p class="mut sm">Sau khi lưu, sang Sổ lỗi để ghi từng lỗi đã mắc.</p>
    <div class="row"><button class="btn" id="ok" type="button">Lưu kết quả</button><button class="btn sec" id="cancel" type="button">Quay lại đồng hồ</button></div></section>`;
  $('#cancel').onclick = () => render();
  $('#ok').onclick = () => {
    const s = $('#self').value;
    S.mocks.push({ type: 'th', day: today(), min, self: s === '' ? null : +s, exam: S.th.exam || null });
    S.th = null; mock = null; save(); toast('Đã lưu kết quả thực hành', 'ok'); go('errors');
  };
}

/* ---------- sổ lỗi ---------- */
const CATS = ['Windows', 'Word', 'Excel', 'PowerPoint', 'Lý thuyết', 'Khác'];
VIEWS.errors = function (v) {
  const top = QS.filter(x => S.q[x.id] && S.q[x.id].wrong > 0).sort((a, b) => S.q[b.id].wrong - S.q[a.id].wrong).slice(0, 8);
  const open = S.errors.filter(e => !e.fixed).length;
  v.innerHTML = pageHead('Sổ lỗi', 'Ghi lại lỗi đã mắc khi làm đề và cách làm đúng, rồi làm lại đúng thao tác đó.') +
    `<section class="card"><div class="card-h"><h2>Thêm lỗi mới</h2></div>
      <div class="field"><label for="cat">Nhóm</label><select id="cat">${CATS.map(c => `<option>${c}</option>`).join('')}</select></div>
      <div class="field"><label for="what">Lỗi đã mắc</label><textarea id="what" placeholder="Ví dụ: quên khoá ô $ khi copy công thức VLOOKUP"></textarea></div>
      <div class="field"><label for="fix">Cách làm đúng</label><textarea id="fix" placeholder="Ví dụ: nhấn F4 để khoá vùng bảng tra $B$4:$E$7"></textarea></div>
      <button class="btn" id="add" type="button">${ic('check', 18)} Lưu vào sổ lỗi</button></section>
    <section class="card"><div class="card-h"><h2>Danh sách lỗi</h2>${badge(`${open} chưa khắc phục`, open ? 'warn' : 'ok')}</div>
    ${S.errors.length ? S.errors.slice().reverse().map(e => `<div class="li ${e.fixed ? 'done' : ''}"><label class="cbw" title="Đã khắc phục"><input type="checkbox" class="cb" data-f="${e.id}" ${e.fixed ? 'checked' : ''} aria-label="Đã khắc phục"></label><div class="grow"><div class="row">${badge(esc(e.cat), 'pri')}</div><div class="tt" style="margin-top:4px">${esc(e.what)}</div>${e.fix ? `<div class="mut sm" style="margin-top:4px"><b>Cách đúng:</b> ${esc(e.fix)}</div>` : ''}</div><button class="btn ghost sm" data-x="${e.id}" type="button" aria-label="Xoá lỗi này" style="color:var(--bad)">${ic('trash', 16)}</button></div>`).join('') : `<div class="empty" style="padding:12px"><div class="ei">${ic('book', 26)}</div><b>Chưa có lỗi nào</b><p class="sm" style="margin:0">Sau mỗi lần làm đề, ghi lỗi tại đây để không mắc lại.</p></div>`}</section>
    <section class="card"><div class="card-h"><h2>Câu trắc nghiệm hay sai nhất</h2>${top.length ? `<button class="btn sec sm" id="redo" type="button">Luyện lại các câu sai</button>` : ''}</div>
    ${top.length ? top.map(x => `<div class="li"><div class="grow"><div class="row">${badge(x.m, 'pri')}${badge(`Sai ${S.q[x.id].wrong} lần`, 'bad')}</div><div style="margin-top:4px">${esc(x.q)}</div></div></div>`).join('') : '<p class="mut" style="margin:0">Chưa có câu sai.</p>'}</section>`;
  $('#add').onclick = () => {
    const what = $('#what').value.trim(); if (!what) { toast('Hãy nhập lỗi đã mắc', 'warn'); $('#what').focus(); return; }
    S.errors.push({ id: Date.now().toString(36) + Math.random().toString(36).slice(2, 5), cat: $('#cat').value, what, fix: $('#fix').value.trim(), fixed: false, day: today() });
    save(); render(); toast('Đã lưu vào sổ lỗi', 'ok', 1800);
  };
  $$('[data-f]', v).forEach(c => c.onchange = () => { const e = S.errors.find(x => x.id === c.dataset.f); if (e) { e.fixed = c.checked; save(); render(); } });
  $$('[data-x]', v).forEach(b => b.onclick = async () => { if (await ask({ title: 'Xoá lỗi này?', text: 'Mục này sẽ bị xoá khỏi sổ lỗi.', ok: 'Xoá', danger: true })) { S.errors = S.errors.filter(x => x.id !== b.dataset.x); save(); render(); } });
  const rd = $('#redo'); if (rd) rd.onclick = () => { quiz = null; quizPre = 'wrong'; go('quiz'); };
};

/* ---------- khởi động ---------- */
applyTheme();
{ const h = location.hash.slice(1); if (VIEWS[h]) tab = h; }
render();
if (corruptNote) toast('Dữ liệu cũ bị lỗi nên không đọc được. Bản gốc đã được giữ lại trong trình duyệt, tiến độ được đặt lại.', 'warn', 8000);
})();
