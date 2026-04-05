"use client";

import { useEffect, useRef } from "react";
import * as echarts from "echarts";

type EChartPanelProps = {
  option: echarts.EChartsOption;
  height?: number;
};

export function EChartPanel({ option, height = 320 }: EChartPanelProps) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!ref.current) {
      return;
    }

    const chart = echarts.init(ref.current, undefined, { renderer: "canvas" });
    chart.setOption(option);

    const onResize = () => chart.resize();
    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("resize", onResize);
      chart.dispose();
    };
  }, [option]);

  return <div className="chart-box" ref={ref} style={{ height }} />;
}
