/* مطابقة «المطلوب» مع «الواصل»: مطابق / لم يصل / زيادة / فرق كمية، مع اقتراح الموديل الأقرب عند خطأ القراءة. */
const Cmp = (() => {
  const digits = s => String(s == null ? '' : s).replace(/[٠-٩]/g, c => '٠١٢٣٤٥٦٧٨٩'.indexOf(c)).replace(/[۰-۹]/g, c => '۰۱۲۳۴۵۶۷۸۹'.indexOf(c));
  const key = m => digits(m).toUpperCase().replace(/[^0-9A-Z]/g, '');
  const num = q => { const t = digits(q).trim().replace(/[^\d.]/g, ''); if (!t) return null; const n = parseFloat(t); return isNaN(n) ? null : n; };

  function lev(a, b) {
    if (a === b) return 0;
    const prev = Array.from({length: b.length + 1}, (_, i) => i);
    for (let i = 1; i <= a.length; i++) {
      let cur = [i];
      for (let j = 1; j <= b.length; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      for (let j = 0; j <= b.length; j++) prev[j] = cur[j];
    }
    return prev[b.length];
  }
  const limit = (a, b) => { const n = Math.max(a.length, b.length); return n >= 8 ? 2 : n >= 5 ? 1 : 0; };

  // يجمع السطور حسب الموديل (يجمع الكميات الرقمية إن وُجدت)
  function group(lines) {
    const g = new Map();
    for (const l of lines || []) {
      const k = key(l.model); if (!k) continue;
      let e = g.get(k); if (!e) g.set(k, e = {key: k, model: String(l.model).trim().toUpperCase(), qty: null, ids: [], n: 0});
      const q = num(l.qty); if (q != null) e.qty = (e.qty || 0) + q;
      e.ids.push(l.id); e.n++;
    }
    return g;
  }

  function compare(ordered, received) {
    const O = group(ordered), R = group(received), res = {ok: [], qty: [], missing: [], extra: [], orderedCount: O.size, receivedCount: R.size};
    for (const [k, o] of O) {
      const r = R.get(k);
      if (!r) { res.missing.push({model: o.model, key: k, ordQty: o.qty}); continue; }
      R.delete(k);
      if (o.qty != null && r.qty != null && o.qty !== r.qty) res.qty.push({model: o.model, ordQty: o.qty, recQty: r.qty, diff: r.qty - o.qty});
      else res.ok.push({model: o.model, ordQty: o.qty, recQty: r.qty});
    }
    for (const [k, r] of R) res.extra.push({model: r.model, key: k, recQty: r.qty, ids: r.ids});
    // اقتراح: موديل واصل ليس في الطلبية وقريب جدًا من موديل لم يصل (غالبًا خطأ قراءة)
    const taken = new Set();
    for (const e of res.extra) {
      let best = null, bd = 99;
      for (const m of res.missing) {
        if (taken.has(m.key)) continue;
        const d = lev(e.key, m.key);
        if (d <= limit(e.key, m.key) && d < bd) { best = m; bd = d; }
      }
      if (best) { e.near = best.model; e.nearKey = best.key; taken.add(best.key); }
    }
    res.issues = res.missing.length + res.extra.length + res.qty.length;
    res.matched = res.ok.length + res.qty.length;
    return res;
  }

  // حالة الطلبية: pending (لم يُستلم شيء) / done (مطابق) / diff (فيه اختلافات)
  function status(order) {
    const rec = order.receipt && order.receipt.lines || [];
    if (!rec.some(l => key(l.model))) return {state: 'pending', issues: 0};
    const r = compare(order.lines, rec);
    return {state: r.issues ? 'diff' : 'done', issues: r.issues, result: r};
  }

  return {digits, key, num, compare, status};
})();
if (typeof module !== 'undefined') module.exports = Cmp;
