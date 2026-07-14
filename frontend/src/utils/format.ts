export function formatSymbol(symbol: string): string {
  const clean = symbol.replace('/', '');
  if (clean.length === 6) return `${clean.slice(0, 3)}/${clean.slice(3)}`;
  if (clean.startsWith('XAU')) return 'XAU/USD';
  return symbol;
}

export function formatPrice(price: number, symbol?: string): string {
  const s = symbol?.replace('/', '') ?? '';
  if (s.includes('JPY')) return price.toFixed(3);
  if (s.startsWith('US') && s.length <= 5) return price.toFixed(2);
  if (s.startsWith('XAU')) return price.toFixed(2);
  return price.toFixed(5);
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
