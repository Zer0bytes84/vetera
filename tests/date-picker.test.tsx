import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { DatePicker, formatDateValue, parseDateValue } from "@/components/ui/date-picker";

it("lit et écrit un jour civil sans décalage UTC", () => {
  const date = parseDateValue("2026-03-29");
  expect(date?.getDate()).toBe(29);
  expect(formatDateValue(date!)).toBe("2026-03-29");
  expect(parseDateValue("")).toBeUndefined();
  expect(parseDateValue("29/03/2026")).toBeUndefined();
});

it("affiche la date au format français et conserve la validation requise", () => {
  const html = renderToStaticMarkup(<DatePicker aria-label="Date du rappel" onChange={() => {}} required value="2026-10-14" />);
  expect(html).toContain("14/10/2026");
  expect(html).toMatch(/<input[^>]*required/);
  expect(renderToStaticMarkup(<DatePicker onChange={() => {}} value="" />)).toContain("Choisir une date");
});
