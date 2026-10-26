/**
 * Plugin configuration（v1.5.2 抽出）：UsageBillingConfig 原本声明在 src/index.ts
 * 顶部，src/index.ts 收缩为装配器后被 src/routes/usage-stats.ts 等路由文件
 * 引用（作为 Deps 类型签名），把它单独放这里让 route 文件能从 src/ 根 import。
 * 仍由 src/index.ts 的 apply(ctx, config) 消费：路由层只通过 Deps 拿到它，
 * 不直接构造。
 *
 * ⚠️ Config 运行时 schema 必须经 src/index.ts re-export（issue #98）：宿主
 * dsh-settings@0.2.1-rc.2 的 settings.update 写回要求本插件条目在 loader fiber
 * 上有 `Config` schema（`entry.fiber.runtime.Config` 且带 toJSON），缺失时抛
 * `No configurable plugin entry`——v1.6.0 拆分时把 schema 退化成纯类型，「注入
 * 用量查询」开关随之失效（#80 方案的回归）。schemastery 非 strict object 会
 * merge 未声明键，其余 config 字段（statsPath / routeAliases 等）不受影响。
 */

import z from '@deepseek-ai/schemastery'
import type {
  CustomBalanceConfig,
  DeclaredEndpointConfig,
  SubscriptionPlanConfig,
} from './pricing-shared.ts'
import { DEFAULT_ENABLE_USAGE_STATS_TOOL, ENABLE_USAGE_STATS_TOOL_FIELD } from './client/usage-billing-settings.ts'

/** 宿主 0.1.7+ 经 Config schema 解析后，volatile 字段在 config 中的稳定引用形态
 *  （cosmokit `Volatile<T>` 的最小结构镜像，避免为类型引入直接依赖）。 */
export interface VolatileToggle {
  /** @returns 当前生效的布尔快照（设置写入后原位更新，无需重载插件）。 */
  get(): boolean
}

/**
 * 宿主侧条目 config schema（#80 / #98）：宿主 0.1.7+ 的设置系统据此把
 * `enableUsageStatsTool` 投影为 volatile 引用（设置写入即时反映 + 写回走
 * settings.update）。**必须**经 src/index.ts re-export 给 loader——宿主从插件
 * 运行时模块的 `Config` 导出发现它；只声明类型等于没有。schemastery 非 strict
 * object 透传未声明键，其余 config 字段不受影响；未导出 Config 的旧宿主直接
 * 把原始 config 交给 apply，普通布尔形态由读取端兼容。
 */
export const Config = z.object({
  [ENABLE_USAGE_STATS_TOOL_FIELD]: z.boolean().default(DEFAULT_ENABLE_USAGE_STATS_TOOL).volatile(),
})


/** Plugin configuration. */
export interface UsageBillingConfig {
  /** Absolute path to a `.dsh-usage-stats.json` fallback file. */
  statsPath?: string
  /** 统计快照的持久化路径；默认 `<harness home>/.dsh-usage-stats.json`
   *  （harness home = `DSH_HOME` 环境变量或 `~/.dsh`，见 resolveDshHome）。
   *  测试注入临时目录以隔离真实家目录（聚合失败回退与快照落盘都走此路径）。 */
  snapshotPath?: string
  /** 独立持久用量账本的绝对路径；默认 `<harness home>/.dsh-usage-ledger.json`。
   *  账本与会话日志解耦，因此永久删除会话不会抹掉已经观测到的用量。 */
  ledgerPath?: string
  /** 余额差对账基准的持久化路径；默认 `<harness home>/.dsh-usage-reconcile.json`。 */
  reconcilePath?: string
  /** 订阅制（coding / token / agent plan）provider id 列表；默认 kimi-coding、xiaomi-token-plan-cn。 */
  subscriptionProviders?: string[]
  /** 订阅套餐额度适配器（kimi / zai / opencode-go）；默认全部内置。 */
  subscriptionPlans?: readonly SubscriptionPlanConfig[]
  /** 余额查询用的 DeepSeek 凭据引用（环境变量名）；默认 DEEPSEEK_API_KEY。 */
  balanceApiKeyEnv?: string
  /** 月度预算（人民币元）；设置后随 usage-stats 下发，仪表盘显示预算进度条。 */
  monthlyBudget?: number
  /** 余额不足告警阈值（人民币元）：余额低于此值时仪表盘每天提醒一次；
      不设置则客户端按默认阈值（50 元）兜底。 */
  lowBalanceThreshold?: number
  /** 自定义 Provider 余额查询（任意 HTTP 端点 + extract 规则，适配 NewApi/LiteLLM 等）。 */
  customBalances?: readonly CustomBalanceConfig[]
  /**
   * 声明端点（declarative endpoints）：为内置表没有的供应商自声明余额/额度接口。
   * 绑定到某条已配置 provider 的同源地址，`fields` / `windows` 写响应里的取值路径；
   * 安全边界（origin 绑定、单斜杠 path、只 GET、跨源重定向失败、凭据取自 apiKeyEnv）
   * 写死在 declarative.ts。缺省空。
   */
  declaredEndpoints?: readonly DeclaredEndpointConfig[]
  /**
   * 允许通过 Host 头校验的额外主机名（反向代理场景）；缺省空，行为与历史版本完全一致。
   * 仅在 peer socket 已通过回环校验后才参考：socket 校验仍为强制且不受本字段影响，
   * 本名单只放宽「纵深防御」的第二层。匹配为**精确主机名**，忽略大小写与端口；
   * 不支持后缀 / 通配符，因此 `evil.com` 永远无法满足 `trusted.com`。
   * 例：`['llm.example.com']`。
   */
  trustedHosts?: string[]
  /** `usage_stats` 工具注入开关（默认 false：不注入）。宿主 0.1.7+ 经 Config
   *  解析后是 volatile 引用（设置写入即时反映），直连 apply（测试）是普通布尔；
   *  读取统一走 readUsageStatsToggle。该工具占用每次请求的上下文，coding 场景多在仪表盘查看。 */
  enableUsageStatsTool?: boolean | VolatileToggle
  /**
   * 联网搜索请求（`web/deepseek-search-llm-request`，日志只有请求、无用量事件）
   * 的单次费用估算（人民币元）。这类调用直连官方 api.deepseek.com，开放平台照常
   * 计费但本地日志无 usage，按次估值计入今日/本月费用；默认 0.02 元/次，设 0 关闭。
   */
  searchCallEstimateCny?: number
  /**
   * 历史路由别名（旧 provider 路由名 → 当前路由名）：改过名/删除过的路由，其
   * 历史用量原会落「未知路由」桶且站点/订阅/官方判定全部失效；配置别名后按
   * 目标路由归位。例：`{ "deepseek-official": "tencent", "tencent-cloud": "tencent" }`。
   */
  routeAliases?: Record<string, string>
  /**
   * 用户自定义模型别名（真实日志 model id → 计费目录键）：目录外的新模型无需
   * 等发版，配置一条别名即完成识别与计价（值必须是 MODEL_CATALOG 的既有 key，
   * 如 `{ "hy4-preview": "hunyuan" }`）。聚合折叠与客户端渲染共用同一映射。
   */
  modelKeyAliases?: Record<string, string>
  /**
   * 启动后延迟全量折叠的时长（毫秒，issue #105）：聚合器创建起 `replayDelayMs`
   * 之内，`/api/billing/*` 只出账本轻文档（不读任何会话日志，面板以「数据滞后」
   * 横幅提示，复用 issue #103 的 staleSnapshot 通道），到点后预热定时器照常完整
   * 折叠。默认 20 000（20 秒）；重账本用户（数千会话 / 数十 MB 日志）可调大到
   * 180 000；0 = 旧行为（随到随折，首屏轮询即触发全量折叠）。
   */
  replayDelayMs?: number
}
