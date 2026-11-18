/**
 * WhatsApp without any API and without the web: a whatsapp:// link, handed to the system, opens the WhatsApp application
 * installed on this computer on the owner's number with a message already written. The number and the message never go
 * through WhatsApp's site. Nothing is sent from here: the person reads the message in WhatsApp, may change it, and
 * presses Send there. When WhatsApp is not installed, the link leads nowhere: there is deliberately no fallback to wa.me.
 */

/**
 * The clinic's setting « Indicatif pour WhatsApp », shown in Paramètres > Mon cabinet. Only Algeria (+213) is decided for
 * now: it is added to national numbers (those that begin with a single 0), never to a number that already carries one.
 */
export const WHATSAPP_COUNTRY_CODE = "213";

/**
 * The number as WhatsApp wants it, digits only. `countryCode` says where its country code comes from: `written` in the
 * owner's record (« + » or « 00 »), added from the `clinic` setting to a national number, or `none` (digits as entered).
 */
export interface WhatsAppNumber {
  countryCode: "clinic" | "none" | "written";
  digits: string;
}

// The characters people type in a phone field: digits, spaces (also the non-breaking ones the display adds), dots,
// dashes, slashes, brackets, and a « + » in front.
const PHONE_TEXT = /^\+?[\d\s\u00a0\u202f().\-/]+$/;

/**
 * Reads a stored phone number for WhatsApp, or null when it cannot make a link (empty, words in it, too short or too long
 * for a phone number). A « + » or a leading « 00 » (the international call prefix) means the country code is written
 * and is kept. A national number, beginning with a single 0, loses that 0 and takes the clinic's country code. Any other
 * number is passed as its digits, untouched: no country code is ever guessed.
 */
export function whatsAppNumber(phone?: string | null): WhatsAppNumber | null {
  const text = phone?.trim() ?? "";
  if (!PHONE_TEXT.test(text)) {
    return null;
  }
  const all = text.replace(/\D/g, "");
  const plus = text.startsWith("+");
  const doubleZero = !plus && all.startsWith("00");
  const entered = doubleZero ? all.slice(2) : all;
  // The app accepts 8 to 15 digits when an owner is saved; E.164 numbers have at most 15.
  if (entered.length < 8 || entered.length > 15) {
    return null;
  }
  if (plus || doubleZero) {
    return { countryCode: "written", digits: entered };
  }
  if (entered.startsWith("0")) {
    const digits = `${WHATSAPP_COUNTRY_CODE}${entered.slice(1)}`;
    return digits.length > 15 ? null : { countryCode: "clinic", digits };
  }
  return { countryCode: "none", digits: entered };
}

/**
 * The only shape of WhatsApp link the app opens: the send screen, a number of 8 to 15 digits and, optionally, a text
 * encoded by encodeURIComponent (letters, digits, - _ . ! ~ * ' ( ) and %XX), nothing else. The desktop app's shell
 * plugin accepts the same shape (src-tauri/tauri.conf.json, plugins.shell.open).
 */
export const WHATSAPP_APP_LINK =
  /^whatsapp:\/\/send\?phone=[0-9]{8,15}(&text=[A-Za-z0-9%._~!*'()-]*)?$/;

/** The whatsapp:// link with its message encoded (accents, spaces, line breaks), or null when the number is not usable. */
export function whatsAppLink(
  phone: string | null | undefined,
  message: string
): string | null {
  const number = whatsAppNumber(phone);
  if (!number) {
    return null;
  }
  const text = message.trim();
  return `whatsapp://send?phone=${number.digits}${text ? `&text=${encodeURIComponent(text)}` : ""}`;
}

/** From the patient's record: a plain first contact about the animal. */
export function contactMessage(animal: string): string {
  return `Bonjour,\n\nNous vous écrivons au sujet de ${animal.trim()}.`;
}

const FIRST_OF_MONTH = /^1 /;
const longDate = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

/**
 * From a reminder: the animal, what is due and the due date. A reminder carries a due date, not an appointment; a date
 * already past is told in the past.
 */
export function reminderMessage({
  animal,
  dueDate,
  reminder,
  today,
}: {
  animal: string;
  /** YYYY-MM-DD, as reminders store it. */
  dueDate: string;
  reminder: string;
  /** YYYY-MM-DD, the clinic's local day. */
  today: string;
}): string {
  // « 1er décembre », as French writes the first of the month.
  const date = longDate
    .format(new Date(`${dueDate}T12:00:00`))
    .replace(FIRST_OF_MONTH, "1er ");
  const verb = dueDate < today ? "était prévu" : "est prévu";
  return `Bonjour,\n\nLe rappel «\u00a0${reminder.trim()}\u00a0» de ${animal.trim()} ${verb} le ${date}.\nSouhaitez-vous prendre rendez-vous\u00a0?`;
}
