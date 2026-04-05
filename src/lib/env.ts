import { z } from "zod";

const envSchema = z.object({
  APP_URL: z.string().default("http://localhost:3000"),
  DATABASE_PATH: z.string().default("./data/fund-platform.db"),
  ADMIN_REFRESH_SECRET: z.string().default("change-me"),
  DEFAULT_RISK_FREE_RATE: z.coerce.number().default(0.02),
  ENABLE_INTERNAL_CRON: z
    .union([z.literal("true"), z.literal("false")])
    .default("false")
    .transform((value) => value === "true"),
  CRON_EXPRESSION: z.string().default("0 */6 * * *"),
  TRACKED_FUNDS: z
    .string()
    .default(
      "161725,110022,012348,000452,260108,163402,513100,005911,008888,017133"
    )
});

const parsed = envSchema.parse({
  APP_URL: process.env.APP_URL,
  DATABASE_PATH: process.env.DATABASE_PATH,
  ADMIN_REFRESH_SECRET: process.env.ADMIN_REFRESH_SECRET,
  DEFAULT_RISK_FREE_RATE: process.env.DEFAULT_RISK_FREE_RATE,
  ENABLE_INTERNAL_CRON: process.env.ENABLE_INTERNAL_CRON,
  CRON_EXPRESSION: process.env.CRON_EXPRESSION,
  TRACKED_FUNDS: process.env.TRACKED_FUNDS
});

export const env = {
  ...parsed,
  trackedFunds: parsed.TRACKED_FUNDS.split(",")
    .map((code) => code.trim())
    .filter(Boolean)
};
