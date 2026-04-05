import { startScheduler } from "@/lib/services/scheduler";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    startScheduler();
  }
}
