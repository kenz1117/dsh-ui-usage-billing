/**
 * 内置价格目录与别名表的纯数据模块：只随 node 半构建发布（宿主聚合计价使用），
 * 并经 /api/billing/pricing 下发给客户端注入——client bundle 不携带这份数据
 * （瘦身：lib/client.js 约 -30 KiB）。条目结构与消费逻辑见 ./client/pricing.ts。
 */
import type { ModelEntry } from './client/pricing.ts'

/**
 * Built-in catalog of current mainstream models as of 2026-09-29, priced from
 * each provider's official price page. Domestic providers are OpenAI-API
 * compatible and publish RMB prices directly; overseas providers publish USD
 * and convert through the exchange rate at estimate time. Retired models
 * (GPT-4o family, Gemini 2.x, GLM-4.x-lite, older Qwen) are deliberately
 * absent. DeepSeek keys match the harness stats file so real usage prices
 * from the catalog; unknown keys fall back to `other`.
 *
 * Time-of-day billing (peak/off-peak) is now real: DeepSeek V4 officially
 * splits peak (09:00-12:00 / 14:00-18:00 Beijing) at 2x the off-peak rate
 * from 2026-08-17, and Gemini's Flex tier discounts spare-capacity traffic.
 */
/** DeepSeek 官方高峰时段说明（峰谷分时计费目录条目共用）。 */
const DEEPSEEK_PEAK_HOURS = '09:00-12:00 / 14:00-18:00'
const GEMINI_PEAK_HOURS = 'Standard / Flex'

export const BUILTIN_MODEL_CATALOG: readonly ModelEntry[] = [
  // DeepSeek — V4 peak/off-peak rates (cloud.tencent.com TokenHub 2026-08-14),
  // RMB per 1M tokens: peak / off-peak (50%).
  {
    key: 'flash',
    name: 'DeepSeek V4.1 Flash',
    provider: 'DeepSeek',
    colorVar: 'ds-blue',
    // 2026-09-10 12:00（北京）起官方调价：谷 1.5/0.05/4.5 → 1/0.02/4（峰 = 谷 × 2）。
    // 此处写现行价；分界前的历史事件由 computeCostAt 按 FLASH_REPRICE_MS 回算旧价。
    // 型号名对齐官方价目页现行版本：旧 V4 Flash / Vision (Exp) 已下线，flash 流量
    // 全部由 DeepSeek-V4.1-Flash 服务（价目页新规范名 deepseek-flash，图像理解并入）。
    price: {
      currency: 'CNY',
      input: 2,
      cacheHit: 0.04,
      output: 8,
      offPeak: { input: 1, cacheHit: 0.02, output: 4 },
    },
    peakHours: DEEPSEEK_PEAK_HOURS,
  },
  {
    key: 'flash-vision-exp',
    name: 'DeepSeek V4 Flash Vision (Exp)',
    provider: 'DeepSeek',
    colorVar: 'ds-blue',
    // 官方已下线（价目页注释：旧名仍可调用，请求由 V4.1 Flash 服务并按 Flash
    // 价计）；与 flash 同价、同步调价（2026-09-10 12:00 起），历史回算同
    // FLASH_REPRICE_MS。retired = 不进费率表面板，目录与历史回算保留。
    retired: true,
    price: {
      currency: 'CNY',
      input: 2,
      cacheHit: 0.04,
      output: 8,
      offPeak: { input: 1, cacheHit: 0.02, output: 4 },
    },
    peakHours: DEEPSEEK_PEAK_HOURS,
  },
  {
    key: 'pro',
    name: 'DeepSeek V4 Pro',
    provider: 'DeepSeek',
    colorVar: 'dsw-static-deepseek-500',
    // V4 Pro 峰谷刊例（谷 4.5 / 0.15 / 13.5，峰 = 谷 × 2）即长期现行价。官方原定
    // 2026-09-14 12:00 起把 V4 Pro 请求路由至 V4.1 Flash 计费，随后公告改为
    // 「09-14 之后继续提供 V4 Pro，计费方式保持不变」（价目页注释 (2)）——
    // 路由分界取消，历史与未来事件同口径，不再需要运行时切换。
    price: {
      currency: 'CNY',
      input: 9,
      cacheHit: 0.3,
      output: 27,
      offPeak: { input: 4.5, cacheHit: 0.15, output: 13.5 },
    },
    peakHours: DEEPSEEK_PEAK_HOURS,
  },
  // 智谱 GLM (OpenAI-compatible, 腾讯云 TokenHub 官方价 2026-09).
  {
    key: 'glm',
    name: 'GLM-5.2',
    provider: '智谱 AI',
    colorVar: 'dsw-static-blue-600',
    price: { currency: 'CNY', input: 8, cacheHit: 2, output: 28 },
  },
  {
    key: 'glm-5.3',
    name: 'GLM-5.3',
    provider: '智谱 AI',
    colorVar: 'ds-blue',
    price: { currency: 'CNY', input: 8, cacheHit: 2, output: 28 },
  },
  {
    key: 'glm-5.3-flash',
    name: 'GLM-5.3-Flash',
    provider: '智谱 AI',
    colorVar: 'dsw-static-blue-300',
    // 官方刊例价（元 / 每百万 token）：输入 ¥0.8（未命中）/ ¥0.23（命中）/ 输出 ¥2.8。
    price: { currency: 'CNY', input: 0.8, cacheHit: 0.23, output: 2.8 },
    // 上线限时 5 折，至北京时间 2026-09-09 00:00（= 2026-09-08T16:00Z）；到期自动恢复刊例价。
    promo: { factor: 0.5, endsAtMs: Date.UTC(2026, 8, 8, 16, 0, 0), note: '限时 5 折' },
  },
  {
    key: 'glm-5.3-flashx',
    name: 'GLM-5.3-FlashX',
    provider: '智谱 AI',
    colorVar: 'dsw-static-blue-300',
    // 官方刊例价（元 / 每百万 token）：输入 ¥2（未命中）/ ¥0.57（命中）/ 输出 ¥7（腾讯云 TokenHub 价目 2026-09）。
    price: { currency: 'CNY', input: 2, cacheHit: 0.57, output: 7 },
  },
  {
    key: 'glm-4.6',
    name: 'GLM-4.6',
    provider: '智谱 AI',
    colorVar: 'dsw-static-blue-400',
    price: { currency: 'CNY', input: 4, cacheHit: 0.8, output: 16 },
  },
  // 智谱 GLM 其余按量价（元 / 每百万 token，≤32K 档，官方 open.bigmodel.cn / 百炼）。
  {
    key: 'glm-4.5-air',
    name: 'GLM-4.5-Air',
    provider: '智谱 AI',
    colorVar: 'dsw-static-blue-300',
    price: { currency: 'CNY', input: 0.8, cacheHit: 0.16, output: 2 },
  },
  {
    key: 'glm-4.7',
    name: 'GLM-4.7',
    provider: '智谱 AI',
    colorVar: 'dsw-static-blue-400',
    price: { currency: 'CNY', input: 4, cacheHit: 1, output: 16 },
    // GLM-4.7 无公开按量价：按其在 coding-plan 的抵扣系数相对 GLM-5-Turbo 的比例估算。
    estimated: true,
  },
  {
    key: 'glm-5-turbo',
    name: 'GLM-5-Turbo',
    provider: '智谱 AI',
    colorVar: 'ds-blue',
    price: { currency: 'CNY', input: 5, cacheHit: 1.2, output: 22 },
  },
  {
    key: 'glm-5.1',
    name: 'GLM-5.1',
    provider: '智谱 AI',
    colorVar: 'dsw-static-blue-600',
    // 腾讯云 TokenHub 价目 2026-09-24（≤32K 档）：输入 ¥6 / 命中 ¥1.3 / 输出 ¥24。
    price: { currency: 'CNY', input: 6, cacheHit: 1.3, output: 24 },
  },
  {
    key: 'glm-5v-turbo',
    name: 'GLM-5V-Turbo',
    provider: '智谱 AI',
    colorVar: 'dsw-static-blue-300',
    price: { currency: 'CNY', input: 5, cacheHit: 1.2, output: 22 },
  },
  // 阿里通义千问 (OpenAI-compatible, 百炼 2026-08).
  {
    key: 'qwen-3.8-max',
    name: 'Qwen3.8 Max',
    provider: '阿里通义',
    colorVar: 'dsw-static-blue-600',
    // 2026-08-06 发布；人民币刊例：输入 12 / 缓存命中 1.5 / 输出 36。
    price: { currency: 'CNY', input: 12, cacheHit: 1.5, output: 36 },
    // 附加计价维度（纯展示，估算计费仍走主价三桶）：
    // Batch File 为长期半价档；Batch Chat 原价与标准价一致（其限时活动按需求忽略）。
    extraRows: [
      { label: '显式缓存创建', input: 15 },
      { label: '显式缓存命中', input: 1 },
      { label: 'Batch File', input: 6, output: 18, note: '长期半价' },
      { label: 'Batch Chat', input: 12, output: 36, note: '与标准价一致' },
    ],
  },
  {
    key: 'qwen-3.8-flash',
    name: 'Qwen3.8 Flash',
    provider: '阿里通义',
    colorVar: 'dsw-static-blue-400',
    // 人民币刊例（官方价目页 2026-09-08 更新）：输入 0.8 / 缓存命中 0.1 / 输出 2.7。
    price: { currency: 'CNY', input: 0.8, cacheHit: 0.1, output: 2.7 },
    // 附加计价维度（纯展示，估算计费仍走主价三桶）：显式缓存创建 1.25 / 命中 0.1。
    // 官方能力表标注「批量推理 不支持」，无 Batch 档可列。
    extraRows: [
      { label: '显式缓存创建', input: 1.25 },
      { label: '显式缓存命中', input: 0.1 },
    ],
  },
  {
    key: 'qwen-3.8-27b',
    name: 'Qwen3.8 27B',
    provider: '阿里通义',
    colorVar: 'dsw-static-blue-300',
    // 27B dense 视觉语言开源模型（官方价目 2026-09）。
    price: { currency: 'CNY', input: 3, cacheHit: 0.6, output: 12 },
  },
  {
    key: 'qwen-max',
    name: 'Qwen3.7-Max',
    provider: '阿里通义',
    colorVar: 'dsw-static-blue-300',
    // 官方刊例价（元 / 每百万 token，0-1M 单一档）：输入 ¥12 / 命中 ¥1.2 / 输出 ¥36。
    price: { currency: 'CNY', input: 12, cacheHit: 1.2, output: 36 },
    // 整单限时 5 折（输入 6 / 输出 18），官方未公布截止日；长期生效直至公告后补填。
    promo: { factor: 0.5, note: '限时 5 折' },
    // 附加计价维度（纯展示，估算计费仍走主价三桶）：Batch File 为长期半价档；
    // Batch Chat 原价与标准价一致（其限时活动按惯例忽略）。
    extraRows: [
      { label: '显式缓存创建', input: 15 },
      { label: '显式缓存命中', input: 1.2 },
      { label: 'Batch File', input: 6, output: 18, note: '长期半价' },
      { label: 'Batch Chat', input: 12, output: 36, note: '与标准价一致' },
    ],
  },
  {
    key: 'qwen-plus',
    name: 'Qwen3.5-Plus',
    provider: '阿里通义',
    colorVar: 'ds-blue',
    // 官方刊例价（元 / 每百万 token，≤128K 档）：输入 ¥0.8 / 命中 ¥0.08 / 输出 ¥4.8。
    price: { currency: 'CNY', input: 0.8, cacheHit: 0.08, output: 4.8 },
    // 附加计价维度（纯展示，估算计费仍走主价三桶；≤128K 档官方价目）：
    // Batch File 为长期半价档；Batch Chat 原价与标准价一致。
    extraRows: [
      { label: '显式缓存创建', input: 1 },
      { label: '显式缓存命中', input: 0.08 },
      { label: 'Batch File', input: 0.4, output: 2.4, note: '长期半价' },
      { label: 'Batch Chat', input: 0.8, output: 4.8, note: '与标准价一致' },
    ],
  },
  {
    key: 'qwen-flash',
    name: 'Qwen3.5-Flash',
    provider: '阿里通义',
    colorVar: 'dsw-static-blue-400',
    // 官方刊例价（元 / 每百万 token）：输入 ¥0.2 / 命中 ¥0.02 / 输出 ¥2。
    price: { currency: 'CNY', input: 0.2, cacheHit: 0.02, output: 2 },
    // 附加计价维度（纯展示，估算计费仍走主价三桶）：显式缓存按百炼统一惯例
    // 创建 = 输入价 125%、命中 = 10%；批量推理支持情况未核实到官方依据，暂不列示。
    extraRows: [
      { label: '显式缓存创建', input: 0.25 },
      { label: '显式缓存命中', input: 0.02 },
    ],
  },
  // 字节豆包 (OpenAI-compatible, 火山方舟 2026).
  {
    key: 'doubao',
    name: 'Doubao Seed-2.0 Pro',
    provider: '字节豆包',
    colorVar: 'ds-red',
    price: { currency: 'CNY', input: 3.2, cacheHit: 0.64, output: 16 },
  },
  {
    key: 'doubao-mini',
    name: 'Doubao Seed-2.0 Mini',
    provider: '字节豆包',
    colorVar: 'dsw-static-red-300',
    // 官方 2.0-mini 价目（2026-09 核对）：缓存命中 ¥0.04（旧值 0.02 已过时）。
    price: { currency: 'CNY', input: 0.2, cacheHit: 0.04, output: 2 },
  },
  {
    key: 'doubao-1.6',
    name: 'Doubao Seed-1.6',
    provider: '字节豆包',
    colorVar: 'dsw-static-red-400',
    price: { currency: 'CNY', input: 0.8, cacheHit: 0, output: 8 },
  },
  // 火山方舟 2026 新模型（官方 CNY 价 / 每百万 token）。
  {
    key: 'doubao-seed-evolving',
    name: 'Doubao-Seed-Evolving',
    provider: '字节豆包',
    colorVar: 'ds-red',
    price: { currency: 'CNY', input: 6, cacheHit: 1.2, output: 30 },
  },
  {
    key: 'doubao-seed-2.1-pro',
    name: 'Doubao Seed-2.1 Pro',
    provider: '字节豆包',
    colorVar: 'dsw-static-red-400',
    price: { currency: 'CNY', input: 6, cacheHit: 1.2, output: 30 },
  },
  {
    key: 'doubao-seed-2.1-turbo',
    name: 'Doubao Seed-2.1 Turbo',
    provider: '字节豆包',
    colorVar: 'dsw-static-red-300',
    price: { currency: 'CNY', input: 3, cacheHit: 0.6, output: 15 },
  },
  {
    key: 'doubao-seed-2.1-lite',
    name: 'Doubao Seed-2.1 Lite',
    provider: '字节豆包',
    colorVar: 'dsw-static-red-300',
    // 1M 上下文三模态（火山方舟官方价目 2026-09）。
    price: { currency: 'CNY', input: 0.8, cacheHit: 0.16, output: 2.7 },
  },
  // 月之暗面 Kimi (OpenAI-compatible, 腾讯云 TokenHub 官方价 2026-08-14).
  {
    key: 'kimi',
    name: 'Kimi K2.7 Code',
    provider: '月之暗面',
    colorVar: 'dsw-static-neutral-bluish-700',
    price: { currency: 'CNY', input: 6.5, cacheHit: 1.3, output: 27 },
  },
  {
    key: 'kimi-k2.7-hs',
    name: 'Kimi K2.7 Code HighSpeed',
    provider: '月之暗面',
    colorVar: 'dsw-static-neutral-bluish-600',
    price: { currency: 'CNY', input: 13, cacheHit: 2.6, output: 54 },
  },
  {
    key: 'kimi-k2.6',
    name: 'Kimi K2.6',
    provider: '月之暗面',
    colorVar: 'dsw-static-neutral-bluish-500',
    price: { currency: 'CNY', input: 6.5, cacheHit: 1.1, output: 27 },
  },
  {
    key: 'kimi-k3',
    name: 'Kimi K3',
    provider: '月之暗面',
    colorVar: 'dsw-static-neutral-bluish-500',
    price: { currency: 'CNY', input: 20, cacheHit: 2, output: 100 },
  },
  // 小米 MiMo (OpenAI-compatible; token plan 通道 model id 为 mimo-v2.5，
  // 按订阅豁免计费；按量单价 2026-08 官方公布：命中缓存 / 未命中 / 输出).
  // V2.6 系列 2026-09-22 发布（同价延续 V2.5 官方定价）；V2.5 将于 2026-10-21 下线，过渡期保留.
  {
    key: 'mimo-v2.6-pro',
    name: 'MiMo V2.6 Pro',
    provider: '小米',
    colorVar: 'dsw-static-green-400',
    price: { currency: 'CNY', input: 3, cacheHit: 0.025, output: 6 },
  },
  {
    key: 'mimo-v2.6-flash',
    name: 'MiMo V2.6 Flash',
    provider: '小米',
    colorVar: 'dsw-static-green-400',
    price: { currency: 'CNY', input: 1, cacheHit: 0.02, output: 2 },
  },
  {
    key: 'mimo-v2.6-pro-ultraspeed',
    name: 'MiMo V2.6 Pro UltraSpeed',
    provider: '小米',
    colorVar: 'dsw-static-green-400',
    price: { currency: 'CNY', input: 30, cacheHit: 0.25, output: 60 },
  },
  {
    key: 'mimo-v2.5',
    name: 'MiMo V2.5',
    provider: '小米',
    colorVar: 'dsw-static-green-400',
    price: { currency: 'CNY', input: 1, cacheHit: 0.02, output: 2 },
  },
  {
    key: 'mimo-v2.5-pro',
    name: 'MiMo V2.5 Pro',
    provider: '小米',
    colorVar: 'dsw-static-green-400',
    price: { currency: 'CNY', input: 3, cacheHit: 0.025, output: 6 },
  },
  // MiniMax (OpenAI-compatible, TokenHub 2026-08-14).
  {
    key: 'minimax',
    name: 'MiniMax-M3',
    provider: 'MiniMax',
    colorVar: 'ds-amber',
    price: { currency: 'CNY', input: 2.1, cacheHit: 0.42, output: 8.4 },
  },
  // MiniMax-M2.7 / M2.7-highspeed：官方按量价（元 / 每百万 token，2026-08）。
  {
    key: 'minimax-m2.7',
    name: 'MiniMax-M2.7',
    provider: 'MiniMax',
    colorVar: 'dsw-static-amber-400',
    price: { currency: 'CNY', input: 2.1, cacheHit: 0.42, output: 8.4 },
  },
  {
    key: 'minimax-m2.7-highspeed',
    name: 'MiniMax-M2.7-highspeed',
    provider: 'MiniMax',
    colorVar: 'ds-amber',
    price: { currency: 'CNY', input: 4.2, cacheHit: 0.42, output: 16.8 },
  },
  // MiniMax-M3.1 Flash Preview：会员侧预览模型，价格与 M3 计费规则一致（issue #86）。
  {
    key: 'minimax-m3.1-flash-preview',
    name: 'MiniMax M3.1 Flash Preview',
    provider: 'MiniMax',
    colorVar: 'ds-amber',
    price: { currency: 'CNY', input: 2.1, cacheHit: 0.42, output: 8.4 },
  },
  // 云知声 U2 系列（OpenAI-compatible，云知声 MaaS，2026-10）。价格取 issue #86
  // 报告的用户侧计费口径（元/百万 token），官方 MaaS 平台价如有出入以后者为准。
  // U2 Flash 限时免费（2026-09-30 ~ 10-31）用 promo factor=0 表达：活动期计 0 元，
  // 到期自动恢复刊例价，不把目录价写成 0。
  {
    key: 'u2-flash',
    name: 'U2 Flash',
    provider: '云知声',
    colorVar: 'dsw-static-violet-400',
    price: { currency: 'CNY', input: 1, cacheHit: 0.2, output: 2 },
    promo: { factor: 0, endsAtMs: Date.UTC(2026, 9, 31, 16, 0, 0), note: '限时免费至 2026-10-31' },
  },
  {
    key: 'u2',
    name: 'Unisound U2',
    provider: '云知声',
    colorVar: 'dsw-static-violet-400',
    price: { currency: 'CNY', input: 1, cacheHit: 0.2, output: 2 },
  },
  {
    key: 'u2-med',
    name: 'U2-Med',
    provider: '云知声',
    colorVar: 'dsw-static-violet-400',
    price: { currency: 'CNY', input: 8, cacheHit: 2, output: 28 },
  },
  // 百度文心 (OpenAI-compatible, 千帆 2026-08).
  {
    key: 'ernie',
    name: 'ERNIE-5.1',
    provider: '百度文心',
    colorVar: 'dsw-static-blue-300',
    price: { currency: 'CNY', input: 4, cacheHit: 0.4, output: 18 },
  },
  // 腾讯混元 (OpenAI-compatible, TokenHub 2026-08-14).
  {
    key: 'hunyuan',
    name: '混元 Hy3',
    provider: '腾讯混元',
    colorVar: 'dsw-static-amber-400',
    price: { currency: 'CNY', input: 1, cacheHit: 0.25, output: 4 },
  },
  {
    key: 'hunyuan-hy4-preview',
    name: '混元 Hy4 Preview',
    provider: '腾讯混元',
    colorVar: 'dsw-static-amber-400',
    // 官方刊例价（元 / 每百万 token）：输入 ¥6（未命中）/ ¥0.3（命中）/ 输出 ¥18（TokenHub 价目与新华网发布稿 2026-08-28）。
    price: { currency: 'CNY', input: 6, cacheHit: 0.3, output: 18 },
  },
  {
    key: 'hunyuan-t1',
    name: '混元 T1',
    provider: '腾讯混元',
    colorVar: 'dsw-static-amber-300',
    price: { currency: 'CNY', input: 1, cacheHit: 0.1, output: 4 },
  },
  // 零一万物 (OpenAI-compatible, 2026-08).
  {
    key: 'yi',
    name: 'Yi-Lightning',
    provider: '零一万物',
    colorVar: 'ds-green',
    price: { currency: 'CNY', input: 0.99, cacheHit: 0.1, output: 0.99 },
  },
  // 阶跃星辰 Step (OpenAI-compatible, platform.stepfun.com 2026-08; 缓存命中 ¥0.27).
  {
    key: 'step',
    name: 'Step 3.7 Flash',
    provider: '阶跃星辰',
    colorVar: 'dsw-static-neutral-bluish-400',
    price: { currency: 'CNY', input: 1.35, cacheHit: 0.27, output: 8.1 },
  },
  // 科大讯飞星火 (OpenAI-compatible, 2026-07 汇总; 套餐制，价格约)。
  {
    key: 'spark',
    name: 'Spark 4.0 Ultra',
    provider: '科大讯飞',
    colorVar: 'dsw-static-green-400',
    price: { currency: 'CNY', input: 5, cacheHit: 0.5, output: 10 },
    estimated: true,
  },
  // 商汤日日新 (OpenAI-compatible, 2026-07 汇总; 公测中，价格约)。
  {
    key: 'sensenova',
    name: 'SenseNova 6.5',
    provider: '商汤',
    colorVar: 'dsw-static-red-400',
    price: { currency: 'CNY', input: 4.5, cacheHit: 0.45, output: 9 },
    estimated: true,
  },
  // 百川智能 (OpenAI-compatible, 2026-07 汇总)。
  {
    key: 'baichuan',
    name: 'Baichuan M3-Plus',
    provider: '百川智能',
    colorVar: 'dsw-static-neutral-bluish-500',
    price: { currency: 'CNY', input: 5, cacheHit: 0.5, output: 9 },
  },
  // OpenAI — GPT-6 / GPT-5.6 family (developers.openai.com/api/docs/pricing 2026-09).
  {
    key: 'gpt-6-astra',
    name: 'GPT-6 Astra',
    provider: 'OpenAI',
    colorVar: 'ds-green',
    // 标准档（输入 ≤272K）：缓存输入 $1 / 输入 $10 / 输出 $50。官方另有超长上下文
    // 加价（单请求输入 >272K 时整笔输入 ×2、输出 ×1.5）与 Fast 模式 ×2、Batch ×0.5，
    // 目录只记标准档，费率表按刊例展示。
    price: { currency: 'USD', input: 10, cacheHit: 1, output: 50 },
  },
  {
    key: 'gpt-6-sol',
    name: 'GPT-6 Sol',
    provider: 'OpenAI',
    colorVar: 'ds-green',
    // 2026-09-22 发布（官方 id gpt-6-sol）：标准档 $2 / $0.2 / $10。
    price: { currency: 'USD', input: 2, cacheHit: 0.2, output: 10 },
  },
  {
    key: 'gpt-6-luna',
    name: 'GPT-6 Luna',
    provider: 'OpenAI',
    colorVar: 'dsw-static-green-400',
    // 2026-09-22 发布（官方 id gpt-6-luna）：$0.1 / $0.01 / $0.5，官方明确缓存输入按 0.1× 计价。
    price: { currency: 'USD', input: 0.1, cacheHit: 0.01, output: 0.5 },
  },
  {
    key: 'gpt-5.6-sol',
    name: 'GPT-5.6 Sol',
    provider: 'OpenAI',
    colorVar: 'ds-green',
    price: { currency: 'USD', input: 5, cacheHit: 0.5, output: 30 },
    // 官方促销（至少持续至 2026-11-21）：缓存输入 $0.4 / 输入 $4 / 输出 $20。
    // 三档折扣并不同比（0.8 / 0.8 / 2/3），用 factors 逐档覆盖。
    promo: {
      factor: 0.8,
      factors: { output: 2 / 3 },
      endsAtMs: Date.UTC(2026, 10, 21, 16, 0, 0),
      note: '限时促销至 2026-11-21',
    },
  },
  {
    key: 'gpt-5.6-terra',
    name: 'GPT-5.6 Terra',
    provider: 'OpenAI',
    colorVar: 'dsw-static-green-400',
    price: { currency: 'USD', input: 2, cacheHit: 0.2, output: 12 },
  },
  {
    key: 'gpt-5.6-luna',
    name: 'GPT-5.6 Luna',
    provider: 'OpenAI',
    colorVar: 'ds-green',
    price: { currency: 'USD', input: 0.2, cacheHit: 0.02, output: 1.2 },
  },
  {
    key: 'gpt-5.5',
    name: 'GPT-5.5',
    provider: 'OpenAI',
    colorVar: 'ds-green',
    // 标准档（单请求输入 ≤272K）：$5 / $0.5 / $30；>272K 官方整笔输入 ×2、
    // 输出 ×1.5（$10 / $1 / $45），口径同 GPT-6 Astra，只记标准档。
    price: { currency: 'USD', input: 5, cacheHit: 0.5, output: 30 },
  },
  {
    key: 'gpt-6.1-sol',
    name: 'GPT-6.1 Sol',
    provider: 'OpenAI',
    colorVar: 'ds-green',
    // 标准档（单请求输入 ≤272K）：$2 / $0.1 / $10；>272K 加价档 $4 / $0.2 / $15，
    // 同 GPT-6 Astra 口径只记标准档。
    price: { currency: 'USD', input: 2, cacheHit: 0.1, output: 10 },
  },
  // Google — Gemini 3.x (ai.google.dev/gemini-api/docs/pricing 2026-09).
  // Google does NOT bill by time of day: Standard is the real-time full
  // price, while the Flex tier prices spare-capacity traffic at exactly -50%
  // (1-15 min latency). The estimator treats Standard as the peak band and
  // Flex as the off-peak band, mixed by the configured peak share.
  {
    key: 'gemini-pro',
    name: 'Gemini 3.1 Pro',
    provider: 'Google',
    colorVar: 'dsw-static-blue-600',
    price: {
      currency: 'USD',
      input: 2,
      cacheHit: 0.2,
      output: 12,
      offPeak: { input: 1, cacheHit: 0.1, output: 6 },
    },
    peakHours: GEMINI_PEAK_HOURS,
    tierSemantics: 'latency',
  },
  {
    key: 'gemini-3.8-flash',
    name: 'Gemini 3.8 Flash',
    provider: 'Google',
    colorVar: 'ds-blue',
    price: {
      currency: 'USD',
      input: 1.5,
      cacheHit: 0.15,
      output: 7.5,
      offPeak: { input: 0.75, cacheHit: 0.075, output: 3.75 },
    },
    // 3.6 / 3.7 / 3.8 Flash 均享官方 introductory 促销（整单 5 折，含 Flex 档），
    // 至 2026-12-31（UTC 收尾 = 北京 2027-01-01 00:00），到期自动恢复刊例价。
    promo: { factor: 0.5, endsAtMs: Date.UTC(2026, 11, 31, 16, 0, 0), note: 'introductory 促销至 2026-12-31' },
    peakHours: GEMINI_PEAK_HOURS,
    tierSemantics: 'latency',
  },
  {
    key: 'gemini-3.7-flash',
    name: 'Gemini 3.7 Flash',
    provider: 'Google',
    colorVar: 'dsw-static-blue-300',
    // 与 3.8 Flash 完全同价同促销结构。
    price: {
      currency: 'USD',
      input: 1.5,
      cacheHit: 0.15,
      output: 7.5,
      offPeak: { input: 0.75, cacheHit: 0.075, output: 3.75 },
    },
    promo: { factor: 0.5, endsAtMs: Date.UTC(2026, 11, 31, 16, 0, 0), note: 'introductory 促销至 2026-12-31' },
    peakHours: GEMINI_PEAK_HOURS,
    tierSemantics: 'latency',
  },
  {
    key: 'gemini-flash',
    name: 'Gemini 3.6 Flash',
    provider: 'Google',
    colorVar: 'dsw-static-blue-400',
    price: {
      currency: 'USD',
      input: 1.5,
      cacheHit: 0.15,
      output: 7.5,
      offPeak: { input: 0.75, cacheHit: 0.075, output: 3.75 },
    },
    promo: { factor: 0.5, endsAtMs: Date.UTC(2026, 11, 31, 16, 0, 0), note: 'introductory 促销至 2026-12-31' },
    peakHours: GEMINI_PEAK_HOURS,
    tierSemantics: 'latency',
  },
  // xAI — current Grok family (docs.x.ai 2026-09; Grok 4.7 2026-09-21 与 4.6 同价).
  {
    key: 'grok-4.7',
    name: 'Grok 4.7',
    provider: 'xAI',
    colorVar: 'dsw-static-neutral-bluish-700',
    price: { currency: 'USD', input: 2, cacheHit: 0.5, output: 6 },
  },
  {
    key: 'grok',
    name: 'Grok 4.6',
    provider: 'xAI',
    colorVar: 'dsw-static-neutral-bluish-700',
    price: { currency: 'USD', input: 2, cacheHit: 0.5, output: 6 },
  },
  {
    key: 'grok-4.5',
    name: 'Grok 4.5',
    provider: 'xAI',
    colorVar: 'dsw-static-neutral-bluish-700',
    // $2 / $0.3 / $6（缓存读按输入 15%）；>200K 加价档 $4 / $0.6 / $12，只记标准档。
    price: { currency: 'USD', input: 2, cacheHit: 0.3, output: 6 },
  },
  {
    key: 'grok-4.3',
    name: 'Grok 4.3',
    provider: 'xAI',
    colorVar: 'dsw-static-neutral-bluish-500',
    price: { currency: 'USD', input: 1.25, cacheHit: 0.2, output: 2.5 },
  },
  {
    key: 'grok-build-0.1',
    name: 'Grok Build 0.1',
    provider: 'xAI',
    colorVar: 'dsw-static-neutral-bluish-500',
    // 256K 上下文编码专用（docs.x.ai 2026-09）。
    price: { currency: 'USD', input: 1, cacheHit: 0.2, output: 2 },
  },
  // Meta — Llama 4 (Together/OpenRouter list rates 2026-08).
  {
    key: 'llama',
    name: 'Llama 4 Maverick',
    provider: 'Meta',
    colorVar: 'ds-red',
    price: { currency: 'USD', input: 0.2, cacheHit: 0.05, output: 0.6 },
  },
  {
    key: 'llama-scout',
    name: 'Llama 4 Scout',
    provider: 'Meta',
    colorVar: 'dsw-static-red-400',
    price: { currency: 'USD', input: 0.1, cacheHit: 0.025, output: 0.3 },
  },
  // Anthropic Claude（platform.claude.com 官方价目 2026-09）/ Mistral / Cohere：
  // models.dev 公开美元价（USD / 每百万 token）。
  {
    key: 'claude-opus-4-6',
    name: 'Claude Opus 4.6',
    provider: 'Anthropic',
    colorVar: 'ds-red',
    price: { currency: 'USD', input: 5, cacheHit: 0.5, output: 25 },
  },
  {
    key: 'claude-opus-4-7',
    name: 'Claude Opus 4.7',
    provider: 'Anthropic',
    colorVar: 'ds-red',
    // 与 Opus 4.6 / 5 同价目：$5 / $0.5 / $25。
    price: { currency: 'USD', input: 5, cacheHit: 0.5, output: 25 },
  },
  {
    key: 'claude-opus-4-8',
    name: 'Claude Opus 4.8',
    provider: 'Anthropic',
    colorVar: 'ds-red',
    // 同价目：$5 / $0.5 / $25。
    price: { currency: 'USD', input: 5, cacheHit: 0.5, output: 25 },
  },
  {
    key: 'claude-sonnet-4-6',
    name: 'Claude Sonnet 4.6',
    provider: 'Anthropic',
    colorVar: 'dsw-static-red-400',
    price: { currency: 'USD', input: 3, cacheHit: 0.3, output: 15 },
  },
  {
    key: 'claude-haiku-4-5',
    name: 'Claude Haiku 4.5',
    provider: 'Anthropic',
    colorVar: 'dsw-static-red-300',
    price: { currency: 'USD', input: 1, cacheHit: 0.1, output: 5 },
  },
  {
    key: 'claude-opus-5',
    name: 'Claude Opus 5',
    provider: 'Anthropic',
    colorVar: 'ds-red',
    price: { currency: 'USD', input: 5, cacheHit: 0.5, output: 25 },
  },
  {
    key: 'claude-sonnet-5',
    name: 'Claude Sonnet 5',
    provider: 'Anthropic',
    colorVar: 'dsw-static-red-400',
    price: { currency: 'USD', input: 2, cacheHit: 0.2, output: 10 },
  },
  {
    key: 'claude-fable-5-1',
    name: 'Claude Fable 5.1',
    provider: 'Anthropic',
    colorVar: 'ds-red',
    // 2026-09 新旗舰；同期同价发布的 Mythos 5.1（$10 / $0.25 / $50）不单列。
    price: { currency: 'USD', input: 10, cacheHit: 0.25, output: 50 },
  },
  {
    key: 'claude-fable-5',
    name: 'Claude Fable 5',
    provider: 'Anthropic',
    colorVar: 'ds-red',
    // Fable 5 与 Fable 5.1 是两个独立 id（models.dev anthropic 分别收录，同刊例
    // $10 / $50）；差别在缓存读：Fable 5 为 $1（输入的 10%），5.1 为 $0.25。
    price: { currency: 'USD', input: 10, cacheHit: 1, output: 50 },
  },
  {
    key: 'claude-opus-5-5',
    name: 'Claude Opus 5.5',
    provider: 'Anthropic',
    colorVar: 'ds-red',
    price: { currency: 'USD', input: 4, cacheHit: 0.2, output: 20 },
  },
  {
    key: 'claude-sonnet-5-5',
    name: 'Claude Sonnet 5.5',
    provider: 'Anthropic',
    colorVar: 'dsw-static-red-400',
    // 约 2026-09-28 发布；缓存读官方价存疑（目录 0.2 = 输入 10%，OpenRouter 实时
    // 报 0.1 = 5%，待控制台核实后定）。Haiku 5.5 已于 2026-10-07 上架补录。
    price: { currency: 'USD', input: 2, cacheHit: 0.2, output: 10 },
  },
  {
    key: 'claude-haiku-5-5',
    name: 'Claude Haiku 5.5',
    provider: 'Anthropic',
    colorVar: 'dsw-static-red-300',
    // 2026-10-07 发布（官方 id claude-haiku-5.5）：≤100K 标准档 $0.1 / $0.01 / $0.5；
    // 长上下文加价（≥100K 输入 $0.5 / 缓存读 $0.05 / 输出 $2.5）不单列，对齐
    // gpt-6-astra 只记标准档的先例。价源：OpenRouter 实时价（2026-10-08）。
    price: { currency: 'USD', input: 0.1, cacheHit: 0.01, output: 0.5 },
  },
  {
    key: 'mistral-large-2512',
    name: 'Mistral Large 3',
    provider: 'Mistral AI',
    colorVar: 'ds-violet',
    price: { currency: 'USD', input: 0.5, cacheHit: 0.05, output: 1.5 },
  },
  {
    key: 'mistral-small-2603',
    name: 'Mistral Small 4',
    provider: 'Mistral AI',
    colorVar: 'dsw-static-violet-400',
    price: { currency: 'USD', input: 0.15, cacheHit: 0.015, output: 0.6 },
  },
  {
    key: 'ministral-8b-latest',
    name: 'Ministral 8B',
    provider: 'Mistral AI',
    colorVar: 'dsw-static-violet-300',
    price: { currency: 'USD', input: 0.1, cacheHit: 0.01, output: 0.1 },
  },
  {
    key: 'command-a-03-2025',
    name: 'Command A',
    provider: 'Cohere',
    colorVar: 'ds-cyan',
    price: { currency: 'USD', input: 2.5, cacheHit: 0.25, output: 10 },
  },
  {
    key: 'command-r-08-2024',
    name: 'Command R',
    provider: 'Cohere',
    colorVar: 'dsw-static-cyan-400',
    price: { currency: 'USD', input: 0.15, cacheHit: 0.015, output: 0.6 },
  },
  // 国产新兴/开源模型：无官方公开价，按家族口径估算 CNY（标记 estimated）。
  {
    key: 'longcat-2.0',
    name: 'LongCat 2.0',
    provider: '美团',
    colorVar: 'ds-amber',
    price: { currency: 'CNY', input: 4, cacheHit: 0.8, output: 16 },
    estimated: true,
  },
  {
    key: 'minicpm-v-4.5',
    name: 'MiniCPM-V 4.5',
    provider: '面壁智能',
    colorVar: 'ds-green',
    price: { currency: 'CNY', input: 1, cacheHit: 0.2, output: 4 },
    estimated: true,
  },
  {
    key: 'ernie-4.5',
    name: 'ERNIE-4.5 300B',
    provider: '百度文心',
    colorVar: 'dsw-static-blue-300',
    price: { currency: 'CNY', input: 2, cacheHit: 0.4, output: 8 },
    estimated: true,
  },
  {
    key: 'dots-3-note-preview',
    name: 'Dots3-Note Preview',
    provider: '小红书',
    colorVar: 'ds-red',
    price: { currency: 'CNY', input: 2, cacheHit: 0.4, output: 8 },
    estimated: true,
  },
  // 主流厂商缺失/新增模型：国内统一按官方 CNY 价；无公开价的按家族口径估算并标记 estimated。
  {
    key: 'qwen3.7-plus',
    name: 'Qwen3.7 Plus',
    provider: '阿里通义',
    colorVar: 'dsw-static-orange-500',
    // 2026-05-26 发布；官方刊例价（元 / 每百万 token，≤256K 档）：输入 ¥2 / 命中 ¥0.4 / 输出 ¥8（256K-1M 档 6 / 1.2 / 24）。
    price: { currency: 'CNY', input: 2, cacheHit: 0.4, output: 8 },
    // 附加计价维度（纯展示，估算计费仍走主价三桶；≤256K 档官方价目，help.aliyun.com 2026-09-20）：
    // 显式缓存创建 ¥2.5 / 命中 ¥0.2；Batch File 长期半价；Batch Chat 与标准价一致。
    extraRows: [
      { label: '显式缓存创建', input: 2.5 },
      { label: '显式缓存命中', input: 0.2 },
      { label: 'Batch File', input: 1, output: 4, note: '长期半价' },
    ],
  },
  {
    key: 'qwen3.7-flash',
    name: 'Qwen3.7 Flash',
    provider: '阿里通义',
    colorVar: 'dsw-static-orange-400',
    // 2026-07-15 发布；官方刊例价（元 / 每百万 token，≤32K 档）：输入 ¥0.2 / 命中 ¥0.02 / 输出 ¥0.8（32K-256K 档 0.6 / 0.06 / 2.4）。
    price: { currency: 'CNY', input: 0.2, cacheHit: 0.02, output: 0.8 },
    // 附加计价维度（纯展示，估算计费仍走主价三桶；≤32K 档官方价目，help.aliyun.com 2026-09-14）：
    // 显式缓存创建 ¥0.25 / 命中 ¥0.02；Batch File 长期半价；Batch Chat 与标准价一致。
    extraRows: [
      { label: '显式缓存创建', input: 0.25 },
      { label: '显式缓存命中', input: 0.02 },
      { label: 'Batch File', input: 0.1, output: 0.4, note: '长期半价' },
    ],
  },
  {
    key: 'qwen3.6-max',
    name: 'Qwen3.6 Max',
    provider: '阿里通义',
    colorVar: 'dsw-static-orange-500',
    // 官方刊例价（元 / 每百万 token，0-128K 档）：输入 ¥9 / 命中 ¥0.9 / 输出 ¥54。
    price: { currency: 'CNY', input: 9, cacheHit: 0.9, output: 54 },
    // 附加计价维度（纯展示，估算计费仍走主价三桶；128K-256K 档为 15/90）：
    // 显式缓存按百炼统一惯例 创建 = 输入价 125%、命中 = 10%；官方未标 Batch 调用。
    extraRows: [
      { label: '显式缓存创建', input: 11.25 },
      { label: '显式缓存命中', input: 0.9 },
    ],
  },
  {
    key: 'qwen3-coder-plus',
    name: 'Qwen3-Coder Plus',
    provider: '阿里通义',
    colorVar: 'dsw-static-orange-400',
    // 官方刊例价（元 / 每百万 token，0-32K 档）：输入 ¥4 / 命中 ¥0.8 / 输出 ¥16。
    price: { currency: 'CNY', input: 4, cacheHit: 0.8, output: 16 },
    // 附加计价维度（纯展示，估算计费仍走主价三桶；0-32K 档官方价目）：
    // 该模型不支持批量推理，无 Batch 档可列。
    extraRows: [
      { label: '显式缓存创建', input: 5 },
      { label: '显式缓存命中', input: 0.4 },
    ],
  },
  {
    key: 'qwen3-coder',
    name: 'Qwen3-Coder 480B',
    provider: '阿里通义',
    colorVar: 'dsw-static-orange-300',
    price: { currency: 'CNY', input: 4, cacheHit: 0.8, output: 16 },
    estimated: true,
  },
  {
    key: 'glm-4.5-x',
    name: 'GLM-4.5-X',
    provider: '智谱 AI',
    colorVar: 'dsw-static-blue-400',
    price: { currency: 'CNY', input: 4, cacheHit: 1, output: 16 },
    estimated: true,
  },
  {
    key: 'glm-5',
    name: 'GLM-5',
    provider: '智谱 AI',
    colorVar: 'dsw-static-blue-400',
    // 官方刊例价（元 / 每百万 token，≤32K 档，腾讯云 TokenHub 代销价目 2026-09）：输入 ¥4 / 命中 ¥1 / 输出 ¥18（32K+ 档 6 / 1.5 / 22）。
    // GLM-5 将于 2026-10-09 从 TokenHub 下线；bigmodel 开放平台未见独立按量条目，过渡期日志仍会出现该 id。
    price: { currency: 'CNY', input: 4, cacheHit: 1, output: 18 },
  },
  {
    key: 'glm-5.2-fast',
    name: 'GLM-5.2 Fast',
    provider: '智谱 AI',
    colorVar: 'dsw-static-blue-300',
    // 阿里百炼代销官方价（元 / 每百万 token，北京档，help.aliyun.com 2026-09-14）：输入 ¥16 / 隐式缓存 ¥4 / 输出 ¥56。
    price: { currency: 'CNY', input: 16, cacheHit: 4, output: 56 },
  },
  {
    key: 'kimi-k3-fast',
    name: 'Kimi K3 Fast',
    provider: '月之暗面',
    colorVar: 'dsw-static-cyan-400',
    price: { currency: 'CNY', input: 20, cacheHit: 2, output: 100 },
    estimated: true,
  },
  {
    key: 'kimi-k2.7-code-fast',
    name: 'Kimi K2.7 Code Fast',
    provider: '月之暗面',
    colorVar: 'dsw-static-cyan-400',
    price: { currency: 'CNY', input: 6.5, cacheHit: 1.3, output: 27 },
    estimated: true,
  },
  {
    key: 'kimi-k2.8-preview',
    name: 'Kimi K2.8 Preview',
    provider: '月之暗面',
    colorVar: 'dsw-static-cyan-400',
    // 官方按量价（元 / 每百万 token，TokenHub 已上架按量条目 2026-09）：
    // 输入 ¥6.5（未命中）/ ¥1.7（命中）/ 输出 ¥27。
    price: { currency: 'CNY', input: 6.5, cacheHit: 1.7, output: 27 },
  },
  {
    key: 'kimi-k2.6-fast',
    name: 'Kimi K2.6 Fast',
    provider: '月之暗面',
    colorVar: 'dsw-static-cyan-300',
    price: { currency: 'CNY', input: 6.5, cacheHit: 1.1, output: 27 },
    estimated: true,
  },
  {
    key: 'kimi-k2.6-turbo',
    name: 'Kimi K2.6 Turbo',
    provider: '月之暗面',
    colorVar: 'dsw-static-cyan-300',
    price: { currency: 'CNY', input: 6.5, cacheHit: 1.1, output: 27 },
    estimated: true,
  },
  {
    key: 'kimi-k2-thinking-turbo',
    name: 'Kimi K2 Thinking Turbo',
    provider: '月之暗面',
    colorVar: 'dsw-static-cyan-300',
    // 官方：输入 ¥8（未命中）/ ¥1（命中）/ 输出 ¥58。
    price: { currency: 'CNY', input: 8, cacheHit: 1, output: 58 },
  },
  {
    key: 'doubao-seed-2.0-code',
    name: 'Doubao Seed-2.0 Code',
    provider: '字节豆包',
    colorVar: 'ds-red',
    price: { currency: 'CNY', input: 3.2, cacheHit: 0.64, output: 16 },
  },
  {
    key: 'doubao-seed-2.0-lite',
    name: 'Doubao Seed-2.0 Lite',
    provider: '字节豆包',
    colorVar: 'dsw-static-red-300',
    price: { currency: 'CNY', input: 0.6, cacheHit: 0.12, output: 3.6 },
  },
  {
    key: 'other',
    name: '其他模型',
    provider: 'Custom',
    colorVar: 'dsw-static-neutral-bluish-500',
    // Fallback for any stats key absent from the catalog: unknown models carry no price.
    // 未知模型不估算费用：价格全部为 0，费率表显示「—」，计费引擎产出 0。
    price: { currency: 'CNY', input: 0, cacheHit: 0, cacheMiss: 0, output: 0 },
  },
]

/**
 * 真实 provider model id → 计费目录键（`MODEL_CATALOG[].key`）的映射。未知 id
 * 原样保留并落回 `other`（未知模型不估算费用）。聚合层（aggregate.ts）在折叠时
 * 用同一张表把日志里的 model id 归并为目录键，客户端渲染（`modelOf`）也按它
 * 解析，两侧共用一份映射，避免同一模型两侧不一致导致「未收录」。
 */
export const BUILTIN_MODEL_KEY_ALIASES: Readonly<Record<string, string>> = {
  'deepseek-v4-flash': 'flash',
  'deepseek-v4-flash-vision-exp': 'flash-vision-exp',
  // V4.1 Flash 正式版 id（官方公告 2026-09-10 前后发布）：计费同 flash 系时间线。
  'deepseek-v4.1-flash': 'flash',
  // V4.1 Flash 限时内测端点（expires-on-0910，09-10 过期）：内测价 = flash 同价，
  // 收录它让存量账单的内测用量按 flash 时间线正确归并计费（issue #40 反馈）。
  'deepseek-v4.1-flash-expires-on-0910': 'flash',
  // 官方价目页 09-10 更新后的新规范名 deepseek-flash（模型版本 V4.1-Flash，
  // 含图像理解——vision 并入 flash 主线）：计费同 flash 时间线。
  'deepseek-flash': 'flash',
  'deepseek-v4-pro': 'pro',
  'glm-5.2': 'glm',
  // 智谱 GLM 其余按量变体：独立目录键（点/横杠/大小写变体归一）。
  'glm-4.5-air': 'glm-4.5-air',
  'glm-4.5air': 'glm-4.5-air',
  'glm-4.7': 'glm-4.7',
  'glm-5-turbo': 'glm-5-turbo',
  'glm-5.1': 'glm-5.1',
  'glm-5.3-flash': 'glm-5.3-flash',
  'glm-5.3-flashx': 'glm-5.3-flashx',
  'glm-5.3-flash-x': 'glm-5.3-flashx',
  'glm-5v-turbo': 'glm-5v-turbo',
  'glm-5v.1': 'glm-5v-turbo',
  // Anthropic Claude / Mistral / Cohere：id 变体归一（点/横杠/短名）。
  'claude-opus-4-6': 'claude-opus-4-6',
  'claude-opus-4.6': 'claude-opus-4-6',
  'claude-sonnet-4-6': 'claude-sonnet-4-6',
  'claude-sonnet-4.6': 'claude-sonnet-4-6',
  'claude-haiku-4-5': 'claude-haiku-4-5',
  'claude-haiku-4.5': 'claude-haiku-4-5',
  'claude-opus-5': 'claude-opus-5',
  'claude-sonnet-5': 'claude-sonnet-5',
  // Claude 5.x 新模型（2026-09）：点/横杠/短名变体归一。
  'claude-fable-5-1': 'claude-fable-5-1',
  'claude-fable-5.1': 'claude-fable-5-1',
  'claude-fable': 'claude-fable-5-1',
  // Mythos 5.1 与 Fable 5.1 同价发布（fable 条目注释「不单列」），归一到 fable 键计价。
  'claude-mythos-5-1': 'claude-fable-5-1',
  'claude-mythos-5.1': 'claude-fable-5-1',
  // Claude Haiku 5.5（2026-10-07 发布）：官方 id 与点号变体归一。
  'claude-haiku-5-5': 'claude-haiku-5-5',
  'claude-haiku-5.5': 'claude-haiku-5-5',
  'claude-opus-5-5': 'claude-opus-5-5',
  'claude-opus-5.5': 'claude-opus-5-5',
  'claude-sonnet-5-5': 'claude-sonnet-5-5',
  'claude-sonnet-5.5': 'claude-sonnet-5-5',
  // Claude Opus 4.7 / 4.8：与 4.6 / 5 同价目，官方 id 与目录键一致（点/横杠变体归一）。
  'claude-opus-4-7': 'claude-opus-4-7',
  'claude-opus-4.7': 'claude-opus-4-7',
  'claude-opus-4-8': 'claude-opus-4-8',
  'claude-opus-4.8': 'claude-opus-4-8',
  // Claude Fable 5：与 Fable 5.1 是两个独立 id（缓存读 $1 vs $0.25），独立目录键。
  'claude-fable-5': 'claude-fable-5',
  // Anthropic 的带日期快照 id（API versioned id，网关原样透传）：等价于无日期别名。
  'claude-haiku-4-5-20251001': 'claude-haiku-4-5',
  'mistral-large-2512': 'mistral-large-2512',
  'mistral-large-3': 'mistral-large-2512',
  'mistral-small-2603': 'mistral-small-2603',
  'mistral-small-4': 'mistral-small-2603',
  'ministral-8b-latest': 'ministral-8b-latest',
  'ministral-8b': 'ministral-8b-latest',
  'command-a-03-2025': 'command-a-03-2025',
  'command-a': 'command-a-03-2025',
  'command-r-08-2024': 'command-r-08-2024',
  'command-r': 'command-r-08-2024',
  // 国产新兴/开源模型 id 变体。
  // 腾讯混元 TokenHub 短 id（控制台/网关常用形态；价格口径 = hunyuan 条目）。
  'hy3': 'hunyuan',
  // Hy4 preview（2026-08-28 发布）：官方 id `hy4-preview`，短名/带前缀形态归一到独立目录键。
  'hy4-preview': 'hunyuan-hy4-preview',
  'hy4': 'hunyuan-hy4-preview',
  'hunyuan-hy4-preview': 'hunyuan-hy4-preview',
  'hunyuan-hy4': 'hunyuan-hy4-preview',
  'longcat-2.0': 'longcat-2.0',
  'longcat-2': 'longcat-2.0',
  'minicpm-v-4.5': 'minicpm-v-4.5',
  'minicpm-v-4.5-thinking': 'minicpm-v-4.5',
  'ernie-4.5': 'ernie-4.5',
  'ernie-4.5-300b': 'ernie-4.5',
  'dots-3-note-preview': 'dots-3-note-preview',
  'dots-3-note': 'dots-3-note-preview',
  'dots3-note-preview': 'dots-3-note-preview',
  'rednote-dots3': 'dots-3-note-preview',
  // 字节豆包新模型 id 变体（点/横杠/短名）。
  'doubao-seed-evolving': 'doubao-seed-evolving',
  'doubao-seed-evolve': 'doubao-seed-evolving',
  'doubao-seed-2.1-pro': 'doubao-seed-2.1-pro',
  'doubao-seed-2.1-pro-290000': 'doubao-seed-2.1-pro',
  'doubao-seed-2.1-turbo': 'doubao-seed-2.1-turbo',
  'doubao-seed-2-1-turbo': 'doubao-seed-2.1-turbo',
  'doubao-seed-2.1-lite': 'doubao-seed-2.1-lite',
  'doubao-seed-2-1-lite': 'doubao-seed-2.1-lite',
  'qwen3.8-max': 'qwen-3.8-max',
  'qwen3.8-flash': 'qwen-3.8-flash',
  'qwen3.8-27b': 'qwen-3.8-27b',
  'qwen-3.8-27b': 'qwen-3.8-27b',
  'qwen3.7-max': 'qwen-max',
  // 主流缺失/新增模型别名（点/横杠/短名）。
  'qwen3.6-max': 'qwen3.6-max',
  'qwen3.6-max-preview': 'qwen3.6-max',
  'qwen3-coder-plus': 'qwen3-coder-plus',
  'qwen3-coder': 'qwen3-coder',
  'qwen3-coder-480b': 'qwen3-coder',
  'glm-4.5-x': 'glm-4.5-x',
  'glm-4.5x': 'glm-4.5-x',
  'glm-5.2-fast': 'glm-5.2-fast',
  'glm-5.2f': 'glm-5.2-fast',
  'kimi-k3-fast': 'kimi-k3-fast',
  'kimi-k3f': 'kimi-k3-fast',
  // Kimi Code 订阅通道的模型 ID 固定为 kimi-for-coding：2026-09-11 起该 ID
  // 背后是 K2.8 Preview（此前是 K2.7 Code），日志里只会出现这个 ID。
  'kimi-for-coding': 'kimi-k2.8-preview',
  'kimi-k2.7-code-fast': 'kimi-k2.7-code-fast',
  'kimi-k2.7-code-f': 'kimi-k2.7-code-fast',
  'kimi-k2.6-fast': 'kimi-k2.6-fast',
  'kimi-k2.6-turbo': 'kimi-k2.6-turbo',
  'kimi-k2-thinking-turbo': 'kimi-k2-thinking-turbo',
  'doubao-seed-2.0-code': 'doubao-seed-2.0-code',
  'doubao-seed-2-0-code': 'doubao-seed-2.0-code',
  'doubao-seed-2.0-lite': 'doubao-seed-2.0-lite',
  'doubao-seed-2-0-lite': 'doubao-seed-2.0-lite',
  'qwen-max': 'qwen-max',
  'hunyuan-t1': 'hunyuan-t1',
  'step-3.7-flash': 'step',
  'seed-2.0-mini': 'doubao-mini',
  // 月之暗面 Kimi：coding plan 通道的 model id 是短名 k3。
  'k3': 'kimi-k3',
  'kimi-k3': 'kimi-k3',
  // Kimi K2.8 Preview：会员侧预览模型，日志里的 id 形态因通道而异，统一归一化。
  'kimi-k2.8-preview': 'kimi-k2.8-preview',
  'kimi-k2.8': 'kimi-k2.8-preview',
  'kimi-k2-8-preview': 'kimi-k2.8-preview',
  'kimi-k2-8': 'kimi-k2.8-preview',
  'k2.8-preview': 'kimi-k2.8-preview',
  'k2.8': 'kimi-k2.8-preview',
  // MiniMax：官方 OpenAI 兼容 id 为 `MiniMax-M3`（目录键 `minimax`）。日志里大小写/型号后缀
  // 各异，统一归一化到目录键，避免「厂商计费与订阅」把 MiniMax-M3 标成未收录。
  'minimax-m1': 'minimax',
  'minimax-m2': 'minimax',
  'minimax-m3': 'minimax',
  // MiniMax-M2.7 / M2.7-highspeed：按量通道的独立目录键（点/横杠/大小写变体归一）。
  'minimax-m2.7': 'minimax-m2.7',
  'minimax-m2.7-highspeed': 'minimax-m2.7-highspeed',
  'minimax-m2.7-high-speed': 'minimax-m2.7-highspeed',
  'minimax-m2-7': 'minimax-m2.7',
  'minimax-m2-7-highspeed': 'minimax-m2.7-highspeed',
  'minimax-m2-7-high-speed': 'minimax-m2.7-highspeed',
  // MiniMax-M3.1 Flash Preview：官方 id 即目录键（点/横杠变体归一，issue #86）。
  'minimax-m3.1-flash-preview': 'minimax-m3.1-flash-preview',
  'minimax-m3-1-flash-preview': 'minimax-m3.1-flash-preview',
  // 云知声 U2 系列：官方 id 即目录键，收录即覆盖归一（issue #86）。
  'u2-flash': 'u2-flash',
  'u2': 'u2',
  'u2-med': 'u2-med',
  // OpenAI GPT-6 Astra：官方 id 为 `gpt-6-astra`（2026-09-03 发布），短名形态一并归一。
  'gpt-6': 'gpt-6-astra',
  'gpt-6-astra': 'gpt-6-astra',
  // GPT-6 Sol / Luna（2026-09-22 发布）：官方 id 与目录键一致，收录即覆盖归一。
  'gpt-6-sol': 'gpt-6-sol',
  'gpt-6-luna': 'gpt-6-luna',
  // GPT-5.5 / GPT-6.1 Sol：官方 id 与目录键一致（点/横杠变体归一）。
  'gpt-5.5': 'gpt-5.5',
  'gpt-6.1-sol': 'gpt-6.1-sol',
  'gpt-6-1-sol': 'gpt-6.1-sol',
  // Google Gemini 3.7 / 3.8 Flash：点/横杠变体归一。
  'gemini-3.8-flash': 'gemini-3.8-flash',
  'gemini-3-8-flash': 'gemini-3.8-flash',
  'gemini-3.7-flash': 'gemini-3.7-flash',
  'gemini-3-7-flash': 'gemini-3.7-flash',
  // xAI Grok Build：短名归一。
  'grok-build-0.1': 'grok-build-0.1',
  'grok-build': 'grok-build-0.1',
  // xAI Grok 4.5 / 4.6：4.6 的目录键为 `grok`（该条目 name 即「Grok 4.6」），
  // 日志里以带版本号的 id 出现，须别名归一到既有键，否则落「未收录」；
  // 4.5 为独立目录键（缓存读 $0.3，与 4.6 的 $0.5 不同）。
  'grok-4.5': 'grok-4.5',
  'grok-4-5': 'grok-4.5',
  'grok-4.6': 'grok',
  'grok-4-6': 'grok',
}