/* قراءة موديلات خط اليد في عمود «رقم الصنف» داخل المتصفح (بلا خادم). نفس خوارزمية ocr_engine.py:
   تحديد العمود من الخطوط الرأسية المطبوعة ← عزل الحبر الأزرق ← كشف السطور (DB) ← قراءة (CTC محصور بالأرقام والحروف اللاتينية) ← تنظيف. */
const OCR = (() => {
  let det = null, rec = null, charset = null, allowed = null;
  const DET_MIN_SIDE = 544, DET_THRESH = 0.3, BOX_THRESH = 0.35, UNCLIP = 1.6;
  const DIGIT_FIX = {O: '0', o: '0', D: '0', Q: '0', I: '1', l: '1', '|': '1', '/': '1', '!': '1', Z: '2', z: '2', S: '5', s: '5', G: '6', b: '6', T: '7', B: '8', g: '9', q: '9'};
  const TL = []; let _t = 0; const tick = l => { const n = performance.now(); TL.push(l + ':' + Math.round(n - _t)); _t = n; };
  const fix = s => [...s].map(c => DIGIT_FIX[c] || c).join('');

  async function init(base, onProgress) {
    if (det) return;
    ort.env.wasm.wasmPaths = new URL(base + 'vendor/', location.href).href;  // مطلق: import() الديناميكي لا يقبل مسارًا نسبيًا بلا ./
    ort.env.wasm.numThreads = 1;
    ort.env.wasm.proxy = false;
    const opt = {executionProviders: ['wasm'], graphOptimizationLevel: 'all'};
    onProgress && onProgress(I18N.t('ocrDet'));
    det = await ort.InferenceSession.create(base + 'models/det.onnx', opt);
    onProgress && onProgress(I18N.t('ocrRec'));
    rec = await ort.InferenceSession.create(base + 'models/rec.onnx', opt);
    charset = await (await fetch(base + 'models/charset.json')).json();
    allowed = Object.entries(charset.chars).map(([ch, idx]) => [ch, idx]);
  }

  /* ---------- صور ---------- */
  function canvasOf(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }

  // يقلّص/يكبّر صورة مرفوعة إلى مقياس صفحات PDF (≈200 dpi)
  function fitImage(img) {
    const w0 = img.naturalWidth || img.width, h0 = img.naturalHeight || img.height;
    const scale = 2300 / Math.max(w0, h0);
    const s = (scale < 1 || scale > 1.15) ? scale : 1;
    const c = canvasOf(Math.round(w0 * s), Math.round(h0 * s));
    const g = c.getContext('2d'); g.imageSmoothingQuality = 'high'; g.drawImage(img, 0, 0, c.width, c.height);
    return c;
  }

  /* ---------- تحديد عمود «رقم الصنف» ---------- */
  function locateColumn(data, w, h) {
    const gray = new Uint8Array(w * h);
    for (let i = 0, p = 0; i < gray.length; i++, p += 4) gray[i] = (data[p] * 299 + data[p + 1] * 587 + data[p + 2] * 114) / 1000;
    const minRun = Math.max(20, Math.floor(h * 0.12));
    const run = new Int32Array(w), sum = new Int32Array(w);
    for (let y = 0; y < h; y++) {
      const row = y * w;
      for (let x = 0; x < w; x++) {
        if (gray[row + x] < 150) run[x]++;
        else { if (run[x] >= minRun) sum[x] += run[x]; run[x] = 0; }
      }
    }
    for (let x = 0; x < w; x++) if (run[x] >= minRun) sum[x] += run[x];
    const xs = []; for (let x = 0; x < w; x++) if (sum[x] > h * 0.12 * 0.9) xs.push(x);
    const groups = [];
    for (const x of xs) { const g = groups[groups.length - 1]; if (g && x - g[g.length - 1] <= 10) g.push(x); else groups.push([x]); }
    const lines = groups.map(g => Math.round(g.reduce((a, b) => a + b, 0) / g.length));
    const cand = lines.filter(x => x > 0.55 * w && x < 0.975 * w);
    let x0, x1, y0, y1;
    if (cand.length >= 2) {
      x0 = cand[cand.length - 2]; x1 = cand[cand.length - 1];
      let ymin = h, ymax = 0;
      for (let x = Math.max(0, x1 - 3); x <= Math.min(w - 1, x1 + 3); x++) {
        let start = -1;
        for (let y = 0; y <= h; y++) {
          const dark = y < h && gray[y * w + x] < 150;
          if (dark && start < 0) start = y;
          if (!dark && start >= 0) { if (y - start >= minRun) { ymin = Math.min(ymin, start); ymax = Math.max(ymax, y - 1); } start = -1; }
        }
      }
      if (ymax > ymin) { y0 = ymin; y1 = ymax; } else { y0 = Math.floor(h * 0.30); y1 = Math.floor(h * 0.82); }
    } else { x0 = Math.floor(w * 0.80); x1 = Math.floor(w * 0.956); y0 = Math.floor(h * 0.30); y1 = Math.floor(h * 0.82); }
    // الكتابة قد تتجاوز أسفل الجدول (أسطر زائدة تحته): نمدّ المنطقة إلى 17% من ارتفاع الصفحة تحت آخر خط للجدول (بحد 96.5%)
    return {x0: Math.max(0, x0 - 12), x1: Math.min(w, x1 + Math.floor(0.04 * w)), y0: Math.max(0, y0 - 25), y1: Math.min(h, Math.max(y1 + 25, Math.min(Math.round(h * 0.965), y1 + Math.round(h * 0.17)))), tableBottom: y1, border: x1, gray};
  }

  /* ---------- عزل الحبر ---------- */
  function dilate3(mask, w, h) {
    const out = new Uint8Array(w * h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      if (!mask[y * w + x]) continue;
      for (let dy = -1; dy <= 1; dy++) { const yy = y + dy; if (yy < 0 || yy >= h) continue;
        for (let dx = -1; dx <= 1; dx++) { const xx = x + dx; if (xx >= 0 && xx < w) out[yy * w + xx] = 1; } }
    }
    return out;
  }
  function inkMask(data, W, box) {
    const w = box.x1 - box.x0, h = box.y1 - box.y0;
    const blue = new Uint8Array(w * h); let count = 0;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const p = ((y + box.y0) * W + x + box.x0) * 4, r = data[p], b = data[p + 2];
      if (b - r > 35 && b > 90) { blue[y * w + x] = 1; count++; }
    }
    if (count > 400) return {mask: dilate3(blue, w, h), w, h, mode: 'blue'};
    // حبر غامق: حذف خطوط الجدول الأفقية (≥60) والرأسية (≥80)
    const dark = new Uint8Array(w * h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const p = ((y + box.y0) * W + x + box.x0) * 4; if ((data[p] * 299 + data[p + 1] * 587 + data[p + 2] * 114) / 1000 < 140) dark[y * w + x] = 1; }
    const lines = new Uint8Array(w * h);
    for (let y = 0; y < h; y++) { let s = -1; for (let x = 0; x <= w; x++) { const d = x < w && dark[y * w + x]; if (d && s < 0) s = x; if (!d && s >= 0) { if (x - s >= 60) for (let k = s; k < x; k++) lines[y * w + k] = 1; s = -1; } } }
    for (let x = 0; x < w; x++) { let s = -1; for (let y = 0; y <= h; y++) { const d = y < h && dark[y * w + x]; if (d && s < 0) s = y; if (!d && s >= 0) { if (y - s >= 80) for (let k = s; k < y; k++) lines[k * w + x] = 1; s = -1; } } }
    const grown = dilate3(lines, w, h), m = new Uint8Array(w * h);
    for (let i = 0; i < m.length; i++) m[i] = dark[i] && !grown[i] ? 1 : 0;
    return {mask: dilate3(m, w, h), w, h, mode: 'dark'};
  }

  /* ---------- كشف السطور (DB) ---------- */
  async function detect(padCanvas) {
    const W = padCanvas.width, H = padCanvas.height;
    const ratio = Math.min(W, H) < DET_MIN_SIDE ? DET_MIN_SIDE / Math.min(W, H) : 1;
    const rw = Math.max(32, Math.round(Math.round(W * ratio) / 32) * 32), rh = Math.max(32, Math.round(Math.round(H * ratio) / 32) * 32);
    const c = canvasOf(rw, rh), g = c.getContext('2d'); g.imageSmoothingQuality = 'high'; g.drawImage(padCanvas, 0, 0, rw, rh);
    const d = g.getImageData(0, 0, rw, rh).data, n = rw * rh, input = new Float32Array(3 * n);
    for (let i = 0; i < n; i++) { const p = i * 4; input[i] = (d[p + 2] / 255 - 0.5) / 0.5; input[n + i] = (d[p + 1] / 255 - 0.5) / 0.5; input[2 * n + i] = (d[p] / 255 - 0.5) / 0.5; }
    const out = await det.run({x: new ort.Tensor('float32', input, [1, 3, rh, rw])});
    const prob = out[Object.keys(out)[0]].data;
    // مكوّنات متصلة فوق العتبة ← مستطيلات
    const label = new Int32Array(n), boxes = [], stack = [];
    for (let s = 0; s < n; s++) {
      if (label[s] || prob[s] <= DET_THRESH) continue;
      let id = boxes.length + 1, minX = rw, maxX = 0, minY = rh, maxY = 0, sum = 0, cnt = 0;
      stack.length = 0; stack.push(s); label[s] = id;
      while (stack.length) {
        const i = stack.pop(), x = i % rw, y = (i - x) / rw;
        if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y;
        if (x > 0 && !label[i - 1] && prob[i - 1] > DET_THRESH) { label[i - 1] = id; stack.push(i - 1); }
        if (x < rw - 1 && !label[i + 1] && prob[i + 1] > DET_THRESH) { label[i + 1] = id; stack.push(i + 1); }
        if (y > 0 && !label[i - rw] && prob[i - rw] > DET_THRESH) { label[i - rw] = id; stack.push(i - rw); }
        if (y < rh - 1 && !label[i + rw] && prob[i + rw] > DET_THRESH) { label[i + rw] = id; stack.push(i + rw); }
      }
      const bw = maxX - minX + 1, bh = maxY - minY + 1;
      if (Math.min(bw, bh) < 3) { boxes.push(null); continue; }
      for (let y = minY; y <= maxY; y++) for (let x = minX; x <= maxX; x++) { sum += prob[y * rw + x]; cnt++; }
      const score = sum / cnt;
      if (score < BOX_THRESH) { boxes.push(null); continue; }
      const dist = bw * bh * UNCLIP / (2 * (bw + bh));
      const sx = W / rw, sy = H / rh;
      boxes.push({score, x0: Math.max(0, (minX - dist) * sx), x1: Math.min(W, (maxX + 1 + dist) * sx),
                  y0: Math.max(0, (minY - dist) * sy), y1: Math.min(H, (maxY + 1 + dist) * sy)});
    }
    return boxes.filter(b => b && b.x1 - b.x0 > 5 && b.y1 - b.y0 > 5);
  }

  // علامات جانبية (أرقام/شرطات) كُتبت خارج حدّ الجدول الأيمن وانفصلت عن الموديل بفراغ واضح: تُقصّ من صندوق السطر كي لا تلتصق به (2008 + «46» ← 200821)
  function trimMargin(b, pad, border) {
    const g = pad.getContext('2d', {willReadFrequently: true}), x0 = Math.max(0, Math.floor(b.x0)), x1 = Math.min(pad.width, Math.ceil(b.x1)), y0 = Math.max(0, Math.floor(b.y0)), y1 = Math.min(pad.height, Math.ceil(b.y1));
    if (x1 - x0 < 40 || y1 - y0 < 5) return;
    const d = g.getImageData(x0, y0, x1 - x0, y1 - y0).data, w = x1 - x0, h = y1 - y0, GAP = 28; let last = -1, cut = -1;
    for (let x = 0; x < w; x++) {
      let ink = false; for (let y = 0; y < h && !ink; y++) ink = d[(y * w + x) * 4] < 128;
      if (!ink) continue;
      if (last >= 0 && x - last >= GAP && x0 + x > border + 6) { cut = last; break; }
      last = x;
    }
    if (cut >= 0 && cut > 30) b.x1 = x0 + cut + 4;
  }

  /* ---------- القراءة (CTC محصور) ---------- */
  async function recognize(padCanvas, b) {
    // هامش أفقي إضافي: صندوق الكشف قد يقصّ أول/آخر رقم في خط اليد المتصل (15949 بدل 105949)
    const ex = 14, ey = 4, bx0 = Math.max(0, b.x0 - ex), bx1 = Math.min(padCanvas.width, b.x1 + ex), by0 = Math.max(0, b.y0 - ey), by1 = Math.min(padCanvas.height, b.y1 + ey);
    b = {x0: bx0, x1: bx1, y0: by0, y1: by1};
    const sw = Math.max(1, Math.round(b.x1 - b.x0)), sh = Math.max(1, Math.round(b.y1 - b.y0));
    const rw = Math.max(16, Math.min(2400, Math.ceil(48 * sw / sh))), c = canvasOf(rw, 48), g = c.getContext('2d');
    g.fillStyle = '#fff'; g.fillRect(0, 0, rw, 48); g.imageSmoothingQuality = 'high';
    g.drawImage(padCanvas, Math.round(b.x0), Math.round(b.y0), sw, sh, 0, 0, rw, 48);
    const d = g.getImageData(0, 0, rw, 48).data, n = rw * 48, input = new Float32Array(3 * n);
    for (let i = 0; i < n; i++) { const p = i * 4; input[i] = (d[p + 2] / 255 - 0.5) / 0.5; input[n + i] = (d[p + 1] / 255 - 0.5) / 0.5; input[2 * n + i] = (d[p] / 255 - 0.5) / 0.5; }
    const out = await rec.run({x: new ort.Tensor('float32', input, [1, 3, 48, rw])});
    const t = out[Object.keys(out)[0]], T = t.dims[1], V = t.dims[2], data = t.data;
    let text = '', last = -1, conf = [];
    for (let i = 0; i < T; i++) {
      const base = i * V; let best = 0, bp = data[base];  // 0 = blank
      for (const [ch, idx] of allowed) { const p = data[base + idx]; if (p > bp) { bp = p; best = idx; } }
      if (best !== 0 && best !== last) { text += allowed.find(a => a[1] === best)[0]; conf.push(bp); }
      last = best;
    }
    return {raw: text, score: conf.length ? conf.reduce((a, c2) => a + c2, 0) / conf.length : 0};
  }

  /* ---------- تنظيف النص (نفس clean_text في بايثون) ---------- */
  function cleanText(raw) {
    const t = (raw || '').replace(/[^0-9A-Za-z]/g, '');
    if (t.length < 3) return t.toUpperCase();
    const digitsNow = [...t].filter(c => c >= '0' && c <= '9').length;
    const lead = t.match(/^[A-Za-z]{1,3}/);
    if (lead) {
      let head = lead[0].toUpperCase();
      // «Jo5929»: الحرف الأخير الصغير الشبيه بالرقم (o) صفر لا جزء من الرمز؛ أما الحرف الكبير مثل D و T و B و G و S و Z (RD854، ZT614، PT231555) فجزء حقيقي من الرمز ويبقى
      while (head.length > 1 && /^\d$/.test(fix(head[head.length - 1])) && !('DTBGSZL'.includes(head[head.length - 1]) && /[A-Z]/.test(t[head.length - 1]))) head = head.slice(0, -1);
      let rest = fix(t.slice(head.length)).replace(/(?<=\d{5})[A-Za-z]{1,2}$/, '');
      if (head.length === 1 && 'JILQOSZG'.includes(head) && rest.length >= 5 && /^\d+$/.test(rest) && (rest.length >= 6 || 'JILQO'.includes(head))) head = {J: '1', I: '1', L: '1', Q: '0', O: '0', S: '5', Z: '2', G: '6'}[head];
      return head + rest;
    }
    if (digitsNow >= t.length * 0.6) return fix(t).replace(/(?<=\d{5})[A-Za-z]{1,2}$/, '');
    return t.toUpperCase();
  }

  // يدمج أجزاء السطر الواحد. جزء صغير على يسار الرقم (علامة التكرار «〃» أو «=» أو علامة صح) لا يدخل نصّ الموديل: يُسجَّل كعلامة mark
  function mergeFragments(lines) {
    const out = [];
    for (const ln of lines) {
      const prev = out[out.length - 1];
      if (prev && Math.abs((ln.y0 + ln.y1) / 2 - (prev.y0 + prev.y1) / 2) < 0.5 * Math.max(ln.y1 - ln.y0, 20)) {
        const [a, b] = prev.x0 <= ln.x0 ? [prev, ln] : [ln, prev];
        const small = f => f.text.length <= 2 && (f.x1 - f.x0) < 0.75 * Math.max(1, (a === f ? b : a).x1 - (a === f ? b : a).x0);
        if (small(a) && b.text.length >= 2 && !prev.mark) {
          Object.assign(prev, {raw: b.raw, text: b.text, score: b.score, mark: a.raw || '·', x0: a.x0, x1: b.x1, y0: Math.min(a.y0, b.y0), y1: Math.max(a.y1, b.y1)});
        } else {
          Object.assign(prev, {raw: a.raw + b.raw, score: Math.min(prev.score, ln.score), x0: a.x0, x1: Math.max(prev.x1, ln.x1), y0: Math.min(prev.y0, ln.y0), y1: Math.max(prev.y1, ln.y1)});
          prev.text = cleanText(prev.raw);
        }
      } else out.push({...ln});
    }
    return out;
  }

  // اختيار القراءة بالتصويت بين ثلاث نسخ من الصورة (حبر معزول أسود / الصورة الأصلية / الحبر بلونه الأصلي): الأكثر اتفاقًا ثم الأعلى ثقة
  function vote(cands) {
    const g = new Map();
    for (const c of cands) { const t = cleanText(c.raw); if (!t) continue; const e = g.get(t) || {t, n: 0, best: c, sum: 0}; e.n++; e.sum += c.score; if (c.score > e.best.score) e.best = c; g.set(t, e); }
    if (!g.size) return cands[0];
    const top = [...g.values()].sort((x, y) => y.n - x.n || y.sum - x.sum || y.best.score - x.best.score)[0];
    return {raw: top.best.raw, score: top.sum / top.n, agree: top.n};
  }

  // علامة التكرار «〃» = نفس موديل السطر أعلاه عدا الخانات المتغيّرة (آخر k أرقام): KNB02 ثم 〃05 ← KNB05.
  // بلا علامة: رقم وحده بنفس عدد أرقام الموديل أعلاه (CH2603 ثم 2601) ← CH2601 (مقترح للمراجعة).
  function resolveSeries(lines) {
    let prev = '';
    for (const l of lines) {
      const m = prev.match(/^([A-Z]*)(\d+)([A-Z]?)$/);
      if (l.mark) { const fx = fix(l.text); if (/^\d{1,4}$/.test(fx)) l.text = fx; }  // بعد علامة التكرار الباقي أرقام: 3I ← 31
      else if (m && m[1].length >= 2 && /^[A-Z]\d{2}$/.test(l.text)) { l.mark = '·'; l.text = l.text.slice(1); }  // N22: العلامة التصقت بالرقم فقُرئت حرفًا
      const k = /^\d+$/.test(l.text) ? l.text.length : 0;
      if (k && m) {
        const run = m[2].length;
        if (l.mark && k <= run) { l.written = l.text; l.text = prev.slice(0, prev.length - m[3].length - k) + l.text + m[3]; l.infer = 'ditto'; }
        else if (!l.mark && m[1] && k === run) { l.written = l.text; l.text = m[1] + l.text + m[3]; l.infer = 'series'; }
      }
      if (/^[A-Z]*\d+[A-Z]?$/.test(l.text)) prev = l.text;  // سطر تالف (20UL) لا يقطع سلسلة الموديلات: يبقى آخر موديل سليم مرجعًا
    }
  }

  // مطابقة قائمة موديلات المورد: القراءة غير الموجودة في القائمة وتبعد عن موديل واحد منها بتبديلات حروف/أرقام متشابهة فقط (Q↔6، B↔8، T↔7، D↔0 …)
  // تُصحَّح إلى ذلك الموديل (وتُعلَّم للمراجعة)؛ الموجودة فيها تُعدّ موثوقة. لا تغيير إن تعذّر الحسم (موديل جديد غير مسجّل).
  const PAIRS = ['0O', '0D', '0Q', '1I', '1L', '2Z', '5S', '6G', '6Q', '7T', '8B', '9P', '9Q', 'UV', 'CL', 'CG', 'OQ', 'DO', 'MN', 'VW'], SIM = new Set();
  PAIRS.forEach(p => { SIM.add(p); SIM.add(p[1] + p[0]); });
  function wdist(a, b, cap) {  // مسافة تحرير موزونة: استبدال متشابه 0.4، غيره/إضافة/حذف 1
    let prev = Array.from({length: b.length + 1}, (_, j) => j);
    for (let i = 1; i <= a.length; i++) {
      const cur = [i]; let rowMin = i;
      for (let j = 1; j <= b.length; j++) {
        const sub = a[i - 1] === b[j - 1] ? 0 : SIM.has(a[i - 1] + b[j - 1]) ? 0.4 : 1;
        cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + sub); if (cur[j] < rowMin) rowMin = cur[j];
      }
      if (rowMin > cap) return 9; prev = cur;
    }
    return prev[b.length];
  }
  // full: قائمة كاملة (كل موديلات المورد في الفرع من النظام): أي قراءة ليست فيها خطأ على الأرجح فنقبل تصحيحًا أبعد (حتى 1.6) ونعلّم غير الموجود noCat للمراجعة
  function snapCatalog(lines, cat, loose, full, final) {
    if (!cat || !cat.length) return;
    const set = new Set(cat), cap = full ? 1.6 : loose ? 0.9 : 1.3, margin = full ? 0.3 : 0.35;
    for (const l of lines) {
      if (set.has(l.text)) { l.inCat = true; l.noCat = false; continue; }
      if (l.text.length < 3 || l.mark) { if (final && full) l.noCat = true; continue; }
      let best = null, b1 = 9, b2 = 9; const capL = Math.min(cap, 0.14 * l.text.length);
      for (const m of cat) { if (Math.abs(m.length - l.text.length) > 1) continue; const d = wdist(l.text, m, capL); if (d < b1) { b2 = b1; b1 = d; best = m; } else if (d < b2) b2 = d; }
      if (best && b1 <= capL && b2 - b1 >= margin) { if (!l.infer) l.written = l.text; l.text = best; l.infer = l.infer || 'cat'; l.inCat = true; l.noCat = false; } else if (final && full) l.noCat = true;
    }
  }

  // أسطر بادئتها الحرفية قُرئت أرقامًا (97231555 بدل PT231555): تُصحَّح على بادئة «عائلة» قُرئت سليمة في أسطر الصفحة نفسها (حرف↔رقم متشابهان فقط)
  const CONF = {P: '9', T: '7', D: '0', O: '0', B: '8', S: '5', Z: '2', G: '6', I: '1', L: '1', Q: '0'};
  // extra: بادئات موديلات المورد المختار نفسه من قائمته (أدقّ من الصفحة وحدها) — تُشترط فيها خمسة أرقام فأكثر بعد البادئة تفاديًا لتحويل أكواد رقمية خالصة
  const prefixesOf = cat => { const c = new Map(); (cat || []).forEach(m => { const x = m.match(/^([A-Z]{2,3})\d/); if (x) c.set(x[1], (c.get(x[1]) || 0) + 1); }); return [...c].filter(e => e[1] >= 2).map(e => e[0]); };
  function familyFix(lines, extra) {
    const fams = new Set(), ext = new Set(extra || []);
    for (const l of lines) { const m = l.text.match(/^([A-Z]{2,3})\d{3,}[A-Z]?$/); if (m && l.score >= 0.8 && !l.infer) fams.add(m[1]); }
    for (const l of lines) {
      if (l.infer || l.inCat || /^[A-Z]{2,3}\d/.test(l.text)) continue;
      for (const F of new Set([...fams, ...ext])) {
        const tail = l.text.slice(F.length);
        if (l.text.length < F.length + (fams.has(F) ? 3 : 6) || !/^\d+[A-Z]?$/.test(tail)) continue;
        let diff = 0, ok = true;
        for (let i = 0; i < F.length && ok; i++) { const c = l.text[i]; if (c === F[i]) continue; if (CONF[F[i]] === c) diff++; else ok = false; }
        if (ok && diff && F + tail !== l.text) { l.written = l.text; l.text = F + tail; l.infer = 'fam'; break; }
      }
    }
  }

  /* ---------- تقويم ميلان الصورة (صور الجوال) ---------- */
  // يبحث عن زاوية (±8°) تجعل خطوط الجدول الرأسية أشدّ استقامة (أعلى مجموع مربعات إسقاط البكسلات الداكنة)، ثم يدوّر الصورة بها.
  function deskew(canvas) {
    const sc = Math.min(1, 700 / canvas.width), sw = Math.round(canvas.width * sc), sh = Math.round(canvas.height * sc);
    const s = canvasOf(sw, sh), sg = s.getContext('2d', {willReadFrequently: true}); sg.drawImage(canvas, 0, 0, sw, sh);
    const d = sg.getImageData(0, 0, sw, sh).data, xs = [], ys = [];
    for (let y = 0; y < sh; y++) for (let x = 0; x < sw; x++) { const p = (y * sw + x) * 4; if ((d[p] * 299 + d[p + 1] * 587 + d[p + 2] * 114) / 1000 < 130) { xs.push(x); ys.push(y); } }
    let best = 0, bestScore = -1;
    const off = sh + sw;
    for (let a = -8; a <= 8.01; a += 0.5) {
      const t = a * Math.PI / 180, c = Math.cos(t), sn = Math.sin(t), bins = new Int32Array(2 * off + 2);
      for (let i = 0; i < xs.length; i++) bins[Math.round(xs[i] * c + ys[i] * sn) + off]++;
      let sc2 = 0; for (let i = 0; i < bins.length; i++) sc2 += bins[i] * bins[i];
      if (sc2 > bestScore) { bestScore = sc2; best = a; }
    }
    if (Math.abs(best) < 0.5) return canvas;
    const out = canvasOf(canvas.width, canvas.height), g = out.getContext('2d');
    g.fillStyle = '#fff'; g.fillRect(0, 0, out.width, out.height);
    g.translate(out.width / 2, out.height / 2); g.rotate(-best * Math.PI / 180); g.drawImage(canvas, -out.width / 2, -out.height / 2);
    return out;
  }

  /* ---------- صفحة كاملة ---------- */
  // canvas: صفحة بمقياس ≈200dpi. يرجع {lines: [{text, raw, score, rowUrl}], mode}
  async function readPage(canvas0, opts) {
    opts = opts || {};
    TL.length = 0; _t = performance.now();
    const canvas = deskew(canvas0); tick('deskew');
    const W = canvas.width, H = canvas.height, ctx = canvas.getContext('2d', {willReadFrequently: true});
    const data = ctx.getImageData(0, 0, W, H).data;
    tick('getImageData');
    const box = locateColumn(data, W, H); tick('locate');
    const ink = inkMask(data, W, box); tick('ink');
    const PAD = 30, pw = ink.w + 2 * PAD, ph = ink.h + 2 * PAD;
    const pad = canvasOf(pw, ph), pg = pad.getContext('2d');
    pg.fillStyle = '#fff'; pg.fillRect(0, 0, pw, ph);
    const img = pg.getImageData(0, 0, pw, ph), id = img.data;
    for (let y = 0; y < ink.h; y++) for (let x = 0; x < ink.w; x++) if (ink.mask[y * ink.w + x]) { const p = ((y + PAD) * pw + x + PAD) * 4; id[p] = id[p + 1] = id[p + 2] = 0; }
    pg.putImageData(img, 0, 0);
    tick('pad');
    // نسختان إضافيتان للقراءة: الصورة الأصلية كما هي (مع خطوط النموذج)، والحبر بلونه الأصلي بتدرّجه الرمادي؛ تُقرأ كل سطر بالثلاث ثم يُصوَّت
    const pad2 = canvasOf(pw, ph), g2 = pad2.getContext('2d'); g2.fillStyle = '#fff'; g2.fillRect(0, 0, pw, ph); g2.drawImage(canvas, box.x0, box.y0, ink.w, ink.h, PAD, PAD, ink.w, ink.h);
    const pad3 = canvasOf(pw, ph), g3 = pad3.getContext('2d'); g3.fillStyle = '#fff'; g3.fillRect(0, 0, pw, ph);
    const i3 = g3.getImageData(0, 0, pw, ph), d3 = i3.data;
    for (let y = 0; y < ink.h; y++) for (let x = 0; x < ink.w; x++) if (ink.mask[y * ink.w + x]) { const q = ((y + PAD) * pw + x + PAD) * 4, o = ((y + box.y0) * W + x + box.x0) * 4; d3[q] = data[o]; d3[q + 1] = data[o + 1]; d3[q + 2] = data[o + 2]; }
    g3.putImageData(i3, 0, 0);
    const boxes = await detect(pad), lines = []; tick('detect(' + boxes.length + ')');
    const border = box.border - box.x0 + PAD;
    for (let i = boxes.length - 1; i >= 0; i--) if ((boxes[i].x0 + boxes[i].x1) / 2 > border + 4) boxes.splice(i, 1);  // علامات مركزها خارج حدّ الجدول الأيمن (ملاحظات جانبية) لا تُقرأ
    boxes.forEach(b => trimMargin(b, pad, border));
    for (const b of boxes) {
      const r = vote([await recognize(pad, b), await recognize(pad2, b), await recognize(pad3, b)]);
      lines.push({raw: r.raw, text: cleanText(r.raw), score: r.score, x0: b.x0 - PAD + box.x0, x1: b.x1 - PAD + box.x0, y0: b.y0 - PAD + box.y0, y1: b.y1 - PAD + box.y0});
    }
    tick('recognize');
    lines.sort((a, b) => (a.y0 + a.y1) / 2 - (b.y0 + b.y1) / 2);
    const headEnd = box.y0 + 25 + 0.036 * H;  // نهاية صف عناوين الجدول المطبوع (يُقرأ نصه أحيانًا في وضع الحبر الغامق)
    const merged0 = mergeFragments(lines).filter(l => l.raw && l.text.length >= 2 && !(ink.mode === 'dark' && (l.y0 + l.y1) / 2 < headEnd) && !(l.y0 > box.tableBottom + 20 && l.score < 0.6 && !l.mark));  // رمز الموديل 3 أحرف فأكثر؛ وما تحت الجدول بثقة ضعيفة غالبًا نص مطبوع (تذييل)
    snapCatalog(merged0, opts.cat, opts.loose, opts.full); resolveSeries(merged0); familyFix(merged0, opts.loose || opts.full ? [] : prefixesOf(opts.cat)); snapCatalog(merged0, opts.cat, opts.loose, opts.full, true); const merged = merged0.filter(l => l.text.length >= 3);  // رمز الموديل 3 أحرف فأكثر (بعد استكمال أسطر التكرار)
    // صورة كل سطر: الحبر بلونه الأصلي على أبيض (بلا خطوط النموذج) مقصوصًا على السطر
    const colored = canvasOf(ink.w, ink.h), cg = colored.getContext('2d'), cd = cg.createImageData(ink.w, ink.h);
    for (let y = 0; y < ink.h; y++) for (let x = 0; x < ink.w; x++) {
      const q = (y * ink.w + x) * 4, p = ((y + box.y0) * W + x + box.x0) * 4, on = ink.mask[y * ink.w + x];
      cd.data[q] = on ? data[p] : 255; cd.data[q + 1] = on ? data[p + 1] : 255; cd.data[q + 2] = on ? data[p + 2] : 255; cd.data[q + 3] = 255;
    }
    cg.putImageData(cd, 0, 0);
    for (const l of merged) {
      const ya = Math.max(0, Math.floor(l.y0 - box.y0 - 4)), yb = Math.min(ink.h, Math.ceil(l.y1 - box.y0 + 4)), hh = Math.max(8, yb - ya);
      const rc = canvasOf(ink.w + 12, hh + 6), rg = rc.getContext('2d'); rg.fillStyle = '#fff'; rg.fillRect(0, 0, rc.width, rc.height);
      rg.drawImage(colored, 0, ya, ink.w, hh, 6, 3, ink.w, hh);
      l.rowUrl = rc.toDataURL('image/jpeg', 0.8);
    }
    return {lines: merged, mode: ink.mode, page: canvas};
  }

  // تصحيح سطور جاهزة (من app.js) على قائمة محلية جزئية: احتياط حين يتعذّر الجهاز الرئيسي أو قائمة المورد فارغة هناك
  function snapExternal(items, cat, loose) {
    const arr = items.map(l => ({text: l.model, mark: '', inCat: false}));
    snapCatalog(arr, cat, loose, false, false);
    arr.forEach((a, i) => { const l = items[i]; if (a.text !== l.model) { l.written = l.written || l.model; l.model = a.text; l.infer = l.infer || 'cat'; } if (a.inCat) l.inCat = 1; });
  }

  return {init, readPage, fitImage, cleanText, snapExternal, TL, _t: {deskew, locateColumn, inkMask, detect, recognize, canvasOf}};
})();
