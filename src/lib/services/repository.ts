import { getDb } from "@/lib/db";
import type {
  FundBucket,
  FundOverview,
  MacroSnapshot,
  NavPoint,
  NewsItem,
  ScoreBreakdown
} from "@/types/domain";

function parseFundRow(row: Record<string, unknown>): FundOverview {
  return {
    code: String(row.code),
    name: String(row.name),
    type: String(row.type),
    company: String(row.company),
    manager: String(row.manager),
    inceptionDate: String(row.inception_date),
    scale: row.scale ? Number(row.scale) : undefined,
    theme: String(row.theme),
    tags: JSON.parse(String(row.tags)),
    styleExposure: String(row.style_exposure),
    riskLevel: row.risk_level as FundOverview["riskLevel"],
    summary: String(row.summary),
    latestNav: row.latest_nav ? Number(row.latest_nav) : undefined,
    latestNavDate: row.latest_nav_date ? String(row.latest_nav_date) : undefined,
    updatedAt: String(row.updated_at),
    source: String(row.source)
  };
}

export function upsertFund(overview: FundOverview) {
  const db = getDb();
  db.prepare(`
    INSERT INTO funds (
      code, name, type, company, manager, inception_date, scale, theme, tags,
      style_exposure, risk_level, summary, latest_nav, latest_nav_date, updated_at, source
    ) VALUES (
      @code, @name, @type, @company, @manager, @inceptionDate, @scale, @theme, @tags,
      @styleExposure, @riskLevel, @summary, @latestNav, @latestNavDate, @updatedAt, @source
    )
    ON CONFLICT(code) DO UPDATE SET
      name = excluded.name,
      type = excluded.type,
      company = excluded.company,
      manager = excluded.manager,
      inception_date = excluded.inception_date,
      scale = excluded.scale,
      theme = excluded.theme,
      tags = excluded.tags,
      style_exposure = excluded.style_exposure,
      risk_level = excluded.risk_level,
      summary = excluded.summary,
      latest_nav = excluded.latest_nav,
      latest_nav_date = excluded.latest_nav_date,
      updated_at = excluded.updated_at,
      source = excluded.source
  `).run({
    ...overview,
    tags: JSON.stringify(overview.tags)
  });
}

export function replaceNavSeries(code: string, navSeries: NavPoint[]) {
  const db = getDb();
  const deleteStmt = db.prepare("DELETE FROM fund_nav WHERE code = ?");
  const insertStmt = db.prepare(`
    INSERT INTO fund_nav (code, trade_date, nav, accumulated_nav, daily_return)
    VALUES (?, ?, ?, ?, ?)
  `);

  db.exec("BEGIN");
  try {
    deleteStmt.run(code);
    for (const point of navSeries) {
      insertStmt.run(
        code,
        point.date,
        point.nav,
        point.accumulatedNav ?? null,
        point.dailyReturn ?? null
      );
    }
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

export function getFundOverview(code: string): FundOverview | null {
  const db = getDb();
  const row = db.prepare("SELECT * FROM funds WHERE code = ?").get(code) as
    | Record<string, unknown>
    | undefined;
  return row ? parseFundRow(row) : null;
}

export function getAllFundOverviews(): FundOverview[] {
  const db = getDb();
  const rows = db
    .prepare("SELECT * FROM funds ORDER BY updated_at DESC, code ASC")
    .all() as Record<string, unknown>[];
  return rows.map(parseFundRow);
}

export function searchFundsLocal(query: string): FundOverview[] {
  const db = getDb();
  const likeQuery = `%${query.trim()}%`;
  const rows = db
    .prepare(
      `
        SELECT * FROM funds
        WHERE code LIKE ? OR name LIKE ? OR theme LIKE ? OR tags LIKE ?
        ORDER BY
          CASE WHEN code = ? THEN 0 ELSE 1 END,
          updated_at DESC
        LIMIT 20
      `
    )
    .all(likeQuery, likeQuery, likeQuery, likeQuery, query.trim()) as Record<string, unknown>[];

  return rows.map(parseFundRow);
}

export function getNavSeries(code: string): NavPoint[] {
  const db = getDb();
  const rows = db
    .prepare(
      "SELECT code, trade_date, nav, accumulated_nav, daily_return FROM fund_nav WHERE code = ? ORDER BY trade_date ASC"
    )
    .all(code) as Array<Record<string, unknown>>;

  return rows.map((row) => ({
    code: String(row.code),
    date: String(row.trade_date),
    nav: Number(row.nav),
    accumulatedNav: row.accumulated_nav ? Number(row.accumulated_nav) : undefined,
    dailyReturn: row.daily_return === null ? undefined : Number(row.daily_return)
  }));
}

export function upsertNewsItems(items: NewsItem[]) {
  if (items.length === 0) {
    return;
  }

  const db = getDb();
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO news_items (
      id, related_code, related_theme, title, summary, source, url, published_at,
      sentiment, sentiment_score, weight, content_type, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  db.exec("BEGIN");
  try {
    for (const item of items) {
      stmt.run(
        item.id,
        item.relatedCode ?? null,
        item.relatedTheme ?? null,
        item.title,
        item.summary,
        item.source,
        item.url,
        item.publishedAt,
        item.sentiment,
        item.sentimentScore,
        item.weight,
        item.contentType,
        new Date().toISOString()
      );
    }
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

export function getInsights(options: {
  code?: string;
  theme?: string;
  contentType?: "news" | "opinion";
  limit?: number;
}) {
  const db = getDb();
  const limit = options.limit ?? 8;
  const conditions = ["1 = 1"];
  const params: unknown[] = [];

  if (options.code) {
    conditions.push("related_code = ?");
    params.push(options.code);
  }

  if (options.theme) {
    conditions.push("related_theme = ?");
    params.push(options.theme);
  }

  if (options.contentType) {
    conditions.push("content_type = ?");
    params.push(options.contentType);
  }

  params.push(limit);

  const rows = db
    .prepare(
      `
        SELECT * FROM news_items
        WHERE ${conditions.join(" AND ")}
        ORDER BY published_at DESC
        LIMIT ?
      `
    )
    .all(...(params as Array<string | number | null>)) as Array<Record<string, unknown>>;

  return rows.map((row) => ({
    id: String(row.id),
    relatedCode: row.related_code ? String(row.related_code) : undefined,
    relatedTheme: row.related_theme ? String(row.related_theme) : undefined,
    title: String(row.title),
    summary: String(row.summary),
    source: String(row.source),
    url: String(row.url),
    publishedAt: String(row.published_at),
    sentiment: row.sentiment as NewsItem["sentiment"],
    sentimentScore: Number(row.sentiment_score),
    weight: Number(row.weight),
    contentType: row.content_type as NewsItem["contentType"]
  }));
}

export function upsertMacroSnapshot(snapshot: MacroSnapshot) {
  const db = getDb();
  db.prepare(`
    INSERT OR REPLACE INTO macro_snapshots (
      snapshot_date, risk_appetite, policy_bias, inflation_view,
      style_rotation, important_events, summary, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    snapshot.snapshotDate,
    snapshot.riskAppetite,
    snapshot.policyBias,
    snapshot.inflationView,
    snapshot.styleRotation,
    JSON.stringify(snapshot.importantEvents),
    snapshot.summary,
    snapshot.updatedAt
  );
}

export function getLatestMacroSnapshot(): MacroSnapshot {
  const db = getDb();
  const row = db
    .prepare("SELECT * FROM macro_snapshots ORDER BY snapshot_date DESC LIMIT 1")
    .get() as Record<string, unknown>;

  return {
    snapshotDate: String(row.snapshot_date),
    riskAppetite: String(row.risk_appetite),
    policyBias: String(row.policy_bias),
    inflationView: String(row.inflation_view),
    styleRotation: String(row.style_rotation),
    importantEvents: JSON.parse(String(row.important_events)),
    summary: String(row.summary),
    updatedAt: String(row.updated_at)
  };
}

export function saveFundScore(options: {
  code: string;
  asOfDate: string;
  score: ScoreBreakdown;
  decision: string;
  reasons: string[];
}) {
  const db = getDb();
  db.prepare(`
    INSERT OR REPLACE INTO fund_scores (
      code, as_of_date, trend_score, risk_score, theme_score, momentum_score,
      drawdown_control_score, news_sentiment_score, allocation_fit_score,
      total_score, decision, reasons, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    options.code,
    options.asOfDate,
    options.score.trendScore,
    options.score.riskScore,
    options.score.themeScore,
    options.score.momentumScore,
    options.score.drawdownControlScore,
    options.score.newsSentimentScore,
    options.score.allocationFitScore,
    options.score.totalScore,
    options.decision,
    JSON.stringify(options.reasons),
    new Date().toISOString()
  );
}

export function getLatestFundScore(code: string) {
  const db = getDb();
  return db
    .prepare("SELECT * FROM fund_scores WHERE code = ? ORDER BY as_of_date DESC LIMIT 1")
    .get(code) as
    | {
        code: string;
        as_of_date: string;
        trend_score: number;
        risk_score: number;
        theme_score: number;
        momentum_score: number;
        drawdown_control_score: number;
        news_sentiment_score: number;
        allocation_fit_score: number;
        total_score: number;
        decision: string;
        reasons: string;
      }
    | undefined;
}

export function replaceRecommendations(asOfDate: string, items: Array<{
  bucket: FundBucket;
  code: string;
  score: number;
  reason: string;
}>) {
  const db = getDb();
  const deleteStmt = db.prepare("DELETE FROM recommendation_records WHERE as_of_date = ?");
  const insertStmt = db.prepare(`
    INSERT INTO recommendation_records (code, bucket, as_of_date, score, reason)
    VALUES (?, ?, ?, ?, ?)
  `);

  db.exec("BEGIN");
  try {
    deleteStmt.run(asOfDate);
    for (const item of items) {
      insertStmt.run(item.code, item.bucket, asOfDate, item.score, item.reason);
    }
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

export function getLatestRecommendations() {
  const db = getDb();
  const latest = db
    .prepare("SELECT MAX(as_of_date) AS as_of_date FROM recommendation_records")
    .get() as { as_of_date: string | null };

  if (!latest.as_of_date) {
    return [];
  }

  return db
    .prepare("SELECT * FROM recommendation_records WHERE as_of_date = ? ORDER BY score DESC")
    .all(latest.as_of_date) as Array<{
    code: string;
    bucket: FundBucket;
    as_of_date: string;
    score: number;
    reason: string;
  }>;
}

export function writeSystemState(key: string, value: string) {
  const db = getDb();
  db.prepare(`
    INSERT OR REPLACE INTO system_state (key, value, updated_at)
    VALUES (?, ?, ?)
  `).run(key, value, new Date().toISOString());
}

export function getSystemState(key: string) {
  const db = getDb();
  const row = db
    .prepare("SELECT value, updated_at FROM system_state WHERE key = ?")
    .get(key) as { value: string; updated_at: string } | undefined;
  return row ?? null;
}

export function appendUpdateLog(options: {
  taskName: string;
  status: "started" | "success" | "failed";
  message: string;
  details?: string;
}) {
  const db = getDb();
  db.prepare(`
    INSERT INTO update_logs (task_name, status, message, details, started_at, finished_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    options.taskName,
    options.status,
    options.message,
    options.details ?? null,
    new Date().toISOString(),
    options.status === "started" ? null : new Date().toISOString()
  );
}
