import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import {
  DatePicker,
  formatDateValue,
  parseDateValue,
} from "@/components/ui/date-picker";
import { mustExist } from "@/lib/must-exist";

const REQUIRED_INPUT = /<input[^>]*required/;

it("lit et écrit un jour civil sans décalage UTC", () => {
  const date = parseDateValue("2026-03-29");
  expect(date?.getDate()).toBe(29);
  expect(formatDateValue(mustExist(date, "date lue"))).toBe("2026-03-29");
  expect(parseDateValue("")).toBeUndefined();
  expect(parseDateValue("29/03/2026")).toBeUndefined();
});

it("affiche la date au format français et conserve la validation requise", () => {
  const html = renderToStaticMarkup(
    <DatePicker
      aria-label="Date du rappel"
      onChange={() => undefined}
      required
      value="2026-10-14"
    />
  );
  expect(html).toContain("14/10/2026");
  expect(html).toMatch(REQUIRED_INPUT);
  expect(
    renderToStaticMarkup(<DatePicker onChange={() => undefined} value="" />)
  ).toContain("Choisir une date");
});
