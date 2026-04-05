import { cn } from "@/lib/utils/cn";
import type { DecisionLabel, SentimentLabel } from "@/types/domain";

type StatusChipProps = {
  value: DecisionLabel | SentimentLabel | string;
};

function toneOf(value: string) {
  if (["适合买入", "分批买入", "持有", "利好"].includes(value)) {
    return "buy";
  }

  if (["继续观察", "中性"].includes(value)) {
    return "watch";
  }

  return "sell";
}

export function StatusChip({ value }: StatusChipProps) {
  return <span className={cn("status-chip", toneOf(value))}>{value}</span>;
}
