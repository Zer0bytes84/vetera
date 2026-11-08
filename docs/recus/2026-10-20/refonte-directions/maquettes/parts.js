// Small shared fragments; each direction styles them with its own CSS.
(function () {
  const M = window.BaitariModel;
  const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

  // Delta phrase naming its baseline. Colour says good or bad, not up or down.
  function delta(change, { inverse = false, base = "30 jours précédents" } = {}) {
    if (change === null || change === undefined) return `<span class="delta is-none">Pas de période précédente à comparer</span>`;
    const good = inverse ? change < 0 : change > 0;
    const sign = change > 0 ? "+" : change < 0 ? "−" : "";
    const v = Math.abs(change).toLocaleString("fr-FR", { maximumFractionDigits: 1 });
    return `<span class="delta ${change === 0 ? "is-flat" : good ? "is-good" : "is-bad"}">${sign}${v}${" "}%</span> <span class="delta-base">par rapport aux ${base}</span>`;
  }

  // Receipts as bars, visits as a dot strip on the same days.
  function chart(series, { w = 720, h = 220, radius = 0, dots = true } = {}) {
    const padL = 56, padR = 8, padT = 12, stripH = dots ? 34 : 0, padB = 26 + stripH;
    const iw = w - padL - padR, ih = h - padT - padB;
    const max = Math.max(...series.map((d) => d.income), 0);
    const step = niceStep(max / 100);
    const top = max ? Math.ceil(max / 100 / step) * step : 0;
    const bw = iw / series.length;
    let out = `<svg class="ch" viewBox="0 0 ${w} ${h}" width="100%" role="img" aria-label="Recettes encaissées et consultations par jour, 30 derniers jours">`;
    const ticks = top ? [0, top / 2, top] : [0];
    ticks.forEach((t) => {
      const y = padT + ih - (top ? (t / top) * ih : 0);
      out += `<line class="ch-grid${t === 0 ? " is-base" : ""}" x1="${padL}" x2="${w - padR}" y1="${y}" y2="${y}"/>`;
      out += `<text class="ch-y" x="${padL - 10}" y="${y + 4}" text-anchor="end">${M.num(t)}</text>`;
    });
    series.forEach((d, i) => {
      const x = padL + i * bw;
      const isToday = i === series.length - 1;
      if (d.income > 0) {
        const bh = Math.max(2, (d.income / 100 / top) * ih);
        out += `<rect class="ch-bar${isToday ? " is-today" : ""}" x="${x + bw * 0.18}" y="${padT + ih - bh}" width="${bw * 0.64}" height="${bh}" rx="${radius}"><title>${M.shortDate(d.date)} : ${M.da(d.income)}</title></rect>`;
      }
      if (i % 7 === 2 || isToday) out += `<text class="ch-x${isToday ? " is-today" : ""}" x="${x + bw / 2}" y="${padT + ih + 17}" text-anchor="middle">${isToday ? "Auj." : M.shortDate(d.date)}</text>`;
      if (dots) {
        const cy = padT + ih + 26 + stripH / 2;
        if (d.visits > 0) {
          const r = Math.min(bw * 0.36, 2.4 + Math.sqrt(d.visits) * 1.6);
          out += `<circle class="ch-dot${isToday ? " is-today" : ""}" cx="${x + bw / 2}" cy="${cy}" r="${r}"><title>${M.shortDate(d.date)} : ${d.visits} consultation${d.visits > 1 ? "s" : ""}</title></circle>`;
        } else out += `<circle class="ch-dot-empty" cx="${x + bw / 2}" cy="${cy}" r="1"/>`;
      }
    });
    if (dots) out += `<text class="ch-y" x="${padL - 10}" y="${padT + ih + 26 + stripH / 2 + 4}" text-anchor="end">Visites</text>`;
    if (!max) out += `<text class="ch-empty" x="${padL + iw / 2}" y="${padT + ih / 2}" text-anchor="middle">Aucun encaissement sur ces 30 jours</text>`;
    return out + "</svg>";
  }
  function niceStep(v) {
    if (v <= 0) return 1;
    const raw = v / 2;
    const p = 10 ** Math.floor(Math.log10(raw));
    const n = raw / p;
    return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * p;
  }

  const plural = (n, one, many) => `${M.num(n)} ${n > 1 ? many : one}`;
  const relDue = (date, now) => {
    const days = Math.round((new Date(date.getFullYear(), date.getMonth(), date.getDate()) - new Date(now.getFullYear(), now.getMonth(), now.getDate())) / 86400000);
    if (days === 0) return "aujourd’hui";
    if (days === 1) return "demain";
    if (days === -1) return "hier";
    if (days < 0) return `en retard de ${-days} j`;
    return `dans ${days} j`;
  };
  const since = (date, now) => {
    const h = Math.round((now - date) / 3600000);
    return h < 24 ? `depuis ${h} h` : `depuis ${Math.round(h / 24)} j`;
  };
  const stageNames = (list, n = 3) => list.slice(0, n);

  window.Parts = { esc, delta, chart, plural, relDue, since, stageNames };
})();
