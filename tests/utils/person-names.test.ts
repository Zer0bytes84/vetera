import { describe, expect, it } from "vitest";
import { firstNameOf } from "@/utils/display-format";
import { personInitials } from "@/design-system/patterns/initials-avatar";

describe("person names", () => {
  it("skips titles to find the first name", () => {
    expect(firstNameOf("Dr Lina Ait Salem")).toBe("Lina");
    expect(firstNameOf("Dr. Karim Messaoud")).toBe("Karim");
    expect(firstNameOf("Mme Nadia Benali")).toBe("Nadia");
    expect(firstNameOf("Yacine Bouras")).toBe("Yacine");
  });

  it("falls back when only titles are given", () => {
    expect(firstNameOf("Dr", "Docteur")).toBe("Docteur");
    expect(firstNameOf("", "Docteur")).toBe("Docteur");
  });

  it("builds initials without the title", () => {
    expect(personInitials("Dr Lina Ait Salem")).toBe("LS");
    expect(personInitials("Nadia Benali")).toBe("NB");
    expect(personInitials("Audit")).toBe("AU");
    expect(personInitials("")).toBe("?");
  });
});
