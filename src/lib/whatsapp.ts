/**
 * WhatsApp without any API: a wa.me deep link that opens the clinic's own WhatsApp (the desktop app when installed,
 * otherwise WhatsApp Web) on the owner's number with a message already written. Nothing is sent from here: the person
 * reads the message in WhatsApp, may change it, and presses Send there.
 */

/** The number as wa.me wants it, digits only; `international` is false when no country code was written. */
export interface WhatsAppNumber {
  digits: string;
  international: boolean;
}

// The characters people type in a phone field: digits, spaces (also the non-breaking ones the display adds), dots,
// dashes, slashes, brackets, and a « + » in front.
const PHONE_TEXT = /^\+?[\d\s\u00a0\u202f().\-/]+$/;

/**
 * Reads a stored phone number for wa.me, or null when it cannot make a link (empty, words in it, too short or too long
 * for a phone number). A « + » or a leading « 00 » (the international call prefix) means the country code is written
 * and is kept; any other number is passed as its digits, untouched: no country code is ever guessed.
 */
export function whatsAppNumber(phone?: string | null): WhatsAppNumber | null {
  const text = phone?.trim() ?? "";
  if (!PHONE_TEXT.test(text)) {
    return null;
  }
  const all = text.replace(/\D/g, "");
  const plus = text.startsWith("+");
  const doubleZero = !plus && all.startsWith("00");
  const digits = doubleZero ? all.slice(2) : all;
  // The app accepts 8 to 15 digits when an owner is saved; E.164 numbers have at most 15.
  if (digits.length < 8 || digits.length > 15) {
    return null;
  }
  return { digits, international: plus || doubleZero };
}

/** The wa.me link with its message encoded (accents, spaces, line breaks), or null when the number is not usable. */
export function whatsAppLink(
  phone: string | null | undefined,
  message: string
): string | null {
  const number = whatsAppNumber(phone);
  if (!number) {
    return null;
  }
  const text = message.trim();
  return `https://wa.me/${number.digits}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
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
