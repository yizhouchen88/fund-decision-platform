import cron from "node-cron";

import { env } from "@/lib/env";
import { refreshAllData } from "@/lib/services/update-service";
import { log } from "@/lib/utils/logger";

let started = false;

export function startScheduler() {
  if (started || !env.ENABLE_INTERNAL_CRON) {
    return;
  }

  started = true;
  cron.schedule(env.CRON_EXPRESSION, async () => {
    try {
      await refreshAllData({ force: true });
      log("info", "scheduler", "定时刷新成功");
    } catch (error) {
      log("error", "scheduler", "定时刷新失败", error);
    }
  });
}
