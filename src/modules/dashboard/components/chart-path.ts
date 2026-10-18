/**
 * Courbe lissée monotone (Fritsch-Carlson) : passe par chaque point sans
 * dépasser les valeurs voisines, donc jamais sous zéro ni au-dessus d'un pic.
 */
export type ChartPoint = readonly [x: number, y: number];

const fmt = (value: number) => value.toFixed(1);

export function monotonePath(points: readonly ChartPoint[]): string {
  const n = points.length;
  if (n === 0) return "";
  if (n === 1) return `M${fmt(points[0][0])},${fmt(points[0][1])}`;
  if (n === 2) {
    return `M${fmt(points[0][0])},${fmt(points[0][1])} L${fmt(points[1][0])},${fmt(points[1][1])}`;
  }

  const dx: number[] = [];
  const slope: number[] = [];
  for (let i = 0; i < n - 1; i++) {
    const h = points[i + 1][0] - points[i][0];
    dx.push(h);
    slope.push(h === 0 ? 0 : (points[i + 1][1] - points[i][1]) / h);
  }

  const tangent: number[] = new Array(n);
  tangent[0] = slope[0];
  tangent[n - 1] = slope[n - 2];
  for (let i = 1; i < n - 1; i++) {
    tangent[i] = slope[i - 1] * slope[i] <= 0 ? 0 : (slope[i - 1] + slope[i]) / 2;
  }
  // Limite les tangentes pour garantir la monotonie entre deux points.
  for (let i = 0; i < n - 1; i++) {
    if (slope[i] === 0) {
      tangent[i] = 0;
      tangent[i + 1] = 0;
      continue;
    }
    const a = tangent[i] / slope[i];
    const b = tangent[i + 1] / slope[i];
    const s = a * a + b * b;
    if (s > 9) {
      const t = 3 / Math.sqrt(s);
      tangent[i] = t * a * slope[i];
      tangent[i + 1] = t * b * slope[i];
    }
  }

  let d = `M${fmt(points[0][0])},${fmt(points[0][1])}`;
  for (let i = 0; i < n - 1; i++) {
    const [x0, y0] = points[i];
    const [x1, y1] = points[i + 1];
    const h = dx[i] / 3;
    d += ` C${fmt(x0 + h)},${fmt(y0 + tangent[i] * h)} ${fmt(x1 - h)},${fmt(y1 - tangent[i + 1] * h)} ${fmt(x1)},${fmt(y1)}`;
  }
  return d;
}

/** Sépare un montant formaté de son unité : « 13 900 DA » → ["13 900", "DA"]. */
export function splitUnit(formatted: string): [value: string, unit: string] {
  const match = /^(.*?)[\s\u00a0\u202f]*(DA|%)$/.exec(formatted.trim());
  return match ? [match[1], match[2]] : [formatted, ""];
}
