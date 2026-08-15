export function formatCurrency(value: number | string | null | undefined): string {
  if (value === null || value === undefined) return '—';
  const num = typeof value === 'string' ? Number(value) : value;
  if (Number.isNaN(num)) return '—';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(num);
}

export function formatDate(value: Date | string | null | undefined): string {
  if (!value) return '—';
  const date = typeof value === 'string' ? new Date(value) : value;
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
}

export function formatDateTime(value: Date | string | null | undefined): string {
  if (!value) return '—';
  const date = typeof value === 'string' ? new Date(value) : value;
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

type DonorNameFields = {
  organizationName?: string | null;
  firstName?: string | null;
  lastName?: string | null;
};

export function donorDisplayName(donor: DonorNameFields): string {
  if (donor.organizationName) return donor.organizationName;
  const name = [donor.firstName, donor.lastName].filter(Boolean).join(' ');
  return name || 'Unnamed donor';
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  const chars = parts.map((p) => p[0]?.toUpperCase() ?? '').join('');
  return chars || '?';
}

export function toDateInputValue(value: Date | string | null | undefined): string {
  if (!value) return '';
  const date = typeof value === 'string' ? new Date(value) : value;
  return date.toISOString().slice(0, 10);
}
