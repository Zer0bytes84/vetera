/** Display-only formatting. Repository values and contact links stay intact. */
// Calling-code identifiers from libphonenumber-js metadata, checked 2026-10-08.
// https://github.com/catamphetamine/libphonenumber-js
const callingCodes = new Set(
  "1 7 20 27 30 31 32 33 34 36 39 40 41 43 44 45 46 47 48 49 51 52 53 54 55 56 57 58 60 61 62 63 64 65 66 81 82 84 86 90 91 92 93 94 95 98 211 212 213 216 218 220 221 222 223 224 225 226 227 228 229 230 231 232 233 234 235 236 237 238 239 240 241 242 243 244 245 246 247 248 249 250 251 252 253 254 255 256 257 258 260 261 262 263 264 265 266 267 268 269 290 291 297 298 299 350 351 352 353 354 355 356 357 358 359 370 371 372 373 374 375 376 377 378 380 381 382 383 385 386 387 389 420 421 423 500 501 502 503 504 505 506 507 508 509 590 591 592 593 594 595 596 597 598 599 670 672 673 674 675 676 677 678 679 680 681 682 683 685 686 687 688 689 690 691 692 850 852 853 855 856 880 886 960 961 962 963 964 965 966 967 968 970 971 972 973 974 975 976 977 992 993 994 995 996 998".split(
    " "
  )
);
const integerFormatter = new Intl.NumberFormat("fr-FR");

export function formatNumber(
  value: number,
  options?: Intl.NumberFormatOptions
) {
  return (options ? new Intl.NumberFormat("fr-FR", options) : integerFormatter)
    .format(value)
    .replace(/\u202f/g, "\u00a0");
}

/** The argument is in dinars; conversion from stored centimes stays at the caller. */
export function formatDinars(value: number, maximumFractionDigits = 2) {
  return `${formatNumber(value, { maximumFractionDigits })}\u00a0DA`;
}

/** Group the national number by pairs without guessing a country. */
export function formatPhone(value?: string | null) {
  const text = value?.trim() || "";
  if (!text || !/^\+?[\d\s().-]+$/.test(text)) return text;
  const digits = text.replace(/\D/g, "");
  if (!digits) return text;
  const pairs = (number: string) =>
    number.replace(/(\d)(?=(\d{2})+$)/g, "$1\u00a0");
  if (!text.startsWith("+")) return pairs(digits);
  const code = [1, 2, 3]
    .map((length) => digits.slice(0, length))
    .find((prefix) => callingCodes.has(prefix));
  // Keep incomplete or unknown international numbers as entered.
  if (!code || digits.length <= code.length) return text;
  return `+${code}\u00a0${pairs(digits.slice(code.length))}`;
}

/** Correct legacy demo labels for display, without rewriting saved documents. */
export function formatDisplayText(value: string) {
  return value
    .replace(/Brief equipe\b/g, "Brief équipe")
    .replace(/Vaccin trivalent felin\b/g, "Vaccin trivalent félin")
    .replace(
      /Appeler le proprietaire de Simba\b/g,
      "Appeler le propriétaire de Simba"
    );
}
