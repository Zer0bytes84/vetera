import { describe, expect, it, vi } from "vitest";
import {
  OPENABLE_ATTACHMENT_TYPES,
  openAttachment,
  openableAttachmentType,
} from "@/lib/safe-attachment";

const BASE64 = "QUJD";

describe("openableAttachmentType : les types que le dépôt de fichiers accepte", () => {
  it.each(OPENABLE_ATTACHMENT_TYPES)("%s s'ouvre", (type) => {
    expect(openableAttachmentType(`data:${type};base64,${BASE64}`)).toBe(type);
  });

  it("ne tient pas compte de la casse ni d'un paramètre", () => {
    expect(openableAttachmentType(`data:IMAGE/PNG;base64,${BASE64}`)).toBe(
      "image/png"
    );
    expect(
      openableAttachmentType(
        `data:application/pdf;name=bilan.pdf;base64,${BASE64}`
      )
    ).toBe("application/pdf");
  });

  it("couvre tout ce que l'application accepte au dépôt (clinique-shared : pdf, png, jpeg, webp, heic, heif)", () => {
    for (const type of [
      "application/pdf",
      "image/png",
      "image/jpeg",
      "image/webp",
      "image/heic",
      "image/heif",
    ]) {
      expect(OPENABLE_ATTACHMENT_TYPES).toContain(type);
    }
  });
});

describe("openableAttachmentType : ce qui ne s'ouvre pas", () => {
  const refused = [
    ["html", `data:text/html;base64,${BASE64}`],
    [
      "html avec jeu de caractères",
      `data:text/html;charset=utf-8;base64,${BASE64}`,
    ],
    ["html sans base 64", "data:text/html,<script>alert(1)</script>"],
    ["svg", `data:image/svg+xml;base64,${BASE64}`],
    ["xhtml", `data:application/xhtml+xml;base64,${BASE64}`],
    ["xml", `data:text/xml;base64,${BASE64}`],
    ["javascript", `data:text/javascript;base64,${BASE64}`],
    ["javascript application", `data:application/javascript;base64,${BASE64}`],
    ["texte", `data:text/plain;base64,${BASE64}`],
    ["flux d'octets", `data:application/octet-stream;base64,${BASE64}`],
    ["sans type", `data:;base64,${BASE64}`],
    ["type vide", `data:/;base64,${BASE64}`],
    ["type collé à un autre", `data:image/png,text/html;base64,${BASE64}`],
    ["image avec un second type", `data:image/png;text/html;base64,${BASE64}`],
    ["javascript:", "javascript:alert(1)"],
    ["http", "https://exemple.dz/bilan.pdf"],
    ["blob", "blob:http://localhost/abc"],
    ["file", "file:///etc/passwd"],
    ["vide", ""],
    ["sans schéma", "application/pdf;base64,QUJD"],
  ] as const;

  it.each(refused)("%s", (_name, url) => {
    expect(openableAttachmentType(url)).toBeNull();
  });

  it("refuse ce qui n'est pas une chaîne", () => {
    expect(openableAttachmentType(null)).toBeNull();
    expect(openableAttachmentType(undefined)).toBeNull();
    expect(openableAttachmentType(42 as unknown as string)).toBeNull();
  });

  it("un type de confiance placé loin dans une adresse piégée ne compte pas", () => {
    expect(
      openableAttachmentType(
        `data:text/html;x=${"a".repeat(300)};base64,${BASE64}`
      )
    ).toBeNull();
    expect(
      openableAttachmentType(
        `data:image/png;${"a=b;".repeat(80)}base64,${BASE64}`
      )
    ).toBeNull();
  });
});

describe("openAttachment", () => {
  it("ouvre une pièce jointe permise, dans une nouvelle fenêtre", () => {
    const open = vi.fn();
    const url = `data:application/pdf;base64,${BASE64}`;
    expect(openAttachment(url, open)).toBe(true);
    expect(open).toHaveBeenCalledWith(url, "_blank");
  });

  it("n'ouvre rien quand le type est refusé", () => {
    const open = vi.fn();
    expect(openAttachment(`data:text/html;base64,${BASE64}`, open)).toBe(false);
    expect(openAttachment(null, open)).toBe(false);
    expect(open).not.toHaveBeenCalled();
  });
});
