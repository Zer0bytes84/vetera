// Regular expressions shared by several modules. None has the g or y flag: they keep no lastIndex state between calls.

/** A run of whitespace, the usual word separator. */
export const WHITESPACE_RUN = /\s+/;
/** A single whitespace character. */
export const WHITESPACE = /\s/;
/** A whole ISO calendar day, YYYY-MM-DD. */
export const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
/** The ISO calendar day at the start of a value, year, month and day captured. */
export const ISO_DATE_PREFIX = /^(\d{4})-(\d{2})-(\d{2})/;
/** A 24-hour time, HH:MM. */
export const TIME_HH_MM = /^([01]\d|2[0-3]):[0-5]\d$/;
