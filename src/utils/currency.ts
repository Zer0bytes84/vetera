import { formatDinars } from "./display-format";

export const formatDZD = (amountInCentimes: number): string => {
  if (amountInCentimes === undefined || amountInCentimes === null) {
    return formatDinars(0);
  }
  // Repository amounts are stored as integer centimes.
  const amount = amountInCentimes / 100;

  return formatDinars(amount);
};

export const toCentimes = (amount: number): number => Math.round(amount * 100);
