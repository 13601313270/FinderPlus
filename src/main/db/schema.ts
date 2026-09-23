/**
 * 数据库 schema 定义。所有建表语句都用 CREATE TABLE IF NOT EXISTS，
 * 保证幂等——新库直接建，已有库跑过也不会报错。
 */

/** 当前数据库 schema 版本。迁移时先比对这个值，决定要不要跑升级脚本 */
export const SCHEMA_VERSION = 1

/** 建表语句，按执行顺序排列（有外键依赖） */
export const SCHEMA_SQL = `
PRAGMA foreign_keys = ON;

-- schema_version：单列表，存当前 schema 版本号。启动时读它决定要不要迁移
CREATE TABLE IF NOT EXISTS meta (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- 画布：预留多画布能力，目前只有一张默认画布
CREATE TABLE IF NOT EXISTS canvases (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL DEFAULT '未命名',
  viewport_x    REAL NOT NULL DEFAULT 0,
  viewport_y    REAL NOT NULL DEFAULT 0,
  viewport_scale REAL NOT NULL DEFAULT 1,
  updated_at    INTEGER NOT NULL
);

-- 节点
CREATE TABLE IF NOT EXISTS nodes (
  id         TEXT PRIMARY KEY,
  canvas_id  TEXT NOT NULL REFERENCES canvases(id) ON DELETE CASCADE,
  type       TEXT NOT NULL,
  pos_x      REAL NOT NULL,
  pos_y      REAL NOT NULL,
  params     TEXT NOT NULL DEFAULT '{}',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_nodes_canvas ON nodes(canvas_id);

-- 边
CREATE TABLE IF NOT EXISTS edges (
  id              TEXT PRIMARY KEY,
  canvas_id       TEXT NOT NULL REFERENCES canvases(id) ON DELETE CASCADE,
  start_node_id   TEXT NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
  start_port_id   TEXT NOT NULL,
  end_node_id     TEXT NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
  end_port_id     TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_edges_canvas ON edges(canvas_id);

-- 写入 schema 版本（REPLACE 保证幂等）
INSERT OR REPLACE INTO meta (key, value) VALUES ('schema_version', '${SCHEMA_VERSION}');
`
