(function () {
'use strict';

/* ---------- tiện ích ---------- */
const $ = (s, r) => (r || document).querySelector(s);
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const KEY = 'iuh-tinhoc-v1';
const NAMES = { IU01: 'Hiểu biết CNTT', IU02: 'Windows', IU03: 'Word', IU04: 'Excel', IU05: 'PowerPoint', IU06: 'Internet' };
const INT = [0, 1, 3, 7, 14]; // ngày lặp lại theo hộp Leitner

function defaults() { return { examDate: '2026-10-21', plan: {}, q: {}, c: {}, mocks: [], errors: [], th: null, off: {} }; }
let S;
try { S = Object.assign(defaults(), JSON.parse(localStorage.getItem(KEY) || '{}')); } catch (e) { S = defaults(); }
function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* bỏ qua */ } }

const today = () => { const d = new Date(); return Math.floor((d.getTime() - d.getTimezoneOffset() * 60000) / 864e5); };
const dateToDay = s => Math.floor(Date.parse(s + 'T00:00:00Z') / 864e5);
const dayFmt = n => { const d = new Date(n * 864e5); return String(d.getUTCDate()).padStart(2, '0') + '/' + String(d.getUTCMonth() + 1).padStart(2, '0'); };
const hash = s => { let h = 5381; for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0; return (h >>> 0).toString(36); };
const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const mmss = s => { s = Math.max(0, Math.floor(s)); return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0'); };

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
const offItems = () => OFF ? OFF.sections.reduce((a, s) => a.concat(s.items), []) : [];
const secScore = s => Math.round(s.items.reduce((a, i) => a + (S.off && S.off[i.id] ? i.p : 0), 0) * 100) / 100;
const offScore = () => Math.round(OFF.sections.reduce((a, s) => a + secScore(s), 0) * 100) / 100;
const QS = [], CS = [];
MODS.forEach(m => {
  (BANK.modules[m].questions || []).forEach(x => QS.push(Object.assign({}, x, { m, id: m + '-' + hash(x.q), de: x.de || [] })));
  (BANK.modules[m].cards || []).forEach(x => CS.push(Object.assign({}, x, { m, id: m + '-' + hash(x.front) })));
});
const qOf = m => QS.filter(x => x.m === m);

/* ---------- tần suất trong đề thật ---------- */
// Chỉ có nghĩa khi EX.total > 0. Tần suất = số đề có câu này / tổng số đề đã ghi nhận.
const FREQ_ON = EX.total > 0 && QS.some(x => x.de.length);
const pctOf = n => Math.round(n / EX.total * 100);
const freqTag = x => (EX.total && x.de.length) ? `<span class="tag hot" title="Số đề IUH thật đã ghi nhận có câu này">Gặp ${x.de.length}/${EX.total} đề (${pctOf(x.de.length)}%)</span>` : '';
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
function modChecks(sel) {
  return MODS.map(m => `<label class="chk"><input type="checkbox" name="mod" value="${m}" ${sel.includes(m) ? 'checked' : ''}> ${m} ${NAMES[m] || ''} (${qOf(m).length})</label>`).join('');
}
const pickedMods = () => Array.from(document.querySelectorAll('input[name=mod]:checked')).map(i => i.value);

/* ---------- lộ trình ---------- */
const PLAN = [
  ['IU01: Hiểu biết CNTT', ['Đọc giao-trinh/IU01.pdf', 'Làm 30 câu IU01 trong tab Trắc nghiệm']],
  ['IU02: Windows', ['Đọc IU02.pdf', 'Tự tạo folder, shortcut, tìm kiếm, chụp màn hình, nén/giải nén trên máy', 'Ôn thẻ IU02']],
  ['IU06: Internet + gộp trắc nghiệm', ['Đọc IU06.pdf', 'Làm trắc nghiệm IU01 + IU02 + IU06']],
  ['Word 1', ['Định dạng ký tự/đoạn, tab, bullet, chèn ảnh, khổ giấy', 'Đọc IU03.pdf']],
  ['Word 2 + nhận thẻ thi', ['Bảng biểu, header/footer, đánh số trang, trang bìa, thuộc tính tài liệu', 'Nhận thẻ dự thi tại Cổng 4 (10.000đ)']],
  ['Đề Word', ['Làm 4 đề trong de-thuc-hanh/thuc-hanh-word, bấm giờ', 'Ghi lỗi vào Sổ lỗi']],
  ['Excel 1', ['Nhập liệu, định dạng ngày/tiền tệ, địa chỉ tuyệt đối ($), header/footer']],
  ['Excel 2: hàm thống kê', ['SUM, AVERAGE, MAX, MIN, COUNT, RANK, ROUND']],
  ['Excel 3: hàm điều kiện', ['IF, AND, OR, SUMIF, COUNTIF']],
  ['Excel 4: hàm chuỗi và ngày', ['LEFT, RIGHT, MID, LEN, TODAY, DAY, MONTH, YEAR']],
  ['Excel 5: dò tìm + biểu đồ', ['VLOOKUP, HLOOKUP, sắp xếp, lọc, biểu đồ']],
  ['Đề Excel', ['Làm 5 đề Excel (đề 1–5), bấm giờ', 'Ghi lỗi vào Sổ lỗi']],
  ['PowerPoint 1', ['Slide Master, nền slide, chèn ảnh/bảng/biểu đồ, hiệu ứng chuyển slide, animation']],
  ['PowerPoint 2 + liên kết Excel', ['Chèn bảng và biểu đồ liên kết từ Excel', 'Làm 5 đề PowerPoint']],
  ['Thi thử 1: đề mẫu IUH', ['Làm Đề mẫu IUH (90 phút, tab Đề thực hành), chấm bằng checklist', 'Ghi lỗi vào Sổ lỗi']],
  ['Sửa lỗi', ['Luyện lại phần yếu nhất (Excel hoặc Word)', 'Ôn Sổ lỗi']],
  ['Thi thử 2', ['Thi thử đề mau3 (120 phút)']],
  ['Thi thử 3', ['Thi thử đề mau4, rồi sửa lỗi']],
  ['Ôn trắc nghiệm tổng', ['Thi thử lý thuyết 30 câu/30 phút', 'Thi thử đề mau5 nếu còn sức']],
  ['Chốt', ['Ôn nhẹ các lỗi hay sai, chuẩn bị CCCD + thẻ dự thi + bút bi', 'Ngủ sớm, không học thêm kiến thức mới']],
  ['NGÀY THI', ['Có mặt trước giờ thi 30 phút', 'Thực hành 17h45, lý thuyết 19h15 (theo thông báo, hãy kiểm tra lại thẻ dự thi)']]
];
const planDay = i => dateToDay(S.examDate) - (PLAN.length - 1 - i);

/* ---------- trạng thái phiên ---------- */
let tab = 'home';
let quiz = null;   // phiên trắc nghiệm
let deck = null;   // phiên thẻ
let mock = null;   // thi thử lý thuyết
let tick = null;

/* ---------- khung ---------- */
const TABS = [['home', 'Tổng quan'], ['plan', 'Lộ trình'], ['quiz', 'Trắc nghiệm'], ['cards', 'Thẻ nhớ'], ['prac', 'Đề thực hành'], ['mock', 'Thi thử'], ['errors', 'Sổ lỗi']];
function renderTabs() {
  $('#tabs').innerHTML = TABS.map(t => `<button data-tab="${t[0]}" class="${tab === t[0] ? 'on' : ''}">${t[1]}</button>`).join('');
  const left = dateToDay(S.examDate) - today();
  $('#count').textContent = left > 0 ? `Còn ${left} ngày đến kỳ thi (${dayFmt(dateToDay(S.examDate))})` : left === 0 ? 'Hôm nay là ngày thi' : 'Đã qua ngày thi';
}
function go(t) { tab = t; render(); window.scrollTo(0, 0); }
function render() {
  renderTabs();
  const v = $('#view');
  ({ home: viewHome, plan: viewPlan, quiz: viewQuiz, cards: viewCards, prac: viewPrac, mock: viewMock, errors: viewErrors }[tab])(v);
}
document.addEventListener('click', e => {
  const t = e.target.closest('[data-tab]');
  if (t) go(t.dataset.tab);
});

/* ---------- tổng quan ---------- */
function viewHome(v) {
  const doneQ = Object.values(S.q).reduce((a, r) => a + r.seen, 0);
  const right = Object.values(S.q).reduce((a, r) => a + r.right, 0);
  const dueQ = QS.filter(x => isDue(S.q, x.id)).length;
  const dueC = CS.filter(x => isDue(S.c, x.id)).length;
  const lt = S.mocks.filter(m => m.type === 'lt');
  const best = lt.length ? Math.max.apply(null, lt.map(m => m.score)) : null;
  const done = PLAN.filter((_, i) => S.plan[i]).length;
  const idx = PLAN.findIndex((_, i) => planDay(i) === today());
  let todayHtml = '<p class="mut">Hôm nay không nằm trong lộ trình (kiểm tra ngày thi ở tab Lộ trình).</p>';
  if (idx >= 0) todayHtml = `<b>Ngày ${idx + 1} (${dayFmt(planDay(idx))}): ${esc(PLAN[idx][0])}</b><ul>${PLAN[idx][1].map(t => `<li>${esc(t)}</li>`).join('')}</ul>`;
  const mrows = MODS.map(m => {
    const qs = qOf(m); let s = 0, r = 0;
    qs.forEach(x => { const z = S.q[x.id]; if (z) { s += z.seen; r += z.right; } });
    const pct = s ? Math.round(r / s * 100) : 0;
    return `<div style="margin:8px 0"><div class="row" style="justify-content:space-between"><span>${m} ${NAMES[m] || ''}</span><span class="mut">${s ? pct + '% đúng · ' + s + ' lượt' : 'chưa làm'}</span></div><div class="bar"><i style="width:${pct}%"></i></div></div>`;
  }).join('');
  let fhtml;
  if (!FREQ_ON) {
    fhtml = `<p class="mut">Chưa có dữ liệu đề thật (${EX.total} đề). Trung tâm Tin học IUH không công bố đề các năm, còn ${QS.length} câu trong app do soạn từ giáo trình, không phải câu thi thật, nên <b>chưa có xác suất xuất hiện nào</b>. Khi có đề thật, ghi vào <code>src/de-thuc.json</code> và gắn field <code>de</code> cho câu hỏi (xem README), chạy lại <code>build_data.py</code>.</p>`;
  } else {
    const tf = topicFreq().slice(0, 12), hot = QS.filter(x => x.de.length).sort((a, b) => b.de.length - a.de.length).slice(0, 10);
    fhtml = `<p class="mut">Tính trên ${EX.total} đề IUH thật đã ghi nhận${EX.total < 5 ? '. <b>Mẫu nhỏ, chỉ nên coi là gợi ý ưu tiên</b>' : ''}. Đề ghi lại từ trí nhớ thường thiếu câu, nên tần suất thật có thể cao hơn.</p>
    <p><b>Chủ đề xuất hiện nhiều nhất</b> (số đề có ít nhất 1 câu thuộc chủ đề)</p>
    ${tf.map(t => `<div style="margin:6px 0"><div class="row" style="justify-content:space-between"><span>${esc(t.k)}</span><span class="mut">${t.n}/${EX.total} đề (${pctOf(t.n)}%)</span></div><div class="bar"><i style="width:${pctOf(t.n)}%"></i></div></div>`).join('')}
    <p><b>Câu hay gặp nhất</b></p>
    ${hot.map(x => `<div style="padding:6px 0;border-top:1px solid var(--line)"><span class="tag">${x.m}</span>${freqTag(x)} ${esc(x.q)}</div>`).join('')}`;
  }
  v.innerHTML = `
  <div class="grid" style="margin-bottom:12px">
    <div class="stat"><b>${done}/${PLAN.length}</b><span>Ngày lộ trình đã xong</span></div>
    <div class="stat"><b>${dueQ}</b><span>Câu trắc nghiệm đến hạn ôn</span></div>
    <div class="stat"><b>${dueC}</b><span>Thẻ đến hạn ôn</span></div>
    <div class="stat"><b>${best == null ? '–' : best.toFixed(1)}</b><span>Điểm lý thuyết thi thử cao nhất</span></div>
    <div class="stat"><b>${doneQ ? Math.round(right / doneQ * 100) + '%' : '–'}</b><span>Tỉ lệ đúng (${doneQ} lượt)</span></div>
    <div class="stat"><b>${new Set(S.mocks.filter(m => m.type === 'th' && m.exam).map(m => m.exam)).size}/${PR.length}</b><span>Đề thực hành đã làm</span></div>
  </div>
  <div class="card"><h2>Việc hôm nay</h2>${todayHtml}
    <div class="row"><button class="btn" data-tab="quiz">Luyện trắc nghiệm</button><button class="btn sec" data-tab="cards">Ôn thẻ</button><button class="btn sec" data-tab="plan">Xem lộ trình</button></div></div>
  <div class="card"><h2>Độ chính xác theo mô đun</h2>${mrows || '<p class="mut">Chưa có dữ liệu câu hỏi.</p>'}</div>
  <div class="card"><h2>Tần suất trong đề thật</h2>${fhtml}</div>
  <div class="card"><h2>Sao lưu</h2><p class="mut">Tiến độ lưu trong trình duyệt này. Xoá dữ liệu trình duyệt sẽ mất tiến độ.</p>
    <div class="row"><button class="btn sec" id="exp">Xuất tiến độ (JSON)</button><button class="btn sec" id="imp">Nhập tiến độ</button><button class="btn bad" id="rst">Xoá toàn bộ tiến độ</button></div>
    <textarea id="io" style="display:none;margin-top:8px" placeholder="Dán JSON tiến độ vào đây rồi bấm Nhập lần nữa"></textarea></div>`;
  $('#exp').onclick = () => { const t = $('#io'); t.style.display = 'block'; t.value = JSON.stringify(S); t.select(); };
  $('#imp').onclick = () => {
    const t = $('#io');
    if (t.style.display === 'none') { t.style.display = 'block'; t.value = ''; t.focus(); return; }
    try { const o = JSON.parse(t.value); S = Object.assign(defaults(), o); save(); render(); } catch (e) { alert('JSON không hợp lệ'); }
  };
  $('#rst').onclick = function () {
    if (this.dataset.sure) { S = defaults(); save(); render(); return; }
    this.dataset.sure = 1; this.textContent = 'Bấm lần nữa để xác nhận xoá';
  };
}

/* ---------- lộ trình ---------- */
function viewPlan(v) {
  const done = PLAN.filter((_, i) => S.plan[i]).length;
  const t = today();
  v.innerHTML = `<div class="card"><div class="row" style="justify-content:space-between"><h2 style="margin:0">Lộ trình ${PLAN.length} ngày</h2>
    <label>Ngày thi <input type="date" id="exam" value="${esc(S.examDate)}"></label></div>
    <div class="bar" style="margin:10px 0"><i style="width:${Math.round(done / PLAN.length * 100)}%"></i></div>
    <div class="mut">${done}/${PLAN.length} ngày đã xong. Đổi ngày thi sẽ dịch toàn bộ lộ trình.</div></div>
    <div class="card">${PLAN.map((p, i) => {
      const d = planDay(i);
      return `<div class="day ${d === t ? 'today' : ''} ${S.plan[i] ? 'done' : ''}"><input type="checkbox" data-d="${i}" ${S.plan[i] ? 'checked' : ''} style="margin-top:5px">
      <div><div class="dt"><b>Ngày ${i + 1} · ${dayFmt(d)}</b> · ${esc(p[0])}${d === t ? ' <span class="tag">hôm nay</span>' : ''}</div>
      <small>${p[1].map(esc).join(' · ')}</small></div></div>`;
    }).join('')}</div>`;
  $('#exam').onchange = e => { if (e.target.value) { S.examDate = e.target.value; save(); render(); } };
  v.querySelectorAll('[data-d]').forEach(c => c.onchange = () => { S.plan[c.dataset.d] = c.checked; save(); render(); });
}

/* ---------- trắc nghiệm ---------- */
function viewQuiz(v) {
  if (!QS.length) { v.innerHTML = '<div class="card">Chưa có câu hỏi. Chạy build_data.py để tạo data.js.</div>'; return; }
  if (!quiz) return quizSetup(v);
  if (quiz.i >= quiz.list.length) return quizEnd(v);
  const it = quiz.list[quiz.i];
  const opts = quiz.order.map(k => it.options[k]);
  const ans = quiz.order.indexOf(it.answer);
  v.innerHTML = `<div class="card"><div class="row" style="justify-content:space-between"><span><span class="tag">${it.m} · ${esc(it.topic || '')}</span>${freqTag(it)}</span><span class="mut">${quiz.i + 1}/${quiz.list.length}</span></div>
    <p style="font-size:17px"><b>${esc(it.q)}</b></p>
    ${opts.map((o, k) => `<button class="opt" data-k="${k}"><b>${'ABCD'[k]}.</b> ${esc(o)}</button>`).join('')}
    <div id="fb"></div></div>`;
  const btns = v.querySelectorAll('.opt');
  btns.forEach(b => b.onclick = () => {
    const k = +b.dataset.k, ok = k === ans;
    btns.forEach((x, j) => { x.disabled = true; if (j === ans) x.classList.add('ok'); else if (j === k) x.classList.add('no'); });
    rate(S.q, it.id, ok); if (ok) quiz.right++;
    $('#fb').innerHTML = `<div class="exp">${ok ? '<b>Đúng.</b> ' : '<b>Sai.</b> '}${esc(it.explain || '')}</div><div class="row" style="margin-top:10px"><button class="btn" id="nx">${quiz.i + 1 >= quiz.list.length ? 'Xem kết quả' : 'Câu tiếp'}</button><button class="btn sec" id="stop">Dừng</button></div>`;
    $('#nx').onclick = () => { quiz.i++; quizPrep(); render(); };
    $('#stop').onclick = () => { quiz = null; render(); };
  });
}
function quizPrep() { if (quiz.i < quiz.list.length) quiz.order = shuffle([0, 1, 2, 3].slice(0, quiz.list[quiz.i].options.length)); }
function quizSetup(v) {
  const dueQ = QS.filter(x => isDue(S.q, x.id)).length;
  const wrong = QS.filter(x => S.q[x.id] && S.q[x.id].wrong > 0 && S.q[x.id].box < 4).length;
  v.innerHTML = `<div class="card"><h2>Luyện trắc nghiệm</h2><p class="mut">Có ${QS.length} câu · ${dueQ} câu đến hạn ôn · ${wrong} câu từng sai chưa thuộc.</p>
    <p><b>Mô đun</b><br>${modChecks(MODS)}</p>
    <p><b>Chế độ</b><br>
      <label class="chk"><input type="radio" name="mode" value="srs" checked> Thông minh (câu đến hạn, rồi câu mới)</label>
      <label class="chk"><input type="radio" name="mode" value="wrong"> Chỉ câu từng sai</label>
      <label class="chk"><input type="radio" name="mode" value="random"> Ngẫu nhiên</label>
      <label class="chk"><input type="radio" name="mode" value="freq" ${FREQ_ON ? '' : 'disabled'}> Hay gặp trong đề thật${FREQ_ON ? ` (${QS.filter(x => x.de.length).length} câu)` : ' (chưa có dữ liệu đề thật)'}</label></p>
    <p><label>Số câu <input type="number" id="n" value="20" min="5" max="100" style="width:80px"></label></p>
    <button class="btn" id="go">Bắt đầu</button></div>`;
  $('#go').onclick = () => {
    const mods = pickedMods(); if (!mods.length) { alert('Chọn ít nhất 1 mô đun'); return; }
    const mode = document.querySelector('input[name=mode]:checked').value;
    const list = buildQueue(QS.filter(x => mods.includes(x.m)), S.q, mode, Math.max(5, Math.min(100, +$('#n').value || 20)));
    if (!list.length) { alert('Không có câu nào phù hợp chế độ này'); return; }
    quiz = { list, i: 0, right: 0 }; quizPrep(); render();
  };
}
function quizEnd(v) {
  const n = quiz.list.length;
  v.innerHTML = `<div class="card"><h2>Kết thúc phiên</h2><div class="big">${quiz.right}/${n}</div>
    <p class="mut" style="text-align:center">${Math.round(quiz.right / n * 100)}% đúng. Câu sai sẽ quay lại trong phiên ôn hôm nay.</p>
    <div class="row" style="justify-content:center"><button class="btn" id="again">Phiên mới</button></div></div>`;
  $('#again').onclick = () => { quiz = null; render(); };
}

/* ---------- thẻ nhớ ---------- */
function viewCards(v) {
  if (!CS.length) { v.innerHTML = '<div class="card">Chưa có thẻ nhớ.</div>'; return; }
  if (!deck) {
    const due = CS.filter(x => isDue(S.c, x.id)).length;
    v.innerHTML = `<div class="card"><h2>Thẻ nhớ</h2><p class="mut">${CS.length} thẻ · ${due} thẻ đến hạn ôn. Thẻ "chưa nhớ" quay lại ngay, thẻ "nhớ" lặp lại sau 1, 3, 7, 14 ngày.</p>
      <p><b>Mô đun</b><br>${MODS.map(m => `<label class="chk"><input type="checkbox" name="mod" value="${m}" checked> ${m} ${NAMES[m] || ''} (${CS.filter(x => x.m === m).length})</label>`).join('')}</p>
      <p><label>Số thẻ <input type="number" id="n" value="20" min="5" max="100" style="width:80px"></label></p>
      <button class="btn" id="go">Bắt đầu</button></div>`;
    $('#go').onclick = () => {
      const mods = pickedMods(); if (!mods.length) { alert('Chọn ít nhất 1 mô đun'); return; }
      const list = buildQueue(CS.filter(x => mods.includes(x.m)), S.c, 'srs', Math.max(5, Math.min(100, +$('#n').value || 20)));
      deck = { list, i: 0, flip: false, know: 0 }; render();
    };
    return;
  }
  if (deck.i >= deck.list.length) {
    v.innerHTML = `<div class="card"><h2>Xong phiên thẻ</h2><div class="big">${deck.know}/${deck.list.length}</div><p class="mut" style="text-align:center">thẻ nhớ được</p><div class="row" style="justify-content:center"><button class="btn" id="again">Phiên mới</button></div></div>`;
    $('#again').onclick = () => { deck = null; render(); };
    return;
  }
  const c = deck.list[deck.i];
  v.innerHTML = `<div class="card"><div class="row" style="justify-content:space-between"><span class="tag">${c.m} · ${esc(c.topic || '')}</span><span class="mut">${deck.i + 1}/${deck.list.length}</span></div>
    <div class="fc">${esc(deck.flip ? c.back : c.front)}</div>
    <div class="row" style="justify-content:center">${deck.flip
      ? '<button class="btn bad" id="no">Chưa nhớ</button><button class="btn" id="yes" style="background:var(--ok)">Nhớ</button>'
      : '<button class="btn" id="fl">Xem đáp án</button>'}<button class="btn sec" id="stop">Dừng</button></div></div>`;
  $('#stop').onclick = () => { deck = null; render(); };
  if (!deck.flip) { $('#fl').onclick = () => { deck.flip = true; render(); }; return; }
  const next = ok => { rate(S.c, c.id, ok); if (ok) deck.know++; deck.i++; deck.flip = false; render(); };
  $('#yes').onclick = () => next(true);
  $('#no').onclick = () => next(false);
}

/* ---------- đề thực hành (tải/mở PDF, làm đề có đồng hồ) ---------- */
let pracFilter = 'all';
function pracStat(id) {
  const rs = S.mocks.filter(m => m.type === 'th' && m.exam === id);
  if (!rs.length) return null;
  const sc = rs.filter(m => m.self != null).map(m => m.self);
  return { n: rs.length, best: sc.length ? Math.max.apply(null, sc) : null, last: rs[rs.length - 1].day };
}
function offCard() {
  const st = pracStat(OFF_ID), href = f => esc(encodeURI(f));
  return `<div class="card"><h2>${esc(OFF.title)} <span class="tag hot">${OFF.min} phút</span></h2>
    <p class="mut">${esc(OFF.src)}. Cấu trúc: ${OFF.sections.map(s => s.name + ' ' + s.points + 'đ').join(' · ')} (tổng 10đ). Đây là đề mẫu của chính Trung tâm Tin học IUH, hãy làm đề này trước các đề của trường khác.</p>
    <div class="note"><b>Quy định ghi trong đề / lưu ý</b><ul style="margin:4px 0 0">${OFF.rules.map(r => `<li>${esc(r)}</li>`).join('')}</ul></div>
    <div class="row" style="margin:10px 0"><a class="btn" href="${href(OFF.zip)}" download>Tải trọn bộ (zip)</a><button class="btn" data-do="${OFF_ID}">Làm đề này (${OFF.min} phút)</button>${st ? `<span class="tag hot">đã làm ${st.n} lần${st.best != null ? ' · cao nhất ' + st.best + '/10' : ''}</span>` : ''}</div>
    <p class="mut" style="margin:6px 0">Tải riêng từng file: ${OFF.files.map(f => `<a href="${href(f.file)}" download>${esc(f.label)}</a>`).join(' · ')}</p>
    <p class="mut">Giải nén zip ra thư mục tạm, làm theo quy trình của đề: sao chép file dữ liệu vào thư mục <code>BaiThi...</code> rồi đổi tên.</p></div>
    <div class="card"><div class="row" style="justify-content:space-between"><h2 style="margin:0">Chấm điểm đề mẫu theo từng ý</h2><b id="offsc" style="font-size:20px">${offScore()}/10</b></div>
    <p class="mut">Tick ý bạn đã làm đúng. Điểm cộng theo thang của đề. Ngưỡng đạt thực hành 5/10 lấy từ tài liệu bên thứ ba, hãy kiểm tra lại với Trung tâm. "Cách làm" và "Kết quả đúng" do Claude soạn, không phải đáp án chính thức.</p>
    ${OFF.sections.map(s => `<p style="margin:14px 0 2px"><b>${esc(s.name)}</b> (${s.points}đ) · đã đạt <b id="ss-${esc(s.name)}">${secScore(s)}</b>/${s.points}</p>${s.intro ? `<p class="mut" style="margin:2px 0">${esc(s.intro)}</p>` : ''}
      ${s.items.map(i => `<div class="day ${S.off[i.id] ? 'done' : ''}"><input type="checkbox" data-o="${i.id}" ${S.off[i.id] ? 'checked' : ''} style="margin-top:5px"><div style="flex:1"><div class="dt">${esc(i.t)} <span class="tag">${i.p}đ</span></div>
      ${i.img ? `<img src="${href(i.img)}" alt="Hình trong đề" style="max-width:100%;border:1px solid var(--line);border-radius:6px;margin:6px 0;background:#fff">` : ''}
      <details><summary class="mut" style="cursor:pointer">Cách làm${i.check ? ' và kết quả đúng' : ''}</summary><div style="margin:6px 0;font-size:14px">${esc(i.hint)}</div>${i.check ? `<div class="exp"><b>Kết quả đúng:</b> ${esc(i.check)}</div>` : ''}</details></div></div>`).join('')}`).join('')}
    <div class="row" style="margin-top:12px"><button class="btn sec" id="offrst">Bỏ tick tất cả</button></div></div>`;
}
function viewPrac(v) {
  if (!PR.length) { v.innerHTML = '<div class="card">Chưa có danh sách đề. Chạy build_data.py để tạo data.js (thư mục de-thuc-hanh phải nằm cạnh thư mục app).</div>'; return; }
  const chips = [['all', 'Tất cả'], ['Trọn bộ', 'Trọn bộ 120 phút'], ['Word', 'Word'], ['Excel', 'Excel'], ['PowerPoint', 'PowerPoint']];
  const list = PR.filter(p => !p.official && (pracFilter === 'all' || p.mod === pracFilter));
  v.innerHTML = (OFF ? offCard() : '') + `<div class="card"><h2>Đề thực hành của trường khác</h2>
    <p class="mut">${PR.length} đề PDF trong thư mục <code>de-thuc-hanh</code>. Đây là đề của trường khác (ĐH KHTN, CĐKT Cao Thắng), dùng để luyện thao tác, <b>không phải đề IUH</b>. Đề "Trọn bộ" (Windows, Word, PowerPoint, Excel trong 120 phút) có cấu trúc gần bài thi thật nhất.</p>
    <div class="note">Đề theo mô đun yêu cầu lưu <code>D:\\CA1\\SBD.doc</code>, <code>SBD.xls</code>, <code>SBD.pptx</code> (SBD là số báo danh, ví dụ K26-017). Hãy tập lưu đúng thư mục và tên file, sai đường dẫn có thể mất trắng cả phần. Bảng dữ liệu hoặc "nội dung cho sẵn" trong đề thì gõ lại theo hình trong đề. Phần Windows cần tìm file <code>.TXT</code>/<code>.LOG</code> theo dung lượng: tìm trong <code>C:\\Windows</code>.</div>
    <div class="row" style="margin-top:8px">${chips.map(c => `<button class="btn ${pracFilter === c[0] ? '' : 'sec'}" data-f="${esc(c[0])}" style="padding:5px 12px">${c[1]}</button>`).join('')}</div></div>
    <div class="card">${list.map(p => {
      const st = pracStat(p.id);
      return `<div class="day"><div style="flex:1;min-width:200px"><div class="dt"><b>${esc(p.title)}</b> <span class="tag">${p.min} phút</span>${st ? `<span class="tag hot">đã làm ${st.n} lần${st.best != null ? ' · cao nhất ' + st.best + '/10' : ''} · ${dayFmt(st.last)}</span>` : ''}</div>
        <small>${esc(p.src)} · ${p.kb} KB</small></div>
        <div class="row"><a class="btn sec" href="${esc(prHref(p))}" target="_blank" rel="noopener">Mở</a><a class="btn sec" href="${esc(prHref(p))}" download="${esc(p.name)}">Tải</a><button class="btn" data-do="${esc(p.id)}">Làm đề này</button></div></div>`;
    }).join('')}</div>`;
  v.querySelectorAll('[data-f]').forEach(b => b.onclick = () => { pracFilter = b.dataset.f; render(); });
  v.querySelectorAll('[data-do]').forEach(b => b.onclick = () => {
    const p = prById(b.dataset.do);
    if (S.th && S.th.start && !confirm('Đang có một đồng hồ thực hành chạy. Bắt đầu đề này sẽ thay thế đồng hồ đó. Tiếp tục?')) return;
    S.th = { start: Date.now(), exam: p.id, min: p.min }; save();
    if (!p.official) window.open(prHref(p), '_blank', 'noopener');   // .doc của đề mẫu IUH không xem được trong trình duyệt, tải zip rồi mở bằng Word
    mock = { th: true }; go('mock');
  });
  v.querySelectorAll('[data-o]').forEach(c => c.onchange = () => {   // cập nhật tại chỗ để không đóng các mục "Cách làm"
    S.off[c.dataset.o] = c.checked; save();
    $('#offsc').textContent = offScore() + '/10';
    OFF.sections.forEach(s => { const el = $('#ss-' + s.name); if (el) el.textContent = secScore(s); });
    c.closest('.day').classList.toggle('done', c.checked);
  });
  const rst = $('#offrst');
  if (rst) rst.onclick = () => { if (confirm('Bỏ tick toàn bộ checklist đề mẫu?')) { S.off = {}; save(); render(); } };
}

/* ---------- thi thử ---------- */
const MIX = { IU01: 4, IU02: 6, IU03: 6, IU04: 6, IU05: 4, IU06: 4 };
const PHASES = [['Windows', 10], ['Word', 30], ['Excel', 40], ['PowerPoint', 25], ['Kiểm tra lại', 15]];
function viewMock(v) {
  clearInterval(tick); tick = null;
  if (mock && !mock.done) return mockRun(v);
  if (mock && mock.done) return mockResult(v);
  const hist = S.mocks.slice(-6).reverse().map(m => `<li>${dayFmt(m.day)} · ${m.type === 'lt' ? 'Lý thuyết ' + m.score.toFixed(1) + '/10 (' + m.correct + '/' + m.total + ')' : 'Thực hành' + (m.exam ? ' · ' + (prById(m.exam) ? prById(m.exam).title : m.exam) : '') + ' · ' + m.min + ' phút, tự chấm ' + (m.self == null ? '–' : m.self + '/10')}</li>`).join('');
  const thRun = S.th && S.th.start;
  const phText = IUH_PHASES.map(p => p[0] + ' ' + p[1] + '′').join(', ');
  v.innerHTML = `<div class="card"><h2>Thi thử lý thuyết</h2><p class="mut">30 câu trong 30 phút, trộn các mô đun. Đạt khi từ 5/10 (15/30 câu) trở lên. Ngưỡng này lấy từ tài liệu bên thứ ba, hãy kiểm tra lại với Trung tâm.</p>
    <button class="btn" id="lt">Bắt đầu thi thử 30 phút</button></div>
    <div class="card"><h2>Thi thử thực hành</h2><p class="mut">Đồng hồ 90 phút (đúng thời lượng đề mẫu IUH) với gợi ý phân bổ: ${phText} (gợi ý của app, không phải quy định). Bạn tự làm trên Word/Excel/PowerPoint thật, app chỉ bấm giờ và ghi kết quả. Đề nằm ở tab Đề thực hành.</p>
    <div class="note">Đọc kỹ dòng lưu ý đầu đề về tên file và ổ đĩa lưu. Lưu ngay sau khi xong mỗi phần.</div>
    <div class="row"><button class="btn" id="th">${thRun ? 'Xem đồng hồ đang chạy' : 'Bắt đầu đồng hồ 90 phút'}</button><button class="btn sec" data-tab="prac">Chọn đề để làm (có tải đề)</button></div></div>
    <div class="card"><h2>Lịch sử gần đây</h2>${hist ? '<ul>' + hist + '</ul>' : '<p class="mut">Chưa có lần thi thử nào.</p>'}</div>`;
  $('#lt').onclick = () => {
    if (QS.length < 30) { alert('Chưa đủ 30 câu trong ngân hàng'); return; }
    let list = [];
    MODS.forEach(m => { list = list.concat(shuffle(qOf(m)).slice(0, MIX[m] || 0)); });
    if (list.length < 30) { const ids = new Set(list.map(x => x.id)); list = list.concat(shuffle(QS.filter(x => !ids.has(x.id))).slice(0, 30 - list.length)); }
    list = shuffle(list).slice(0, 30);
    mock = { list, order: list.map(x => shuffle([0, 1, 2, 3].slice(0, x.options.length))), ans: list.map(() => -1), cur: 0, end: Date.now() + 30 * 60000, start: Date.now(), done: false };
    render();
  };
  $('#th').onclick = () => { if (!S.th || !S.th.start) { S.th = { start: Date.now(), min: 90 }; save(); } mock = { th: true }; render(); };
}
function mockRun(v) {
  if (mock.th) return thRun(v);
  const it = mock.list[mock.cur], ord = mock.order[mock.cur];
  v.innerHTML = `<div class="card"><div class="row" style="justify-content:space-between"><b>Câu ${mock.cur + 1}/30</b><b id="tm"></b></div>
    <div class="nums">${mock.list.map((_, i) => `<button data-n="${i}" class="${mock.ans[i] >= 0 ? 'a' : ''} ${i === mock.cur ? 'cur' : ''}">${i + 1}</button>`).join('')}</div>
    <p style="font-size:17px"><b>${esc(it.q)}</b></p>
    ${ord.map((k, j) => `<button class="opt ${mock.ans[mock.cur] === j ? 'sel' : ''}" data-j="${j}"><b>${'ABCD'[j]}.</b> ${esc(it.options[k])}</button>`).join('')}
    <div class="row" style="margin-top:10px"><button class="btn sec" id="pv" ${mock.cur === 0 ? 'disabled' : ''}>Câu trước</button><button class="btn sec" id="nx" ${mock.cur === 29 ? 'disabled' : ''}>Câu sau</button><button class="btn" id="sub">Nộp bài</button></div></div>`;
  v.querySelectorAll('[data-n]').forEach(b => b.onclick = () => { mock.cur = +b.dataset.n; render(); });
  v.querySelectorAll('[data-j]').forEach(b => b.onclick = () => { mock.ans[mock.cur] = +b.dataset.j; render(); });
  $('#pv').onclick = () => { mock.cur--; render(); };
  $('#nx').onclick = () => { mock.cur++; render(); };
  $('#sub').onclick = function () {
    const blank = mock.ans.filter(a => a < 0).length;
    if (blank && !this.dataset.sure) { this.dataset.sure = 1; this.textContent = `Còn ${blank} câu chưa trả lời. Bấm lại để nộp`; return; }
    finishMock();
  };
  const upd = () => {
    const el = $('#tm'); if (!el) { clearInterval(tick); return; }
    const left = (mock.end - Date.now()) / 1000; el.textContent = 'Còn ' + mmss(left);
    if (left <= 0) { clearInterval(tick); finishMock(); }
  };
  upd(); tick = setInterval(upd, 500);
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
  save(); render();
}
function mockResult(v) {
  const pass = mock.score >= 5;
  v.innerHTML = `<div class="card"><h2>Kết quả thi thử lý thuyết</h2><div class="big" style="color:${pass ? 'var(--ok)' : 'var(--bad)'}">${mock.score.toFixed(1)}/10</div>
    <p style="text-align:center" class="mut">${mock.correct}/${mock.list.length} câu đúng · ${pass ? 'trên ngưỡng 5/10' : 'dưới ngưỡng 5/10'}. Câu sai đã được đưa vào lịch ôn.</p>
    <div class="row" style="justify-content:center"><button class="btn" id="back">Quay lại</button></div></div>
    ${mock.list.map((it, i) => {
      const chosen = mock.ans[i] >= 0 ? mock.order[i][mock.ans[i]] : -1, ok = chosen === it.answer;
      return `<div class="card"><span class="tag">${it.m}</span> <b>Câu ${i + 1}</b> ${ok ? '<span style="color:var(--ok)">đúng</span>' : '<span style="color:var(--bad)">' + (chosen < 0 ? 'bỏ trống' : 'sai') + '</span>'}
      <p>${esc(it.q)}</p><div>Đáp án đúng: <b>${esc(it.options[it.answer])}</b></div>${!ok && chosen >= 0 ? `<div class="mut">Bạn chọn: ${esc(it.options[chosen])}</div>` : ''}
      <div class="exp">${esc(it.explain || '')}</div></div>`;
    }).join('')}`;
  $('#back').onclick = () => { mock = null; render(); };
}
function thRun(v) {
  const start = S.th && S.th.start;
  if (!start) { mock = null; render(); return; }
  const total = (S.th.min || 120), ex = S.th.exam && prById(S.th.exam);
  const phases = ((ex && ex.official) || (!ex && total === 90)) ? IUH_PHASES : total === 120 ? PHASES : [[ex ? ex.mod : 'Làm bài', total]];
  v.innerHTML = `<div class="card"><h2>Thi thử thực hành${ex ? ' · ' + esc(ex.title) : ''}</h2>
    ${ex && ex.official ? `<p class="mut"><a href="${esc(encodeURI(OFF.zip))}" download>Tải bộ đề + dữ liệu (zip)</a> · <a href="#" data-tab="prac">Xem checklist đề</a></p>` : ex ? `<p class="mut"><a href="${esc(prHref(ex))}" target="_blank" rel="noopener">Mở lại đề (PDF)</a></p>` : ''}<div class="big" id="tm"></div>
    <div id="ph"></div>
    <div class="note">${ex && ex.official ? 'Lưu bài vào đúng thư mục BaiThi... và đổi tên file đúng như đề. Không ghi họ tên hay mã sinh viên vào file bài làm (chấm theo phách).' : 'Nhớ lưu file đúng tên và đúng ổ đĩa theo dòng lưu ý đầu đề. Lưu sau mỗi phần.'}</div>
    <div class="row"><button class="btn" id="fin">Nộp bài và ghi kết quả</button><button class="btn sec" id="hide">Ẩn (đồng hồ vẫn chạy)</button></div></div>`;
  $('#hide').onclick = () => { mock = null; render(); };
  $('#fin').onclick = () => { thFinish(v); };
  const upd = () => {
    const el = $('#tm'); if (!el) { clearInterval(tick); return; }
    const el2 = (Date.now() - start) / 1000, left = total * 60 - el2;
    el.textContent = left >= 0 ? mmss(left) : '-' + mmss(-left);
    let acc = 0;
    $('#ph').innerHTML = phases.map(p => {
      const a = acc * 60, b = (acc + p[1]) * 60; acc += p[1];
      const cls = el2 >= b ? 'past' : el2 >= a ? 'on' : '';
      return `<div class="ph ${cls}"><span>${p[0]}</span><span>${p[1]} phút</span></div>`;
    }).join('');
  };
  upd(); tick = setInterval(upd, 500);
}
function thFinish(v) {
  clearInterval(tick);
  const min = Math.round((Date.now() - S.th.start) / 60000);
  v.innerHTML = `<div class="card"><h2>Ghi kết quả thực hành</h2><p>Thời gian đã dùng: <b>${min} phút</b>. ${S.th.exam === OFF_ID ? 'Điểm bên dưới lấy từ checklist đề mẫu ở tab Đề thực hành, bạn có thể sửa.' : 'Chấm lại bài theo đề và nhập điểm tự chấm.'}</p>
    <p><label>Điểm tự chấm (0–10) <input type="number" id="self" min="0" max="10" step="0.05" value="${S.th.exam === OFF_ID ? offScore() : ''}" style="width:90px"></label></p>
    <p class="mut">Sau khi lưu, sang tab Sổ lỗi để ghi từng lỗi đã mắc.</p>
    <div class="row"><button class="btn" id="ok">Lưu</button><button class="btn sec" id="cancel">Quay lại đồng hồ</button></div></div>`;
  $('#cancel').onclick = () => { render(); };
  $('#ok').onclick = () => {
    const s = $('#self').value;
    S.mocks.push({ type: 'th', day: today(), min, self: s === '' ? null : +s, exam: S.th.exam || null });
    S.th = null; mock = null; save(); go('errors');
  };
}

/* ---------- sổ lỗi ---------- */
const CATS = ['Windows', 'Word', 'Excel', 'PowerPoint', 'Lý thuyết', 'Khác'];
function viewErrors(v) {
  const top = QS.filter(x => S.q[x.id] && S.q[x.id].wrong > 0).sort((a, b) => S.q[b.id].wrong - S.q[a.id].wrong).slice(0, 8);
  v.innerHTML = `<div class="card"><h2>Thêm lỗi</h2>
    <div class="row"><select id="cat">${CATS.map(c => `<option>${c}</option>`).join('')}</select></div>
    <p><textarea id="what" placeholder="Lỗi đã mắc (ví dụ: quên khoá ô $ khi copy công thức VLOOKUP)"></textarea></p>
    <p><textarea id="fix" placeholder="Cách làm đúng"></textarea></p>
    <button class="btn" id="add">Lưu vào sổ lỗi</button></div>
    <div class="card"><h2>Sổ lỗi (${S.errors.filter(e => !e.fixed).length} chưa khắc phục)</h2>
    ${S.errors.length ? S.errors.slice().reverse().map(e => `<div class="day ${e.fixed ? 'done' : ''}"><input type="checkbox" data-f="${e.id}" ${e.fixed ? 'checked' : ''} title="Đã khắc phục" style="margin-top:5px">
      <div style="flex:1"><div class="dt"><span class="tag">${esc(e.cat)}</span> ${esc(e.what)}</div>${e.fix ? `<small>Cách đúng: ${esc(e.fix)}</small>` : ''}</div>
      <button class="btn sec" data-x="${e.id}" style="padding:3px 9px">Xoá</button></div>`).join('') : '<p class="mut">Chưa có lỗi nào. Sau mỗi lần làm đề, ghi lỗi tại đây và làm lại đúng thao tác đó.</p>'}</div>
    <div class="card"><h2>Câu trắc nghiệm hay sai nhất</h2>${top.length ? top.map(x => `<div style="padding:6px 0;border-top:1px solid var(--line)"><span class="tag">${x.m}</span> ${esc(x.q)} <span class="mut">(sai ${S.q[x.id].wrong} lần)</span></div>`).join('') : '<p class="mut">Chưa có câu sai.</p>'}</div>`;
  $('#add').onclick = () => {
    const what = $('#what').value.trim(); if (!what) return;
    S.errors.push({ id: Date.now().toString(36) + Math.random().toString(36).slice(2, 5), cat: $('#cat').value, what, fix: $('#fix').value.trim(), fixed: false, day: today() });
    save(); render();
  };
  v.querySelectorAll('[data-f]').forEach(c => c.onchange = () => { const e = S.errors.find(x => x.id === c.dataset.f); if (e) { e.fixed = c.checked; save(); render(); } });
  v.querySelectorAll('[data-x]').forEach(b => b.onclick = () => { S.errors = S.errors.filter(x => x.id !== b.dataset.x); save(); render(); });
}

render();
})();
