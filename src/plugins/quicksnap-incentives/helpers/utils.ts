export function shortenAddress(str = '') {
  return `${str.slice(0, 6)}...${str.slice(str.length - 4)}`;
}

export function shorten(str: string, key?: any): string {
  if (!str) return str;
  let limit;
  if (typeof key === 'number') limit = key;
  if (key === 'symbol') limit = 6;
  if (key === 'name') limit = 64;
  if (key === 'choice') limit = 12;
  if (limit)
    return str.length > limit ? `${str.slice(0, limit).trim()}...` : str;
  return shortenAddress(str);
}

export function commify(number: any, decimals?: number | undefined) {
  if (!decimals) {
    const parts = String(number).split('.');
    const wholePart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    const decimalPart = parts[1] ? `.${parts[1]}` : '';
    return `${wholePart}${decimalPart}`;
  } else {
    return number
      .toFixed(decimals)
      .toString()
      .replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }
}

export function getDecimals(amount) {
  if (amount % 1 != 0) return amount.toString().split('.')[1].length;
  return 0;
}

export function addIncentiveFee(amount) {
  const decimals = getDecimals(amount);

  let totalAmount = (amount / 95) * 100;

  if (getDecimals(totalAmount) > decimals) {
    totalAmount = parseFloat(totalAmount.toFixed(decimals + 1));
  }

  return totalAmount;
}
