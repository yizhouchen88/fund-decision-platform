export function formatPercent(value: number | null | undefined, digits = 2): string {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "--";
  }

  return `${(value * 100).toFixed(digits)}%`;
}

export function formatNumber(value: number | null | undefined, digits = 2): string {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "--";
  }

  return value.toFixed(digits);
}

export function formatLargeNumber(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "--";
  }

  if (value >= 100000000) {
    return `${(value / 100000000).toFixed(2)}亿`;
  }

  if (value >= 10000) {
    return `${(value / 10000).toFixed(2)}万`;
  }

  return value.toFixed(2);
}

export function formatDate(date: string | Date | undefined): string {
  if (!date) {
    return "--";
  }

  const value = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(value.getTime())) {
    return "--";
  }

  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(value);
}
