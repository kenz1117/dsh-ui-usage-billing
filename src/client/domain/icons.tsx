/**
 * v1.5 Tab 内联 SVG 图标（14×14，无外部依赖；用 stroke="currentColor" 复用单 CSS 规则）。
 * 抽到独立文件让 UsageBilling.tsx 体积下降；每个图标是 React.ReactNode，可被
 * `<span aria-hidden>{icon}</span>` 包装嵌入。
 */

import type { ReactNode } from 'react'
import type { DashboardTab } from './types.ts'

const COMMON_PROPS = {
  fill: 'none',
  'aria-hidden': true,
  stroke: 'currentColor',
  strokeWidth: 1.5,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
}

export const TAB_ICONS: Record<DashboardTab, ReactNode> = {
  overview: (
    <svg viewBox="0 0 16 16" {...COMMON_PROPS}>
      <path d="M2 13V3M2 13H14M4 10l4-3 2 2 4-5" />
    </svg>
  ),
  queue: (
    <svg viewBox="0 0 16 16" {...COMMON_PROPS}>
      <path d="M3 4h10M3 8h10M3 12h6" />
      <path d="M12 10v4m-2-2h4" />
    </svg>
  ),
  agents: (
    <svg viewBox="0 0 16 16" {...COMMON_PROPS}>
      <circle cx="8" cy="3.5" r="2" />
      <circle cx="3.5" cy="12.5" r="2" />
      <circle cx="12.5" cy="12.5" r="2" />
      <path d="M8 5.5v2.5M6.5 10.5L5 11.5M9.5 10.5L11 11.5" />
    </svg>
  ),
  providers: (
    <svg viewBox="0 0 16 16" {...COMMON_PROPS}>
      <rect x="2" y="3" width="12" height="10" rx="1.5" />
      <path d="M5 7l2 2 4-4" />
    </svg>
  ),
  token: (
    <svg viewBox="0 0 16 16" {...COMMON_PROPS}>
      <circle cx="6" cy="6" r="3" />
      <circle cx="11" cy="11" r="3" />
    </svg>
  ),
  trends: (
    <svg viewBox="0 0 16 16" {...COMMON_PROPS}>
      <path d="M2 4l4 4 3-3 5 5M11 10h3V7" />
    </svg>
  ),
  pricing: (
    <svg viewBox="0 0 16 16" {...COMMON_PROPS}>
      <path d="M8 2l6 3v6l-6 3-6-3V5z" />
      <path d="M8 2v12M2 5h12" />
    </svg>
  ),
  settings: (
    <svg viewBox="0 0 16 16" {...COMMON_PROPS}>
      <circle cx="8" cy="8" r="2.5" />
      <path d="M8 1.5v2M8 12.5v2M1.5 8h2M12.5 8h2" />
    </svg>
  ),
}
