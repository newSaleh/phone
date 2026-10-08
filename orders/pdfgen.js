/* مولّد PDF داخل المتصفح (بلا مكتبات). الشكل (الخلفيات والخطوط) رسم متجهي، والأرقام والموديلات نص حقيقي بخط Courier
   (قابلة للنسخ والبحث)، والنص العربي صور شفافة صغيرة (قناع ألفا مضغوط) — فيبقى الملف خفيفًا ويظهر بنفس الشكل على كل جهاز. */
const PDFGen = (() => {
  const PW = 595.28, PH = 841.89, M = 34, CW = PW - 2 * M;
  const FONT = '"Segoe UI","Noto Sans Arabic","Noto Naskh Arabic",Tahoma,Arial,sans-serif';
  const NAVY = '#1d3557', LINE = '#dfe4ec', ZEBRA = '#f5f7fa', LRM = '‎';
  const enc = s => { const u = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i) & 255; return u; };
  const f2 = n => String(Math.round(n * 100) / 100);
  const rgbArr = h => { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
  const rgb = h => rgbArr(h).map(v => f2(v / 255)).join(' ');
  const esc = s => s.replace(/[\\()]/g, '\\$&');
  const ascii = s => /^[\x20-\x7E]*$/.test(s);
  const S = 3; // نقاط الصورة لكل نقطة PDF في صور النص

  async function deflate(bytes) {
    if (typeof CompressionStream === 'undefined') return null;
    try { const cs = new CompressionStream('deflate'), w = cs.writable.getWriter(); w.write(bytes); w.close(); return new Uint8Array(await new Response(cs.readable).arrayBuffer()); } catch (_) { return null; }
  }
  const mctx = document.createElement('canvas').getContext('2d');
  const fontOf = (size, bold) => (bold ? 700 : 400) + ' ' + size * S + 'px ' + FONT;
  const measure = (text, size, bold) => { mctx.font = fontOf(size, bold); return mctx.measureText(text).width / S; };

  class Pdf {
    constructor(lang) {
      this.lang = lang || 'ar'; this.flip = this.lang === 'en';  // الإنجليزية: تخطيط الصفحة معكوس (يسار ← يمين)
      this.objs = []; this.pages = []; this.cache = new Map();
      this.catalog = this.reserve(); this.tree = this.reserve();
      this.fR = this.obj('<< /Type /Font /Subtype /Type1 /BaseFont /Courier /Encoding /WinAnsiEncoding >>');
      this.fB = this.obj('<< /Type /Font /Subtype /Type1 /BaseFont /Courier-Bold /Encoding /WinAnsiEncoding >>');
    }
    reserve() { this.objs.push(null); return this.objs.length; }
    set(id, parts) { this.objs[id - 1] = (Array.isArray(parts) ? parts : [parts]).map(p => typeof p === 'string' ? enc(p) : p); }
    obj(parts) { const id = this.reserve(); this.set(id, parts); return id; }
    stream(dict, bytes) { return this.obj([`<< ${dict} /Length ${bytes.length} >>\nstream\n`, bytes, '\nendstream']); }
    async flate(dict, raw) { const z = await deflate(raw); return z ? this.stream(dict + ' /Filter /FlateDecode', z) : this.stream(dict, raw); }
    // نص عربي/لاتيني كصورة شفافة: قناع ألفا (مضغوط) + لون موحّد
    async label(text, o = {}) {
      const size = o.size || 11, bold = o.bold !== false, color = o.color || '#111111', maxW = o.maxW || 0;
      const km = [text, size, bold, maxW].join('|'); let m = this.cache.get(km);
      if (!m) {
        let fs = size; if (maxW && measure(text, fs, bold) > maxW) fs = fs * maxW / measure(text, fs, bold) * 0.97;
        const w = Math.ceil((measure(text, fs, bold) + 3) * S), h = Math.ceil(fs * 1.5 * S), c = document.createElement('canvas'); c.width = w; c.height = h;
        const g = c.getContext('2d', {willReadFrequently: true}); g.fillStyle = '#000'; g.font = fontOf(fs, bold); g.textBaseline = 'middle'; g.textAlign = 'left'; g.direction = this.flip ? 'ltr' : 'rtl'; g.fillText(text, 1.5 * S, h / 2 + fs * S * 0.04);
        const d = g.getImageData(0, 0, w, h).data, a = new Uint8Array(w * h);
        for (let i = 0; i < a.length; i++) a[i] = Math.round(d[i * 4 + 3] / 17) * 17;  // 16 مستوى تكفي للنص وتصغّر الحجم
        const sm = await this.flate(`/Type /XObject /Subtype /Image /Width ${w} /Height ${h} /ColorSpace /DeviceGray /BitsPerComponent 8`, a);
        m = {sm, w, h, wPt: w / S, hPt: h / S, bases: new Map()}; this.cache.set(km, m);
      }
      let base = m.bases.get(color);
      if (!base) { const px = new Uint8Array(m.w * m.h * 3), [r, g2, b] = rgbArr(color); for (let i = 0; i < px.length; i += 3) { px[i] = r; px[i + 1] = g2; px[i + 2] = b; }
        base = await this.flate(`/Type /XObject /Subtype /Image /Width ${m.w} /Height ${m.h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /SMask ${m.sm} 0 R`, px); m.bases.set(color, base); }
      return {id: base, w: m.wPt, h: m.hPt};
    }
    async finish(title, data) {
      const kids = [];
      for (const p of this.pages) {
        const raw = enc(p.ops.join('\n')), z = await deflate(raw);
        const cid = z ? this.stream('/Filter /FlateDecode', z) : this.stream('', raw);
        const xo = [...p.xo].map(([n, id]) => `/${n} ${id} 0 R`).join(' ');
        kids.push(this.obj(`<< /Type /Page /Parent ${this.tree} 0 R /MediaBox [0 0 ${f2(PW)} ${f2(PH)}] /Resources << /Font << /F1 ${this.fR} 0 R /F2 ${this.fB} 0 R >> /XObject << ${xo} >> >> /Contents ${cid} 0 R >>`));
      }
      this.set(this.tree, `<< /Type /Pages /Kids [${kids.map(k => k + ' 0 R').join(' ')}] /Count ${kids.length} >>`);
      this.set(this.catalog, `<< /Type /Catalog /Pages ${this.tree} 0 R >>`);
      const info = this.obj(`<< /Title (${esc(title || 'Order')}) /Producer (Orders)${data ? ' /OrdersData (' + data + ')' : ''} >>`);
      const chunks = [enc('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n')], offs = []; let pos = chunks[0].length;
      const push = u => { chunks.push(u); pos += u.length; };
      this.objs.forEach((parts, i) => { offs.push(pos); push(enc(`${i + 1} 0 obj\n`)); parts.forEach(push); push(enc('\nendobj\n')); });
      const xr = pos; let x = `xref\n0 ${this.objs.length + 1}\n0000000000 65535 f \n`;
      offs.forEach(o => x += String(o).padStart(10, '0') + ' 00000 n \n');
      push(enc(x + `trailer\n<< /Size ${this.objs.length + 1} /Root ${this.catalog} 0 R /Info ${info} 0 R >>\nstartxref\n${xr}\n%%EOF\n`));
      const out = new Uint8Array(pos); let o = 0; for (const c of chunks) { out.set(c, o); o += c.length; } return out;
    }
  }

  class Page {
    constructor(pdf) { this.pdf = pdf; this.ops = []; this.xo = new Map(); }
    // كل الإحداثيات تُكتب كأن الصفحة من اليمين لليسار؛ في الإنجليزية تنعكس أفقيًا هنا فقط
    fill(x, y, w, h, hex) { if (this.pdf.flip) x = PW - x - w; this.ops.push(`${rgb(hex)} rg ${f2(x)} ${f2(PH - y - h)} ${f2(w)} ${f2(h)} re f`); }
    hline(x1, x2, y, wd, hex) { if (this.pdf.flip) [x1, x2] = [PW - x2, PW - x1]; this.ops.push(`${rgb(hex)} RG ${f2(wd)} w ${f2(x1)} ${f2(PH - y)} m ${f2(x2)} ${f2(PH - y)} l S`); }
    text(s, x, y, bold, size, hex) { if (this.pdf.flip) x = PW - x - s.length * size * 0.6; this.ops.push(`BT ${rgb(hex)} rg /${bold ? 'F2' : 'F1'} ${size} Tf ${f2(x)} ${f2(PH - y)} Td (${esc(s)}) Tj ET`); }
    img(im, x, y) { if (this.pdf.flip) x = PW - x - im.w; const n = 'Im' + im.id; this.xo.set(n, im.id); this.ops.push(`q ${f2(im.w)} 0 0 ${f2(im.h)} ${f2(x)} ${f2(PH - y - im.h)} cm /${n} Do Q`); }
    // نص عربي: align = 'r' (x هو الحافّة اليمنى) | 'l' | 'c' (x المنتصف)، cy = مركز السطر رأسيًا
    async say(text, x, cy, o = {}) {
      text = String(text); if (!text) return 0;
      const im = await this.pdf.label(text, o), ix = o.align === 'l' ? x : o.align === 'c' ? x - im.w / 2 : x - im.w; this.img(im, ix, cy - im.h / 2); return im.w;
    }
  }

  const wrap = (text, maxW, size) => {
    const out = []; String(text).split('\n').forEach(par => { let line = ''; par.split(/\s+/).forEach(w => { const t = line ? line + ' ' + w : w; if (measure(t, size, false) > maxW && line) { out.push(line); line = w; } else line = t; }); out.push(line); });
    return out;
  };

  /* ---------- ترويسة الصفحة الأولى ---------- */
  async function drawHeader(pg, y0, d) {
    pg.fill(M, y0, CW, 56, NAVY);
    await pg.say(d.title, M + CW - 14, y0 + 21, {size: 22, color: '#ffffff'});
    await pg.say(d.company, M + CW - 14, y0 + 43, {size: 10.5, color: '#b8c7e0'});
    await pg.say(d.noLabel, M + 14, y0 + 14, {size: 9.5, bold: false, color: '#b8c7e0', align: 'l'});
    pg.text(d.no, M + 14, y0 + 42, true, 20, '#ffffff');
    let y = y0 + 56 + 9; const fh = 34, gap = 5, bw = (CW - 6) / 2, F = d.fields;
    const box = async (f, x, w) => {
      pg.fill(x, y, w, fh, f.bg || '#f1f4f9');
      await pg.say(f.k, x + w - 9, y + 10, {size: 9, bold: false, color: '#6b7686'});
      await pg.say(f.v, x + w - 9, y + 24, {size: 13, color: f.color || '#111111', maxW: w - 18});
    };
    for (let i = 0; i < F.length;) {
      const two = !F[i].wide && F[i + 1] && !F[i + 1].wide;
      if (two) { await box(F[i], M + CW - bw, bw); await box(F[i + 1], M, bw); i += 2; } else { await box(F[i], M, CW); i++; }
      y += fh + gap;
    }
    if (d.note) {
      const ls = wrap(d.note, CW - 24, 11), h = 22 + ls.length * 14;
      pg.fill(M, y, CW, h, '#fff7e0'); await pg.say(d.noteLabel, M + CW - 12, y + 10, {size: 9.5, color: '#b7791f'});
      for (let i = 0; i < ls.length; i++) await pg.say(ls[i], M + CW - 12, y + 25 + i * 14, {size: 11, bold: false, color: '#333333'});
      y += h + gap;
    }
    return y - y0;
  }
  async function drawStrip(pg, y, text) { pg.fill(M, y, CW, 18, '#eef2f8'); await pg.say(text, M + CW - 8, y + 9, {size: 10, color: NAVY}); return 18; }

  /* ---------- محرّك الجداول ---------- */
  const RH = 20;
  async function render(pdf, spec) {
    const pages = []; let pg, y;
    const bottom = PH - M - 26;
    const newPage = async first => { pg = new Page(pdf); pages.push(pg); y = M; if (first) y += (await drawHeader(pg, y, spec.header)) + 8; else y += (await drawStrip(pg, y, spec.cont)) + 6; };
    await newPage(true);
    for (const sec of spec.sections) {
      if (!sec.rows.length) continue;
      const nb = sec.blocks || 1, gapB = 14, bw = (CW - (nb - 1) * gapB) / nb;
      const fixed = sec.cols.reduce((a, c) => a + (c.w || 0), 0), flexN = sec.cols.filter(c => !c.w).length;
      const cols = sec.cols.map(c => ({...c, cw: c.w || Math.max(60, (bw - fixed) / flexN)}));
      let title = sec.title, i = 0;
      while (i < sec.rows.length) {
        if (y + (title ? 26 : 0) + 20 + RH * 2 > bottom) await newPage(false);
        if (title) { pg.fill(M, y, CW, 20, sec.titleBg || NAVY); await pg.say(title, M + CW - 8, y + 10, {size: 11.5, color: '#ffffff'}); y += 24; title = null; }
        const avail = Math.max(1, Math.floor((bottom - y - 20) / RH)), left = sec.rows.length - i;
        const per = left <= avail * nb ? Math.ceil(left / nb) : avail;
        const chunk = sec.rows.slice(i, i + per * nb); i += chunk.length;
        for (let b = 0; b < nb && b * per < chunk.length; b++) {
          const x0 = M + CW - (b + 1) * bw - b * gapB, items = chunk.slice(b * per, (b + 1) * per);
          pg.fill(x0, y, bw, 20, NAVY); let hx = x0 + bw;
          for (const col of cols) { await pg.say(col.head, hx - col.cw / 2, y + 10, {size: 10, color: '#ffffff', align: 'c'}); hx -= col.cw; }
          for (let r = 0; r < items.length; r++) {
            const row = items[r], ry = y + 20 + r * RH;
            pg.fill(x0, ry, bw, RH, row.bg || (r % 2 ? ZEBRA : '#ffffff')); pg.hline(x0, x0 + bw, ry + RH, 0.4, LINE);
            let xr = x0 + bw;
            for (let ci = 0; ci < cols.length; ci++) {
              const col = cols[ci], cell = row.cells[ci], t = String(cell && cell.t != null ? cell.t : cell == null ? '' : cell), colr = (cell && cell.color) || row.color || '#111111';
              const cl = xr - col.cw; xr = cl; if (!t) continue;
              const bold = col.bold !== false, size = col.size || 12;
              if (ascii(t)) {
                let s = t; const cwid = size * 0.6, maxc = Math.floor((col.cw - 10) / cwid); if (s.length > maxc) s = s.slice(0, Math.max(1, maxc - 1)) + '.';
                const tw = s.length * cwid, tx = col.align === 'c' ? cl + (col.cw - tw) / 2 : cl + col.cw - 6 - tw;
                pg.text(s, tx, ry + RH / 2 + size * 0.32, bold, size, colr);
              } else await pg.say(t, col.align === 'c' ? cl + col.cw / 2 : cl + col.cw - 5, ry + RH / 2, {size: 10.5, color: colr, maxW: col.cw - 10, align: col.align === 'c' ? 'c' : 'r'});
            }
          }
        }
        y += 20 + per * RH + 10;
      }
    }
    if (spec.end) { if (y + 40 > bottom) await newPage(false); await spec.end(pg, y + 6); }
    for (let n = 0; n < pages.length; n++) {
      const p = pages[n]; p.hline(M, M + CW, PH - M - 16, 0.5, LINE); p.text((n + 1) + ' / ' + pages.length, M, PH - M - 4, false, 8, '#6b7686');
      if (spec.footer) await p.say(spec.footer, M + CW, PH - M - 6, {size: 8, bold: false, color: '#6b7686'});
    }
    pdf.pages.push(...pages);
  }

  const footerText = st => [st.company || '', st.sender || '', st.phone || ''].filter(Boolean).join('   •   ');
  const orderNo = o => (o.branch || '000') + '-' + String(o.number || 0).padStart(3, '0');
  const supplierOf = o => [o.supplier_code, o.supplier_name].filter(Boolean).join(' - ') || '—';

  /* ---------- طلبية للمورد ---------- */
  // بيانات الطلبية داخل الملف نفسه (حقل مخفي في معلومات الـPDF) ليعيد البرنامج فتح الطلبية من الملف الذي أُرسل للمورد
  const b64 = u => { let s = ''; for (let i = 0; i < u.length; i += 8192) s += String.fromCharCode.apply(null, u.subarray(i, i + 8192)); return btoa(s); };
  async function embed(o, receipt) {
    const q = l => (l || []).filter(x => (x.model || '').trim()).map(x => ({model: String(x.model).trim().toUpperCase(), qty: x.qty || '', note: x.note || ''}));
    const j = new TextEncoder().encode(JSON.stringify({app: 'orders', v: 3, order: {id: o.id, number: o.number, branch: o.branch, date: o.date, supplier_code: o.supplier_code || '', supplier_name: o.supplier_name || '', note: o.note || '', created: o.created || 0, lines: q(o.lines)},
      receipt: receipt ? {date: receipt.date, lines: q(receipt.lines)} : null})), z = await deflate(j);
    return (z ? 'z' : 'r') + b64(z || j);
  }
  const mk = st => { const L = (st && st.lang) || 'ar'; return {L, T: (k, v) => I18N.tl(L, k, v), D: iso => I18N.date(iso, L)}; };
  const brName = (o, T) => { const n = T('br' + o.branch); return n === 'br' + o.branch ? (o.branch_name || '—') : n; };
  async function orderPdf(o, st) {
    st = st || {}; const {L, T, D} = mk(st), pdf = new Pdf(L), lines = o.lines.filter(l => (l.model || '').trim());
    const hasQty = lines.some(l => l.qty), hasNote = lines.some(l => l.note);
    const fields = [{k: T('pSup'), v: supplierOf(o), wide: true}, {k: T('pBr'), v: brName(o, T)}, {k: T('pDate'), v: D(o.date)}, {k: T('pCount'), v: String(lines.length)}];
    if (st.sender || st.phone) fields.push({k: T('pSender'), v: [st.sender, st.phone].filter(Boolean).join('   ')});
    const cols = [{head: T('pIdx'), w: 30, align: 'c', bold: false, size: 10}, {head: T('pModel'), align: 'r', size: 13}];
    if (hasQty) cols.push({head: T('pQty'), w: 70, align: 'c'});
    if (hasNote) cols.push({head: T('pNotes'), w: 190, align: 'r', bold: false, size: 10});
    const rows = lines.map((l, i) => ({cells: [String(i + 1), String(l.model).trim().toUpperCase(), ...(hasQty ? [l.qty || ''] : []), ...(hasNote ? [l.note || ''] : [])]}));
    const end = async (pg, y) => { await pg.say(T('pTotal', {n: lines.length}), M + CW - 4, y + 10, {size: 11}); };
    await render(pdf, {header: {title: T('pTitleOrder'), company: st.company || 'ALHARAM CENTER', noLabel: T('pNo'), no: orderNo(o), fields, note: o.note, noteLabel: T('pNote')},
      cont: T('pCont', {no: LRM + orderNo(o), s: supplierOf(o)}), footer: footerText(st), end, sections: [{cols, rows, blocks: !hasQty && !hasNote ? 2 : 1}]});
    return pdf.finish('Order ' + orderNo(o), await embed(o, null));
  }

  /* ---------- تقرير الاستلام والمطابقة ---------- */
  async function receiptPdf(o, res, st) {
    st = st || {}; const {L, T, D} = mk(st), pdf = new Pdf(L);
    const fields = [{k: T('pSup'), v: supplierOf(o), wide: true}, {k: T('pBr'), v: brName(o, T)}, {k: T('pNo'), v: LRM + orderNo(o)},
      {k: T('pOrderDate'), v: D(o.date)}, {k: T('pRecvDate'), v: D(o.receipt && o.receipt.date)},
      {k: T('pOrdRec'), v: res.orderedCount + ' / ' + res.receivedCount}, {k: T('pResult'), v: res.issues ? T('pIssues', {n: res.issues}) : T('rPerfect'), color: res.issues ? '#b7791f' : '#1f8a4c', bg: res.issues ? '#fff6e0' : '#e6f6ec'}];
    const idx = {head: T('pIdx'), w: 30, align: 'c', bold: false, size: 10}, mod = {head: T('pModel'), align: 'r', size: 13};
    const n = (a, f) => a.map((x, i) => ({cells: f(x, i)}));
    const sections = [
      {title: T('pMiss', {n: res.missing.length}), titleBg: '#c0392b', cols: [idx, mod, {head: T('pOrd'), w: 70, align: 'c'}, {head: T('pNoteCol'), w: 180, align: 'r', bold: false, size: 10}],
        rows: n(res.missing, (m, i) => { const e = res.extra.find(x => x.near === m.model); return [String(i + 1), m.model, m.ordQty == null ? '' : String(m.ordQty), e ? T('pMaybe', {m: e.model}) : '']; })},
      {title: T('pExtra', {n: res.extra.length}), titleBg: '#b7791f', cols: [idx, mod, {head: T('pRec'), w: 70, align: 'c'}, {head: T('pNoteCol'), w: 180, align: 'r', bold: false, size: 10}],
        rows: n(res.extra, (m, i) => [String(i + 1), m.model, m.recQty == null ? '' : String(m.recQty), m.near ? T('pNear', {m: m.near}) : ''])},
      {title: T('pQtyD', {n: res.qty.length}), titleBg: '#8e5a14', cols: [idx, mod, {head: T('pOrd'), w: 66, align: 'c'}, {head: T('pRec'), w: 66, align: 'c'}, {head: T('pDiff'), w: 66, align: 'c'}],
        rows: n(res.qty, (m, i) => [String(i + 1), m.model, String(m.ordQty), String(m.recQty), (m.diff > 0 ? '+' : '') + m.diff])},
      {title: T('pOk', {n: res.ok.length}), titleBg: '#1f8a4c', cols: [idx, mod], blocks: 2, rows: n(res.ok, (m, i) => [String(i + 1), m.model])}];
    await render(pdf, {header: {title: T('pTitleRecv'), company: st.company || 'ALHARAM CENTER', noLabel: T('pNo'), no: orderNo(o), fields, note: '', noteLabel: T('pNote')},
      cont: T('pContR', {no: LRM + orderNo(o), s: supplierOf(o)}), footer: footerText(st), sections});
    return pdf.finish('Receipt ' + orderNo(o), await embed(o, o.receipt));
  }

  /* ---------- ما وصل إلى الفرع (تصدير) ---------- */
  async function arrivalsPdf(info, rows, st) {
    st = st || {}; const {L, T, D} = mk(st), pdf = new Pdf(L), pieces = rows.reduce((a, r) => a + (+r[2] || 0), 0);
    const fields = [{k: T('pSup'), v: info.sup, wide: true}, {k: T('pBr'), v: info.branch}, {k: T('pDate'), v: D(info.date)}, {k: T('pCount'), v: String(rows.length)}, {k: T('pPieces'), v: String(pieces)}];
    const cols = [{head: T('pIdx'), w: 30, align: 'c', bold: false, size: 10}, {head: T('pModel'), align: 'r', size: 13}, {head: T('pQty'), w: 56, align: 'c'}];
    const list = rows.map((r, i) => ({cells: [String(i + 1), String(r[1]).toUpperCase(), String(r[2])]}));
    const end = async (pg, y) => { await pg.say(T('pTotal', {n: rows.length}) + '    ' + T('pTotalPieces', {n: pieces}), M + CW - 4, y + 10, {size: 11}); };
    await render(pdf, {header: {title: T('pTitleArr'), company: st.company || 'ALHARAM CENTER', noLabel: T('pDate'), no: info.date, fields, note: '', noteLabel: T('pNote')},
      cont: T('pContA', {s: info.sup, d: D(info.date)}), footer: footerText(st), end, sections: [{cols, rows: list, blocks: 2}]});
    return pdf.finish('Arrivals ' + info.date);
  }

  return {orderPdf, receiptPdf, arrivalsPdf, orderNo, supplierOf};
})();
