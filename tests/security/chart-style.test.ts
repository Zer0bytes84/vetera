import { describe, expect, it } from "vitest";
import { chartColorCss, safeChartColor } from "@/components/ui/chart-style";

const THEMES = { light: "", dark: ".dark" } as const;
const ACTIVE_OUTPUT = /<|>|url\(|expression|\/\*/;

describe("chartColorCss : la configuration du graphique des poids", () => {
  it("écrit exactement la feuille de style d'avant pour une couleur légitime", () => {
    const css = chartColorCss(
      "chart-abc",
      [["weightKg", { color: "var(--primary)" }]],
      THEMES
    );
    expect(css).toBe(
      "\n [data-chart=chart-abc] {\n  --color-weightKg: var(--primary);\n}\n\n\n.dark [data-chart=chart-abc] {\n  --color-weightKg: var(--primary);\n}\n"
    );
  });

  it("choisit la couleur du thème quand il y en a une", () => {
    const css = chartColorCss(
      "c1",
      [
        [
          "a",
          { theme: { light: "#112233", dark: "oklch(0.7 0.1 200 / 50%)" } },
        ],
      ],
      THEMES
    );
    expect(css).toContain("--color-a: #112233;");
    expect(css).toContain("--color-a: oklch(0.7 0.1 200 / 50%);");
  });
});

describe("chartColorCss : ce qui ne doit pas être écrit", () => {
  const hostile = [
    "red; } </style><script>alert(1)</script>",
    "red}</style><img src=x onerror=alert(1)>",
    "url(https://evil.example/x.png)",
    "red; background: url(javascript:alert(1))",
    "expression(alert(1))",
    "red /* commentaire */",
    "red\\; x",
    'red"; x',
    "var(--a",
    "var(--a))",
    "@import 'x'",
    "",
  ];

  it.each(hostile)("la couleur %j est laissée de côté", (color) => {
    expect(safeChartColor(color)).toBeNull();
    const css = chartColorCss("c1", [["a", { color }]], THEMES) ?? "";
    expect(css).not.toContain("--color-a");
    expect(css).not.toMatch(ACTIVE_OUTPUT);
  });

  it("une clé ou un identifiant qui pourrait fermer la règle n'est pas écrit", () => {
    expect(
      chartColorCss("c1", [["a}</style>", { color: "red" }]], THEMES) ?? ""
    ).not.toContain("<");
    expect(
      chartColorCss("c1] { x", [["a", { color: "red" }]], THEMES)
    ).toBeNull();
    expect(
      chartColorCss('c1"><script>', [["a", { color: "red" }]], THEMES)
    ).toBeNull();
  });

  it("garde les couleurs usuelles", () => {
    for (const color of [
      "#fff",
      "#aabbccdd",
      "red",
      "rgb(1 2 3 / 50%)",
      "hsl(200, 50%, 50%)",
      "var(--primary)",
      "color-mix(in oklab, var(--a) 40%, transparent)",
    ]) {
      expect(safeChartColor(color), color).toBe(color);
    }
  });
});
