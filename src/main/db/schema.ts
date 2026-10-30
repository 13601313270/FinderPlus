/**
 * 数据库 schema 定义。所有建表语句都用 CREATE TABLE IF NOT EXISTS，
 * 保证幂等——新库直接建，已有库跑过也不会报错。
 */

/** 建表语句，按执行顺序排列（有外键依赖） */
export const SCHEMA_SQL = `
PRAGMA foreign_keys = ON;

-- meta：预留的扩展表（目前无用途，保留以备将来做 schema 版本迁移 / 用户偏好）
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

-- 装饰元素（矩形等）：画布布局设计用，不参与节点数据流
CREATE TABLE IF NOT EXISTS decors (
  id          TEXT PRIMARY KEY,
  canvas_id   TEXT NOT NULL REFERENCES canvases(id) ON DELETE CASCADE,
  type        TEXT NOT NULL,
  x           REAL NOT NULL,
  y           REAL NOT NULL,
  width       REAL NOT NULL,
  height      REAL NOT NULL,
  fill        TEXT NOT NULL DEFAULT '',
  stroke      TEXT NOT NULL DEFAULT '',
  stroke_width REAL NOT NULL DEFAULT 1,
  radius      REAL NOT NULL DEFAULT 0,
  title       TEXT NOT NULL DEFAULT '',
  title_color TEXT NOT NULL DEFAULT '#6b7280'
);

CREATE INDEX IF NOT EXISTS idx_decors_canvas ON decors(canvas_id);

-- 节点
CREATE TABLE IF NOT EXISTS nodes (
  id         TEXT PRIMARY KEY,
  canvas_id  TEXT NOT NULL REFERENCES canvases(id) ON DELETE CASCADE,
  type       TEXT NOT NULL,
  pos_x      REAL NOT NULL,
  pos_y      REAL NOT NULL,
  minimized  INTEGER NOT NULL DEFAULT 0,
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
`
