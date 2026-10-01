const dinarFormatter = new Intl.NumberFormat("fr-DZ", {
  style: "currency",
  currency: "DZD",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

export const formatDZD = (amountInCentimes: number): string => {
  if (amountInCentimes === undefined || amountInCentimes === null) {
    return "0 DA";
  }
  // Repository amounts are stored as integer centimes.
  const amount = amountInCentimes / 100;

  return dinarFormatter
    .format(amount)
    .replace("DZD", "DA"); // Replace ISO code with local symbol if needed
};

export const toCentimes = (amount: number): number => Math.round(amount * 100);
