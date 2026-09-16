# 订阅与余额适配矩阵

本文是 dsh-ui-usage-billing 全部订阅套餐与余额渠道的速查表：每个渠道怎么被识别、查哪个端点、需要什么凭据、面板上显示什么。排查「为什么不显示」时先对照此表。

## 订阅套餐额度（Coding / Token Plan 窗口）

在 llm-pi-ai 里给对应 provider 路由配置 `apiKeyEnv` 后自动识别；订阅通道的模型费用按订阅扣减计 0，不重复计入现金账单。

| Provider 路由名 | 显示名 | 额度端点 | 凭据要求 | 面板展示 |
| --- | --- | --- | --- | --- |
| `kimi-coding` | Kimi | `GET https://api.kimi.com/coding/v1/usages` | Kimi 开放平台 API key | 5 小时 / 周窗口用量与重置时间 |
| `zai-coding-cn` | Z.ai（智谱 GLM Coding） | `GET {host}/api/monitor/usage/quota/limit` + `GET {host}/api/biz/subscription/list` | 智谱 API key | 积分窗口（工作日 14-18 高峰全额、非高峰 5 折）与订阅档位 |
| `zai-coding`（国际） | Z.ai | 同上，host 为 `https://api.z.ai` | Z.ai API key | 同上 |
| `opencode-go` | OpenCode Go | `GET https://opencode.ai/zen/go/v1/usage` | OpenCode Go API key | 5 小时 / 周窗口；档位月费与周期额度由内置知识库识别（$10/月 + 周 $30） |
| `minimax` / `minimax-token-plan`（国际） | MiniMax | `https://api.minimax.io` 站点配额端点 | Token Plan key（`sk-cp-` 前缀） | 5 小时窗口用量与重置时间 |
| `minimax-cn` / `minimax-token-plan-cn`（国内） | MiniMax | `https://api.minimaxi.com` 站点配额端点 | 同上 | 同上；可在 provider 设置覆盖 `baseUrl` |
| `openrouter` | OpenRouter | `GET https://openrouter.ai/api/v1/credits` | OpenRouter API key | Credits 已用 / 剩余额度 |
| `anthropic` | Claude（Anthropic） | `GET https://api.anthropic.com/api/oauth/usage` | Claude Code 登录态（自动读 `~/.claude/.credentials.json` 的 OAuth token），无需配置 | 5 小时 / 周窗口利用率与重置时间 |
| `commandcode` | CommandCode | `GET https://api.commandcode.ai/alpha/billing/credits` | commandcode.ai API key（`user_` 前缀） | 5 小时 / 周窗口 + 月度 Credits 池 |
| `xiaomi-token-plan-cn` / 火山方舟等 | 小米 / 火山 | 暂无公开额度 API | — | 识别为订阅通道（费用记 0），额度显示「未接入」 |

注意：

- 按量计费的 `anthropic` 路由（`sk-ant-` 普通 API key）不会被误识别为订阅——Claude 订阅只走 Claude Code 登录态自动发现，费用照常按 token 计。
- MiniMax 普通按量 key（`sk-` 前缀）查不了订阅窗口；查询失败时面板会按 key 类型给出定向提示。
- 智谱国际 / 国内按 provider 路由名区分 host，无需手配。

## 余额（按量账户现金余额）

余额按近 7 天日均消耗折算「约可撑 N 天」；官方余额当日变动与本地账本交叉对账（`reconcilePath`），偏差超阈值提示核对。

| 渠道 | 端点 | 凭据要求 | 备注 |
| --- | --- | --- | --- |
| DeepSeek | `GET https://api.deepseek.com/user/balance` | llm-pi-ai 的 `deepseek` 路由 key，或插件配置 `balanceApiKeyEnv`（默认 `DEEPSEEK_API_KEY`） | 官方余额 + 分时计价交叉对账 |
| Kimi（月之暗面） | 官方余额端点 | 同 llm-pi-ai key | — |
| 阶跃星辰 | 官方余额端点 | 同 llm-pi-ai key | — |
| 硅基流动 | 官方余额端点 | 同 llm-pi-ai key | — |
| xAI | 官方余额端点 | 同 llm-pi-ai key | — |
| 智谱 GLM | 官方余额端点 | 同 llm-pi-ai key | — |
| 腾讯云 TokenHub | 云 API 管控面（TC3 签名，`src/tc3.ts`） | `<SecretId>:<SecretKey>` 管控密钥对（非推理 key）；路由名含 `tencent-tokenhub` / `tokenhub` / `tencent` / `tencentcloud` 即命中 | 剩余与总额度都可解析才显示百分比，绝不猜总额度 |
| 中转站（New API 系 / Sub2API） | `GET {origin}/api/status` 或 `/v1/usage` 自动探测 | 站点已有的推理 key | 同站多 key 合并一行；读不出标「未读出额度」，剩余 <20% 标红 |
| 自定义 Provider 余额 | 任意 HTTP 端点 | 请求头 `{{ENV}}` 经凭据 seam | `extract` 支持常量 / 点路径 / 四则运算，适配 NewApi / LiteLLM 等 |
| 声明端点（`declaredEndpoints`） | 绑定已配置 provider 的同源地址 | 复用该 provider 的 `apiKeyEnv` | 只写「数字在哪里」的点路径；安全边界（同源绑定、单斜杠 path、仅 GET、响应体上限）由 `src/declarative.ts` 强制执行 |

## 排查顺序建议

1. 面板显示「未接入」：该渠道暂无额度 API（见上表），或 provider 路由名不在识别列表。
2. 显示「未配置」：llm-pi-ai 里对应路由没配 `apiKeyEnv`。
3. 显示「鉴权失败」：key 类型不对（如 MiniMax 用了 `sk-` 按量 key 查订阅、TokenHub 用了推理 key 查管控面）。
4. 订阅/余额 5 分钟指纹缓存：刚改配置后稍等或重启宿主即可刷新；`relay-quotas` 端点附 `diagnostics` 字段可自查。
