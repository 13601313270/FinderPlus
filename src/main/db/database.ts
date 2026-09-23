import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import initSqlJs, { type Database } from 'sql.js'
import { app } from 'electron'
import { SCHEMA_SQL } from './schema'

/**
 * 数据库单例：负责 sql.js 初始化、磁盘文件读写、schema 建表。
 *
 * 设计要点：
 * - sql.js 是 WASM 实现，纯 JS，不需要原生编译，Electron 主进程直接跑；
 * - 用 app.getPath('userData') 定位数据库文件，跨平台（macOS/Windows/Linux）都对；
 * - 启动时从磁盘读 .db 文件 → 喂给 SQL.Database；关闭前 export 写回；
 * - 所有对外方法都是同步的（sql.js 本身是同步 API），主进程直接用，不用绕 IPC。
 *
 * 目前只建表 + 单例，不做任何业务 CRUD——那是 AutoSaver 的事，后续再聊。
 */

let db: Database | null = null
let dbPath: string | null = null

/** 初始化 sql.js 并打开数据库（从磁盘加载或新建）。幂等，已打开就直接返回 */
export async function openDatabase(): Promise<Database> {
  if (db) return db

  const SQL = await initSqlJs()

  // 数据库文件位置：<userData>/canvasdesk.db
  const userDataDir = app.getPath('userData')
  dbPath = join(userDataDir, 'canvasdesk.db')

  let data: Uint8Array | undefined
  if (existsSync(dbPath)) {
    data = new Uint8Array(readFileSync(dbPath))
  } else {
    // 第一次启动：确保目录存在，sql.js 会自己创建空库
    mkdirSync(dirname(dbPath), { recursive: true })
  }

  db = new SQL.Database(data)

  // 每次打开都跑一遍 schema：CREATE TABLE IF NOT EXISTS 保证幂等，
  // 新库建表、已有库跳过，顺带写入 schema_version
  db.run(SCHEMA_SQL)

  // 立刻落盘，保证刚建的表不会因为意外退出丢
  persist()

  return db
}

/** 把当前数据库状态写回磁盘。调用方确保 db 已打开 */
export function persist(): void {
  if (!db || !dbPath) return
  const data = db.export()
  writeFileSync(dbPath, Buffer.from(data))
}

/** 关闭数据库并落盘。app.quit() 时调用一次就够 */
export function closeDatabase(): void {
  if (!db) return
  persist()
  db.close()
  db = null
  dbPath = null
}

/** 获取当前数据库实例（调用方需先 openDatabase） */
export function getDatabase(): Database {
  if (!db) throw new Error('[db] 数据库尚未打开，先调用 openDatabase()')
  return db
}
