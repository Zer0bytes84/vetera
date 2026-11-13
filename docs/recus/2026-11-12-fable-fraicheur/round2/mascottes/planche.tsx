// Planche de comparaison, servie par Vite au banc seulement (jamais importee par l'app) :
// les mascottes actuelles rendues par leur vrai composant, les trois propositions a cote.
import { createRoot } from "react-dom/client";
import { LineMascot } from "@/components/mascot/line-mascot";
import type { LineAnimalKey, LineMood } from "@/components/mascot/line-mascots";
import { HUMEURS, PROPOSITIONS, svg } from "./propositions.mjs";

const MOODS = Object.keys(HUMEURS) as LineMood[];
const ACTUELLES: LineAnimalKey[] = ["chien", "chat", "lapin"];

function Rangee({ titre, note, children }: { titre: string; note?: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "250px repeat(3, 120px) 44px 30px", alignItems: "center", columnGap: 26, padding: "14px 0" }}>
      <div>
        <div style={{ fontSize: 16, fontWeight: 600 }}>{titre}</div>
        {note ? <div style={{ fontSize: 12, lineHeight: "17px", opacity: 0.66, marginTop: 4 }}>{note}</div> : null}
      </div>
      {children}
    </div>
  );
}

function Planche() {
  const proposition = (key: string, mood: LineMood, size: number) => (
    <span dangerouslySetInnerHTML={{ __html: svg(key, mood, `${key}-${mood}-${size}`) }} key={`${mood}-${size}`} style={{ width: size, height: size, display: "inline-block", "--pet-ink": "var(--foreground)", "--pet-paper": "var(--background)" } as React.CSSProperties} />
  );
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 99999, overflow: "auto", background: "var(--background)", color: "var(--foreground)", padding: "28px 40px", fontFamily: "var(--clean-font-ui, sans-serif)" }}>
      <div style={{ display: "grid", gridTemplateColumns: "250px repeat(3, 120px) 44px 30px", columnGap: 26, fontSize: 12, opacity: 0.66, paddingBottom: 6 }}>
        <span />
        {MOODS.map((mood) => <span key={mood} style={{ textAlign: "center" }}>{HUMEURS[mood]}</span>)}
        <span style={{ textAlign: "center" }}>44 px</span>
        <span style={{ textAlign: "center" }}>28 px</span>
      </div>
      <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", opacity: 0.6, padding: "10px 0 2px" }}>Actuelles (trois des douze)</div>
      {ACTUELLES.map((animal) => (
        <Rangee key={animal} titre={animal[0].toUpperCase() + animal.slice(1)}>
          {MOODS.map((mood) => <LineMascot animal={animal} key={mood} mood={mood} size={120} />)}
          <LineMascot animal={animal} mood="neutral" size={44} />
          <LineMascot animal={animal} mood="neutral" size={28} />
        </Rangee>
      ))}
      <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", opacity: 0.6, padding: "22px 0 2px" }}>Propositions du banc (à part, non branchées)</div>
      {Object.entries(PROPOSITIONS).map(([key, art]) => (
        <Rangee key={key} note={art.pourquoi} titre={art.label}>
          {MOODS.map((mood) => proposition(key, mood, 120))}
          {proposition(key, "neutral", 44)}
          {proposition(key, "neutral", 28)}
        </Rangee>
      ))}
    </div>
  );
}

export function monter() {
  const hote = document.createElement("div");
  document.body.append(hote);
  createRoot(hote).render(<Planche />);
}
