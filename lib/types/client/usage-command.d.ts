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
 * 取服务走 `ctx.get('commandUi')`（cordis 免 inject 读取）：老宿主没有该服务时
 * **不注册命令**，面板功能完全不受影响——这是「服务缺席即降级、不得因此收窄兼容
 * 矩阵」的落点（宿主自己的 ui-permission-presets 也是 `ctx.get('commandUi')`）。
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
 * @param ctx - 客户端根 context。
 * @param options - 打开回调与文案。
 * @returns 是否注册成功（宿主无 commandUi 服务时返回 false，属正常降级）。
 */
export declare function registerUsageCommand(ctx: Context, options: UsageCommandOptions): boolean;
//# sourceMappingURL=usage-command.d.ts.map