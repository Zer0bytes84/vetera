// Shared view model for the three direction mockups. Every figure is computed
// from the dataset: "reel" is the test copy of the clinic database, "vide" is a
// fresh clinic, "charge" is a labelled worst-case day built on the real names.
(function () {
  const STAGES = ["planned", "waiting", "consultation", "care", "billing", "done"];
  const STAGE_LABEL = {
    planned: "Prévu", waiting: "Attente", consultation: "Consultation",
    care: "Soins ou résultats", billing: "À facturer", done: "Terminé",
  };
  const DAY = 86400000;
  const pad = (n) => String(n).padStart(2, "0");
  const sameDay = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  const startOf = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const nbsp = " ";
  const num = (n) => Math.round(n).toLocaleString("fr-FR").replace(/\s/g, nbsp);
  const da = (centimes) => `${num(centimes / 100)}${nbsp}DA`;
  const clock = (d) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  const JOURS = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];
  const MOIS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
  const longDate = (d) => `${JOURS[d.getDay()]} ${d.getDate()} ${MOIS[d.getMonth()]}`;
  const MOIS_COURT = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];
  const shortDate = (d) => `${d.getDate()} ${MOIS_COURT[d.getMonth()]}`;
  const when = (s) => (/^\d{4}-\d{2}-\d{2}$/.test(s) ? new Date(`${s}T12:00:00`) : new Date(s));

  function stageOf(a) {
    if (a.stage && STAGES.includes(a.stage)) return a.stage;
    if (a.status === "completed") return "done";
    if (a.status === "in_progress") return "consultation";
    if (a.status === "arrived" || a.status === "checked_in") return "waiting";
    return "planned";
  }

  function build(data, now) {
    const patients = new Map(data.patients.map((p) => [p.id, p]));
    const owners = new Map(data.owners.map((o) => [o.id, o]));
    const ownerName = (id) => {
      const o = owners.get(id);
      return o ? `${o.last_name || ""} ${o.first_name || ""}`.replace(/\s+/g, " ").trim() : "";
    };
    const rooms = new Map((data.rooms || []).map((r) => [r.id, r.name]));
    const visits = data.appointments
      .filter((a) => a.status !== "cancelled")
      .map((a) => {
        const p = patients.get(a.patient_id) || {};
        const start = new Date(a.start_time);
        const end = a.end_time ? new Date(a.end_time) : new Date(start.getTime() + 30 * 60000);
        return {
          id: a.id, start, end, time: clock(start), stage: stageOf(a),
          patient: p.name || "Patient", species: p.species || "", breed: p.breed || "",
          owner: ownerName(a.owner_id || p.owner_id), type: a.type || "Consultation",
          reason: a.reason || "", room: rooms.get(a.room) || "", stageAt: a.stage_at ? new Date(a.stage_at.replace(" ", "T")) : null,
        };
      });
    const today = visits.filter((v) => sameDay(v.start, now)).sort((a, b) => a.start - b.start);
    const byStage = Object.fromEntries(STAGES.map((s) => [s, today.filter((v) => v.stage === s)]));
    const waitingMinutes = (v) => Math.max(0, Math.round((now - (v.stageAt && v.stageAt < now ? v.stageAt : v.start)) / 60000));
    const next = today.find((v) => v.stage === "planned" && v.start >= now) || null;

    // Money, in centimes
    const tx = data.transactions.filter((t) => t.status !== "cancelled");
    const sumIncome = (from, to) => tx.filter((t) => t.type === "income" && when(t.date) >= from && when(t.date) < to).reduce((s, t) => s + t.amount, 0);
    const sumExpense = (from, to) => tx.filter((t) => t.type === "expense" && when(t.date) >= from && when(t.date) < to).reduce((s, t) => s + t.amount, 0);
    const day0 = startOf(now);
    const tomorrow = new Date(day0.getTime() + DAY);
    const from30 = new Date(tomorrow.getTime() - 30 * DAY);
    const from60 = new Date(tomorrow.getTime() - 60 * DAY);
    const income30 = sumIncome(from30, tomorrow);
    const incomePrev = sumIncome(from60, from30);
    const expense30 = sumExpense(from30, tomorrow);
    const incomeToday = sumIncome(day0, tomorrow);
    const txToday = tx.filter((t) => t.type === "income" && sameDay(when(t.date), now)).length;
    const weekStart = new Date(day0.getTime() - ((now.getDay() + 6) % 7) * DAY);
    const incomeWeek = sumIncome(weekStart, tomorrow);

    const live = data.invoices.filter((i) => i.document_status === "issued");
    const receivables = live.reduce((s, i) => s + Math.max(0, i.gross_amount - i.paid), 0);
    const unpaidCount = live.filter((i) => i.gross_amount - i.paid > 0).length;
    const weekInv = live.filter((i) => new Date(i.issued_at) >= weekStart);
    const weekBilled = weekInv.reduce((s, i) => s + i.gross_amount, 0);
    const weekPaid = weekInv.reduce((s, i) => s + Math.min(i.paid, i.gross_amount), 0);
    const settleRate = weekBilled ? Math.round((weekPaid / weekBilled) * 1000) / 10 : null;

    const inRange = (v, a, b) => v.start >= a && v.start < b;
    const visits30 = visits.filter((v) => inRange(v, from30, tomorrow));
    const visitsPrev = visits.filter((v) => inRange(v, from60, from30));
    const seen30 = new Set(visits30.map((v) => v.patient + v.owner)).size;
    const seenPrev = new Set(visitsPrev.map((v) => v.patient + v.owner)).size;
    const newRecords = data.patients.filter((p) => new Date(p.created_at.replace(" ", "T")) >= from30).length;
    const visitsWeek = visits.filter((v) => inRange(v, weekStart, tomorrow)).length;

    const series = [];
    for (let i = 29; i >= 0; i -= 1) {
      const d = new Date(day0.getTime() - i * DAY);
      const e = new Date(d.getTime() + DAY);
      series.push({ date: d, income: sumIncome(d, e), visits: visits.filter((v) => inRange(v, d, e)).length });
    }

    // Watch lists
    const openTasks = data.tasks.filter((t) => t.status !== "done").map((t) => ({
      id: t.id, title: t.title, due: t.due_date ? new Date(t.due_date) : null,
      priority: t.priority, reminder: !!t.is_reminder,
      overdue: t.due_date ? new Date(t.due_date) < day0 : false,
    })).sort((a, b) => (a.due || 0) - (b.due || 0));
    const stock = data.products.filter((p) => !p.archived_at && p.stock_tracked !== 0).map((p) => {
      const low = p.min_stock != null && p.quantity <= p.min_stock;
      const exp = p.expiry_date ? new Date(p.expiry_date) : null;
      const expiring = exp && exp - now < 60 * DAY;
      return { name: p.name, qty: p.quantity, unit: p.unit, min: p.min_stock, low, expiring, exp };
    }).filter((p) => p.low || p.expiring);
    const reminders = data.medicalReminders.filter((r) => r.statut !== "termine" && r.statut !== "annule").map((r) => ({
      patient: (patients.get(r.patient_id) || {}).name || "Patient", type: r.type, due: new Date(r.echeance),
    })).filter((r) => r.due - now < 14 * DAY).sort((a, b) => a.due - b.due);
    const stays = data.stays.filter((s) => s.status === "active" || s.status === "admitted").map((s) => {
      const p = patients.get(s.patient_id) || {};
      return { patient: p.name || "Patient", species: p.species, reason: s.reason, since: new Date(s.admitted_at), owner: ownerName(p.owner_id) };
    });

    const pct = (a, b) => (b ? Math.round(((a - b) / b) * 1000) / 10 : null);
    const done = byStage.done.length;
    const open = today.length - done;
    let finding;
    if (!today.length) finding = "Aucune visite prévue aujourd’hui.";
    else if (!open) finding = `Les ${today.length} visites du jour sont terminées.`;
    else {
      const bits = [];
      if (byStage.waiting.length) bits.push(`${byStage.waiting.length} en attente, la plus longue depuis ${waitingMinutes(byStage.waiting[0])} min`);
      if (byStage.billing.length) bits.push(byStage.billing.length === 1 ? `${byStage.billing[0].patient} attend sa facture` : `${byStage.billing.length} visites à facturer`);
      if (byStage.consultation.length) bits.push(`${byStage.consultation[0].patient} en consultation`);
      finding = `${done} visite${done > 1 ? "s" : ""} sur ${today.length} terminée${done > 1 ? "s" : ""}. ${bits.length ? bits[0].charAt(0).toUpperCase() + bits[0].slice(1) + "." : ""}`;
    }

    return {
      now, nowLabel: clock(now), dateLabel: longDate(now), today, byStage, next, waitingMinutes, finding,
      progress: { done, total: today.length },
      money: { incomeToday, txToday, income30, incomePrev, expense30, net30: income30 - expense30, change: pct(income30, incomePrev), receivables, unpaidCount, incomeWeek, settleRate },
      kpis: {
        visits30: visits30.length, visitsPrev: visitsPrev.length, visitsChange: pct(visits30.length, visitsPrev.length),
        done30: visits30.filter((v) => v.stage === "done").length,
        seen30, seenPrev, seenChange: pct(seen30, seenPrev), newRecords,
        actions: openTasks.length + reminders.length + stock.length,
      },
      week: { income: incomeWeek, visits: visitsWeek, settleRate, receivables },
      series, openTasks, stock, reminders, stays,
      rangeLabel: `${shortDate(from30)} au ${shortDate(day0)}`,
      upcoming: today.filter((v) => v.stage !== "done"),
    };
  }

  // A fresh clinic: nothing yet.
  const EMPTY = { patients: [], owners: [], appointments: [], transactions: [], products: [], tasks: [], stays: [], invoices: [], medicalReminders: [], rooms: [{ id: "consult-1", name: "Salle de consultation" }], users: [] };

  // Worst case for layout only, built on the real names plus long ones. It is
  // labelled on screen as a load test, never presented as clinic data.
  function chargeData(real) {
    const d = JSON.parse(JSON.stringify(real));
    const extraOwners = [
      { id: "o-x1", first_name: "Mohamed-Amine", last_name: "Benabderrahmane-Bouzidi" },
      { id: "o-x2", first_name: "Fatima-Zohra", last_name: "Ait Ouarab" },
      { id: "o-x3", first_name: "Yacine", last_name: "Belkacemi" },
    ];
    const extraPatients = [
      { id: "p-x1", owner_id: "o-x1", name: "Princesse Mia de la Vallée", species: "Chat", breed: "Maine Coon", status: "sante", created_at: "2026-10-12 09:00:00" },
      { id: "p-x2", owner_id: "o-x2", name: "Tchoupi", species: "Chien", breed: "Cavalier King Charles", status: "sante", created_at: "2026-10-14 09:00:00" },
      { id: "p-x3", owner_id: "o-x3", name: "Zazou", species: "Furet", breed: "", status: "sante", created_at: "2026-10-18 09:00:00" },
    ];
    d.owners.push(...extraOwners);
    d.patients.push(...extraPatients);
    const ids = d.patients.map((p) => p.id);
    const plan = [
      ["08:30", "done", "Vaccin", "Rappel vaccinal annuel"], ["08:45", "done", "Consultation", "Démangeaisons oreille gauche"],
      ["09:00", "done", "Contrôle", "Contrôle post-opératoire"], ["09:15", "done", "Consultation", "Boiterie antérieure droite"],
      ["09:40", "done", "Vaccin", "Primo-vaccination"], ["10:00", "done", "Urgence", "Ne mange plus depuis hier"],
      ["10:20", "done", "Consultation", "Vomissements répétés depuis trois jours, perte d’appétit"], ["10:40", "done", "Contrôle", "Pansement"],
      ["10:50", "done", "Consultation", "Bilan sénior"], ["11:00", "billing", "Consultation", "Toux sèche"],
      ["11:05", "care", "Urgence", "Plaie à la patte arrière, suture"], ["11:10", "care", "Consultation", "Prise de sang, attente des résultats"],
      ["11:15", "consultation", "Consultation", "Perte de poids"], ["11:20", "waiting", "Vaccin", "Rappel rage"],
      ["11:30", "waiting", "Consultation", "Diarrhée"], ["11:40", "waiting", "Urgence", "Intoxication suspectée"],
      ["14:00", "planned", "Chirurgie", "Stérilisation"], ["14:30", "planned", "Contrôle", "Contrôle dentaire"],
      ["15:00", "planned", "Consultation", "Dermatite"], ["15:30", "planned", "Vaccin", "Rappel CHPPiL"],
      ["16:00", "planned", "Consultation", "Otite"], ["17:30", "planned", "Contrôle", "Retrait des fils"],
    ];
    d.appointments = d.appointments.filter((a) => !a.start_time.startsWith("2026-10-20"));
    plan.forEach(([t, stage, type, reason], i) => {
      const pid = ids[(i * 7 + 3) % ids.length];
      const p = d.patients.find((x) => x.id === pid);
      const start = new Date(`2026-10-20T${t}:00`);
      d.appointments.push({ id: `c-${i}`, patient_id: pid, owner_id: p.owner_id, start_time: start.toISOString(), end_time: new Date(start.getTime() + 25 * 60000).toISOString(), status: stage === "done" ? "completed" : "scheduled", type, reason, room: type === "Chirurgie" || type === "Urgence" ? "surgery" : "consult-1", stage: stage === "planned" ? null : stage, stage_at: stage === "waiting" ? new Date(`2026-10-20T11:${{"11:20": "16", "11:30": "19", "11:40": "22"}[t]}:00`).toISOString() : null });
    });
    d.stays = [
      { id: "s1", patient_id: "p-x1", status: "active", admitted_at: "2026-10-18T16:00:00", reason: "Insuffisance rénale, perfusion" },
      { id: "s2", patient_id: ids[4], status: "active", admitted_at: "2026-10-20T07:30:00", reason: "Surveillance post-opératoire" },
    ];
    d.products.push(
      { id: "pr2", name: "Amoxicilline + acide clavulanique 500 mg", quantity: 2, unit: "boîtes", min_stock: 6, expiry_date: "2027-03-01", archived_at: null, stock_tracked: 1 },
      { id: "pr3", name: "Vaccin CHPPiL", quantity: 4, unit: "doses", min_stock: 10, expiry_date: "2026-11-30", archived_at: null, stock_tracked: 1 },
      { id: "pr4", name: "Méloxicam 1,5 mg/ml", quantity: 1, unit: "flacon", min_stock: 3, expiry_date: "2027-06-01", archived_at: null, stock_tracked: 1 },
    );
    d.medicalReminders.push(
      { id: "m1", patient_id: "p-x2", type: "vaccin", echeance: "2026-10-16", statut: "en_cours" },
      { id: "m2", patient_id: ids[2], type: "vermifuge", echeance: "2026-10-23", statut: "en_cours" },
      { id: "m3", patient_id: "p-x1", type: "vaccin", echeance: "2026-10-29", statut: "en_cours" },
    );
    d.tasks.push(
      { id: "t2", title: "Rappeler Mme Ait Ouarab pour les résultats d’analyse de Tchoupi", status: "todo", priority: "high", due_date: "2026-10-19", is_reminder: 1 },
      { id: "t3", title: "Commander les vaccins CHPPiL", status: "todo", priority: "medium", due_date: "2026-10-20", is_reminder: 0 },
      { id: "t4", title: "Envoyer le compte rendu opératoire au Dr Belkacemi", status: "todo", priority: "medium", due_date: "2026-10-21", is_reminder: 0 },
    );
    d.transactions.push(
      { id: "tx-c1", date: "2026-10-20", amount: 450000, type: "income", status: "completed" },
      { id: "tx-c2", date: "2026-10-20", amount: 1200000, type: "income", status: "completed" },
    );
    return d;
  }

  window.BaitariModel = {
    STAGES, STAGE_LABEL, num, da, clock, longDate, shortDate, build, EMPTY, chargeData,
    load(state) {
      const real = window.REAL;
      if (state === "vide") return build(EMPTY, new Date(2026, 9, 20, 9, 12));
      if (state === "charge") return build(chargeData(real), new Date(2026, 9, 20, 11, 24));
      return build(real, new Date(real.snapshotAt));
    },
  };
})();
