import { cn } from "@/lib/utils/cn";
import type { DecisionLabel, SentimentLabel } from "@/types/domain";

type StatusChipProps = {
  value: DecisionLabel | SentimentLabel | string;
};

function toneOf(value: string) {
  if (["适合买入", "分批买入"].includes(value)) {
    return "zone-buy";
  }

  if (["继续观察", "中性"].includes(value)) {
    return "watch";
  }

  if (["持有", "分批止盈", "利好", "适合继续持有", "适合分批加仓"].includes(value)) {
    return "positive";
  }

  if (["风险偏高", "谨慎卖出", "利空"].includes(value)) {
    return "risk";
  }

  return "neutral";
}

export function StatusChip({ value }: StatusChipProps) {
  return <span className={cn("status-chip", toneOf(value))}>{value}</span>;
}
