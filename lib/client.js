window.__ModuleLoader__.load({
	id: "@kenz1117/dsh-ui-usage-billing",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react = require("react");
		let _deepseek_ai_dsh_client_ui_primitives = require("@deepseek-ai/dsh-client-ui-primitives");
		let react_jsx_runtime = require("react/jsx-runtime");
		let _deepseek_ai_dsh_client_runtime_client = require("@deepseek-ai/dsh-client-runtime/client");
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
		const css = ".VWh0dG_railButton{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1);width:36px;height:36px;color:var(--dsw-static-blue-500);cursor:pointer;border-radius:10px;justify-content:center;align-items:center;padding:0;transition:background-color .14s,border-color .14s,color .14s;display:flex}.VWh0dG_railButton:hover,.VWh0dG_railButton:focus-visible{background:var(--dsw-alias-interactive-bg-hover);border-color:var(--dsw-alias-border-l3);color:var(--dsw-static-blue-400);outline:none}.VWh0dG_railButton svg{stroke-width:2px;width:18px;height:18px}.VWh0dG_trigger{border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-1);width:100%;color:var(--dsw-alias-label-primary);cursor:pointer;text-align:left;border-radius:12px;align-items:center;gap:12px;padding:10px 14px;transition:border-color .14s,background-color .14s;display:flex}.VWh0dG_trigger:hover,.VWh0dG_trigger:focus-visible{border-color:var(--dsw-alias-border-l2);background:var(--dsw-alias-interactive-bg-hover);outline:none}.VWh0dG_triggerIcon{width:16px;height:16px;color:var(--dsw-alias-label-tertiary);flex:none;justify-content:center;align-items:center;display:inline-flex}.VWh0dG_triggerIcon svg{stroke-width:1.8px;width:15px;height:15px}.VWh0dG_triggerToday,.VWh0dG_triggerMonth{align-items:baseline;gap:4px;min-width:0;display:flex}.VWh0dG_triggerDivider{background:var(--dsw-alias-border-l1);align-self:stretch;width:1px}.VWh0dG_triggerAmount{color:var(--dsw-alias-label-primary);letter-spacing:-.01em;font-variant-numeric:tabular-nums;white-space:nowrap;font-size:17px;font-weight:600;line-height:22px}.VWh0dG_triggerAmountSub{color:var(--dsw-alias-label-secondary);font-variant-numeric:tabular-nums;white-space:nowrap;font-size:13px;font-weight:600;line-height:18px}.VWh0dG_triggerMeta{color:var(--dsw-alias-label-tertiary);white-space:nowrap;font-size:10.5px;line-height:14px}.VWh0dG_dashboardModal{width:min(760px,100vw - 48px);max-height:min(760px,88vh)}.VWh0dG_dashboard{flex-direction:column;width:100%;max-height:min(760px,88vh);display:flex}.VWh0dG_dashboardHead{border-bottom:1px solid var(--dsw-alias-border-l1);justify-content:space-between;align-items:flex-start;gap:12px;padding:20px 24px 14px;display:flex}.VWh0dG_dashboardTitle{color:var(--dsw-alias-label-primary);margin:0;font-size:17px;font-weight:600;line-height:24px}.VWh0dG_dashboardSubtitle{color:var(--dsw-alias-label-caption);margin:3px 0 0;font-size:12px;line-height:17px}.VWh0dG_closeButton{width:30px;height:30px;color:var(--dsw-alias-label-secondary);cursor:pointer;background:0 0;border:none;border-radius:8px;flex:none;justify-content:center;align-items:center;transition:background-color .14s;display:inline-flex}.VWh0dG_closeButton:hover{background:var(--dsw-alias-interactive-bg-hover)}.VWh0dG_closeButton svg{stroke-width:2px;width:16px;height:16px}.VWh0dG_dashboardBody{flex-direction:column;gap:14px;padding:16px 24px 24px;display:flex;overflow-y:auto}.VWh0dG_hero{border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-1);border-radius:16px;justify-content:space-between;align-items:center;gap:24px;padding:20px 24px;display:flex}.VWh0dG_heroMain{flex-direction:column;gap:4px;min-width:0;display:flex}.VWh0dG_heroLabel{color:var(--dsw-alias-label-tertiary);white-space:nowrap;font-size:12px;line-height:17px}.VWh0dG_heroValue{letter-spacing:-.02em;color:var(--dsw-alias-label-primary);font-variant-numeric:tabular-nums;white-space:nowrap;font-size:40px;font-weight:600;line-height:48px}.VWh0dG_heroMeta{color:var(--dsw-alias-label-caption);white-space:nowrap;font-size:12px;line-height:17px}.VWh0dG_heroSide{flex-direction:column;flex:none;gap:10px;display:flex}.VWh0dG_heroSideItem{align-items:baseline;gap:8px;display:flex}.VWh0dG_heroSideLabel{color:var(--dsw-alias-label-tertiary);white-space:nowrap;font-size:12px;line-height:17px}.VWh0dG_heroSideValue{color:var(--dsw-alias-label-primary);font-variant-numeric:tabular-nums;white-space:nowrap;font-size:16px;font-weight:600;line-height:22px}.VWh0dG_delta{align-items:center;gap:2px;margin-left:4px;font-size:11px;font-weight:600;line-height:17px;display:inline-flex}.VWh0dG_deltaUp{color:var(--dsw-static-green-500)}.VWh0dG_deltaDown{color:var(--dsw-static-red-500)}.VWh0dG_kpiGrid{grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;display:grid}.VWh0dG_kpiTile{border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-1);border-radius:14px;flex-direction:column;gap:3px;padding:14px 15px;transition:border-color .14s,background-color .14s;display:flex}.VWh0dG_kpiTile:hover{border-color:var(--dsw-alias-border-l2);background:var(--dsw-alias-interactive-bg-hover)}.VWh0dG_kpiLabel{color:var(--dsw-alias-label-tertiary);font-size:11px;line-height:15px}.VWh0dG_kpiValue{color:var(--dsw-alias-label-primary);font-variant-numeric:tabular-nums;font-size:21px;font-weight:600;line-height:27px}.VWh0dG_kpiGreen{color:var(--dsw-static-green-500)}.VWh0dG_kpiDetail{color:var(--dsw-alias-label-caption);white-space:nowrap;text-overflow:ellipsis;font-size:11px;line-height:15px;overflow:hidden}.VWh0dG_panel{border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-1);border-radius:16px;flex-direction:column;gap:10px;padding:16px 18px;display:flex}.VWh0dG_panelHead{justify-content:space-between;align-items:baseline;gap:10px;display:flex}.VWh0dG_panelTitle{color:var(--dsw-alias-label-primary);margin:0;font-size:14px;font-weight:600;line-height:20px}.VWh0dG_panelHint{color:var(--dsw-alias-label-caption);white-space:nowrap;font-size:11px;line-height:16px}.VWh0dG_rangeToggle{border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-1);border-radius:8px;gap:2px;padding:2px;display:inline-flex}.VWh0dG_rangeButton{color:var(--dsw-alias-label-tertiary);cursor:pointer;background:0 0;border:none;border-radius:6px;padding:2px 8px;font-size:11px;line-height:16px;transition:background-color .14s,color .14s}.VWh0dG_rangeButtonActive{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary);font-weight:600}.VWh0dG_budget{border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-1);border-radius:14px;flex-direction:column;gap:8px;padding:12px 16px;display:flex}.VWh0dG_budgetHead{justify-content:space-between;align-items:baseline;gap:10px;display:flex}.VWh0dG_budgetLabel{color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:17px}.VWh0dG_budgetValue{color:var(--dsw-alias-label-secondary);font-variant-numeric:tabular-nums;white-space:nowrap;font-size:12px;line-height:17px}.VWh0dG_budgetControls{align-items:center;gap:8px;min-width:0;display:inline-flex}.VWh0dG_budgetInputWrap{border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-1);border-radius:6px;align-items:center;gap:2px;padding:2px 6px;display:inline-flex}.VWh0dG_budgetInputWrap:focus-within{border-color:var(--dsw-alias-border-l3)}.VWh0dG_budgetUnit{color:var(--dsw-alias-label-tertiary);font-size:11px;line-height:16px}.VWh0dG_budgetInput{width:64px;color:var(--dsw-alias-label-primary);font-variant-numeric:tabular-nums;text-align:right;background:0 0;border:none;padding:0;font-size:12px;line-height:16px}.VWh0dG_budgetInput:focus-visible{outline:none}.VWh0dG_switch{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-module-platform);cursor:pointer;border-radius:999px;flex:none;width:30px;height:17px;padding:0;transition:background-color .16s,border-color .16s;position:relative}.VWh0dG_switchOn{border-color:var(--dsw-static-blue-500);background:var(--dsw-static-blue-500)}.VWh0dG_switchKnob{background:var(--dsw-static-neutral-bluish-00);border-radius:50%;width:11px;height:11px;transition:transform .16s;position:absolute;top:2px;left:2px}.VWh0dG_switchOn .VWh0dG_switchKnob{transform:translate(13px)}.VWh0dG_budgetTrack{background:var(--dsw-alias-bg-module-platform);border-radius:999px;height:6px;overflow:hidden}.VWh0dG_budgetFill{background:var(--dsw-static-blue-500);border-radius:999px;height:100%;transition:width .2s}.VWh0dG_budgetFillOver{background:var(--dsw-static-red-500);animation:1.6s ease-in-out infinite VWh0dG_budgetOverPulse}@keyframes VWh0dG_budgetOverPulse{50%{opacity:.55}}.VWh0dG_chartWrap{width:100%;position:relative}.VWh0dG_chartSvg{width:100%;height:auto;display:block}.VWh0dG_chartEmpty{height:140px;color:var(--dsw-alias-label-caption);justify-content:center;align-items:center;font-size:13px;display:flex}.VWh0dG_emptyRow{text-align:center;color:var(--dsw-alias-label-caption);padding:28px 0;font-size:13px}.VWh0dG_chartGrid{stroke:var(--dsw-alias-border-l1);stroke-width:1px}.VWh0dG_chartAxisLabel{fill:var(--dsw-alias-label-tertiary);font-size:10px}.VWh0dG_chartBar{fill:var(--dsw-static-blue-500);opacity:.35}.VWh0dG_chartBar:hover{opacity:.6}.VWh0dG_chartStack{stroke:var(--dsw-alias-bg-layer-1);stroke-width:.75px}.VWh0dG_chartStack:hover{opacity:.85}.VWh0dG_chartLine{stroke:var(--dsw-static-blue-500);stroke-width:2px;stroke-linecap:round;stroke-linejoin:round}.VWh0dG_chartCrosshair{stroke:var(--dsw-alias-label-dimmed);stroke-width:1px;stroke-dasharray:3 3}.VWh0dG_chartDot{fill:var(--dsw-static-neutral-bluish-00);stroke:var(--dsw-static-blue-500);stroke-width:2.5px}.VWh0dG_chartTooltip{pointer-events:none;z-index:2;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-3);box-shadow:var(--dsw-shadow-lv2);white-space:nowrap;border-radius:10px;padding:8px 10px;position:absolute;transform:translate(-50%,calc(-100% - 10px))}.VWh0dG_chartTooltipDate{color:var(--dsw-alias-label-primary);margin-bottom:3px;font-size:11px;font-weight:600}.VWh0dG_chartTooltipRow{color:var(--dsw-alias-label-secondary);align-items:center;gap:5px;font-size:11px;line-height:17px;display:flex}.VWh0dG_chartTooltipRow strong{color:var(--dsw-alias-label-primary);font-variant-numeric:tabular-nums;font-weight:600}.VWh0dG_chartLegendLine{background:var(--dsw-static-blue-500);border-radius:2px;width:10px;height:3px;display:inline-block}.VWh0dG_chartLegendBar{background:var(--dsw-static-blue-500);opacity:.5;border-radius:2px;width:7px;height:7px;display:inline-block}.VWh0dG_chartTooltipSwatch{border-radius:3px;flex:none;width:8px;height:8px;display:inline-block}.VWh0dG_chartLegend{color:var(--dsw-alias-label-tertiary);justify-content:flex-end;gap:14px;margin-top:2px;font-size:11px;display:flex}.VWh0dG_chartLegend span{align-items:center;gap:5px;display:inline-flex}.VWh0dG_tableScroll{border:1px solid var(--dsw-alias-border-l1);--dsh-scrollbar-thumb:var(--dsw-alias-scrollbar-bg-l2);--dsh-scrollbar-thumb-hover:var(--dsw-alias-scrollbar-hover-l2);border-radius:12px;overflow:auto}.VWh0dG_modelTable,.VWh0dG_pricingTable{border-collapse:collapse;width:100%;font-size:12.5px}.VWh0dG_modelTable th,.VWh0dG_modelTable td,.VWh0dG_pricingTable th,.VWh0dG_pricingTable td{border-bottom:1px solid var(--dsw-alias-border-l1);text-align:left;white-space:nowrap;padding:9px 12px}.VWh0dG_modelTable tbody tr:last-child td,.VWh0dG_pricingTable tbody tr:last-child td{border-bottom:0}.VWh0dG_modelTable thead th,.VWh0dG_pricingTable thead th{color:var(--dsw-alias-label-tertiary);background:var(--dsw-alias-bg-module-platform);font-size:11px;font-weight:500}.VWh0dG_modelTable tbody tr,.VWh0dG_pricingTable tbody tr{transition:background-color .12s}.VWh0dG_modelTable tbody tr:hover,.VWh0dG_pricingTable tbody tr:hover{background:var(--dsw-alias-interactive-bg-hover)}.VWh0dG_numCol{text-align:right;font-variant-numeric:tabular-nums}.VWh0dG_costCol{color:var(--dsw-static-blue-500);font-weight:600}.VWh0dG_na{color:var(--dsw-alias-label-dimmed)}.VWh0dG_modelCell{align-items:center;gap:8px;display:inline-flex}.VWh0dG_modelDot{width:9px;height:9px;box-shadow:0 0 0 3px color-mix(in srgb, var(--dsw-alias-bg-layer-1) 60%, transparent);border-radius:50%;flex:none}.VWh0dG_modelName{color:var(--dsw-alias-label-primary);font-weight:500;line-height:16px;display:block}.VWh0dG_modelProvider{color:var(--dsw-alias-label-caption);font-size:10.5px;line-height:14px;display:block}.VWh0dG_pricingToggle{cursor:pointer;text-align:left;background:0 0;border:none;justify-content:space-between;align-items:center;gap:10px;width:100%;padding:0;display:flex}.VWh0dG_pricingToggle:hover .VWh0dG_panelTitle,.VWh0dG_pricingToggle:focus-visible .VWh0dG_panelTitle{color:var(--dsw-static-blue-500)}.VWh0dG_rateBadge{vertical-align:1px;white-space:nowrap;border-radius:999px;align-items:center;margin-left:6px;padding:1px 6px;font-size:10px;font-weight:500;line-height:14px;display:inline-flex}.VWh0dG_rateBadgeLive{color:var(--dsw-static-green-500);background:color-mix(in srgb, var(--dsw-static-green-500) 10%, transparent)}.VWh0dG_rateBadgeBuiltin{color:var(--dsw-alias-label-tertiary);background:var(--dsw-alias-bg-module-platform)}.VWh0dG_pricingToggleText{align-items:baseline;gap:10px;min-width:0;display:flex}.VWh0dG_pricingChevron{width:16px;height:16px;color:var(--dsw-alias-label-tertiary);flex:none;transition:transform .16s}.VWh0dG_pricingChevronOpen{transform:rotate(180deg)}.VWh0dG_bandPrice{align-items:baseline;gap:6px;display:inline-flex}.VWh0dG_bandPriceOff{color:var(--dsw-alias-label-caption)}.VWh0dG_bandPriceOff:before{content:\"/\";color:var(--dsw-alias-label-dimmed);margin-right:4px}.VWh0dG_bandTag{color:var(--dsw-alias-label-secondary);flex-direction:column;gap:1px;font-size:10.5px;line-height:14px;display:inline-flex}.VWh0dG_bandTagOff{color:var(--dsw-static-green-500);font-weight:600}.VWh0dG_flatTag{color:var(--dsw-alias-label-caption);font-size:10.5px;line-height:14px}.VWh0dG_healthDot{border-radius:50%;flex:none;width:8px;height:8px;display:inline-block}.VWh0dG_healthOk{background:var(--dsw-static-green-500);box-shadow:0 0 0 3px color-mix(in srgb, var(--dsw-static-green-500) 18%, transparent)}.VWh0dG_healthBad{background:var(--dsw-static-red-500);box-shadow:0 0 0 3px color-mix(in srgb, var(--dsw-static-red-500) 18%, transparent)}.VWh0dG_healthIdle{background:var(--dsw-static-neutral-bluish-400)}.VWh0dG_dashboardRight{align-items:center;gap:8px;min-width:0;display:flex}.VWh0dG_healthBadge{white-space:nowrap;border-radius:999px;align-items:center;gap:6px;padding:3px 9px;font-size:11px;line-height:16px;display:inline-flex}.VWh0dG_healthBadgeOk{color:var(--dsw-static-green-500);background:color-mix(in srgb, var(--dsw-static-green-500) 10%, transparent)}.VWh0dG_healthBadgeBad{color:var(--dsw-static-red-500);background:color-mix(in srgb, var(--dsw-static-red-500) 10%, transparent)}.VWh0dG_planTag{color:var(--dsw-static-green-500);background:color-mix(in srgb, var(--dsw-static-green-500) 12%, transparent);border-radius:999px;align-items:center;padding:1px 8px;font-size:11px;font-weight:500;line-height:17px;display:inline-flex}.VWh0dG_uncataloguedTag{vertical-align:1px;color:var(--dsw-static-amber-500);background:color-mix(in srgb, var(--dsw-static-amber-500) 12%, transparent);border-radius:999px;margin-left:6px;padding:0 6px;font-size:10px;font-weight:600;line-height:16px;display:inline-block}.VWh0dG_balanceCell{flex-direction:column;align-items:flex-end;gap:2px;display:inline-flex}.VWh0dG_balanceDays{color:var(--dsw-alias-label-caption);white-space:nowrap;font-size:10.5px;line-height:14px}.VWh0dG_balanceDaysLow{color:var(--dsw-static-red-500);font-weight:600}body[data-zine-mode] .VWh0dG_trigger,body[data-zine-mode] .VWh0dG_railButton{display:none}body[data-zine-mode] .VWh0dG_dashboardHead{background:#000;border-bottom:2px solid #e8ff00}body[data-zine-mode] .VWh0dG_headTitleRow{align-items:center;gap:8px;margin-top:4px;display:flex}body[data-zine-mode] .VWh0dG_dashboardTitle{color:#e8ff00;letter-spacing:.04em;text-transform:uppercase;text-shadow:0 0 8px #e8ff0066;font-weight:900}body[data-zine-mode] .VWh0dG_dashboardSubtitle{color:#c9d98a;letter-spacing:.08em;text-transform:uppercase;font-size:10px}body[data-zine-mode] .VWh0dG_closeButton{color:#0a0a05;background:#ff2d95;border:1.5px solid #ff2d95;border-radius:0;box-shadow:0 0 10px #ff2d9573}body[data-zine-mode] .VWh0dG_hero{background:#000;border:2.5px solid #e8ff00;border-radius:0;position:relative;box-shadow:0 0 0 1px #0009,0 0 24px #e8ff002e}body[data-zine-mode] .VWh0dG_heroLabel{color:#c9d98a;letter-spacing:.12em;text-transform:uppercase;font-size:10px;font-weight:900}body[data-zine-mode] .VWh0dG_heroValue{color:#e8ff00;letter-spacing:-.02em;text-shadow:0 0 12px #e8ff0073;font-size:38px;font-weight:900}body[data-zine-mode] .VWh0dG_heroMeta{color:#c9d98a;letter-spacing:.06em;text-transform:uppercase;font-size:10.5px}body[data-zine-mode] .VWh0dG_heroSideLabel{color:#c9d98a;letter-spacing:.1em;text-transform:uppercase;font-size:10px;font-weight:900}body[data-zine-mode] .VWh0dG_heroSideValue{color:#e8ff00;text-shadow:0 0 6px #e8ff0059}body[data-zine-mode] .VWh0dG_delta{font-weight:900}body[data-zine-mode] .VWh0dG_deltaUp{color:#ff2d95}body[data-zine-mode] .VWh0dG_deltaDown{color:#c9d98a}body[data-zine-mode] .VWh0dG_panel{background:#000;border:2px solid #e8ff00;border-radius:0}body[data-zine-mode] .VWh0dG_trendPanel{position:relative}body[data-zine-mode] .VWh0dG_panelTitle{color:#e8ff00;letter-spacing:.06em;text-transform:uppercase;text-shadow:0 0 6px #e8ff0066;font-weight:900}body[data-zine-mode] .VWh0dG_panelHint{color:#c9d98a;letter-spacing:.08em;text-transform:uppercase;font-size:10px;font-weight:900}body[data-zine-mode] .VWh0dG_modelTableScroll{background:#000;border:1.5px solid #e8ff0080;border-radius:0}.VWh0dG_currencyToggle{border:1px solid var(--dsw-alias-border-muted,#3a4250);background:var(--dsw-alias-bg-layer-2,#232a33);border-radius:6px;align-items:center;gap:2px;margin-right:8px;padding:2px;display:inline-flex}.VWh0dG_currencyButton{color:var(--dsw-alias-text-secondary,#9aa5b1);cursor:pointer;background:0 0;border:0;border-radius:4px;padding:4px 7px;font-size:11px;font-weight:700;line-height:1}.VWh0dG_currencyButtonActive{background:var(--dsw-alias-accent-muted,#2f6fed);color:#fff}.VWh0dG_subscriptionGrid{grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:10px;margin-top:10px;display:grid}.VWh0dG_subscriptionCard{border:1px solid var(--dsw-alias-border-muted,#3a4250);background:var(--dsw-alias-bg-layer-2,#232a33);border-radius:8px;padding:10px 12px}.VWh0dG_subscriptionHead{align-items:baseline;gap:8px;margin-bottom:6px;display:flex}.VWh0dG_subscriptionName{font-size:13px;font-weight:700}.VWh0dG_subscriptionPlan{color:var(--dsw-alias-text-secondary,#9aa5b1);font-size:11px}.VWh0dG_subscriptionStatus{color:var(--dsw-alias-warning,#e0a63c);margin-bottom:6px;font-size:11px}.VWh0dG_subscriptionWindow{align-items:center;gap:8px;margin-top:6px;font-size:11px;display:flex}.VWh0dG_subscriptionWindowLabel{color:var(--dsw-alias-text-secondary,#9aa5b1);flex:0 0 44px}.VWh0dG_subscriptionTrack{background:var(--dsw-alias-bg-layer-3,#1a2028);border-radius:3px;flex:1;height:5px;overflow:hidden}.VWh0dG_subscriptionFill{background:var(--dsw-alias-accent,#3b82f6);border-radius:3px;height:100%;display:block}.VWh0dG_subscriptionPct{text-align:right;font-variant-numeric:tabular-nums;flex:none;min-width:52px}.VWh0dG_subscriptionReset{color:var(--dsw-alias-text-secondary,#9aa5b1);flex:none}.VWh0dG_providerGroupList{flex-direction:column;gap:10px;display:flex}.VWh0dG_providerGroup{border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-1);border-radius:12px;padding:12px 14px}.VWh0dG_providerGroupHead{justify-content:space-between;align-items:baseline;gap:12px;display:flex}.VWh0dG_providerGroupTitle{align-items:center;gap:7px;min-width:0;display:inline-flex}.VWh0dG_providerGroupName{color:var(--dsw-alias-label-primary);font-size:13px;font-weight:600;line-height:18px}.VWh0dG_providerGroupMeta{flex:none;align-items:center;gap:10px;display:inline-flex}.VWh0dG_providerGroupBadge{color:var(--dsw-static-green-500);background:color-mix(in srgb, var(--dsw-static-green-500) 12%, transparent);border-radius:999px;align-items:center;padding:1px 8px;font-size:11px;font-weight:500;line-height:17px;display:inline-flex}.VWh0dG_providerGroupBalance{color:var(--dsw-alias-label-secondary);font-variant-numeric:tabular-nums;white-space:nowrap;align-items:baseline;gap:6px;font-size:12px;line-height:17px;display:inline-flex}.VWh0dG_providerGroupBalanceLabel{color:var(--dsw-alias-label-caption);font-size:11px;line-height:17px}.VWh0dG_roundsFlagBadge{color:#fff;background:#ef4444;border-radius:999px;margin-left:8px;padding:1px 7px;font-size:10px;font-weight:800}.VWh0dG_rounds{margin-top:10px}.VWh0dG_roundsBars{align-items:flex-end;gap:3px;height:110px;padding:4px 2px 0;display:flex;overflow-x:auto}.VWh0dG_roundsBarCol{flex-direction:column;flex:1 0 28px;justify-content:flex-end;align-items:stretch;height:100%;display:flex}.VWh0dG_roundsBarLabel{text-align:center;color:var(--dsw-alias-text-secondary,#9aa5b1);white-space:nowrap;text-overflow:ellipsis;max-width:100%;margin-bottom:2px;font-size:8px;line-height:1;overflow:hidden}.VWh0dG_roundsBarWrap{flex:1;align-items:flex-end;min-height:0;display:flex}.VWh0dG_roundsBar{background:var(--dsw-alias-accent,#3b82f6);border-radius:2px 2px 0 0;width:100%;min-height:2px;position:relative}.VWh0dG_roundsBarFlagged{outline-offset:1px;background:#ef4444;border-radius:2px 2px 0 0;outline:1.5px solid #ef4444;width:100%;min-height:2px;position:relative}.VWh0dG_roundsFlagMark{background:#ef4444;border-radius:50%;width:7px;height:7px;position:absolute;top:-3px;right:-3px;box-shadow:0 0 4px #ef4444}.VWh0dG_roundsAxis{color:var(--dsw-alias-text-secondary,#9aa5b1);justify-content:space-between;margin-top:6px;font-size:10px;display:flex}.VWh0dG_roundsEmpty{color:var(--dsw-alias-text-secondary,#9aa5b1);margin-top:10px;font-size:12px}.VWh0dG_heatmap{margin-top:10px}.VWh0dG_heatmapGrid{grid-template-columns:repeat(7,minmax(0,1fr));gap:8px;display:grid}.VWh0dG_heatmapCellEmpty{background:var(--dsw-alias-bg-layer-1);height:30px;color:var(--dsw-alias-label-dimmed,#6b7480);font-variant-numeric:tabular-nums;border-radius:8px;justify-content:center;align-items:center;font-size:11px;display:flex}.VWh0dG_heatmapCell{font-variant-numeric:tabular-nums;cursor:pointer;border:0;border-radius:8px;justify-content:center;align-items:center;height:30px;padding:0;font-size:11px;display:flex}.VWh0dG_heatmapCell[data-level=\"0\"],.VWh0dG_heatmapCell[data-level=\"1\"],.VWh0dG_heatmapCell[data-level=\"2\"]{color:var(--dsw-alias-label-primary)}.VWh0dG_heatmapCell[data-level=\"3\"],.VWh0dG_heatmapCell[data-level=\"4\"]{color:var(--dsw-static-neutral-bluish-00,#fff)}.VWh0dG_heatmapFooter{color:var(--dsw-alias-text-secondary,#9aa5b1);align-items:center;gap:8px;margin-top:10px;font-size:10px;display:flex}.VWh0dG_heatmapLegend{gap:3px;display:inline-flex}.VWh0dG_heatmapLegend i{border-radius:4px;width:14px;height:14px;display:block}.VWh0dG_heatmapHover{font-variant-numeric:tabular-nums;margin-left:auto}@media (width<=640px){.VWh0dG_kpiGrid{grid-template-columns:repeat(2,minmax(0,1fr))}.VWh0dG_hero{flex-direction:column;align-items:flex-start;gap:14px}.VWh0dG_heroSide{flex-direction:row;gap:20px}}";
		const tagId = "@kenz1117/dsh-ui-usage-billing/UsageBilling.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@kenz1117/dsh-ui-usage-billing";
			tag.dataset.pluginCss = tagId;
			tag.textContent = css;
			document.head.appendChild(tag);
		}
		var UsageBilling_module_css_default = {
			"providerGroupBalance": "VWh0dG_providerGroupBalance",
			"chartCrosshair": "VWh0dG_chartCrosshair",
			"panelHead": "VWh0dG_panelHead",
			"triggerAmountSub": "VWh0dG_triggerAmountSub",
			"heatmapCellEmpty": "VWh0dG_heatmapCellEmpty",
			"subscriptionTrack": "VWh0dG_subscriptionTrack",
			"numCol": "VWh0dG_numCol",
			"rangeButton": "VWh0dG_rangeButton",
			"healthOk": "VWh0dG_healthOk",
			"chartLegendLine": "VWh0dG_chartLegendLine",
			"switchOn": "VWh0dG_switchOn",
			"rangeButtonActive": "VWh0dG_rangeButtonActive",
			"rateBadgeBuiltin": "VWh0dG_rateBadgeBuiltin",
			"flatTag": "VWh0dG_flatTag",
			"balanceDays": "VWh0dG_balanceDays",
			"triggerMeta": "VWh0dG_triggerMeta",
			"kpiLabel": "VWh0dG_kpiLabel",
			"bandPriceOff": "VWh0dG_bandPriceOff",
			"triggerAmount": "VWh0dG_triggerAmount",
			"budgetFillOver": "VWh0dG_budgetFillOver",
			"bandTagOff": "VWh0dG_bandTagOff",
			"subscriptionPlan": "VWh0dG_subscriptionPlan",
			"rounds": "VWh0dG_rounds",
			"dashboardHead": "VWh0dG_dashboardHead",
			"chartSvg": "VWh0dG_chartSvg",
			"pricingTable": "VWh0dG_pricingTable",
			"pricingToggle": "VWh0dG_pricingToggle",
			"modelTable": "VWh0dG_modelTable",
			"kpiTile": "VWh0dG_kpiTile",
			"budget": "VWh0dG_budget",
			"hero": "VWh0dG_hero",
			"subscriptionStatus": "VWh0dG_subscriptionStatus",
			"dashboardRight": "VWh0dG_dashboardRight",
			"kpiGreen": "VWh0dG_kpiGreen",
			"emptyRow": "VWh0dG_emptyRow",
			"heatmapLegend": "VWh0dG_heatmapLegend",
			"chartAxisLabel": "VWh0dG_chartAxisLabel",
			"providerGroupBalanceLabel": "VWh0dG_providerGroupBalanceLabel",
			"budgetValue": "VWh0dG_budgetValue",
			"deltaDown": "VWh0dG_deltaDown",
			"currencyButton": "VWh0dG_currencyButton",
			"pricingChevron": "VWh0dG_pricingChevron",
			"rangeToggle": "VWh0dG_rangeToggle",
			"budgetLabel": "VWh0dG_budgetLabel",
			"budgetOverPulse": "VWh0dG_budgetOverPulse",
			"pricingChevronOpen": "VWh0dG_pricingChevronOpen",
			"heatmapFooter": "VWh0dG_heatmapFooter",
			"triggerMonth": "VWh0dG_triggerMonth",
			"heroMain": "VWh0dG_heroMain",
			"budgetInputWrap": "VWh0dG_budgetInputWrap",
			"modelProvider": "VWh0dG_modelProvider",
			"dashboardTitle": "VWh0dG_dashboardTitle",
			"kpiDetail": "VWh0dG_kpiDetail",
			"chartTooltipRow": "VWh0dG_chartTooltipRow",
			"currencyButtonActive": "VWh0dG_currencyButtonActive",
			"closeButton": "VWh0dG_closeButton",
			"deltaUp": "VWh0dG_deltaUp",
			"chartTooltip": "VWh0dG_chartTooltip",
			"subscriptionHead": "VWh0dG_subscriptionHead",
			"roundsBarWrap": "VWh0dG_roundsBarWrap",
			"costCol": "VWh0dG_costCol",
			"healthDot": "VWh0dG_healthDot",
			"headTitleRow": "VWh0dG_headTitleRow",
			"roundsBarCol": "VWh0dG_roundsBarCol",
			"healthBadgeBad": "VWh0dG_healthBadgeBad",
			"chartEmpty": "VWh0dG_chartEmpty",
			"heatmapGrid": "VWh0dG_heatmapGrid",
			"subscriptionGrid": "VWh0dG_subscriptionGrid",
			"subscriptionWindow": "VWh0dG_subscriptionWindow",
			"chartLegend": "VWh0dG_chartLegend",
			"subscriptionFill": "VWh0dG_subscriptionFill",
			"panelTitle": "VWh0dG_panelTitle",
			"roundsBarLabel": "VWh0dG_roundsBarLabel",
			"heatmapCell": "VWh0dG_heatmapCell",
			"heroLabel": "VWh0dG_heroLabel",
			"heroValue": "VWh0dG_heroValue",
			"heroSideItem": "VWh0dG_heroSideItem",
			"modelDot": "VWh0dG_modelDot",
			"providerGroupMeta": "VWh0dG_providerGroupMeta",
			"healthBadgeOk": "VWh0dG_healthBadgeOk",
			"triggerIcon": "VWh0dG_triggerIcon",
			"healthBadge": "VWh0dG_healthBadge",
			"budgetHead": "VWh0dG_budgetHead",
			"balanceCell": "VWh0dG_balanceCell",
			"heroSide": "VWh0dG_heroSide",
			"currencyToggle": "VWh0dG_currencyToggle",
			"railButton": "VWh0dG_railButton",
			"roundsEmpty": "VWh0dG_roundsEmpty",
			"heatmap": "VWh0dG_heatmap",
			"subscriptionWindowLabel": "VWh0dG_subscriptionWindowLabel",
			"chartTooltipSwatch": "VWh0dG_chartTooltipSwatch",
			"chartBar": "VWh0dG_chartBar",
			"subscriptionCard": "VWh0dG_subscriptionCard",
			"heroSideLabel": "VWh0dG_heroSideLabel",
			"modelTableScroll": "VWh0dG_modelTableScroll",
			"trigger": "VWh0dG_trigger",
			"chartTooltipDate": "VWh0dG_chartTooltipDate",
			"bandPrice": "VWh0dG_bandPrice",
			"trendPanel": "VWh0dG_trendPanel",
			"panel": "VWh0dG_panel",
			"providerGroupList": "VWh0dG_providerGroupList",
			"roundsBars": "VWh0dG_roundsBars",
			"dashboardSubtitle": "VWh0dG_dashboardSubtitle",
			"healthIdle": "VWh0dG_healthIdle",
			"roundsAxis": "VWh0dG_roundsAxis",
			"budgetControls": "VWh0dG_budgetControls",
			"chartLine": "VWh0dG_chartLine",
			"balanceDaysLow": "VWh0dG_balanceDaysLow",
			"providerGroupBadge": "VWh0dG_providerGroupBadge",
			"heroSideValue": "VWh0dG_heroSideValue",
			"pricingToggleText": "VWh0dG_pricingToggleText",
			"panelHint": "VWh0dG_panelHint",
			"chartWrap": "VWh0dG_chartWrap",
			"bandTag": "VWh0dG_bandTag",
			"triggerDivider": "VWh0dG_triggerDivider",
			"heatmapHover": "VWh0dG_heatmapHover",
			"kpiValue": "VWh0dG_kpiValue",
			"budgetUnit": "VWh0dG_budgetUnit",
			"chartLegendBar": "VWh0dG_chartLegendBar",
			"switch": "VWh0dG_switch",
			"modelName": "VWh0dG_modelName",
			"chartStack": "VWh0dG_chartStack",
			"roundsBar": "VWh0dG_roundsBar",
			"budgetFill": "VWh0dG_budgetFill",
			"roundsFlagMark": "VWh0dG_roundsFlagMark",
			"dashboard": "VWh0dG_dashboard",
			"budgetInput": "VWh0dG_budgetInput",
			"na": "VWh0dG_na",
			"uncataloguedTag": "VWh0dG_uncataloguedTag",
			"subscriptionPct": "VWh0dG_subscriptionPct",
			"providerGroupTitle": "VWh0dG_providerGroupTitle",
			"dashboardModal": "VWh0dG_dashboardModal",
			"dashboardBody": "VWh0dG_dashboardBody",
			"heroMeta": "VWh0dG_heroMeta",
			"triggerToday": "VWh0dG_triggerToday",
			"delta": "VWh0dG_delta",
			"planTag": "VWh0dG_planTag",
			"providerGroup": "VWh0dG_providerGroup",
			"modelCell": "VWh0dG_modelCell",
			"tableScroll": "VWh0dG_tableScroll",
			"subscriptionReset": "VWh0dG_subscriptionReset",
			"providerGroupHead": "VWh0dG_providerGroupHead",
			"chartDot": "VWh0dG_chartDot",
			"budgetTrack": "VWh0dG_budgetTrack",
			"kpiGrid": "VWh0dG_kpiGrid",
			"rateBadge": "VWh0dG_rateBadge",
			"chartGrid": "VWh0dG_chartGrid",
			"providerGroupName": "VWh0dG_providerGroupName",
			"roundsFlagBadge": "VWh0dG_roundsFlagBadge",
			"healthBad": "VWh0dG_healthBad",
			"roundsBarFlagged": "VWh0dG_roundsBarFlagged",
			"switchKnob": "VWh0dG_switchKnob",
			"rateBadgeLive": "VWh0dG_rateBadgeLive",
			"subscriptionName": "VWh0dG_subscriptionName"
		};
		//#endregion
		//#region src/client/pricing.ts
		/**
		* USD → CNY rate for display. Source: China Foreign Exchange Trade System
		* mid-rate 6.7878 on 2026-08-14; rounded to 6.79. Only applies to overseas
		* USD-priced models — domestic models never pass through this rate.
		* The node half may refresh this at boot via `/api/billing/pricing`; until a
		* live rate arrives the built-in value stays in force.
		*/
		const USD_TO_CNY = 6.79;
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
				key: "flash-vision-exp",
				name: "DeepSeek V4 Flash Vision (Exp)",
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
				key: "mimo-v2.5",
				name: "MiMo V2.5",
				provider: "小米",
				colorVar: "dsw-static-green-400",
				price: {
					currency: "CNY",
					input: 4,
					cacheHit: .4,
					output: 12
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
		/**
		* 真实 provider model id → 计费目录键（`MODEL_CATALOG[].key`）的映射。未知 id
		* 原样保留并落回 `other`（未知模型不估算费用）。聚合层（aggregate.ts）在折叠时
		* 用同一张表把日志里的 model id 归并为目录键，客户端渲染（`modelOf`）也按它
		* 解析，两侧共用一份映射，避免同一模型两侧不一致导致「未收录」。
		*/
		const MODEL_KEY_ALIASES = {
			"deepseek-v4-flash": "flash",
			"deepseek-v4-flash-vision-exp": "flash-vision-exp",
			"deepseek-v4-pro": "pro",
			"glm-5.2": "glm",
			"qwen3.8-max": "qwen-3.8-max",
			"qwen3.7-max": "qwen-max",
			"qwen-max": "qwen-max",
			"hunyuan-t1": "hunyuan-t1",
			"step-3.7-flash": "step",
			"seed-2.0-mini": "doubao-mini",
			"k3": "kimi-k3",
			"kimi-k3": "kimi-k3"
		};
		/** Lookup a model by its stats key; falls back to the generic `other` entry. */
		function modelOf(key) {
			const resolved = MODEL_KEY_ALIASES[key] ?? key;
			const base = MODEL_CATALOG.find((entry) => entry.key === resolved) ?? (() => {
				const fallback = MODEL_CATALOG.at(-1);
				if (fallback !== void 0) return fallback;
				throw new Error("MODEL_CATALOG must not be empty");
			})();
			const live = livePrices?.[resolved];
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
			const peak = priceBandCost(entry.price, buckets, entry.price.currency);
			const off = entry.price.offPeak === void 0 ? peak : priceBandCost(entry.price.offPeak, buckets, entry.price.currency);
			return peak * peakShare + off * (1 - peakShare);
		}
		/** 人民币 → 美元（显示换算用）：1 USD = {@link USD_TO_CNY} CNY。 */
		function cnyToUsd(cny) {
			return cny / USD_TO_CNY;
		}
		/**
		* Format an amount with adaptive precision and the given currency symbol.
		* @param amount - the amount (CNY by default; pass `usd` for dollar display).
		* @param currency - display currency; default `cny`.
		*/
		function formatMoney(amount, currency = "cny") {
			const value = Number(amount);
			if (!Number.isFinite(value)) return currency === "cny" ? "¥0" : "$0";
			const symbol = currency === "cny" ? "¥" : "$";
			if (value <= 0) return `${symbol}0`;
			if (value >= 1e3) return `${symbol}${value.toFixed(0)}`;
			if (value >= 10) return `${symbol}${value.toFixed(1)}`;
			if (value >= .1) return `${symbol}${value.toFixed(2)}`;
			return `${symbol}${value.toFixed(3)}`;
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
		* The columns are STACKED per day — one bar per day, with each model's cost
		* as a colored segment inside the bar, so the daily total reads at a glance
		* and the model mix stays visible. The blue line is the total call volume
		* across all models, plotted on its own right-hand axis.
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
		* Render the daily stacked cost bars plus the total-calls line.
		* @param props.data - sorted daily rows (ascending date).
		* @param props.models - the model legend, in bar order.
		* @param props.currency - display currency for the cost labels.
		*/
		function TrendChart({ data, models = [], currency = "cny" }) {
			const [hover, setHover] = (0, react.useState)(null);
			const money = (cny) => formatMoney(currency === "usd" ? cnyToUsd(cny) : cny, currency);
			const layout = (0, react.useMemo)(() => {
				const n = data.length;
				if (n === 0) return null;
				const plotW = W - PAD.left - PAD.right;
				const plotH = H - PAD.top - PAD.bottom;
				const inner = (i) => {
					if (n === 1) return PAD.left + plotW / 2;
					return PAD.left + plotW * i / (n - 1);
				};
				const maxCost = Math.max(...data.map((d) => Math.max(d.cost, Object.values(d.byModel ?? {}).reduce((sum, v) => sum + v, 0))), 1e-4);
				const yCost = (value) => PAD.top + plotH - value / maxCost * plotH;
				const maxCalls = Math.max(...data.map((d) => d.calls), 1);
				const yCalls = (value) => PAD.top + plotH - value / maxCalls * plotH;
				const groupW = plotW / n;
				const barW = Math.min(18, groupW * .6);
				return {
					n,
					plotW,
					plotH,
					inner,
					yCost,
					yCalls,
					barW,
					bars: data.flatMap((d, i) => {
						const x = inner(i) - barW / 2;
						if (models.length === 0) return [{
							date: d.date,
							model: TOTAL_MODEL,
							x,
							base: 0,
							value: d.cost,
							topRounded: true
						}];
						let topKey = null;
						for (const model of models) if ((d.byModel?.[model.key] ?? 0) > 0) topKey = model.key;
						let acc = 0;
						return models.map((model) => {
							const value = d.byModel?.[model.key] ?? 0;
							const bar = {
								date: d.date,
								model,
								x,
								base: acc,
								value,
								topRounded: model.key === topKey
							};
							acc += value;
							return bar;
						});
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
									children: money(value)
								})] }, `cost-${idx}`);
							}),
							bars.map((bar) => bar.value > 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("rect", {
								x: bar.x,
								y: yCost(bar.base + bar.value),
								width: barW,
								height: yCost(bar.base) - yCost(bar.base + bar.value),
								rx: bar.topRounded ? 2 : 0,
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
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", { children: money(activePoint.byModel?.[model.key] ?? 0) })
								]
							}, model.key)),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: UsageBilling_module_css_default.chartTooltipRow,
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { className: UsageBilling_module_css_default.chartLegendBar }),
									"总计 ",
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", { children: money(activePoint.cost) })
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
		//#region src/client/round-chart.tsx
		/**
		* RoundCostChart: dependency-free per-turn cost bars with spike markers.
		*
		* One bar per turn (most recent N, newest last), height scaled to the window
		* maximum. Turns flagged by {@link flagAnomalies} get a warning outline and a
		* corner marker; hover shows the turn's model, cost, and window time. Styling
		* lives in the billing CSS module (`.rounds*`).
		*/
		/** Local time `HH:MM`. */
		function clock(time) {
			const date = new Date(time);
			const pad = (n) => String(n).padStart(2, "0");
			return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
		}
		/** Local date + time for the hover line. */
		function dateTime(time) {
			const date = new Date(time);
			const pad = (n) => String(n).padStart(2, "0");
			return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
		}
		/**
		* Render the per-turn cost bars.
		* @param props.rounds - turns, most recent last (ascending startedAt); oldest beyond the limit are dropped.
		* @param props.flags - spike flags matched by sessionId+turn.
		* @param props.currency - display currency for the amount labels.
		* @param props.t - locale function for the model label.
		*/
		function RoundCostChart({ rounds, flags, currency, t }) {
			const visible = (0, react.useMemo)(() => rounds.slice(-40), [rounds]);
			const flagKey = (0, react.useMemo)(() => new Set(flags.map((flag) => `${flag.sessionId}:${flag.turn}`)), [flags]);
			const maxCost = (0, react.useMemo)(() => Math.max(1e-4, ...visible.map((round) => round.cost)), [visible]);
			if (visible.length === 0) return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: UsageBilling_module_css_default.roundsEmpty,
				children: [t("billing.model"), " —"]
			});
			const money = (cny) => formatMoney(currency === "usd" ? cnyToUsd(cny) : cny, currency);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: UsageBilling_module_css_default.rounds,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: UsageBilling_module_css_default.roundsBars,
					role: "img",
					"aria-label": "cost per turn",
					children: visible.map((round) => {
						const flagged = flagKey.has(`${round.sessionId}:${round.turn}`);
						const height = Math.max(1, round.cost / maxCost * 100);
						return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: UsageBilling_module_css_default.roundsBarCol,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: UsageBilling_module_css_default.roundsBarLabel,
								children: money(round.cost)
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: UsageBilling_module_css_default.roundsBarWrap,
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									className: flagged ? UsageBilling_module_css_default.roundsBarFlagged : UsageBilling_module_css_default.roundsBar,
									style: { height: `${height}%` },
									"data-testid": "round-bar",
									title: `${t("billing.model")} ${round.model} · ${money(round.cost)} · ${dateTime(round.startedAt)}${round.endedAt !== void 0 ? ` → ${clock(round.endedAt)}` : ""}`,
									children: flagged && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: UsageBilling_module_css_default.roundsFlagMark,
										"aria-hidden": "true"
									})
								})
							})]
						}, `${round.sessionId}:${round.turn}`);
					})
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: UsageBilling_module_css_default.roundsAxis,
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: [
						t("billing.costAbbr"),
						" ",
						money(maxCost)
					] }), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: [visible.length, " 轮"] })]
				})]
			});
		}
		//#endregion
		//#region src/client/heatmap.tsx
		/**
		* UsageHeatmap: dependency-free month calendar heatmap of daily cost.
		*
		* Styled after an "activity map": one large rounded cell per day with the
		* date number printed inside, laid out in a 7-column grid (Sunday-first).
		* Week-first data layout: each week is one array element of 7 cells, so the
		* grid auto-rows place them correctly without per-cell gridColumnStart hacks.
		* Cell intensity is the day's cost quantized to five levels against the month
		* maximum (mint-green gradient, like the reference activity map). Leading
		* slots before the 1st and trailing slots after the last day carry the
		* cross-month dates as gray placeholders; future days of this month render as
		* gray placeholders too. Hover shows the exact date and amount.
		*/
		const LEVEL_COLORS = [
			"var(--dsw-alias-bg-layer-2)",
			"color-mix(in srgb, #10b981 22%, var(--dsw-alias-bg-layer-2))",
			"color-mix(in srgb, #10b981 45%, var(--dsw-alias-bg-layer-2))",
			"color-mix(in srgb, #10b981 70%, var(--dsw-alias-bg-layer-2))",
			"#10b981"
		];
		/** Local-time `YYYY-MM-DD` stamp (matches the dashboard's day keys). */
		function dayStamp(date) {
			const pad = (n) => String(n).padStart(2, "0");
			return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
		}
		/**
		* Build the current-month cells arranged in week rows (Sunday-first).
		* The grid is a complete calendar month view: leading slots before the 1st
		* carry the previous month's date number, trailing slots after the last day
		* carry the next month's date number, and every future day of this month is a
		* gray placeholder — so the rectangle always fills whole weeks, like the
		* reference activity map.
		*/
		function buildMonthWeeks(days, now) {
			const byDate = /* @__PURE__ */ new Map();
			for (const day of days) byDate.set(day.date, day.value);
			let max = 0;
			for (const value of byDate.values()) if (value > max) max = value;
			const year = now.getFullYear();
			const month = now.getMonth();
			const today = now.getDate();
			const daysInMonth = new Date(year, month + 1, 0).getDate();
			const firstDow = new Date(year, month, 1).getDay();
			const totalCells = firstDow + daysInMonth;
			const totalWeeks = Math.ceil(totalCells / 7);
			const weeks = [];
			for (let week = 0; week < totalWeeks; week += 1) {
				const row = [];
				for (let col = 0; col < 7; col += 1) {
					const dayNum = week * 7 + col - firstDow + 1;
					if (dayNum < 1) {
						const d = new Date(year, month, dayNum);
						row.push({
							date: dayStamp(d),
							dayNum: d.getDate(),
							value: 0,
							level: 0,
							placeholder: true
						});
						continue;
					}
					if (dayNum > daysInMonth) {
						const d = new Date(year, month + 1, dayNum - daysInMonth);
						row.push({
							date: dayStamp(d),
							dayNum: d.getDate(),
							value: 0,
							level: 0,
							placeholder: true
						});
						continue;
					}
					const iso = dayStamp(new Date(year, month, dayNum));
					const value = byDate.get(iso) ?? 0;
					let level = 0;
					if (value > 0 && max > 0) {
						const scaled = Math.ceil(value / max * 4);
						level = Math.min(4, Math.max(1, scaled));
					}
					const isFuture = dayNum > today;
					row.push({
						date: iso,
						dayNum,
						value: isFuture ? 0 : value,
						level: isFuture ? 0 : level,
						placeholder: isFuture
					});
				}
				weeks.push(row);
			}
			return weeks;
		}
		/**
		* Render the month heatmap.
		* @param props.days - daily cost rows (keys are `YYYY-MM-DD`).
		* @param props.currency - display currency for the hover amount.
		* @param props.now - anchor date (defaults to today); injectable for tests.
		* @param props.t - locale function (used for the legend labels).
		*/
		function UsageHeatmap({ days, currency, now, t }) {
			const [hover, setHover] = (0, react.useState)(null);
			const weeks = (0, react.useMemo)(() => buildMonthWeeks(days, now ?? /* @__PURE__ */ new Date()), [days, now]);
			const money = (cny) => formatMoney(currency === "usd" ? cnyToUsd(cny) : cny, currency);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: UsageBilling_module_css_default.heatmap,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: UsageBilling_module_css_default.heatmapGrid,
					role: "img",
					"aria-label": "daily cost heatmap",
					children: weeks.map((week) => week.map((cell) => {
						if (cell.placeholder) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: UsageBilling_module_css_default.heatmapCellEmpty,
							children: cell.dayNum
						}, cell.date);
						return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							className: UsageBilling_module_css_default.heatmapCell,
							"data-testid": "heatmap-cell",
							"data-level": cell.level,
							style: { background: LEVEL_COLORS[cell.level] },
							title: `${cell.date} · ${money(cell.value)}`,
							"aria-label": `${cell.date}: ${money(cell.value)}`,
							onMouseEnter: () => {
								setHover(cell);
							},
							onMouseLeave: () => {
								setHover(null);
							},
							onFocus: () => {
								setHover(cell);
							},
							onBlur: () => {
								setHover(null);
							},
							children: cell.dayNum
						}, cell.date);
					}))
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: UsageBilling_module_css_default.heatmapFooter,
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: UsageBilling_module_css_default.heatmapLegendText,
							children: t("billing.heatmapLess")
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: UsageBilling_module_css_default.heatmapLegend,
							children: LEVEL_COLORS.map((color, level) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("i", { style: { background: color } }, level))
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: UsageBilling_module_css_default.heatmapLegendText,
							children: t("billing.heatmapMore")
						}),
						hover !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
							className: UsageBilling_module_css_default.heatmapHover,
							"data-testid": "heatmap-hover",
							children: [
								hover.date,
								" · ",
								money(hover.value)
							]
						})
					]
				})]
			});
		}
		//#endregion
		//#region src/client/anomaly.ts
		const DEFAULTS = {
			window: 6,
			threshold: 2,
			reasonFactor: 1.8,
			reasonHitDropPp: 15
		};
		function mean(values) {
			if (values.length === 0) return null;
			let sum = 0;
			for (const value of values) sum += value;
			return sum / values.length;
		}
		/** 输入侧缓存命中率（百分比）；无输入时 null。 */
		function cacheHitRate(round) {
			const denominator = round.cacheHit + round.cacheMiss;
			return denominator <= 0 ? null : round.cacheHit / denominator * 100;
		}
		/**
		* 标记成本异常轮次（按时间顺序传入；最近的轮次排在末尾）。
		* @param rounds - 按起始时间升序的轮次序列（最早在前）。
		* @param options - 窗口/阈值/归因灵敏度。
		* @returns 异常标记数组（保持输入顺序）。
		*/
		function flagAnomalies(rounds, options) {
			const opts = {
				...DEFAULTS,
				...options
			};
			const flags = [];
			if (opts.window <= 0 || opts.threshold <= 0) return flags;
			const baselineCosts = [];
			const baselineOutputs = [];
			const baselineInputs = [];
			const baselineHits = [];
			for (const round of rounds) {
				if (round.cost <= 0) continue;
				const output = round.output;
				const input = round.input;
				const hit = cacheHitRate(round);
				const baselineCost = mean(baselineCosts);
				const reasons = [];
				if (baselineCost !== null && baselineCost > 0 && round.cost > baselineCost * opts.threshold) {
					const baselineOutput = mean(baselineOutputs);
					const baselineInput = mean(baselineInputs);
					const baselineHit = mean(baselineHits);
					if (baselineOutput !== null && baselineOutput > 0 && output > baselineOutput * opts.reasonFactor) reasons.push("output-growth");
					if (baselineInput !== null && baselineInput > 0 && input > baselineInput * opts.reasonFactor) reasons.push("context-bloat");
					if (baselineHit !== null && hit !== null && hit < baselineHit - opts.reasonHitDropPp) reasons.push("cache-hit-drop");
					flags.push({
						sessionId: round.sessionId,
						turn: round.turn,
						cost: round.cost,
						reasons
					});
				}
				baselineCosts.push(round.cost);
				baselineOutputs.push(output);
				baselineInputs.push(input);
				if (hit !== null) baselineHits.push(hit);
				while (baselineCosts.length > opts.window) baselineCosts.shift();
				while (baselineOutputs.length > opts.window) baselineOutputs.shift();
				while (baselineInputs.length > opts.window) baselineInputs.shift();
				while (baselineHits.length > opts.window) baselineHits.shift();
			}
			return flags;
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
		/** 会话明细面板最多展示的行数（完整长尾在服务端另有一层封顶）。 */
		const SESSION_DISPLAY_LIMIT = 20;
		/** 项目名取 cwd 的末级目录；无 cwd 时由调用方回退为 em dash。 */
		function projectName(cwd) {
			if (cwd === void 0) return void 0;
			return cwd.split(/[\\/]/).filter(Boolean).pop() ?? cwd;
		}
		/** Idle health state before the probe settles. */
		const IDLE_HEALTH = {
			checked: false,
			available: false,
			models: 0,
			failures: 0,
			okProviders: [],
			badProviders: []
		};
		/**
		* The dashboard's display names (中文厂商名) never equal the provider names a
		* user actually configures (deepseek, zhipu, qwen…), so the dot match also
		* accepts a bidirectional substring hit and a display-name alias list.
		* 导出供一致性守卫测试：catalog 每个厂商都必须在此登记（Custom 除外），
		* 防止新增厂商漏配导致健康绿灯不亮。
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
			"小米": [
				"xiaomi",
				"mi",
				"mimo"
			],
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
		/**
		* 从真实 model id 反推提供方显示名：目录未收录的模型（key 落回「其他」）
		* 只靠 entry.provider（Custom）永远点不亮健康灯，这里用厂商别名对 model id
		* 做强匹配（别名作为完整 id / 前缀 / 独立段）与弱匹配（长别名子串），
		* 命中即显示厂商名并点亮健康点；无命中保持 Custom。
		* 导出供守卫测试：短别名（mi/yi）仅允许前缀形式，防止 minimax 等误吞。
		*/
		function providerFromModelKey(modelKey) {
			const key = modelKey.trim().toLowerCase();
			const compact = key.replace(/[\s_/-]+/g, "");
			if (compact.length === 0) return void 0;
			for (const [display, aliases] of Object.entries(PROVIDER_ALIASES)) for (const alias of aliases) {
				const a = normalizeProvider(alias);
				if (a.length === 0) continue;
				if (key === a) return display;
				if (key.startsWith(`${a}-`) || key.startsWith(`${a}/`) || key.startsWith(`${a}_`)) return display;
				if (key.includes(`${a}-`) || key.includes(`${a}/`) || key.includes(`${a}_`)) return display;
			}
			for (const [display, aliases] of Object.entries(PROVIDER_ALIASES)) for (const alias of aliases) {
				const a = normalizeProvider(alias);
				if (a.length < 4) continue;
				if (compact.includes(a)) return display;
			}
		}
		/**
		* 订阅套餐 provider id → 所属模型厂商（用于把订阅额度归并到对应厂商组）。
		* 厂商名与 PROVIDER_ALIASES 保持一致，使订阅卡片与模型用量落在同一组下。
		* opencode 是跨厂商订阅通道、无单一模型厂商，按自身显示名独立成组。
		*/
		const SUBSCRIPTION_VENDORS = {
			"kimi-coding": "月之暗面",
			"zai-coding-cn": "智谱 AI",
			"zai-coding": "智谱 AI",
			"qwen-token-plan": "阿里通义",
			"qwen-token-plan-cn": "阿里通义",
			"xiaomi-token-plan-ams": "小米",
			"xiaomi-token-plan-cn": "小米",
			"xiaomi-token-plan-sgp": "小米",
			"volcengine-token-plan": "字节豆包",
			"ark-token-plan": "字节豆包",
			"doubao-token-plan": "字节豆包",
			"ernie": "百度文心",
			"baidu": "百度文心",
			"wenxin": "百度文心",
			"minimax": "MiniMax",
			"opencode": "OpenCode",
			"opencode-go": "OpenCode"
		};
		/** 订阅套餐归并到的厂商显示名；未知 id 回退为从 model id 反推或 id 本身。 */
		function subscriptionVendorOf(provider) {
			const mapped = SUBSCRIPTION_VENDORS[provider];
			if (mapped !== void 0) return mapped;
			return providerFromModelKey(provider) ?? provider;
		}
		/** 余额不足告警的默认阈值（人民币元）：宿主 Config 未配置时客户端兜底。 */
		const DEFAULT_LOW_BALANCE_THRESHOLD = 50;
		/**
		* 日均消耗（元/天）：取最近 7 天（含今天）总花费 ÷ 有记录天数；无记录返回 0
		* （此时可用天数无法估算，调用方不显示天数提示）。日期戳字典序即时间序。
		*/
		function dailyBurnRate(byDay, today) {
			const dates = Object.keys(byDay).filter((d) => d <= today).sort().slice(-7);
			if (dates.length === 0) return 0;
			return dates.reduce((sum, d) => sum + (byDay[d]?.cost ?? 0), 0) / dates.length;
		}
		/** Resolve one provider's dot state: green when live, red when failed, gray when unknown. */
		function providerDot(health, provider) {
			if (!health.checked) return UsageBilling_module_css_default.healthIdle;
			if (health.okProviders.some((live) => providerMatches(provider, live))) return UsageBilling_module_css_default.healthOk;
			if (health.badProviders.some((live) => providerMatches(provider, live))) return UsageBilling_module_css_default.healthBad;
			return UsageBilling_module_css_default.healthIdle;
		}
		/** 订阅额度查询状态的文案（ok 时无需额外标注，返回空串）。 */
		function subscriptionStatusText(status, t) {
			switch (status) {
				case "ok": return "";
				case "not-configured": return t("billing.subscriptionNotConfigured");
				case "unauthorized": return t("billing.subscriptionUnauthorized");
				case "rate-limited": return t("billing.subscriptionRateLimited");
				case "invalid-response": return t("billing.subscriptionInvalid");
				default: return t("billing.subscriptionUnavailable");
			}
		}
		/** 订阅额度窗口的类型标签（本次 / 本周 / 本月 / 计费周期）。 */
		function subscriptionWindowLabel(kind, t) {
			switch (kind) {
				case "session": return t("billing.subscriptionSession");
				case "weekly": return t("billing.subscriptionWeekly");
				case "monthly": return t("billing.subscriptionMonthly");
				case "billing": return t("billing.subscriptionBilling");
			}
		}
		/** Path to the usage-stats endpoint served by this plugin's node half. */
		const USAGE_STATS_PATH = "/api/billing/usage-stats";
		/** Path to the live-pricing endpoint served by this plugin's node half. */
		const PRICING_PATH = "/api/billing/pricing";
		/** Path to the account-balance endpoint served by this plugin's node half. */
		const BALANCE_PATH = "/api/billing/balance";
		/** Path to the subscription-plan quota endpoint served by this plugin's node half. */
		const SUBSCRIPTIONS_PATH = "/api/billing/subscriptions";
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
					...candidate.updatedAt !== void 0 ? { updatedAt: candidate.updatedAt } : {},
					...typeof candidate.budget === "number" ? { budget: candidate.budget } : {},
					...typeof candidate.lowBalanceThreshold === "number" ? { lowBalanceThreshold: candidate.lowBalanceThreshold } : {},
					...Array.isArray(candidate.bySession) ? { bySession: candidate.bySession } : {},
					...Array.isArray(candidate.byTurn) ? { byTurn: candidate.byTurn } : {},
					...Array.isArray(candidate.byWorkspace) ? { byWorkspace: candidate.byWorkspace } : {}
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
		* 拉取订阅套餐剩余额度（供订阅面板）；失败返回空列表。
		* @returns the quota rows, or an empty list on any failure.
		*/
		async function fetchSubscriptions() {
			try {
				const response = await fetch(SUBSCRIPTIONS_PATH);
				if (!response.ok) return [];
				const text = await response.text();
				const parsed = JSON.parse(text);
				if (parsed !== null && typeof parsed === "object" && "quotas" in parsed) return parsed.quotas;
				return [];
			} catch {
				return [];
			}
		}
		/**
		* Sidebar footer trigger: compact pill in wide mode, icon in rail mode.
		* ZINE 模式下入口由主题插件的贴纸层承担，本触发器由 CSS
		* （body[data-zine-mode] 选择器）隐藏，组件本身无 zine 分支。
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
				"data-testid": "billing-rail-button",
				onClick: onOpen,
				title: `${t("billing.title")} · ${formatMoney(monthCost)}`,
				children: cardIcon
			});
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
				type: "button",
				className: UsageBilling_module_css_default.trigger,
				"data-testid": "billing-trigger",
				onClick: onOpen,
				title: `${t("billing.title")} · 本月 ${formatMoney(monthCost)}`,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: UsageBilling_module_css_default.triggerIcon,
						"data-testid": "billing-trigger-icon",
						children: cardIcon
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
						className: UsageBilling_module_css_default.triggerToday,
						"data-testid": "billing-trigger-today",
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
						"data-testid": "billing-trigger-month",
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
		* @param props - stats, locale function, close handler, model health, balances, renderSlot.
		*/
		function BillingDashboard({ stats, t, onClose, health, balances, quotas, currency, onCurrency, turns, renderSlot, budgetEnabled, budgetAmount, onToggleBudget, onBudgetAmount }) {
			const { total, byModel, byDay } = stats;
			const [pricingOpen, setPricingOpen] = (0, react.useState)(false);
			const [sessionsOpen, setSessionsOpen] = (0, react.useState)(false);
			const [roundsOpen, setRoundsOpen] = (0, react.useState)(false);
			const [heatmapOpen, setHeatmapOpen] = (0, react.useState)(true);
			const [workspacesOpen, setWorkspacesOpen] = (0, react.useState)(false);
			const [trendDays, setTrendDays] = (0, react.useState)(7);
			const rateInfo = getRateInfo();
			const money = (cny) => formatMoney(currency === "usd" ? cnyToUsd(cny) : cny, currency);
			const roundFlags = (0, react.useMemo)(() => flagAnomalies([...turns].reverse()), [turns]);
			const dailyBurn = dailyBurnRate(byDay, localDayStamp());
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
				const amount = balance.currency === "USD" ? `$${balance.totalBalance.toFixed(2)}` : money(balance.totalBalance);
				const balanceCny = balance.currency === "USD" ? balance.totalBalance * rateInfo.rate : balance.totalBalance;
				if (dailyBurn <= 0) return amount;
				const days = Math.floor(balanceCny / dailyBurn);
				return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
					className: UsageBilling_module_css_default.balanceCell,
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: amount }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: clsx(UsageBilling_module_css_default.balanceDays, days <= 3 && UsageBilling_module_css_default.balanceDaysLow),
						"data-testid": "billing-balance-days",
						children: t("billing.balanceDays").replace("{days}", String(days))
					})]
				});
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
				for (let offset = trendDays - 1; offset >= 0; offset -= 1) {
					const day = /* @__PURE__ */ new Date();
					day.setDate(day.getDate() - offset);
					out.push(localDayStamp(day.getTime()));
				}
				return out;
			}, [trendDays]);
			const latestDate = trendDates.at(-1) ?? today;
			const heatmapDays = (0, react.useMemo)(() => Object.entries(byDay).map(([date, day]) => ({
				date,
				value: day.cost
			})), [byDay]);
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
				const uncatalogued = entry.key === "other";
				const inferredProvider = uncatalogued ? providerFromModelKey(key) : void 0;
				const buckets = {
					input: data.input,
					cacheHit: data.cacheHit,
					cacheMiss: data.cacheMiss,
					output: data.output
				};
				return {
					key,
					name: uncatalogued ? key : entry.name,
					provider: inferredProvider ?? entry.provider,
					calls: data.calls,
					input: data.input,
					output: data.output,
					cacheHitRate: data.cacheHit + data.cacheMiss > 0 ? data.cacheHit / (data.cacheHit + data.cacheMiss) * 100 : 0,
					estimated: computeCost(entry, buckets),
					plan: data.plan === true,
					...data.cost > 0 ? { actual: data.cost } : {},
					uncatalogued
				};
			}).sort((a, b) => (b.actual ?? b.estimated) - (a.actual ?? a.estimated)).map((row, index) => ({
				...row,
				color: CHART_PALETTE[index % CHART_PALETTE.length] ?? "#8b95a3"
			})), [byModel]);
			const providerGroups = (0, react.useMemo)(() => {
				const subscriptionsByVendor = /* @__PURE__ */ new Map();
				for (const quota of quotas) {
					if (quota.status === "not-configured") continue;
					const vendor = subscriptionVendorOf(quota.provider);
					const list = subscriptionsByVendor.get(vendor);
					if (list === void 0) subscriptionsByVendor.set(vendor, [quota]);
					else list.push(quota);
				}
				const modelsByVendor = /* @__PURE__ */ new Map();
				for (const row of modelRows) {
					const list = modelsByVendor.get(row.provider);
					if (list === void 0) modelsByVendor.set(row.provider, [row]);
					else list.push(row);
				}
				return [...new Set([...modelsByVendor.keys(), ...subscriptionsByVendor.keys()])].map((name) => ({
					name,
					models: modelsByVendor.get(name) ?? [],
					subscriptions: subscriptionsByVendor.get(name) ?? [],
					balance: balanceFor(name),
					dot: providerDot(health, name)
				})).sort((a, b) => {
					const costOf = (group) => group.models.reduce((sum, m) => sum + (m.actual ?? m.estimated), 0);
					const diff = costOf(b) - costOf(a);
					if (diff !== 0) return diff;
					if (a.models.length === 0 && b.models.length === 0) return 0;
					if (b.models.length === 0) return -1;
					if (a.models.length === 0) return 1;
					return a.name.localeCompare(b.name, "zh");
				});
			}, [
				modelRows,
				quotas,
				balances,
				health
			]);
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
					"data-testid": "billing-dashboard",
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: UsageBilling_module_css_default.dashboardHead,
						"data-testid": "billing-dashboard-head",
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [
							renderSlot("billing.dashboard.decor", { position: "head" }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: UsageBilling_module_css_default.headTitleRow,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h2", {
									className: UsageBilling_module_css_default.dashboardTitle,
									children: t("billing.title")
								}), renderSlot("billing.dashboard.decor", { position: "headTitle" })]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("p", {
								className: UsageBilling_module_css_default.dashboardSubtitle,
								children: [
									t("billing.lastUpdated"),
									" ",
									latestDate
								]
							})
						] }), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: UsageBilling_module_css_default.dashboardRight,
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: UsageBilling_module_css_default.currencyToggle,
									role: "group",
									"aria-label": t("billing.currency"),
									children: ["cny", "usd"].map((unit) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
										type: "button",
										className: clsx(UsageBilling_module_css_default.currencyButton, currency === unit && UsageBilling_module_css_default.currencyButtonActive),
										"aria-pressed": currency === unit,
										"data-testid": `billing-currency-${unit}`,
										title: unit === "cny" ? t("billing.currencyCny") : t("billing.currencyUsd"),
										onClick: () => {
											onCurrency(unit);
										},
										children: unit === "cny" ? "¥" : "$"
									}, unit))
								}),
								health.checked && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
									className: clsx(UsageBilling_module_css_default.healthBadge, health.available ? UsageBilling_module_css_default.healthBadgeOk : UsageBilling_module_css_default.healthBadgeBad),
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: clsx(UsageBilling_module_css_default.healthDot, health.available ? UsageBilling_module_css_default.healthOk : UsageBilling_module_css_default.healthBad),
										"aria-hidden": "true"
									}), health.available ? `${health.models} 模型可用${health.failures > 0 ? ` · ${health.failures} 厂商失效` : ""}` : `${health.failures} 厂商不可用`]
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									className: UsageBilling_module_css_default.closeButton,
									"aria-label": t("billing.close"),
									"data-testid": "billing-close",
									onClick: onClose,
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("svg", {
										viewBox: "0 0 24 24",
										fill: "none",
										stroke: "currentColor",
										"aria-hidden": "true",
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M18 6 6 18" }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "m6 6 12 12" })]
									})
								})
							]
						})]
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: UsageBilling_module_css_default.dashboardBody,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
								className: UsageBilling_module_css_default.hero,
								"data-testid": "billing-hero",
								children: [
									renderSlot("billing.dashboard.decor", { position: "hero" }),
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										className: UsageBilling_module_css_default.heroMain,
										children: [
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
												className: UsageBilling_module_css_default.heroLabel,
												children: t("billing.monthCost")
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
												className: UsageBilling_module_css_default.heroValue,
												children: money(monthCost)
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
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										className: UsageBilling_module_css_default.heroSide,
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
											className: UsageBilling_module_css_default.heroSideItem,
											children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
												className: UsageBilling_module_css_default.heroSideLabel,
												children: t("billing.yearCost")
											}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
												className: UsageBilling_module_css_default.heroSideValue,
												children: money(yearCost)
											})]
										}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
											className: UsageBilling_module_css_default.heroSideItem,
											children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
												className: UsageBilling_module_css_default.heroSideLabel,
												children: t("billing.todayCost")
											}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
												className: UsageBilling_module_css_default.heroSideValue,
												children: [money(todayCost), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
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
									})
								]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
								className: UsageBilling_module_css_default.budget,
								"data-testid": "billing-budget",
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: UsageBilling_module_css_default.budgetHead,
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: UsageBilling_module_css_default.budgetLabel,
										children: t("billing.budget")
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
										className: UsageBilling_module_css_default.budgetControls,
										children: [
											budgetEnabled && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
												className: UsageBilling_module_css_default.budgetInputWrap,
												"data-testid": "billing-budget-input-wrap",
												children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
													className: UsageBilling_module_css_default.budgetUnit,
													"aria-hidden": "true",
													children: "¥"
												}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
													className: UsageBilling_module_css_default.budgetInput,
													"data-testid": "billing-budget-input",
													type: "number",
													min: 0,
													step: 1,
													value: budgetAmount === 0 ? "" : budgetAmount,
													placeholder: stats.budget !== void 0 ? String(stats.budget) : "0",
													"aria-label": `${t("billing.budget")}（元）`,
													title: `${t("billing.budget")}（元）`,
													onChange: (e) => {
														onBudgetAmount(e.target.valueAsNumber);
													}
												})]
											}),
											budgetEnabled && budgetAmount > 0 && (() => {
												const pct = monthCost / budgetAmount * 100;
												return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
													className: UsageBilling_module_css_default.budgetValue,
													"data-testid": "billing-budget-value",
													children: [
														money(monthCost),
														" / ",
														money(budgetAmount),
														" · ",
														pct.toFixed(1),
														"%"
													]
												});
											})(),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
												type: "button",
												role: "switch",
												"aria-checked": budgetEnabled,
												"aria-label": t("billing.budget"),
												"data-testid": "billing-budget-toggle",
												className: clsx(UsageBilling_module_css_default.switch, budgetEnabled && UsageBilling_module_css_default.switchOn),
												onClick: onToggleBudget,
												children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { className: UsageBilling_module_css_default.switchKnob })
											})
										]
									})]
								}), budgetEnabled && budgetAmount > 0 && (() => {
									const pct = monthCost / budgetAmount * 100;
									return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
										className: UsageBilling_module_css_default.budgetTrack,
										"data-testid": "billing-budget-track",
										children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
											className: clsx(UsageBilling_module_css_default.budgetFill, pct >= 100 && UsageBilling_module_css_default.budgetFillOver),
											style: { width: `${Math.min(pct, 100)}%` }
										})
									});
								})()]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
								className: UsageBilling_module_css_default.kpiGrid,
								"data-testid": "billing-kpi-grid",
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										className: UsageBilling_module_css_default.kpiTile,
										"data-testid": "billing-kpi-tile",
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
												children: money(avgPerCall)
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
								className: clsx(UsageBilling_module_css_default.panel, UsageBilling_module_css_default.trendPanel),
								"data-testid": "billing-panel-trend",
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: UsageBilling_module_css_default.panelHead,
									children: [
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h3", {
											className: UsageBilling_module_css_default.panelTitle,
											children: t("billing.trend")
										}),
										renderSlot("billing.dashboard.decor", { position: "trend" }),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: UsageBilling_module_css_default.rangeToggle,
											role: "group",
											"aria-label": t("billing.trend"),
											children: [7, 30].map((days) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
												type: "button",
												className: clsx(UsageBilling_module_css_default.rangeButton, trendDays === days && UsageBilling_module_css_default.rangeButtonActive),
												"aria-pressed": trendDays === days,
												"data-testid": `billing-trend-${days}d`,
												onClick: () => {
													setTrendDays(days);
												},
												children: days === 7 ? t("billing.trend7d") : t("billing.trend30d")
											}, days))
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: UsageBilling_module_css_default.panelHint,
											children: latestDate
										})
									]
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(TrendChart, {
									data: trend,
									models: chartModels,
									currency
								})]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
								className: UsageBilling_module_css_default.panel,
								"data-testid": "billing-panel-providers",
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										className: UsageBilling_module_css_default.panelHead,
										children: [
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h3", {
												className: UsageBilling_module_css_default.panelTitle,
												children: t("billing.providerBilling")
											}),
											renderSlot("billing.dashboard.decor", { position: "models" }),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
												className: UsageBilling_module_css_default.panelHint,
												children: stats.updatedAt !== void 0 ? `${t("billing.lastUpdated")} ${formatClock(stats.updatedAt)}` : ""
											})
										]
									}),
									providerGroups.length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
										className: UsageBilling_module_css_default.emptyRow,
										"data-testid": "billing-provider-empty",
										children: t("billing.noData")
									}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
										className: UsageBilling_module_css_default.providerGroupList,
										"data-testid": "billing-provider-groups",
										children: providerGroups.map((group) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
											className: UsageBilling_module_css_default.providerGroup,
											"data-testid": "billing-provider-group",
											children: [
												/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
													className: UsageBilling_module_css_default.providerGroupHead,
													children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
														className: UsageBilling_module_css_default.providerGroupTitle,
														children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
															className: clsx(UsageBilling_module_css_default.healthDot, group.dot),
															"aria-hidden": "true"
														}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
															className: UsageBilling_module_css_default.providerGroupName,
															children: group.name
														})]
													}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
														className: UsageBilling_module_css_default.providerGroupMeta,
														children: [group.subscriptions.length > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
															className: UsageBilling_module_css_default.providerGroupBadge,
															"data-testid": "billing-provider-sub-count",
															children: [group.subscriptions.length, " 套餐"]
														}), group.balance !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
															className: UsageBilling_module_css_default.providerGroupBalance,
															"data-testid": "billing-provider-balance",
															children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
																className: UsageBilling_module_css_default.providerGroupBalanceLabel,
																children: t("billing.balance")
															}), renderBalance(group.balance)]
														})]
													})]
												}),
												group.models.length > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
													className: clsx(UsageBilling_module_css_default.tableScroll, UsageBilling_module_css_default.modelTableScroll),
													"data-testid": "billing-table-scroll",
													children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("table", {
														className: UsageBilling_module_css_default.modelTable,
														children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("thead", { children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("tr", { children: [
															/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", { children: t("billing.model") }),
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
															})
														] }) }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("tbody", { children: group.models.map((row) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("tr", { children: [
															/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", { children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
																className: UsageBilling_module_css_default.modelCell,
																children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
																	className: UsageBilling_module_css_default.modelName,
																	children: [row.name, row.uncatalogued && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
																		className: UsageBilling_module_css_default.uncataloguedTag,
																		"data-testid": "billing-uncatalogued-tag",
																		children: t("billing.uncatalogued")
																	})]
																}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
																	className: UsageBilling_module_css_default.modelProvider,
																	children: row.provider
																})] })
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
																}) : row.actual !== void 0 ? money(row.actual) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
																	className: UsageBilling_module_css_default.na,
																	children: "—"
																})
															})
														] }, row.key)) })]
													})
												}),
												group.subscriptions.length > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
													className: UsageBilling_module_css_default.subscriptionGrid,
													"data-testid": "billing-subscriptions-grid",
													children: group.subscriptions.map((quota) => {
														const statusText = subscriptionStatusText(quota.status, t);
														return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
															className: UsageBilling_module_css_default.subscriptionCard,
															"data-testid": "billing-subscription-card",
															children: [
																/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
																	className: UsageBilling_module_css_default.subscriptionHead,
																	children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
																		className: UsageBilling_module_css_default.subscriptionName,
																		children: quota.displayName
																	}), quota.plan !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
																		className: UsageBilling_module_css_default.subscriptionPlan,
																		children: quota.plan
																	})]
																}),
																statusText !== "" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
																	className: UsageBilling_module_css_default.subscriptionStatus,
																	children: statusText
																}),
																quota.windows.length === 0 && statusText === "" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
																	className: UsageBilling_module_css_default.subscriptionStatus,
																	children: t("billing.subscriptionNoApi")
																}),
																quota.windows.map((window) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
																	className: UsageBilling_module_css_default.subscriptionWindow,
																	children: [
																		/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
																			className: UsageBilling_module_css_default.subscriptionWindowLabel,
																			children: subscriptionWindowLabel(window.kind, t)
																		}),
																		/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
																			className: UsageBilling_module_css_default.subscriptionTrack,
																			"aria-hidden": "true",
																			children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
																				className: UsageBilling_module_css_default.subscriptionFill,
																				style: { width: `${Math.min(100, Math.max(0, window.remainingPercent))}%` }
																			})
																		}),
																		/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
																			className: UsageBilling_module_css_default.subscriptionPct,
																			children: t("billing.subscriptionRemaining").replace("{pct}", String(window.remainingPercent))
																		}),
																		window.resetsAt !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
																			className: UsageBilling_module_css_default.subscriptionReset,
																			children: t("billing.subscriptionReset").replace("{date}", window.resetsAt.slice(0, 10))
																		})
																	]
																}, window.kind))
															]
														}, quota.provider);
													})
												})
											]
										}, group.name))
									}),
									renderSlot("billing.dashboard.decor", { position: "footer" })
								]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
								className: UsageBilling_module_css_default.panel,
								"data-testid": "billing-panel-heatmap",
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
									type: "button",
									className: UsageBilling_module_css_default.pricingToggle,
									"data-testid": "billing-heatmap-toggle",
									onClick: () => {
										setHeatmapOpen((prev) => !prev);
									},
									"aria-expanded": heatmapOpen,
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: UsageBilling_module_css_default.pricingToggleText,
										children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: UsageBilling_module_css_default.panelTitle,
											children: t("billing.heatmap")
										})
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("svg", {
										className: clsx(UsageBilling_module_css_default.pricingChevron, heatmapOpen && UsageBilling_module_css_default.pricingChevronOpen),
										viewBox: "0 0 24 24",
										fill: "none",
										stroke: "currentColor",
										"aria-hidden": "true",
										children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "m6 9 6 6 6-6" })
									})]
								}), heatmapOpen && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(UsageHeatmap, {
									days: heatmapDays,
									currency,
									t
								})]
							}),
							turns.length > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
								className: UsageBilling_module_css_default.panel,
								"data-testid": "billing-panel-rounds",
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
									type: "button",
									className: UsageBilling_module_css_default.pricingToggle,
									"data-testid": "billing-rounds-toggle",
									onClick: () => {
										setRoundsOpen((prev) => !prev);
									},
									"aria-expanded": roundsOpen,
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
										className: UsageBilling_module_css_default.pricingToggleText,
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: UsageBilling_module_css_default.panelTitle,
											children: t("billing.rounds")
										}), roundFlags.length > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
											className: UsageBilling_module_css_default.roundsFlagBadge,
											"data-testid": "billing-rounds-flag-count",
											children: [
												roundFlags.length,
												" ",
												t("billing.anomaly")
											]
										})]
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("svg", {
										className: clsx(UsageBilling_module_css_default.pricingChevron, roundsOpen && UsageBilling_module_css_default.pricingChevronOpen),
										viewBox: "0 0 24 24",
										fill: "none",
										stroke: "currentColor",
										"aria-hidden": "true",
										children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "m6 9 6 6 6-6" })
									})]
								}), roundsOpen && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(RoundCostChart, {
									rounds: turns,
									flags: roundFlags,
									currency,
									t
								})]
							}),
							stats.byWorkspace !== void 0 && stats.byWorkspace.length > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
								className: UsageBilling_module_css_default.panel,
								"data-testid": "billing-panel-workspaces",
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
									type: "button",
									className: UsageBilling_module_css_default.pricingToggle,
									"data-testid": "billing-workspaces-toggle",
									onClick: () => {
										setWorkspacesOpen((prev) => !prev);
									},
									"aria-expanded": workspacesOpen,
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: UsageBilling_module_css_default.pricingToggleText,
										children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: UsageBilling_module_css_default.panelTitle,
											children: t("billing.workspaces")
										})
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("svg", {
										className: clsx(UsageBilling_module_css_default.pricingChevron, workspacesOpen && UsageBilling_module_css_default.pricingChevronOpen),
										viewBox: "0 0 24 24",
										fill: "none",
										stroke: "currentColor",
										"aria-hidden": "true",
										children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "m6 9 6 6 6-6" })
									})]
								}), workspacesOpen && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									className: UsageBilling_module_css_default.tableScroll,
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("table", {
										className: UsageBilling_module_css_default.modelTable,
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("thead", { children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("tr", { children: [
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", { children: t("billing.project") }),
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
												children: t("billing.actual")
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", {
												className: UsageBilling_module_css_default.numCol,
												children: t("billing.lastActive")
											})
										] }) }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("tbody", { children: stats.byWorkspace.map((row) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("tr", { children: [
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", { children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
												className: UsageBilling_module_css_default.modelName,
												children: row.name
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
												children: money(row.cost)
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", {
												className: UsageBilling_module_css_default.numCol,
												children: row.lastActive > 0 ? `${localDayStamp(row.lastActive)}` : "—"
											})
										] }, row.name)) })]
									})
								})]
							}),
							stats.bySession !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
								className: UsageBilling_module_css_default.panel,
								"data-testid": "billing-panel-sessions",
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
									type: "button",
									className: UsageBilling_module_css_default.pricingToggle,
									"data-testid": "billing-sessions-toggle",
									onClick: () => {
										setSessionsOpen((prev) => !prev);
									},
									"aria-expanded": sessionsOpen,
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
										className: UsageBilling_module_css_default.pricingToggleText,
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: UsageBilling_module_css_default.panelTitle,
											children: t("billing.sessions")
										}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: UsageBilling_module_css_default.panelHint,
											children: stats.bySession.length > SESSION_DISPLAY_LIMIT ? t("billing.sessionOverflow").replace("{limit}", String(SESSION_DISPLAY_LIMIT)).replace("{total}", String(stats.bySession.length)) : `${stats.bySession.length}`
										})]
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("svg", {
										className: clsx(UsageBilling_module_css_default.pricingChevron, sessionsOpen && UsageBilling_module_css_default.pricingChevronOpen),
										viewBox: "0 0 24 24",
										fill: "none",
										stroke: "currentColor",
										"aria-hidden": "true",
										children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "m6 9 6 6 6-6" })
									})]
								}), sessionsOpen && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									className: UsageBilling_module_css_default.tableScroll,
									"data-testid": "billing-sessions-table",
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("table", {
										className: UsageBilling_module_css_default.modelTable,
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("thead", { children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("tr", { children: [
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", { children: t("billing.sessions") }),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", { children: t("billing.project") }),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", {
												className: UsageBilling_module_css_default.numCol,
												children: t("billing.calls")
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", {
												className: UsageBilling_module_css_default.numCol,
												children: t("billing.actual")
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", {
												className: UsageBilling_module_css_default.numCol,
												children: t("billing.lastActive")
											})
										] }) }), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("tbody", { children: [stats.bySession.length === 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("tr", { children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", {
											colSpan: 5,
											className: UsageBilling_module_css_default.emptyRow,
											children: t("billing.noData")
										}) }), stats.bySession.slice(0, SESSION_DISPLAY_LIMIT).map((row) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("tr", { children: [
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", { children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
												className: UsageBilling_module_css_default.modelName,
												children: row.title ?? row.id.slice(0, 8)
											}) }),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", { children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
												className: UsageBilling_module_css_default.modelProvider,
												children: projectName(row.cwd) ?? "—"
											}) }),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", {
												className: UsageBilling_module_css_default.numCol,
												children: row.calls.toLocaleString()
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", {
												className: UsageBilling_module_css_default.numCol,
												children: money(row.cost)
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", {
												className: UsageBilling_module_css_default.numCol,
												children: row.lastActive > 0 ? `${localDayStamp(row.lastActive)} ${formatClock(row.lastActive)}` : "—"
											})
										] }, row.id))] })]
									})
								})]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
								className: UsageBilling_module_css_default.panel,
								"data-testid": "billing-panel-pricing",
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
									type: "button",
									className: UsageBilling_module_css_default.pricingToggle,
									"data-testid": "billing-pricing-toggle",
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
			const { t, checkModels, publishCosts, registerOpen, renderSlot, useStore, actions } = props;
			const [stats, setStats] = (0, react.useState)(EMPTY_STATS);
			const [health, setHealth] = (0, react.useState)(IDLE_HEALTH);
			const [balances, setBalances] = (0, react.useState)([]);
			const [quotas, setQuotas] = (0, react.useState)([]);
			const [currency, setCurrency] = (0, react.useState)("cny");
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
				fetchSubscriptions().then((list) => {
					if (list.length > 0) setQuotas(list);
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
			const todayCost = stats.byDay[today]?.cost ?? 0;
			const budgetEnabled = useStore((s) => s.enabled);
			const budgetAmount = useStore((s) => s.amount);
			const budgetAlertedDay = useStore((s) => s.lastAlertDay);
			const effectiveBudget = budgetAmount > 0 ? budgetAmount : stats.budget ?? 0;
			const toggleBudget = (0, react.useCallback)(() => {
				const next = !budgetEnabled;
				actions.setEnabled(next);
				if (next && typeof Notification !== "undefined" && Notification.permission === "default") Notification.requestPermission();
			}, [actions, budgetEnabled]);
			(0, react.useEffect)(() => {
				if (!budgetEnabled || effectiveBudget <= 0) return;
				const pct = monthCost / effectiveBudget * 100;
				if (pct < 100) return;
				const day = localDayStamp();
				if (budgetAlertedDay === day) return;
				actions.markAlerted(day);
				if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
				const body = t("billing.budgetOverBody").replace("{cost}", formatMoney(monthCost)).replace("{budget}", formatMoney(effectiveBudget)).replace("{pct}", pct.toFixed(0));
				try {
					new Notification(t("billing.budget"), { body });
				} catch {}
			}, [
				budgetEnabled,
				effectiveBudget,
				monthCost,
				budgetAlertedDay,
				actions,
				t
			]);
			const lastBalanceAlertDay = useStore((s) => s.lastBalanceAlertDay);
			const lowBalanceRow = (0, react.useMemo)(() => {
				if (balances.length === 0) return void 0;
				const threshold = stats.lowBalanceThreshold ?? DEFAULT_LOW_BALANCE_THRESHOLD;
				const burn = dailyBurnRate(stats.byDay, today);
				const rate = getRateInfo().rate;
				for (const balance of balances) {
					if (balance.totalBalance === void 0 || balance.error !== void 0) continue;
					const cny = balance.currency === "USD" ? balance.totalBalance * rate : balance.totalBalance;
					if (cny >= threshold) continue;
					const days = burn > 0 ? Math.floor(cny / burn) : void 0;
					return {
						name: balance.displayName,
						cny,
						days
					};
				}
			}, [
				balances,
				stats.lowBalanceThreshold,
				stats.byDay,
				today
			]);
			(0, react.useEffect)(() => {
				if (lowBalanceRow === void 0) return;
				const day = localDayStamp();
				if (lastBalanceAlertDay === day) return;
				actions.markBalanceAlerted(day);
				if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
				const body = t("billing.balanceLowBody").replace("{name}", lowBalanceRow.name).replace("{balance}", formatMoney(lowBalanceRow.cny)).replace("{days}", lowBalanceRow.days === void 0 ? "—" : String(lowBalanceRow.days));
				try {
					new Notification(t("billing.balance"), { body });
				} catch {}
			}, [
				lowBalanceRow,
				lastBalanceAlertDay,
				actions,
				t
			]);
			(0, react.useEffect)(() => {
				publishCosts({
					todayCost,
					monthCost
				});
			}, [
				todayCost,
				monthCost,
				publishCosts
			]);
			(0, react.useEffect)(() => registerOpen(openDashboard), [registerOpen, openDashboard]);
			const turns = (0, react.useMemo)(() => stats.byTurn ?? [], [stats.byTurn]);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(UsageBillingTrigger, {
				...props,
				onOpen: openDashboard,
				monthCost,
				todayCost
			}), open && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(BillingDashboard, {
				stats,
				t,
				onClose: close,
				health,
				balances,
				quotas,
				currency,
				onCurrency: setCurrency,
				turns,
				renderSlot,
				budgetEnabled,
				budgetAmount: effectiveBudget,
				onToggleBudget: toggleBudget,
				onBudgetAmount: actions.setAmount
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
			"billing.trend7d": "7 天",
			"billing.trend30d": "30 天",
			"billing.trendEmpty": "暂无趋势数据",
			"billing.budget": "本月预算",
			"billing.sessions": "会话明细",
			"billing.project": "项目",
			"billing.lastActive": "最后活跃",
			"billing.sessionOverflow": "仅显示花费前 {limit} 个，共 {total} 个会话",
			"billing.budgetOverBody": "本月花费 {cost} 已超过预算 {budget}（{pct}%）",
			"billing.models": "模型计费明细",
			"billing.providerBilling": "厂商计费与订阅",
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
			"billing.balanceUnreachable": "查询失败",
			"billing.uncatalogued": "未收录",
			"billing.balanceDays": "约可撑 {days} 天",
			"billing.balanceLowBody": "{name} 余额 {balance}，约可撑 {days} 天，请及时充值",
			"billing.subscriptions": "订阅套餐",
			"billing.subscriptionNotConfigured": "未配置密钥",
			"billing.subscriptionUnauthorized": "密钥无效",
			"billing.subscriptionUnavailable": "查询失败",
			"billing.subscriptionInvalid": "响应异常",
			"billing.subscriptionRateLimited": "触发限流",
			"billing.subscriptionSession": "本次",
			"billing.subscriptionWeekly": "本周",
			"billing.subscriptionMonthly": "本月",
			"billing.subscriptionBilling": "计费周期",
			"billing.subscriptionRemaining": "剩余 {pct}%",
			"billing.subscriptionReset": "{date} 重置",
			"billing.subscriptionNoApi": "该厂商暂未提供用量查询接口",
			"billing.heatmapLess": "少",
			"billing.heatmapMore": "多",
			"billing.currency": "币种",
			"billing.currencyCny": "人民币",
			"billing.currencyUsd": "美元",
			"billing.heatmap": "用量热力图",
			"billing.rounds": "每轮费用",
			"billing.anomaly": "成本突增",
			"billing.workspaces": "工作区统计",
			"billing.plan": "套餐",
			"billing.remaining": "剩余",
			"billing.unknownModel": "未定价",
			"billing.model": "模型",
			"billing.currentRound": "当前",
			"billing.costAbbr": "费用"
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
			"billing.trend7d": "7D",
			"billing.trend30d": "30D",
			"billing.trendEmpty": "No trend data yet",
			"billing.budget": "Monthly budget",
			"billing.sessions": "Sessions",
			"billing.project": "Project",
			"billing.lastActive": "Last active",
			"billing.sessionOverflow": "Top {limit} of {total} sessions by cost",
			"billing.budgetOverBody": "This month {cost} exceeded the budget {budget} ({pct}%)",
			"billing.models": "Model billing",
			"billing.providerBilling": "Provider billing & subscriptions",
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
			"billing.balanceUnreachable": "Unavailable",
			"billing.uncatalogued": "Not catalogued",
			"billing.balanceDays": "~{days} days left",
			"billing.balanceLowBody": "{name} balance {balance}, ~{days} days left, please top up",
			"billing.subscriptions": "Subscriptions",
			"billing.subscriptionNotConfigured": "Key not set",
			"billing.subscriptionUnauthorized": "Bad key",
			"billing.subscriptionUnavailable": "Unavailable",
			"billing.subscriptionInvalid": "Bad response",
			"billing.subscriptionRateLimited": "Rate limited",
			"billing.subscriptionSession": "Current",
			"billing.subscriptionWeekly": "Weekly",
			"billing.subscriptionMonthly": "Monthly",
			"billing.subscriptionBilling": "Billing",
			"billing.subscriptionRemaining": "{pct}% left",
			"billing.subscriptionReset": "Resets {date}",
			"billing.subscriptionNoApi": "Provider does not offer a usage API",
			"billing.heatmapLess": "Less",
			"billing.heatmapMore": "More",
			"billing.currency": "Currency",
			"billing.currencyCny": "CNY",
			"billing.currencyUsd": "USD",
			"billing.heatmap": "Usage heatmap",
			"billing.rounds": "Cost per turn",
			"billing.anomaly": "Cost spike",
			"billing.workspaces": "Workspaces",
			"billing.plan": "Plan",
			"billing.remaining": "Left",
			"billing.unknownModel": "Unpriced",
			"billing.model": "Model",
			"billing.currentRound": "current",
			"billing.costAbbr": "cost"
		};
		//#endregion
		//#region src/client/billing-service.ts
		/** 创建计费指标运行时（apply 内调用，随插件纤维存活）。 */
		function createBillingMetrics() {
			let costs;
			let open;
			const listeners = /* @__PURE__ */ new Set();
			return {
				readCosts: () => costs,
				subscribeCosts: (listener) => {
					listener(costs);
					listeners.add(listener);
					return () => {
						listeners.delete(listener);
					};
				},
				openDashboard: () => {
					open?.();
				},
				publishCosts: (next) => {
					costs = next;
					for (const listener of listeners) listener(next);
				},
				registerOpen: (handler) => {
					open = handler;
					return () => {
						if (open === handler) open = void 0;
					};
				}
			};
		}
		//#endregion
		//#region src/client/budget-store.ts
		/**
		* 预算偏好 store：本月预算的开关与金额。
		*
		* 用户在仪表盘里用开关控制预算条显隐、用数字输入框设置金额；状态经框架
		* store 引擎持久化到 localStorage（persist key 即存储身份），重启后保留。
		* 宿主 Config 的 monthlyBudget 仅作为金额未设置时的默认值，用户输入优先。
		*/
		/**
		* Declare the budget-preferences store handle.
		* @returns the store handle for the register call's store seat.
		*/
		function createBillingBudgetStore() {
			return (0, _deepseek_ai_dsh_client_runtime_client.defineStore)({
				init: () => ({
					enabled: false,
					amount: 0,
					lastAlertDay: "",
					lastBalanceAlertDay: ""
				}),
				persist: "dsh.ui-usage-billing.budget",
				actions: {
					setEnabled: (d, on) => {
						d.enabled = on;
					},
					setAmount: (d, value) => {
						d.amount = Number.isFinite(value) && value > 0 ? value : 0;
					},
					markAlerted: (d, day) => {
						d.lastAlertDay = day;
					},
					markBalanceAlerted: (d, day) => {
						d.lastBalanceAlertDay = day;
					}
				}
			});
		}
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
			const metrics = createBillingMetrics();
			ctx.provide("billingMetrics", metrics);
			const budgetStore = createBillingBudgetStore();
			ctx.effect(() => ctx.locale.register(NS, {
				zh,
				en
			}), "ui-usage-billing: dictionaries");
			ctx.slots.inject("sidebar.footer.action", () => ctx.slots.register({
				name: "sidebar.footer.action",
				id: "usage-billing",
				order: -10,
				locale: NS,
				children: { "billing.dashboard.decor": {
					kind: "list",
					scope: "root"
				} },
				store: budgetStore,
				inject: () => ({
					checkModels: async () => {
						try {
							const { result } = await ctx.connection.api.llm.models({});
							if (!result.ok) return {
								checked: true,
								available: false,
								models: 0,
								failures: 0,
								okProviders: [],
								badProviders: []
							};
							return {
								checked: true,
								available: result.value.groups.length > 0,
								models: result.value.groups.reduce((sum, group) => sum + group.models.length, 0),
								failures: result.value.failures.length,
								okProviders: result.value.groups.map((group) => group.name),
								badProviders: result.value.failures.map((failure) => failure.name)
							};
						} catch {
							return {
								checked: true,
								available: false,
								models: 0,
								failures: 0,
								okProviders: [],
								badProviders: []
							};
						}
					},
					publishCosts: (costs) => {
						metrics.publishCosts(costs);
					},
					registerOpen: (handler) => metrics.registerOpen(handler)
				})
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