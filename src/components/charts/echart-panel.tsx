"use client";

import { useEffect, useRef, useState } from "react";
import * as echarts from "echarts";

type EChartPanelProps = {
  option: echarts.EChartsOption;
  height?: number;
  emptyMessage?: string;
};

function hasSeries(option: echarts.EChartsOption) {
  const series = Array.isArray(option.series) ? option.series : option.series ? [option.series] : [];
  return series.some((item) => {
    if (!item || typeof item !== "object" || !("data" in item)) {
      return false;
    }

    const data = item.data;
    return Array.isArray(data) && data.some((point) => point !== null && point !== undefined);
  });
}

export function EChartPanel({
  option,
  height = 320,
  emptyMessage = "暂无可用图表数据"
}: EChartPanelProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [renderError, setRenderError] = useState(false);

  useEffect(() => {
    if (!ref.current || !hasSeries(option)) {
      return;
    }

    const chart = echarts.init(ref.current, undefined, { renderer: "canvas" });

    try {
      setRenderError(false);
      chart.setOption(option);
    } catch {
      setRenderError(true);
      chart.clear();
    }

    const onResize = () => chart.resize();
    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("resize", onResize);
      chart.dispose();
    };
  }, [option]);

  if (!hasSeries(option)) {
    return <div className="empty-state chart-box">{emptyMessage}</div>;
  }

  if (renderError) {
    return <div className="empty-state chart-box">图表加载失败，系统已跳过异常数据，请稍后重试。</div>;
  }

  return <div className="chart-box" ref={ref} style={{ height }} />;
}
