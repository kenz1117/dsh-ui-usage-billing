window.__ModuleLoader__.load({
	id: "@kenz1117/dsh-ui-usage-billing",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react = require("react");
		let _deepseek_ai_dsh_client_ui_primitives = require("@deepseek-ai/dsh-client-ui-primitives");
		let react_jsx_runtime = require("react/jsx-runtime");
		//#region ../../../node_modules/.pnpm/clsx@2.1.1/node_modules/clsx/dist/clsx.mjs
		function r(e) {
			var t, f, n = "";
			if ("string" == typeof e || "number" == typeof e) n += e;
			else if ("object" == typeof e) if (Array.isArray(e)) {
				var o = e.length;
				for (t = 0; t < o; t++) e[t] && (f = r(e[t])) && (n && (n += " "), n += f);
			} else for (f in e) e[f] && (n && (n += " "), n += f);
			return n;
		}
		function clsx() {
			for (var e, t, f = 0, n = "", o = arguments.length; f < o; f++) (e = arguments[f]) && (t = r(e)) && (n && (n += " "), n += t);
			return n;
		}
		//#endregion
		//#region \0dsh-css:/Users/ken/deepseek-harness/packages/client/ui-usage-billing/src/client/UsageBilling.module.css.mjs
		const css = ".VWh0dG_railButton{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1);width:36px;height:36px;color:var(--dsw-static-blue-500);cursor:pointer;border-radius:10px;justify-content:center;align-items:center;padding:0;transition:background-color .14s,border-color .14s,color .14s;display:flex}.VWh0dG_railButton:hover,.VWh0dG_railButton:focus-visible{background:var(--dsw-alias-interactive-bg-hover);border-color:var(--dsw-alias-border-l3);color:var(--dsw-static-blue-400);outline:none}.VWh0dG_railButton svg{stroke-width:2px;width:18px;height:18px}.VWh0dG_trigger{border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-1);width:100%;color:var(--dsw-alias-label-primary);cursor:pointer;text-align:left;border-radius:12px;align-items:center;gap:12px;padding:10px 14px;transition:border-color .14s,background-color .14s;display:flex}.VWh0dG_trigger:hover,.VWh0dG_trigger:focus-visible{border-color:var(--dsw-alias-border-l2);background:var(--dsw-alias-interactive-bg-hover);outline:none}.VWh0dG_triggerIcon{width:16px;height:16px;color:var(--dsw-alias-label-tertiary);flex:none;justify-content:center;align-items:center;display:inline-flex}.VWh0dG_triggerIcon svg{stroke-width:1.8px;width:15px;height:15px}.VWh0dG_triggerToday,.VWh0dG_triggerMonth{align-items:baseline;gap:4px;min-width:0;display:flex}.VWh0dG_triggerDivider{background:var(--dsw-alias-border-l1);align-self:stretch;width:1px}.VWh0dG_triggerAmount{color:var(--dsw-alias-label-primary);letter-spacing:-.01em;font-variant-numeric:tabular-nums;white-space:nowrap;font-size:17px;font-weight:600;line-height:22px}.VWh0dG_triggerAmountSub{color:var(--dsw-alias-label-secondary);font-variant-numeric:tabular-nums;white-space:nowrap;font-size:13px;font-weight:600;line-height:18px}.VWh0dG_triggerMeta{color:var(--dsw-alias-label-tertiary);white-space:nowrap;font-size:10.5px;line-height:14px}.VWh0dG_dashboardModal{width:min(760px,100vw - 48px);max-height:min(760px,88vh)}.VWh0dG_dashboard{flex-direction:column;width:100%;max-height:min(760px,88vh);display:flex}.VWh0dG_dashboardHead{border-bottom:1px solid var(--dsw-alias-border-l1);justify-content:space-between;align-items:flex-start;gap:12px;padding:20px 24px 14px;display:flex}.VWh0dG_dashboardTitle{color:var(--dsw-alias-label-primary);margin:0;font-size:17px;font-weight:600;line-height:24px}.VWh0dG_dashboardSubtitle{color:var(--dsw-alias-label-caption);margin:3px 0 0;font-size:12px;line-height:17px}.VWh0dG_closeButton{width:30px;height:30px;color:var(--dsw-alias-label-secondary);cursor:pointer;background:0 0;border:none;border-radius:8px;flex:none;justify-content:center;align-items:center;transition:background-color .14s;display:inline-flex}.VWh0dG_closeButton:hover{background:var(--dsw-alias-interactive-bg-hover)}.VWh0dG_closeButton svg{stroke-width:2px;width:16px;height:16px}.VWh0dG_dashboardBody{flex-direction:column;gap:14px;padding:16px 24px 24px;display:flex;overflow-y:auto}.VWh0dG_hero{border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-1);border-radius:16px;justify-content:space-between;align-items:center;gap:24px;padding:20px 24px;display:flex}.VWh0dG_heroMain{flex-direction:column;gap:4px;min-width:0;display:flex}.VWh0dG_heroLabel{color:var(--dsw-alias-label-tertiary);white-space:nowrap;font-size:12px;line-height:17px}.VWh0dG_heroValue{letter-spacing:-.02em;color:var(--dsw-alias-label-primary);font-variant-numeric:tabular-nums;white-space:nowrap;font-size:40px;font-weight:600;line-height:48px}.VWh0dG_heroMeta{color:var(--dsw-alias-label-caption);white-space:nowrap;font-size:12px;line-height:17px}.VWh0dG_heroSide{flex-direction:column;flex:none;gap:10px;display:flex}.VWh0dG_heroSideItem{align-items:baseline;gap:8px;display:flex}.VWh0dG_heroSideLabel{color:var(--dsw-alias-label-tertiary);white-space:nowrap;font-size:12px;line-height:17px}.VWh0dG_heroSideValue{color:var(--dsw-alias-label-primary);font-variant-numeric:tabular-nums;white-space:nowrap;font-size:16px;font-weight:600;line-height:22px}.VWh0dG_delta{align-items:center;gap:2px;margin-left:4px;font-size:11px;font-weight:600;line-height:17px;display:inline-flex}.VWh0dG_deltaUp{color:var(--dsw-static-green-500)}.VWh0dG_deltaDown{color:var(--dsw-static-red-500)}.VWh0dG_kpiGrid{grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;display:grid}.VWh0dG_kpiTile{border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-1);border-radius:14px;flex-direction:column;gap:3px;padding:14px 15px;transition:border-color .14s,background-color .14s;display:flex}.VWh0dG_kpiTile:hover{border-color:var(--dsw-alias-border-l2);background:var(--dsw-alias-interactive-bg-hover)}.VWh0dG_kpiLabel{color:var(--dsw-alias-label-tertiary);font-size:11px;line-height:15px}.VWh0dG_kpiValue{color:var(--dsw-alias-label-primary);font-variant-numeric:tabular-nums;font-size:21px;font-weight:600;line-height:27px}.VWh0dG_kpiGreen{color:var(--dsw-static-green-500)}.VWh0dG_kpiDetail{color:var(--dsw-alias-label-caption);white-space:nowrap;text-overflow:ellipsis;font-size:11px;line-height:15px;overflow:hidden}.VWh0dG_panel{border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-1);border-radius:16px;flex-direction:column;gap:10px;padding:16px 18px;display:flex}.VWh0dG_panelHead{justify-content:space-between;align-items:baseline;gap:10px;display:flex}.VWh0dG_panelTitle{color:var(--dsw-alias-label-primary);margin:0;font-size:14px;font-weight:600;line-height:20px}.VWh0dG_panelHint{color:var(--dsw-alias-label-caption);white-space:nowrap;font-size:11px;line-height:16px}.VWh0dG_chartWrap{width:100%;position:relative}.VWh0dG_chartSvg{width:100%;height:auto;display:block}.VWh0dG_chartEmpty{height:140px;color:var(--dsw-alias-label-caption);justify-content:center;align-items:center;font-size:13px;display:flex}.VWh0dG_emptyRow{text-align:center;color:var(--dsw-alias-label-caption);padding:28px 0;font-size:13px}.VWh0dG_chartGrid{stroke:var(--dsw-alias-border-l1);stroke-width:1px}.VWh0dG_chartAxisLabel{fill:var(--dsw-alias-label-tertiary);font-size:10px}.VWh0dG_chartBar{fill:var(--dsw-static-blue-500);opacity:.35}.VWh0dG_chartBar:hover{opacity:.6}.VWh0dG_chartStack{stroke:var(--dsw-alias-bg-layer-1);stroke-width:.75px}.VWh0dG_chartStack:hover{opacity:.85}.VWh0dG_chartLine{stroke:var(--dsw-static-blue-500);stroke-width:2px;stroke-linecap:round;stroke-linejoin:round}.VWh0dG_chartCrosshair{stroke:var(--dsw-alias-label-dimmed);stroke-width:1px;stroke-dasharray:3 3}.VWh0dG_chartDot{fill:var(--dsw-static-neutral-bluish-00);stroke:var(--dsw-static-blue-500);stroke-width:2.5px}.VWh0dG_chartTooltip{pointer-events:none;z-index:2;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-3);box-shadow:var(--dsw-shadow-lv2);white-space:nowrap;border-radius:10px;padding:8px 10px;position:absolute;transform:translate(-50%,calc(-100% - 10px))}.VWh0dG_chartTooltipDate{color:var(--dsw-alias-label-primary);margin-bottom:3px;font-size:11px;font-weight:600}.VWh0dG_chartTooltipRow{color:var(--dsw-alias-label-secondary);align-items:center;gap:5px;font-size:11px;line-height:17px;display:flex}.VWh0dG_chartTooltipRow strong{color:var(--dsw-alias-label-primary);font-variant-numeric:tabular-nums;font-weight:600}.VWh0dG_chartLegendLine{background:var(--dsw-static-blue-500);border-radius:2px;width:10px;height:3px;display:inline-block}.VWh0dG_chartLegendBar{background:var(--dsw-static-blue-500);opacity:.5;border-radius:2px;width:7px;height:7px;display:inline-block}.VWh0dG_chartTooltipSwatch{border-radius:3px;flex:none;width:8px;height:8px;display:inline-block}.VWh0dG_chartLegend{color:var(--dsw-alias-label-tertiary);justify-content:flex-end;gap:14px;margin-top:2px;font-size:11px;display:flex}.VWh0dG_chartLegend span{align-items:center;gap:5px;display:inline-flex}.VWh0dG_tableScroll{border:1px solid var(--dsw-alias-border-l1);--dsh-scrollbar-thumb:var(--dsw-alias-scrollbar-bg-l2);--dsh-scrollbar-thumb-hover:var(--dsw-alias-scrollbar-hover-l2);border-radius:12px;overflow:auto}.VWh0dG_modelTable,.VWh0dG_pricingTable{border-collapse:collapse;width:100%;font-size:12.5px}.VWh0dG_modelTable th,.VWh0dG_modelTable td,.VWh0dG_pricingTable th,.VWh0dG_pricingTable td{border-bottom:1px solid var(--dsw-alias-border-l1);text-align:left;white-space:nowrap;padding:9px 12px}.VWh0dG_modelTable tbody tr:last-child td,.VWh0dG_pricingTable tbody tr:last-child td{border-bottom:0}.VWh0dG_modelTable thead th,.VWh0dG_pricingTable thead th{color:var(--dsw-alias-label-tertiary);background:var(--dsw-alias-bg-module-platform);font-size:11px;font-weight:500}.VWh0dG_modelTable tbody tr,.VWh0dG_pricingTable tbody tr{transition:background-color .12s}.VWh0dG_modelTable tbody tr:hover,.VWh0dG_pricingTable tbody tr:hover{background:var(--dsw-alias-interactive-bg-hover)}.VWh0dG_numCol{text-align:right;font-variant-numeric:tabular-nums}.VWh0dG_costCol{color:var(--dsw-static-blue-500);font-weight:600}.VWh0dG_na{color:var(--dsw-alias-label-dimmed)}.VWh0dG_modelCell{align-items:center;gap:8px;display:inline-flex}.VWh0dG_modelDot{width:9px;height:9px;box-shadow:0 0 0 3px color-mix(in srgb, var(--dsw-alias-bg-layer-1) 60%, transparent);border-radius:50%;flex:none}.VWh0dG_modelName{color:var(--dsw-alias-label-primary);font-weight:500;line-height:16px;display:block}.VWh0dG_modelProvider{color:var(--dsw-alias-label-caption);font-size:10.5px;line-height:14px;display:block}.VWh0dG_pricingToggle{cursor:pointer;text-align:left;background:0 0;border:none;justify-content:space-between;align-items:center;gap:10px;width:100%;padding:0;display:flex}.VWh0dG_pricingToggle:hover .VWh0dG_panelTitle,.VWh0dG_pricingToggle:focus-visible .VWh0dG_panelTitle{color:var(--dsw-static-blue-500)}.VWh0dG_rateBadge{vertical-align:1px;white-space:nowrap;border-radius:999px;align-items:center;margin-left:6px;padding:1px 6px;font-size:10px;font-weight:500;line-height:14px;display:inline-flex}.VWh0dG_rateBadgeLive{color:var(--dsw-static-green-500);background:color-mix(in srgb, var(--dsw-static-green-500) 10%, transparent)}.VWh0dG_rateBadgeBuiltin{color:var(--dsw-alias-label-tertiary);background:var(--dsw-alias-bg-module-platform)}.VWh0dG_pricingToggleText{align-items:baseline;gap:10px;min-width:0;display:flex}.VWh0dG_pricingChevron{width:16px;height:16px;color:var(--dsw-alias-label-tertiary);flex:none;transition:transform .16s}.VWh0dG_pricingChevronOpen{transform:rotate(180deg)}.VWh0dG_bandPrice{align-items:baseline;gap:6px;display:inline-flex}.VWh0dG_bandPriceOff{color:var(--dsw-alias-label-caption)}.VWh0dG_bandPriceOff:before{content:\"/\";color:var(--dsw-alias-label-dimmed);margin-right:4px}.VWh0dG_bandTag{color:var(--dsw-alias-label-secondary);flex-direction:column;gap:1px;font-size:10.5px;line-height:14px;display:inline-flex}.VWh0dG_bandTagOff{color:var(--dsw-static-green-500);font-weight:600}.VWh0dG_flatTag{color:var(--dsw-alias-label-caption);font-size:10.5px;line-height:14px}.VWh0dG_healthDot{border-radius:50%;flex:none;width:8px;height:8px;display:inline-block}.VWh0dG_healthOk{background:var(--dsw-static-green-500);box-shadow:0 0 0 3px color-mix(in srgb, var(--dsw-static-green-500) 18%, transparent)}.VWh0dG_healthBad{background:var(--dsw-static-red-500);box-shadow:0 0 0 3px color-mix(in srgb, var(--dsw-static-red-500) 18%, transparent)}.VWh0dG_healthIdle{background:var(--dsw-static-neutral-bluish-400)}.VWh0dG_dashboardRight{align-items:center;gap:8px;min-width:0;display:flex}.VWh0dG_healthBadge{white-space:nowrap;border-radius:999px;align-items:center;gap:6px;padding:3px 9px;font-size:11px;line-height:16px;display:inline-flex}.VWh0dG_healthBadgeOk{color:var(--dsw-static-green-500);background:color-mix(in srgb, var(--dsw-static-green-500) 10%, transparent)}.VWh0dG_healthBadgeBad{color:var(--dsw-static-red-500);background:color-mix(in srgb, var(--dsw-static-red-500) 10%, transparent)}.VWh0dG_planTag{color:var(--dsw-static-green-500);background:color-mix(in srgb, var(--dsw-static-green-500) 12%, transparent);border-radius:999px;align-items:center;padding:1px 8px;font-size:11px;font-weight:500;line-height:17px;display:inline-flex}@media (width<=640px){.VWh0dG_kpiGrid{grid-template-columns:repeat(2,minmax(0,1fr))}.VWh0dG_hero{flex-direction:column;align-items:flex-start;gap:14px}.VWh0dG_heroSide{flex-direction:row;gap:20px}}";
		const tagId = "@kenz1117/dsh-ui-usage-billing/UsageBilling.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@kenz1117/dsh-ui-usage-billing";
			tag.dataset.pluginCss = tagId;
			tag.textContent = css;
			document.head.appendChild(tag);
		}
		var UsageBilling_module_css_default = {
			"triggerAmount": "VWh0dG_triggerAmount",
			"bandPriceOff": "VWh0dG_bandPriceOff",
			"chartBar": "VWh0dG_chartBar",
			"bandTag": "VWh0dG_bandTag",
			"triggerMonth": "VWh0dG_triggerMonth",
			"chartTooltipSwatch": "VWh0dG_chartTooltipSwatch",
			"deltaDown": "VWh0dG_deltaDown",
			"modelTable": "VWh0dG_modelTable",
			"pricingTable": "VWh0dG_pricingTable",
			"heroSideItem": "VWh0dG_heroSideItem",
			"modelDot": "VWh0dG_modelDot",
			"pricingChevronOpen": "VWh0dG_pricingChevronOpen",
			"kpiValue": "VWh0dG_kpiValue",
			"flatTag": "VWh0dG_flatTag",
			"panel": "VWh0dG_panel",
			"triggerAmountSub": "VWh0dG_triggerAmountSub",
			"dashboard": "VWh0dG_dashboard",
			"kpiTile": "VWh0dG_kpiTile",
			"heroMain": "VWh0dG_heroMain",
			"healthBad": "VWh0dG_healthBad",
			"rateBadge": "VWh0dG_rateBadge",
			"heroMeta": "VWh0dG_heroMeta",
			"triggerDivider": "VWh0dG_triggerDivider",
			"bandTagOff": "VWh0dG_bandTagOff",
			"triggerToday": "VWh0dG_triggerToday",
			"heroSideLabel": "VWh0dG_heroSideLabel",
			"modelProvider": "VWh0dG_modelProvider",
			"chartEmpty": "VWh0dG_chartEmpty",
			"heroLabel": "VWh0dG_heroLabel",
			"deltaUp": "VWh0dG_deltaUp",
			"chartCrosshair": "VWh0dG_chartCrosshair",
			"chartTooltipRow": "VWh0dG_chartTooltipRow",
			"chartLegendBar": "VWh0dG_chartLegendBar",
			"triggerIcon": "VWh0dG_triggerIcon",
			"railButton": "VWh0dG_railButton",
			"chartStack": "VWh0dG_chartStack",
			"panelTitle": "VWh0dG_panelTitle",
			"modelName": "VWh0dG_modelName",
			"chartAxisLabel": "VWh0dG_chartAxisLabel",
			"heroSide": "VWh0dG_heroSide",
			"healthOk": "VWh0dG_healthOk",
			"heroSideValue": "VWh0dG_heroSideValue",
			"kpiDetail": "VWh0dG_kpiDetail",
			"pricingToggleText": "VWh0dG_pricingToggleText",
			"closeButton": "VWh0dG_closeButton",
			"dashboardTitle": "VWh0dG_dashboardTitle",
			"dashboardBody": "VWh0dG_dashboardBody",
			"chartLegendLine": "VWh0dG_chartLegendLine",
			"chartLegend": "VWh0dG_chartLegend",
			"numCol": "VWh0dG_numCol",
			"healthBadgeBad": "VWh0dG_healthBadgeBad",
			"kpiGrid": "VWh0dG_kpiGrid",
			"chartDot": "VWh0dG_chartDot",
			"healthDot": "VWh0dG_healthDot",
			"pricingChevron": "VWh0dG_pricingChevron",
			"emptyRow": "VWh0dG_emptyRow",
			"rateBadgeBuiltin": "VWh0dG_rateBadgeBuiltin",
			"healthIdle": "VWh0dG_healthIdle",
			"trigger": "VWh0dG_trigger",
			"dashboardHead": "VWh0dG_dashboardHead",
			"tableScroll": "VWh0dG_tableScroll",
			"kpiGreen": "VWh0dG_kpiGreen",
			"na": "VWh0dG_na",
			"healthBadgeOk": "VWh0dG_healthBadgeOk",
			"hero": "VWh0dG_hero",
			"chartTooltipDate": "VWh0dG_chartTooltipDate",
			"modelCell": "VWh0dG_modelCell",
			"planTag": "VWh0dG_planTag",
			"costCol": "VWh0dG_costCol",
			"panelHead": "VWh0dG_panelHead",
			"kpiLabel": "VWh0dG_kpiLabel",
			"chartWrap": "VWh0dG_chartWrap",
			"heroValue": "VWh0dG_heroValue",
			"triggerMeta": "VWh0dG_triggerMeta",
			"chartGrid": "VWh0dG_chartGrid",
			"chartLine": "VWh0dG_chartLine",
			"chartTooltip": "VWh0dG_chartTooltip",
			"rateBadgeLive": "VWh0dG_rateBadgeLive",
			"healthBadge": "VWh0dG_healthBadge",
			"dashboardRight": "VWh0dG_dashboardRight",
			"dashboardSubtitle": "VWh0dG_dashboardSubtitle",
			"pricingToggle": "VWh0dG_pricingToggle",
			"delta": "VWh0dG_delta",
			"dashboardModal": "VWh0dG_dashboardModal",
			"bandPrice": "VWh0dG_bandPrice",
			"chartSvg": "VWh0dG_chartSvg",
			"panelHint": "VWh0dG_panelHint"
		};
		/** 运行时实时覆盖：undefined = 用内置目录与内置汇率（默认值降级）。 */
		let liveRate;
		let livePrices;
		/**
		* Apply the node half's live pricing snapshot. Absent fields keep the
		* built-in catalog and rate; callers never fabricate values.
		* @param pricing - the `/api/billing/pricing` response.
		*/
		function applyLivePricing(pricing) {
			liveRate = pricing.rate;
			livePrices = pricing.prices;
		}
		/** 当前汇率：实时覆盖优先，缺省回退内置固定值。 */
		function currentRate() {
			return liveRate ?? 6.79;
		}
		/**
		* 当前生效的 USD → CNY 汇率及其来源：live = 启动时实时拉取成功，
		* builtin = 实时拉取失败、正在用内置默认值。
		*/
		function getRateInfo() {
			return {
				rate: currentRate(),
				live: liveRate !== void 0
			};
		}
		/** Default share of traffic assumed to fall in the peak band (0..1). */
		const DEFAULT_PEAK_SHARE = .5;
		/**
		* Model keys served through a subscription plan (e.g. a coding plan or topic
		* plan) instead of metered per-token API billing. Usage through these routes
		* costs no tokens: the estimator treats them as ¥0 and the billing table
		* labels them 订阅包含. Add any model key your deployment serves through a
		* plan here; leave empty when every route is pay-as-you-go.
		* kimi-k3: 月之暗面 coding plan 通道的调用按套餐计费，费用记 0。
		*/
		const SUBSCRIPTION_PLAN_KEYS = ["kimi-k3"];
		/** Whether one stats model key is billed through a subscription plan. */
		function isSubscriptionPlan(key) {
			return SUBSCRIPTION_PLAN_KEYS.includes(key);
		}
		/**
		* Built-in catalog of current mainstream models as of 2026-08-16, priced from
		* each provider's official price page. Domestic providers are OpenAI-API
		* compatible and publish RMB prices directly; overseas providers publish USD
		* and convert through the exchange rate at estimate time. Retired models
		* (GPT-4o family, Gemini 2.x, GLM-4.x-lite, older Qwen) are deliberately
		* absent, as are Anthropic Claude models (their native API is not
		* OpenAI-compatible, so the harness cannot drive them directly). DeepSeek
		* keys match the harness stats file so real usage prices from the catalog;
		* unknown keys fall back to `other`.
		*
		* Time-of-day billing (peak/off-peak) is now real: DeepSeek V4 officially
		* splits peak (09:00-12:00 / 14:00-18:00 Beijing) at 2x the off-peak rate
		* from 2026-08-17, and Gemini's Flex tier discounts spare-capacity traffic.
		*/
		const MODEL_CATALOG = [
			{
				key: "flash",
				name: "DeepSeek V4 Flash",
				provider: "DeepSeek",
				colorVar: "dsw-static-blue-500",
				price: {
					currency: "CNY",
					input: 3,
					cacheHit: .1,
					output: 9,
					offPeak: {
						input: 1.5,
						cacheHit: .05,
						output: 4.5
					}
				},
				peakHours: "09:00-12:00 / 14:00-18:00"
			},
			{
				key: "pro",
				name: "DeepSeek V4 Pro",
				provider: "DeepSeek",
				colorVar: "dsw-static-deepseek-500",
				price: {
					currency: "CNY",
					input: 9,
					cacheHit: .3,
					output: 27,
					offPeak: {
						input: 4.5,
						cacheHit: .15,
						output: 13.5
					}
				},
				peakHours: "09:00-12:00 / 14:00-18:00"
			},
			{
				key: "glm",
				name: "GLM-5.2",
				provider: "智谱 AI",
				colorVar: "dsw-static-blue-600",
				price: {
					currency: "CNY",
					input: 8,
					cacheHit: 2,
					output: 28
				}
			},
			{
				key: "glm-5.3",
				name: "GLM-5.3",
				provider: "智谱 AI",
				colorVar: "dsw-static-blue-500",
				price: {
					currency: "CNY",
					input: 8,
					cacheHit: 2,
					output: 28
				}
			},
			{
				key: "glm-4.6",
				name: "GLM-4.6",
				provider: "智谱 AI",
				colorVar: "dsw-static-blue-400",
				price: {
					currency: "CNY",
					input: 4,
					cacheHit: .8,
					output: 16
				}
			},
			{
				key: "qwen-3.8-max",
				name: "Qwen3.8 Max",
				provider: "阿里通义",
				colorVar: "dsw-static-blue-600",
				price: {
					currency: "CNY",
					input: 13.58,
					cacheHit: 1.36,
					output: 40.74
				}
			},
			{
				key: "qwen-max",
				name: "Qwen3.7-Max",
				provider: "阿里通义",
				colorVar: "dsw-static-blue-300",
				price: {
					currency: "CNY",
					input: 6,
					cacheHit: .6,
					output: 18
				}
			},
			{
				key: "qwen-plus",
				name: "Qwen3.5-Plus",
				provider: "阿里通义",
				colorVar: "dsw-static-blue-500",
				price: {
					currency: "CNY",
					input: .8,
					cacheHit: .08,
					output: 4.8
				}
			},
			{
				key: "qwen-flash",
				name: "Qwen3.5-Flash",
				provider: "阿里通义",
				colorVar: "dsw-static-blue-400",
				price: {
					currency: "CNY",
					input: .2,
					cacheHit: .02,
					output: 2
				}
			},
			{
				key: "doubao",
				name: "Doubao Seed-2.0 Pro",
				provider: "字节豆包",
				colorVar: "dsw-static-red-500",
				price: {
					currency: "CNY",
					input: 3.2,
					cacheHit: .64,
					output: 16
				}
			},
			{
				key: "doubao-mini",
				name: "Doubao Seed-2.0 Mini",
				provider: "字节豆包",
				colorVar: "dsw-static-red-300",
				price: {
					currency: "CNY",
					input: .2,
					cacheHit: .02,
					output: 2
				}
			},
			{
				key: "doubao-1.6",
				name: "Doubao Seed-1.6",
				provider: "字节豆包",
				colorVar: "dsw-static-red-400",
				price: {
					currency: "CNY",
					input: .8,
					cacheHit: 0,
					output: 8
				}
			},
			{
				key: "kimi",
				name: "Kimi K2.7 Code",
				provider: "月之暗面",
				colorVar: "dsw-static-neutral-bluish-700",
				price: {
					currency: "CNY",
					input: 6.5,
					cacheHit: 1.3,
					output: 27
				}
			},
			{
				key: "kimi-k2.7-hs",
				name: "Kimi K2.7 Code HighSpeed",
				provider: "月之暗面",
				colorVar: "dsw-static-neutral-bluish-600",
				price: {
					currency: "CNY",
					input: 13,
					cacheHit: 2.6,
					output: 54
				}
			},
			{
				key: "kimi-k2.6",
				name: "Kimi K2.6",
				provider: "月之暗面",
				colorVar: "dsw-static-neutral-bluish-500",
				price: {
					currency: "CNY",
					input: 6.5,
					cacheHit: 1.1,
					output: 27
				}
			},
			{
				key: "kimi-k3",
				name: "Kimi K3",
				provider: "月之暗面",
				colorVar: "dsw-static-neutral-bluish-500",
				price: {
					currency: "CNY",
					input: 20,
					cacheHit: 2,
					output: 100
				}
			},
			{
				key: "minimax",
				name: "MiniMax-M3",
				provider: "MiniMax",
				colorVar: "dsw-static-amber-500",
				price: {
					currency: "CNY",
					input: 2.1,
					cacheHit: .42,
					output: 8.4
				}
			},
			{
				key: "ernie",
				name: "ERNIE-5.1",
				provider: "百度文心",
				colorVar: "dsw-static-blue-300",
				price: {
					currency: "CNY",
					input: 4,
					cacheHit: .4,
					output: 18
				}
			},
			{
				key: "hunyuan",
				name: "混元 Hy3",
				provider: "腾讯混元",
				colorVar: "dsw-static-amber-400",
				price: {
					currency: "CNY",
					input: 1,
					cacheHit: .25,
					output: 4
				}
			},
			{
				key: "hunyuan-t1",
				name: "混元 T1",
				provider: "腾讯混元",
				colorVar: "dsw-static-amber-300",
				price: {
					currency: "CNY",
					input: 1,
					cacheHit: .1,
					output: 4
				}
			},
			{
				key: "yi",
				name: "Yi-Lightning",
				provider: "零一万物",
				colorVar: "dsw-static-green-500",
				price: {
					currency: "CNY",
					input: .99,
					cacheHit: .1,
					output: .99
				}
			},
			{
				key: "step",
				name: "Step 3.7 Flash",
				provider: "阶跃星辰",
				colorVar: "dsw-static-neutral-bluish-400",
				price: {
					currency: "CNY",
					input: 1.35,
					cacheHit: .27,
					output: 8.1
				}
			},
			{
				key: "spark",
				name: "Spark 4.0 Ultra",
				provider: "科大讯飞",
				colorVar: "dsw-static-green-400",
				price: {
					currency: "CNY",
					input: 5,
					cacheHit: .5,
					output: 10
				}
			},
			{
				key: "sensenova",
				name: "SenseNova 6.5",
				provider: "商汤",
				colorVar: "dsw-static-red-400",
				price: {
					currency: "CNY",
					input: 4.5,
					cacheHit: .45,
					output: 9
				}
			},
			{
				key: "baichuan",
				name: "Baichuan M3-Plus",
				provider: "百川智能",
				colorVar: "dsw-static-neutral-bluish-500",
				price: {
					currency: "CNY",
					input: 5,
					cacheHit: .5,
					output: 9
				}
			},
			{
				key: "gpt-5.6-sol",
				name: "GPT-5.6 Sol",
				provider: "OpenAI",
				colorVar: "dsw-static-green-500",
				price: {
					currency: "USD",
					input: 5,
					cacheHit: .5,
					output: 30
				}
			},
			{
				key: "gpt-5.6-terra",
				name: "GPT-5.6 Terra",
				provider: "OpenAI",
				colorVar: "dsw-static-green-400",
				price: {
					currency: "USD",
					input: 2,
					cacheHit: .2,
					output: 12
				}
			},
			{
				key: "gpt-5.6-luna",
				name: "GPT-5.6 Luna",
				provider: "OpenAI",
				colorVar: "dsw-static-green-500",
				price: {
					currency: "USD",
					input: .2,
					cacheHit: .02,
					output: 1.2
				}
			},
			{
				key: "gemini-pro",
				name: "Gemini 3.1 Pro",
				provider: "Google",
				colorVar: "dsw-static-blue-600",
				price: {
					currency: "USD",
					input: 2,
					cacheHit: .2,
					output: 12,
					offPeak: {
						input: 1,
						cacheHit: .1,
						output: 6
					}
				},
				peakHours: "Standard / Flex"
			},
			{
				key: "gemini-flash",
				name: "Gemini 3.6 Flash",
				provider: "Google",
				colorVar: "dsw-static-blue-400",
				price: {
					currency: "USD",
					input: 1.5,
					cacheHit: .15,
					output: 7.5,
					offPeak: {
						input: .75,
						cacheHit: .075,
						output: 3.75
					}
				},
				peakHours: "Standard / Flex"
			},
			{
				key: "grok",
				name: "Grok 4.6",
				provider: "xAI",
				colorVar: "dsw-static-neutral-bluish-700",
				price: {
					currency: "USD",
					input: 2,
					cacheHit: .5,
					output: 6
				}
			},
			{
				key: "grok-4.3",
				name: "Grok 4.3",
				provider: "xAI",
				colorVar: "dsw-static-neutral-bluish-500",
				price: {
					currency: "USD",
					input: 1.25,
					cacheHit: .2,
					output: 2.5
				}
			},
			{
				key: "llama",
				name: "Llama 4 Maverick",
				provider: "Meta",
				colorVar: "dsw-static-red-500",
				price: {
					currency: "USD",
					input: .2,
					cacheHit: .05,
					output: .6
				}
			},
			{
				key: "llama-scout",
				name: "Llama 4 Scout",
				provider: "Meta",
				colorVar: "dsw-static-red-400",
				price: {
					currency: "USD",
					input: .1,
					cacheHit: .025,
					output: .3
				}
			},
			{
				key: "other",
				name: "其他模型",
				provider: "Custom",
				colorVar: "dsw-static-neutral-bluish-500",
				price: {
					currency: "CNY",
					input: .5,
					cacheHit: .25,
					cacheMiss: .5,
					output: 1.5
				}
			}
		];
		/** Lookup a model by its stats key; falls back to the generic `other` entry. */
		function modelOf(key) {
			const base = MODEL_CATALOG.find((entry) => entry.key === key) ?? (() => {
				const fallback = MODEL_CATALOG.at(-1);
				if (fallback !== void 0) return fallback;
				throw new Error("MODEL_CATALOG must not be empty");
			})();
			const live = livePrices?.[key];
			if (live === void 0) return base;
			return {
				...base,
				price: {
					currency: "USD",
					input: live.input,
					cacheHit: live.cacheHit,
					output: live.output
				}
			};
		}
		/** Resolve a price-table row by its CSS variable name (theme token or fallback color). */
		function resolveToken(name) {
			const value = getComputedStyle(document.documentElement).getPropertyValue(`--${name}`).trim();
			return value !== "" ? value : "#8b95a3";
		}
		/**
		* Price one band's token usage in CNY. The stats `input` field is the TOTAL
		* prompt tokens (cacheHit + cacheMiss), so billing splits it: the cache-hit
		* share prices at the hit rate and the remaining share at the miss rate.
		* Providers that report only disjoint buckets carry `cacheMiss` explicitly;
		* otherwise the miss share is derived as `input - cacheHit`. Only USD-priced
		* bands go through the exchange rate.
		*/
		function priceBandCost(band, buckets, currency) {
			const miss = buckets.cacheMiss > 0 ? buckets.cacheMiss : Math.max(0, buckets.input - buckets.cacheHit);
			const hit = Math.min(buckets.cacheHit, buckets.input);
			const raw = (miss * (band.cacheMiss ?? band.input) + hit * band.cacheHit + buckets.output * band.output) / 1e6;
			return currency === "USD" ? raw * currentRate() : raw;
		}
		/**
		* Estimate the CNY cost of one model's token usage, mixing the peak and
		* off-peak bands by the given peak share (flat-priced models cost the same in
		* both bands).
		*
		* 计费维度是「缓存命中价 × 时段价」的交叉：每个时段档内部分别按缓存命中
		* 价（cacheHit）与未命中价（input/cacheMiss）计价，两个时段档再按
		* peakShare 混合。时段定义以北京时间为准（如 DeepSeek V4 高峰
		* 09:00-12:00 / 14:00-18:00）。因聚合只有按日 token 量、没有请求级时间戳，
		* 时段只能按比例估算，而非逐请求判定。
		* @param entry - the catalog entry whose prices apply.
		* @param buckets - token usage counts.
		* @param peakShare - share of traffic in the peak band (0..1); defaults to {@link DEFAULT_PEAK_SHARE}.
		* @returns the estimated cost in CNY.
		*/
		function computeCost(entry, buckets, peakShare = DEFAULT_PEAK_SHARE) {
			if (isSubscriptionPlan(entry.key)) return 0;
			const peak = priceBandCost(entry.price, buckets, entry.price.currency);
			const off = entry.price.offPeak === void 0 ? peak : priceBandCost(entry.price.offPeak, buckets, entry.price.currency);
			return peak * peakShare + off * (1 - peakShare);
		}
		/** Format a CNY amount with adaptive precision. */
		function formatMoney(cny) {
			const value = Number(cny);
			if (!Number.isFinite(value)) return "¥0";
			if (value >= 1e3) return `¥${value.toFixed(0)}`;
			if (value >= 10) return `¥${value.toFixed(1)}`;
			if (value >= .1) return `¥${value.toFixed(2)}`;
			return `¥${value.toFixed(3)}`;
		}
		/**
		* Format a per-1M-token price in its native currency (free when the rate is
		* zero): CNY for domestic models, USD for overseas ones.
		*/
		function formatUnitPrice(price, currency = "CNY") {
			if (price === 0) return "免费";
			if (currency === "USD") {
				if (price >= 10) return `$${price.toFixed(1)}`;
				return `$${price.toFixed(2)}`;
			}
			if (price >= 10) return `¥${price.toFixed(1)}`;
			return `¥${price.toFixed(2)}`;
		}
		/** Format a large token count with B/M/K suffix. */
		function formatTokens(value) {
			if (value >= 1e9) return `${(value / 1e9).toFixed(2)}B`;
			if (value >= 1e6) return `${(value / 1e6).toFixed(1)}M`;
			if (value >= 1e3) return `${(value / 1e3).toFixed(0)}K`;
			return String(value);
		}
		/** Format a percentage. */
		function formatPercent(value) {
			const normalized = Number(value);
			if (!Number.isFinite(normalized)) return "0.0%";
			return `${normalized.toFixed(1)}%`;
		}
		//#endregion
		//#region src/client/TrendChart.tsx
		/**
		* TrendChart: dependency-free SVG chart of daily cost + calls.
		*
		* The columns are GROUPED per model — one bar per model per day, each in its
		* brand color, so per-model cost is directly comparable. The blue line is the
		* total call volume across all models, plotted on its own right-hand axis.
		* A hover crosshair shows the day's model breakdown. No chart library — the
		* surface stays self-contained and offline.
		*/
		/** Fixed viewBox; the SVG scales to its container. */
		const W = 680;
		const H = 220;
		const PAD = {
			top: 18,
			right: 40,
			bottom: 26,
			left: 46
		};
		/** Split a date into `M/D` for axis labels. */
		function shortDate(iso) {
			const [, month, day] = iso.split("-");
			return `${Number(month)}/${Number(day)}`;
		}
		/** Compact tick label for the calls axis: `1.2K` / `3.4M`. */
		function shortNumber(value) {
			if (value >= 1e6) return `${(value / 1e6).toFixed(1)}M`;
			if (value >= 1e3) return `${(value / 1e3).toFixed(1)}K`;
			return String(Math.round(value));
		}
		/** Ticks every `step` items for sparse axis labels. */
		function tickIndexes(length, step) {
			const out = [];
			for (let i = 0; i < length; i += step) out.push(i);
			if (length > 0 && out[out.length - 1] !== length - 1) out.push(length - 1);
			return out;
		}
		/** Single-color fallback identity used when the stats carry no per-model detail. */
		const TOTAL_MODEL = {
			key: "__total__",
			name: "总计",
			color: ""
		};
		/**
		* Render the daily grouped cost bars plus the total-calls line.
		* @param props.data - sorted daily rows (ascending date).
		* @param props.models - the model legend, in bar order.
		*/
		function TrendChart({ data, models = [] }) {
			const [hover, setHover] = (0, react.useState)(null);
			const layout = (0, react.useMemo)(() => {
				const n = data.length;
				if (n === 0) return null;
				const plotW = W - PAD.left - PAD.right;
				const plotH = H - PAD.top - PAD.bottom;
				const inner = (i) => {
					if (n === 1) return PAD.left + plotW / 2;
					return PAD.left + plotW * i / (n - 1);
				};
				const maxCost = Math.max(...data.flatMap((d) => Object.values(d.byModel ?? {})), ...data.map((d) => d.cost), 1e-4);
				const yCost = (value) => PAD.top + plotH - value / maxCost * plotH;
				const maxCalls = Math.max(...data.map((d) => d.calls), 1);
				const yCalls = (value) => PAD.top + plotH - value / maxCalls * plotH;
				const groupW = plotW / n;
				const barCount = Math.max(models.length, 1);
				const barW = Math.min(14, groupW / barCount * .7);
				return {
					n,
					plotW,
					plotH,
					inner,
					yCost,
					yCalls,
					barW,
					bars: data.flatMap((d, i) => {
						if (models.length === 0) return [{
							date: d.date,
							model: TOTAL_MODEL,
							x: inner(i) - barW / 2,
							value: d.cost
						}];
						return models.map((model, k) => ({
							date: d.date,
							model,
							x: inner(i) - groupW / 2 + groupW * (k + .5) / models.length - barW / 2,
							value: d.byModel?.[model.key] ?? 0
						}));
					}),
					costTicks: [
						0,
						.25,
						.5,
						.75,
						1
					].map((f) => maxCost * f).reverse(),
					callsTicks: [
						0,
						.25,
						.5,
						.75,
						1
					].map((f) => maxCalls * f).reverse(),
					linePath: data.map((d, i) => {
						const y = yCalls(d.calls);
						return `${i === 0 ? "M" : "L"}${inner(i)} ${y}`;
					}).join(" ")
				};
			}, [data, models]);
			if (layout === null) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: UsageBilling_module_css_default.chartEmpty,
				children: "暂无趋势数据"
			});
			const { n, plotW, plotH, inner, yCost, yCalls, barW, bars, costTicks, callsTicks, linePath } = layout;
			const activePoint = hover === null ? void 0 : data[hover];
			const indices = tickIndexes(n, Math.max(1, Math.ceil(n / 8)));
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: UsageBilling_module_css_default.chartWrap,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("svg", {
						viewBox: `0 0 ${W} ${H}`,
						className: UsageBilling_module_css_default.chartSvg,
						role: "img",
						"aria-label": "Daily cost by model and total calls",
						onMouseLeave: () => {
							setHover(null);
						},
						onMouseMove: (e) => {
							const rect = e.currentTarget.getBoundingClientRect();
							const ratio = ((e.clientX - rect.left) / rect.width * W - PAD.left) / plotW;
							const index = Math.round(ratio * (n - 1));
							setHover(Math.min(Math.max(index, 0), n - 1));
						},
						children: [
							costTicks.map((value, idx) => {
								const y = yCost(value);
								return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("g", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("line", {
									x1: PAD.left,
									x2: W - PAD.right,
									y1: y,
									y2: y,
									className: UsageBilling_module_css_default.chartGrid
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("text", {
									x: PAD.left - 8,
									y: y + 3,
									textAnchor: "end",
									className: UsageBilling_module_css_default.chartAxisLabel,
									children: formatMoney(value)
								})] }, `cost-${idx}`);
							}),
							bars.map((bar) => bar.value > 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("rect", {
								x: bar.x,
								y: yCost(bar.value),
								width: barW,
								height: yCost(0) - yCost(bar.value),
								rx: 2,
								className: bar.model.color === "" ? UsageBilling_module_css_default.chartBar : UsageBilling_module_css_default.chartStack,
								style: bar.model.color === "" ? void 0 : { fill: bar.model.color }
							}, `${bar.date}-${bar.model.key}`) : null),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
								d: linePath,
								fill: "none",
								className: UsageBilling_module_css_default.chartLine
							}),
							callsTicks.map((value, idx) => {
								const y = yCalls(value);
								return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("text", {
									x: W - PAD.right + 8,
									y: y + 3,
									textAnchor: "start",
									className: UsageBilling_module_css_default.chartAxisLabel,
									children: shortNumber(value)
								}, `calls-${idx}`);
							}),
							indices.map((i) => {
								const point = data[i];
								if (point === void 0) return null;
								return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("text", {
									x: inner(i),
									y: H - 6,
									textAnchor: "middle",
									className: UsageBilling_module_css_default.chartAxisLabel,
									children: shortDate(point.date)
								}, point.date);
							}),
							hover !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("line", {
								x1: inner(hover),
								x2: inner(hover),
								y1: PAD.top,
								y2: PAD.top + plotH,
								className: UsageBilling_module_css_default.chartCrosshair
							})
						]
					}),
					activePoint !== void 0 && hover !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: UsageBilling_module_css_default.chartTooltip,
						style: {
							left: `${inner(hover) / W * 100}%`,
							top: `${yCost(activePoint.cost) / H * 100}%`
						},
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: UsageBilling_module_css_default.chartTooltipDate,
								children: activePoint.date
							}),
							models.filter((model) => (activePoint.byModel?.[model.key] ?? 0) > 0).map((model) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: UsageBilling_module_css_default.chartTooltipRow,
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: UsageBilling_module_css_default.chartTooltipSwatch,
										style: { background: model.color }
									}),
									model.name,
									" ",
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", { children: formatMoney(activePoint.byModel?.[model.key] ?? 0) })
								]
							}, model.key)),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: UsageBilling_module_css_default.chartTooltipRow,
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { className: UsageBilling_module_css_default.chartLegendBar }),
									"总计 ",
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", { children: formatMoney(activePoint.cost) })
								]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: UsageBilling_module_css_default.chartTooltipRow,
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { className: UsageBilling_module_css_default.chartLegendLine }),
									"调用 ",
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", { children: activePoint.calls.toLocaleString() })
								]
							})
						]
					}),
					models.length > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: UsageBilling_module_css_default.chartLegend,
						children: [models.map((model) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: UsageBilling_module_css_default.chartTooltipSwatch,
							style: { background: model.color }
						}), model.name] }, model.key)), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { className: UsageBilling_module_css_default.chartLegendLine }), "调用"] })]
					})
				]
			});
		}
		//#endregion
		//#region src/client/UsageBilling.tsx
		/**
		* UsageBilling: sidebar footer trigger + full billing dashboard modal.
		*
		* The trigger sits above Settings in the sidebar footer (rail shows an icon,
		* wide shows a pill with the running total). Clicking opens a centered modal
		* dashboard: hero total, KPI tiles, a dependency-free SVG daily trend chart,
		* a per-model billing table priced from the built-in catalog, and a pricing
		* table. Data comes from the host's `/api/billing/usage-stats` endpoint;
		* before real data arrives the dashboard shows an empty (zero) snapshot,
		* never fabricated samples.
		*/
		/** Idle health state before the probe settles. */
		const IDLE_HEALTH = {
			checked: false,
			available: false,
			providers: 0,
			failures: 0,
			okProviders: [],
			badProviders: []
		};
		/**
		* The dashboard's display names (中文厂商名) never equal the provider names a
		* user actually configures (deepseek, zhipu, qwen…), so the dot match also
		* accepts a bidirectional substring hit and a display-name alias list.
		*/
		const PROVIDER_ALIASES = {
			"DeepSeek": ["deepseek"],
			"智谱 AI": [
				"zhipu",
				"glm",
				"z.ai"
			],
			"阿里通义": [
				"qwen",
				"tongyi",
				"dashscope",
				"aliyun"
			],
			"字节豆包": [
				"doubao",
				"volcengine",
				"ark"
			],
			"月之暗面": ["moonshot", "kimi"],
			"MiniMax": ["minimax"],
			"百度文心": [
				"ernie",
				"wenxin",
				"qianfan",
				"baidu"
			],
			"腾讯混元": ["hunyuan", "tencent"],
			"零一万物": [
				"01.ai",
				"lingyi",
				"yi"
			],
			"阶跃星辰": [
				"step",
				"stepfun",
				"step-3.7"
			],
			"科大讯飞": [
				"spark",
				"xfyun",
				"iflytek"
			],
			"商汤": ["sensenova", "sensetime"],
			"百川智能": ["baichuan"],
			"OpenAI": ["openai"],
			"Google": ["google", "gemini"],
			"xAI": ["xai", "grok"],
			"Meta": ["meta", "llama"]
		};
		/** Normalize a provider name for dot matching: lower case, no spaces. */
		function normalizeProvider(name) {
			return name.trim().toLowerCase().replace(/[\s_/-]+/g, "");
		}
		/** Whether one normalized name is a substring of the other (length-guarded). */
		function providerNameHits(display, live) {
			if (display.length === 0 || live.length === 0) return false;
			if (display === live) return true;
			const [short, long] = display.length <= live.length ? [display, live] : [live, display];
			return short.length >= 3 && long.includes(short);
		}
		/** Whether a catalog display name matches one live provider name. */
		function providerMatches(display, live) {
			const displayKey = normalizeProvider(display);
			const liveKey = normalizeProvider(live);
			if (providerNameHits(displayKey, liveKey)) return true;
			const aliases = PROVIDER_ALIASES[display];
			return aliases !== void 0 && aliases.some((alias) => providerNameHits(normalizeProvider(alias), liveKey));
		}
		/** Resolve one provider's dot state: green when live, red when failed, gray when unknown. */
		function providerDot(health, provider) {
			if (!health.checked) return UsageBilling_module_css_default.healthIdle;
			if (health.okProviders.some((live) => providerMatches(provider, live))) return UsageBilling_module_css_default.healthOk;
			if (health.badProviders.some((live) => providerMatches(provider, live))) return UsageBilling_module_css_default.healthBad;
			return UsageBilling_module_css_default.healthIdle;
		}
		/** Path to the usage-stats endpoint served by this plugin's node half. */
		const USAGE_STATS_PATH = "/api/billing/usage-stats";
		/** Path to the live-pricing endpoint served by this plugin's node half. */
		const PRICING_PATH = "/api/billing/pricing";
		/** Path to the account-balance endpoint served by this plugin's node half. */
		const BALANCE_PATH = "/api/billing/balance";
		/** 弹窗打开期间统计与定价的自动刷新间隔（毫秒）。 */
		const STATS_REFRESH_INTERVAL_MS = 3e4;
		/**
		* 本地时区（北京时间）日期戳：与服务端聚合的 dayStamp 一致。不要用
		* `toISOString()`——那是 UTC，北京时间的凌晨 0-8 点会取到前一天。
		*/
		function localDayStamp(time = Date.now()) {
			const date = new Date(time);
			const pad = (n) => String(n).padStart(2, "0");
			return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
		}
		/** 本地时区时钟：`HH:MM:SS`。 */
		function formatClock(time) {
			const date = new Date(time);
			const pad = (n) => String(n).padStart(2, "0");
			return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
		}
		/**
		* 高区分度图表色板：趋势图柱、图例与计费表圆点按模型分配。不用模型品牌色
		* （目录里多为蓝色系，视觉上几乎分不开），保证每个模型一眼可辨。
		*/
		const CHART_PALETTE = [
			"#3b82f6",
			"#06b6d4",
			"#8b5cf6",
			"#f59e0b",
			"#10b981",
			"#ef4444",
			"#ec4899",
			"#6366f1",
			"#f97316",
			"#14b8a6"
		];
		/** Empty snapshot: shown before (or without) real host data — zeros, never fabricated samples. */
		const EMPTY_STATS = {
			total: {
				calls: 0,
				input: 0,
				output: 0,
				cacheHit: 0,
				cacheMiss: 0,
				cost: 0
			},
			byModel: {},
			byDay: {},
			byDayModels: {}
		};
		/** Try to load stats from the server; returns null when no valid JSON stats are served. */
		async function loadUsageStats() {
			try {
				const response = await fetch(USAGE_STATS_PATH);
				if (!response.ok) return null;
				const text = await response.text();
				const parsed = JSON.parse(text);
				if (parsed === null || typeof parsed !== "object" || !("total" in parsed)) return null;
				const candidate = parsed;
				return {
					total: candidate.total ?? EMPTY_STATS.total,
					byModel: candidate.byModel ?? {},
					byDay: candidate.byDay ?? {},
					...candidate.byDayModels !== void 0 ? { byDayModels: candidate.byDayModels } : {},
					...candidate.updatedAt !== void 0 ? { updatedAt: candidate.updatedAt } : {}
				};
			} catch {
				return null;
			}
		}
		/**
		* Apply the node half's live pricing snapshot. The node half refreshes once
		* at boot, so an early `builtin` answer may just mean the refresh is still
		* in flight — retry briefly before settling for the built-in values.
		* Any final failure keeps the built-in catalog and rate — degrade, never
		* fabricate.
		* @param attempt - current retry index (0-based).
		*/
		async function loadLivePricing(attempt = 0) {
			const MAX_ATTEMPTS = 4;
			try {
				const response = await fetch(PRICING_PATH);
				if (!response.ok) return;
				const text = await response.text();
				const parsed = JSON.parse(text);
				if (parsed === null || typeof parsed !== "object" || !("source" in parsed)) return;
				const pricing = parsed;
				if (pricing.source === "builtin" && attempt < MAX_ATTEMPTS - 1) {
					setTimeout(() => {
						loadLivePricing(attempt + 1);
					}, 2e3);
					return;
				}
				applyLivePricing(pricing);
			} catch {}
		}
		/**
		* 拉取各提供方账户余额（供模型计费明细表的余额列）；失败返回空列表。
		* @returns the balance rows, or an empty list on any failure.
		*/
		async function fetchBalances() {
			try {
				const response = await fetch(BALANCE_PATH);
				if (!response.ok) return [];
				const text = await response.text();
				const parsed = JSON.parse(text);
				if (parsed !== null && typeof parsed === "object" && "balances" in parsed) return parsed.balances;
				return [];
			} catch {
				return [];
			}
		}
		/**
		* Sidebar footer trigger: compact pill in wide mode, icon in rail mode.
		* @param props - framework props plus `wide` column state.
		*/
		function UsageBillingTrigger(props) {
			const { wide, t, onOpen, monthCost, todayCost } = props;
			const cardIcon = /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("svg", {
				viewBox: "0 0 24 24",
				fill: "none",
				stroke: "currentColor",
				"aria-hidden": "true",
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("rect", {
						x: "2.5",
						y: "5",
						width: "19",
						height: "14",
						rx: "2.5"
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M2.5 9.5h19" }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("rect", {
						x: "6",
						y: "12",
						width: "4",
						height: "3.5",
						rx: "0.75"
					})
				]
			});
			if (!wide) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
				type: "button",
				className: UsageBilling_module_css_default.railButton,
				onClick: onOpen,
				title: `${t("billing.title")} · ${formatMoney(monthCost)}`,
				children: cardIcon
			});
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
				type: "button",
				className: UsageBilling_module_css_default.trigger,
				onClick: onOpen,
				title: `${t("billing.title")} · 本月 ${formatMoney(monthCost)}`,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: UsageBilling_module_css_default.triggerIcon,
						children: cardIcon
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
						className: UsageBilling_module_css_default.triggerToday,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: UsageBilling_module_css_default.triggerMeta,
							children: "今日"
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: UsageBilling_module_css_default.triggerAmount,
							children: formatMoney(todayCost)
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { className: UsageBilling_module_css_default.triggerDivider }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
						className: UsageBilling_module_css_default.triggerMonth,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: UsageBilling_module_css_default.triggerMeta,
							children: "当月"
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: UsageBilling_module_css_default.triggerAmountSub,
							children: formatMoney(monthCost)
						})]
					})
				]
			});
		}
		/**
		* The centered billing dashboard modal.
		* @param props - stats, locale function, close handler, model health, balances.
		*/
		function BillingDashboard({ stats, t, onClose, health, balances }) {
			const { total, byModel, byDay } = stats;
			const [pricingOpen, setPricingOpen] = (0, react.useState)(false);
			const rateInfo = getRateInfo();
			const balanceFor = (provider) => balances.find((balance) => normalizeProvider(balance.provider) === normalizeProvider(provider));
			const renderBalance = (balance) => {
				if (balance === void 0) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					className: UsageBilling_module_css_default.na,
					children: "—"
				});
				if (balance.error === "unconfigured") return t("billing.balanceUnconfigured");
				if (balance.error === "unauthorized") return t("billing.balanceUnauthorized");
				if (balance.error === "unreachable") return t("billing.balanceUnreachable");
				if (balance.totalBalance === void 0) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					className: UsageBilling_module_css_default.na,
					children: "—"
				});
				return balance.currency === "USD" ? `$${balance.totalBalance.toFixed(2)}` : formatMoney(balance.totalBalance);
			};
			const cacheHitRate = total.cacheHit + total.cacheMiss > 0 ? total.cacheHit / (total.cacheHit + total.cacheMiss) * 100 : 0;
			const dates = Object.keys(byDay).sort();
			const today = localDayStamp();
			const todayCost = byDay[today]?.cost ?? 0;
			const monthPrefix = today.slice(0, 7);
			const yearPrefix = today.slice(0, 4);
			const monthCost = dates.reduce((sum, d) => sum + (d.startsWith(monthPrefix) ? byDay[d]?.cost ?? 0 : 0), 0);
			const monthCalls = dates.reduce((sum, d) => sum + (d.startsWith(monthPrefix) ? byDay[d]?.calls ?? 0 : 0), 0);
			const yearCost = dates.reduce((sum, d) => sum + (d.startsWith(yearPrefix) ? byDay[d]?.cost ?? 0 : 0), 0);
			const trendDates = (0, react.useMemo)(() => {
				const out = [];
				for (let offset = 6; offset >= 0; offset -= 1) {
					const day = /* @__PURE__ */ new Date();
					day.setDate(day.getDate() - offset);
					out.push(localDayStamp(day.getTime()));
				}
				return out;
			}, []);
			const latestDate = trendDates.at(-1) ?? today;
			const trend = (0, react.useMemo)(() => trendDates.map((date) => {
				const byModel = {};
				const dayModels = stats.byDayModels?.[date];
				if (dayModels !== void 0) {
					for (const [key, data] of Object.entries(dayModels)) if (data.cost > 0) byModel[key] = data.cost;
				}
				const day = byDay[date];
				return {
					date,
					cost: day?.cost ?? 0,
					calls: day?.calls ?? 0,
					byModel
				};
			}), [
				trendDates,
				byDay,
				stats.byDayModels
			]);
			const modelRows = (0, react.useMemo)(() => Object.entries(byModel).filter(([, data]) => data.calls > 0).map(([key, data]) => {
				const entry = modelOf(key);
				const buckets = {
					input: data.input,
					cacheHit: data.cacheHit,
					cacheMiss: data.cacheMiss,
					output: data.output
				};
				return {
					key,
					name: entry.name,
					provider: entry.provider,
					calls: data.calls,
					input: data.input,
					output: data.output,
					cacheHitRate: data.cacheHit + data.cacheMiss > 0 ? data.cacheHit / (data.cacheHit + data.cacheMiss) * 100 : 0,
					estimated: computeCost(entry, buckets),
					plan: isSubscriptionPlan(key),
					...data.cost > 0 ? { actual: data.cost } : {}
				};
			}).sort((a, b) => (b.actual ?? b.estimated) - (a.actual ?? a.estimated)).map((row, index) => ({
				...row,
				color: CHART_PALETTE[index % CHART_PALETTE.length] ?? "#8b95a3"
			})), [byModel]);
			const estimatedTotal = modelRows.reduce((sum, row) => sum + row.estimated, 0);
			const displayTotal = total.cost > 0 ? total.cost : estimatedTotal;
			const avgPerCall = total.calls > 0 ? displayTotal / total.calls : 0;
			const chartModels = (0, react.useMemo)(() => modelRows.map((row) => ({
				key: row.key,
				name: row.name,
				color: row.color
			})), [modelRows]);
			const prevDayCost = trend.length >= 2 ? trend.at(-2)?.cost ?? 0 : 0;
			const deltaPct = prevDayCost > 0 ? (todayCost - prevDayCost) / prevDayCost * 100 : 0;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Modal, {
				open: true,
				onClose,
				title: t("billing.title"),
				headless: true,
				className: UsageBilling_module_css_default.dashboardModal ?? "",
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: UsageBilling_module_css_default.dashboard,
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: UsageBilling_module_css_default.dashboardHead,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h2", {
							className: UsageBilling_module_css_default.dashboardTitle,
							children: t("billing.title")
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("p", {
							className: UsageBilling_module_css_default.dashboardSubtitle,
							children: [
								t("billing.lastUpdated"),
								" ",
								latestDate
							]
						})] }), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: UsageBilling_module_css_default.dashboardRight,
							children: [health.checked && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
								className: clsx(UsageBilling_module_css_default.healthBadge, health.available ? UsageBilling_module_css_default.healthBadgeOk : UsageBilling_module_css_default.healthBadgeBad),
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: clsx(UsageBilling_module_css_default.healthDot, health.available ? UsageBilling_module_css_default.healthOk : UsageBilling_module_css_default.healthBad),
									"aria-hidden": "true"
								}), health.available ? `${health.providers} 模型可用${health.failures > 0 ? ` · ${health.failures} 失效` : ""}` : `${health.failures} 模型不可用`]
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: UsageBilling_module_css_default.closeButton,
								"aria-label": t("billing.close"),
								onClick: onClose,
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("svg", {
									viewBox: "0 0 24 24",
									fill: "none",
									stroke: "currentColor",
									"aria-hidden": "true",
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M18 6 6 18" }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "m6 6 12 12" })]
								})
							})]
						})]
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: UsageBilling_module_css_default.dashboardBody,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
								className: UsageBilling_module_css_default.hero,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: UsageBilling_module_css_default.heroMain,
									children: [
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: UsageBilling_module_css_default.heroLabel,
											children: t("billing.monthCost")
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: UsageBilling_module_css_default.heroValue,
											children: formatMoney(monthCost)
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
											className: UsageBilling_module_css_default.heroMeta,
											children: [
												monthCalls.toLocaleString(),
												" ",
												t("billing.calls")
											]
										})
									]
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: UsageBilling_module_css_default.heroSide,
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										className: UsageBilling_module_css_default.heroSideItem,
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: UsageBilling_module_css_default.heroSideLabel,
											children: t("billing.yearCost")
										}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: UsageBilling_module_css_default.heroSideValue,
											children: formatMoney(yearCost)
										})]
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										className: UsageBilling_module_css_default.heroSideItem,
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: UsageBilling_module_css_default.heroSideLabel,
											children: t("billing.todayCost")
										}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
											className: UsageBilling_module_css_default.heroSideValue,
											children: [formatMoney(todayCost), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
												className: clsx(UsageBilling_module_css_default.delta, deltaPct >= 0 ? UsageBilling_module_css_default.deltaUp : UsageBilling_module_css_default.deltaDown),
												children: [
													deltaPct >= 0 ? "▲" : "▼",
													" ",
													Math.abs(deltaPct).toFixed(1),
													"%"
												]
											})]
										})]
									})]
								})]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
								className: UsageBilling_module_css_default.kpiGrid,
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										className: UsageBilling_module_css_default.kpiTile,
										children: [
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
												className: UsageBilling_module_css_default.kpiLabel,
												children: t("billing.cacheHitRate")
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
												className: clsx(UsageBilling_module_css_default.kpiValue, UsageBilling_module_css_default.kpiGreen),
												children: formatPercent(cacheHitRate)
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
												className: UsageBilling_module_css_default.kpiDetail,
												children: [
													formatTokens(total.cacheHit),
													" / ",
													formatTokens(total.cacheHit + total.cacheMiss)
												]
											})
										]
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										className: UsageBilling_module_css_default.kpiTile,
										children: [
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
												className: UsageBilling_module_css_default.kpiLabel,
												children: t("billing.tokens")
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
												className: UsageBilling_module_css_default.kpiValue,
												children: formatTokens(total.input + total.output)
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
												className: UsageBilling_module_css_default.kpiDetail,
												children: [
													t("billing.inputTokens"),
													" ",
													formatTokens(total.input),
													" · ",
													t("billing.outputTokens"),
													" ",
													formatTokens(total.output)
												]
											})
										]
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										className: UsageBilling_module_css_default.kpiTile,
										children: [
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
												className: UsageBilling_module_css_default.kpiLabel,
												children: t("billing.avgCost")
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
												className: UsageBilling_module_css_default.kpiValue,
												children: formatMoney(avgPerCall)
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
												className: UsageBilling_module_css_default.kpiDetail,
												children: [
													t("billing.calls"),
													" ",
													total.calls.toLocaleString()
												]
											})
										]
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										className: UsageBilling_module_css_default.kpiTile,
										children: [
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
												className: UsageBilling_module_css_default.kpiLabel,
												children: t("billing.calls")
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
												className: UsageBilling_module_css_default.kpiValue,
												children: total.calls.toLocaleString()
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
												className: UsageBilling_module_css_default.kpiDetail,
												children: [
													modelRows.length,
													" ",
													t("billing.models")
												]
											})
										]
									})
								]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
								className: UsageBilling_module_css_default.panel,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: UsageBilling_module_css_default.panelHead,
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h3", {
										className: UsageBilling_module_css_default.panelTitle,
										children: t("billing.trend")
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: UsageBilling_module_css_default.panelHint,
										children: latestDate
									})]
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(TrendChart, {
									data: trend,
									models: chartModels
								})]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
								className: UsageBilling_module_css_default.panel,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: UsageBilling_module_css_default.panelHead,
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h3", {
										className: UsageBilling_module_css_default.panelTitle,
										children: t("billing.models")
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: UsageBilling_module_css_default.panelHint,
										children: stats.updatedAt !== void 0 ? `${t("billing.lastUpdated")} ${formatClock(stats.updatedAt)}` : ""
									})]
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									className: UsageBilling_module_css_default.tableScroll,
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("table", {
										className: UsageBilling_module_css_default.modelTable,
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("thead", { children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("tr", { children: [
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", { children: t("billing.models") }),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", {
												className: UsageBilling_module_css_default.numCol,
												children: t("billing.calls")
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", {
												className: UsageBilling_module_css_default.numCol,
												children: t("billing.inputTokens")
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", {
												className: UsageBilling_module_css_default.numCol,
												children: t("billing.outputTokens")
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", {
												className: UsageBilling_module_css_default.numCol,
												children: t("billing.cacheHitRate")
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", {
												className: UsageBilling_module_css_default.numCol,
												children: t("billing.actual")
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", {
												className: UsageBilling_module_css_default.numCol,
												children: t("billing.balance")
											})
										] }) }), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("tbody", { children: [modelRows.length === 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("tr", { children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", {
											colSpan: 7,
											className: UsageBilling_module_css_default.emptyRow,
											children: t("billing.noData")
										}) }), modelRows.map((row) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("tr", { children: [
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", { children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
												className: UsageBilling_module_css_default.modelCell,
												children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
													className: clsx(UsageBilling_module_css_default.modelDot, providerDot(health, row.provider)),
													"aria-hidden": "true"
												}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
													className: UsageBilling_module_css_default.modelName,
													children: row.name
												}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
													className: UsageBilling_module_css_default.modelProvider,
													children: row.provider
												})] })]
											}) }),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", {
												className: UsageBilling_module_css_default.numCol,
												children: row.calls.toLocaleString()
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", {
												className: UsageBilling_module_css_default.numCol,
												children: formatTokens(row.input)
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", {
												className: UsageBilling_module_css_default.numCol,
												children: formatTokens(row.output)
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", {
												className: UsageBilling_module_css_default.numCol,
												children: formatPercent(row.cacheHitRate)
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", {
												className: UsageBilling_module_css_default.numCol,
												children: row.plan ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
													className: UsageBilling_module_css_default.planTag,
													children: "订阅包含"
												}) : row.actual !== void 0 ? formatMoney(row.actual) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
													className: UsageBilling_module_css_default.na,
													children: "—"
												})
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", {
												className: UsageBilling_module_css_default.numCol,
												children: renderBalance(balanceFor(row.provider))
											})
										] }, row.key))] })]
									})
								})]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
								className: UsageBilling_module_css_default.panel,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
									type: "button",
									className: UsageBilling_module_css_default.pricingToggle,
									onClick: () => {
										setPricingOpen((prev) => !prev);
									},
									"aria-expanded": pricingOpen,
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
										className: UsageBilling_module_css_default.pricingToggleText,
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: UsageBilling_module_css_default.panelTitle,
											children: t("billing.pricing")
										}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
											className: UsageBilling_module_css_default.panelHint,
											children: [
												t("billing.todayRate"),
												" 1 USD = ",
												formatMoney(rateInfo.rate),
												/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
													className: clsx(UsageBilling_module_css_default.rateBadge, rateInfo.live ? UsageBilling_module_css_default.rateBadgeLive : UsageBilling_module_css_default.rateBadgeBuiltin),
													children: rateInfo.live ? t("billing.rateLive") : t("billing.rateBuiltin")
												})
											]
										})]
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("svg", {
										className: clsx(UsageBilling_module_css_default.pricingChevron, pricingOpen && UsageBilling_module_css_default.pricingChevronOpen),
										viewBox: "0 0 24 24",
										fill: "none",
										stroke: "currentColor",
										"aria-hidden": "true",
										children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "m6 9 6 6 6-6" })
									})]
								}), pricingOpen && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									className: UsageBilling_module_css_default.tableScroll,
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("table", {
										className: UsageBilling_module_css_default.pricingTable,
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("thead", { children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("tr", { children: [
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", { children: "Model" }),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", {
												className: UsageBilling_module_css_default.numCol,
												children: t("billing.input")
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", {
												className: UsageBilling_module_css_default.numCol,
												children: t("billing.cacheHit")
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", {
												className: UsageBilling_module_css_default.numCol,
												children: t("billing.output")
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", { children: t("billing.band") })
										] }) }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("tbody", { children: MODEL_CATALOG.map((entry) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("tr", { children: [
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", { children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
												className: UsageBilling_module_css_default.modelCell,
												children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
													className: UsageBilling_module_css_default.modelDot,
													style: { background: resolveToken(entry.colorVar) }
												}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
													className: UsageBilling_module_css_default.modelName,
													children: entry.name
												}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
													className: UsageBilling_module_css_default.modelProvider,
													children: entry.provider
												})] })]
											}) }),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", {
												className: UsageBilling_module_css_default.numCol,
												children: entry.price.offPeak !== void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
													className: UsageBilling_module_css_default.bandPrice,
													children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: formatUnitPrice(entry.price.input, entry.price.currency) }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
														className: UsageBilling_module_css_default.bandPriceOff,
														children: formatUnitPrice(entry.price.offPeak.input, entry.price.currency)
													})]
												}) : formatUnitPrice(entry.price.input, entry.price.currency)
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", {
												className: UsageBilling_module_css_default.numCol,
												children: entry.price.offPeak !== void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
													className: UsageBilling_module_css_default.bandPrice,
													children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: formatUnitPrice(entry.price.cacheHit, entry.price.currency) }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
														className: UsageBilling_module_css_default.bandPriceOff,
														children: formatUnitPrice(entry.price.offPeak.cacheHit, entry.price.currency)
													})]
												}) : formatUnitPrice(entry.price.cacheHit, entry.price.currency)
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", {
												className: UsageBilling_module_css_default.numCol,
												children: entry.price.offPeak !== void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
													className: UsageBilling_module_css_default.bandPrice,
													children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: formatUnitPrice(entry.price.output, entry.price.currency) }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
														className: UsageBilling_module_css_default.bandPriceOff,
														children: formatUnitPrice(entry.price.offPeak.output, entry.price.currency)
													})]
												}) : formatUnitPrice(entry.price.output, entry.price.currency)
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", { children: entry.price.offPeak !== void 0 && entry.peakHours !== void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
												className: UsageBilling_module_css_default.bandTag,
												children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: [
													t("billing.peak"),
													" ",
													entry.peakHours
												] }), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
													className: UsageBilling_module_css_default.bandTagOff,
													children: [t("billing.offPeak"), " 50%"]
												})]
											}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
												className: UsageBilling_module_css_default.flatTag,
												children: t("billing.flat")
											}) })
										] }, entry.key)) })]
									})
								})]
							})
						]
					})]
				})
			});
		}
		/**
		* UsageBilling: sidebar trigger plus the billing dashboard modal.
		* @param props - framework-provided sidebar and locale props.
		*/
		function UsageBilling(props) {
			const { t, checkModels } = props;
			const [stats, setStats] = (0, react.useState)(EMPTY_STATS);
			const [health, setHealth] = (0, react.useState)(IDLE_HEALTH);
			const [balances, setBalances] = (0, react.useState)([]);
			const [open, setOpen] = (0, react.useState)(false);
			const close = (0, react.useCallback)(() => {
				setOpen(false);
			}, []);
			const reloadStats = (0, react.useCallback)(() => {
				loadUsageStats().then((data) => {
					if (data !== null) setStats(data);
				});
				fetchBalances().then((list) => {
					if (list.length > 0) setBalances(list);
				});
			}, []);
			const openDashboard = (0, react.useCallback)(() => {
				reloadStats();
				loadLivePricing();
				setOpen(true);
			}, [reloadStats]);
			(0, react.useEffect)(() => {
				reloadStats();
				loadLivePricing();
			}, [reloadStats]);
			(0, react.useEffect)(() => {
				const timer = setInterval(() => {
					reloadStats();
					loadLivePricing();
				}, STATS_REFRESH_INTERVAL_MS);
				return () => {
					clearInterval(timer);
				};
			}, [reloadStats]);
			(0, react.useEffect)(() => {
				let mounted = true;
				checkModels().then((result) => {
					if (mounted) setHealth(result);
				});
				return () => {
					mounted = false;
				};
			}, [checkModels]);
			const today = localDayStamp();
			const monthCost = Object.entries(stats.byDay).filter(([date]) => date.startsWith(today.slice(0, 7))).reduce((sum, [, day]) => sum + day.cost, 0);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(UsageBillingTrigger, {
				...props,
				onOpen: openDashboard,
				monthCost,
				todayCost: stats.byDay[today]?.cost ?? 0
			}), open && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(BillingDashboard, {
				stats,
				t,
				onClose: close,
				health,
				balances
			})] });
		}
		//#endregion
		//#region src/client/locales.ts
		const NS = "usageBilling";
		const zh = {
			"billing.title": "使用统计",
			"billing.subtitle": "计费仪表盘",
			"billing.cost": "费用",
			"billing.todayCost": "今日费用",
			"billing.monthCost": "本月费用",
			"billing.yearCost": "本年费用",
			"billing.totalCost": "总费用",
			"billing.calls": "调用",
			"billing.cacheHitRate": "缓存命中率",
			"billing.tokens": "Token",
			"billing.inputTokens": "输入",
			"billing.outputTokens": "输出",
			"billing.avgCost": "平均成本",
			"billing.trend": "每日费用与调用趋势",
			"billing.trendEmpty": "暂无趋势数据",
			"billing.models": "模型计费明细",
			"billing.estimated": "估算",
			"billing.actual": "实际",
			"billing.pricing": "模型单价表",
			"billing.showPricing": "查看模型单价",
			"billing.hidePricing": "收起单价表",
			"billing.pricePerM": "¥ / 1M tokens",
			"billing.input": "输入",
			"billing.output": "输出",
			"billing.cacheHit": "缓存命中",
			"billing.peak": "高峰",
			"billing.offPeak": "低谷",
			"billing.flat": "全天统一",
			"billing.peakHours": "高峰时段",
			"billing.band": "时段",
			"billing.openDashboard": "打开计费仪表盘",
			"billing.close": "关闭",
			"billing.lastUpdated": "数据更新于",
			"billing.noData": "暂无计费数据",
			"billing.todayRate": "今日汇率",
			"billing.rateLive": "实时",
			"billing.rateBuiltin": "内置",
			"billing.balance": "余额",
			"billing.balanceUnconfigured": "未配置",
			"billing.balanceUnauthorized": "密钥无效",
			"billing.balanceUnreachable": "查询失败"
		};
		const en = {
			"billing.title": "Usage",
			"billing.subtitle": "Billing dashboard",
			"billing.cost": "Cost",
			"billing.todayCost": "Today",
			"billing.monthCost": "This month",
			"billing.yearCost": "This year",
			"billing.totalCost": "Total",
			"billing.calls": "Calls",
			"billing.cacheHitRate": "Cache Hit",
			"billing.tokens": "Tokens",
			"billing.inputTokens": "Input",
			"billing.outputTokens": "Output",
			"billing.avgCost": "Avg cost",
			"billing.trend": "Daily cost & calls",
			"billing.trendEmpty": "No trend data yet",
			"billing.models": "Model billing",
			"billing.estimated": "Est.",
			"billing.actual": "Actual",
			"billing.pricing": "Model pricing",
			"billing.showPricing": "View pricing",
			"billing.hidePricing": "Hide pricing",
			"billing.pricePerM": "¥ / 1M tokens",
			"billing.input": "Input",
			"billing.output": "Output",
			"billing.cacheHit": "Cache hit",
			"billing.peak": "Peak",
			"billing.offPeak": "Off-peak",
			"billing.flat": "Flat",
			"billing.peakHours": "Peak hours",
			"billing.band": "Band",
			"billing.openDashboard": "Open billing dashboard",
			"billing.close": "Close",
			"billing.lastUpdated": "Updated",
			"billing.noData": "No billing data yet",
			"billing.todayRate": "Today rate",
			"billing.rateLive": "Live",
			"billing.rateBuiltin": "Built-in",
			"billing.balance": "Balance",
			"billing.balanceUnconfigured": "Not set",
			"billing.balanceUnauthorized": "Bad key",
			"billing.balanceUnreachable": "Unavailable"
		};
		//#endregion
		//#region src/client/apply.ts
		/** Required services for the usage billing surface. */
		const inject = [
			"slots",
			"locale",
			"connection"
		];
		/**
		* Client plugin body: the UsageBilling entry in the sidebar footer.
		* @param ctx - client root context.
		*/
		function apply(ctx) {
			ctx.effect(() => ctx.locale.register(NS, {
				zh,
				en
			}), "ui-usage-billing: dictionaries");
			ctx.slots.inject("sidebar.footer.action", () => ctx.slots.register({
				name: "sidebar.footer.action",
				id: "usage-billing",
				order: -10,
				locale: NS,
				inject: () => ({ checkModels: async () => {
					try {
						const { result } = await ctx.connection.api.llm.models({});
						if (!result.ok) return {
							checked: true,
							available: false,
							providers: 0,
							failures: 0,
							okProviders: [],
							badProviders: []
						};
						return {
							checked: true,
							available: result.value.groups.length > 0,
							providers: result.value.groups.length,
							failures: result.value.failures.length,
							okProviders: result.value.groups.map((group) => group.name),
							badProviders: result.value.failures.map((failure) => failure.name)
						};
					} catch {
						return {
							checked: true,
							available: false,
							providers: 0,
							failures: 0,
							okProviders: [],
							badProviders: []
						};
					}
				} })
			}, UsageBilling));
		}
		//#endregion
		exports.UsageBilling = UsageBilling;
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map