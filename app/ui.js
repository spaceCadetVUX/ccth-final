/* Bộ thành phần UI dùng chung: icon SVG nội tuyến (chạy offline), toast, hộp thoại xác nhận thay cho alert/confirm của trình duyệt. */
(function () {
'use strict';

const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const P = {
  home: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/><path d="M9.5 21v-6h5v6"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M8 3v4M16 3v4M3 10h18"/>',
  quiz: '<circle cx="12" cy="12" r="9"/><path d="m8 12.5 3 3 5-6"/>',
  exam: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/><path d="m9 15 2 2 4-4"/>',
  cards: '<path d="m12 3 9 5-9 5-9-5z"/><path d="m3 13 9 5 9-5"/>',
  prac: '<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/>',
  timer: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2M9 2h6"/>',
  book: '<path d="M5 4a2 2 0 0 1 2-2h11v18H7a2 2 0 0 0-2 2z"/><path d="M5 22V4M9 7h6M9 11h6"/>',
  more: '<circle cx="5" cy="12" r="1.5" fill="currentColor"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/><circle cx="19" cy="12" r="1.5" fill="currentColor"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  moon: '<path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5z"/>',
  auto: '<circle cx="12" cy="12" r="9"/><path d="M12 3a9 9 0 0 1 0 18z" fill="currentColor"/>',
  download: '<path d="M12 3v12m0 0-4-4m4 4 4-4M4 21h16"/>',
  upload: '<path d="M12 15V3m0 0L8 7m4-4 4 4M4 21h16"/>',
  play: '<path d="M7 4.5v15l13-7.5z" fill="currentColor"/>',
  right: '<path d="M5 12h14m-6-6 6 6-6 6"/>',
  left: '<path d="M19 12H5m6-6-6 6 6 6"/>',
  x: '<path d="M6 6l12 12M18 6 6 18"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  down: '<path d="m6 9 6 6 6-6"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  bolt: '<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>',
  trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
  ext: '<path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>',
  refresh: '<path d="M20 11a8 8 0 0 0-14.5-3.5M4 4v4h4M4 13a8 8 0 0 0 14.5 3.5M20 20v-4h-4"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5h.01"/>',
  alert: '<path d="M12 3 2 20h20z"/><path d="M12 10v5M12 17.5h.01"/>',
  folder: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
  list: '<path d="M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01"/>',
  target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1" fill="currentColor"/>',
  shield: '<path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z"/><path d="m9 12 2 2 4-4"/>',
  star: '<path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/>',
  logo: '<path d="M4 6.5 12 3l8 3.5-8 3.5z"/><path d="M7 11v4.5c0 1.4 2.2 2.8 5 2.8s5-1.4 5-2.8V11"/><path d="M20 7v6"/>'
};

function ic(name, size) {
  const s = size || 20;
  return `<svg class="ic" width="${s}" height="${s}" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${P[name] || ''}</svg>`;
}

function toast(msg, kind, ms) {
  const box = document.getElementById('toasts');
  if (!box) return;
  const el = document.createElement('div');
  el.className = 'toast ' + (kind || 'info');
  el.setAttribute('role', kind === 'bad' ? 'alert' : 'status');
  el.innerHTML = ic(kind === 'ok' ? 'check' : (kind === 'bad' || kind === 'warn') ? 'alert' : 'info', 18) + '<span></span>';
  el.lastChild.textContent = msg;
  box.appendChild(el);
  requestAnimationFrame(() => el.classList.add('in'));
  setTimeout(() => { el.classList.remove('in'); setTimeout(() => el.remove(), 250); }, ms || 3800);
}

/* ask({title,text,ok,cancel,danger}) -> Promise<boolean> */
function ask(o) {
  return new Promise(resolve => {
    const m = document.getElementById('modal'), prev = document.activeElement;
    m.innerHTML = `<div class="modal-bd" data-x></div><div class="modal-p" role="dialog" aria-modal="true" aria-labelledby="mt">
      <h2 id="mt">${esc(o.title || 'Xác nhận')}</h2><p>${esc(o.text || '')}</p>
      <div class="modal-a"><button class="btn sec" data-c>${esc(o.cancel || 'Huỷ')}</button><button class="btn ${o.danger ? 'bad' : ''}" data-o>${esc(o.ok || 'Đồng ý')}</button></div></div>`;
    m.hidden = false; document.body.classList.add('noscroll');
    const okb = m.querySelector('[data-o]'), cb = m.querySelector('[data-c]');
    const done = v => {
      m.hidden = true; m.innerHTML = ''; document.body.classList.remove('noscroll');
      document.removeEventListener('keydown', kd, true);
      if (prev && prev.focus) prev.focus();
      resolve(v);
    };
    const kd = e => {
      if (e.key === 'Escape') { e.preventDefault(); done(false); }
      else if (e.key === 'Tab') {   // giữ focus trong hộp thoại
        const a = document.activeElement;
        if (e.shiftKey && a === cb) { e.preventDefault(); okb.focus(); }
        else if (!e.shiftKey && a === okb) { e.preventDefault(); cb.focus(); }
        else if (a !== okb && a !== cb) { e.preventDefault(); cb.focus(); }
      }
    };
    document.addEventListener('keydown', kd, true);
    okb.onclick = () => done(true); cb.onclick = () => done(false);
    m.querySelector('[data-x]').onclick = () => done(false);
    (o.danger ? cb : okb).focus();   // nút nguy hiểm: mặc định focus vào "Huỷ"
  });
}

window.UI = { ic, toast, ask, esc };
})();
