/**
 * Usage billing plugin, browser half: registers the UsageBilling component
 * in the sidebar.footer.action slot.
 *
 * Displays compact cost/token/cache metrics in the sidebar footer, above the
 * Settings button, plus a model-health dot (green when any connected model
 * route responds). Expands to a detailed dashboard panel on click.
 */
import { UsageBilling } from "./UsageBilling.js";
import { en, NS, zh } from "./locales.js";
/** Required services for the usage billing surface. */
export const inject = ['slots', 'locale', 'connection'];
/**
 * Client plugin body: the UsageBilling entry in the sidebar footer.
 * @param ctx - client root context.
 */
export function apply(ctx) {
    ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'ui-usage-billing: dictionaries');
    ctx.slots.inject('sidebar.footer.action', () => ctx.slots.register({
        name: 'sidebar.footer.action',
        id: 'usage-billing',
        order: -10,
        locale: NS,
        inject: () => ({
            checkModels: async () => {
                // llm.models is host-scoped: it needs no sessionId, so the probe works
                // even before any session exists. A provider that loaded its model
                // catalog has live credentials; failed providers are the unhealthy
                // ones. Display names feed the per-model dots in the dashboard table.
                try {
                    const { result } = await ctx.connection.api.llm.models({});
                    if (!result.ok)
                        return { checked: true, available: false, providers: 0, failures: 0, okProviders: [], badProviders: [] };
                    return {
                        checked: true,
                        available: result.value.groups.length > 0,
                        providers: result.value.groups.length,
                        failures: result.value.failures.length,
                        okProviders: result.value.groups.map(group => group.name),
                        badProviders: result.value.failures.map(failure => failure.name),
                    };
                }
                catch {
                    return { checked: true, available: false, providers: 0, failures: 0, okProviders: [], badProviders: [] };
                }
            },
        }),
    }, UsageBilling));
}
//# sourceMappingURL=apply.js.map