import {
  Activity01Icon,
  Bug01Icon,
  GivePillIcon,
  KitchenUtensilsIcon,
  Package02Icon,
  PillIcon,
  Scissor01Icon,
  SparklesIcon,
} from "@/lib/hugeicons";

export const getCategoryIcon = (category: string) => {
  switch (category) {
    case "Médicaments":
      return PillIcon;
    case "Vaccins":
      return GivePillIcon;
    case "Antiparasitaires":
      return Bug01Icon;
    case "Anti-inflammatoires":
      return Activity01Icon;
    case "Matériel Médical":
      return Scissor01Icon;
    case "Alimentation":
      return KitchenUtensilsIcon;
    case "Hygiène":
      return SparklesIcon;
    default:
      return Package02Icon;
  }
};

export const COMMON_VET_PRODUCTS = [
  {
    category: "Antibiotiques",
    name: "Amoxicilline 500mg",
    subCategory: "Antibiotique général",
    unit: "comprimés",
    minStock: 20,
    purchase: 800,
    sale: 1500,
  },
  {
    category: "Antibiotiques",
    name: "Synulox 250mg",
    subCategory: "Antibiotique",
    unit: "comprimés",
    minStock: 10,
    purchase: 1200,
    sale: 2200,
  },
  {
    category: "Antibiotiques",
    name: "Doxycycline 100mg",
    subCategory: "Antibiotique",
    unit: "comprimés",
    minStock: 15,
    purchase: 600,
    sale: 1200,
  },
  {
    category: "Vaccins",
    name: "CHPPiL (Chien)",
    subCategory: "Vaccin Polyvalent",
    unit: "doses",
    minStock: 5,
    purchase: 1800,
    sale: 3000,
  },
  {
    category: "Vaccins",
    name: "Rage (Rabisin)",
    subCategory: "Vaccin Antirabique",
    unit: "doses",
    minStock: 5,
    purchase: 900,
    sale: 1500,
  },
  {
    category: "Vaccins",
    name: "Leucofeligen (Chat)",
    subCategory: "Vaccin Chat",
    unit: "doses",
    minStock: 5,
    purchase: 1600,
    sale: 2800,
  },
  {
    category: "Anti-inflammatoires",
    name: "Metacam (Meloxicam) inj",
    subCategory: "AINS",
    unit: "flacon",
    minStock: 2,
    purchase: 3500,
    sale: 5500,
  },
  {
    category: "Anti-inflammatoires",
    name: "Prednisolone 5mg",
    subCategory: "Corticoïde",
    unit: "boite",
    minStock: 5,
    purchase: 400,
    sale: 800,
  },
  {
    category: "Antiparasitaires",
    name: "Bravecto Chien 20-40kg",
    subCategory: "Externe",
    unit: "comprimé",
    minStock: 3,
    purchase: 4500,
    sale: 6500,
  },
  {
    category: "Antiparasitaires",
    name: "Nexgard Spectra M",
    subCategory: "Complet",
    unit: "comprimé",
    minStock: 5,
    purchase: 3200,
    sale: 4800,
  },
  {
    category: "Antiparasitaires",
    name: "Drontal Chien",
    subCategory: "Interne",
    unit: "comprimé",
    minStock: 20,
    purchase: 300,
    sale: 600,
  },
  {
    category: "Anesthésie",
    name: "Ketamine 1000",
    subCategory: "Anesthésique",
    unit: "flacon",
    minStock: 2,
    purchase: 2500,
    sale: 0,
  },
  {
    category: "Anesthésie",
    name: "Domitor",
    subCategory: "Sédatif",
    unit: "flacon",
    minStock: 1,
    purchase: 4000,
    sale: 0,
  },
  {
    category: "Hygiène",
    name: "Shampoing Antiseptique",
    subCategory: "Dermatologie",
    unit: "flacon",
    minStock: 3,
    purchase: 1200,
    sale: 2000,
  },
  {
    category: "Matériel",
    name: "Seringues 2.5ml",
    subCategory: "Consommable",
    unit: "boite 100",
    minStock: 2,
    purchase: 800,
    sale: 1000,
  },
];

export const CATEGORIES = [
  "Médicaments",
  "Vaccins",
  "Antiparasitaires",
  "Anti-inflammatoires",
  "Anesthésie",
  "Matériel Médical",
  "Consommables",
  "Alimentation",
  "Hygiène",
  "Autre",
];
