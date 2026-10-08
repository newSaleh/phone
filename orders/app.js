'use strict';
/* طلبيات الموردين — واجهة مبسّطة: الرئيسية (3 أيقونات) ← طلبية جديدة (مورد ← تصوير ← مراجعة) | استلام (ما وصل فرعي من النظام أو مطابقة طلبية) | الطلبيات السابقة.
   النصوص كلها من i18n.js (عربي/إنجليزي/أوردو). الفرع يثبت من رابط الفرع: ?b=701#k=كلمة-سر-بيانات-الفرع */
const $ = s => document.querySelector(s);
const el = (tag, props = {}, ...kids) => { const e = Object.assign(document.createElement(tag), props); kids.flat().forEach(k => k != null && e.append(k)); return e; };
const APP_V = '3.0 — 31 أكتوبر 2026';
const BRANCH_CODES = ['701', '803', '707', '706', '711'];
const bName = c => BRANCH_CODES.includes(c) ? t('br' + c) : '';
const brOf = o => bName(o.branch) || o.branch_name || '';
const today = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
const hex = n => [...crypto.getRandomValues(new Uint8Array(n))].map(x => x.toString(16).padStart(2, '0')).join('');
const LS = {get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (_) { return d; } }, set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (_) {} }};
const nAr = s => String(s || '').toLowerCase().replace(/[ً-ْـ]/g, '').replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي');
const orderNo = o => '‎' + PDFGen.orderNo(o), supOf = PDFGen.supplierOf, dateL = iso => I18N.date(iso);
const nonEmpty = l => (l.model || '').trim();
const clone = o => JSON.parse(JSON.stringify(o));
const pcs = rows => rows.reduce((a, r) => a + (+r[2] || 0), 0);

/* ---------- اللغة والمظهر ---------- */
const guessLang = () => { const n = (navigator.language || 'ar').slice(0, 2).toLowerCase(); return n === 'ur' ? 'ur' : n === 'en' ? 'en' : 'ar'; };
let LANG = LS.get('lang', '') || guessLang(), THEME = LS.get('theme', '') || (matchMedia('(prefers-color-scheme:light)').matches ? 'day' : 'night');
function applyLang(l) {
  LANG = l; I18N.set(l); const d = document.documentElement; d.lang = l; d.dir = I18N.rtl(l) ? 'rtl' : 'ltr';
  $('#back').textContent = t('back'); document.title = t('appTitle'); $('#theme').title = t(THEME === 'night' ? 'themeDay' : 'themeNight');
}
function applyTheme(th) {
  THEME = th; document.documentElement.dataset.theme = th; const m = document.querySelector('meta[name=theme-color]'); if (m) m.content = th === 'night' ? '#16202e' : '#1d3557';
  $('#theme').textContent = th === 'night' ? '☀️' : '🌙'; $('#theme').title = t(th === 'night' ? 'themeDay' : 'themeNight');
}

/* ---------- الفرع (من رابط الفرع) ---------- */
let BR = LS.get('branch', ''), BKEY = LS.get('bkey', '');
(() => {
  const b = new URLSearchParams(location.search).get('b'), k = (location.hash.match(/[#&]k=([^&]+)/) || [])[1];
  if (b && BRANCH_CODES.includes(b)) { if (b !== BR) BKEY = ''; BR = b; if (k) BKEY = decodeURIComponent(k); LS.set('branch', BR); LS.set('bkey', BKEY); }
})();

let SET = Object.assign({company: 'ALHARAM CENTER', sender: '', phone: '', pdfLang: 'ar'}, LS.get('settings', {}));
let RKEY = null, SUPS = LS.get('sups', []), ORDERS = [], cur = null, dirty = false, saveTimer = 0, homeQ = '', homeF = 'all', rTab = 'res', RECV = null;
const pdfSt = () => Object.assign({}, SET, {lang: SET.pdfLang || 'ar'});

/* ---------- التخزين: IndexedDB على هذا الجهاز ---------- */
const DB = (() => {
  let db;
  const open = () => db ? Promise.resolve(db) : new Promise((res, rej) => { const r = indexedDB.open('orders-app', 1); r.onupgradeneeded = () => r.result.createObjectStore('orders', {keyPath: 'id'}); r.onsuccess = () => res(db = r.result); r.onerror = () => rej(r.error); });
  const tx = async (mode, fn) => { const d = await open(); return new Promise((res, rej) => { const t = d.transaction('orders', mode), out = fn(t.objectStore('orders')); t.oncomplete = () => res(out.result); t.onerror = () => rej(t.error); }); };
  return {put: o => tx('readwrite', s => s.put(o)), all: () => tx('readonly', s => s.getAll()), del: id => tx('readwrite', s => s.delete(id))};
})();
const loadOrders = async () => { ORDERS = (await DB.all()).sort((a, b) => (b.updated || 0) - (a.updated || 0)); };
function nextNumber() { const n = (+LS.get('counter', 0) || 0) + 1; LS.set('counter', n); return n; }

function serialize(o) {
  const lines = a => (a || []).filter(l => nonEmpty(l) || (l.note || '').trim());
  const rec = {id: o.id, number: o.number, branch: o.branch, branch_name: BRANCH_CODES.includes(o.branch) ? I18N.tl('ar', 'br' + o.branch) : (o.branch_name || ''), date: o.date || today(), supplier_code: o.supplier_code || '', supplier_name: o.supplier_name || '',
    note: o.note || '', pages: o.pages || [], created: o.created || Date.now(), updated: Date.now(), lines: lines(o.lines)};
  if (o.receipt) rec.receipt = {date: o.receipt.date || today(), pages: o.receipt.pages || [], updated: Date.now(), lines: lines(o.receipt.lines)};
  return rec;
}
function touch() { dirty = true; clearTimeout(saveTimer); saveTimer = setTimeout(flush, 900); }
async function flush() {
  clearTimeout(saveTimer);
  if (!cur || !dirty || !cur.branch) return false;
  if (!(cur.lines.some(nonEmpty) || cur.pages.length || (cur.receipt && cur.receipt.lines.some(nonEmpty)))) return false;
  if (!cur.number) cur.number = nextNumber();
  const rec = serialize(cur); dirty = false;
  await DB.put(rec); ORDERS = [rec, ...ORDERS.filter(x => x.id !== rec.id)];
  return true;
}
window.addEventListener('pagehide', flush);
document.addEventListener('visibilitychange', () => { if (document.hidden) flush(); });

/* ---------- أدوات الواجهة ---------- */
function toast(msg) { const x = $('#toast'); x.textContent = msg; x.style.display = 'block'; clearTimeout(toast.t); toast.t = setTimeout(() => x.style.display = 'none', 2400); }
const busy = (msg, pct, sub) => { const b = $('#busy'); b.hidden = msg == null; if (msg == null) return; $('#busyMsg').textContent = msg; $('#busyBar').style.width = Math.round((pct || 0) * 100) + '%'; $('#busySub').textContent = sub || ''; };
const zoom = src => { const lb = $('#lb'); lb.firstElementChild.src = src; lb.style.display = 'flex'; };
$('#lb').onclick = () => $('#lb').style.display = 'none';
function head(title, back) { $('#ttl').textContent = title; const b = $('#back'); b.hidden = !back; ['#lang', '#theme', '#gear'].forEach(x => $(x).hidden = !!back); b.onclick = async () => { await flush(); back(); }; window.scrollTo(0, 0); $('#app').replaceChildren(); }
function sheet(title, build) {
  const veil = el('div', {className: 'veil'}), sh = el('div', {className: 'sheet'}), close = () => veil.remove();
  sh.append(el('h2', {}, el('span', {textContent: title}), el('button', {className: 'sm', textContent: '✕', onclick: close}))); build(sh, close);
  veil.append(sh); veil.onclick = e => { if (e.target === veil) close(); }; document.body.append(veil); return close;
}
const steps = (n, total = 3) => el('div', {className: 'steps'}, Array.from({length: total}, (_, i) => el('i', {className: i < n ? 'on' : ''})));
const badge = st => el('span', {className: 'badge ' + st.state, textContent: st.state === 'pending' ? t('stPending') : st.state === 'done' ? t('stDone') : t('stDiff', {n: st.issues})});
function pickFiles(cb, camera) {
  const i = el('input', {type: 'file', accept: camera ? 'image/*' : '.pdf,image/*', multiple: !camera, hidden: true});
  if (camera) i.setAttribute('capture', 'environment');
  i.onchange = () => { const f = [...i.files]; i.remove(); if (f.length) cb(f); }; document.body.append(i); i.click();
}
function langButtons(cur0, on) { return el('div', {className: 'choices'}, [['ar', 'العربية'], ['en', 'English'], ['ur', 'اردو']].map(([c, n]) => el('button', {className: 'choice' + (cur0 === c ? ' on' : ''), style: 'min-height:56px', onclick: () => on(c)}, el('span', {textContent: n})))); }
function langSheet() {
  sheet(t('langTitle'), (sh, close) => sh.append(langButtons(LANG, async l => { close(); LS.set('lang', l); applyLang(l); await flush(); vHome(); })));
}

/* ---------- قائمة الموردين (مشفّرة) ---------- */
const b64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
async function fileKey(j, pw) {
  const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(pw.trim()), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey({name: 'PBKDF2', salt: b64(j.salt), iterations: j.iter, hash: 'SHA-256'}, base, {name: 'AES-GCM', length: 256}, false, ['encrypt', 'decrypt']);
}
async function decryptWith(key, j) {
  let buf = new Uint8Array(await crypto.subtle.decrypt({name: 'AES-GCM', iv: b64(j.iv)}, key, b64(j.ct)));
  if (j.z) buf = new Uint8Array(await new Response(new Blob([buf]).stream().pipeThrough(new DecompressionStream('deflate'))).arrayBuffer());
  return JSON.parse(new TextDecoder().decode(buf));
}
const decryptFile = async (j, pw) => decryptWith(await fileKey(j, pw), j);
async function unlockSuppliers() {
  const pw = prompt(t('unlockAsk')); if (!pw) return false;
  try { SUPS = await decryptFile(await (await fetch('suppliers.enc.json')).json(), pw); LS.set('sups', SUPS); toast(t('unlocked')); return true; }
  catch (_) { alert(t('badCode')); return false; }
}
function parseSupplier(text) {
  text = (text || '').trim(); const m = text.match(/^(\d{3,4})\b\s*[-–—:]?\s*(.*)$/);
  if (m) { const code = m[1].padStart(4, '0'); return [code, m[2].trim() || (SUPS.find(s => s.code === code) || {}).name || '']; }
  const hit = SUPS.find(s => s.name === text); return hit ? [hit.code, hit.name] : ['', text];
}
function supplierPicker(onPick, skip) {
  const wrap = el('div'), top = el('div'), list = el('div');
  const input = el('input', {type: 'search', placeholder: t('supSearchPh'), autocomplete: 'off'});
  const row = s => el('button', {className: 'sup', onclick: () => onPick(s.code, s.name)}, el('span', {textContent: s.name}), el('b', {textContent: s.code}));
  const drawTop = () => { top.replaceChildren(); if (!SUPS.length) top.append(el('div', {className: 'lockbox'}, el('div', {textContent: t('supLocked')}),
    el('button', {className: 'pri', style: 'margin-top:8px', textContent: t('unlock'), onclick: async () => { if (await unlockSuppliers()) { drawTop(); draw(); } }}))); };
  const draw = () => {
    const q = nAr(Cmp.digits(input.value)).trim(); list.replaceChildren();
    if (q) {
      const arr = SUPS.filter(s => s.code.includes(q) || nAr(s.name).includes(q)); arr.slice(0, 40).forEach(s => list.append(row(s)));
      const [c, n] = parseSupplier(input.value);
      if (!arr.length) list.append(el('div', {className: 'empty', textContent: t('noSupFound')}));
      list.append(el('button', {className: 'big', textContent: t('useAs', {t: input.value.trim()}), onclick: () => onPick(c, n)}));
      return;
    }
    const cnt = {}; ORDERS.forEach(o => { const k = o.supplier_code || o.supplier_name; if (k) cnt[k] = (cnt[k] || 0) + 1; });
    const recent = Object.keys(cnt).sort((a, b) => cnt[b] - cnt[a]).slice(0, 5).map(k => SUPS.find(s => s.code === k) || ORDERS.map(o => ({code: o.supplier_code, name: o.supplier_name})).find(s => (s.code || s.name) === k)).filter(Boolean);
    if (recent.length) { list.append(el('div', {className: 'mut', textContent: t('mostUsed')})); recent.forEach(s => list.append(row(s))); }
    if (SUPS.length) { list.append(el('div', {className: 'mut', style: 'margin:8px 0', textContent: t('allSups', {n: SUPS.length})})); SUPS.forEach(s => list.append(row(s))); }
    if (skip) list.append(el('button', {className: 'sm', style: 'margin-top:10px', textContent: t('skipSup'), onclick: skip}));
  };
  input.oninput = draw; wrap.append(top, input, el('div', {style: 'height:10px'}), list); drawTop(); draw();
  if (!SUPS.length && BR && BKEY) loadRecv().then(() => { drawTop(); draw(); }).catch(() => {});
  return wrap;
}
function branchButtons(onPick, sel) {
  return el('div', {className: 'choices'}, BRANCH_CODES.map(c => el('button', {className: 'choice' + (sel === c ? ' on' : ''), onclick: () => onPick(c)}, el('span', {textContent: bName(c)}), el('small', {textContent: c}))));
}

/* ---------- القراءة من الصور / PDF ---------- */
let ocrP = null;
const warmOCR = cb => ocrP || (ocrP = OCR.init('', cb).catch(e => { ocrP = null; throw e; }));
async function renderPdfPage(doc, n) {
  const page = await doc.getPage(n); let scale = 200 / 72, vp = page.getViewport({scale});
  if (vp.width * vp.height > 9e6) { scale *= Math.sqrt(9e6 / (vp.width * vp.height)); vp = page.getViewport({scale}); }
  const c = document.createElement('canvas'); c.width = Math.round(vp.width); c.height = Math.round(vp.height);
  const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); await page.render({canvasContext: g, viewport: vp}).promise; return c;
}
async function imageCanvas(file) {
  let bmp; try { bmp = await createImageBitmap(file, {imageOrientation: 'from-image'}); } catch (_) { bmp = await createImageBitmap(file); }
  const c = OCR.fitImage(bmp); bmp.close && bmp.close(); return c;
}
// يقرأ الملفات ويضيف السطور إلى target = {lines, pages}. يرجع عدد السطور المضافة
async function readInto(files, target) {
  busy(t('prepOcr'), 0.02, t('prepOcrSub'));
  try {
    await warmOCR(); pdfjsLib.GlobalWorkerOptions.workerSrc = 'vendor/pdf.worker.min.js';
    const items = [];
    for (const f of files) { if (/\.pdf$/i.test(f.name) || f.type === 'application/pdf') { const doc = await pdfjsLib.getDocument({data: await f.arrayBuffer()}).promise; items.push({f, doc, n: doc.numPages}); } else items.push({f, n: 1}); }
    const total = items.reduce((a, i) => a + i.n, 0); let done = 0, added = 0;
    for (const it of items) for (let n = 1; n <= it.n; n++) {
      busy(t('readPage', {i: done + 1, n: total}), done / total, t('readSub'));
      const res = await OCR.readPage(it.doc ? await renderPdfPage(it.doc, n) : await imageCanvas(it.f));
      const th = document.createElement('canvas'), sc = Math.min(1, 1000 / res.page.width); th.width = Math.round(res.page.width * sc); th.height = Math.round(res.page.height * sc);
      th.getContext('2d').drawImage(res.page, 0, 0, th.width, th.height);
      target.pages.push(th.toDataURL('image/jpeg', 0.6)); const pageNo = target.pages.length;
      res.lines.forEach(l => target.lines.push({id: hex(4), model: l.text, score: Math.round(l.score * 100) / 100, page: pageNo, img: l.rowUrl, qty: '', note: ''}));
      added += res.lines.length; done++;
    }
    busy(null); touch();
    if (!added) alert(t('noModels'));
    return added;
  } catch (e) { console.error(e); busy(null); alert(t('readFail', {e: e.message || e})); return 0; }
}
function typeSheet(arr, after) {
  sheet(t('typeT'), (sh, close) => {
    const ta = el('textarea', {rows: 8, placeholder: t('typePh'), style: 'direction:ltr;text-align:left;font-family:Consolas,monospace;font-size:18px'});
    sh.append(ta, el('button', {className: 'ok big', style: 'margin-top:10px', textContent: t('addBtn'), onclick: () => {
      let n = 0;
      ta.value.split(/\n/).forEach(x => { const p = Cmp.digits(x).trim().split(/[\s,;\t]+/).filter(Boolean); if (!p.length) return; arr.push({id: hex(4), model: p[0].toUpperCase(), qty: p[1] && Cmp.num(p[1]) != null ? p[1] : '', note: '', img: '', score: null, page: null}); n++; });
      close(); if (n) { touch(); toast(t('added', {n})); } after(); } }));
    setTimeout(() => ta.focus(), 60);
  });
}

/* ---------- محرّر السطور ---------- */
function linesBox(arr, pages, onChange) {
  const box = el('div'), api = {box, low: false, draw};
  const isLow = l => l.score != null && l.score < 0.85;
  function draw(focus) {
    box.replaceChildren(); const cnt = {}; arr.forEach(l => { const k = Cmp.key(l.model); if (k) cnt[k] = (cnt[k] || 0) + 1; });
    arr.forEach((l, i) => {
      if (api.low && !isLow(l)) return;
      const dup = cnt[Cmp.key(l.model)] > 1, row = el('div', {className: 'ln' + (isLow(l) ? ' low' : '') + (dup ? ' dup' : '')});
      const tags = el('div', {className: 'tags'}), tLow = el('span', {className: 'tag low', textContent: t('reviewRead')}), tOk = el('button', {className: 'sm', textContent: t('readOk')});
      tOk.onclick = () => { l.score = 1; touch(); onChange(); draw(); };
      if (isLow(l)) tags.append(tLow, tOk); if (dup) tags.append(el('span', {className: 'tag dup', textContent: t('dupTag')}));
      const model = el('input', {className: 'model', value: l.model || '', spellcheck: false, autocomplete: 'off', autocapitalize: 'characters', enterKeyHint: 'next'});
      model.oninput = () => { const v = Cmp.digits(model.value).toUpperCase(); if (v !== model.value) model.value = v; l.model = v; if (isLow(l)) { l.score = 1; row.classList.remove('low'); tLow.remove(); tOk.remove(); } touch(); onChange(); };
      model.onchange = () => draw();
      model.onkeydown = e => { if (e.key === 'Enter') { e.preventDefault(); if (i === arr.length - 1) { arr.push({id: hex(4), model: '', qty: '', note: '', img: '', score: null, page: null}); draw(i + 1); } else focusAt(i + 1); } };
      const qty = el('input', {className: 'qty', value: l.qty || '', placeholder: t('qty'), inputMode: 'decimal', enterKeyHint: 'next'}); qty.oninput = () => { l.qty = Cmp.digits(qty.value); if (l.qty !== qty.value) qty.value = l.qty; touch(); };
      const x = el('button', {className: 'danger x', textContent: '✕', 'aria-label': t('delete'), onclick: () => { arr.splice(i, 1); touch(); onChange(); draw(); }});
      const cr = el('div', {className: 'cr'}, l.img ? el('img', {src: l.img, alt: '', onclick: () => zoom((pages[(l.page || 1) - 1]) || l.img)}) : el('span', {className: 'none', textContent: t('typedLine')}));
      row.append(el('div', {className: 'nn', textContent: String(i + 1)}), cr, model, qty, x); if (tags.children.length) row.append(tags);
      row.dataset.i = i; box.append(row);
    });
    if (!api.low) box.append(el('button', {className: 'big', style: 'border-style:dashed', textContent: t('addLine'), onclick: () => { arr.push({id: hex(4), model: '', qty: '', note: '', img: '', score: null, page: null}); touch(); onChange(); draw(arr.length - 1); }}));
    if (typeof focus === 'number') focusAt(focus);
  }
  function focusAt(i) { const r = box.querySelector('.ln[data-i="' + i + '"] input.model'); if (r) { r.focus(); r.select(); r.scrollIntoView({block: 'center'}); } }
  draw(); return api;
}

/* ---------- الصفحة الرئيسية: ثلاث أيقونات فقط ---------- */
function vHome() {
  cur = null; head(t('appTitle'), null); if (BR) $('#ttl').append(el('small', {textContent: bName(BR) + ' · ' + BR}));
  const app = $('#app'), tile = (cls, ic, ti, sub, fn) => el('button', {className: 'tile ' + cls, onclick: fn}, el('span', {className: 'ic', textContent: ic}), el('b', {textContent: ti}), el('small', {textContent: sub}));
  const pend = ORDERS.filter(o => Cmp.status(o).state === 'pending').length;
  app.append(el('div', {className: 'tiles'}, tile('pri', '📝', t('newOrder'), t('newOrderSub'), startOrder), tile('ok', '📦', t('receive'), t('receiveSub'), vReceivePick),
    tile('third', '🗂', t('history'), ORDERS.length ? (pend ? t('histPending', {n: ORDERS.length, p: pend}) : t('histSub', {n: ORDERS.length})) : t('histNone'), vHistory)));
  if (!LS.get('lang', '')) { LS.set('lang', LANG); langSheet(); }
}

/* ---------- الطلبيات السابقة ---------- */
function vHistory() {
  cur = null; head(t('history'), vHome);
  const app = $('#app'), q = el('input', {type: 'search', placeholder: t('searchPh'), value: homeQ}), chips = el('div', {className: 'chips'}), list = el('div');
  const F = [['all', t('fAll')], ['pending', t('fPending')], ['diff', t('fDiff')], ['done', t('fDone')]];
  const draw = () => {
    chips.replaceChildren(...F.map(([k, x]) => el('button', {className: 'chip' + (homeF === k ? ' on' : ''), textContent: x, onclick: () => { homeF = k; draw(); }})));
    const s = nAr(Cmp.digits(homeQ)).trim(); list.replaceChildren(); let n = 0;
    ORDERS.forEach(o => {
      const st = Cmp.status(o); if (homeF !== 'all' && st.state !== homeF) return;
      if (s && !(nAr(supOf(o)).includes(s) || nAr(orderNo(o)).includes(s) || o.lines.some(l => Cmp.key(l.model).includes(Cmp.key(s) || '\u0000')))) return;
      n++; list.append(el('button', {className: 'oc', onclick: () => vHub(o.id)}, el('div', {className: 't', textContent: supOf(o)}),
        el('div', {className: 'm', textContent: orderNo(o) + ' · ' + (brOf(o) || '—') + ' · ' + dateL(o.date) + ' · ' + t('nModels', {n: o.lines.length})}), badge(st)));
    });
    if (!n) list.append(el('div', {className: 'empty', textContent: ORDERS.length ? t('noResults') : t('noOrdersYet'), style: 'white-space:pre-line'}));
  };
  q.oninput = () => { homeQ = q.value; draw(); };
  app.append(q, chips, list, el('button', {className: 'sm', style: 'margin-top:10px', textContent: t('impBtn'), onclick: () => pickFiles(importPdfs, false)})); draw();
}

/* ---------- طلبية جديدة: (فرع) ← مورد ← تصوير ---------- */
function startOrder() { cur = {id: hex(6), number: 0, branch: BR, date: today(), supplier_code: '', supplier_name: '', note: '', lines: [], pages: []}; dirty = false; BR ? vSupplier() : vBranch(); }
function vBranch() {
  head(t('newOrderT'), vHome); const app = $('#app');
  app.append(steps(1), el('div', {className: 'q', textContent: t('whichBranch')}), branchButtons(c => { cur.branch = c; vSupplier(); }, cur.branch));
  app.append(el('div', {className: 'card', style: 'margin-top:14px;display:flex;align-items:center;gap:10px;justify-content:space-between'}, el('span', {textContent: t('date') + ': ' + (cur.date === today() ? t('today') + ' — ' : '') + dateL(cur.date)}),
    el('button', {className: 'sm', textContent: t('change'), onclick: () => dateSheet(() => vBranch())})));
}
function dateSheet(after) {
  sheet(t('pickDate'), (sh, close) => { const d = el('input', {type: 'date', value: cur.date}); sh.append(d, el('button', {className: 'ok big', style: 'margin-top:12px', textContent: t('done'), onclick: () => { if (d.value) { cur.date = d.value; touch(); } close(); after(); }})); });
}
function vSupplier() {
  head(t('pickSupplier'), BR ? vHome : vBranch); warmOCR().catch(() => {});
  $('#app').append(steps(BR ? 1 : 2, BR ? 2 : 3), el('div', {className: 'q', textContent: t('forWhom')}), supplierPicker((c, n) => { cur.supplier_code = c; cur.supplier_name = n; vScan(); }, vScan));
}
function vScan() {
  head(t('scanT'), vSupplier); const app = $('#app');
  const go = files => readInto(files, cur).then(n => { if (n) { toast(t('readCount', {n})); vEditor(); } });
  app.append(steps(BR ? 2 : 3, BR ? 2 : 3), el('div', {className: 'q', textContent: t('shootSheet')}),
    el('button', {className: 'tile pri scan', style: 'width:100%;display:flex;flex-direction:column;justify-content:center;align-items:center;gap:6px', onclick: () => pickFiles(go, true)}, el('span', {className: 'ic', textContent: '📷'}), el('b', {textContent: t('shoot').replace('📷', '').trim()})),
    el('div', {className: 'acts', style: 'margin-top:12px'}, el('button', {style: 'min-height:64px', textContent: t('pickFiles'), onclick: () => pickFiles(go, false)}), el('button', {style: 'min-height:64px', textContent: t('typeSelf'), onclick: vEditor})),
    el('div', {className: 'mut', style: 'margin-top:14px;text-align:center', textContent: t('scanTip')}));
}

/* ---------- المراجعة والتعديل ---------- */
function openEditor(id) { const o = ORDERS.find(x => x.id === id); if (!o) return vHome(); cur = clone(o); dirty = false; vEditor(); }
function vEditor() {
  head(cur.number ? t('orderT', {no: orderNo(cur)}) : t('reviewOrder'), async () => { await flush(); cur.number ? vHub(cur.id) : vHome(); }); const app = $('#app');
  const sum = el('div', {className: 'card sum'}), moreBody = el('div', {className: 'sum'}), more = el('details', {className: 'more'}, el('summary', {textContent: t('moreBtn')}), moreBody);
  const redrawSum = () => {
    const r = (k, v, fn) => el('div', {className: 'r'}, el('span', {textContent: k}), el('b', {textContent: v || '—'}), fn ? el('button', {className: 'sm', textContent: t('change'), onclick: fn}) : null);
    sum.replaceChildren(r(t('supplier'), supOf(cur) === '—' ? '' : supOf(cur), () => sheet(t('pickSupplier'), (sh, close) => sh.append(supplierPicker((c, n) => { cur.supplier_code = c; cur.supplier_name = n; touch(); close(); redrawSum(); }, close)))));
    moreBody.replaceChildren(...(BR ? [] : [r(t('branch'), bName(cur.branch) || cur.branch_name, () => sheet(t('pickBranch'), (sh, close) => sh.append(branchButtons(c => { cur.branch = c; touch(); close(); redrawSum(); }, cur.branch))))]), r(t('date'), dateL(cur.date), () => dateSheet(redrawSum)));
    const nt = el('textarea', {rows: 2, value: cur.note || '', placeholder: t('notePh')}); nt.oninput = () => { cur.note = nt.value; touch(); }; moreBody.append(nt);
  }; redrawSum(); if (cur.note) more.open = true;
  const isLow = l => l.score != null && l.score < 0.85, lowN = () => cur.lines.filter(isLow).length;
  const banner = el('div'), lb = linesBox(cur.lines, cur.pages, () => upd()), dockBtn = el('button', {className: 'ok big'}), dock = el('div', {className: 'dock'}, dockBtn);
  const finish = async () => {
    if (!cur.lines.some(nonEmpty)) return alert(t('needModel'));
    if (!cur.branch) return alert(t('needBranch'));
    if (!supOf(cur).replace('—', '') && !confirm(t('noSupConfirm'))) return;
    cur.lines.forEach(l => { if (isLow(l)) l.score = 1; }); const id = cur.id; dirty = true; await flush();
    const o = ORDERS.find(x => x.id === id); vHub(id); if (o) sendOrder(o);  // مباشرةً إلى شاشة الإرسال
  };
  const adds = el('div', {className: 'addrow'}, el('button', {textContent: t('shootB'), style: 'white-space:pre-line', onclick: () => pickFiles(f => readInto(f, cur).then(after), true)}),
    el('button', {textContent: t('filesB'), style: 'white-space:pre-line', onclick: () => pickFiles(f => readInto(f, cur).then(after), false)}), el('button', {textContent: t('typeB'), style: 'white-space:pre-line', onclick: () => typeSheet(cur.lines, () => after(0))}));
  const upd = () => {
    const n = cur.lines.filter(nonEmpty).length, low = lowN(); banner.replaceChildren();
    if (lb.low && !low) { lb.low = false; lb.draw(); }
    if (!cur.lines.length) banner.append(el('div', {className: 'banner info', textContent: t('noModelsYet')}));
    else if (lb.low) banner.append(el('div', {className: 'banner warn', textContent: t('reviewYellow', {n: low})}));
    else banner.append(el('div', {className: 'banner ok', textContent: t('allChecked', {n})}));
    adds.hidden = lb.low; if (pg) pg.hidden = lb.low;
    if (lb.low) { dockBtn.textContent = t('reviewDone'); dockBtn.onclick = () => { cur.lines.forEach(l => { if (isLow(l)) l.score = 1; }); lb.low = false; touch(); lb.draw(); upd(); window.scrollTo(0, 0); }; }
    else { dockBtn.textContent = t('finishSend'); dockBtn.onclick = finish; }
  };
  const after = n => { if (n) toast(t('readCount', {n})); if (lowN()) lb.low = true; lb.draw(); upd(); };
  if (lowN()) { lb.low = true; lb.draw(); }  // أولًا: الأسطر المشكوك فيها فقط
  const pg = cur.pages.length ? el('div', {className: 'chips'}, cur.pages.map((u, i) => el('button', {className: 'chip', textContent: t('page', {n: i + 1}), onclick: () => zoom(u)}))) : null;
  app.append(sum, banner, adds, lb.box, pg, more, dock); upd();
}

/* ---------- ملخص الطلبية: إرسال أو استلام (والباقي تحت «المزيد») ---------- */
function vHub(id) {
  const o = ORDERS.find(x => x.id === id); if (!o) return vHistory(); cur = null;
  head(t('orderT', {no: orderNo(o)}), vHistory); const app = $('#app'), st = Cmp.status(o);
  const card = el('div', {className: 'card'}, el('div', {style: 'font-size:21px;font-weight:700'}, supOf(o)), el('div', {className: 'mut', textContent: orderNo(o) + ' · ' + (BR ? '' : brOf(o) + ' · ') + dateL(o.date) + ' · ' + t('nModels', {n: o.lines.length})}), badge(st));
  if (st.result) { const x = st.result; card.append(el('div', {className: 'mut', style: 'margin-top:8px', textContent: t('lastRecv', {date: dateL(o.receipt.date), m: x.matched, x: x.missing.length, e: x.extra.length, q: x.qty.length ? t('lastRecvQ', {n: x.qty.length}) : ''})})); }
  const A = (cls, ic, x, fn) => el('button', {className: cls, onclick: fn}, el('span', {className: 'ic', textContent: ic}), el('span', {textContent: x}));
  const main = el('div', {className: 'acts'}, A('pri full', '📤', t('aSend'), () => sendOrder(o)), A('ok full', '📦', t('aReceive'), () => openReceive(o.id)));
  if (st.result) main.append(A('full', '📑', t('aSendRecv'), () => sendReceipt(o)));
  const rest = el('div', {className: 'acts'}, A('', '✏️', t('aEdit'), () => openEditor(o.id)),
    A('', '📋', t('aCopy'), () => { cur = {...clone(o), id: hex(6), number: 0, date: today(), receipt: undefined, created: Date.now(), pages: []}; delete cur.receipt; dirty = true; vEditor(); }),
    A('danger full', '🗑', t('aDelete'), async () => { if (confirm(t('delConfirm', {no: orderNo(o)}))) { await DB.del(o.id); ORDERS = ORDERS.filter(x => x.id !== o.id); toast(t('deleted')); vHistory(); } }));
  app.append(card, main, el('details', {className: 'more'}, el('summary', {textContent: t('moreBtn')}), rest));
}

/* ---------- ما وصل فرعي (من النظام: ملف مشفّر خاص بالفرع) ---------- */
async function loadRecv() {
  if (RECV && RECV.b === BR) return RECV;
  if (!BR || !BKEY) throw new Error('nolink');
  const r = await fetch('data/recv_' + BR + '.json', {cache: 'no-cache'}); if (!r.ok) throw new Error('nodata');
  const j = await r.json(); RKEY = await fileKey(j, BKEY); RECV = await decryptWith(RKEY, j); RECV.live = RECV.live || {};
  const c = LS.get('today_' + BR, null); if (c && c.date === today() && c.at > (RECV.live[today()] || '')) mergeToday(RECV, c);  // آخر «تحديث اليوم» ضغطه هذا الجهاز
  if (RECV.sups && RECV.sups.length) { SUPS = RECV.sups; LS.set('sups', SUPS); }  // قائمة الموردين تُفتح من رابط الفرع بلا رمز
  return RECV;
}
const dayLabel = d => (d === today() ? t('today') + ' — ' : '') + I18N.weekday(d) + ' — ' + dateL(d);
const liveTag = (R, d) => R.live && R.live[d] ? ' · ' + t('arrLive', {t: R.live[d]}) : '';
function mergeToday(R, c) {
  R.live = R.live || {}; R.live[c.date] = c.at; Object.assign(R.sup, c.sup || {});
  if (c.rows && c.rows.length) R.days[c.date] = c.rows; else delete R.days[c.date];
}
// «تحديث اليوم»: طلب مشفّر عبر قناة ntfy السرّية إلى الجهاز الرئيسي (استعلام ERP واحد خفيف) ويعود الرد مشفّرًا بمفتاح الفرع
async function requestToday() {
  const R = await loadRecv(); if (!R.q) throw new Error(t('todayNo'));
  const id = hex(8), parts = {};
  return new Promise(async (resolve, reject) => {
    let done = false; const es = new EventSource(R.q.base + '/' + R.q.topic + 'r/sse?since=2m');
    const fin = (e, v) => { if (done) return; done = true; clearTimeout(timer); es.close(); e ? reject(e) : resolve(v); };
    const timer = setTimeout(() => fin(new Error(t('todayTimeout'))), 120000);
    es.onmessage = async ev => {
      let o; try { const m = JSON.parse(ev.data); if (m.event !== 'message') return; o = JSON.parse(m.message); } catch (_) { return; }
      if (o.id !== id + 'o') return; parts[o.n] = o.d; if (Object.keys(parts).length < o.t) return;
      try { const all = b64(Array.from({length: o.t}, (_, i) => parts[i]).join('')), pt = await crypto.subtle.decrypt({name: 'AES-GCM', iv: all.slice(0, 12), additionalData: new TextEncoder().encode(o.id)}, RKEY, all.slice(12));
        const r = JSON.parse(new TextDecoder().decode(pt)); r.ok ? fin(null, r) : fin(new Error(r.error || t('todayFail'))); } catch (_) { fin(new Error(t('todayFail'))); }
    };
    try {
      const iv = crypto.getRandomValues(new Uint8Array(12)), enc = u => btoa(String.fromCharCode(...u));
      const ct = new Uint8Array(await crypto.subtle.encrypt({name: 'AES-GCM', iv}, RKEY, new TextEncoder().encode(JSON.stringify({id, ts: Math.floor(Date.now() / 1000), k: 'otoday'}))));
      const r = await fetch(R.q.base + '/' + R.q.topic + 'q', {method: 'POST', body: JSON.stringify({i: enc(iv), c: enc(ct)})}); if (!r.ok) fin(new Error(t('todayFail')));
    } catch (_) { fin(new Error(t('todayFail'))); }
  });
}
async function refreshToday(after) {
  busy(t('todayBusy'), 0.3, t('todaySub'));
  try { const r = await requestToday(), R = await loadRecv(), c = {date: r.date, at: r.at, sup: r.sup, rows: r.rows}; LS.set('today_' + BR, c); mergeToday(R, c); busy(null); toast(t('todayDone', {t: r.at})); after(); }
  catch (e) { busy(null); alert(e.message || t('todayFail')); }
}
const todayBtn = after => el('button', {className: 'big', style: 'margin-bottom:10px', textContent: t('todayBtn'), onclick: () => refreshToday(after)});
const supDays = (R, code) => Object.keys(R.days).filter(d => R.days[d].some(r => r[0] === code)).sort().reverse();
const dayRows = (R, code, d) => (R.days[d] || []).filter(r => r[0] === code);
async function vArrSup() {
  head(t('arrT'), vReceivePick); const app = $('#app');
  if (!BR || !BKEY) return app.append(el('div', {className: 'banner warn', textContent: t('arrNoLink')}));
  app.append(el('div', {className: 'empty', textContent: t('arrLoading')}));
  let R; try { R = await loadRecv(); } catch (e) { app.replaceChildren(el('div', {className: 'banner warn', textContent: e.message === 'nolink' ? t('arrNoLink') : t('arrFail')}), el('button', {className: 'pri big', textContent: '↻', onclick: vArrSup})); return; }
  app.replaceChildren(todayBtn(vArrSup), el('div', {className: 'q', textContent: t('arrWhichSup')}));
  const codes = {}; Object.keys(R.days).forEach(d => R.days[d].forEach(r => codes[r[0]] = 1));
  const last = c => supDays(R, c)[0] || '', list = Object.keys(codes).sort((a, b) => last(b).localeCompare(last(a)) || a.localeCompare(b));
  if (!list.length) return app.append(el('div', {className: 'empty', textContent: t('arrNoSup')}));
  const nm = c => (SUPS.find(s => s.code === c) || {}).name || R.sup[c] || c;
  const q = el('input', {type: 'search', placeholder: t('supSearchPh')}), box = el('div');
  const draw = () => { const s = nAr(Cmp.digits(q.value)).trim(); box.replaceChildren();
    list.filter(c => !s || c.includes(s) || nAr(nm(c)).includes(s)).forEach(c => box.append(el('button', {className: 'oc', onclick: () => vArrDays(c)}, el('div', {className: 't', textContent: c + ' — ' + nm(c)}), el('div', {className: 'm', textContent: t('arrLast', {d: dateL(last(c))}) + ' · ' + t('arrDays', {n: supDays(R, c).length})})))); };
  q.oninput = draw; app.append(q, el('div', {style: 'height:10px'}), box, el('div', {className: 'mut', style: 'margin-top:10px', textContent: t('arrUpd', {t: R.upd})})); draw();
}
async function vArrDays(code) {
  const R = await loadRecv(), nm = (SUPS.find(s => s.code === code) || {}).name || R.sup[code] || code;
  head(nm, vArrSup); const app = $('#app'), dates = supDays(R, code);
  const pick = el('input', {type: 'date', max: today()}), none = el('div', {className: 'banner warn', hidden: true}), lastAll = Object.keys(R.days).sort().pop();
  pick.onchange = () => { if (!pick.value) return; if (dayRows(R, code, pick.value).length) return vArrDay(code, pick.value); none.textContent = pick.value === today() && R.live && R.live[today()] ? t('arrNoToday', {t: R.live[today()]}) : pick.value > lastAll ? t('arrNotYet', {d: dateL(lastAll)}) : t('arrNoThatDay'); none.hidden = false; };
  app.append(todayBtn(() => vArrDays(code)), el('label', {className: 'f', textContent: t('arrPickDate')}), pick, none, el('div', {style: 'height:12px'}));
  dates.forEach(d => { const rows = dayRows(R, code, d); app.append(el('button', {className: 'oc', onclick: () => vArrDay(code, d)}, el('div', {className: 't', textContent: dayLabel(d)}), el('div', {className: 'm', textContent: t('arrDayRow', {m: t('nModels', {n: rows.length}), p: t('nPieces', {n: pcs(rows)})}) + liveTag(R, d)}))); });
  app.append(el('div', {className: 'mut', style: 'margin-top:10px', textContent: t('arrUpd', {t: R.upd})}));
}
async function vArrDay(code, d) {
  const R = await loadRecv(), nm = (SUPS.find(s => s.code === code) || {}).name || R.sup[code] || code, rows = dayRows(R, code, d);
  head(dateL(d), () => vArrDays(code)); const app = $('#app');
  app.append(el('div', {className: 'card sum'}, el('div', {className: 'r'}, el('span', {textContent: t('supplier')}), el('b', {textContent: code + ' - ' + nm})), el('div', {className: 'r'}, el('span', {textContent: t('date')}), el('b', {textContent: dayLabel(d)})),
    el('div', {className: 'banner ok', style: 'margin:0', textContent: t('arrTotals', {m: rows.length, p: pcs(rows)})})));
  if (R.live && R.live[d]) app.append(el('div', {className: 'hint', textContent: t('arrLiveNote', {t: R.live[d]})}));
  const q = el('input', {type: 'search', placeholder: t('arrFilter')}), box = el('div', {className: 'sec good'});
  const draw = () => { const s = Cmp.key(q.value) || ''; box.replaceChildren(); rows.filter(r => !s || Cmp.key(r[1]).includes(s)).forEach(r => box.append(el('div', {className: 'it'}, el('span', {className: 'm', textContent: r[1]}), el('span', {className: 'i'}), el('b', {textContent: String(r[2])})))); };
  q.oninput = draw; app.append(q, el('div', {style: 'height:10px'}), box); draw();
  app.append(el('div', {className: 'dock'}, el('button', {className: 'pri big', textContent: t('arrCompare'), onclick: () => {
    const mine = ORDERS.filter(o => o.supplier_code === code).sort((a, b) => b.updated - a.updated);
    if (!mine.length) return alert(t('arrNoOrder'));
    sheet(t('arrPickOrder'), (sh, close) => mine.forEach(o => sh.append(el('button', {className: 'oc', onclick: () => { close(); useArrivals(o.id, rows, d); }}, el('div', {className: 't', textContent: orderNo(o) + ' — ' + dateL(o.date)}), el('div', {className: 'm', textContent: t('nModels', {n: o.lines.length})}), badge(Cmp.status(o))))));
  }}), el('button', {className: 'big', style: 'flex:0 0 38%', textContent: t('arrExport'), onclick: async () => {
    busy(t('arrMaking'), 0.5);
    try { const bytes = await PDFGen.arrivalsPdf({sup: code + ' - ' + nm, branch: bName(BR), date: d}, rows, Object.assign({}, SET, {lang: LANG})); busy(null); pdfSheet(bytes, 'Arrivals_' + BR + '_' + code + '_' + d + '.pdf', code + ' - ' + nm + ' — ' + dateL(d)); }
    catch (e) { console.error(e); busy(null); alert(t('pdfFail', {e: e.message})); } }})));
}
function useArrivals(id, rows, d) {
  const o = ORDERS.find(x => x.id === id); if (!o) return;
  if (o.receipt && o.receipt.lines.some(nonEmpty) && !confirm(t('arrReplace'))) return;
  cur = clone(o); cur.receipt = {date: d, pages: [], lines: rows.map(r => ({id: hex(4), model: String(r[1]).toUpperCase(), qty: String(r[2]), note: '', img: '', score: 1, page: null}))};
  dirty = true; rTab = 'res'; vReceive();
}

/* ---------- الاستلام والمطابقة ---------- */
function vReceivePick() {
  head(t('receiveT'), vHome); const app = $('#app');
  app.append(el('button', {className: 'tile third', style: 'width:100%;min-height:92px;margin-bottom:14px;font-size:20px', onclick: vArrSup}, el('span', {className: 'ic', textContent: '🚚', style: 'font-size:38px'}), el('b', {textContent: t('arrBtn')}), el('small', {textContent: t('arrBtnSub')})),
    el('div', {className: 'q', textContent: t('pickOrderArrived')}));
  if (!ORDERS.length) return app.append(el('div', {className: 'empty', textContent: t('noSavedOrders')}));
  const q = el('input', {type: 'search', placeholder: t('searchPh')}), list = el('div'), rank = {pending: 0, diff: 1, done: 2};
  const draw = () => { const s = nAr(Cmp.digits(q.value)).trim(); list.replaceChildren();
    [...ORDERS].sort((a, b) => rank[Cmp.status(a).state] - rank[Cmp.status(b).state] || b.updated - a.updated).forEach(o => {
      if (s && !(nAr(supOf(o)).includes(s) || nAr(orderNo(o)).includes(s) || o.lines.some(l => Cmp.key(l.model).includes(Cmp.key(s) || '\u0000')))) return;
      list.append(el('button', {className: 'oc', onclick: () => openReceive(o.id)}, el('div', {className: 't', textContent: supOf(o)}),
        el('div', {className: 'm', textContent: orderNo(o) + ' · ' + dateL(o.date) + ' · ' + t('nModels', {n: o.lines.length})}), badge(Cmp.status(o)))); }); };
  q.oninput = draw; app.append(q, el('div', {style: 'height:10px'}), list); draw();
}
const mergeRows = (R, code, ds) => { const m = {}; ds.forEach(d => dayRows(R, code, d).forEach(r => m[r[1]] = (m[r[1]] || 0) + (+r[2] || 0))); return Object.keys(m).sort().map(k => [code, k, m[k]]); };
async function sysBlock(box, o) {
  if (!BR || !BKEY || !o.supplier_code) return;
  let R; try { R = await loadRecv(); } catch (_) { return; }
  box.append(todayBtn(() => vReceive()));
  const ds = supDays(R, o.supplier_code).filter(d => d >= o.date).slice(0, 6);
  if (!ds.length) return box.append(el('div', {className: 'hint', textContent: t('sysNone')}));
  box.append(el('div', {className: 'q', style: 'font-size:19px;margin:4px 0 8px', textContent: '🚚 ' + t('sysTitle')}));
  ds.forEach(d => { const rows = dayRows(R, o.supplier_code, d); box.append(el('button', {className: 'oc', onclick: () => useArrivals(o.id, rows, d)}, el('div', {className: 't', textContent: dayLabel(d)}), el('div', {className: 'm', textContent: t('sysDay', {m: t('nModels', {n: rows.length}), p: t('nPieces', {n: pcs(rows)})}) + liveTag(R, d)}))); });
  if (ds.length > 1) box.append(el('button', {className: 'big', style: 'margin-bottom:10px', textContent: t('sysAll'), onclick: () => useArrivals(o.id, mergeRows(R, o.supplier_code, ds), ds[0])}));
}
function openReceive(id) { const o = ORDERS.find(x => x.id === id); if (!o) return vHome(); cur = clone(o); dirty = false; if (!cur.receipt) cur.receipt = {date: today(), lines: [], pages: []}; rTab = cur.receipt.lines.some(nonEmpty) ? 'res' : 'src'; vReceive(); }
function vReceive() {
  head(t('recvT', {no: orderNo(cur)}), async () => { await flush(); vHub(cur.id); }); const app = $('#app');
  app.append(el('div', {className: 'card'}, el('div', {style: 'font-size:20px;font-weight:700'}, supOf(cur)), el('div', {className: 'mut', textContent: t('ordered') + ': ' + t('nModels', {n: cur.lines.filter(nonEmpty).length}) + ' — ' + dateL(cur.date)})));
  rTab === 'res' ? receiveResult(app) : rTab === 'in' ? receiveInput(app) : receiveSource(app);
}
function receiveSource(app) {  // الخطوة الأولى: متى وصلت البضاعة؟ (من النظام) — أو يدويًا
  if (!BR || !BKEY || !cur.supplier_code) { rTab = 'in'; return receiveInput(app); }
  const box = el('div'); app.append(box, el('button', {className: 'big', style: 'margin-top:6px', textContent: t('manualBtn'), onclick: () => { rTab = 'in'; vReceive(); }}));
  sysBlock(box, cur);
}
function receiveInput(app) {
  const rc = cur.receipt, lb = linesBox(rc.lines, rc.pages, () => {});
  const after = n => { if (n) toast(t('readCount', {n})); vReceive(); };
  app.append(el('div', {className: 'mut', style: 'margin-bottom:10px', textContent: t('recvHint')}),
    el('div', {className: 'addrow'}, el('button', {textContent: t('shootB'), style: 'white-space:pre-line', onclick: () => pickFiles(f => readInto(f, rc).then(after), true)}),
      el('button', {textContent: t('filesB'), style: 'white-space:pre-line', onclick: () => pickFiles(f => readInto(f, rc).then(after), false)}), el('button', {textContent: t('typeB'), style: 'white-space:pre-line', onclick: () => typeSheet(rc.lines, () => vReceive())})),
    lb.box, el('div', {className: 'dock'}, el('button', {className: 'ok big', textContent: t('showResult'), onclick: () => { rTab = 'res'; touch(); vReceive(); }})));
}
function receiveResult(app) {  // تقرير للقراءة فقط (بلا أزرار جانبية)
  const rc = cur.receipt, res = Cmp.compare(cur.lines, rc.lines);
  if (!rc.lines.some(nonEmpty)) { rTab = 'src'; return vReceive(); }
  app.append(res.issues ? el('div', {className: 'banner warn', textContent: t('diffBanner', {m: res.missing.length, e: res.extra.length, q: res.qty.length ? t('lastRecvQ', {n: res.qty.length}) : ''})})
    : el('div', {className: 'banner ok', textContent: t('perfect', {n: res.ok.length})}));
  const sec = (cls, title, items) => { if (!items.length) return null; const s = el('div', {className: 'sec ' + cls}, el('h3', {}, el('span', {textContent: title}), el('span', {textContent: items.length}))); items.forEach(i => s.append(i)); return s; };
  const it = (model, info) => el('div', {className: 'it'}, el('span', {className: 'm', textContent: model}), el('span', {className: 'i', textContent: info || ''}));
  const missing = res.missing.map(m => { const e = res.extra.find(x => x.near === m.model); return it(m.model, (m.ordQty != null ? t('ordQty', {n: m.ordQty}) : '') + (e ? t('maybeRead', {m: e.model}) : '')); });
  const extra = res.extra.map(e => it(e.model, e.near ? t('nearTxt', {m: e.near}) : t('notOrdered')));
  const qd = res.qty.map(m => it(m.model, t('qtyDiff', {o: m.ordQty, r: m.recQty, w: m.diff > 0 ? t('more') : t('less'), d: Math.abs(m.diff)})));
  [sec('miss', t('secMiss'), missing), sec('qtyd', t('secQty'), qd), sec('extra', t('secExtra'), extra)].forEach(s => s && app.append(s));
  if (res.ok.length) { const d = el('details', {className: 'sec good'}, el('summary', {}, el('span', {textContent: t('secOk', {n: res.ok.length})}))); res.ok.forEach(m => d.append(it(m.model, m.recQty != null ? t('qtyLabel', {n: m.recQty}) : ''))); app.append(d); }
  app.append(el('button', {className: 'sm', style: 'margin:4px 0 90px', textContent: t('editRecv'), onclick: () => { rTab = 'in'; vReceive(); }}),
    el('div', {className: 'dock'}, el('button', {className: 'pri big', textContent: t('sendReport'), onclick: async () => { dirty = true; await flush(); sendReceipt(ORDERS.find(x => x.id === cur.id) || cur); }}),
      el('button', {className: 'ok big', textContent: t('done'), onclick: async () => { dirty = true; await flush(); toast(t('recvSaved')); vHub(cur.id); }})));
}

/* ---------- ملفات PDF: إنشاء، معاينة، مشاركة ---------- */
async function sendOrder(o) {
  if (!o.lines.some(nonEmpty)) return alert(t('noLinesPdf'));
  busy(t('pdfMaking'), 0.5); const L = SET.pdfLang || 'ar';
  try { const bytes = await PDFGen.orderPdf(o, pdfSt()); busy(null); pdfSheet(bytes, 'Order_' + PDFGen.orderNo(o) + (o.supplier_code ? '_' + o.supplier_code : '') + '.pdf', I18N.tl(L, 'pdfMsgOrder', {no: orderNo(o), br: I18N.tl(L, 'br' + o.branch) || brOf(o), d: I18N.date(o.date, L)})); }
  catch (e) { console.error(e); busy(null); alert(t('pdfFail', {e: e.message})); }
}
async function sendReceipt(o) {
  const res = Cmp.compare(o.lines, (o.receipt || {}).lines), L = SET.pdfLang || 'ar';
  busy(t('recvMaking'), 0.5);
  try { const bytes = await PDFGen.receiptPdf(o, res, pdfSt()); busy(null); pdfSheet(bytes, 'Receipt_' + PDFGen.orderNo(o) + (o.supplier_code ? '_' + o.supplier_code : '') + '.pdf', I18N.tl(L, 'pdfMsgRecv', {no: orderNo(o), r: res.issues ? I18N.tl(L, 'rIssues', {n: res.issues}) : I18N.tl(L, 'rPerfect')})); }
  catch (e) { console.error(e); busy(null); alert(t('recvFail', {e: e.message})); }
}
function download(bytes, name) { const a = el('a', {href: URL.createObjectURL(new Blob([bytes], {type: 'application/pdf'})), download: name}); document.body.append(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 4000); }
async function sharePdf(bytes, name, text) {
  const file = new File([bytes], name, {type: 'application/pdf'});
  try { if (navigator.canShare && navigator.canShare({files: [file]})) { await navigator.share({files: [file], title: name, text}); return; } } catch (e) { if (e.name === 'AbortError') return; }
  download(bytes, name); toast(t('dlDone'));
}
function pdfSheet(bytes, name, text) {
  sheet(t('sharePdf'), (sh) => {
    const kb = Math.max(1, Math.round(bytes.length / 1024)), pv = el('div', {className: 'pv'}, el('div', {className: 'mut', textContent: t('preparing')}));
    sh.append(el('div', {className: 'mut', textContent: name + ' — ' + t('sizeKb', {n: kb})}), pv,
      el('div', {className: 'acts'}, el('button', {className: 'ok full', style: 'min-height:64px', textContent: t('shareBtn'), onclick: () => sharePdf(bytes, name, text)}), el('button', {className: 'full', style: 'min-height:52px', textContent: t('dlBtn'), onclick: () => { download(bytes, name); }})));
    (async () => { try {
      pdfjsLib.GlobalWorkerOptions.workerSrc = 'vendor/pdf.worker.min.js'; const doc = await pdfjsLib.getDocument({data: bytes.slice()}).promise; pv.replaceChildren();
      for (let n = 1; n <= Math.min(doc.numPages, 3); n++) { const p = await doc.getPage(n), vp0 = p.getViewport({scale: 1}), sc = Math.min(1.6, 600 / vp0.width) * (window.devicePixelRatio > 1 ? 1.5 : 1), vp = p.getViewport({scale: sc});
        const c = el('canvas'); c.width = vp.width; c.height = vp.height; c.style.width = '100%'; pv.append(c); await p.render({canvasContext: c.getContext('2d'), viewport: vp}).promise; }
      if (doc.numPages > 3) pv.append(el('div', {className: 'mut', textContent: t('moreP', {n: doc.numPages - 3})}));
    } catch (e) { pv.replaceChildren(el('div', {className: 'mut', textContent: t('noPreview')})); } })();
  });
}

/* ---------- فتح طلبية من ملف PDF أنشأه البرنامج (البيانات مخفية داخل الملف) ---------- */
async function readOrderPdf(file) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = 'vendor/pdf.worker.min.js';
  const doc = await pdfjsLib.getDocument({data: await file.arrayBuffer()}).promise, c = ((await doc.getMetadata()).info || {}).Custom || {}, v = c.OrdersData;
  if (!v) return null;
  let u = b64(v.slice(1)); if (v[0] === 'z') u = new Uint8Array(await new Response(new Blob([u]).stream().pipeThrough(new DecompressionStream('deflate'))).arrayBuffer());
  const d = JSON.parse(new TextDecoder().decode(u)); return d && d.app === 'orders' && d.order ? d : null;
}
async function importPdfs(files) {
  let n = 0, same = 0, bad = 0, withRecv = false;
  for (const f of files) {
    try {
      const d = await readOrderPdf(f); if (!d) { bad++; continue; }
      const L = a => (a || []).map(l => ({id: hex(4), model: l.model, qty: l.qty || '', note: l.note || '', img: '', score: 1, page: null})), old = ORDERS.find(x => x.id === d.order.id);
      if (old && (old.receipt || !d.receipt)) { same++; continue; }
      const rec = old ? {...old, updated: Date.now()} : {id: d.order.id || hex(6), number: d.order.number || 0, branch: d.order.branch, branch_name: BRANCH_CODES.includes(d.order.branch) ? I18N.tl('ar', 'br' + d.order.branch) : '', date: d.order.date, supplier_code: d.order.supplier_code, supplier_name: d.order.supplier_name,
        note: d.order.note || '', pages: [], created: d.order.created || Date.now(), updated: Date.now(), lines: L(d.order.lines)};
      if (d.receipt) { rec.receipt = {date: d.receipt.date, pages: [], updated: Date.now(), lines: L(d.receipt.lines)}; withRecv = true; }
      await DB.put(rec); n++; if (rec.number > (+LS.get('counter', 0) || 0)) LS.set('counter', rec.number);
    } catch (e) { console.error(e); bad++; }
  }
  await loadOrders();
  if (n) toast(t('impDone', {n}) + (withRecv ? t('impRecv') : '')); else if (same) toast(t('impExists')); else if (bad) alert(t('impNone'));
  vHistory();
}

/* ---------- الإعدادات والنسخ الاحتياطي ---------- */
function vSettings() {
  sheet(t('settings'), (sh, close) => {
    const f = (lab, key, ph) => { const i = el('input', {value: SET[key] || '', placeholder: ph}); i.oninput = () => { SET[key] = i.value; LS.set('settings', SET); }; return [el('label', {className: 'f', textContent: lab}), i]; };
    sh.append(el('label', {className: 'f', textContent: t('langLab')}), langButtons(LANG, l => { LS.set('lang', l); applyLang(l); close(); flush().then(vHome); }),
      el('label', {className: 'f', textContent: t('themeLab')}), el('div', {className: 'acts'}, [['day', '☀️ ' + t('themeDay')], ['night', '🌙 ' + t('themeNight')]].map(([k, n]) => el('button', {className: THEME === k ? 'pri' : '', textContent: n, onclick: () => { LS.set('theme', k); applyTheme(k); close(); vSettings(); }}))));
    const body = el('div');
    body.append(el('label', {className: 'f', textContent: t('pdfLangLab')}), el('div', {className: 'acts', style: 'grid-template-columns:1fr 1fr 1fr'}, [['ar', 'العربية'], ['en', 'English'], ['ur', 'اردو']].map(([k, n]) => el('button', {className: (SET.pdfLang || 'ar') === k ? 'pri' : '', textContent: n, onclick: () => { SET.pdfLang = k; LS.set('settings', SET); close(); vSettings(); }}))));
    if (BR) body.append(el('label', {className: 'f', textContent: t('branchLab')}), el('div', {className: 'card', style: 'margin:0'}, el('b', {textContent: bName(BR) + ' · ' + BR}), el('div', {className: 'mut', textContent: t('branchLocked')})));
    body.append(el('div', {className: 'hint', style: 'margin-top:14px', textContent: t('setHint')}), ...f(t('coName'), 'company', 'ALHARAM CENTER'), ...f(t('senderName'), 'sender', t('senderPh')), ...f(t('phoneLab'), 'phone', t('phonePh')));
    if (!(BR && BKEY)) body.append(el('label', {className: 'f', textContent: t('supList')}), el('button', {className: 'big', disabled: !!SUPS.length, textContent: SUPS.length ? t('supOn', {n: SUPS.length}) : t('openList'), onclick: async () => { if (await unlockSuppliers()) { close(); vSettings(); } }}));
    body.append(el('label', {className: 'f', textContent: t('backupLab')}),
      el('div', {className: 'acts'}, el('button', {textContent: t('saveCopy'), onclick: backup}), el('button', {textContent: t('restoreCopy'), onclick: () => pickFiles(restore, false)})),
      el('div', {className: 'mut', style: 'margin-top:12px', id: 'persist'}), el('div', {className: 'mut', style: 'margin-top:6px', textContent: t('version', {v: APP_V})}));
    sh.append(el('details', {className: 'more'}, el('summary', {textContent: t('moreOpts')}), body));
    if (navigator.storage && navigator.storage.persisted) navigator.storage.persisted().then(p => { const e = sh.querySelector('#persist'); if (e) e.textContent = p ? t('persisted') : t('notPersisted'); });
  });
}
function backup() {
  const strip = a => (a || []).map(l => ({...l, img: ''})), data = {app: 'orders', v: 2, settings: SET, orders: ORDERS.map(o => ({...o, pages: [], lines: strip(o.lines), receipt: o.receipt && {...o.receipt, pages: [], lines: strip(o.receipt.lines)}}))};
  const blob = new Blob([JSON.stringify(data)], {type: 'application/json'}), a = el('a', {href: URL.createObjectURL(blob), download: 'orders-backup-' + today() + '.json'}); document.body.append(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 4000);
  toast(t('copySaved'));
}
async function restore(files) {
  try {
    const d = JSON.parse(await files[0].text()); if (d.app !== 'orders') throw new Error(t('badFile')); let n = 0;
    for (const o of d.orders || []) { const old = ORDERS.find(x => x.id === o.id); if (!old || (o.updated || 0) > (old.updated || 0)) { await DB.put(o); n++; } }
    await loadOrders(); toast(t('restored', {n})); vHome();
  } catch (e) { alert(t('restoreFail', {e: e.message})); }
}

/* ---------- البدء ---------- */
window.addEventListener('beforeunload', e => { if (dirty && cur && cur.branch) { flush(); } });
$('#gear').onclick = vSettings; $('#lang').onclick = langSheet;
$('#theme').onclick = () => { const th = THEME === 'night' ? 'day' : 'night'; LS.set('theme', th); applyTheme(th); };
applyLang(LANG); applyTheme(THEME);
if ('serviceWorker' in navigator && !location.search.includes('nosw')) navigator.serviceWorker.register('sw.js').catch(() => {});
try { navigator.storage && navigator.storage.persist && navigator.storage.persist(); } catch (_) {}
loadOrders().then(vHome).catch(e => { console.error(e); vHome(); });
if (BR && BKEY) loadRecv().catch(() => {});  // في الخلفية: يفتح قائمة الموردين ويجهّز «ما وصل فرعي»
