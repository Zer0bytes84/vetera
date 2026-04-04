
export const formatDZD = (amountInCentimes: number): string => {
  if (amountInCentimes === undefined || amountInCentimes === null) return "0 DA";
  // Convert centimes to units (assuming 1 DA = 100 centimes for calculation storage, 
  // or if you store raw DA as integers, adjust accordingly. 
  // Standard practice: Store 100.50 DA as 10050.
  const amount = amountInCentimes / 100;
  
  return new Intl.NumberFormat('fr-DZ', {
    style: 'currency',
    currency: 'DZD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(amount).replace('DZD', 'DA'); // Replace ISO code with local symbol if needed
};

export const toCentimes = (amount: number): number => {
  return Math.round(amount * 100);
};
