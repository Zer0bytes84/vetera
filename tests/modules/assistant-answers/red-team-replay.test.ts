/**
 * Les sondes de l'équipe rouge du 19 novembre (catégories A à E), rejouées sur le moteur : chacune doit être refusée
 * (aucun chiffre), sauf les questions du catalogue, qui doivent rester répondues.
 */
import { it, expect } from "vitest";
import { answerQuestion, STARTER_QUESTIONS } from "@/modules/assistant-answers/answer";
import { appointment, clinic, NOW, patient, task } from "./fixtures";

const MUST_REFUSE = [
  // A. busy
  "on est chargé demain", "on est très chargé demain ?", "demain c'est chargé ?", "Chargés ce mois",
  // B. doses mixed with a valid subject
  "rendez-vous de Rex et quelle quantité d'amoxicilline lui donner", "tâches de Rex : combien d'amoxicilline", "patients : quelle quantité de méloxicam pour un chien de 10 kilos",
  "rendez-vous de Rex, il pèse 12 kilos, combien de seringues de métacam",
  ...["0.1 mgkg", "2 mgs", "2 mgr", "2 milligr", "2 mls", "2 millis", "2 c.c.", "2 grammes", "2 gr", "5U", "5 U d'insuline", "1 cps", "1 cpr", "1 tablette", "1 tablet", "2 pills", "2 caps", "1 capsule", "1 sachet", "1 seringue", "1 dosette", "1 spray", "3 pulvérisations", "2 bouffées", "2 gtt", "2 gttes", "2x par jour", "1/j", "1 fois/j", "1 par jour", "toutes les douze heures", "chaque 8 heures", "matin et soir", "bid", "q12h", "une fois quotidienne", "un demi", "une demi", "un quart", "1/2", "½", "0.5", "amoxicilline 250 deux fois", "amox 250", "metacam 1.5", "dózis", "d o s e", "d.o.s.e", "dos3", "pos0logie", "dosis", "combien d'amoxicilline", "combien de médicament", "combien de pilules", "how many tablets", "how much amoxicillin", "inject", "injecte", "piqûre", "piqure de 2", "perfuser 10", "ملغ", "مل", "5 ملغ", "جرعة", "شحال من الدوا", "qaddech men dwa", "jor3a", "💊💊"].map((form) => `rendez-vous demain ${form}`),
  // D. parts of a day
  "rendez-vous demain soir", "rendez-vous de demain matin", "rendez-vous après-demain matin", "rendez-vous hier soir", "recette d'hier soir", "rendez-vous aujourd'hui matin", "rendez-vous d'aujourd'hui en soirée", "rendez-vous à 10h demain", "rendez-vous cette aprem", "rendez-vous du matin", "rendez-vous matin", "rendez-vous de 10 h", "rendez-vous à 9 h 30",
  // E. periods the parser does not read, or misreads
  "rendez-vous dans 3 jours", "rendez-vous il y a 2 jours", "rendez-vous dans 15 jours", "recettes des 15 jours", "recettes ces 7 jours", "rendez-vous des 7 jours à venir", "rendez-vous des 3 jours prochains", "recettes le mois d'avant", "rendez-vous la veille", "rendez-vous l'avant-veille", "rendez-vous le lendemain", "rendez-vous du week-end", "rendez-vous de la nuit", "recettes 2025", "recettes à venir",
  "rendez-vous la semaine d'après", "rendez-vous la semaine d'avant", "rendez-vous la semaine qui vient", "recettes novembre dernier", "recettes novembre de l'année dernière", "recettes hier et aujourd'hui", "recettes hier vs aujourd'hui",
  // E. filters the engine does not apply
  "combien de chats", "combien de dossiers de chats", "chiens mâles", "patients décédés", "patients vivants", "patients hospitalisés", "patients sous traitement", "patients de Karim", "patients de Rex", "dossiers de Rex", "dossier Rex",
  "rendez-vous confirmés demain", "rendez-vous en retard", "rendez-vous du Dr Benali", "rendez-vous du vétérinaire Karim", "rendez-vous par jour", "patients sans rendez-vous",
  "tâches faites ce mois", "tâches urgentes", "tâches haute priorité", "recettes en espèces", "recettes par carte", "recettes par moyen de paiement", "moyenne des recettes par jour", "recettes prévues",
  "solde de Karim", "solde du compte de Karim", "mon solde bancaire", "chiffre d'affaires de Karim", "chiffre d'affaires de l'heure",
  "combien gagne un vétérinaire", "combien a gagné Karim", "on a gagné ce match", "on a gagné du temps aujourd'hui", "on a gagné combien de patients ce mois", "combien de nouveaux patients a-t-on gagné ce mois",
  // the harness set's misroutes
  "qui a gagné le match hier", "recette de couscous", "on est chargés demain", "qui on voit ce matin en consultation", "protocole de vermifugation chien adulte", "dossier medical Hercule", "le chat de Zouaoui c'est quoi son nom",
];
// Questions the vet asks that the catalogue reads: each must keep its answer.
const MUST_ANSWER = [
  ...STARTER_QUESTIONS, "Recettes de ce mois", "Recettes du mois dernier", "Dépenses des 30 derniers jours", "Rendez-vous d’aujourd’hui", "Rendez-vous de cette semaine",
  "Absences des 30 derniers jours", "Tâches en retard", "Tâches de cette semaine", "Tâches ouvertes", "Nouveaux patients ce mois", "Combien de patients ?",
  "recettes du mois dernier", "combien on a gagné ce mois", "recette du jour", "charges du mois", "Rendez-vous de Rex", "rendez-vous de Rex cette semaine", "tâches de Rex",
  "rendez-vous d'après-demain", "montre-moi les patients", "affiche le nombre de patients", "montre les nouveaux patients ce mois", "affiche les rendez-vous de demain",
  "dépenses de l'année dernière", "recettes de novembre", "recettes de 2025", "rendez-vous annulés ce mois", "absences de la semaine dernière", "rdv demain", "planning de la semaine prochaine",
  "quels sont les rendez-vous de demain", "qui on voit demain en consultation", "combien de rendez-vous cette semaine", "les 7 derniers jours de recettes", "trésorerie de ce mois", "solde du mois",
];

it("rejeu des sondes de l'équipe rouge du 19 novembre : toutes refusées, le catalogue toujours répondu", () => {
  const data = clinic({
    patients: [patient("p1", "Rex")],
    appointments: [appointment("a1", "p1", NOW.toISOString(), "scheduled")],
    tasks: [task("t1", "Rappel", undefined, { patientId: "p1" })],
  });
  const ask = (q: string) => answerQuestion(q, data, { now: NOW });
  // Names that collide with words, on a base of their own: « hier », « jour », « Demain », « Mars », « Midi » as patients.
  const odd = clinic({ patients: [patient("p2", "Hier"), patient("p3", "Jour"), patient("p4", "Demain"), patient("p5", "Mars"), patient("p6", "Midi")] });
  const collisions = ["rendez-vous d'hier", "rendez-vous du jour", "tâches de Demain", "rendez-vous de Mars ce mois", "rendez-vous à midi"].map((q) => {
    const a = answerQuestion(q, odd, { now: NOW });
    return { question: q, attendu: "refus", obtenu: a.kind === "refusal" ? `refus:${a.reason}` : `réponse:${a.topic}`, ok: a.kind === "refusal", texte: a.text.slice(0, 90) };
  });
  const rows = [...MUST_REFUSE.map((q) => ({ q, attendu: "refus" })), ...MUST_ANSWER.map((q) => ({ q, attendu: "réponse" }))].map(({ q, attendu }) => {
    const a = ask(q);
    const got = a.kind === "refusal" ? `refus:${a.reason}` : `réponse:${a.topic}`;
    return { question: q, attendu, obtenu: got, ok: attendu === "refus" ? a.kind === "refusal" : a.kind === "answer", texte: a.kind === "refusal" ? a.text.slice(0, 90) : a.text.slice(0, 90) };
  });
  rows.push(...collisions);
  const bad = rows.filter((row) => !row.ok).map((row) => `${row.attendu} attendu · « ${row.question} » → ${row.obtenu}`);
  expect(bad).toEqual([]);
  expect(rows.length).toBeGreaterThan(150);
});
