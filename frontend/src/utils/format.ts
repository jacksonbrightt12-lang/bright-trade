export function formatSymbol(symbol: string): string {
  const clean = symbol.replace('/', '');
  if (clean.length === 6) return `${clean.slice(0, 3)}/${clean.slice(3)}`;
  if (clean.startsWith('XAU')) return 'XAU/USD';
  return symbol;
}

export function getPriceDecimals(symbol?: string): number {
  const s = symbol?.replace('/', '') ?? '';
  if (s.includes('JPY')) return 3;
  if (s.startsWith('US') && s.length <= 5) return 2;
  if (s.startsWith('XAU')) return 2;
  return 5;
}

export function formatPrice(price: number, symbol?: string): string {
  return price.toFixed(getPriceDecimals(symbol));
}

export function formatCurrency(amount: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
}

export function formatChange(change: string | number): string {
  const num = typeof change === 'string' ? parseFloat(change) : change;
  const sign = num >= 0 ? '+' : '';
  return `${sign}${num.toFixed(2)}%`;
}

export function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function formatDateTime(date: string): string {
  return new Date(date).toLocaleString('en-US', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}
