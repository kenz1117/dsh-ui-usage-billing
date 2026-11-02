/**
 * `/usage` 对话内命令：把计费仪表盘拉进对话流。
 *
 * 宿主能力（@deepseek-ai/dsh-client-ui-commands，`ctx.commandUi`）：
 * - `register(contribution)` 注册一个**客户端自有**的斜杠命令，与宿主命令目录按
 *   名字合并；同名撞宿主命令会 fail loud（绝不遮蔽宿主命令）——故命令名取
 *   `usage`，宿主目录里没有同名命令。
 * - `contribution.ui` 用 `{ kind: 'action', run(session) }`：行为完全在客户端，
 *   不回传宿主命令执行器。
 * - `label` / `description` 是**函数**：菜单每次打开都重新读取，切换语言立即生效，
 *   无需重新注册。
 *
 * 取服务走 `ctx.inject(['commandUi'])` 而非 apply 期的 `ctx.get`：该服务是宿主的
 * Service，要等 inputTriggers / remote.commands 就绪才构造，晚于本插件 apply。
 * 老宿主没有这个服务时注入分支永不执行，**不注册命令**、面板功能完全不受影响——
 * 这是「服务缺席即降级、不得因此收窄兼容矩阵」的落点。
 */
import type { Context } from '@deepseek-ai/cordis';
/** 命令名（斜杠后不带斜杠）：与宿主命令目录合并的键。 */
export declare const USAGE_COMMAND_NAME = "usage";
/** 注册参数。 */
export interface UsageCommandOptions {
    /** 打开计费仪表盘（复用面板已注册的打开回调）。 */
    openDashboard: () => void;
    /** 菜单行标题（每次候选合成时读取，语言切换即时生效）。 */
    label: () => string;
    /** 菜单行描述。 */
    description: () => string;
}
/**
 * 注册 `/usage` 命令。
 *
 * commandUi 是宿主的 Service，构造前要等 inputTriggers / sessions / remote.commands
 * 就绪——这些都晚于本插件 apply。因此在 apply 期用 `ctx.get` 一次性采样必然拿到
 * undefined，命令永远注册不上；改为 `ctx.inject` 等它就位再注册。
 *
 * @param ctx - 客户端根 context。
 * @param options - 打开回调与文案。
 * @returns 查询当前是否已注册的 getter（宿主无 commandUi 服务时恒为 false，属正常降级）。
 */
export declare function registerUsageCommand(ctx: Context, options: UsageCommandOptions): () => boolean;
//# sourceMappingURL=usage-command.d.ts.map