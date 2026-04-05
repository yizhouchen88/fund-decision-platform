export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function average(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function std(values: number[]): number {
  if (values.length < 2) {
    return 0;
  }

  const mean = average(values);
  const variance =
    values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / (values.length - 1);

  return Math.sqrt(variance);
}

export function round(value: number, digits = 4): number {
  return Number(value.toFixed(digits));
}
