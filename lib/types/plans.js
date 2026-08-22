/**
 * 供应商计费计划知识库（对标 dsh-spend 的 PROVIDER_KNOWLEDGE / PROVIDER_ALIASES）。
 *
 * 每个 provider 归入两种计费口径之一：
 * - `code`  —— 订阅制（coding / token / agent plan）：费用 = 订阅月费，额度按周期
 *   计量，token 用量不计费（不按 token 扣钱）。
 * - `token` —— 按量制：费用 = token × 单价（由 models.dev / OpenRouter / 内置目录
 *   定价）。无知识库命中的 provider 默认按 token 口径。
 *
 * `aliasOf` 把部署里杂乱的 provider id（glm / kimi / dashscope…）归一化到知识库键，
 * `planOf` 据此返回计费计划；日志出现的 provider 经此自动识别，无需人工配置。
 */
/**
 * 已知订阅制（code）provider 及其官方核实的订阅月费。
 *
 * 月费数据来源：竞品 dsh-spend 的 PROVIDER_KNOWLEDGE（2026-08-14 官方文档核实）。
 * 注意：国内 coding / token plan 通道（kimi-coding、zai、qwen/xiaomi/火山/百度
 * 的 token-plan 等）**无公开可核实的订阅月费**，不填 `monthly`——月度花费面板
 * 对这类显示「订阅制 · 月费未收录」而非编造金额。
 */
const CODE_PLANS = {
    // ── 海外订阅（竞品官方核实月费）──
    'opencode-go': { label: 'OpenCode Go', monthly: 10, currency: 'USD', periodDays: 7 },
    'opencode': { label: 'OpenCode', currency: 'USD', periodDays: 7 },
    'openai-codex': { label: 'OpenAI Codex', monthly: 20, currency: 'USD', periodDays: 7 },
    'github-copilot': { label: 'GitHub Copilot', monthly: 10, currency: 'USD', periodDays: 30 },
    'claude-sub': { label: 'Claude Code', monthly: 20, currency: 'USD', periodDays: 7 },
    'google-ai-sub': { label: 'Google AI (Gemini CLI)', monthly: 19.99, currency: 'USD', periodDays: 1 },
    // ── 国内订阅（无公开核实月费，仅标口径）──
    'kimi-coding': { label: 'Kimi For Coding', currency: 'CNY', periodDays: 7 },
    'zai-coding-cn': { label: 'Z.ai Coding Plan', currency: 'CNY', periodDays: 7 },
    'zai-coding': { label: 'Z.ai Coding Plan', currency: 'USD', periodDays: 7 },
    'qwen-token-plan': { label: '通义 Token Plan', currency: 'CNY', periodDays: 30 },
    'qwen-token-plan-cn': { label: '通义 Token Plan（国内）', currency: 'CNY', periodDays: 30 },
    'xiaomi-token-plan-ams': { label: '小米 Token Plan（海外）', currency: 'USD', periodDays: 30 },
    'xiaomi-token-plan-cn': { label: '小米 Token Plan（国内）', currency: 'CNY', periodDays: 30 },
    'xiaomi-token-plan-sgp': { label: '小米 Token Plan（新加坡）', currency: 'USD', periodDays: 30 },
    'volcengine-token-plan': { label: '火山引擎 Token Plan', currency: 'CNY', periodDays: 30 },
    'ark-token-plan': { label: '火山方舟 Token Plan', currency: 'CNY', periodDays: 30 },
    'doubao-token-plan': { label: '豆包 Token Plan', currency: 'CNY', periodDays: 30 },
    'ernie': { label: '百度文心 Plan', currency: 'CNY', periodDays: 30 },
    'baidu': { label: '百度文心 Plan', currency: 'CNY', periodDays: 30 },
    'wenxin': { label: '百度文心 Plan', currency: 'CNY', periodDays: 30 },
    'minimax': { label: 'MiniMax Coding Plan', currency: 'CNY', periodDays: 30 },
};
/** 已知任意层的 provider 显示名（含 token 制，供自动识别 label）。 */
const PROVIDER_LABELS = {
    deepseek: 'DeepSeek',
    'deepseek-official': 'DeepSeek',
    zhipu: '智谱 AI',
    'zhipuai': '智谱 AI',
    qwen: '阿里通义',
    'moonshot': '月之暗面',
    kimi: '月之暗面',
    volcengine: '字节豆包',
    doubao: '字节豆包',
    minimax: 'MiniMax',
    baidu: '百度文心',
    tencent: '腾讯混元',
    hunyuan: '腾讯混元',
    stepfun: '阶跃星辰',
    iflytek: '科大讯飞',
    sensetime: '商汤',
    baichuan: '百川智能',
    openai: 'OpenAI',
    google: 'Google',
    xai: 'xAI',
    meta: 'Meta',
    anthropic: 'Anthropic',
    mistral: 'Mistral',
};
/**
 * provider id 别名 → 知识库键。部署配置会以多种方式命名同一厂商
 * （glm vs zhipu、kimi vs moonshot、dashscope vs qwen…），归一化后再匹配。
 */
const PROVIDER_ALIASES = {
    'deepseek-official': 'deepseek',
    glm: 'zhipu',
    bigmodel: 'zhipu',
    zhipuai: 'zhipu',
    kimi: 'moonshot',
    'moonshot-ai': 'moonshot',
    dashscope: 'qwen',
    aliyun: 'qwen',
    tongyi: 'qwen',
    gemini: 'google',
    'google-ai': 'google',
    grok: 'xai',
    'x-ai': 'xai',
    claude: 'anthropic',
    'anthropic-api': 'anthropic',
    'codex': 'openai',
    // 海外订阅别名 → 知识库键（竞品 PROVIDER_ALIASES 同款）。
    copilot: 'github-copilot',
    github: 'github-copilot',
    'claude-code': 'claude-sub',
    'gemini-cli': 'google-ai-sub',
    'google-ai-pro': 'google-ai-sub',
};
/** 归一化 provider id 到知识库键；未命中的原样返回（避免误吞）。 */
export function aliasOf(provider) {
    if (provider === undefined || provider === null || provider === '')
        return provider;
    return PROVIDER_ALIASES[provider] ?? provider;
}
/**
 * 某 provider 的计费计划：命中的 code 计划返回订阅口径，`PROVIDER_LABELS` 命中的
 * 按量厂商返回 token 口径（无月费）；完全未知返回 undefined（调用方按 token 兜底）。
 */
export function planOf(provider) {
    const key = aliasOf(provider);
    const code = CODE_PLANS[key];
    if (code !== undefined) {
        return {
            kind: 'code',
            label: code.label,
            ...(code.monthly !== undefined ? { subscriptionMonthly: code.monthly } : {}),
            ...(code.currency !== undefined ? { currency: code.currency } : {}),
            ...(code.periodDays !== undefined ? { periodDays: code.periodDays } : {}),
        };
    }
    const label = PROVIDER_LABELS[key] ?? PROVIDER_LABELS[provider];
    if (label !== undefined)
        return { kind: 'token', label };
    return undefined;
}
/** 是否已知为订阅制（code）provider。 */
export function isCodePlan(provider) {
    return planOf(provider)?.kind === 'code';
}
//# sourceMappingURL=plans.js.map