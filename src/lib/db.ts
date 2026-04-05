import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

import { env } from "@/lib/env";
import { trackedFundSeeds, seedInsights, seedMacroSnapshot } from "@/lib/data/seed-data";

let dbInstance: DatabaseSync | null = null;

function ensureDirectory(filePath: string) {
  const directory = path.dirname(filePath);
  if (!fs.existsSync(directory)) {
    fs.mkdirSync(directory, { recursive: true });
  }
}

function resolveDatabasePath() {
  if (path.isAbsolute(env.DATABASE_PATH)) {
    return env.DATABASE_PATH;
  }

  const baseDir = process.env.INIT_CWD ?? process.cwd();
  return path.resolve(baseDir, env.DATABASE_PATH);
}

export function getDb() {
  if (dbInstance) {
    return dbInstance;
  }

  const databasePath = resolveDatabasePath();
  ensureDirectory(databasePath);
  dbInstance = new DatabaseSync(databasePath);
  dbInstance.exec("PRAGMA journal_mode = WAL");
  initDb(dbInstance);
  return dbInstance;
}

function initDb(db: DatabaseSync) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS funds (
      code TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      company TEXT NOT NULL,
      manager TEXT NOT NULL,
      inception_date TEXT NOT NULL,
      scale REAL,
      theme TEXT NOT NULL,
      tags TEXT NOT NULL,
      style_exposure TEXT NOT NULL,
      risk_level TEXT NOT NULL,
      summary TEXT NOT NULL,
      latest_nav REAL,
      latest_nav_date TEXT,
      updated_at TEXT NOT NULL,
      source TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS fund_nav (
      code TEXT NOT NULL,
      trade_date TEXT NOT NULL,
      nav REAL NOT NULL,
      accumulated_nav REAL,
      daily_return REAL,
      PRIMARY KEY (code, trade_date)
    );

    CREATE TABLE IF NOT EXISTS news_items (
      id TEXT PRIMARY KEY,
      related_code TEXT,
      related_theme TEXT,
      title TEXT NOT NULL,
      summary TEXT NOT NULL,
      source TEXT NOT NULL,
      url TEXT NOT NULL,
      published_at TEXT NOT NULL,
      sentiment TEXT NOT NULL,
      sentiment_score REAL NOT NULL,
      weight REAL NOT NULL,
      content_type TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS macro_snapshots (
      snapshot_date TEXT PRIMARY KEY,
      risk_appetite TEXT NOT NULL,
      policy_bias TEXT NOT NULL,
      inflation_view TEXT NOT NULL,
      style_rotation TEXT NOT NULL,
      important_events TEXT NOT NULL,
      summary TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS fund_scores (
      code TEXT NOT NULL,
      as_of_date TEXT NOT NULL,
      trend_score REAL NOT NULL,
      risk_score REAL NOT NULL,
      theme_score REAL NOT NULL,
      momentum_score REAL NOT NULL,
      drawdown_control_score REAL NOT NULL,
      news_sentiment_score REAL NOT NULL,
      allocation_fit_score REAL NOT NULL,
      total_score REAL NOT NULL,
      decision TEXT NOT NULL,
      reasons TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      PRIMARY KEY (code, as_of_date)
    );

    CREATE TABLE IF NOT EXISTS recommendation_records (
      code TEXT NOT NULL,
      bucket TEXT NOT NULL,
      as_of_date TEXT NOT NULL,
      score REAL NOT NULL,
      reason TEXT NOT NULL,
      PRIMARY KEY (code, bucket, as_of_date)
    );

    CREATE TABLE IF NOT EXISTS update_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_name TEXT NOT NULL,
      status TEXT NOT NULL,
      message TEXT NOT NULL,
      details TEXT,
      started_at TEXT NOT NULL,
      finished_at TEXT
    );

    CREATE TABLE IF NOT EXISTS system_state (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  seedDatabase(db);
}

function seedDatabase(db: DatabaseSync) {
  const hasFunds = db.prepare("SELECT COUNT(*) AS count FROM funds").get() as { count: number };
  if (hasFunds.count === 0) {
    const insertFund = db.prepare(`
      INSERT INTO funds (
        code, name, type, company, manager, inception_date, scale, theme, tags,
        style_exposure, risk_level, summary, latest_nav, latest_nav_date, updated_at, source
      ) VALUES (
        @code, @name, @type, @company, @manager, @inceptionDate, @scale, @theme, @tags,
        @styleExposure, @riskLevel, @summary, NULL, NULL, @updatedAt, 'seed'
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
        updated_at = excluded.updated_at
    `);

    const now = new Date().toISOString();
    for (const fund of trackedFundSeeds) {
      insertFund.run({
        ...fund,
        tags: JSON.stringify(fund.tags),
        updatedAt: now
      });
    }
  }

  const hasMacro = db
    .prepare("SELECT COUNT(*) AS count FROM macro_snapshots")
    .get() as { count: number };
  if (hasMacro.count === 0) {
    db.prepare(`
      INSERT OR REPLACE INTO macro_snapshots (
        snapshot_date, risk_appetite, policy_bias, inflation_view,
        style_rotation, important_events, summary, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      seedMacroSnapshot.snapshotDate,
      seedMacroSnapshot.riskAppetite,
      seedMacroSnapshot.policyBias,
      seedMacroSnapshot.inflationView,
      seedMacroSnapshot.styleRotation,
      JSON.stringify(seedMacroSnapshot.importantEvents),
      seedMacroSnapshot.summary,
      seedMacroSnapshot.updatedAt
    );
  }

  const hasNews = db.prepare("SELECT COUNT(*) AS count FROM news_items").get() as { count: number };
  if (hasNews.count === 0) {
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO news_items (
        id, related_code, related_theme, title, summary, source, url,
        published_at, sentiment, sentiment_score, weight, content_type, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const item of seedInsights) {
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
  }
}
