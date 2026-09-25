/** Client-side formatting helpers only; licence validation happens on the server. */
export function formatLicenseKey(key: string): string {
  const clean = key.toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (![16, 20].includes(clean.length)) {
    return key;
  }

  return clean.match(/.{1,4}/g)!.join("-");
}

export function looksLikeLicenseKey(value: string): boolean {
  return [16, 20].includes(value.replace(/[^A-Z0-9]/gi, "").length);
}
