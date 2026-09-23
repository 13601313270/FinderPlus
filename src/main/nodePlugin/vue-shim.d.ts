/**
 * 让主进程 tsconfig（tsc）能通过「import render from './render.vue'」。
 * 真正的 SFC 类型检查由 vue-tsc（tsconfig.web.json）负责，这里只给 tsc 一个可解析的兜底。
 */
declare module '*.vue' {
  import type { Component } from 'vue'
  const component: Component
  export default component
}