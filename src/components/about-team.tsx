import Avatar from "@/components/Avatar";

const contributors = [
  {
    name: "Zouhir Kherroubi",
    photo: "/zouhir-kherroubi.jpg",
    role: "Fondateur · Produit & Ingénierie",
    description: "Conçoit l’expérience, l’architecture et les fonctions intelligentes qui donnent vie à Baitari.",
    skills: ["Produit", "Architecture", "IA"],
  },
  {
    name: "Dr Aissa Zeghouini",
    photo: "/dr-aissa-zeghouini.jpg",
    role: "Co-fondateur · Référent clinique",
    description: "Oriente les parcours de soin et veille à leur cohérence avec les réalités quotidiennes de la clinique.",
    skills: ["Parcours de soin", "Protocoles", "Priorités"],
  },
  {
    name: "Karim Abderrahmani",
    photo: "/karim-abderrahmani.jpg",
    role: "Validation terrain · Qualité d’usage",
    description: "Teste l’application, identifie les points de friction et enrichit le produit grâce à son expertise terrain.",
    skills: ["Tests", "Ergonomie", "Retours métier"],
  },
];

export function AboutTeam() {
  return <section className="settings-panel settings-credits" aria-labelledby="about-team-title">
    <div className="settings-panel-heading">
      <h3 id="about-team-title">Équipe Baitari</h3>
      <p>Produit, expertise clinique et validation terrain réunis autour d’un même outil.</p>
    </div>
    <div className="settings-credits-grid grid gap-4 p-5 xl:grid-cols-3">
      {contributors.map(person => <article key={person.name} className="settings-contributor flex min-w-0 flex-col gap-3 rounded-lg border border-border p-4">
        <Avatar name={person.name} src={person.photo} size="lg" className="size-14 shrink-0 rounded-full" />
        <div className="min-w-0"><h4 className="text-sm font-medium leading-5">{person.name}</h4><p className="mt-1 text-xs text-muted-foreground leading-5">{person.role}</p></div>
        <p className="flex-1 text-xs text-muted-foreground leading-6">{person.description}</p>
        <ul className="flex flex-wrap gap-1.5" aria-label={`Contributions de ${person.name}`}>
          {person.skills.map(skill => <li className="rounded-full border border-border px-2 py-1 text-[11px] text-muted-foreground" key={skill}>{skill}</li>)}
        </ul>
      </article>)}
    </div>
  </section>;
}
