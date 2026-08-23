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
		const css = ".VWh0dG_railButton{border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-2);width:36px;height:36px;color:var(--dsw-alias-label-secondary);cursor:pointer;border-radius:8px;flex:none;justify-content:center;align-items:center;padding:0;transition:border-color .16s,color .16s;display:flex}.VWh0dG_railButton:hover,.VWh0dG_railButton:focus-visible{border-color:var(--dsw-static-blue-500);color:var(--dsw-static-blue-500);outline:none}.VWh0dG_railButton svg{stroke-width:2px;width:18px;height:18px}.VWh0dG_trigger{border:1px solid color-mix(in srgb, var(--dsw-alias-border-l1) 82%, transparent);background:color-mix(in srgb, var(--dsw-alias-bg-layer-2) 78%, transparent);-webkit-backdrop-filter:blur(10px)saturate(1.2);width:100%;min-width:0;box-shadow:inset 0 1px 0 color-mix(in srgb, var(--dsw-alias-label-primary) 7%, transparent);color:var(--dsw-alias-label-primary);cursor:pointer;text-align:left;border-radius:14px;align-items:center;gap:10px;padding:9px 12px;transition:border-color .16s,transform .16s,box-shadow .16s;display:flex;position:relative;overflow:hidden}.VWh0dG_trigger:hover,.VWh0dG_trigger:focus-visible{border-color:var(--dsw-static-blue-500);box-shadow:inset 0 1px 0 color-mix(in srgb, var(--dsw-alias-label-primary) 10%, transparent), 0 6px 18px -6px color-mix(in srgb, var(--dsw-static-blue-500) 45%, transparent);outline:none;transform:translateY(-1px)}.VWh0dG_triggerIcon{background:linear-gradient(135deg, var(--dsw-static-blue-500), var(--dsw-static-blue-400));width:30px;height:30px;color:var(--dsw-static-neutral-bluish-00);box-shadow:0 3px 10px -3px color-mix(in srgb, var(--dsw-static-blue-500) 60%, transparent), inset 0 1px 0 color-mix(in srgb, var(--dsw-static-neutral-bluish-00) 22%, transparent);border-radius:10px;flex:none;justify-content:center;align-items:center;display:inline-flex}.VWh0dG_triggerIcon svg{stroke-width:2px;width:16px;height:16px}.VWh0dG_triggerBody{flex-direction:column;flex:1;gap:1px;min-width:0;display:flex}.VWh0dG_triggerRow{align-items:baseline;gap:5px;min-width:0;display:inline-flex}.VWh0dG_triggerAmount{color:var(--dsw-alias-label-primary);letter-spacing:-.02em;font-variant-numeric:tabular-nums;white-space:nowrap;font-size:17px;font-weight:700;line-height:21px}.VWh0dG_triggerSub{color:var(--dsw-alias-label-tertiary);white-space:nowrap;text-overflow:ellipsis;font-size:10px;line-height:14px;overflow:hidden}.VWh0dG_triggerMeta{color:var(--dsw-alias-label-tertiary);white-space:nowrap;letter-spacing:.02em;text-transform:uppercase;font-size:9.5px;font-weight:600;line-height:12px}.VWh0dG_triggerSpark{flex:none;align-items:flex-end;gap:2px;height:20px;display:flex}.VWh0dG_triggerSparkBar,.VWh0dG_triggerSparkHot{background:var(--dsw-static-blue-500);opacity:.6;border-radius:1px 1px 0 0;width:3px}.VWh0dG_triggerSparkHot{opacity:1}.VWh0dG_triggerWrap{flex:auto;width:100%;min-width:0;display:block;position:relative}.VWh0dG_triggerPop{border:1px solid color-mix(in srgb, var(--dsw-alias-border-l1) 80%, transparent);background:color-mix(in srgb, var(--dsw-alias-bg-layer-2) 72%, transparent);-webkit-backdrop-filter:blur(14px)saturate(1.3);box-shadow:0 12px 32px #00000029, inset 0 1px 0 color-mix(in srgb, var(--dsw-alias-label-primary) 8%, transparent);opacity:0;pointer-events:none;z-index:10;border-radius:14px;flex-direction:column;gap:5px;padding:10px 12px;transition:opacity .16s,transform .16s;display:flex;position:absolute;bottom:calc(100% + 8px);left:0;right:0;overflow:hidden;transform:translateY(4px)}.VWh0dG_triggerPop:before{content:\"\";background:linear-gradient(90deg, transparent 0%, var(--dsw-static-amber-500) 30%, var(--dsw-alias-label-primary) 50%, var(--dsw-static-amber-500) 70%, transparent 100%);opacity:.9;pointer-events:none;background-size:200% 100%;height:1.5px;animation:4s ease-in-out infinite VWh0dG_subscriptionGoldFlow;position:absolute;top:0;left:0;right:0}.VWh0dG_triggerWrap:hover .VWh0dG_triggerPop,.VWh0dG_triggerWrap:focus-within .VWh0dG_triggerPop{opacity:1;transform:translateY(0)}.VWh0dG_triggerPopRow{white-space:nowrap;justify-content:space-between;align-items:baseline;gap:12px;display:flex}.VWh0dG_triggerPopLabel{letter-spacing:.01em;color:var(--dsw-alias-label-tertiary);white-space:nowrap;flex:none;font-size:10.5px;line-height:16px}.VWh0dG_triggerPopValue{min-width:0;color:var(--dsw-alias-label-primary);font-variant-numeric:tabular-nums;justify-content:flex-end;align-items:baseline;gap:8px;font-size:12.5px;font-weight:600;line-height:17px;display:inline-flex}.VWh0dG_triggerPopName{text-overflow:ellipsis;white-space:nowrap;max-width:110px;color:var(--dsw-alias-label-secondary);font-size:12px;font-weight:500;overflow:hidden}.VWh0dG_triggerPopTitle{color:var(--dsw-alias-label-primary);white-space:nowrap;align-items:baseline;gap:8px;font-size:12px;font-weight:700;display:flex}.VWh0dG_triggerPopTitleMonth{color:var(--dsw-alias-label-tertiary);font-size:11px;font-weight:500}.VWh0dG_triggerPopStrong{color:var(--dsw-alias-label-primary);margin-left:8px;font-size:12.5px;font-weight:700}.VWh0dG_triggerPopAlert{color:var(--dsw-static-red-500);white-space:nowrap;font-size:11px;line-height:16px}.VWh0dG_triggerPopValueStack{flex-direction:column;align-items:flex-end;gap:2px;display:flex}.VWh0dG_triggerPopMuted{color:var(--dsw-alias-label-tertiary);font-weight:500}.VWh0dG_triggerPopHead{justify-content:space-between;align-items:baseline;gap:10px;display:flex}.VWh0dG_triggerPopUpdated{color:var(--dsw-alias-label-tertiary);white-space:nowrap;font-size:10px}.VWh0dG_triggerPopMetrics{grid-template-columns:1fr 1fr;gap:7px 12px;display:grid}.VWh0dG_triggerPopMetric{flex-direction:column;align-items:flex-start;gap:1px;display:flex}.VWh0dG_triggerPopMetricLabel{color:var(--dsw-alias-label-tertiary);white-space:nowrap;font-size:10px}.VWh0dG_triggerPopMetricValue{color:var(--dsw-alias-label-primary);font-variant-numeric:tabular-nums;white-space:nowrap;font-size:14px;font-weight:700;line-height:18px}.VWh0dG_triggerPopMetricHighlight{color:var(--dsw-static-amber-500)}.VWh0dG_triggerPopFoot{border-top:1px solid color-mix(in srgb, var(--dsw-alias-border-l1) 70%, transparent);flex-direction:column;gap:4px;padding-top:6px;display:flex}.VWh0dG_triggerPopFootTitle{text-align:center;letter-spacing:.05em;color:var(--dsw-alias-label-tertiary);border-bottom:1px solid color-mix(in srgb, var(--dsw-alias-border-l1) 70%, transparent);padding-bottom:4px;font-size:10px;font-weight:600}.VWh0dG_triggerPopFootNotes{flex-direction:column;gap:1px;min-width:0;display:flex}.VWh0dG_triggerPopFootNote{align-items:baseline;gap:4px;min-width:0;display:flex}.VWh0dG_triggerPopFootName{color:var(--dsw-alias-label-tertiary);white-space:nowrap;text-overflow:ellipsis;font-size:10px;overflow:hidden}.VWh0dG_triggerPopBadge{white-space:nowrap;border-radius:5px;flex:none;padding:1px 6px;font-size:9.5px;font-weight:600;line-height:14px}.VWh0dG_triggerPopBadgeDirect{background:color-mix(in srgb, var(--dsw-alias-label-primary) 12%, transparent);color:var(--dsw-alias-label-primary)}.VWh0dG_triggerPopBadgeSub{background:color-mix(in srgb, var(--dsw-static-amber-500) 18%, transparent);color:var(--dsw-static-amber-500)}.VWh0dG_triggerPopFootStrong{color:var(--dsw-alias-label-secondary);font-weight:600}.VWh0dG_triggerPopFootStatus{color:var(--dsw-alias-label-primary);font-variant-numeric:tabular-nums;white-space:nowrap;font-size:14px;font-weight:700;line-height:18px}.VWh0dG_triggerPopFootStatusLow{color:var(--dsw-static-red-500)}.VWh0dG_triggerPopOpenBtn{pointer-events:auto;border:1px solid color-mix(in srgb, var(--dsw-alias-border-l1) 80%, transparent);color:var(--dsw-alias-label-primary);background:color-mix(in srgb, var(--dsw-alias-bg-layer-3) 70%, transparent);cursor:pointer;border-radius:999px;flex:none;padding:5px 11px;font-size:11px;font-weight:600;transition:border-color .16s,background-color .16s}.VWh0dG_triggerPopOpenBtn:hover{border-color:var(--dsw-static-blue-500);background:color-mix(in srgb, var(--dsw-static-blue-500) 12%, var(--dsw-alias-bg-layer-3))}.VWh0dG_triggerPopBars{border-top:1px solid var(--dsw-alias-border-l1);align-items:flex-end;gap:4px;height:22px;margin-top:4px;padding-top:8px;display:flex}.VWh0dG_triggerPopBar{background:var(--dsw-static-blue-500);border-radius:2px;flex:1;transition:height .2s}.VWh0dG_dashboardModal{border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-1);width:min(760px,100vw - 48px);max-height:min(760px,88vh);box-shadow:var(--dsw-shadow-lv3);animation:.18s ease-out VWh0dG_dashboardIn}@keyframes VWh0dG_dashboardIn{0%{opacity:0;transform:translateY(8px)scale(.98)}to{opacity:1;transform:none}}div[role=presentation]:has(>.dsh-billing-modal)>div[aria-hidden=true]:first-child{backdrop-filter:blur(8px)saturate(1.25)}.VWh0dG_dashboard{flex-direction:column;width:100%;max-height:min(760px,88vh);display:flex}.VWh0dG_dashboardHead{border-bottom:1px solid var(--dsw-alias-border-l1);justify-content:space-between;align-items:flex-start;gap:12px;padding:20px 24px 14px;display:flex}.VWh0dG_dashboardTitle{color:var(--dsw-alias-label-primary);margin:0;font-size:17px;font-weight:600;line-height:24px}.VWh0dG_dashboardSubtitle{color:var(--dsw-alias-label-caption);margin:3px 0 0;font-size:12px;line-height:17px}.VWh0dG_closeButton{width:30px;height:30px;color:var(--dsw-alias-label-secondary);cursor:pointer;background:0 0;border:none;border-radius:8px;flex:none;justify-content:center;align-items:center;transition:background-color .14s;display:inline-flex}.VWh0dG_closeButton:hover{background:var(--dsw-alias-interactive-bg-hover)}.VWh0dG_closeButton svg{stroke-width:2px;width:16px;height:16px}.VWh0dG_dashboardBody{flex-direction:column;gap:14px;padding:16px 24px 24px;display:flex;overflow-y:auto}.VWh0dG_tabNav{border-bottom:1px solid var(--dsw-alias-border-l1);align-items:center;gap:4px;padding:10px 24px;display:flex}.VWh0dG_tabButton{color:var(--dsw-alias-label-tertiary);cursor:pointer;background:0 0;border:none;border-radius:999px;padding:5px 14px;font-size:12.5px;font-weight:500;line-height:18px;transition:background-color .16s,color .16s,box-shadow .16s}.VWh0dG_tabButton:hover,.VWh0dG_tabButton:focus-visible{color:var(--dsw-alias-label-primary);background:var(--dsw-alias-interactive-bg-hover);outline:none}.VWh0dG_tabButtonActive,.VWh0dG_tabButtonActive:hover,.VWh0dG_tabButtonActive:focus-visible{background:var(--dsw-static-blue-500);color:var(--dsw-static-neutral-bluish-00);font-weight:600}.VWh0dG_tabPanel{flex-direction:column;gap:14px;animation:.14s ease-out VWh0dG_tabPanelIn;display:flex}@keyframes VWh0dG_tabPanelIn{0%{opacity:0;transform:translateY(4px)}to{opacity:1;transform:none}}.VWh0dG_hero{border:1px solid var(--dsw-alias-border-l1);background:linear-gradient(180deg, var(--dsw-alias-bg-layer-2), var(--dsw-alias-bg-layer-1));box-shadow:inset 0 1px 0 color-mix(in srgb, var(--dsw-static-neutral-bluish-00) 30%, transparent);border-radius:16px;flex-direction:column;gap:18px;padding:22px 24px;display:flex;position:relative;overflow:hidden}.VWh0dG_heroTop{justify-content:space-between;align-items:center;gap:24px;display:flex}.VWh0dG_heroMain{flex-direction:column;gap:2px;min-width:0;display:flex}.VWh0dG_heroLabel{color:var(--dsw-alias-label-tertiary);text-transform:uppercase;letter-spacing:.08em;white-space:nowrap;font-size:11px;line-height:16px}.VWh0dG_heroReadout{align-items:baseline;gap:4px;display:flex}.VWh0dG_heroCurrency{letter-spacing:-.01em;color:var(--dsw-alias-label-secondary);font-variant-numeric:tabular-nums;font-size:20px;font-weight:600;line-height:30px}.VWh0dG_heroValue{letter-spacing:-.03em;font-variant-numeric:tabular-nums;white-space:nowrap;color:var(--dsw-alias-label-primary);font-size:56px;font-weight:700;line-height:64px}.VWh0dG_heroMeta{color:var(--dsw-alias-label-caption);white-space:nowrap;margin-top:4px;font-size:12px;line-height:17px}.VWh0dG_heroGauge{flex:none;width:96px;height:96px;position:relative}.VWh0dG_heroGaugeSvg{width:100%;height:100%;display:block;transform:rotate(-90deg)}.VWh0dG_heroGaugeTrack{fill:none;stroke:var(--dsw-alias-bg-module-platform);stroke-width:9px}.VWh0dG_heroGaugeArc{fill:none;stroke:var(--dsw-static-blue-500);stroke-width:9px;stroke-linecap:round;transition:stroke-dasharray .26s}.VWh0dG_heroGaugeArcOver{stroke:var(--dsw-static-red-500)}.VWh0dG_heroGaugeCenter{flex-direction:column;justify-content:center;align-items:center;gap:1px;display:flex;position:absolute;inset:0}.VWh0dG_heroGaugePct{letter-spacing:-.02em;font-variant-numeric:tabular-nums;color:var(--dsw-alias-label-primary);font-size:18px;font-weight:700;line-height:22px}.VWh0dG_heroGaugePctOver{color:var(--dsw-static-red-500)}.VWh0dG_heroGaugeLabel{color:var(--dsw-alias-label-tertiary);font-size:10px;line-height:14px}.VWh0dG_heroSide{border-top:1px solid var(--dsw-alias-border-l1);align-items:stretch;padding-top:14px;display:flex}.VWh0dG_heroSideItem{flex-direction:column;flex:1;gap:3px;min-width:0;padding-left:16px;display:flex}.VWh0dG_heroSideItem:first-child{padding-left:0}.VWh0dG_heroSideLabel{color:var(--dsw-alias-label-tertiary);white-space:nowrap;font-size:11px;line-height:15px}.VWh0dG_heroSideValue{color:var(--dsw-alias-label-primary);font-variant-numeric:tabular-nums;letter-spacing:-.01em;white-space:nowrap;align-items:baseline;gap:6px;font-size:18px;font-weight:600;line-height:24px;display:inline-flex}.VWh0dG_heroSideSpacer{flex:1;display:block}.VWh0dG_delta{align-items:center;gap:2px;margin-left:4px;font-size:11px;font-weight:600;line-height:17px;display:inline-flex}.VWh0dG_deltaUp{color:var(--dsw-static-green-500)}.VWh0dG_deltaDown{color:var(--dsw-static-red-500)}.VWh0dG_kpiGrid{grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;display:grid}.VWh0dG_kpiTile{border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-1);border-radius:14px;flex-direction:column;gap:3px;padding:14px 15px;transition:border-color .16s;display:flex;position:relative;overflow:hidden}.VWh0dG_kpiTile:hover{border-color:var(--dsw-alias-border-l2)}.VWh0dG_kpiLabel{color:var(--dsw-alias-label-tertiary);font-size:11px;line-height:15px}.VWh0dG_kpiValue{color:var(--dsw-alias-label-primary);font-variant-numeric:tabular-nums;letter-spacing:-.01em;font-size:22px;font-weight:600;line-height:28px}.VWh0dG_kpiGreen{color:var(--dsw-static-green-500)}.VWh0dG_kpiDetail{color:var(--dsw-alias-label-caption);white-space:nowrap;text-overflow:ellipsis;font-size:11px;line-height:15px;overflow:hidden}.VWh0dG_panel{border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-1);border-radius:16px;flex-direction:column;gap:10px;padding:16px 18px;transition:border-color .16s;display:flex}.VWh0dG_panelHead{justify-content:space-between;align-items:baseline;gap:10px;display:flex}.VWh0dG_panelTitle{letter-spacing:-.005em;color:var(--dsw-alias-label-primary);margin:0;font-size:14px;font-weight:600;line-height:20px}.VWh0dG_panelHint{color:var(--dsw-alias-label-caption);white-space:nowrap;font-size:11px;line-height:16px}.VWh0dG_pricingTip{color:var(--dsw-alias-label-caption);margin:0 0 2px;font-size:11px;line-height:16px}.VWh0dG_rangeToggle{border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-1);border-radius:8px;gap:2px;padding:2px;display:inline-flex}.VWh0dG_rangeButton{color:var(--dsw-alias-label-tertiary);cursor:pointer;background:0 0;border:none;border-radius:6px;padding:2px 8px;font-size:11px;line-height:16px;transition:background-color .14s,color .14s}.VWh0dG_rangeButtonActive{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary);font-weight:600}.VWh0dG_exportBar{justify-content:flex-end;align-items:center;gap:8px;display:flex}.VWh0dG_exportLabel{color:var(--dsw-alias-label-caption);font-size:11px;line-height:16px}.VWh0dG_exportButton{border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-secondary);cursor:pointer;border-radius:999px;padding:4px 12px;font-size:11.5px;line-height:16px;transition:border-color .16s,color .16s,background-color .16s}.VWh0dG_exportButton:hover,.VWh0dG_exportButton:focus-visible{border-color:var(--dsw-alias-border-l2);color:var(--dsw-alias-label-primary);outline:none}.VWh0dG_shareTrack{background:var(--dsw-alias-bg-module-platform);border-radius:999px;height:10px;display:flex;overflow:hidden}.VWh0dG_shareSeg{height:100%;transition:width .2s}.VWh0dG_shareSegPeak{background:var(--dsw-static-blue-500)}.VWh0dG_shareSegOff{background:color-mix(in srgb, var(--dsw-static-blue-500) 25%, var(--dsw-alias-bg-module-platform))}.VWh0dG_shareSegUser{background:var(--dsw-static-blue-500)}.VWh0dG_shareSegAssistant{background:var(--dsw-static-green-500)}.VWh0dG_shareSegTool{background:var(--dsw-static-amber-500)}.VWh0dG_shareLegend{align-items:center;gap:16px;display:flex}.VWh0dG_shareItem{color:var(--dsw-alias-label-secondary);align-items:baseline;gap:6px;font-size:12px;line-height:17px;display:inline-flex}.VWh0dG_bucketCost{align-items:baseline;gap:3px;display:inline-flex}.VWh0dG_bucketOfficial{color:var(--dsw-static-blue-500);font-weight:600}.VWh0dG_bucketSep{color:var(--dsw-alias-label-dimmed)}.VWh0dG_bucketThird{color:var(--dsw-alias-label-secondary)}.VWh0dG_bucketSummary{grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;display:grid}.VWh0dG_bucketStat{border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-2);border-radius:12px;flex-direction:column;gap:4px;padding:12px 14px;display:flex}.VWh0dG_bucketStatLabel{color:var(--dsw-alias-label-tertiary);text-transform:uppercase;letter-spacing:.05em;font-size:11px;line-height:15px}.VWh0dG_bucketStatValue{color:var(--dsw-alias-label-primary);font-variant-numeric:tabular-nums;letter-spacing:-.01em;font-size:20px;font-weight:700;line-height:26px}.VWh0dG_bucketStatSub{color:var(--dsw-alias-label-caption);font-variant-numeric:tabular-nums;font-size:11px;line-height:16px}.VWh0dG_shareDot{border-radius:50%;flex:none;align-self:center;width:8px;height:8px}.VWh0dG_shareValue{color:var(--dsw-alias-label-primary);font-variant-numeric:tabular-nums;font-weight:600}.VWh0dG_budget{border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-1);border-radius:14px;flex-direction:column;gap:8px;padding:12px 16px;display:flex}.VWh0dG_budgetHead{justify-content:space-between;align-items:baseline;gap:10px;display:flex}.VWh0dG_budgetLabel{color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:17px}.VWh0dG_budgetValue{color:var(--dsw-alias-label-secondary);font-variant-numeric:tabular-nums;white-space:nowrap;font-size:12px;line-height:17px}.VWh0dG_budgetControls{align-items:center;gap:8px;min-width:0;display:inline-flex}.VWh0dG_budgetInputWrap{border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-1);border-radius:6px;align-items:center;gap:2px;padding:2px 6px;display:inline-flex}.VWh0dG_budgetInputWrap:focus-within{border-color:var(--dsw-alias-border-l3)}.VWh0dG_budgetUnit{color:var(--dsw-alias-label-tertiary);font-size:11px;line-height:16px}.VWh0dG_budgetInput{width:64px;color:var(--dsw-alias-label-primary);font-variant-numeric:tabular-nums;text-align:right;background:0 0;border:none;padding:0;font-size:12px;line-height:16px}.VWh0dG_budgetInput:focus-visible{outline:none}.VWh0dG_switch{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-module-platform);cursor:pointer;border-radius:999px;flex:none;width:30px;height:17px;padding:0;transition:background-color .16s,border-color .16s;position:relative}.VWh0dG_switchOn{border-color:var(--dsw-alias-border-l1);background:var(--dsw-alias-label-primary)}.VWh0dG_switchKnob{background:var(--dsw-static-neutral-bluish-00);border-radius:50%;width:11px;height:11px;transition:transform .16s;position:absolute;top:2px;left:2px}.VWh0dG_switchOn .VWh0dG_switchKnob{transform:translate(13px)}.VWh0dG_budgetTrack{background:var(--dsw-alias-bg-module-platform);border-radius:999px;height:6px;overflow:hidden}.VWh0dG_budgetFill{background:var(--dsw-static-blue-500);border-radius:999px;height:100%;transition:width .2s}.VWh0dG_budgetFillWarn{background:var(--dsw-static-amber-500)}.VWh0dG_budgetFillOver{background:var(--dsw-static-red-500);animation:1.6s ease-in-out infinite VWh0dG_budgetOverPulse}@keyframes VWh0dG_budgetOverPulse{50%{opacity:.55}}.VWh0dG_chartWrap{width:100%;position:relative}.VWh0dG_chartSvg{width:100%;height:auto;display:block}.VWh0dG_chartEmpty{height:140px;color:var(--dsw-alias-label-caption);justify-content:center;align-items:center;font-size:13px;display:flex}.VWh0dG_emptyRow{text-align:center;color:var(--dsw-alias-label-caption);padding:28px 0;font-size:13px}.VWh0dG_chartGrid{stroke:var(--dsw-alias-border-l1);stroke-width:1px}.VWh0dG_chartAxisLabel{fill:var(--dsw-alias-label-tertiary);font-size:10px}.VWh0dG_chartBar{fill:var(--dsw-static-blue-500);opacity:.7}.VWh0dG_chartBar:hover{opacity:1}.VWh0dG_chartStack{stroke:var(--dsw-alias-bg-layer-1);stroke-width:.75px}.VWh0dG_chartStack:hover{opacity:.9}.VWh0dG_chartLine{stroke:var(--dsw-static-blue-500);stroke-width:2px;stroke-linecap:round;stroke-linejoin:round}.VWh0dG_chartCrosshair{stroke:var(--dsw-alias-label-dimmed);stroke-width:1px;stroke-dasharray:3 3}.VWh0dG_chartDot{fill:var(--dsw-static-neutral-bluish-00);stroke:var(--dsw-static-blue-500);stroke-width:2px}.VWh0dG_chartTooltip{pointer-events:none;z-index:2;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-2);box-shadow:none;white-space:nowrap;border-radius:8px;padding:8px 10px;position:absolute;transform:translate(-50%,calc(-100% - 10px))}.VWh0dG_chartTooltipDate{color:var(--dsw-alias-label-primary);margin-bottom:3px;font-size:11px;font-weight:600}.VWh0dG_chartTooltipRow{color:var(--dsw-alias-label-secondary);align-items:center;gap:5px;font-size:11px;line-height:17px;display:flex}.VWh0dG_chartTooltipRow strong{color:var(--dsw-alias-label-primary);font-variant-numeric:tabular-nums;font-weight:600}.VWh0dG_chartLegendLine{background:var(--dsw-static-blue-500);border-radius:2px;width:10px;height:3px;display:inline-block}.VWh0dG_chartLegendBar{background:var(--dsw-static-blue-500);opacity:.5;border-radius:2px;width:7px;height:7px;display:inline-block}.VWh0dG_chartTooltipSwatch{border-radius:3px;flex:none;width:8px;height:8px;display:inline-block}.VWh0dG_chartLegend{color:var(--dsw-alias-label-tertiary);justify-content:flex-end;gap:14px;margin-top:2px;font-size:11px;display:flex}.VWh0dG_chartLegend span{align-items:center;gap:5px;display:inline-flex}.VWh0dG_tableScroll{border:1px solid var(--dsw-alias-border-l1);--dsh-scrollbar-thumb:var(--dsw-alias-scrollbar-bg-l2);--dsh-scrollbar-thumb-hover:var(--dsw-alias-scrollbar-hover-l2);border-radius:12px;overflow:auto}.VWh0dG_modelTable,.VWh0dG_pricingTable{border-collapse:collapse;width:100%;font-size:12.5px}.VWh0dG_modelTable th,.VWh0dG_modelTable td,.VWh0dG_pricingTable th,.VWh0dG_pricingTable td{border-bottom:1px solid var(--dsw-alias-border-l1);text-align:left;white-space:nowrap;padding:9px 12px}.VWh0dG_modelTable tbody tr:last-child td,.VWh0dG_pricingTable tbody tr:last-child td{border-bottom:0}.VWh0dG_modelTable thead th,.VWh0dG_pricingTable thead th{color:var(--dsw-alias-label-tertiary);text-transform:uppercase;letter-spacing:.05em;background:0 0;font-size:11px;font-weight:600}.VWh0dG_modelTable tbody tr,.VWh0dG_pricingTable tbody tr{transition:background-color .12s}.VWh0dG_modelTable tbody tr:hover,.VWh0dG_pricingTable tbody tr:hover{background:0 0}.VWh0dG_numCol{text-align:right;font-variant-numeric:tabular-nums}.VWh0dG_costCol{color:var(--dsw-alias-label-primary);font-weight:600}.VWh0dG_na{color:var(--dsw-alias-label-dimmed)}.VWh0dG_modelCell{align-items:center;gap:8px;display:inline-flex}.VWh0dG_modelDot{border-radius:50%;flex:none;width:9px;height:9px}.VWh0dG_modelName{color:var(--dsw-alias-label-primary);font-weight:500;line-height:16px;display:block}.VWh0dG_modelProvider{color:var(--dsw-alias-label-caption);font-size:10.5px;line-height:14px;display:block}.VWh0dG_pricingToggle{cursor:pointer;text-align:left;background:0 0;border:none;justify-content:space-between;align-items:center;gap:10px;width:100%;padding:0;display:flex}.VWh0dG_pricingToggle:hover .VWh0dG_panelTitle,.VWh0dG_pricingToggle:focus-visible .VWh0dG_panelTitle{color:var(--dsw-alias-label-primary)}.VWh0dG_rateBadge{vertical-align:1px;white-space:nowrap;border-radius:999px;align-items:center;margin-left:6px;padding:1px 6px;font-size:10px;font-weight:500;line-height:14px;display:inline-flex}.VWh0dG_rateBadgeLive{color:var(--dsw-static-green-500);background:var(--dsw-alias-bg-layer-2)}.VWh0dG_siteRow{border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-1);border-radius:10px;justify-content:space-between;align-items:center;gap:12px;padding:8px 10px;display:flex}.VWh0dG_siteRowName{align-items:center;gap:8px;min-width:0;display:inline-flex}.VWh0dG_siteKindTag{white-space:nowrap;border-radius:999px;flex:none;align-items:center;padding:1px 7px;font-size:10.5px;font-weight:600;line-height:16px;display:inline-flex}.VWh0dG_siteKindSite{color:var(--dsw-static-blue-500);background:color-mix(in srgb, var(--dsw-static-blue-500) 14%, transparent)}.VWh0dG_siteKindDirect{color:var(--dsw-static-green-500);background:color-mix(in srgb, var(--dsw-static-green-500) 14%, transparent)}.VWh0dG_siteKindUnknown{color:var(--dsw-static-red-500);background:color-mix(in srgb, var(--dsw-static-red-500) 14%, transparent)}.VWh0dG_siteRowTitle{color:var(--dsw-alias-label-primary);text-overflow:ellipsis;white-space:nowrap;font-size:12.5px;font-weight:600;line-height:18px;overflow:hidden}.VWh0dG_siteRowMeta{flex:none;align-items:center;gap:10px;display:inline-flex}.VWh0dG_siteRowCost{color:var(--dsw-alias-label-primary);font-variant-numeric:tabular-nums;font-size:12.5px;font-weight:700;line-height:18px}.VWh0dG_siteRowCalls{color:var(--dsw-alias-label-secondary);font-variant-numeric:tabular-nums;font-size:11.5px;line-height:17px}.VWh0dG_rateBadgeBuiltin{color:var(--dsw-alias-label-tertiary);background:var(--dsw-alias-bg-layer-2)}.VWh0dG_pricingToggleText{align-items:baseline;gap:10px;min-width:0;display:flex}.VWh0dG_pricingChevron{width:16px;height:16px;color:var(--dsw-alias-label-tertiary);flex:none;transition:transform .16s}.VWh0dG_pricingChevronOpen{transform:rotate(180deg)}.VWh0dG_bandPrice{align-items:baseline;gap:6px;display:inline-flex}.VWh0dG_bandPriceOff{color:var(--dsw-alias-label-caption)}.VWh0dG_bandPriceOff:before{content:\"/\";color:var(--dsw-alias-label-dimmed);margin-right:4px}.VWh0dG_bandTag{color:var(--dsw-alias-label-secondary);flex-direction:column;gap:1px;font-size:10.5px;line-height:14px;display:inline-flex}.VWh0dG_bandTagOff{color:var(--dsw-static-green-500);font-weight:600}.VWh0dG_bandTag>span:first-child{color:var(--dsw-alias-label-primary);font-weight:500}.VWh0dG_flatTag{color:var(--dsw-alias-label-caption);font-size:10.5px;line-height:14px}.VWh0dG_healthDot{border-radius:50%;flex:none;width:8px;height:8px;display:inline-block}.VWh0dG_healthOk{background:var(--dsw-static-green-500)}.VWh0dG_healthBad{background:var(--dsw-static-red-500)}.VWh0dG_healthIdle{background:var(--dsw-static-neutral-bluish-400)}.VWh0dG_dashboardRight{align-items:center;gap:8px;min-width:0;display:flex}.VWh0dG_healthBadge{white-space:nowrap;border-radius:999px;align-items:center;gap:6px;padding:3px 9px;font-size:11px;line-height:16px;display:inline-flex}.VWh0dG_healthBadgeOk{color:var(--dsw-static-green-500);background:var(--dsw-alias-bg-layer-2)}.VWh0dG_healthBadgeBad{color:var(--dsw-static-red-500);background:var(--dsw-alias-bg-layer-2)}.VWh0dG_planTag{color:var(--dsw-static-green-500);background:var(--dsw-alias-bg-layer-2);border-radius:999px;align-items:center;padding:1px 8px;font-size:11px;font-weight:500;line-height:17px;display:inline-flex}.VWh0dG_uncataloguedTag{vertical-align:1px;color:var(--dsw-static-amber-500);background:var(--dsw-alias-bg-layer-2);border-radius:999px;margin-left:6px;padding:0 6px;font-size:10px;font-weight:600;line-height:16px;display:inline-block}.VWh0dG_estimatedTag{vertical-align:1px;color:var(--dsw-static-blue-500);background:var(--dsw-alias-bg-layer-2);border-radius:999px;margin-left:6px;padding:0 6px;font-size:10px;font-weight:600;line-height:16px;display:inline-block}.VWh0dG_liveCostBar{color:var(--dsw-static-neutral-400);font-variant-numeric:tabular-nums;align-items:center;gap:6px;font-size:11px;line-height:16px;display:inline-flex}.VWh0dG_liveCostItem{white-space:nowrap}.VWh0dG_liveCostSep{color:var(--dsw-static-neutral-300)}.VWh0dG_liveTierPeak{color:var(--dsw-static-blue-500);font-weight:600}.VWh0dG_liveTierOff{color:var(--dsw-static-green-500);font-weight:600}.VWh0dG_liveQuotaWarn{color:var(--dsw-static-amber-500);font-weight:600}.VWh0dG_liveQuotaCrit{color:var(--dsw-static-red-500);font-weight:600}.VWh0dG_balanceCell{align-items:center;gap:6px;display:inline-flex;position:relative}.VWh0dG_balanceDays{color:var(--dsw-alias-label-caption);white-space:nowrap;font-size:10.5px;line-height:14px}.VWh0dG_balanceDaysLow{color:var(--dsw-static-red-500);font-weight:600}.VWh0dG_balanceDaysBadge{border:1px solid var(--dsw-alias-label-caption);background:color-mix(in srgb, var(--dsw-alias-label-caption) 10%, transparent);min-width:24px;height:24px;color:var(--dsw-alias-label-secondary);cursor:pointer;border-radius:12px;justify-content:center;align-items:center;padding:0 6px;font-size:10.5px;font-weight:600;line-height:1;display:inline-flex}.VWh0dG_balanceDaysBadge:hover{border-color:var(--dsw-alias-label-secondary);background:color-mix(in srgb, var(--dsw-alias-label-caption) 18%, transparent)}.VWh0dG_balanceDaysBadgeLow{color:var(--dsw-static-red-500);border-color:var(--dsw-static-red-500);background:color-mix(in srgb, var(--dsw-static-red-500) 10%, transparent)}.VWh0dG_balanceDetailPop{z-index:20;background:var(--dsw-alias-bg-layer-3);border:1px solid var(--dsw-alias-label-caption);white-space:nowrap;border-radius:8px;flex-direction:column;gap:6px;min-width:180px;padding:8px 10px;display:inline-flex;position:absolute;top:calc(100% + 6px);right:0;box-shadow:0 6px 20px #0000002e}.VWh0dG_balanceDetailHead{justify-content:space-between;align-items:center;gap:12px;display:flex}.VWh0dG_balanceDetailTitle{color:var(--dsw-alias-label-primary);font-size:12px;font-weight:600}.VWh0dG_balanceDetailClose{cursor:pointer;color:var(--dsw-alias-label-caption);background:0 0;border:none;font-size:14px;line-height:1}.VWh0dG_balanceDetailClose:hover{color:var(--dsw-alias-label-primary)}.VWh0dG_balanceDetailGrid{flex-direction:column;gap:4px;display:inline-flex}.VWh0dG_balanceDetailRow{color:var(--dsw-alias-label-secondary);font-variant-numeric:tabular-nums;justify-content:space-between;gap:16px;font-size:11px;line-height:15px;display:flex}.VWh0dG_balanceDetailLabel{color:var(--dsw-alias-label-caption)}.VWh0dG_balanceDetailValue{color:var(--dsw-alias-label-primary);font-weight:500}body[data-zine-mode] .VWh0dG_trigger,body[data-zine-mode] .VWh0dG_triggerPop,body[data-zine-mode] .VWh0dG_railButton{display:none}body[data-zine-mode] .VWh0dG_dashboardHead{background:#000;border-bottom:2px solid #e8ff00}body[data-zine-mode] .VWh0dG_headTitleRow{align-items:center;gap:8px;margin-top:4px;display:flex}body[data-zine-mode] .VWh0dG_dashboardTitle{color:#e8ff00;letter-spacing:.04em;text-transform:uppercase;text-shadow:0 0 8px #e8ff0066;font-weight:900}body[data-zine-mode] .VWh0dG_dashboardSubtitle{color:#c9d98a;letter-spacing:.08em;text-transform:uppercase;font-size:10px}body[data-zine-mode] .VWh0dG_closeButton{color:#0a0a05;background:#ff2d95;border:1.5px solid #ff2d95;border-radius:0;box-shadow:0 0 10px #ff2d9573}body[data-zine-mode] .VWh0dG_hero{background:#000;border:2.5px solid #e8ff00;border-radius:0;position:relative;box-shadow:0 0 0 1px #0009,0 0 24px #e8ff002e}body[data-zine-mode] .VWh0dG_heroLabel{color:#c9d98a;letter-spacing:.12em;text-transform:uppercase;font-size:10px;font-weight:900}body[data-zine-mode] .VWh0dG_heroValue{color:#e8ff00;letter-spacing:-.02em;text-shadow:0 0 12px #e8ff0073;-webkit-text-fill-color:#e8ff00;background:0 0;font-size:38px;font-weight:900}body[data-zine-mode] .VWh0dG_heroMeta{color:#c9d98a;letter-spacing:.06em;text-transform:uppercase;font-size:10.5px}body[data-zine-mode] .VWh0dG_heroSideLabel{color:#c9d98a;letter-spacing:.1em;text-transform:uppercase;font-size:10px;font-weight:900}body[data-zine-mode] .VWh0dG_heroSideValue{color:#e8ff00;text-shadow:0 0 6px #e8ff0059}body[data-zine-mode] .VWh0dG_delta{font-weight:900}body[data-zine-mode] .VWh0dG_deltaUp{color:#ff2d95}body[data-zine-mode] .VWh0dG_deltaDown{color:#c9d98a}body[data-zine-mode] .VWh0dG_tabNav{background:#000;border-bottom:2px solid #e8ff00}body[data-zine-mode] .VWh0dG_tabButton{color:#c9d98a;letter-spacing:.08em;text-transform:uppercase;border-radius:0;font-size:10.5px;font-weight:900}body[data-zine-mode] .VWh0dG_tabButton:hover,body[data-zine-mode] .VWh0dG_tabButton:focus-visible{color:#e8ff00;background:#e8ff001f}body[data-zine-mode] .VWh0dG_tabButtonActive,body[data-zine-mode] .VWh0dG_tabButtonActive:hover,body[data-zine-mode] .VWh0dG_tabButtonActive:focus-visible{color:#0a0a05;background:#e8ff00;box-shadow:0 0 10px #e8ff0073}body[data-zine-mode] .VWh0dG_panel{background:#000;border:2px solid #e8ff00;border-radius:0}body[data-zine-mode] .VWh0dG_trendPanel{position:relative}body[data-zine-mode] .VWh0dG_panelTitle{color:#e8ff00;letter-spacing:.06em;text-transform:uppercase;text-shadow:0 0 6px #e8ff0066;font-weight:900}body[data-zine-mode] .VWh0dG_panelHint{color:#c9d98a;letter-spacing:.08em;text-transform:uppercase;font-size:10px;font-weight:900}body[data-zine-mode] .VWh0dG_modelTableScroll{background:#000;border:1.5px solid #e8ff0080;border-radius:0}.VWh0dG_currencyToggle{border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-2);border-radius:6px;align-items:center;gap:2px;margin-right:8px;padding:2px;display:inline-flex}.VWh0dG_currencyButton{color:var(--dsw-alias-label-secondary);cursor:pointer;background:0 0;border:0;border-radius:4px;padding:4px 7px;font-size:11px;font-weight:700;line-height:1}.VWh0dG_currencyButtonActive{background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary)}.VWh0dG_subscriptionGrid{grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:10px;margin-top:10px;display:grid}.VWh0dG_subscriptionCard{border:1px solid color-mix(in srgb, var(--dsw-alias-border-l1) 75%, transparent);background:color-mix(in srgb, var(--dsw-alias-bg-layer-2) 62%, transparent);-webkit-backdrop-filter:blur(12px)saturate(1.3);border-radius:12px;padding:12px 14px;transition:border-color .2s,box-shadow .2s;position:relative;overflow:hidden;box-shadow:0 8px 24px #0000001a}.VWh0dG_subscriptionCard:before{content:\"\";background:linear-gradient(90deg, transparent 0%, var(--dsw-static-amber-500) 30%, var(--dsw-alias-label-primary) 50%, var(--dsw-static-amber-500) 70%, transparent 100%);opacity:.9;pointer-events:none;background-size:200% 100%;height:1.5px;animation:3.6s ease-in-out infinite VWh0dG_subscriptionGoldFlow;position:absolute;top:0;left:0;right:0}@keyframes VWh0dG_subscriptionGoldFlow{0%{background-position:200% 0}to{background-position:-200% 0}}.VWh0dG_subscriptionCard:hover{border-color:color-mix(in srgb, var(--dsw-static-amber-500) 55%, var(--dsw-alias-border-l1));box-shadow:0 10px 30px #00000029}.VWh0dG_subscriptionHead{flex-wrap:wrap;align-items:baseline;gap:6px;margin-bottom:8px;display:flex}.VWh0dG_subscriptionName{font-size:13px;font-weight:700}.VWh0dG_subscriptionPlan{color:var(--dsw-alias-label-secondary);font-size:11px}.VWh0dG_subscriptionPlan[data-kind=code],.VWh0dG_subscriptionPlan[data-kind=token]{color:var(--dsw-alias-label-secondary);background:var(--dsw-alias-bg-layer-3);border-radius:999px;padding:1px 8px;font-weight:500}.VWh0dG_subscriptionTier{color:var(--dsw-alias-label-secondary);margin-left:6px}.VWh0dG_subscriptionAuto{color:var(--dsw-static-blue-500);background:color-mix(in srgb, var(--dsw-static-blue-500) 14%, var(--dsw-alias-bg-layer-2));border-radius:999px;margin-left:6px;padding:1px 6px;font-size:10px}.VWh0dG_subscriptionStatus{color:var(--dsw-alias-label-secondary);margin-bottom:6px;font-size:11px}.VWh0dG_subscriptionWindow{align-items:center;gap:10px;margin-top:8px;font-size:11px;display:flex}.VWh0dG_subscriptionWindowLabel{color:var(--dsw-alias-label-secondary);flex:0 0 44px}.VWh0dG_subscriptionTrack{background:var(--dsw-alias-bg-layer-3);border-radius:3px;flex:1;height:6px;overflow:hidden}.VWh0dG_subscriptionFill{background:var(--dsw-static-blue-500);border-radius:3px;height:100%;transition:width .2s;display:block}.VWh0dG_subscriptionFillWarn{background:var(--dsw-static-amber-500)}.VWh0dG_subscriptionFillOver{background:var(--dsw-static-red-500)}.VWh0dG_subscriptionMeta{flex-direction:column;flex:none;align-items:flex-end;gap:2px;display:flex}.VWh0dG_subscriptionPct{text-align:right;font-variant-numeric:tabular-nums;flex:none;min-width:52px}.VWh0dG_subscriptionExhausted{color:var(--dsw-static-red-500);min-width:52px;font-weight:600}.VWh0dG_subscriptionReset{color:var(--dsw-alias-label-caption);white-space:nowrap;flex:none;font-size:10px}.VWh0dG_providerGroupList{flex-direction:column;gap:10px;display:flex}.VWh0dG_providerGroup{border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-1);border-radius:12px;padding:12px 14px}.VWh0dG_providerGroupHead{justify-content:space-between;align-items:baseline;gap:12px;display:flex}.VWh0dG_providerGroupTitle{align-items:center;gap:7px;min-width:0;display:inline-flex}.VWh0dG_providerGroupName{color:var(--dsw-alias-label-primary);font-size:13px;font-weight:600;line-height:18px}.VWh0dG_providerGroupMeta{flex:none;align-items:center;gap:10px;display:inline-flex}.VWh0dG_providerGroupBadge{color:var(--dsw-static-green-500);background:var(--dsw-alias-bg-layer-2);border-radius:999px;align-items:center;padding:1px 8px;font-size:11px;font-weight:500;line-height:17px;display:inline-flex}.VWh0dG_providerGroupBalance{color:var(--dsw-alias-label-secondary);font-variant-numeric:tabular-nums;white-space:nowrap;align-items:baseline;gap:6px;font-size:12px;line-height:17px;display:inline-flex}.VWh0dG_providerGroupBalanceLabel{color:var(--dsw-alias-label-caption);font-size:11px;line-height:17px}.VWh0dG_roundsFlagBadge{color:var(--dsw-static-neutral-bluish-00);background:var(--dsw-static-red-500);border-radius:999px;margin-left:8px;padding:1px 7px;font-size:10px;font-weight:800}.VWh0dG_rounds{margin-top:10px}.VWh0dG_roundsBars{align-items:flex-end;gap:3px;height:124px;padding:16px 2px 0;display:flex;overflow-x:auto}.VWh0dG_roundsBarCol{border-radius:5px 5px 0 0;flex-direction:column;flex:1 0 28px;justify-content:flex-end;align-items:stretch;height:100%;display:flex;position:relative}.VWh0dG_roundsBarColPeak{background:color-mix(in srgb, var(--dsw-static-amber-500) 16%, transparent)}.VWh0dG_roundsBarColOff{background:var(--dsw-alias-bg-module-platform)}.VWh0dG_roundsBarLabel{text-align:center;color:var(--dsw-alias-label-secondary);white-space:nowrap;text-overflow:ellipsis;max-width:100%;font-size:9px;line-height:1.2;position:absolute;bottom:0;left:0;right:0;overflow:hidden;transform:translateY(-100%)}.VWh0dG_roundsBarWrap{flex:1;align-items:flex-end;min-height:0;display:flex}.VWh0dG_roundsBar{background:var(--dsw-static-blue-500);border-radius:2px 2px 0 0;width:100%;min-height:2px;position:relative}.VWh0dG_roundsBarFlagged{background:var(--dsw-static-red-500);border-radius:2px 2px 0 0;width:100%;min-height:2px;position:relative}.VWh0dG_roundsFlagMark{background:var(--dsw-static-red-500);border-radius:50%;width:7px;height:7px;position:absolute;top:-3px;right:-3px}.VWh0dG_roundsAxis{color:var(--dsw-alias-label-secondary);justify-content:space-between;margin-top:6px;font-size:10px;display:flex}.VWh0dG_roundsEmpty{color:var(--dsw-alias-label-secondary);margin-top:10px;font-size:12px}.VWh0dG_heatmap{margin-top:10px}.VWh0dG_heatmapGrid{grid-template-columns:repeat(7,minmax(0,1fr));gap:8px;display:grid}.VWh0dG_heatmapCellEmpty{background:var(--dsw-alias-bg-layer-1);height:30px;color:var(--dsw-alias-label-dimmed);font-variant-numeric:tabular-nums;border-radius:8px;justify-content:center;align-items:center;font-size:11px;display:flex}.VWh0dG_heatmapCell{font-variant-numeric:tabular-nums;cursor:pointer;border:0;border-radius:8px;justify-content:center;align-items:center;height:30px;padding:0;font-size:11px;display:flex}.VWh0dG_heatmapCell[data-level=\"0\"],.VWh0dG_heatmapCell[data-level=\"1\"],.VWh0dG_heatmapCell[data-level=\"2\"]{color:var(--dsw-alias-label-primary)}.VWh0dG_heatmapCell[data-level=\"3\"],.VWh0dG_heatmapCell[data-level=\"4\"]{color:var(--dsw-static-neutral-bluish-00)}.VWh0dG_heatmapFooter{color:var(--dsw-alias-label-secondary);align-items:center;gap:8px;margin-top:10px;font-size:10px;display:flex}.VWh0dG_heatmapLegend{gap:3px;display:inline-flex}.VWh0dG_heatmapLegend i{border-radius:4px;width:14px;height:14px;display:block}.VWh0dG_heatmapHover{font-variant-numeric:tabular-nums;margin-left:auto}.VWh0dG_heatmapYearScroll{padding-bottom:2px;overflow-x:auto}.VWh0dG_heatmapYearGrid{grid-template-rows:repeat(7,11px);grid-auto-flow:column;gap:3px;min-width:max-content;display:grid}.VWh0dG_heatmapYearCell{cursor:pointer;border:0;border-radius:2px;width:11px;height:11px;padding:0}.VWh0dG_pluginInfo{flex-direction:column;gap:8px;margin-top:10px;display:flex}.VWh0dG_pluginInfoRow{align-items:baseline;gap:12px;font-size:12px;display:flex}.VWh0dG_pluginInfoLabel{color:var(--dsw-alias-label-secondary);flex:0 0 72px}.VWh0dG_pluginInfoValue{color:var(--dsw-alias-label-primary);word-break:break-all}.VWh0dG_pluginInfoLink{color:var(--dsw-static-blue-500);word-break:break-all;text-decoration:none}.VWh0dG_pluginInfoLink:hover{text-decoration:underline}.VWh0dG_tokenPanel{flex-direction:column;gap:14px;display:flex}.VWh0dG_tokenModelBar{background:var(--dsw-alias-bg-layer-2);border-radius:999px;height:8px;overflow:hidden}.VWh0dG_tokenModelParts{height:100%;display:flex}.VWh0dG_tokenModelPartIn{background:var(--dsw-static-blue-500)}.VWh0dG_tokenModelPartOut{background:var(--dsw-static-amber-500)}.VWh0dG_tokenModelShareRow{align-items:center;gap:6px;display:inline-flex}@media (width<=640px){.VWh0dG_kpiGrid{grid-template-columns:repeat(2,minmax(0,1fr))}.VWh0dG_hero{gap:14px}.VWh0dG_heroTop{flex-direction:column;align-items:flex-start;gap:12px}.VWh0dG_heroGauge{width:72px;height:72px}.VWh0dG_heroSide{gap:12px}.VWh0dG_heroSideSpacer{display:none}}.VWh0dG_peakAlert{z-index:2000;border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-1);border-radius:12px;align-items:center;gap:12px;min-width:300px;max-width:460px;padding:10px 12px;animation:.2s VWh0dG_peakAlertIn;display:flex;position:fixed;box-shadow:0 4px 16px #00000014}.VWh0dG_peakAlertCorner{bottom:18px;right:18px}.VWh0dG_peakAlertCenter{top:20%;left:50%;transform:translate(-50%)}.VWh0dG_peakAlertTag{letter-spacing:.01em;color:var(--dsw-alias-label-secondary);background:var(--dsw-alias-bg-layer-3);white-space:nowrap;border-radius:999px;flex:none;align-items:center;gap:6px;padding:3px 9px;font-size:11px;font-weight:650;display:inline-flex}.VWh0dG_peakAlertTag:before{content:\"\";background:currentColor;border-radius:50%;width:6px;height:6px}.VWh0dG_peakAlertPeak .VWh0dG_peakAlertTag{color:var(--dsw-static-amber-500)}.VWh0dG_peakAlertOff .VWh0dG_peakAlertTag{color:var(--dsw-static-blue-500)}.VWh0dG_peakAlertCountdown{font-variant-numeric:tabular-nums;color:var(--dsw-alias-label-primary);flex:none;font-size:18px;font-weight:700;line-height:1}.VWh0dG_peakAlertText{min-width:0;color:var(--dsw-alias-label-secondary);flex:1;font-size:12px;line-height:18px}.VWh0dG_peakAlertClose{width:20px;height:20px;color:var(--dsw-alias-label-secondary);cursor:pointer;background:0 0;border:0;border-radius:6px;flex:none;justify-content:center;align-items:center;font-size:15px;line-height:1;transition:background-color .14s,color .14s;display:inline-flex}.VWh0dG_peakAlertClose:hover{color:var(--dsw-alias-label-primary);background:var(--dsw-alias-bg-layer-2)}@keyframes VWh0dG_peakAlertIn{0%{opacity:0}to{opacity:1}}.VWh0dG_peakAlertPanel{border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-1);border-radius:16px;flex-direction:column;gap:10px;padding:14px 16px;display:flex}.VWh0dG_peakAlertPanelHead{justify-content:space-between;align-items:center;gap:10px;display:flex}.VWh0dG_peakAlertPanelLabel{color:var(--dsw-alias-label-primary);font-size:13px;font-weight:600}.VWh0dG_peakAlertPanelBody{flex-wrap:wrap;align-items:center;gap:12px 16px;display:flex}.VWh0dG_peakAlertField{color:var(--dsw-alias-label-secondary);align-items:center;gap:8px;font-size:12px;display:inline-flex}.VWh0dG_peakAlertNum{border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-2);width:56px;color:var(--dsw-alias-label-primary);font-variant-numeric:tabular-nums;border-radius:6px;padding:4px 6px}.VWh0dG_peakAlertSelect{border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary);border-radius:6px;padding:4px 6px;font-size:12px}.VWh0dG_peakAlertCheck{color:var(--dsw-alias-label-secondary);align-items:center;gap:6px;font-size:12px;display:inline-flex}.VWh0dG_peakAlertPreview{border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary);cursor:pointer;border-radius:6px;padding:5px 10px;font-size:12px}.VWh0dG_peakAlertPreview:hover{background:var(--dsw-alias-bg-layer-3)}.VWh0dG_settingsHead{flex-direction:column;gap:4px;margin-bottom:2px;display:flex}.VWh0dG_settingsTitle{letter-spacing:-.005em;color:var(--dsw-alias-label-primary);margin:0;font-size:15px;font-weight:650;line-height:22px}.VWh0dG_settingsHint{color:var(--dsw-alias-label-caption);margin:0;font-size:11px;line-height:16px}.VWh0dG_budgetHint,.VWh0dG_peakAlertHint{color:var(--dsw-alias-label-caption);margin:6px 0 0;font-size:11px;line-height:16px}";
		const tagId = "@kenz1117/dsh-ui-usage-billing/UsageBilling.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@kenz1117/dsh-ui-usage-billing";
			tag.dataset.pluginCss = tagId;
			tag.textContent = css;
			document.head.appendChild(tag);
		}
		var UsageBilling_module_css_default = {
			"rateBadgeLive": "VWh0dG_rateBadgeLive",
			"bucketStatValue": "VWh0dG_bucketStatValue",
			"subscriptionExhausted": "VWh0dG_subscriptionExhausted",
			"shareSegUser": "VWh0dG_shareSegUser",
			"triggerPopLabel": "VWh0dG_triggerPopLabel",
			"closeButton": "VWh0dG_closeButton",
			"heroSideValue": "VWh0dG_heroSideValue",
			"panelTitle": "VWh0dG_panelTitle",
			"chartCrosshair": "VWh0dG_chartCrosshair",
			"chartLegendLine": "VWh0dG_chartLegendLine",
			"subscriptionFillWarn": "VWh0dG_subscriptionFillWarn",
			"triggerSub": "VWh0dG_triggerSub",
			"kpiLabel": "VWh0dG_kpiLabel",
			"roundsAxis": "VWh0dG_roundsAxis",
			"tokenModelShareRow": "VWh0dG_tokenModelShareRow",
			"peakAlertPanel": "VWh0dG_peakAlertPanel",
			"heatmapYearGrid": "VWh0dG_heatmapYearGrid",
			"tabButton": "VWh0dG_tabButton",
			"roundsEmpty": "VWh0dG_roundsEmpty",
			"subscriptionTier": "VWh0dG_subscriptionTier",
			"pluginInfoValue": "VWh0dG_pluginInfoValue",
			"heatmapLegend": "VWh0dG_heatmapLegend",
			"shareSeg": "VWh0dG_shareSeg",
			"pricingTable": "VWh0dG_pricingTable",
			"planTag": "VWh0dG_planTag",
			"subscriptionGoldFlow": "VWh0dG_subscriptionGoldFlow",
			"heatmapGrid": "VWh0dG_heatmapGrid",
			"bucketStatSub": "VWh0dG_bucketStatSub",
			"subscriptionCard": "VWh0dG_subscriptionCard",
			"providerGroupMeta": "VWh0dG_providerGroupMeta",
			"modelProvider": "VWh0dG_modelProvider",
			"bandTagOff": "VWh0dG_bandTagOff",
			"heatmapYearCell": "VWh0dG_heatmapYearCell",
			"bandTag": "VWh0dG_bandTag",
			"pluginInfoLabel": "VWh0dG_pluginInfoLabel",
			"currencyButtonActive": "VWh0dG_currencyButtonActive",
			"heroLabel": "VWh0dG_heroLabel",
			"heroSideSpacer": "VWh0dG_heroSideSpacer",
			"providerGroupBalance": "VWh0dG_providerGroupBalance",
			"dashboardHead": "VWh0dG_dashboardHead",
			"bucketCost": "VWh0dG_bucketCost",
			"triggerSparkBar": "VWh0dG_triggerSparkBar",
			"tokenModelPartIn": "VWh0dG_tokenModelPartIn",
			"triggerPop": "VWh0dG_triggerPop",
			"hero": "VWh0dG_hero",
			"liveQuotaCrit": "VWh0dG_liveQuotaCrit",
			"peakAlertPeak": "VWh0dG_peakAlertPeak",
			"providerGroupHead": "VWh0dG_providerGroupHead",
			"subscriptionHead": "VWh0dG_subscriptionHead",
			"subscriptionPlan": "VWh0dG_subscriptionPlan",
			"triggerPopMetrics": "VWh0dG_triggerPopMetrics",
			"subscriptionName": "VWh0dG_subscriptionName",
			"peakAlertClose": "VWh0dG_peakAlertClose",
			"heroGaugeCenter": "VWh0dG_heroGaugeCenter",
			"heroGaugePct": "VWh0dG_heroGaugePct",
			"triggerPopBadge": "VWh0dG_triggerPopBadge",
			"shareSegPeak": "VWh0dG_shareSegPeak",
			"subscriptionWindow": "VWh0dG_subscriptionWindow",
			"heroGaugePctOver": "VWh0dG_heroGaugePctOver",
			"modelCell": "VWh0dG_modelCell",
			"modelDot": "VWh0dG_modelDot",
			"triggerPopMuted": "VWh0dG_triggerPopMuted",
			"roundsBarFlagged": "VWh0dG_roundsBarFlagged",
			"flatTag": "VWh0dG_flatTag",
			"triggerPopFootNote": "VWh0dG_triggerPopFootNote",
			"chartStack": "VWh0dG_chartStack",
			"chartWrap": "VWh0dG_chartWrap",
			"triggerPopFootName": "VWh0dG_triggerPopFootName",
			"kpiValue": "VWh0dG_kpiValue",
			"modelTable": "VWh0dG_modelTable",
			"siteRow": "VWh0dG_siteRow",
			"peakAlertOff": "VWh0dG_peakAlertOff",
			"balanceCell": "VWh0dG_balanceCell",
			"healthIdle": "VWh0dG_healthIdle",
			"subscriptionAuto": "VWh0dG_subscriptionAuto",
			"liveTierOff": "VWh0dG_liveTierOff",
			"headTitleRow": "VWh0dG_headTitleRow",
			"subscriptionWindowLabel": "VWh0dG_subscriptionWindowLabel",
			"roundsBarLabel": "VWh0dG_roundsBarLabel",
			"bucketSummary": "VWh0dG_bucketSummary",
			"shareTrack": "VWh0dG_shareTrack",
			"triggerPopBar": "VWh0dG_triggerPopBar",
			"numCol": "VWh0dG_numCol",
			"tabButtonActive": "VWh0dG_tabButtonActive",
			"siteKindDirect": "VWh0dG_siteKindDirect",
			"heatmapFooter": "VWh0dG_heatmapFooter",
			"pricingToggle": "VWh0dG_pricingToggle",
			"rangeToggle": "VWh0dG_rangeToggle",
			"triggerWrap": "VWh0dG_triggerWrap",
			"siteKindUnknown": "VWh0dG_siteKindUnknown",
			"chartAxisLabel": "VWh0dG_chartAxisLabel",
			"tokenModelBar": "VWh0dG_tokenModelBar",
			"heatmapYearScroll": "VWh0dG_heatmapYearScroll",
			"bandPriceOff": "VWh0dG_bandPriceOff",
			"tokenPanel": "VWh0dG_tokenPanel",
			"exportButton": "VWh0dG_exportButton",
			"dashboardIn": "VWh0dG_dashboardIn",
			"chartEmpty": "VWh0dG_chartEmpty",
			"balanceDaysLow": "VWh0dG_balanceDaysLow",
			"balanceDetailPop": "VWh0dG_balanceDetailPop",
			"peakAlertField": "VWh0dG_peakAlertField",
			"peakAlertHint": "VWh0dG_peakAlertHint",
			"peakAlert": "VWh0dG_peakAlert",
			"peakAlertCheck": "VWh0dG_peakAlertCheck",
			"roundsBar": "VWh0dG_roundsBar",
			"roundsBarColOff": "VWh0dG_roundsBarColOff",
			"providerGroupName": "VWh0dG_providerGroupName",
			"heroValue": "VWh0dG_heroValue",
			"shareValue": "VWh0dG_shareValue",
			"chartLegend": "VWh0dG_chartLegend",
			"subscriptionTrack": "VWh0dG_subscriptionTrack",
			"budgetFillOver": "VWh0dG_budgetFillOver",
			"settingsHead": "VWh0dG_settingsHead",
			"panel": "VWh0dG_panel",
			"heroSideItem": "VWh0dG_heroSideItem",
			"triggerPopTitleMonth": "VWh0dG_triggerPopTitleMonth",
			"deltaDown": "VWh0dG_deltaDown",
			"rateBadge": "VWh0dG_rateBadge",
			"subscriptionFill": "VWh0dG_subscriptionFill",
			"heroGauge": "VWh0dG_heroGauge",
			"railButton": "VWh0dG_railButton",
			"triggerRow": "VWh0dG_triggerRow",
			"triggerPopStrong": "VWh0dG_triggerPopStrong",
			"budgetHead": "VWh0dG_budgetHead",
			"triggerPopBadgeDirect": "VWh0dG_triggerPopBadgeDirect",
			"peakAlertText": "VWh0dG_peakAlertText",
			"heroSideLabel": "VWh0dG_heroSideLabel",
			"balanceDaysBadge": "VWh0dG_balanceDaysBadge",
			"roundsFlagBadge": "VWh0dG_roundsFlagBadge",
			"heroMain": "VWh0dG_heroMain",
			"liveTierPeak": "VWh0dG_liveTierPeak",
			"providerGroupBalanceLabel": "VWh0dG_providerGroupBalanceLabel",
			"balanceDetailTitle": "VWh0dG_balanceDetailTitle",
			"switch": "VWh0dG_switch",
			"siteKindSite": "VWh0dG_siteKindSite",
			"balanceDaysBadgeLow": "VWh0dG_balanceDaysBadgeLow",
			"siteRowMeta": "VWh0dG_siteRowMeta",
			"triggerPopMetricValue": "VWh0dG_triggerPopMetricValue",
			"trigger": "VWh0dG_trigger",
			"siteRowCost": "VWh0dG_siteRowCost",
			"healthBad": "VWh0dG_healthBad",
			"siteRowName": "VWh0dG_siteRowName",
			"healthBadge": "VWh0dG_healthBadge",
			"chartLine": "VWh0dG_chartLine",
			"triggerPopRow": "VWh0dG_triggerPopRow",
			"balanceDetailHead": "VWh0dG_balanceDetailHead",
			"triggerSpark": "VWh0dG_triggerSpark",
			"budget": "VWh0dG_budget",
			"emptyRow": "VWh0dG_emptyRow",
			"roundsBarCol": "VWh0dG_roundsBarCol",
			"triggerAmount": "VWh0dG_triggerAmount",
			"panelHint": "VWh0dG_panelHint",
			"triggerPopName": "VWh0dG_triggerPopName",
			"dashboard": "VWh0dG_dashboard",
			"bucketStat": "VWh0dG_bucketStat",
			"costCol": "VWh0dG_costCol",
			"triggerPopTitle": "VWh0dG_triggerPopTitle",
			"tabPanelIn": "VWh0dG_tabPanelIn",
			"healthBadgeBad": "VWh0dG_healthBadgeBad",
			"currencyToggle": "VWh0dG_currencyToggle",
			"bucketSep": "VWh0dG_bucketSep",
			"providerGroupTitle": "VWh0dG_providerGroupTitle",
			"subscriptionPct": "VWh0dG_subscriptionPct",
			"liveCostBar": "VWh0dG_liveCostBar",
			"triggerPopBars": "VWh0dG_triggerPopBars",
			"shareItem": "VWh0dG_shareItem",
			"triggerPopValueStack": "VWh0dG_triggerPopValueStack",
			"tokenModelParts": "VWh0dG_tokenModelParts",
			"heroGaugeArcOver": "VWh0dG_heroGaugeArcOver",
			"triggerSparkHot": "VWh0dG_triggerSparkHot",
			"chartTooltipDate": "VWh0dG_chartTooltipDate",
			"pricingToggleText": "VWh0dG_pricingToggleText",
			"switchOn": "VWh0dG_switchOn",
			"pricingChevronOpen": "VWh0dG_pricingChevronOpen",
			"exportBar": "VWh0dG_exportBar",
			"triggerPopMetricLabel": "VWh0dG_triggerPopMetricLabel",
			"bucketThird": "VWh0dG_bucketThird",
			"chartBar": "VWh0dG_chartBar",
			"triggerPopFootNotes": "VWh0dG_triggerPopFootNotes",
			"chartGrid": "VWh0dG_chartGrid",
			"dashboardTitle": "VWh0dG_dashboardTitle",
			"kpiGreen": "VWh0dG_kpiGreen",
			"modelTableScroll": "VWh0dG_modelTableScroll",
			"heroGaugeTrack": "VWh0dG_heroGaugeTrack",
			"shareLegend": "VWh0dG_shareLegend",
			"triggerPopHead": "VWh0dG_triggerPopHead",
			"triggerPopFootTitle": "VWh0dG_triggerPopFootTitle",
			"heroReadout": "VWh0dG_heroReadout",
			"budgetInputWrap": "VWh0dG_budgetInputWrap",
			"triggerPopFootStrong": "VWh0dG_triggerPopFootStrong",
			"subscriptionStatus": "VWh0dG_subscriptionStatus",
			"balanceDetailGrid": "VWh0dG_balanceDetailGrid",
			"chartSvg": "VWh0dG_chartSvg",
			"heroMeta": "VWh0dG_heroMeta",
			"heroGaugeLabel": "VWh0dG_heroGaugeLabel",
			"siteRowTitle": "VWh0dG_siteRowTitle",
			"balanceDetailLabel": "VWh0dG_balanceDetailLabel",
			"subscriptionMeta": "VWh0dG_subscriptionMeta",
			"budgetValue": "VWh0dG_budgetValue",
			"triggerPopAlert": "VWh0dG_triggerPopAlert",
			"shareSegAssistant": "VWh0dG_shareSegAssistant",
			"triggerPopFoot": "VWh0dG_triggerPopFoot",
			"modelName": "VWh0dG_modelName",
			"siteRowCalls": "VWh0dG_siteRowCalls",
			"triggerPopBadgeSub": "VWh0dG_triggerPopBadgeSub",
			"budgetFill": "VWh0dG_budgetFill",
			"heroSide": "VWh0dG_heroSide",
			"liveQuotaWarn": "VWh0dG_liveQuotaWarn",
			"settingsHint": "VWh0dG_settingsHint",
			"settingsTitle": "VWh0dG_settingsTitle",
			"subscriptionGrid": "VWh0dG_subscriptionGrid",
			"dashboardSubtitle": "VWh0dG_dashboardSubtitle",
			"liveCostItem": "VWh0dG_liveCostItem",
			"triggerPopValue": "VWh0dG_triggerPopValue",
			"pluginInfoRow": "VWh0dG_pluginInfoRow",
			"exportLabel": "VWh0dG_exportLabel",
			"dashboardBody": "VWh0dG_dashboardBody",
			"pricingChevron": "VWh0dG_pricingChevron",
			"deltaUp": "VWh0dG_deltaUp",
			"peakAlertCountdown": "VWh0dG_peakAlertCountdown",
			"triggerBody": "VWh0dG_triggerBody",
			"roundsBarColPeak": "VWh0dG_roundsBarColPeak",
			"roundsBars": "VWh0dG_roundsBars",
			"heroCurrency": "VWh0dG_heroCurrency",
			"roundsBarWrap": "VWh0dG_roundsBarWrap",
			"dashboardRight": "VWh0dG_dashboardRight",
			"tabNav": "VWh0dG_tabNav",
			"budgetLabel": "VWh0dG_budgetLabel",
			"shareSegOff": "VWh0dG_shareSegOff",
			"estimatedTag": "VWh0dG_estimatedTag",
			"heroGaugeSvg": "VWh0dG_heroGaugeSvg",
			"subscriptionFillOver": "VWh0dG_subscriptionFillOver",
			"heatmap": "VWh0dG_heatmap",
			"panelHead": "VWh0dG_panelHead",
			"providerGroup": "VWh0dG_providerGroup",
			"budgetFillWarn": "VWh0dG_budgetFillWarn",
			"peakAlertPanelHead": "VWh0dG_peakAlertPanelHead",
			"budgetTrack": "VWh0dG_budgetTrack",
			"peakAlertIn": "VWh0dG_peakAlertIn",
			"budgetUnit": "VWh0dG_budgetUnit",
			"roundsFlagMark": "VWh0dG_roundsFlagMark",
			"shareSegTool": "VWh0dG_shareSegTool",
			"balanceDays": "VWh0dG_balanceDays",
			"budgetOverPulse": "VWh0dG_budgetOverPulse",
			"triggerPopFootStatus": "VWh0dG_triggerPopFootStatus",
			"kpiTile": "VWh0dG_kpiTile",
			"balanceDetailClose": "VWh0dG_balanceDetailClose",
			"heatmapHover": "VWh0dG_heatmapHover",
			"budgetControls": "VWh0dG_budgetControls",
			"peakAlertCenter": "VWh0dG_peakAlertCenter",
			"peakAlertPreview": "VWh0dG_peakAlertPreview",
			"triggerIcon": "VWh0dG_triggerIcon",
			"rangeButton": "VWh0dG_rangeButton",
			"chartTooltipRow": "VWh0dG_chartTooltipRow",
			"triggerMeta": "VWh0dG_triggerMeta",
			"triggerPopFootStatusLow": "VWh0dG_triggerPopFootStatusLow",
			"budgetInput": "VWh0dG_budgetInput",
			"providerGroupBadge": "VWh0dG_providerGroupBadge",
			"triggerPopOpenBtn": "VWh0dG_triggerPopOpenBtn",
			"subscriptionReset": "VWh0dG_subscriptionReset",
			"peakAlertCorner": "VWh0dG_peakAlertCorner",
			"siteKindTag": "VWh0dG_siteKindTag",
			"pricingTip": "VWh0dG_pricingTip",
			"chartTooltip": "VWh0dG_chartTooltip",
			"triggerPopMetricHighlight": "VWh0dG_triggerPopMetricHighlight",
			"peakAlertNum": "VWh0dG_peakAlertNum",
			"dashboardModal": "VWh0dG_dashboardModal",
			"uncataloguedTag": "VWh0dG_uncataloguedTag",
			"shareDot": "VWh0dG_shareDot",
			"bandPrice": "VWh0dG_bandPrice",
			"healthBadgeOk": "VWh0dG_healthBadgeOk",
			"heatmapCell": "VWh0dG_heatmapCell",
			"bucketStatLabel": "VWh0dG_bucketStatLabel",
			"delta": "VWh0dG_delta",
			"switchKnob": "VWh0dG_switchKnob",
			"providerGroupList": "VWh0dG_providerGroupList",
			"peakAlertSelect": "VWh0dG_peakAlertSelect",
			"heatmapCellEmpty": "VWh0dG_heatmapCellEmpty",
			"healthOk": "VWh0dG_healthOk",
			"kpiGrid": "VWh0dG_kpiGrid",
			"heroTop": "VWh0dG_heroTop",
			"rateBadgeBuiltin": "VWh0dG_rateBadgeBuiltin",
			"rounds": "VWh0dG_rounds",
			"peakAlertPanelLabel": "VWh0dG_peakAlertPanelLabel",
			"liveCostSep": "VWh0dG_liveCostSep",
			"tableScroll": "VWh0dG_tableScroll",
			"tabPanel": "VWh0dG_tabPanel",
			"chartDot": "VWh0dG_chartDot",
			"healthDot": "VWh0dG_healthDot",
			"pluginInfoLink": "VWh0dG_pluginInfoLink",
			"triggerPopUpdated": "VWh0dG_triggerPopUpdated",
			"rangeButtonActive": "VWh0dG_rangeButtonActive",
			"chartLegendBar": "VWh0dG_chartLegendBar",
			"currencyButton": "VWh0dG_currencyButton",
			"balanceDetailRow": "VWh0dG_balanceDetailRow",
			"budgetHint": "VWh0dG_budgetHint",
			"triggerPopMetric": "VWh0dG_triggerPopMetric",
			"peakAlertTag": "VWh0dG_peakAlertTag",
			"heroGaugeArc": "VWh0dG_heroGaugeArc",
			"chartTooltipSwatch": "VWh0dG_chartTooltipSwatch",
			"bucketOfficial": "VWh0dG_bucketOfficial",
			"na": "VWh0dG_na",
			"kpiDetail": "VWh0dG_kpiDetail",
			"tokenModelPartOut": "VWh0dG_tokenModelPartOut",
			"peakAlertPanelBody": "VWh0dG_peakAlertPanelBody",
			"balanceDetailValue": "VWh0dG_balanceDetailValue",
			"trendPanel": "VWh0dG_trendPanel",
			"pluginInfo": "VWh0dG_pluginInfo"
		};
		//#endregion
		//#region src/client/plan-knowledge.ts
		/**
		* 订阅/计划 provider id → plan 知识（引用 dsh-spend 的 code/token 双口径）。
		* 覆盖我们实际会识别到的订阅通道；其余按量 API 不计入此表（默认 token）。
		*/
		const PLAN_KNOWLEDGE = {
			"opencode-go": {
				type: "code",
				subscription: {
					amount: 10,
					currency: "USD",
					period: "month"
				},
				tier: {
					amount: 10,
					currency: "USD",
					periodDays: 7,
					label: "周额度 $30"
				}
			},
			opencode: {
				type: "code",
				subscription: {
					amount: 10,
					currency: "USD",
					period: "month"
				},
				tier: {
					amount: 10,
					currency: "USD",
					periodDays: 7,
					label: "周额度 $30"
				}
			},
			"kimi-coding": { type: "code" },
			"zai-coding-cn": { type: "code" },
			"zai-coding": { type: "code" },
			"qwen-token-plan": { type: "code" },
			"qwen-token-plan-cn": { type: "code" },
			"xiaomi-token-plan-ams": { type: "code" },
			"xiaomi-token-plan-cn": { type: "code" },
			"xiaomi-token-plan-sgp": { type: "code" },
			"volcengine-token-plan": { type: "code" },
			"ark-token-plan": { type: "code" },
			"doubao-token-plan": { type: "code" },
			"minimax": { type: "code" },
			"minimax-token-plan": { type: "code" },
			"minimax-token-plan-cn": { type: "code" }
		};
		/**
		* 订阅/plan provider id 变体 → PLAN_KNOWLEDGE 规范键（引用 dsh-spend 的别名归一化）。
		* 部署配置的订阅 provider id 写法不一（glm/zhipu/bigmodel、ark/volcengine、
		* kimi/moonshot、xiaomi…），先归一化再匹配，提升"自动识别"覆盖率。
		* 注意：裸 qwen/dashscope/tongyi 等是按量 API（token 计费）而非订阅，不归一到
		* 订阅键——只有显式 token-plan 后缀才由 SUBSCRIPTION_ID_RE 判定为订阅。
		*/
		const PLAN_PROVIDER_ALIASES = {
			"glm": "zai-coding-cn",
			"bigmodel": "zai-coding-cn",
			"zhipu": "zai-coding-cn",
			"zhipuai": "zai-coding-cn",
			"zai": "zai-coding",
			"ark": "volcengine-token-plan",
			"volcengine": "volcengine-token-plan",
			"doubao": "doubao-token-plan",
			"moonshot": "kimi-coding",
			"kimi": "kimi-coding",
			"xiaomi": "xiaomi-token-plan-cn",
			"opencode": "opencode-go"
		};
		/** 归一化订阅 provider id：别名命中则映射到规范键，否则原样返回。 */
		function normalizePlanProvider(providerId) {
			if (providerId === "") return providerId;
			return PLAN_PROVIDER_ALIASES[providerId] ?? providerId;
		}
		/** 自动识别的档位月费与周期额度口径（订阅卡片展示）；无档位知识返回 undefined。 */
		function tierInfoOf(providerId) {
			const entry = PLAN_KNOWLEDGE[normalizePlanProvider(providerId)];
			return entry?.type === "code" ? entry.tier : void 0;
		}
		const FALLBACK_RATES = [
			{
				key: "deepseek-v4-flash",
				input: .14,
				cacheHit: .0028,
				output: .28
			},
			{
				key: "deepseek-v4-pro",
				input: .435,
				cacheHit: .003625,
				output: .87
			},
			{
				key: "gpt-5.6-sol",
				input: 5,
				cacheHit: .5,
				output: 30
			},
			{
				key: "gpt-5.6-terra",
				input: 2,
				cacheHit: .2,
				output: 12
			},
			{
				key: "gpt-5.6-luna",
				input: .2,
				cacheHit: .02,
				output: 1.2
			},
			{
				key: "glm-5.2",
				input: 1.4,
				cacheHit: .26,
				output: 4.4
			},
			{
				key: "qwen3.8-max",
				input: 2,
				cacheHit: .21,
				output: 6
			},
			{
				key: "kimi-k3",
				input: 2.82,
				cacheHit: .28,
				output: 14.08
			},
			{
				key: "grok-4.6",
				input: 2,
				cacheHit: .5,
				output: 6
			},
			{
				key: "gemini-2.5-pro",
				input: 1.25,
				cacheHit: .125,
				output: 10
			}
		];
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
		let liveExtraModels;
		let liveCatalogModels;
		/**
		* Apply the node half's live pricing snapshot. Absent fields keep the
		* built-in catalog and rate; callers never fabricate values.
		* @param pricing - the `/api/billing/pricing` response.
		*/
		function applyLivePricing(pricing) {
			liveRate = pricing.rate;
			livePrices = pricing.prices;
			liveExtraModels = pricing.extraModels;
		}
		/**
		* 注入探活得到的「系统里实际配置/预制的模型」清单（host 的 llm.models 返回
		* groups[].models[]，含模型 id/name，无价格）。费率表据此对标现实可用模型——
		* 有价的补价（内置目录 / models.dev 补充），无价的标「未收录」。纯内存状态，
		* 供 `catalogEntries()` 渲染。
		*/
		function applyLiveCatalogModels(models) {
			liveCatalogModels = models;
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
		* 工作日高峰时段判定（北京时间，UTC+8，无夏令时）：09:00–12:00、14:00–18:00。
		* 周末（周六/周日）北京全天为低谷，不调用本函数判定峰/平。
		* @param beijingHour - 北京时间的小时数（0–23）。
		*/
		function isPeakHour(beijingHour) {
			return beijingHour >= 9 && beijingHour < 12 || beijingHour >= 14 && beijingHour < 18;
		}
		/**
		* 由时刻（epoch 毫秒）推断计费时段；时刻未知/非法时按高峰计（保守：未知
		* 时刻不低估成本，与社区 dsh-usage-chart 的 tierAt 语义一致）。
		* 周末（北京时间周六/周日）全天不区分峰谷，统一按低谷价。
		* @param timeMs - Unix epoch 毫秒；null/undefined/NaN 视为未知。
		*/
		function tierAt(timeMs) {
			if (timeMs === null || timeMs === void 0 || !Number.isFinite(timeMs)) return "peak";
			if (isBeijingWeekend(timeMs)) return "offPeak";
			return isPeakHour((new Date(timeMs).getUTCHours() + 8) % 24) ? "peak" : "offPeak";
		}
		/** 时刻是否落在北京时间周末（周六/周日）。 */
		function isBeijingWeekend(timeMs) {
			const day = new Date(timeMs + 8 * 36e5).getUTCDay();
			return day === 0 || day === 6;
		}
		/** 距下一个工作日（周一）北京时间 09:00 峰时的毫秒数：周末全天低谷的下一档。 */
		function nextWeekdayPeakInMs(nowMs) {
			const bj = new Date(nowMs + 8 * 36e5);
			const day = bj.getUTCDay();
			const elapsed = bj.getUTCHours() * 36e5 + bj.getUTCMinutes() * 6e4 + bj.getUTCSeconds() * 1e3 + bj.getUTCMilliseconds();
			return (day === 0 ? 1 : 2) * 864e5 - elapsed + 9 * 36e5;
		}
		/** 峰谷切换边界（北京时间的当日分钟数）：09:00 / 12:00 / 14:00 / 18:00。 */
		const TIER_BOUNDARY_MINUTES = [
			540,
			720,
			840,
			1080
		];
		/** 北京时间的当日毫秒数（0–86,400,000）。 */
		function beijingMillisOfDay(timeMs) {
			return ((timeMs + 8 * 36e5) % 864e5 + 864e5) % 864e5;
		}
		/**
		* 当前峰谷档位与距下次切换的时长。导出供测试：纯函数。
		* @param nowMs - 当前时刻（epoch 毫秒）。
		* @returns 当前档位与到下一个切换边界的毫秒数。
		*/
		function tierCountdown(nowMs) {
			if (isBeijingWeekend(nowMs)) return {
				tier: "offPeak",
				nextSwitchInMs: nextWeekdayPeakInMs(nowMs)
			};
			const dayMs = beijingMillisOfDay(nowMs);
			for (const boundary of TIER_BOUNDARY_MINUTES) {
				const boundaryMs = boundary * 6e4;
				if (dayMs < boundaryMs) return {
					tier: tierAt(nowMs),
					nextSwitchInMs: boundaryMs - dayMs
				};
			}
			const firstBoundary = TIER_BOUNDARY_MINUTES[0] ?? 0;
			return {
				tier: tierAt(nowMs),
				nextSwitchInMs: 864e5 - dayMs + firstBoundary * 6e4
			};
		}
		/**
		* 峰/谷切换预告：距下次切换不足 leadMs 时返回即将进入的档位与切换时刻，
		* 否则 null。导出供测试：纯函数。
		* @param nowMs - 当前时刻（epoch 毫秒）。
		* @param leadMs - 提前量（毫秒）。
		*/
		function upcomingTierSwitch(nowMs, leadMs) {
			const { nextSwitchInMs } = tierCountdown(nowMs);
			if (nextSwitchInMs > leadMs) return null;
			const atMs = nowMs + nextSwitchInMs;
			return {
				entering: tierAt(atMs),
				atMs
			};
		}
		/**
		* 切换倒计时短格式：`1h23m` / `45m` / `3m`。导出供测试：纯函数。
		* @param ms - 剩余毫秒数。
		*/
		function formatSwitchCountdown(ms) {
			const minutes = Math.max(1, Math.ceil(ms / 6e4));
			const hours = Math.floor(minutes / 60);
			const rest = minutes % 60;
			return hours > 0 ? `${hours}h${String(rest).padStart(2, "0")}m` : `${rest}m`;
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
					input: 1,
					cacheHit: .02,
					output: 2
				}
			},
			{
				key: "mimo-v2.5-pro",
				name: "MiMo V2.5 Pro",
				provider: "小米",
				colorVar: "dsw-static-green-400",
				price: {
					currency: "CNY",
					input: 3,
					cacheHit: .025,
					output: 6
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
				},
				estimated: true
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
				},
				estimated: true
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
		/**
		* 模型 id 归一化：小写、去括号附注（如 `gpt5.6 luna(go)` 只看主体）、再去所有
		* 非字母数字分隔符（空格 / 横杠 / 点 / 下划线）。用于日志里的模型 id 与计费
		* 目录键做宽松匹配，提升「大小写/分隔符差异导致未收录」的识别率。
		* @param id - 原始模型 id（日志或目录键）。
		* @returns 归一化键（字母数字小写串）。
		*/
		function canonModelId(id) {
			return String(id).toLowerCase().replace(/\([^)]*\)/g, "").replace(/[^a-z0-9]+/g, "");
		}
		/**
		* 目录常量键的归一化索引：归一化键 → 真实计费键。只索引静态来源（内置目录、
		* 别名表、dsh-spend 兜底键）；models.dev 补充条目是运行时注入，单独实时匹配。
		*/
		const CATALOG_CANON_INDEX = (() => {
			const map = /* @__PURE__ */ new Map();
			const add = (candidate, target) => {
				const canon = canonModelId(candidate);
				if (canon !== "" && !map.has(canon)) map.set(canon, target);
			};
			for (const entry of MODEL_CATALOG) add(entry.key, entry.key);
			for (const [alias, key] of Object.entries(MODEL_KEY_ALIASES)) add(alias, key);
			for (const rate of FALLBACK_RATES) add(rate.key, rate.key);
			return map;
		})();
		/**
		* 解析真实日志模型 id → 计费目录键。先精确别名映射（既有行为）；未命中时做
		* 归一化匹配（忽略大小写/分隔符/括号附注），命中内置目录 / 别名目标 / 兜底键 /
		* models.dev 补充键即返回其真实键；完全未知时保持原样（回退 other，不计费）。
		* 供聚合层折叠与客户端渲染共用，两侧一致。
		* @param id - 真实模型 id（日志里出现的形式）。
		* @returns 计费目录键。
		*/
		function resolveCatalogKey(id) {
			const exact = MODEL_KEY_ALIASES[id] ?? id;
			if (exact === id) {
				const canon = canonModelId(id);
				if (canon !== "") {
					const hit = CATALOG_CANON_INDEX.get(canon);
					if (hit !== void 0) return hit;
					const extraHit = (liveExtraModels ?? []).find((item) => canonModelId(item.key) === canon);
					if (extraHit !== void 0) return extraHit.key;
				}
			}
			return exact;
		}
		/** 取一个计费键的实时单价（实时覆盖 > dsh-spend 官方价兜底）。 */
		function livePriceOf(key) {
			const resolved = resolveCatalogKey(key);
			const live = livePrices?.[resolved];
			if (live !== void 0) return live;
			const fallback = FALLBACK_RATES.find((rate) => rate.key.toLowerCase() === resolved.toLowerCase());
			if (fallback === void 0) return void 0;
			return {
				input: fallback.input,
				cacheHit: fallback.cacheHit,
				output: fallback.output
			};
		}
		/** Lookup a model by its stats key; falls back to the generic `other` entry. */
		function modelOf(key) {
			const resolved = resolveCatalogKey(key);
			const found = MODEL_CATALOG.find((entry) => entry.key === resolved);
			const extra = liveExtraModels?.find((item) => item.key === resolved);
			const base = found ?? (extra !== void 0 ? extraEntryOf(extra) : (() => {
				const fallback = MODEL_CATALOG.at(-1);
				if (fallback !== void 0) return fallback;
				throw new Error("MODEL_CATALOG must not be empty");
			})());
			const live = livePriceOf(resolved);
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
		/** models.dev 补充条目转为目录条目：USD 直价（走汇率换算），无峰谷分档。 */
		function extraEntryOf(extra) {
			return {
				key: extra.key,
				name: extra.name,
				provider: extra.provider,
				colorVar: "dsw-static-neutral-400",
				price: {
					currency: "USD",
					input: extra.price.input,
					cacheHit: extra.price.cacheHit,
					output: extra.price.output
				}
			};
		}
		/**
		* 费率表渲染的完整目录：内置 + models.dev 补充条目 + 探活模型（无价标记）。
		* 探活模型去重（按归一化 id）：内置/补充已有的不再重复；无价的保留并标记
		* `uncatalogued`，费率表据此显示「未收录」。
		*/
		function catalogEntries() {
			const entries = [...MODEL_CATALOG, ...(liveExtraModels ?? []).map(extraEntryOf)];
			const known = new Set(entries.map((entry) => entry.key.toLowerCase()));
			for (const model of liveCatalogModels ?? []) {
				const rawKey = model.id.toLowerCase();
				if ((() => {
					const aliasKey = resolveCatalogKey(model.id);
					return MODEL_CATALOG.find((item) => item.key === aliasKey);
				})() !== void 0) continue;
				if (known.has(rawKey)) continue;
				const extra = (liveExtraModels ?? []).find((item) => item.key === rawKey);
				const fallbackLive = extra === void 0 ? livePriceOf(rawKey) : void 0;
				let entry;
				if (extra !== void 0) entry = { ...extraEntryOf(extra) };
				else if (fallbackLive !== void 0) entry = {
					key: rawKey,
					name: model.name ?? model.id,
					provider: model.provider,
					colorVar: "dsw-static-neutral-400",
					price: {
						currency: "USD",
						input: fallbackLive.input,
						cacheHit: fallbackLive.cacheHit,
						output: fallbackLive.output
					}
				};
				else entry = {
					key: resolveCatalogKey(model.id),
					name: model.name ?? model.id,
					provider: model.provider,
					colorVar: "dsw-static-neutral-400",
					price: {
						currency: "USD",
						input: 0,
						cacheHit: 0,
						output: 0
					},
					uncatalogued: true
				};
				known.add(entry.key.toLowerCase());
				entries.push(entry);
			}
			return entries;
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
		/**
		* 把一条「每百万 token」单价从原生币种换算到目标展示币种（按 USD→CNY 汇率）。
		* 汇率缺失/非法时回退原值，避免 0 汇率把价格算没。
		* @param price - 原生币种单价。
		* @param native - 模型原生币种。
		* @param target - 用户当前展示币种。
		* @param rate - USD→CNY 汇率（1 USD = rate CNY）。
		* @returns 换算到目标币种的单价；同币种或汇率不可用时原值。
		*/
		function convertUnitPrice(price, native, target, rate) {
			if (rate <= 0 || !Number.isFinite(rate)) return price;
			if (native === (target === "usd" ? "USD" : "CNY")) return price;
			return target === "usd" ? price / rate : price * rate;
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
		const W$2 = 680;
		const H$2 = 220;
		const PAD$2 = {
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
		function shortNumber$1(value) {
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
				const plotW = W$2 - PAD$2.left - PAD$2.right;
				const plotH = H$2 - PAD$2.top - PAD$2.bottom;
				const inner = (i) => {
					if (n === 1) return PAD$2.left + plotW / 2;
					return PAD$2.left + plotW * i / (n - 1);
				};
				const maxCost = Math.max(...data.map((d) => Math.max(d.cost, Object.values(d.byModel ?? {}).reduce((sum, v) => sum + v, 0))), 1e-4);
				const yCost = (value) => PAD$2.top + plotH - value / maxCost * plotH;
				const maxCalls = Math.max(...data.map((d) => d.calls), 1);
				const yCalls = (value) => PAD$2.top + plotH - value / maxCalls * plotH;
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
						viewBox: `0 0 ${W$2} ${H$2}`,
						className: UsageBilling_module_css_default.chartSvg,
						role: "img",
						"aria-label": "Daily cost by model and total calls",
						onMouseLeave: () => {
							setHover(null);
						},
						onMouseMove: (e) => {
							const rect = e.currentTarget.getBoundingClientRect();
							const ratio = ((e.clientX - rect.left) / rect.width * W$2 - PAD$2.left) / plotW;
							const index = Math.round(ratio * (n - 1));
							setHover(Math.min(Math.max(index, 0), n - 1));
						},
						children: [
							costTicks.map((value, idx) => {
								const y = yCost(value);
								return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("g", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("line", {
									x1: PAD$2.left,
									x2: W$2 - PAD$2.right,
									y1: y,
									y2: y,
									className: UsageBilling_module_css_default.chartGrid
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("text", {
									x: PAD$2.left - 8,
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
									x: W$2 - PAD$2.right + 8,
									y: y + 3,
									textAnchor: "start",
									className: UsageBilling_module_css_default.chartAxisLabel,
									children: shortNumber$1(value)
								}, `calls-${idx}`);
							}),
							indices.map((i) => {
								const point = data[i];
								if (point === void 0) return null;
								return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("text", {
									x: inner(i),
									y: H$2 - 6,
									textAnchor: "middle",
									className: UsageBilling_module_css_default.chartAxisLabel,
									children: shortDate(point.date)
								}, point.date);
							}),
							hover !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("line", {
								x1: inner(hover),
								x2: inner(hover),
								y1: PAD$2.top,
								y2: PAD$2.top + plotH,
								className: UsageBilling_module_css_default.chartCrosshair
							})
						]
					}),
					activePoint !== void 0 && hover !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: UsageBilling_module_css_default.chartTooltip,
						style: {
							left: `${inner(hover) / W$2 * 100}%`,
							top: `${yCost(activePoint.cost) / H$2 * 100}%`
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
		//#region src/client/PerfPanel.tsx
		/**
		* PerfPanel: per-model latency/perf table + per-hour TTFT/generation-speed curve.
		*
		* Reads the optional `perf` field of the usage-stats document (aggregated by
		* the host from session logs). Renders a per-model table of TTFT mean/P50/P90,
		* generation speed, total latency and estimated-step count, plus a small
		* dependency-free SVG twin-series hourly curve (TTFT in ms on the left axis,
		* tokens/s on the right). Absent `perf` (older snapshot or stream-less logs)
		* renders an empty state; the panel never fabricates samples.
		*/
		/** Fixed viewBox for the hourly curve; the SVG scales to its container. */
		const W$1 = 680;
		const H$1 = 180;
		const PAD$1 = {
			top: 14,
			right: 42,
			bottom: 22,
			left: 46
		};
		/** 最近窗口内的小时点（键升序，尾部补齐空白，最旧在前）。 */
		function sortHourPoints(byHour) {
			const keys = Object.keys(byHour).sort();
			const points = [];
			for (const key of keys.slice(-48)) {
				const data = byHour[key];
				if (data === void 0) continue;
				points.push({
					key,
					ttftMs: data.ttftAvg,
					...data.tpsAvg === void 0 ? {} : { tps: data.tpsAvg }
				});
			}
			return points;
		}
		/** 短小时标签 `MM-DD HH`（跨天在小时键上有日期，直接截取即可辨识）。 */
		function shortHour(key) {
			return key.slice(5, 13).replace("T", " ");
		}
		/**
		* Render the performance panel.
		* @param props.perf - the optional perf doc; `undefined`/empty renders an empty state.
		* @param props.models - model legend (key/name/color) for the table swatches and curve legend.
		* @param props.t - locale function.
		*/
		function PerfPanel({ perf, models, t }) {
			const colorOf = (model) => models.find((m) => m.key === model)?.color ?? "#8b95a3";
			const rows = (0, react.useMemo)(() => {
				if (perf === void 0) return [];
				return Object.entries(perf.byModel).map(([key, data]) => ({
					key,
					name: models.find((m) => m.key === key)?.name ?? key,
					color: colorOf(key),
					samples: data.samples,
					ttftAvg: data.ttftAvg,
					ttftP50: data.ttftP50,
					ttftP90: data.ttftP90,
					...data.tpsAvg === void 0 ? {} : { tpsAvg: data.tpsAvg },
					latencyAvg: data.latencyAvg,
					estimatedSamples: data.estimatedSamples
				})).sort((a, b) => b.samples - a.samples || b.ttftP90 - a.ttftP90);
			}, [perf, models]);
			const hourLayout = (0, react.useMemo)(() => {
				const points = perf === void 0 ? [] : sortHourPoints(perf.byHour);
				if (points.length === 0) return null;
				const n = points.length;
				const plotW = W$1 - PAD$1.left - PAD$1.right;
				const plotH = H$1 - PAD$1.top - PAD$1.bottom;
				const inner = (i) => n === 1 ? PAD$1.left + plotW / 2 : PAD$1.left + plotW * i / (n - 1);
				const maxTtft = Math.max(...points.map((p) => p.ttftMs), 1);
				const maxTps = Math.max(...points.map((p) => p.tps ?? 0), 1);
				const yTtft = (v) => PAD$1.top + plotH - v / maxTtft * plotH;
				const yTps = (v) => PAD$1.top + plotH - v / maxTps * plotH;
				const ttftPath = points.map((p, i) => `${i === 0 ? "M" : "L"}${inner(i)} ${yTtft(p.ttftMs)}`).join(" ");
				const tpsPath = points.some((p) => p.tps !== void 0) ? points.map((p, i) => `${i === 0 ? "M" : "L"}${inner(i)} ${yTps(p.tps ?? 0)}`).join(" ") : "";
				const step = Math.max(1, Math.ceil(n / 8));
				const indices = [];
				for (let i = 0; i < n; i += step) indices.push(i);
				if (n > 0 && indices[indices.length - 1] !== n - 1) indices.push(n - 1);
				return {
					points,
					n,
					inner,
					yTtft,
					ttftPath,
					tpsPath,
					indices,
					ttftTicks: [
						0,
						.5,
						1
					].map((f) => maxTtft * f).reverse(),
					maxTps
				};
			}, [perf]);
			if (perf === void 0 || rows.length === 0) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: UsageBilling_module_css_default.chartEmpty,
				"data-testid": "billing-perf-empty",
				children: t("billing.perfEmpty")
			});
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				"data-testid": "billing-perf-panel",
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: UsageBilling_module_css_default.tableScroll,
					"data-testid": "billing-perf-table",
					children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("table", {
						className: UsageBilling_module_css_default.modelTable,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("thead", { children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("tr", { children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", { children: t("billing.model") }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", {
								className: UsageBilling_module_css_default.numCol,
								children: t("billing.perfSamples")
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", {
								className: UsageBilling_module_css_default.numCol,
								children: t("billing.perfTtft")
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", {
								className: UsageBilling_module_css_default.numCol,
								children: t("billing.perfP50")
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", {
								className: UsageBilling_module_css_default.numCol,
								children: t("billing.perfP90")
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", {
								className: UsageBilling_module_css_default.numCol,
								children: t("billing.perfTps")
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", {
								className: UsageBilling_module_css_default.numCol,
								children: t("billing.perfLatency")
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", {
								className: UsageBilling_module_css_default.numCol,
								children: t("billing.perfEstimated")
							})
						] }) }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("tbody", { children: rows.map((row) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("tr", { children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", { children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
								className: UsageBilling_module_css_default.modelCell,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: UsageBilling_module_css_default.modelDot,
									style: { background: row.color }
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: UsageBilling_module_css_default.modelName,
									children: row.name
								})]
							}) }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", {
								className: UsageBilling_module_css_default.numCol,
								children: row.samples.toLocaleString()
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("td", {
								className: UsageBilling_module_css_default.numCol,
								children: [row.ttftAvg.toFixed(0), " ms"]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("td", {
								className: UsageBilling_module_css_default.numCol,
								children: [row.ttftP50.toFixed(0), " ms"]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("td", {
								className: UsageBilling_module_css_default.numCol,
								children: [row.ttftP90.toFixed(0), " ms"]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", {
								className: UsageBilling_module_css_default.numCol,
								children: row.tpsAvg === void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: UsageBilling_module_css_default.na,
									children: "—"
								}) : `${row.tpsAvg.toFixed(1)}`
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("td", {
								className: UsageBilling_module_css_default.numCol,
								children: [row.latencyAvg.toFixed(0), " ms"]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", {
								className: UsageBilling_module_css_default.numCol,
								children: row.estimatedSamples > 0 ? row.estimatedSamples : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: UsageBilling_module_css_default.na,
									children: "—"
								})
							})
						] }, row.key)) })]
					})
				}), hourLayout !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: UsageBilling_module_css_default.chartWrap,
					"data-testid": "billing-perf-hour",
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("svg", {
						viewBox: `0 0 ${W$1} ${H$1}`,
						className: UsageBilling_module_css_default.chartSvg,
						role: "img",
						"aria-label": "Hourly TTFT and generation speed by model",
						children: [
							hourLayout.ttftTicks.map((value, idx) => {
								const y = hourLayout.yTtft(value);
								return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("g", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("line", {
									x1: PAD$1.left,
									x2: W$1 - PAD$1.right,
									y1: y,
									y2: y,
									className: UsageBilling_module_css_default.chartGrid
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("text", {
									x: PAD$1.left - 8,
									y: y + 3,
									textAnchor: "end",
									className: UsageBilling_module_css_default.chartAxisLabel,
									children: value.toFixed(0)
								})] }, `ttft-${idx}`);
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
								d: hourLayout.ttftPath,
								fill: "none",
								className: UsageBilling_module_css_default.chartLine
							}),
							hourLayout.tpsPath !== "" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
								d: hourLayout.tpsPath,
								fill: "none",
								className: UsageBilling_module_css_default.chartLine,
								style: {
									stroke: "var(--dsw-static-amber-500)",
									strokeDasharray: "4 4"
								}
							}),
							hourLayout.indices.map((i) => {
								const point = hourLayout.points[i];
								if (point === void 0) return null;
								return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("text", {
									x: hourLayout.inner(i),
									y: H$1 - 6,
									textAnchor: "middle",
									className: UsageBilling_module_css_default.chartAxisLabel,
									children: shortHour(point.key)
								}, point.key);
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("text", {
								x: W$1 - PAD$1.right + 8,
								y: PAD$1.top + 4,
								textAnchor: "start",
								className: UsageBilling_module_css_default.chartAxisLabel,
								children: [
									t("billing.perfTpsUnit"),
									" ",
									hourLayout.maxTps.toFixed(0)
								]
							})
						]
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: UsageBilling_module_css_default.chartLegend,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { className: UsageBilling_module_css_default.chartLegendLine }),
							t("billing.perfTtft"),
							" (ms)"
						] }), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: UsageBilling_module_css_default.chartLegendLine,
								style: { background: "var(--dsw-static-amber-500)" }
							}),
							t("billing.perfTps"),
							" (",
							t("billing.perfTpsUnit"),
							")"
						] })]
					})]
				})]
			});
		}
		//#endregion
		//#region src/client/plugin-info.ts
		/**
		* 插件元信息（「设置 → 插件信息卡」展示）：名称 / 描述 / 作者 / 仓库 / 许可证。
		* 版本号不含在此——由服务端从自身 package.json 读取（pluginVersion），
		* 这样发布版版本与源码单一来源，不会两处不同步。
		*/
		/** npm 包名。 */
		const PLUGIN_NAME = "@kenz1117/dsh-ui-usage-billing";
		/** 一句话描述。 */
		const PLUGIN_DESCRIPTION = "Usage billing dashboard for DeepSeek Harness";
		/** 作者显示名。 */
		const PLUGIN_AUTHOR_NAME = "KenZ";
		/** 作者 GitHub 账号（仓库/作者页链接）。 */
		const PLUGIN_AUTHOR_HANDLE = "kenz1117";
		/** 源码仓库（可点击）。 */
		const PLUGIN_REPOSITORY = "https://github.com/kenz1117/dsh-ui-usage-billing";
		/** npm 包主页（可点击）。 */
		const PLUGIN_NPM_URL = "https://www.npmjs.com/package/@kenz1117/dsh-ui-usage-billing";
		//#endregion
		//#region src/client/PluginInfoCard.tsx
		/**
		* PluginInfoCard: 「设置 → 插件信息」卡——展示头像/作者、GitHub 仓库、版本号、
		* 许可证等插件元信息。版本号来自服务端 usage-stats 的 `pluginVersion`（读自
		* 包 package.json），其余元信息静态来自 `plugin-info.ts`。无版本号时显示 em dash。
		*/
		/** 信息卡 props：locale 函数 + 版本号（服务端下发，可为空）。 */
		function PluginInfoCard({ t, version }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
				className: UsageBilling_module_css_default.panel,
				"data-testid": "billing-plugin-info",
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: UsageBilling_module_css_default.panelHead,
					children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("h3", {
						className: UsageBilling_module_css_default.panelTitle,
						children: t("billing.pluginInfo")
					})
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: UsageBilling_module_css_default.pluginInfo,
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: UsageBilling_module_css_default.pluginInfoRow,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: UsageBilling_module_css_default.pluginInfoLabel,
								children: t("billing.pluginName")
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: UsageBilling_module_css_default.pluginInfoValue,
								children: PLUGIN_NAME
							})]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: UsageBilling_module_css_default.pluginInfoRow,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: UsageBilling_module_css_default.pluginInfoLabel,
								children: t("billing.pluginDescription")
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: UsageBilling_module_css_default.pluginInfoValue,
								children: PLUGIN_DESCRIPTION
							})]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: UsageBilling_module_css_default.pluginInfoRow,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: UsageBilling_module_css_default.pluginInfoLabel,
								children: t("billing.pluginVersion")
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: UsageBilling_module_css_default.pluginInfoValue,
								children: version === void 0 ? "—" : `v${version}`
							})]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: UsageBilling_module_css_default.pluginInfoRow,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: UsageBilling_module_css_default.pluginInfoLabel,
								children: t("billing.pluginAuthor")
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("a", {
								className: UsageBilling_module_css_default.pluginInfoLink,
								href: `https://github.com/${PLUGIN_AUTHOR_HANDLE}`,
								target: "_blank",
								rel: "noreferrer",
								children: [
									PLUGIN_AUTHOR_NAME,
									" (",
									PLUGIN_AUTHOR_HANDLE,
									")"
								]
							})]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: UsageBilling_module_css_default.pluginInfoRow,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: UsageBilling_module_css_default.pluginInfoLabel,
								children: t("billing.pluginRepository")
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("a", {
								className: UsageBilling_module_css_default.pluginInfoLink,
								href: PLUGIN_REPOSITORY,
								target: "_blank",
								rel: "noreferrer",
								children: PLUGIN_REPOSITORY
							})]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: UsageBilling_module_css_default.pluginInfoRow,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: UsageBilling_module_css_default.pluginInfoLabel,
								children: t("billing.pluginNpm")
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("a", {
								className: UsageBilling_module_css_default.pluginInfoLink,
								href: PLUGIN_NPM_URL,
								target: "_blank",
								rel: "noreferrer",
								children: PLUGIN_NAME
							})]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: UsageBilling_module_css_default.pluginInfoRow,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: UsageBilling_module_css_default.pluginInfoLabel,
								children: t("billing.pluginLicense")
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: UsageBilling_module_css_default.pluginInfoValue,
								children: "MIT"
							})]
						})
					]
				})]
			});
		}
		//#endregion
		//#region src/client/TokenPanel.tsx
		/**
		* TokenPanel: 「Token」分区——把 token 从费用里独立出来洞察。
		* 三个板块 + 导出，全部由 `UsageStats` 的 byDay/byModel/total 派生，服务端零改动：
		*  1. 每日 Token 堆叠趋势（未命中输入 / 缓存命中 / 输出[含 reasoning]），7/30 天切换；
		*  2. 模型 Token 总量排行 + 占比；
		*  3. Token 结构 KPI（缓存命中率 / reasoning 占比 / 输入:输出比 / 峰值日）。
		*/
		/** 本地时区 `YYYY-MM-DD`（与服务端 dayStamp 一致）。 */
		function localStamp(time = Date.now()) {
			const d = new Date(time);
			const p = (n) => String(n).padStart(2, "0");
			return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
		}
		/** 短数字刻度：`1.2M` / `3.4K`。 */
		function shortNumber(v) {
			if (v >= 1e6) return `${(v / 1e6).toFixed(1)}M`;
			if (v >= 1e3) return `${(v / 1e3).toFixed(1)}K`;
			return String(Math.round(v));
		}
		const W = 680;
		const H = 200;
		const PAD = {
			top: 14,
			right: 18,
			bottom: 22,
			left: 46
		};
		const MISS_COLOR = "var(--dsw-static-blue-500)";
		const HIT_COLOR = "var(--dsw-static-cyan-500)";
		const OUTPUT_COLOR = "var(--dsw-static-amber-500)";
		/** 导出按日 token CSV。 */
		function tokenDayCsv(days) {
			return ["date,missInput,cacheHit,output,reasoning,total", ...days.map((d) => `${d.date},${d.miss},${d.hit},${d.output},${d.reasoning},${d.miss + d.hit + d.output}`)].join("\n");
		}
		/**
		* Token 洞察面板。
		* @param props.stats - usage-stats 文档（byDay/byModel/total）。
		* @param props.trendDays - 每日 token 窗口（7/30 天）。
		* @param props.onTrendDays - 切换趋势窗口。
		*/
		function TokenPanel(props) {
			const { stats, currency: _currency, trendDays, onTrendDays, t } = props;
			const { byDay, byModel, total } = stats;
			const days = (0, react.useMemo)(() => {
				const out = [];
				for (let offset = trendDays - 1; offset >= 0; offset -= 1) {
					const d = /* @__PURE__ */ new Date();
					d.setDate(d.getDate() - offset);
					const date = localStamp(d.getTime());
					const day = byDay[date];
					out.push({
						date,
						miss: day?.cacheMiss ?? 0,
						hit: day?.cacheHit ?? 0,
						output: day?.output ?? 0,
						reasoning: day?.reasoning ?? 0
					});
				}
				return out;
			}, [byDay, trendDays]);
			const models = (0, react.useMemo)(() => {
				let grand = 0;
				return Object.entries(byModel).filter(([, d]) => d.calls > 0).map(([key, d]) => {
					const totalTokens = d.input + d.output;
					grand += totalTokens;
					const hitMiss = d.cacheHit + d.cacheMiss;
					return {
						key,
						name: modelOf(key).name,
						input: d.input,
						output: d.output,
						reasoning: d.reasoning ?? 0,
						calls: d.calls,
						cacheHit: d.cacheHit,
						cacheMiss: d.cacheMiss,
						cacheHitRate: hitMiss > 0 ? d.cacheHit / hitMiss * 100 : 0,
						total: totalTokens,
						share: 0
					};
				}).sort((a, b) => b.total - a.total).map((r) => ({
					...r,
					share: grand > 0 ? r.total / grand : 0
				}));
			}, [byModel]);
			const kpis = (0, react.useMemo)(() => {
				const hit = total.cacheHit ?? 0;
				const miss = total.cacheMiss ?? 0;
				const input = total.input ?? 0;
				const output = total.output ?? 0;
				const reasoning = total.reasoning ?? 0;
				const hitMiss = hit + miss;
				const cacheHitRate = hitMiss > 0 ? hit / hitMiss * 100 : 0;
				const reasoningPct = output > 0 ? reasoning / output * 100 : 0;
				const io = output > 0 ? input / output : 0;
				let peak;
				for (const d of days) {
					const t2 = d.miss + d.hit + d.output;
					if (peak === void 0 || t2 > peak.miss + peak.hit + peak.output) peak = d;
				}
				return {
					cacheHitRate,
					reasoningPct,
					io,
					peak,
					hit,
					miss,
					input,
					output,
					reasoning
				};
			}, [total, days]);
			const chart = (0, react.useMemo)(() => {
				const n = days.length;
				if (n === 0) return null;
				const plotW = W - PAD.left - PAD.right;
				const plotH = H - PAD.top - PAD.bottom;
				const max = Math.max(...days.map((d) => d.miss + d.hit + d.output), 1);
				const y = (v) => PAD.top + plotH - v / max * plotH;
				const groupW = plotW / n;
				const barW = Math.min(20, groupW * .6);
				const inner = (i) => n === 1 ? PAD.left + plotW / 2 : PAD.left + plotW * i / (n - 1);
				const step = Math.max(1, Math.ceil(n / 8));
				const indices = [];
				for (let i = 0; i < n; i += step) indices.push(i);
				if (n > 0 && indices[indices.length - 1] !== n - 1) indices.push(n - 1);
				return {
					n,
					plotW,
					plotH,
					max,
					y,
					barW,
					inner,
					indices
				};
			}, [days]);
			const exportTokenCsv = () => {
				const blob = new Blob([tokenDayCsv(days)], { type: "text/csv" });
				const a = document.createElement("a");
				a.href = URL.createObjectURL(blob);
				a.download = `token-daily-${localStamp()}.csv`;
				a.click();
				URL.revokeObjectURL(a.href);
			};
			const exportTokenJson = () => {
				const blob = new Blob([JSON.stringify({
					days,
					models,
					total
				}, null, 2)], { type: "application/json" });
				const a = document.createElement("a");
				a.href = URL.createObjectURL(blob);
				a.download = `token-${localStamp()}.json`;
				a.click();
				URL.revokeObjectURL(a.href);
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: UsageBilling_module_css_default.tokenPanel,
				"data-testid": "billing-token-panel",
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: UsageBilling_module_css_default.exportBar,
						role: "group",
						"aria-label": t("billing.tokenExport"),
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: UsageBilling_module_css_default.exportLabel,
								children: t("billing.export")
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: UsageBilling_module_css_default.exportButton,
								"data-testid": "billing-token-export-csv",
								onClick: exportTokenCsv,
								children: t("billing.tokenExportCsv")
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: UsageBilling_module_css_default.exportButton,
								"data-testid": "billing-token-export-json",
								onClick: exportTokenJson,
								children: t("billing.exportJson")
							})
						]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: UsageBilling_module_css_default.kpiGrid,
						"data-testid": "billing-token-kpis",
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: UsageBilling_module_css_default.kpiTile,
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: UsageBilling_module_css_default.kpiLabel,
										children: t("billing.tokenCacheHitRate")
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
										className: UsageBilling_module_css_default.kpiValue,
										children: [kpis.cacheHitRate.toFixed(1), "%"]
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
										className: UsageBilling_module_css_default.kpiDetail,
										children: [
											formatTokens(kpis.hit),
											" / ",
											formatTokens(kpis.hit + kpis.miss)
										]
									})
								]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: UsageBilling_module_css_default.kpiTile,
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: UsageBilling_module_css_default.kpiLabel,
										children: t("billing.tokenReasoningShare")
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
										className: UsageBilling_module_css_default.kpiValue,
										children: [kpis.reasoningPct.toFixed(1), "%"]
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: UsageBilling_module_css_default.kpiDetail,
										children: formatTokens(kpis.reasoning)
									})
								]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: UsageBilling_module_css_default.kpiTile,
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: UsageBilling_module_css_default.kpiLabel,
										children: t("billing.tokenIo")
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: UsageBilling_module_css_default.kpiValue,
										children: kpis.io.toFixed(2)
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
										className: UsageBilling_module_css_default.kpiDetail,
										children: [
											formatTokens(kpis.input),
											" / ",
											formatTokens(kpis.output)
										]
									})
								]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: UsageBilling_module_css_default.kpiTile,
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: UsageBilling_module_css_default.kpiLabel,
										children: t("billing.tokenPeak")
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: UsageBilling_module_css_default.kpiValue,
										children: kpis.peak === void 0 ? "—" : shortNumber(kpis.peak.miss + kpis.peak.hit + kpis.peak.output)
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: UsageBilling_module_css_default.kpiDetail,
										children: kpis.peak?.date ?? "—"
									})
								]
							})
						]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
						className: UsageBilling_module_css_default.panel,
						"data-testid": "billing-token-daily",
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: UsageBilling_module_css_default.panelHead,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h3", {
								className: UsageBilling_module_css_default.panelTitle,
								children: t("billing.tokenDaily")
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: UsageBilling_module_css_default.rangeToggle,
								role: "group",
								"aria-label": t("billing.tokenDaily"),
								children: [7, 30].map((d) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									className: clsx(UsageBilling_module_css_default.rangeButton, trendDays === d && UsageBilling_module_css_default.rangeButtonActive),
									"aria-pressed": trendDays === d,
									onClick: () => {
										onTrendDays(d);
									},
									"data-testid": `billing-token-${d}d`,
									children: d === 7 ? t("billing.trend7d") : t("billing.trend30d")
								}, d))
							})]
						}), chart === null ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: UsageBilling_module_css_default.chartEmpty,
							children: t("billing.trendEmpty")
						}) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: UsageBilling_module_css_default.chartWrap,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("svg", {
								viewBox: `0 0 ${W} ${H}`,
								className: UsageBilling_module_css_default.chartSvg,
								role: "img",
								"aria-label": t("billing.tokenDaily"),
								children: [
									[
										0,
										.5,
										1
									].map((f) => {
										const v = chart.max * f;
										const yy = chart.y(v);
										return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("g", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("line", {
											x1: PAD.left,
											x2: W - PAD.right,
											y1: yy,
											y2: yy,
											className: UsageBilling_module_css_default.chartGrid
										}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("text", {
											x: PAD.left - 8,
											y: yy + 3,
											textAnchor: "end",
											className: UsageBilling_module_css_default.chartAxisLabel,
											children: shortNumber(v)
										})] }, f);
									}),
									days.map((d, i) => {
										const x = chart.inner(i) - chart.barW / 2;
										const baseY = chart.y(0);
										const yMiss = chart.y(d.miss);
										const yHit = chart.y(d.miss + d.hit);
										const yOut = chart.y(d.miss + d.hit + d.output);
										return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("g", { children: [
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("rect", {
												x,
												y: yMiss,
												width: chart.barW,
												height: baseY - yMiss,
												fill: MISS_COLOR
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("rect", {
												x,
												y: yHit,
												width: chart.barW,
												height: yMiss - yHit,
												fill: HIT_COLOR
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("rect", {
												x,
												y: yOut,
												width: chart.barW,
												height: yHit - yOut,
												fill: OUTPUT_COLOR
											})
										] }, d.date);
									}),
									chart.indices.map((i) => {
										const d = days[i];
										if (d === void 0) return null;
										return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("text", {
											x: chart.inner(i),
											y: H - 6,
											textAnchor: "middle",
											className: UsageBilling_module_css_default.chartAxisLabel,
											children: d.date.slice(5)
										}, d.date);
									})
								]
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: UsageBilling_module_css_default.chartLegend,
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: UsageBilling_module_css_default.chartTooltipSwatch,
										style: { background: MISS_COLOR }
									}), t("billing.tokenMiss")] }),
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: UsageBilling_module_css_default.chartTooltipSwatch,
										style: { background: HIT_COLOR }
									}), t("billing.tokenHit")] }),
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: UsageBilling_module_css_default.chartTooltipSwatch,
										style: { background: OUTPUT_COLOR }
									}), t("billing.tokenOutput")] })
								]
							})]
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
						className: UsageBilling_module_css_default.panel,
						"data-testid": "billing-token-models",
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: UsageBilling_module_css_default.panelHead,
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("h3", {
								className: UsageBilling_module_css_default.panelTitle,
								children: t("billing.tokenByModel")
							})
						}), models.length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: UsageBilling_module_css_default.emptyRow,
							children: t("billing.noData")
						}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: UsageBilling_module_css_default.tableScroll,
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("table", {
								className: UsageBilling_module_css_default.modelTable,
								"data-testid": "billing-token-model-table",
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("thead", { children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("tr", { children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", { children: t("billing.model") }),
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
										children: t("billing.tokenReasoningShort")
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", {
										className: UsageBilling_module_css_default.numCol,
										children: t("billing.cacheHitRate")
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", {
										className: UsageBilling_module_css_default.numCol,
										children: t("billing.tokenTotal")
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", {
										className: UsageBilling_module_css_default.numCol,
										children: t("billing.tokenShare")
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", {
										className: UsageBilling_module_css_default.numCol,
										children: t("billing.calls")
									})
								] }) }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("tbody", { children: models.map((m) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("tr", {
									"data-testid": "billing-token-model",
									children: [
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", { children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: UsageBilling_module_css_default.modelName,
											children: m.name
										}) }),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", {
											className: UsageBilling_module_css_default.numCol,
											children: formatTokens(m.input)
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", {
											className: UsageBilling_module_css_default.numCol,
											children: formatTokens(m.output)
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", {
											className: UsageBilling_module_css_default.numCol,
											children: m.reasoning > 0 ? formatTokens(m.reasoning) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
												className: UsageBilling_module_css_default.na,
												children: "—"
											})
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("td", {
											className: UsageBilling_module_css_default.numCol,
											children: [m.cacheHitRate.toFixed(1), "%"]
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", {
											className: UsageBilling_module_css_default.numCol,
											children: formatTokens(m.total)
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", {
											className: UsageBilling_module_css_default.numCol,
											children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
												className: UsageBilling_module_css_default.tokenModelShareRow,
												children: [
													/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
														className: UsageBilling_module_css_default.tokenModelBar,
														children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
															className: UsageBilling_module_css_default.tokenModelParts,
															style: { width: `${(m.share * 100).toFixed(2)}%` },
															children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
																className: UsageBilling_module_css_default.tokenModelPartIn,
																style: { width: `${m.total > 0 ? m.input / m.total * 100 : 0}%` }
															}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
																className: UsageBilling_module_css_default.tokenModelPartOut,
																style: { width: `${m.total > 0 ? m.output / m.total * 100 : 0}%` }
															})]
														})
													}),
													(m.share * 100).toFixed(1),
													"%"
												]
											})
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", {
											className: UsageBilling_module_css_default.numCol,
											children: m.calls.toLocaleString()
										})
									]
								}, m.key)) })]
							})
						})]
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
						const peak = tierAt(round.startedAt) === "peak";
						return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: clsx(UsageBilling_module_css_default.roundsBarCol, peak ? UsageBilling_module_css_default.roundsBarColPeak : UsageBilling_module_css_default.roundsBarColOff),
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: UsageBilling_module_css_default.roundsBarLabel,
								style: { bottom: `${height}%` },
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
			"color-mix(in srgb, var(--dsw-static-green-500) 22%, var(--dsw-alias-bg-layer-2))",
			"color-mix(in srgb, var(--dsw-static-green-500) 45%, var(--dsw-alias-bg-layer-2))",
			"color-mix(in srgb, var(--dsw-static-green-500) 70%, var(--dsw-alias-bg-layer-2))",
			"var(--dsw-static-green-500)"
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
		* Build the GitHub-style year cells (column = week, row = Sunday..Saturday),
		* covering the last 52 weeks up to the current week. Future days render as
		* level-0 gray; the column-flow grid lays each week's 7 cells vertically.
		*/
		function buildYearWeeks(days, now) {
			const byDate = /* @__PURE__ */ new Map();
			for (const day of days) byDate.set(day.date, day.value);
			let max = 0;
			for (const value of byDate.values()) if (value > max) max = value;
			const today = dayStamp(now);
			const thisSunday = new Date(now);
			thisSunday.setHours(0, 0, 0, 0);
			thisSunday.setDate(thisSunday.getDate() - thisSunday.getDay());
			const firstSunday = new Date(thisSunday);
			firstSunday.setDate(thisSunday.getDate() - 357);
			const weeks = [];
			for (let week = 0; week < 52; week += 1) {
				const row = [];
				for (let dow = 0; dow < 7; dow += 1) {
					const date = new Date(firstSunday);
					date.setDate(firstSunday.getDate() + week * 7 + dow);
					const iso = dayStamp(date);
					const future = iso > today;
					const value = future ? 0 : byDate.get(iso) ?? 0;
					let level = 0;
					if (!future && value > 0 && max > 0) {
						const scaled = Math.ceil(value / max * 4);
						level = Math.min(4, Math.max(1, scaled));
					}
					row.push({
						date: iso,
						dayNum: date.getDate(),
						value,
						level,
						placeholder: future
					});
				}
				weeks.push(row);
			}
			return weeks;
		}
		/**
		* Render the month or year heatmap.
		* @param props.days - daily cost rows (keys are `YYYY-MM-DD`).
		* @param props.currency - display currency for the hover amount.
		* @param props.now - anchor date (defaults to today); injectable for tests.
		* @param props.t - locale function (used for the legend labels).
		* @param props.range - `month` (calendar month) or `year` (last 52 weeks, GitHub style).
		*/
		function UsageHeatmap({ days, currency, now, t, range = "month" }) {
			const [hover, setHover] = (0, react.useState)(null);
			const money = (cny) => formatMoney(currency === "usd" ? cnyToUsd(cny) : cny, currency);
			const monthWeeks = (0, react.useMemo)(() => buildMonthWeeks(days, now ?? /* @__PURE__ */ new Date()), [days, now]);
			if (range === "year") {
				const yearWeeks = buildYearWeeks(days, now ?? /* @__PURE__ */ new Date());
				return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: UsageBilling_module_css_default.heatmap,
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: UsageBilling_module_css_default.heatmapYearScroll,
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: UsageBilling_module_css_default.heatmapYearGrid,
							role: "img",
							"aria-label": "yearly cost heatmap",
							"data-testid": "heatmap-year-grid",
							children: yearWeeks.flat().map((cell) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: UsageBilling_module_css_default.heatmapYearCell,
								"data-testid": "heatmap-year-cell",
								"data-level": cell.level,
								style: { background: LEVEL_COLORS[cell.level] },
								title: `${cell.date} · ${money(cell.value)}`,
								"aria-label": `${cell.date}: ${money(cell.value)}`
							}, cell.date))
						})
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
							})
						]
					})]
				});
			}
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: UsageBilling_module_css_default.heatmap,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: UsageBilling_module_css_default.heatmapGrid,
					role: "img",
					"aria-label": "daily cost heatmap",
					children: monthWeeks.map((week) => week.map((cell) => {
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
		//#region src/client/export.ts
		/** CSV 单元格转义：含逗号 / 引号 / 换行的值加双引号并内层引号双写。 */
		function csvCell(value) {
			return /[",\n]/.test(value) ? `"${value.replace(/"/g, "\"\"")}"` : value;
		}
		/** 金额保留两位小数字符串（导出对账用，不做千分位）。 */
		function money(value) {
			return value.toFixed(2);
		}
		/** 按日 CSV：日期,调用,输入,输出,缓存命中,缓存未命中,费用(元)。 */
		function dayRowsCsv(byDay) {
			return ["date,calls,input,output,cache_hit,cache_miss,cost_cny", ...Object.keys(byDay).sort().map((date) => {
				const day = byDay[date];
				if (day === void 0) return "";
				return [
					date,
					day.calls,
					day.input,
					day.output,
					day.cacheHit,
					day.cacheMiss,
					money(day.cost)
				].join(",");
			})].join("\n");
		}
		/** 项目名取 cwd 末级目录（与统计 Tab 的会话明细同口径）。 */
		function projectOf(cwd) {
			if (cwd === void 0) return "";
			return cwd.split(/[\\/]/).filter(Boolean).pop() ?? cwd;
		}
		/** 按会话 CSV：会话 id,标题,项目,调用,费用(元),最后活跃(ISO)。 */
		function sessionRowsCsv(rows) {
			return ["session_id,title,project,calls,cost_cny,last_active", ...rows.map((row) => [
				csvCell(row.id),
				csvCell(row.title ?? ""),
				csvCell(projectOf(row.cwd)),
				row.calls,
				money(row.cost),
				row.lastActive > 0 ? new Date(row.lastActive).toISOString() : ""
			].join(","))].join("\n");
		}
		/** 导出文件名：带日期范围（usage-2026-08-01_2026-08-22.csv）；无日期时只带前缀。 */
		function exportFileName(prefix, ext, dates) {
			const sorted = [...dates].sort();
			const first = sorted[0];
			const last = sorted.at(-1);
			return `${prefix}${first !== void 0 && last !== void 0 ? `-${first}_${last}` : ""}.${ext}`;
		}
		/** 触发浏览器下载（唯一 DOM 副作用；调用方在 click 手势里使用）。 */
		function downloadText(filename, text, mime) {
			const url = URL.createObjectURL(new Blob([text], { type: mime }));
			const anchor = document.createElement("a");
			anchor.href = url;
			anchor.download = filename;
			anchor.click();
			URL.revokeObjectURL(url);
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
			"billing.monthProjected": "本月预计",
			"billing.liveTurn": "本轮",
			"billing.liveSession": "会话",
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
			"billing.budgetTierBody": "本月花费 {cost} 已达预算 {budget} 的 {pct}%",
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
			"billing.pricingTip": "DeepSeek 模型自北京时间 2026-08-23（周日）00:00 起：工作日高峰 9-12 / 14-18（×2），周末（周六 / 周日）全天低谷价；双价单元格按峰 / 谷展示，费用按调用时刻计。",
			"billing.balance": "余额",
			"billing.balanceUnconfigured": "未配置",
			"billing.balanceUnauthorized": "密钥无效",
			"billing.balanceUnreachable": "查询失败",
			"billing.uncatalogued": "未收录",
			"billing.estimatedPricing": "估算价",
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
			"billing.subscriptionExhausted": "已用尽",
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
			"billing.costAbbr": "费用",
			"billing.tabOverview": "概览",
			"billing.tabTrends": "趋势",
			"billing.tabProviders": "明细",
			"billing.tabDetails": "统计",
			"billing.tabPricing": "费率",
			"billing.tabSettings": "设置",
			"billing.settingsHead": "偏好设置",
			"billing.settingsHint": "管理与计费相关的偏好",
			"billing.budgetHint": "设置月度上限，用于本月预计与超支分段提醒",
			"billing.peakAlertHint": "在切档前弹窗提醒，可选同步系统通知",
			"billing.peakAlertDescPeak": "高峰价生效，不急的调用可稍候",
			"billing.peakAlertDescOff": "价格减半省钱窗口已开启",
			"billing.export": "导出",
			"billing.exportCsvDay": "按日 CSV",
			"billing.exportCsvSession": "按会话 CSV",
			"billing.exportJson": "全量 JSON",
			"billing.peakShare": "峰谷时段占比",
			"billing.peakShareHint": "近 {count} 轮",
			"billing.weekCost": "本周",
			"billing.roleCost": "费用构成",
			"billing.roleUser": "用户输入",
			"billing.roleAssistant": "助手输出",
			"billing.roleTool": "工具结果",
			"billing.roleHint": "估算：输出按实测计价，输入按消息长度摊分",
			"billing.tierPeak": "峰时",
			"billing.tierOff": "平价",
			"billing.tierToPeak": "后转峰时",
			"billing.tierToOff": "后转平价",
			"billing.tierAlertEnterPeak": "{minutes} 分钟后进入峰时（DeepSeek 高峰价 ×2），不急的调用可稍等",
			"billing.tierAlertEnterOff": "{minutes} 分钟后进入平价（价格减半）",
			"billing.peakAlertTitlePeak": "即将进入高峰价",
			"billing.peakAlertTitleOff": "即将进入平价",
			"billing.peakAlert": "峰谷切换提醒",
			"billing.peakAlertLeadMin": "提前量（分钟）",
			"billing.peakAlertPosCorner": "右下角",
			"billing.peakAlertPosCenter": "屏幕居中",
			"billing.peakAlertModePeak": "仅进入峰时",
			"billing.peakAlertModeOff": "仅进入平价",
			"billing.peakAlertModeBoth": "峰与谷都提醒",
			"billing.peakAlertWebNotify": "同时发系统通知",
			"billing.peakAlertPreview": "预览提醒",
			"billing.planTypeCode": "订阅制",
			"billing.planTypeToken": "按量",
			"billing.subscriptionFeePerMonth": "{amount}/月",
			"billing.triggerToday": "今日",
			"billing.triggerMonth": "当月",
			"billing.subscriptionIncluded": "订阅包含",
			"billing.free": "免费",
			"billing.official": "官方",
			"billing.thirdParty": "三方",
			"billing.officialCost": "官方费用",
			"billing.thirdPartyCost": "三方费用",
			"billing.perfSamples": "样本",
			"billing.perfTtft": "首字延时",
			"billing.perfP50": "P50",
			"billing.perfP90": "P90",
			"billing.perfTps": "生成速度",
			"billing.perfLatency": "总延迟",
			"billing.perfEstimated": "估算样本",
			"billing.perfEmpty": "暂无性能数据",
			"billing.perfTpsUnit": "tok/s",
			"billing.perfTitle": "性能",
			"billing.perfHint": "按模型与按小时聚合；估算样本为工具续写步骤",
			"billing.heatmapYear": "年",
			"billing.heatmapMonth": "月",
			"billing.activeDays": "活跃天数",
			"billing.streakDays": "连续使用",
			"billing.subscriptionAutoDetect": "自动识别",
			"billing.pluginInfo": "插件信息",
			"billing.pluginName": "插件名",
			"billing.pluginDescription": "描述",
			"billing.pluginVersion": "版本",
			"billing.pluginAuthor": "作者",
			"billing.pluginRepository": "仓库",
			"billing.pluginNpm": "npm",
			"billing.pluginLicense": "许可证",
			"billing.tabToken": "用量",
			"billing.tokenExport": "导出 Token",
			"billing.tokenExportCsv": "按日 Token CSV",
			"billing.tokenCacheHitRate": "缓存命中率",
			"billing.tokenReasoningShare": "思考占比",
			"billing.tokenReasoningShort": "思考",
			"billing.tokenIo": "输入/输出比",
			"billing.tokenPeak": "峰值日",
			"billing.tokenDaily": "每日 Token",
			"billing.tokenByModel": "模型 Token",
			"billing.tokenMiss": "未命中输入",
			"billing.tokenHit": "缓存命中",
			"billing.tokenOutput": "输出",
			"billing.tokenTotal": "总 Token",
			"billing.tokenShare": "占比",
			"billing.usageStatsTool": "注入用量查询工具",
			"billing.usageStatsToolHint": "让模型可在对话中查询用量/费用；会占用模型每次请求的上下文，coding 场景建议关闭（改后需重载应用生效）",
			"billing.balanceGranted": "赠金余额",
			"billing.balanceTopped": "充值余额",
			"billing.balanceDaily": "日均消耗",
			"billing.balanceDaysLong": "约可撑",
			"billing.balanceDaysUnit": "天",
			"billing.popTodayModel": "主力消耗模型余额",
			"billing.popNoConsumption": "暂无消耗",
			"billing.popQuotaAlert": "额度提醒",
			"billing.popRiskNone": "余额与配额正常",
			"billing.popTitle": "用量与预测",
			"billing.popDirectLead": "直联",
			"billing.popSubLead": "订阅",
			"billing.popBalanceNormal": "余额正常",
			"billing.popBalanceLow": "余额不足",
			"billing.popQuotaNormal": "配额正常",
			"billing.popQuotaLow": "配额将尽",
			"billing.alertBalanceLow": "{name} 余额不足",
			"billing.alertQuotaLow": "{name} 配额将尽",
			"billing.panelRelay": "中转站分布",
			"billing.relaySite": "中转站",
			"billing.relayDirect": "直连",
			"billing.relayUnknown": "未知路由",
			"billing.panelRelayQuota": "中转站额度",
			"billing.relayBalance": "余额",
			"billing.relayNoQuota": "未读出额度",
			"billing.relayWindowUsed": "已用",
			"billing.relayKindNewApi": "New API",
			"billing.relayKindSub2Api": "Sub2API",
			"billing.relayKindUnknown": "未识别",
			"billing.relayCalls": "调用"
		};
		const en = {
			"billing.title": "Usage",
			"billing.subtitle": "Billing dashboard",
			"billing.cost": "Cost",
			"billing.todayCost": "Today",
			"billing.monthCost": "This month",
			"billing.yearCost": "This year",
			"billing.monthProjected": "Projected",
			"billing.liveTurn": "Turn",
			"billing.liveSession": "Session",
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
			"billing.budgetTierBody": "This month {cost} reached {pct}% of the budget {budget}",
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
			"billing.pricingTip": "DeepSeek models: from 2026-08-23 (Sun) 00:00 Beijing, weekdays peak 9-12 / 14-18 (×2), weekends (Sat/Sun) all-day off-peak; cells show peak/off-peak price, billed at call time.",
			"billing.balance": "Balance",
			"billing.balanceUnconfigured": "Not set",
			"billing.balanceUnauthorized": "Bad key",
			"billing.balanceUnreachable": "Unavailable",
			"billing.uncatalogued": "Not catalogued",
			"billing.estimatedPricing": "Estimated",
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
			"billing.subscriptionExhausted": "Exhausted",
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
			"billing.costAbbr": "cost",
			"billing.tabOverview": "Overview",
			"billing.tabTrends": "Trends",
			"billing.tabProviders": "Details",
			"billing.tabDetails": "Stats",
			"billing.tabPricing": "Rates",
			"billing.tabSettings": "Settings",
			"billing.settingsHead": "Preferences",
			"billing.settingsHint": "Manage billing-related preferences",
			"billing.budgetHint": "Set a monthly cap for projections and tier alerts",
			"billing.peakAlertHint": "Alert before a tier switch, optionally via system notification",
			"billing.peakAlertDescPeak": "Peak pricing active — non-urgent calls can wait",
			"billing.peakAlertDescOff": "Off-peak savings window is on",
			"billing.export": "Export",
			"billing.exportCsvDay": "Daily CSV",
			"billing.exportCsvSession": "Sessions CSV",
			"billing.exportJson": "Full JSON",
			"billing.peakShare": "Peak vs off-peak",
			"billing.peakShareHint": "last {count} turns",
			"billing.weekCost": "This week",
			"billing.roleCost": "Cost breakdown",
			"billing.roleUser": "User input",
			"billing.roleAssistant": "Assistant output",
			"billing.roleTool": "Tool results",
			"billing.roleHint": "Estimated: output priced exactly, input split by message size",
			"billing.tierPeak": "Peak",
			"billing.tierOff": "Off-peak",
			"billing.tierToPeak": "until peak",
			"billing.tierToOff": "until off-peak",
			"billing.tierAlertEnterPeak": "Peak pricing (2x) starts in {minutes} min — non-urgent calls can wait",
			"billing.tierAlertEnterOff": "Off-peak pricing (50% off) starts in {minutes} min",
			"billing.peakAlertTitlePeak": "Peak pricing incoming",
			"billing.peakAlertTitleOff": "Off-peak incoming",
			"billing.peakAlert": "Peak/off-peak alert",
			"billing.peakAlertLeadMin": "Lead time (min)",
			"billing.peakAlertPosCorner": "Bottom-right",
			"billing.peakAlertPosCenter": "Center",
			"billing.peakAlertModePeak": "Entering peak only",
			"billing.peakAlertModeOff": "Entering off-peak only",
			"billing.peakAlertModeBoth": "Both",
			"billing.peakAlertWebNotify": "Also send system notification",
			"billing.peakAlertPreview": "Preview alert",
			"billing.planTypeCode": "Subscription",
			"billing.planTypeToken": "Usage",
			"billing.subscriptionFeePerMonth": "{amount}/mo",
			"billing.triggerToday": "Today",
			"billing.triggerMonth": "This month",
			"billing.subscriptionIncluded": "Included",
			"billing.free": "Free",
			"billing.official": "Official",
			"billing.thirdParty": "Third-party",
			"billing.officialCost": "Official cost",
			"billing.thirdPartyCost": "Third-party cost",
			"billing.perfSamples": "Samples",
			"billing.perfTtft": "TTFT",
			"billing.perfP50": "P50",
			"billing.perfP90": "P90",
			"billing.perfTps": "Speed",
			"billing.perfLatency": "Total latency",
			"billing.perfEstimated": "Estimated",
			"billing.perfEmpty": "No performance data yet",
			"billing.perfTpsUnit": "tok/s",
			"billing.perfTitle": "Performance",
			"billing.perfHint": "Per model & per hour; estimated samples are tool-continuation steps",
			"billing.heatmapYear": "Year",
			"billing.heatmapMonth": "Month",
			"billing.activeDays": "Active days",
			"billing.streakDays": "Streak",
			"billing.subscriptionAutoDetect": "Auto",
			"billing.pluginInfo": "Plugin info",
			"billing.pluginName": "Name",
			"billing.pluginDescription": "Description",
			"billing.pluginVersion": "Version",
			"billing.pluginAuthor": "Author",
			"billing.pluginRepository": "Repository",
			"billing.pluginNpm": "npm",
			"billing.pluginLicense": "License",
			"billing.tabToken": "Usage",
			"billing.tokenExport": "Export tokens",
			"billing.tokenExportCsv": "Daily token CSV",
			"billing.tokenCacheHitRate": "Cache hit rate",
			"billing.tokenReasoningShare": "Reasoning share",
			"billing.tokenReasoningShort": "reasoning",
			"billing.tokenIo": "In/out ratio",
			"billing.tokenPeak": "Peak day",
			"billing.tokenDaily": "Daily tokens",
			"billing.tokenByModel": "Tokens by model",
			"billing.tokenMiss": "Uncached input",
			"billing.tokenHit": "Cache hit",
			"billing.tokenOutput": "Output",
			"billing.tokenTotal": "Total tokens",
			"billing.tokenShare": "Share",
			"billing.usageStatsTool": "Inject usage-stats tool",
			"billing.usageStatsToolHint": "Lets the model query usage/cost inside a conversation; it consumes context per request, so keep it off for coding (takes effect after a reload)",
			"billing.balanceGranted": "Granted",
			"billing.balanceTopped": "Topped up",
			"billing.balanceDaily": "Daily burn",
			"billing.balanceDaysLong": "~days left",
			"billing.balanceDaysUnit": "days",
			"billing.popTodayModel": "Main model balance",
			"billing.popNoConsumption": "No usage yet",
			"billing.popQuotaAlert": "Quota alerts",
			"billing.popRiskNone": "Balances & quotas OK",
			"billing.popTitle": "Usage & forecast",
			"billing.popDirectLead": "Direct",
			"billing.popSubLead": "Subscription",
			"billing.popBalanceNormal": "balance ok",
			"billing.popBalanceLow": "balance low",
			"billing.popQuotaNormal": "quota ok",
			"billing.popQuotaLow": "quota low",
			"billing.alertBalanceLow": "{name} balance low",
			"billing.alertQuotaLow": "{name} quota low",
			"billing.panelRelay": "Relay sites",
			"billing.relaySite": "Relay",
			"billing.relayDirect": "Direct",
			"billing.relayUnknown": "Unknown route",
			"billing.panelRelayQuota": "Relay quota",
			"billing.relayBalance": "Balance",
			"billing.relayNoQuota": "No quota",
			"billing.relayWindowUsed": "used",
			"billing.relayKindNewApi": "New API",
			"billing.relayKindSub2Api": "Sub2API",
			"billing.relayKindUnknown": "Unknown",
			"billing.relayCalls": "calls"
		};
		//#endregion
		//#region src/client/provider-display.ts
		/** 中文厂商显示名 → 英文显示名；未收录的中文名不在表内，原样返回。 */
		const PROVIDER_NAMES_EN = {
			"智谱 AI": "Zhipu AI",
			"阿里通义": "Alibaba Qwen",
			"字节豆包": "ByteDance Doubao",
			"月之暗面": "Moonshot AI",
			"小米": "Xiaomi",
			"百度文心": "Baidu ERNIE",
			"腾讯混元": "Tencent Hunyuan",
			"零一万物": "01.AI",
			"阶跃星辰": "StepFun",
			"科大讯飞": "iFlytek Spark",
			"商汤": "SenseNova",
			"百川智能": "Baichuan",
			"小米 Token Plan（海外）": "Xiaomi Token Plan (Global)",
			"小米 Token Plan（国内）": "Xiaomi Token Plan (CN)",
			"小米 Token Plan（新加坡）": "Xiaomi Token Plan (SG)",
			"火山引擎 Token Plan": "Volcengine Token Plan",
			"火山方舟 Token Plan": "Volcengine Ark Token Plan",
			"豆包 Token Plan": "Doubao Token Plan",
			"百度文心 Plan": "Baidu ERNIE Plan",
			"MiniMax Token Plan（国内）": "MiniMax Token Plan (CN)"
		};
		/**
		* 把厂商显示名按界面语言本地化：中文名映射成英文，其余（已是英文 / 未收录 /
		* 未知）原样返回。仅在渲染层调用，不影响数据层的中文 key 匹配。
		* @param name - 数据层返回的厂商显示名（多为中文）。
		* @param lang - 当前界面语言（跟随币种）。
		* @returns 本地化后的显示名。
		*/
		function localizeProviderName(name, lang) {
			if (lang === "en") return PROVIDER_NAMES_EN[name] ?? name;
			return name;
		}
		//#endregion
		//#region src/client/peak-alert.ts
		/**
		* 峰谷切换提醒（增强版）纯逻辑：偏好持久化 + 切档前命中判定。
		*
		* 参照 dsh-cost-meter 的 peak/off-peak 提醒：在距下次「进入峰时 / 进入平价」
		* 不足提前量时，弹可视化色条浮层 + 可选的系统通知。偏好经 localStorage 持久化
		* （默认关闭，用户到面板设置开启）；「同一切换点只提醒一次」由 budget store 的
		* `lastTierSwitchAt` 承担（与原系统通知共用一份去重，避免一条切换提醒弹两次）。
		*/
		/** 配置持久化 key。 */
		const PEAK_ALERT_KEY = "dsh-billing-peak-alert-v1";
		/** 默认配置：关、2 分钟提前、右下角、开系统通知、峰与谷都提醒。 */
		const DEFAULT_PEAK_ALERT_CONFIG = {
			enabled: false,
			leadMin: 2,
			position: "bottom-right",
			webNotify: true,
			mode: "both"
		};
		/** 读取本地偏好（缺失/损坏回退默认，字段宽松校验）。 */
		function loadPeakAlertConfig() {
			try {
				const raw = localStorage.getItem(PEAK_ALERT_KEY);
				if (raw === null) return { ...DEFAULT_PEAK_ALERT_CONFIG };
				const parsed = JSON.parse(raw);
				const mode = parsed.mode === "peak" || parsed.mode === "offPeak" ? parsed.mode : DEFAULT_PEAK_ALERT_CONFIG.mode;
				const position = parsed.position === "center" ? "center" : "bottom-right";
				return {
					enabled: parsed.enabled === true,
					leadMin: typeof parsed.leadMin === "number" && Number.isFinite(parsed.leadMin) ? Math.min(30, Math.max(1, Math.round(parsed.leadMin))) : DEFAULT_PEAK_ALERT_CONFIG.leadMin,
					position,
					webNotify: parsed.webNotify !== false,
					mode
				};
			} catch {
				return { ...DEFAULT_PEAK_ALERT_CONFIG };
			}
		}
		/** 保存偏好；存储失败静默（降级为关闭，不影响其它能力）。 */
		function savePeakAlertConfig(config) {
			try {
				localStorage.setItem(PEAK_ALERT_KEY, JSON.stringify(config));
			} catch {}
		}
		/**
		* 计算是否需要提醒：已启用、距切换不足提前量、按模式过滤、且该切换点未提醒过。
		* 导出供测试：纯函数。
		* @param nowMs - 当前时刻（epoch 毫秒）。
		* @param config - 峰谷提醒偏好。
		* @param lastAlertedAt - 上次提醒过的切换点时刻（budget store 的 lastTierSwitchAt）；同点跳过。
		* @returns 命中（含即将进入的档位与切换时刻），否则 null。
		*/
		function computePeakAlert(nowMs, config, lastAlertedAt) {
			if (!config.enabled) return null;
			const upcoming = upcomingTierSwitch(nowMs, config.leadMin * 6e4);
			if (upcoming === null) return null;
			if (config.mode === "peak" && upcoming.entering !== "peak") return null;
			if (config.mode === "offPeak" && upcoming.entering !== "offPeak") return null;
			if (upcoming.atMs === lastAlertedAt) return null;
			return upcoming;
		}
		//#endregion
		//#region src/client/PeakAlertBanner.tsx
		/**
		* 峰谷切换提醒浮层：切档前状态条（右下角或居中）。用 `position: fixed` 即可在
		* 任意宿主容器内覆盖整个视口，因此不需要 portal。布局为「档位徽标 + 大号等宽
		* 倒计时 + 一句说明 + 关闭」，克制冷调、无重力阴影。渲染是受控的：父组件把命中
		* （hit）与偏好传入，显示剩余分钟并在切换后消失。
		*/
		/** 渲染一个切档前提醒状态条。 */
		function PeakAlertBanner({ hit, config, t, onDismiss }) {
			const [nowMs, setNowMs] = (0, react.useState)(() => Date.now());
			(0, react.useEffect)(() => {
				const timer = setInterval(() => setNowMs(Date.now()), 1e3);
				return () => clearInterval(timer);
			}, []);
			if (nowMs >= hit.atMs) return null;
			const minutes = Math.max(1, Math.round((hit.atMs - nowMs) / 6e4));
			const entering = hit.entering;
			const tag = entering === "peak" ? t("billing.tierPeak") : t("billing.tierOff");
			const desc = entering === "peak" ? t("billing.peakAlertDescPeak") : t("billing.peakAlertDescOff");
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: clsx(UsageBilling_module_css_default.peakAlert, entering === "peak" ? UsageBilling_module_css_default.peakAlertPeak : UsageBilling_module_css_default.peakAlertOff, config.position === "center" ? UsageBilling_module_css_default.peakAlertCenter : UsageBilling_module_css_default.peakAlertCorner),
				"data-testid": "billing-peak-alert",
				role: "alert",
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: UsageBilling_module_css_default.peakAlertTag,
						children: tag
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
						className: UsageBilling_module_css_default.peakAlertCountdown,
						children: [minutes, "m"]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: UsageBilling_module_css_default.peakAlertText,
						children: desc
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
						type: "button",
						className: UsageBilling_module_css_default.peakAlertClose,
						onClick: onDismiss,
						"aria-label": t("billing.close"),
						children: "×"
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
		/** 会话明细面板最多展示的行数（完整长尾在服务端另有一层封顶）。 */
		const SESSION_DISPLAY_LIMIT = 20;
		/**
		* Tab 定义（顺序即渲染顺序）：概览=主数字/KPI/热力图，趋势=趋势图/每轮费用，
		* 明细=厂商计费与订阅，统计=工作区/会话明细，费率=模型单价表，设置=预算与峰谷提醒。
		* 导出供测试断言 tab 与文案 key 对齐、decor 锚点落在正确分区。
		*/
		const DASHBOARD_TABS = [
			{
				id: "overview",
				labelKey: "billing.tabOverview"
			},
			{
				id: "token",
				labelKey: "billing.tabToken"
			},
			{
				id: "trends",
				labelKey: "billing.tabTrends"
			},
			{
				id: "providers",
				labelKey: "billing.tabProviders"
			},
			{
				id: "pricing",
				labelKey: "billing.tabPricing"
			},
			{
				id: "settings",
				labelKey: "billing.tabSettings"
			}
		];
		/** 项目名取 cwd 的末级目录；无 cwd 时由调用方回退为 em dash。 */
		function projectName(cwd) {
			if (cwd === void 0) return void 0;
			return cwd.split(/[\\/]/).filter(Boolean).pop() ?? cwd;
		}
		/** 预算提醒档位（百分比）：跨档时桌面通知，每档每天最多一次。 */
		const BUDGET_ALERT_TIERS = [
			50,
			80,
			100
		];
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
			"minimax-token-plan": "MiniMax",
			"minimax-token-plan-cn": "MiniMax",
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
		/**
		* 本月预计总花费：按本月已有记录的平均日消耗 × 本月天数外推；无本月记录时
		* 回退为最近 7 天日均 × 本月天数；无任何记录时返回 0（调用方不展示）。
		* 导出供测试：纯函数，不依赖组件。
		* @param byDay - 按日费用表。
		* @param monthPrefix - 本月前缀（YYYY-MM）。
		* @param today - 今日日期戳（YYYY-MM-DD）。
		* @returns 本月预计花费（人民币元）；无数据时为 0。
		*/
		function projectMonthCost(byDay, monthPrefix, today) {
			const dates = Object.keys(byDay).filter((d) => d.startsWith(monthPrefix));
			const monthLen = new Date((/* @__PURE__ */ new Date()).getFullYear(), (/* @__PURE__ */ new Date()).getMonth() + 1, 0).getDate();
			const avg = dates.length > 0 ? dates.reduce((sum, d) => sum + (byDay[d]?.cost ?? 0), 0) / dates.length : dailyBurnRate(byDay, today);
			if (avg <= 0) return 0;
			return avg * monthLen;
		}
		/**
		* 峰谷时段费用分摊：按每轮的起始时刻（北京时间高峰 9-12 / 14-18）把费用
		* 归入高峰 / 空闲两档。导出供测试：纯函数。
		* @param turns - 每轮费用行（需带 startedAt 与 cost）。
		* @returns 两档费用合计（人民币元）。
		*/
		function peakOffpeakCost(turns) {
			let peak = 0;
			let offPeak = 0;
			for (const turn of turns) if (tierAt(turn.startedAt) === "peak") peak += turn.cost;
			else offPeak += turn.cost;
			return {
				peak,
				offPeak
			};
		}
		/** 近 7 天费用序列（含今天，缺日补 0）：触发卡 hover 速览的迷你柱数据源。
		* 导出供测试：纯函数（日期取本地时区）。 */
		function activeDaysOf(byDay) {
			return Object.keys(byDay).length;
		}
		/** 连续使用天数：从今天往前连续「有调用记录」的天数；今天无记录则为 0。
		* 导出供测试：纯函数（日期取本地时区）。 */
		function streakDaysOf(byDay, now = Date.now()) {
			let streak = 0;
			const cursor = new Date(now);
			for (;;) {
				if (!(localDayStamp(cursor.getTime()) in byDay)) break;
				streak += 1;
				cursor.setDate(cursor.getDate() - 1);
			}
			return streak;
		}
		/**
		* 近 7 天费用序列（含今天，缺日补 0）：触发卡 hover 速览的迷你柱数据源。
		* 导出供测试：纯函数（日期取本地时区）。
		* @param byDay - 按日费用表。
		* @returns 7 个 `{ date, cost }`，最旧在前。
		*/
		function lastSevenDays(byDay) {
			const out = [];
			for (let offset = 6; offset >= 0; offset -= 1) {
				const day = /* @__PURE__ */ new Date();
				day.setDate(day.getDate() - offset);
				const stamp = localDayStamp(day.getTime());
				out.push({
					date: stamp,
					cost: byDay[stamp]?.cost ?? 0
				});
			}
			return out;
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
		/** 由 bySite 的 key 解析站点行显示名与类别。 */
		function siteBucketLabel(key, t) {
			if (key.startsWith("site:")) return {
				name: key.slice(5),
				kind: "site"
			};
			if (key.startsWith("direct:")) return {
				name: key.slice(7),
				kind: "direct"
			};
			return {
				name: t("billing.relayUnknown"),
				kind: "unknown"
			};
		}
		/** 站点类别的文案（中转站 / 直连 / 未知路由）。 */
		function siteKindText(kind, t) {
			switch (kind) {
				case "site": return t("billing.relaySite");
				case "direct": return t("billing.relayDirect");
				default: return t("billing.relayUnknown");
			}
		}
		/** 中转站程序类型的徽标文案（New API / Sub2API / 未识别）。 */
		function relayKindText(kind, t) {
			switch (kind) {
				case "new-api": return t("billing.relayKindNewApi");
				case "sub2api": return t("billing.relayKindSub2Api");
				default: return t("billing.relayKindUnknown");
			}
		}
		/** 站点类别对应的样式类（bySite 桶与中转站额度徽标共用配色）。 */
		const SITE_KIND_CLASS = {
			site: UsageBilling_module_css_default.siteKindSite,
			direct: UsageBilling_module_css_default.siteKindDirect,
			unknown: UsageBilling_module_css_default.siteKindUnknown
		};
		/** 中转站程序类型对应的样式类（复用站点类别配色）。 */
		const RELAY_KIND_CLASS = {
			"new-api": UsageBilling_module_css_default.siteKindSite,
			sub2api: UsageBilling_module_css_default.siteKindDirect,
			unknown: UsageBilling_module_css_default.siteKindUnknown
		};
		/** Path to the usage-stats endpoint served by this plugin's node half. */
		const USAGE_STATS_PATH$1 = "/api/billing/usage-stats";
		/** Path to the live-pricing endpoint served by this plugin's node half. */
		const PRICING_PATH = "/api/billing/pricing";
		/** Path to the account-balance endpoint served by this plugin's node half. */
		const BALANCE_PATH = "/api/billing/balance";
		/** Path to the subscription-plan quota endpoint served by this plugin's node half. */
		const SUBSCRIPTIONS_PATH$1 = "/api/billing/subscriptions";
		/** Path to the relay-site quota endpoint served by this plugin's node half. */
		const RELAY_PATH = "/api/billing/relay-quotas";
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
				cost: 0,
				reasoning: 0
			},
			byModel: {},
			byDay: {},
			byDayModels: {}
		};
		/** Try to load stats from the server; returns null when no valid JSON stats are served. */
		async function loadUsageStats() {
			try {
				const response = await fetch(USAGE_STATS_PATH$1);
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
					...Array.isArray(candidate.byWorkspace) ? { byWorkspace: candidate.byWorkspace } : {},
					...candidate.byRole !== null && typeof candidate.byRole === "object" ? { byRole: candidate.byRole } : {},
					...candidate.perf !== null && typeof candidate.perf === "object" && candidate.perf.byModel !== null && typeof candidate.perf.byModel === "object" && candidate.perf.byHour !== null && typeof candidate.perf.byHour === "object" ? { perf: candidate.perf } : {},
					...typeof candidate.pluginVersion === "string" ? { pluginVersion: candidate.pluginVersion } : {}
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
				const response = await fetch(SUBSCRIPTIONS_PATH$1);
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
		* 拉取中转站额度（New API / Sub2API 的余额与滚动窗口）；失败返回空列表。
		* @returns the relay-site quota rows, or an empty list on any failure.
		*/
		async function fetchRelayQuotas() {
			try {
				const response = await fetch(RELAY_PATH);
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
		* 读取 usage_stats 工具开关当前值（插件自带接口，不依赖宿主浏览器设置白名单）。
		* @returns 当前是否注入；读取失败（服务未起/非 JSON）返回 undefined。
		*/
		async function loadUsageTool() {
			try {
				const response = await fetch("/api/billing/usage-tool");
				if (!response.ok) return void 0;
				const parsed = JSON.parse(await response.text());
				return typeof parsed.enabled === "boolean" ? parsed.enabled : void 0;
			} catch {
				return;
			}
		}
		/**
		* 写 usage_stats 工具开关（插件自带接口）。工具注入是启动期决策，重启应用后生效。
		* @param enabled - 是否注入。
		* @returns 是否写成功。
		*/
		async function saveUsageTool(enabled) {
			try {
				const response = await fetch("/api/billing/usage-tool", {
					method: "POST",
					headers: { "content-type": "application/json" },
					body: JSON.stringify({ enabled })
				});
				if (!response.ok) return false;
				return JSON.parse(await response.text()).ok === true;
			} catch {
				return false;
			}
		}
		/**
		* Sidebar footer trigger: compact pill in wide mode, icon in rail mode.
		* ZINE 模式下入口由主题插件的贴纸层承担，本触发器由 CSS
		* （body[data-zine-mode] 选择器）隐藏，组件本身无 zine 分支。
		* @param props - framework props plus `wide` column state.
		*/
		function UsageBillingTrigger(props) {
			const { wide, t, onOpen, monthCost, todayCost, weekCost, days, vendorStatus, dash } = props;
			const cardIcon = /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("svg", {
				viewBox: "0 0 24 24",
				fill: "none",
				stroke: "currentColor",
				"aria-hidden": "true",
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M4 7h16v11H4z" }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M4 10h16" }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M8 14h3" })
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
			const sparkMax = Math.max(...days.map((d) => d.cost), 0);
			const sparkHeights = days.map((d) => sparkMax > 0 ? 4 + d.cost / sparkMax * 12 : 4);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
				className: UsageBilling_module_css_default.triggerWrap,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
					type: "button",
					className: UsageBilling_module_css_default.trigger,
					"data-testid": "billing-trigger",
					onClick: onOpen,
					title: `${t("billing.title")} · ${formatMoney(monthCost)}`,
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: UsageBilling_module_css_default.triggerIcon,
							"data-testid": "billing-trigger-icon",
							children: cardIcon
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
							className: UsageBilling_module_css_default.triggerBody,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
								className: UsageBilling_module_css_default.triggerRow,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: UsageBilling_module_css_default.triggerMeta,
									children: t("billing.triggerMonth")
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: UsageBilling_module_css_default.triggerAmount,
									children: formatMoney(monthCost)
								})]
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
								className: UsageBilling_module_css_default.triggerSub,
								"data-testid": "billing-trigger-today",
								children: [
									t("billing.triggerToday"),
									" ",
									formatMoney(todayCost),
									" · ",
									weekCost > 0 ? `${t("billing.weekCost")} ${formatMoney(weekCost)}` : ""
								]
							})]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: UsageBilling_module_css_default.triggerSpark,
							"data-testid": "billing-trigger-spark",
							"aria-hidden": "true",
							children: sparkHeights.map((h, index) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: index === sparkHeights.length - 1 ? UsageBilling_module_css_default.triggerSparkHot : UsageBilling_module_css_default.triggerSparkBar,
								style: { height: `${h}px` }
							}, days[index]?.date ?? String(index)))
						})
					]
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
					className: UsageBilling_module_css_default.triggerPop,
					"data-testid": "billing-trigger-pop",
					"aria-hidden": "true",
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
						className: UsageBilling_module_css_default.triggerPopMetrics,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
								className: UsageBilling_module_css_default.triggerPopMetric,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: UsageBilling_module_css_default.triggerPopMetricLabel,
									children: t("billing.monthCost")
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: clsx(UsageBilling_module_css_default.triggerPopMetricValue, UsageBilling_module_css_default.triggerPopMetricHighlight),
									children: formatMoney(monthCost)
								})]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
								className: UsageBilling_module_css_default.triggerPopMetric,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: UsageBilling_module_css_default.triggerPopMetricLabel,
									children: t("billing.tokenTotal")
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: UsageBilling_module_css_default.triggerPopMetricValue,
									children: formatTokens(dash.totalToken)
								})]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
								className: UsageBilling_module_css_default.triggerPopMetric,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: UsageBilling_module_css_default.triggerPopMetricLabel,
									children: t("billing.input")
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: UsageBilling_module_css_default.triggerPopMetricValue,
									children: formatTokens(dash.input)
								})]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
								className: UsageBilling_module_css_default.triggerPopMetric,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: UsageBilling_module_css_default.triggerPopMetricLabel,
									children: t("billing.output")
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: UsageBilling_module_css_default.triggerPopMetricValue,
									children: formatTokens(dash.output)
								})]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
								className: UsageBilling_module_css_default.triggerPopMetric,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: UsageBilling_module_css_default.triggerPopMetricLabel,
									children: t("billing.cacheHit")
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: UsageBilling_module_css_default.triggerPopMetricValue,
									children: formatTokens(dash.cacheRead)
								})]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
								className: UsageBilling_module_css_default.triggerPopMetric,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: UsageBilling_module_css_default.triggerPopMetricLabel,
									children: t("billing.calls")
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: UsageBilling_module_css_default.triggerPopMetricValue,
									children: dash.calls.toLocaleString()
								})]
							})
						]
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
						className: UsageBilling_module_css_default.triggerPopFoot,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: UsageBilling_module_css_default.triggerPopFootTitle,
							children: t("billing.popTodayModel")
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
							className: UsageBilling_module_css_default.triggerPopFootNotes,
							children: [
								vendorStatus.direct !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
									className: UsageBilling_module_css_default.triggerPopFootNote,
									children: [
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: clsx(UsageBilling_module_css_default.triggerPopBadge, UsageBilling_module_css_default.triggerPopBadgeDirect),
											children: t("billing.popDirectLead")
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: UsageBilling_module_css_default.triggerPopFootName,
											children: vendorStatus.direct.name
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: clsx(UsageBilling_module_css_default.triggerPopFootStatus, vendorStatus.direct.low && UsageBilling_module_css_default.triggerPopFootStatusLow),
											children: vendorStatus.direct.text
										})
									]
								}),
								vendorStatus.sub !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
									className: UsageBilling_module_css_default.triggerPopFootNote,
									children: [
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: clsx(UsageBilling_module_css_default.triggerPopBadge, UsageBilling_module_css_default.triggerPopBadgeSub),
											children: t("billing.popSubLead")
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: UsageBilling_module_css_default.triggerPopFootName,
											children: vendorStatus.sub.name
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: clsx(UsageBilling_module_css_default.triggerPopFootStatus, vendorStatus.sub.low && UsageBilling_module_css_default.triggerPopFootStatusLow),
											children: vendorStatus.sub.text
										})
									]
								}),
								vendorStatus.direct === void 0 && vendorStatus.sub === void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: UsageBilling_module_css_default.triggerPopFootNote,
									children: t("billing.popNoConsumption")
								})
							]
						})]
					})]
				})]
			});
		}
		/**
		* The centered billing dashboard modal.
		* @param props - stats, locale function, close handler, model health, balances, renderSlot.
		*/
		/** 余额详情弹窗：点击「约可撑 N 天」圆圈后展示余额构成与可用天数估算。 */
		function BalanceDetailPopover({ balance, days, dailyBurn, money, t, onClose }) {
			const fmt = (value) => value === void 0 ? void 0 : balance.currency === "USD" ? `$${value.toFixed(2)}` : money(value);
			const total = fmt(balance.totalBalance);
			const granted = fmt(balance.grantedBalance);
			const topped = fmt(balance.toppedUpBalance);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
				className: UsageBilling_module_css_default.balanceDetailPop,
				"data-testid": "billing-balance-detail-pop",
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
					className: UsageBilling_module_css_default.balanceDetailHead,
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: UsageBilling_module_css_default.balanceDetailTitle,
						children: balance.displayName
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
						type: "button",
						className: UsageBilling_module_css_default.balanceDetailClose,
						"aria-label": t("billing.close"),
						onClick: onClose,
						children: "×"
					})]
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
					className: UsageBilling_module_css_default.balanceDetailGrid,
					children: [
						total !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(BalanceDetailRow, {
							label: t("billing.balance"),
							value: total
						}),
						granted !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(BalanceDetailRow, {
							label: t("billing.balanceGranted"),
							value: granted
						}),
						topped !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(BalanceDetailRow, {
							label: t("billing.balanceTopped"),
							value: topped
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(BalanceDetailRow, {
							label: t("billing.balanceDaily"),
							value: money(dailyBurn)
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(BalanceDetailRow, {
							label: t("billing.balanceDaysLong"),
							value: `${days} ${t("billing.balanceDaysUnit")}`
						})
					]
				})]
			});
		}
		/** 余额详情弹窗里的一行 label / value。 */
		function BalanceDetailRow({ label, value }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
				className: UsageBilling_module_css_default.balanceDetailRow,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					className: UsageBilling_module_css_default.balanceDetailLabel,
					children: label
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					className: UsageBilling_module_css_default.balanceDetailValue,
					children: value
				})]
			});
		}
		function BillingDashboard({ stats, t, onClose, health, balances, quotas, relayQuotas, currency, onCurrency, turns, renderSlot, budgetEnabled, budgetAmount, onToggleBudget, onBudgetAmount, peakConfig, onPeakConfig, onPreviewPeak }) {
			const { total, byModel, byDay } = stats;
			const [tab, setTab] = (0, react.useState)("overview");
			const [trendDays, setTrendDays] = (0, react.useState)(7);
			const [balanceDetailFor, setBalanceDetailFor] = (0, react.useState)();
			const [usageStatsEnabled, setUsageStatsEnabled] = (0, react.useState)(false);
			(0, react.useEffect)(() => {
				let mounted = true;
				loadUsageTool().then((enabled) => {
					if (mounted && enabled !== void 0) setUsageStatsEnabled(enabled);
				});
				return () => {
					mounted = false;
				};
			}, []);
			const toggleUsageStats = (0, react.useCallback)(() => {
				const next = !usageStatsEnabled;
				setUsageStatsEnabled(next);
				saveUsageTool(next).then((ok) => {
					if (!ok) setUsageStatsEnabled(!next);
				});
			}, [usageStatsEnabled]);
			const rateInfo = getRateInfo();
			const money = (cny) => formatMoney(currency === "usd" ? cnyToUsd(cny) : cny, currency);
			const lang = currency === "usd" ? "en" : "zh";
			const providerName = (name) => localizeProviderName(name, lang);
			const unitMoney = (price, native) => price === 0 ? t("billing.free") : formatUnitPrice(convertUnitPrice(price, native, currency, rateInfo.rate), currency === "usd" ? "USD" : "CNY");
			const roundFlags = (0, react.useMemo)(() => flagAnomalies([...turns].reverse()), [turns]);
			const peakShare = (0, react.useMemo)(() => peakOffpeakCost(turns), [turns]);
			const roleRows = (0, react.useMemo)(() => {
				const role = stats.byRole;
				if (role === void 0) return [];
				const total = role.user + role.assistant + role.tool;
				if (total <= 0) return [];
				return [
					{
						label: t("billing.roleUser"),
						value: role.user,
						seg: UsageBilling_module_css_default.shareSegUser
					},
					{
						label: t("billing.roleAssistant"),
						value: role.assistant,
						seg: UsageBilling_module_css_default.shareSegAssistant
					},
					{
						label: t("billing.roleTool"),
						value: role.tool,
						seg: UsageBilling_module_css_default.shareSegTool
					}
				].map((row) => ({
					...row,
					pct: row.value / total * 100
				}));
			}, [stats.byRole, t]);
			const dailyBurn = dailyBurnRate(byDay, localDayStamp());
			const balanceFor = (provider) => balances.find((balance) => normalizeProvider(balance.provider) === normalizeProvider(provider));
			const hideBalanceForGroup = (group) => group.balance?.error === "unconfigured" && group.models.length > 0 && group.models.every((model) => model.plan);
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
				const days = dailyBurn > 0 ? Math.floor(balanceCny / dailyBurn) : void 0;
				return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
					className: UsageBilling_module_css_default.balanceCell,
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: amount }),
						days !== void 0 && days >= 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							className: clsx(UsageBilling_module_css_default.balanceDaysBadge, days <= 3 && UsageBilling_module_css_default.balanceDaysBadgeLow),
							"data-testid": "billing-balance-days-badge",
							title: t("billing.balanceDays").replace("{days}", String(days)),
							"aria-label": `${balance.displayName} ${t("billing.balanceDays").replace("{days}", String(days))}`,
							onClick: () => {
								setBalanceDetailFor(balanceDetailFor === balance.provider ? void 0 : balance.provider);
							},
							children: "?"
						}),
						balanceDetailFor === balance.provider && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(BalanceDetailPopover, {
							balance,
							days: days ?? 0,
							dailyBurn,
							money,
							t,
							onClose: () => {
								setBalanceDetailFor(void 0);
							}
						})
					]
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
			const monthCostProjected = (0, react.useMemo)(() => {
				return projectMonthCost(byDay, monthPrefix, today) + quotas.reduce((sum, quota) => sum + (quota.planType === "code" ? quota.subscriptionAmount ?? 0 : 0), 0);
			}, [
				byDay,
				monthPrefix,
				today,
				quotas
			]);
			const heroGauge = (0, react.useMemo)(() => {
				const budgetPct = budgetEnabled && budgetAmount > 0 ? monthCost / budgetAmount * 100 : NaN;
				return {
					pct: Number.isFinite(budgetPct) ? Math.max(0, Math.min(100, budgetPct)) : yearCost > 0 ? Math.max(0, Math.min(100, monthCost / yearCost * 100)) : 0,
					over: Number.isFinite(budgetPct) && budgetPct >= 100,
					label: t("billing.budget")
				};
			}, [
				budgetEnabled,
				budgetAmount,
				monthCost,
				yearCost,
				t
			]);
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
			const activeDays = activeDaysOf(byDay);
			const streakDays = streakDaysOf(byDay);
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
					uncatalogued,
					estimatedPricing: entry.estimated === true,
					officialCalls: data.officialCalls ?? 0,
					officialCost: data.officialCost ?? 0
				};
			}).sort((a, b) => (b.actual ?? b.estimated) - (a.actual ?? a.estimated)).map((row, index) => ({
				...row,
				color: CHART_PALETTE[index % CHART_PALETTE.length] ?? "#8b95a3"
			})), [byModel]);
			const bucketSummary = (0, react.useMemo)(() => {
				let officialCost = 0;
				let officialCalls = 0;
				let thirdCalls = 0;
				for (const row of modelRows) {
					const official = row.officialCost;
					if (official > 0) officialCost += official;
					officialCalls += row.officialCalls;
					thirdCalls += Math.max(0, row.calls - row.officialCalls);
				}
				const thirdCost = Math.max(0, modelRows.reduce((sum, r) => sum + (r.actual ?? 0), 0) - officialCost);
				if (officialCost <= 0 && thirdCost <= 0 && officialCalls <= 0 && thirdCalls <= 0) return void 0;
				return {
					officialCost,
					officialCalls,
					thirdCost,
					thirdCalls
				};
			}, [modelRows]);
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
				const groups = [...new Set([...modelsByVendor.keys(), ...subscriptionsByVendor.keys()])].map((name) => ({
					name,
					models: modelsByVendor.get(name) ?? [],
					subscriptions: subscriptionsByVendor.get(name) ?? [],
					balance: balanceFor(name),
					dot: providerDot(health, name)
				}));
				const claimed = new Set(groups.map((group) => normalizeProvider(group.name)));
				for (const balance of balances) {
					if (claimed.has(normalizeProvider(balance.provider))) continue;
					if (balance.error === void 0 || balance.provider.startsWith("custom:")) groups.push({
						name: balance.displayName,
						models: [],
						subscriptions: [],
						balance,
						dot: providerDot(health, balance.displayName)
					});
				}
				return groups.sort((a, b) => {
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
				className: clsx(UsageBilling_module_css_default.dashboardModal, "dsh-billing-modal"),
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: UsageBilling_module_css_default.dashboard,
					"data-testid": "billing-dashboard",
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
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
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("nav", {
							className: UsageBilling_module_css_default.tabNav,
							"data-testid": "billing-tab-nav",
							role: "tablist",
							"aria-label": t("billing.title"),
							children: DASHBOARD_TABS.map((item) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								role: "tab",
								"aria-selected": tab === item.id,
								className: clsx(UsageBilling_module_css_default.tabButton, tab === item.id && UsageBilling_module_css_default.tabButtonActive),
								"data-testid": `billing-tab-${item.id}`,
								onClick: () => {
									setTab(item.id);
								},
								children: t(item.labelKey)
							}, item.id))
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: UsageBilling_module_css_default.dashboardBody,
							children: [
								tab === "overview" && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: UsageBilling_module_css_default.tabPanel,
									"data-testid": "billing-tab-panel-overview",
									children: [
										/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
											className: UsageBilling_module_css_default.hero,
											"data-testid": "billing-hero",
											children: [
												renderSlot("billing.dashboard.decor", { position: "hero" }),
												/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
													className: UsageBilling_module_css_default.heroTop,
													children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
														className: UsageBilling_module_css_default.heroMain,
														children: [
															/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
																className: UsageBilling_module_css_default.heroLabel,
																children: t("billing.monthCost")
															}),
															/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
																className: UsageBilling_module_css_default.heroReadout,
																children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
																	className: UsageBilling_module_css_default.heroCurrency,
																	"aria-hidden": "true",
																	children: currency === "usd" ? "$" : "¥"
																}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
																	className: UsageBilling_module_css_default.heroValue,
																	children: money(monthCost).slice(1)
																})]
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
														className: UsageBilling_module_css_default.heroGauge,
														"data-testid": "billing-hero-gauge",
														children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("svg", {
															className: UsageBilling_module_css_default.heroGaugeSvg,
															viewBox: "0 0 120 120",
															"aria-hidden": "true",
															children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("circle", {
																className: UsageBilling_module_css_default.heroGaugeTrack,
																cx: "60",
																cy: "60",
																r: "52"
															}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("circle", {
																className: clsx(UsageBilling_module_css_default.heroGaugeArc, heroGauge.over && UsageBilling_module_css_default.heroGaugeArcOver),
																cx: "60",
																cy: "60",
																r: "52",
																style: { strokeDasharray: `${heroGauge.pct / 100 * 326.7} 326.7` }
															})]
														}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
															className: UsageBilling_module_css_default.heroGaugeCenter,
															children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
																className: clsx(UsageBilling_module_css_default.heroGaugePct, heroGauge.over && UsageBilling_module_css_default.heroGaugePctOver),
																children: [heroGauge.pct.toFixed(0), "%"]
															}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
																className: UsageBilling_module_css_default.heroGaugeLabel,
																children: heroGauge.label
															})]
														})]
													})]
												}),
												/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
													className: UsageBilling_module_css_default.heroSide,
													children: [
														/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
															className: UsageBilling_module_css_default.heroSideItem,
															children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
																className: UsageBilling_module_css_default.heroSideLabel,
																children: t("billing.yearCost")
															}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
																className: UsageBilling_module_css_default.heroSideValue,
																children: money(yearCost)
															})]
														}),
														/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
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
														}),
														monthCostProjected > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
															className: UsageBilling_module_css_default.heroSideItem,
															children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
																className: UsageBilling_module_css_default.heroSideLabel,
																children: t("billing.monthProjected")
															}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
																className: UsageBilling_module_css_default.heroSideValue,
																children: money(monthCostProjected)
															})]
														}),
														monthCostProjected <= 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
															className: UsageBilling_module_css_default.heroSideSpacer,
															"aria-hidden": "true"
														})
													]
												})
											]
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
											className: UsageBilling_module_css_default.panel,
											"data-testid": "billing-panel-heatmap",
											children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
												className: UsageBilling_module_css_default.panelHead,
												children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h3", {
													className: UsageBilling_module_css_default.panelTitle,
													children: t("billing.heatmap")
												}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
													className: UsageBilling_module_css_default.panelHint,
													"data-testid": "billing-heatmap-summary",
													children: [
														t("billing.activeDays"),
														" ",
														activeDays,
														" · ",
														t("billing.streakDays"),
														" ",
														streakDays
													]
												})]
											}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(UsageHeatmap, {
												days: heatmapDays,
												currency,
												t,
												range: "month"
											})]
										})
									]
								}),
								tab === "settings" && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: UsageBilling_module_css_default.tabPanel,
									"data-testid": "billing-tab-panel-settings",
									children: [
										/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
											className: UsageBilling_module_css_default.settingsHead,
											children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h3", {
												className: UsageBilling_module_css_default.settingsTitle,
												children: t("billing.settingsHead")
											}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
												className: UsageBilling_module_css_default.settingsHint,
												children: t("billing.settingsHint")
											})]
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
											className: UsageBilling_module_css_default.budget,
											"data-testid": "billing-budget",
											children: [
												/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
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
																	"aria-label": `${t("billing.budget")}（${currency === "usd" ? "USD" : "CNY"}）`,
																	title: `${t("billing.budget")}（${currency === "usd" ? "USD" : "CNY"}）`,
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
												}),
												/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
													className: UsageBilling_module_css_default.budgetHint,
													children: t("billing.budgetHint")
												}),
												budgetEnabled && budgetAmount > 0 && (() => {
													const pct = monthCost / budgetAmount * 100;
													return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
														className: UsageBilling_module_css_default.budgetTrack,
														"data-testid": "billing-budget-track",
														children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
															className: clsx(UsageBilling_module_css_default.budgetFill, pct >= 100 && UsageBilling_module_css_default.budgetFillOver, pct >= 80 && pct < 100 && UsageBilling_module_css_default.budgetFillWarn),
															style: { width: `${Math.min(pct, 100)}%` }
														})
													});
												})()
											]
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
											className: UsageBilling_module_css_default.peakAlertPanel,
											"data-testid": "billing-peak-alert-settings",
											children: [
												/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
													className: UsageBilling_module_css_default.peakAlertPanelHead,
													children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
														className: UsageBilling_module_css_default.peakAlertPanelLabel,
														children: t("billing.peakAlert")
													}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
														type: "button",
														role: "switch",
														"aria-checked": peakConfig.enabled,
														"aria-label": t("billing.peakAlert"),
														"data-testid": "billing-peak-alert-toggle",
														className: clsx(UsageBilling_module_css_default.switch, peakConfig.enabled && UsageBilling_module_css_default.switchOn),
														onClick: () => {
															onPeakConfig({
																...peakConfig,
																enabled: !peakConfig.enabled
															});
														},
														children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { className: UsageBilling_module_css_default.switchKnob })
													})]
												}),
												/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
													className: UsageBilling_module_css_default.peakAlertHint,
													children: t("billing.peakAlertHint")
												}),
												peakConfig.enabled && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
													className: UsageBilling_module_css_default.peakAlertPanelBody,
													children: [
														/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
															className: UsageBilling_module_css_default.peakAlertField,
															children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: t("billing.peakAlertLeadMin") }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
																type: "number",
																min: 1,
																max: 30,
																step: 1,
																value: peakConfig.leadMin,
																className: UsageBilling_module_css_default.peakAlertNum,
																"aria-label": t("billing.peakAlertLeadMin"),
																onChange: (e) => {
																	const v = Number(e.target.valueAsNumber);
																	onPeakConfig({
																		...peakConfig,
																		leadMin: Number.isFinite(v) ? Math.min(30, Math.max(1, Math.round(v))) : peakConfig.leadMin
																	});
																}
															})]
														}),
														/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
															className: UsageBilling_module_css_default.peakAlertField,
															children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: t("billing.peakAlertPosCorner") }), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("select", {
																value: peakConfig.position,
																className: UsageBilling_module_css_default.peakAlertSelect,
																onChange: (e) => {
																	onPeakConfig({
																		...peakConfig,
																		position: e.target.value === "center" ? "center" : "bottom-right"
																	});
																},
																children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
																	value: "bottom-right",
																	children: t("billing.peakAlertPosCorner")
																}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
																	value: "center",
																	children: t("billing.peakAlertPosCenter")
																})]
															})]
														}),
														/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
															className: UsageBilling_module_css_default.peakAlertField,
															children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: t("billing.peakAlert") }), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("select", {
																value: peakConfig.mode,
																className: UsageBilling_module_css_default.peakAlertSelect,
																onChange: (e) => {
																	const m = e.target.value;
																	onPeakConfig({
																		...peakConfig,
																		mode: m === "peak" || m === "offPeak" ? m : "both"
																	});
																},
																children: [
																	/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
																		value: "both",
																		children: t("billing.peakAlertModeBoth")
																	}),
																	/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
																		value: "peak",
																		children: t("billing.peakAlertModePeak")
																	}),
																	/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
																		value: "offPeak",
																		children: t("billing.peakAlertModeOff")
																	})
																]
															})]
														}),
														/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
															className: UsageBilling_module_css_default.peakAlertCheck,
															children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
																type: "checkbox",
																checked: peakConfig.webNotify,
																onChange: (e) => {
																	onPeakConfig({
																		...peakConfig,
																		webNotify: e.target.checked
																	});
																}
															}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: t("billing.peakAlertWebNotify") })]
														}),
														/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
															type: "button",
															className: UsageBilling_module_css_default.peakAlertPreview,
															onClick: onPreviewPeak,
															children: t("billing.peakAlertPreview")
														})
													]
												})
											]
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
											className: UsageBilling_module_css_default.budget,
											"data-testid": "billing-usage-stats-tool-setting",
											children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
												className: UsageBilling_module_css_default.budgetHead,
												children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
													className: UsageBilling_module_css_default.budgetLabel,
													children: t("billing.usageStatsTool")
												}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
													className: UsageBilling_module_css_default.budgetControls,
													children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
														type: "button",
														role: "switch",
														"aria-checked": usageStatsEnabled,
														"aria-label": t("billing.usageStatsTool"),
														"data-testid": "billing-usage-stats-tool-toggle",
														className: clsx(UsageBilling_module_css_default.switch, usageStatsEnabled && UsageBilling_module_css_default.switchOn),
														onClick: toggleUsageStats,
														children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { className: UsageBilling_module_css_default.switchKnob })
													})
												})]
											}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
												className: UsageBilling_module_css_default.budgetHint,
												children: t("billing.usageStatsToolHint")
											})]
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)(PluginInfoCard, {
											t,
											version: stats.pluginVersion
										})
									]
								}),
								tab === "trends" && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: UsageBilling_module_css_default.tabPanel,
									"data-testid": "billing-tab-panel-trends",
									children: [
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
										turns.length > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
											className: UsageBilling_module_css_default.panel,
											"data-testid": "billing-panel-rounds",
											children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
												className: UsageBilling_module_css_default.panelHead,
												children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h3", {
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
											}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(RoundCostChart, {
												rounds: turns,
												flags: roundFlags,
												currency,
												t
											})]
										}),
										turns.length > 0 && (() => {
											const shareTotal = peakShare.peak + peakShare.offPeak;
											if (shareTotal <= 0) return null;
											const peakPct = peakShare.peak / shareTotal * 100;
											return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
												className: UsageBilling_module_css_default.panel,
												"data-testid": "billing-panel-share",
												children: [
													/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
														className: UsageBilling_module_css_default.panelHead,
														children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h3", {
															className: UsageBilling_module_css_default.panelTitle,
															children: t("billing.peakShare")
														}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
															className: UsageBilling_module_css_default.panelHint,
															children: t("billing.peakShareHint").replace("{count}", String(turns.length))
														})]
													}),
													/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
														className: UsageBilling_module_css_default.shareTrack,
														"data-testid": "billing-share-track",
														children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
															className: clsx(UsageBilling_module_css_default.shareSeg, UsageBilling_module_css_default.shareSegPeak),
															style: { width: `${peakPct}%` }
														}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
															className: clsx(UsageBilling_module_css_default.shareSeg, UsageBilling_module_css_default.shareSegOff),
															style: { width: `${100 - peakPct}%` }
														})]
													}),
													/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
														className: UsageBilling_module_css_default.shareLegend,
														children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
															className: UsageBilling_module_css_default.shareItem,
															children: [
																/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
																	className: UsageBilling_module_css_default.shareDot,
																	style: { background: "var(--dsw-static-blue-500)" }
																}),
																t("billing.peak"),
																/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
																	className: UsageBilling_module_css_default.shareValue,
																	"data-testid": "billing-share-peak",
																	children: [
																		money(peakShare.peak),
																		" · ",
																		peakPct.toFixed(1),
																		"%"
																	]
																})
															]
														}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
															className: UsageBilling_module_css_default.shareItem,
															children: [
																/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
																	className: UsageBilling_module_css_default.shareDot,
																	style: { background: "color-mix(in srgb, var(--dsw-static-blue-500) 30%, var(--dsw-alias-bg-module-platform))" }
																}),
																t("billing.offPeak"),
																/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
																	className: UsageBilling_module_css_default.shareValue,
																	"data-testid": "billing-share-offpeak",
																	children: [
																		money(peakShare.offPeak),
																		" · ",
																		(100 - peakPct).toFixed(1),
																		"%"
																	]
																})
															]
														})]
													})
												]
											});
										})()
									]
								}),
								tab === "providers" && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: UsageBilling_module_css_default.tabPanel,
									"data-testid": "billing-tab-panel-providers",
									children: [
										stats.bySite !== void 0 && Object.keys(stats.bySite).length > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
											className: UsageBilling_module_css_default.panel,
											"data-testid": "billing-panel-relay-sites",
											children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
												className: UsageBilling_module_css_default.panelHead,
												children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("h3", {
													className: UsageBilling_module_css_default.panelTitle,
													children: t("billing.panelRelay")
												})
											}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
												className: UsageBilling_module_css_default.providerGroupList,
												"data-testid": "billing-relay-sites",
												children: Object.entries(stats.bySite).sort((a, b) => (b[1].cost ?? 0) - (a[1].cost ?? 0)).map(([siteKey, usage]) => {
													const site = siteBucketLabel(siteKey, t);
													return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
														className: UsageBilling_module_css_default.siteRow,
														"data-testid": "billing-relay-site",
														children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
															className: UsageBilling_module_css_default.siteRowName,
															children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
																className: clsx(UsageBilling_module_css_default.siteKindTag, SITE_KIND_CLASS[site.kind]),
																children: siteKindText(site.kind, t)
															}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
																className: UsageBilling_module_css_default.siteRowTitle,
																children: site.name
															})]
														}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
															className: UsageBilling_module_css_default.siteRowMeta,
															children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
																className: UsageBilling_module_css_default.siteRowCost,
																children: money(usage.cost)
															}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
																className: UsageBilling_module_css_default.siteRowCalls,
																children: [
																	usage.calls,
																	" ",
																	t("billing.relayCalls")
																]
															})]
														})]
													}, siteKey);
												})
											})]
										}),
										relayQuotas.length > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
											className: UsageBilling_module_css_default.panel,
											"data-testid": "billing-panel-relay-quota",
											children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
												className: UsageBilling_module_css_default.panelHead,
												children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("h3", {
													className: UsageBilling_module_css_default.panelTitle,
													children: t("billing.panelRelayQuota")
												})
											}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
												className: UsageBilling_module_css_default.providerGroupList,
												"data-testid": "billing-relay-quotas",
												children: relayQuotas.map((row) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
													className: UsageBilling_module_css_default.siteRow,
													"data-testid": "billing-relay-quota",
													children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
														className: UsageBilling_module_css_default.siteRowName,
														children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
															className: clsx(UsageBilling_module_css_default.siteKindTag, RELAY_KIND_CLASS[row.kind]),
															children: relayKindText(row.kind, t)
														}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
															className: UsageBilling_module_css_default.siteRowTitle,
															children: row.origin
														})]
													}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
														className: UsageBilling_module_css_default.siteRowMeta,
														children: [row.balance !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
															className: UsageBilling_module_css_default.siteRowCost,
															children: [
																t("billing.relayBalance"),
																" ",
																row.balance.toFixed(2)
															]
														}), (row.windows?.length ?? 0) > 0 ? row.windows?.map((window) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
															className: UsageBilling_module_css_default.siteRowCalls,
															children: [
																t("billing.relayWindowUsed"),
																" ",
																window.usedPercent,
																"%"
															]
														}, window.kind)) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
															className: UsageBilling_module_css_default.siteRowCalls,
															children: t("billing.relayNoQuota")
														})]
													})]
												}, row.route))
											})]
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
											className: UsageBilling_module_css_default.panel,
											"data-testid": "billing-panel-providers",
											children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
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
											}), providerGroups.length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
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
																	children: providerName(group.name)
																})]
															}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
																className: UsageBilling_module_css_default.providerGroupMeta,
																children: [group.subscriptions.length > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
																	className: UsageBilling_module_css_default.providerGroupBadge,
																	"data-testid": "billing-provider-sub-count",
																	children: [group.subscriptions.length, " 套餐"]
																}), !hideBalanceForGroup(group) && group.balance !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
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
																			children: [
																				row.name,
																				row.uncatalogued && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
																					className: UsageBilling_module_css_default.uncataloguedTag,
																					"data-testid": "billing-uncatalogued-tag",
																					children: t("billing.uncatalogued")
																				}),
																				row.estimatedPricing && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
																					className: UsageBilling_module_css_default.estimatedTag,
																					"data-testid": "billing-estimated-tag",
																					children: t("billing.estimatedPricing")
																				})
																			]
																		}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
																			className: UsageBilling_module_css_default.modelProvider,
																			children: providerName(row.provider)
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
																			children: t("billing.subscriptionIncluded")
																		}) : row.actual !== void 0 ? (() => {
																			const official = row.officialCost;
																			const third = row.actual - official;
																			if (official > 0 && third > 0) return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
																				className: UsageBilling_module_css_default.bucketCost,
																				children: [
																					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
																						className: UsageBilling_module_css_default.bucketOfficial,
																						children: money(official)
																					}),
																					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
																						className: UsageBilling_module_css_default.bucketSep,
																						children: "/"
																					}),
																					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
																						className: UsageBilling_module_css_default.bucketThird,
																						children: money(third)
																					})
																				]
																			});
																			return money(row.actual);
																		})() : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
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
																			children: [
																				/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
																					className: UsageBilling_module_css_default.subscriptionName,
																					children: providerName(quota.displayName)
																				}),
																				quota.planType === "code" && (() => {
																					const tier = tierInfoOf(quota.provider);
																					const tierFee = tier !== void 0 ? t("billing.subscriptionFeePerMonth").replace("{amount}", tier.currency === "USD" ? `$${tier.amount}` : `¥${tier.amount}`) : void 0;
																					return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
																						className: UsageBilling_module_css_default.subscriptionPlan,
																						"data-kind": "code",
																						children: [
																							tierFee ?? (quota.subscriptionAmount !== void 0 && quota.subscriptionAmount > 0 ? t("billing.subscriptionFeePerMonth").replace("{amount}", money(quota.subscriptionAmount)) : t("billing.planTypeCode")),
																							tier?.label !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
																								className: UsageBilling_module_css_default.subscriptionTier,
																								"data-testid": `billing-tier-${quota.provider}`,
																								children: tier.label
																							}),
																							tier !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
																								className: UsageBilling_module_css_default.subscriptionAuto,
																								"data-testid": `billing-auto-${quota.provider}`,
																								children: t("billing.subscriptionAutoDetect")
																							})
																						]
																					});
																				})(),
																				quota.planType === "token" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
																					className: UsageBilling_module_css_default.subscriptionPlan,
																					"data-kind": "token",
																					children: t("billing.planTypeToken")
																				}),
																				quota.plan !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
																					className: UsageBilling_module_css_default.subscriptionPlan,
																					children: quota.plan
																				})
																			]
																		}),
																		statusText !== "" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
																			className: UsageBilling_module_css_default.subscriptionStatus,
																			children: statusText
																		}),
																		quota.windows.length === 0 && statusText === "" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
																			className: UsageBilling_module_css_default.subscriptionStatus,
																			children: t("billing.subscriptionNoApi")
																		}),
																		quota.windows.map((window) => (() => {
																			const used = Math.min(100, Math.max(0, window.usedPercent));
																			const exhausted = Math.min(100, Math.max(0, window.remainingPercent)) <= 0;
																			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
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
																							className: clsx(UsageBilling_module_css_default.subscriptionFill, used >= 100 && UsageBilling_module_css_default.subscriptionFillOver, used >= 80 && used < 100 && UsageBilling_module_css_default.subscriptionFillWarn),
																							style: { width: `${used}%` }
																						})
																					}),
																					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
																						className: UsageBilling_module_css_default.subscriptionMeta,
																						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
																							className: clsx(UsageBilling_module_css_default.subscriptionPct, exhausted && UsageBilling_module_css_default.subscriptionExhausted),
																							children: exhausted ? t("billing.subscriptionExhausted") : t("billing.subscriptionRemaining").replace("{pct}", String(window.remainingPercent))
																						}), window.resetsAt !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
																							className: UsageBilling_module_css_default.subscriptionReset,
																							children: t("billing.subscriptionReset").replace("{date}", `${localDayStamp(new Date(window.resetsAt).getTime())} ${formatClock(new Date(window.resetsAt).getTime())}`)
																						})]
																					})
																				]
																			}, window.kind);
																		})())
																	]
																}, quota.provider);
															})
														})
													]
												}, group.name))
											})]
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
											className: UsageBilling_module_css_default.exportBar,
											"data-testid": "billing-export-bar",
											role: "group",
											"aria-label": t("billing.export"),
											children: [
												/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
													className: UsageBilling_module_css_default.exportLabel,
													children: t("billing.export")
												}),
												/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
													type: "button",
													className: UsageBilling_module_css_default.exportButton,
													"data-testid": "billing-export-day",
													onClick: () => {
														downloadText(exportFileName("usage-daily", "csv", Object.keys(byDay)), dayRowsCsv(byDay), "text/csv");
													},
													children: t("billing.exportCsvDay")
												}),
												stats.bySession !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
													type: "button",
													className: UsageBilling_module_css_default.exportButton,
													"data-testid": "billing-export-sessions",
													onClick: () => {
														downloadText(exportFileName("usage-sessions", "csv", Object.keys(byDay)), sessionRowsCsv(stats.bySession ?? []), "text/csv");
													},
													children: t("billing.exportCsvSession")
												}),
												/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
													type: "button",
													className: UsageBilling_module_css_default.exportButton,
													"data-testid": "billing-export-json",
													onClick: () => {
														downloadText(exportFileName("usage-stats", "json", Object.keys(byDay)), JSON.stringify(stats, null, 2), "application/json");
													},
													children: t("billing.exportJson")
												})
											]
										}),
										roleRows.length > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
											className: UsageBilling_module_css_default.panel,
											"data-testid": "billing-panel-roles",
											children: [
												/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
													className: UsageBilling_module_css_default.panelHead,
													children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h3", {
														className: UsageBilling_module_css_default.panelTitle,
														children: t("billing.roleCost")
													}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
														className: UsageBilling_module_css_default.panelHint,
														children: t("billing.roleHint")
													})]
												}),
												/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
													className: UsageBilling_module_css_default.shareTrack,
													"data-testid": "billing-role-track",
													children: roleRows.map((row) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
														className: clsx(UsageBilling_module_css_default.shareSeg, row.seg),
														style: { width: `${row.pct}%` }
													}, row.label))
												}),
												/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
													className: UsageBilling_module_css_default.shareLegend,
													children: roleRows.map((row) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
														className: UsageBilling_module_css_default.shareItem,
														children: [
															/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { className: clsx(UsageBilling_module_css_default.shareDot, row.seg) }),
															row.label,
															/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
																className: UsageBilling_module_css_default.shareValue,
																children: [
																	money(row.value),
																	" · ",
																	row.pct.toFixed(1),
																	"%"
																]
															})
														]
													}, row.label))
												})
											]
										}),
										bucketSummary !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
											className: UsageBilling_module_css_default.panel,
											"data-testid": "billing-panel-buckets",
											children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
												className: UsageBilling_module_css_default.panelHead,
												children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("h3", {
													className: UsageBilling_module_css_default.panelTitle,
													children: [
														t("billing.official"),
														" / ",
														t("billing.thirdParty")
													]
												})
											}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
												className: UsageBilling_module_css_default.bucketSummary,
												children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
													className: UsageBilling_module_css_default.bucketStat,
													children: [
														/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
															className: UsageBilling_module_css_default.bucketStatLabel,
															children: t("billing.official")
														}),
														/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
															className: UsageBilling_module_css_default.bucketStatValue,
															children: money(bucketSummary.officialCost)
														}),
														/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
															className: UsageBilling_module_css_default.bucketStatSub,
															children: [
																bucketSummary.officialCalls,
																" ",
																t("billing.calls")
															]
														})
													]
												}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
													className: UsageBilling_module_css_default.bucketStat,
													children: [
														/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
															className: UsageBilling_module_css_default.bucketStatLabel,
															children: t("billing.thirdParty")
														}),
														/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
															className: UsageBilling_module_css_default.bucketStatValue,
															children: money(bucketSummary.thirdCost)
														}),
														/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
															className: UsageBilling_module_css_default.bucketStatSub,
															children: [
																bucketSummary.thirdCalls,
																" ",
																t("billing.calls")
															]
														})
													]
												})]
											})]
										}),
										stats.byWorkspace !== void 0 && stats.byWorkspace.length > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
											className: UsageBilling_module_css_default.panel,
											"data-testid": "billing-panel-workspaces",
											children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
												className: UsageBilling_module_css_default.panelHead,
												children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("h3", {
													className: UsageBilling_module_css_default.panelTitle,
													children: t("billing.workspaces")
												})
											}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
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
											children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
												className: UsageBilling_module_css_default.panelHead,
												children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h3", {
													className: UsageBilling_module_css_default.panelTitle,
													children: t("billing.sessions")
												}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
													className: UsageBilling_module_css_default.panelHint,
													children: stats.bySession.length > SESSION_DISPLAY_LIMIT ? t("billing.sessionOverflow").replace("{limit}", String(SESSION_DISPLAY_LIMIT)).replace("{total}", String(stats.bySession.length)) : `${stats.bySession.length}`
												})]
											}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
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
										})
									]
								}),
								tab === "token" && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: UsageBilling_module_css_default.tabPanel,
									"data-testid": "billing-tab-panel-token",
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(TokenPanel, {
										stats,
										currency,
										trendDays,
										onTrendDays: setTrendDays,
										t
									}), stats.perf !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
										className: UsageBilling_module_css_default.panel,
										"data-testid": "billing-panel-perf",
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
											className: UsageBilling_module_css_default.panelHead,
											children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h3", {
												className: UsageBilling_module_css_default.panelTitle,
												children: t("billing.perfTitle")
											}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
												className: UsageBilling_module_css_default.panelHint,
												children: t("billing.perfHint")
											})]
										}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(PerfPanel, {
											perf: stats.perf,
											models: chartModels,
											t
										})]
									})]
								}),
								tab === "pricing" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									className: UsageBilling_module_css_default.tabPanel,
									"data-testid": "billing-tab-panel-pricing",
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
										className: UsageBilling_module_css_default.panel,
										"data-testid": "billing-panel-pricing",
										children: [
											/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
												className: UsageBilling_module_css_default.panelHead,
												children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h3", {
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
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
												className: UsageBilling_module_css_default.pricingTip,
												children: t("billing.pricingTip")
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
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
													] }) }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("tbody", { children: catalogEntries().map((entry) => {
														const hasPrice = entry.price.input > 0 || entry.price.output > 0;
														return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("tr", { children: [
															/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", { children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
																className: UsageBilling_module_css_default.modelCell,
																children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
																	className: UsageBilling_module_css_default.modelDot,
																	style: { background: resolveToken(entry.colorVar) }
																}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
																	className: UsageBilling_module_css_default.modelName,
																	children: [entry.name, entry.uncatalogued && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
																		className: UsageBilling_module_css_default.uncataloguedTag,
																		"data-testid": "billing-price-uncatalogued",
																		children: t("billing.uncatalogued")
																	})]
																}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
																	className: UsageBilling_module_css_default.modelProvider,
																	children: providerName(entry.provider)
																})] })]
															}) }),
															/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", {
																className: UsageBilling_module_css_default.numCol,
																children: hasPrice ? entry.price.offPeak !== void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
																	className: UsageBilling_module_css_default.bandPrice,
																	children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: unitMoney(entry.price.input, entry.price.currency) }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
																		className: UsageBilling_module_css_default.bandPriceOff,
																		children: unitMoney(entry.price.offPeak.input, entry.price.currency)
																	})]
																}) : unitMoney(entry.price.input, entry.price.currency) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
																	className: UsageBilling_module_css_default.na,
																	children: "—"
																})
															}),
															/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", {
																className: UsageBilling_module_css_default.numCol,
																children: hasPrice ? entry.price.offPeak !== void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
																	className: UsageBilling_module_css_default.bandPrice,
																	children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: unitMoney(entry.price.cacheHit, entry.price.currency) }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
																		className: UsageBilling_module_css_default.bandPriceOff,
																		children: unitMoney(entry.price.offPeak.cacheHit, entry.price.currency)
																	})]
																}) : unitMoney(entry.price.cacheHit, entry.price.currency) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
																	className: UsageBilling_module_css_default.na,
																	children: "—"
																})
															}),
															/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", {
																className: UsageBilling_module_css_default.numCol,
																children: hasPrice ? entry.price.offPeak !== void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
																	className: UsageBilling_module_css_default.bandPrice,
																	children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: unitMoney(entry.price.output, entry.price.currency) }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
																		className: UsageBilling_module_css_default.bandPriceOff,
																		children: unitMoney(entry.price.offPeak.output, entry.price.currency)
																	})]
																}) : unitMoney(entry.price.output, entry.price.currency) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
																	className: UsageBilling_module_css_default.na,
																	children: "—"
																})
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
														] }, entry.key);
													}) })]
												})
											})
										]
									})
								}),
								renderSlot("billing.dashboard.decor", { position: "footer" })
							]
						})
					]
				})
			});
		}
		/**
		* UsageBilling: sidebar trigger plus the billing dashboard modal.
		* @param props - framework-provided sidebar and locale props.
		*/
		function UsageBilling(props) {
			const { t: hostT, checkModels, publishCosts, registerOpen, renderSlot, useStore, actions } = props;
			const [stats, setStats] = (0, react.useState)(EMPTY_STATS);
			const [health, setHealth] = (0, react.useState)(IDLE_HEALTH);
			const [balances, setBalances] = (0, react.useState)([]);
			const [quotas, setQuotas] = (0, react.useState)([]);
			const [relayQuotas, setRelayQuotas] = (0, react.useState)([]);
			const [currency, setCurrency] = (0, react.useState)("cny");
			const lang = currency === "usd" ? "en" : "zh";
			const t = (0, react.useCallback)((key, params) => {
				const text = (lang === "en" ? en : zh)[key] ?? hostT(key);
				if (params === void 0) return text;
				let out = text;
				for (const [k, v] of Object.entries(params)) out = out.replaceAll(`{${k}}`, String(v));
				return out;
			}, [lang, hostT]);
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
				fetchRelayQuotas().then((list) => {
					if (list.length > 0) setRelayQuotas(list);
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
					if (!mounted) return;
					setHealth(result);
					applyLiveCatalogModels(result.catalog ?? []);
				});
				return () => {
					mounted = false;
				};
			}, [checkModels]);
			const today = localDayStamp();
			const monthCost = Object.entries(stats.byDay).filter(([date]) => date.startsWith(today.slice(0, 7))).reduce((sum, [, day]) => sum + day.cost, 0);
			const todayCost = stats.byDay[today]?.cost ?? 0;
			const weekCost = lastSevenDays(stats.byDay).reduce((sum, d) => sum + d.cost, 0);
			const last7 = (0, react.useMemo)(() => lastSevenDays(stats.byDay), [stats.byDay]);
			const budgetEnabled = useStore((s) => s.enabled);
			const budgetAmount = useStore((s) => s.amount);
			const tierAlertDays = useStore((s) => s.tierAlertDays);
			const lastTierSwitchAt = useStore((s) => s.lastTierSwitchAt);
			const [peakConfig, setPeakConfig] = (0, react.useState)(() => loadPeakAlertConfig());
			const [peakHit, setPeakHit] = (0, react.useState)(null);
			const [peakPreview, setPeakPreview] = (0, react.useState)(null);
			const updatePeakConfig = (0, react.useCallback)((config) => {
				setPeakConfig(config);
				savePeakAlertConfig(config);
			}, []);
			const previewPeak = (0, react.useCallback)(() => {
				setPeakPreview({
					entering: tierAt(Date.now()) === "peak" ? "offPeak" : "peak",
					atMs: Date.now() + 3 * 6e4
				});
			}, []);
			const effectiveBudget = budgetAmount > 0 ? budgetAmount : stats.budget ?? 0;
			const toggleBudget = (0, react.useCallback)(() => {
				const next = !budgetEnabled;
				actions.setEnabled(next);
				if (next && typeof Notification !== "undefined" && Notification.permission === "default") Notification.requestPermission();
			}, [actions, budgetEnabled]);
			(0, react.useEffect)(() => {
				if (!budgetEnabled || effectiveBudget <= 0) return;
				const pct = monthCost / effectiveBudget * 100;
				const day = localDayStamp();
				const crossed = BUDGET_ALERT_TIERS.filter((tier) => pct >= tier && tierAlertDays?.[String(tier)] !== day);
				if (crossed.length === 0) return;
				const top = crossed[crossed.length - 1] ?? 100;
				actions.markTierAlerted(crossed, day);
				if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
				const body = t("billing.budgetTierBody").replace("{cost}", formatMoney(monthCost)).replace("{budget}", formatMoney(effectiveBudget)).replace("{pct}", String(top));
				try {
					new Notification(t("billing.budget"), { body });
				} catch {}
			}, [
				budgetEnabled,
				effectiveBudget,
				monthCost,
				tierAlertDays,
				actions,
				t
			]);
			(0, react.useEffect)(() => {
				const upcoming = computePeakAlert(Date.now(), peakConfig, lastTierSwitchAt);
				if (upcoming === null) return;
				actions.markTierSwitchAlerted(upcoming.atMs);
				setPeakHit(upcoming);
				if (!peakConfig.webNotify) return;
				if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
				const minutes = Math.max(1, Math.round((upcoming.atMs - Date.now()) / 6e4));
				const title = upcoming.entering === "peak" ? t("billing.peakAlertTitlePeak") : t("billing.peakAlertTitleOff");
				const body = upcoming.entering === "peak" ? t("billing.tierAlertEnterPeak").replace("{minutes}", String(minutes)) : t("billing.tierAlertEnterOff").replace("{minutes}", String(minutes));
				try {
					new Notification(title, { body });
				} catch {}
			}, [
				lastTierSwitchAt,
				peakConfig,
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
			const vendorStatus = (0, react.useMemo)(() => {
				const prefix = today.slice(0, 7);
				const vendor = /* @__PURE__ */ new Map();
				for (const [date, models] of Object.entries(stats.byDayModels ?? {})) {
					if (!date.startsWith(prefix)) continue;
					for (const [modelKey, usage] of Object.entries(models)) {
						if (usage.cost <= 0) continue;
						const provider = modelOf(modelKey).provider ?? "其他";
						const isPlan = stats.byModel?.[modelKey]?.plan === true;
						const cur = vendor.get(provider) ?? {
							cost: 0,
							plan: isPlan
						};
						cur.cost += usage.cost;
						if (!isPlan) cur.plan = false;
						vendor.set(provider, cur);
					}
				}
				const directEntry = [...vendor.entries()].filter(([, v]) => !v.plan).sort((a, b) => b[1].cost - a[1].cost)[0];
				const subEntry = [...vendor.entries()].filter(([, v]) => v.plan).sort((a, b) => b[1].cost - a[1].cost)[0];
				const balanceStatus = (name) => {
					const bal = balances.find((b) => normalizeProvider(b.provider) === normalizeProvider(name));
					if (bal === void 0 || bal.totalBalance === void 0) return {
						text: bal?.error === "unauthorized" ? t("billing.balanceUnauthorized") : bal?.error === "unreachable" || bal?.error === "invalid" ? t("billing.balanceUnreachable") : t("billing.balanceUnconfigured"),
						low: false
					};
					const amount = bal.currency === "USD" ? `$${bal.totalBalance.toFixed(2)}` : formatMoney(bal.totalBalance);
					const rate = getRateInfo().rate;
					return {
						text: amount,
						low: (bal.currency === "USD" ? bal.totalBalance * rate : bal.totalBalance) < (stats.lowBalanceThreshold ?? DEFAULT_LOW_BALANCE_THRESHOLD)
					};
				};
				const quotaStatus = (name) => {
					const q = quotas.find((qq) => qq.displayName === name || subscriptionVendorOf(qq.provider) === name);
					if (q === void 0 || q.windows.length === 0) return {
						text: t("billing.subscriptionNoApi"),
						low: false
					};
					const lowest = q.windows.reduce((min, window) => Math.min(min, window.remainingPercent), 100);
					return {
						text: lowest <= 0 ? t("billing.subscriptionExhausted") : t("billing.subscriptionRemaining").replace("{pct}", String(lowest)),
						low: lowest < 20
					};
				};
				return {
					direct: directEntry === void 0 ? void 0 : {
						name: directEntry[0],
						...balanceStatus(directEntry[0])
					},
					sub: subEntry === void 0 ? void 0 : {
						name: subEntry[0],
						...quotaStatus(subEntry[0])
					}
				};
			}, [
				stats.byDayModels,
				stats.byModel,
				stats.lowBalanceThreshold,
				balances,
				quotas,
				today
			]);
			const dash = (0, react.useMemo)(() => {
				const total = stats.total;
				return {
					totalToken: total.input + total.output,
					input: total.input,
					output: total.output,
					cacheRead: total.cacheHit,
					calls: total.calls,
					updatedAt: stats.updatedAt === void 0 ? void 0 : `${localDayStamp(stats.updatedAt)} ${formatClock(stats.updatedAt)}`
				};
			}, [stats]);
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
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)(UsageBillingTrigger, {
					...props,
					t,
					onOpen: openDashboard,
					monthCost,
					todayCost,
					weekCost,
					days: last7,
					vendorStatus,
					dash
				}),
				open && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(BillingDashboard, {
					stats,
					t,
					onClose: close,
					health,
					balances,
					quotas,
					relayQuotas,
					currency,
					onCurrency: setCurrency,
					turns,
					renderSlot,
					budgetEnabled,
					budgetAmount: effectiveBudget,
					onToggleBudget: toggleBudget,
					onBudgetAmount: actions.setAmount,
					peakConfig,
					onPeakConfig: updatePeakConfig,
					onPreviewPeak: previewPeak
				}),
				(peakHit !== null || peakPreview !== null) && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(PeakAlertBanner, {
					hit: peakHit ?? peakPreview,
					config: peakConfig,
					t,
					onDismiss: () => {
						setPeakHit(null);
						setPeakPreview(null);
					}
				})
			] });
		}
		//#endregion
		//#region src/client/live-cost.tsx
		/**
		* LiveCostBar: the session-scope cost ticker mounted on the composer's dock,
		* showing the current session's accumulated spend and the latest turn's cost.
		*
		* It rides `conversation.composer.dock` (the stats-line family seat under the
		* composer card, same posture as ui-conversation's own StatsLine), so it stays
		* visible while working without opening the full dashboard. Data comes from the
		* same `/api/billing/usage-stats` endpoint the dashboard polls; the bar reads
		* the current session id off the framework snapshot (`useSession` parent of
		* `sessionId`) and matches `bySession` (session total) and `byTurn` (latest
		* turn cost). Rendering is a pure function of the snapshot, never a side effect.
		*
		* The bar also carries two ambient signals: the current peak/off-peak pricing
		* tier with a switch countdown (DeepSeek time-of-day pricing), and quota chips
		* for subscription plans running low (≤20% remaining), so cost pressure is
		* visible without opening the dashboard.
		*/
		/**
		* 当前会话累计费用：bySession 里会话 id 匹配的那行；缺省为 0。
		* 导出供测试：纯函数。
		* @param stats - 薄统计切片。
		* @param sessionId - 当前会话 id。
		* @returns 该会话累计费用（人民币元）。
		*/
		function sessionCostOf(stats, sessionId) {
			if (sessionId === void 0 || stats?.bySession === void 0) return 0;
			return stats.bySession.find((item) => item.id === sessionId)?.cost ?? 0;
		}
		/**
		* 当前轮费用：byTurn 里该会话最新一轮的 cost；缺省为 0。
		* byTurn 服务端按起始时间倒序下发，但求 max(turn) 更稳健（不依赖顺序）。
		* 导出供测试：纯函数。
		* @param stats - 薄统计切片。
		* @param sessionId - 当前会话 id。
		* @returns 最新一轮费用（人民币元）。
		*/
		function turnCostOf(stats, sessionId) {
			if (sessionId === void 0 || stats?.byTurn === void 0) return 0;
			let latest = 0;
			let latestTurn = -1;
			for (const item of stats.byTurn) {
				if (item.sessionId !== sessionId) continue;
				if (latestTurn === -1 || item.turn > latestTurn) {
					latestTurn = item.turn;
					latest = item.cost;
				}
			}
			return latest;
		}
		/**
		* 低额度预警 chips：查询成功（ok）且任一窗口剩余 ≤ threshold 的套餐，
		* 按剩余升序、最多 3 枚。导出供测试：纯函数。
		* @param quotas - 订阅额度行切片。
		* @param threshold - 剩余百分比阈值（默认 20%）。
		*/
		function lowQuotaChips(quotas, threshold = 20) {
			const chips = [];
			for (const quota of quotas) {
				if (quota.status !== "ok") continue;
				for (const win of quota.windows) {
					if (win.remainingPercent > threshold) continue;
					chips.push({
						name: quota.displayName,
						kind: win.kind,
						pct: win.remainingPercent
					});
				}
			}
			return chips.sort((a, b) => a.pct - b.pct).slice(0, 3);
		}
		/** Endpoint the node half serves (same constant the dashboard uses). */
		const USAGE_STATS_PATH = "/api/billing/usage-stats";
		/** 订阅额度端点（额度预警 chips 的数据源）。 */
		const SUBSCRIPTIONS_PATH = "/api/billing/subscriptions";
		/** Refresh cadence (ms): matching the dashboard so the bar stays current. */
		const REFRESH_INTERVAL_MS = 3e4;
		/** Load the thin stats slice; null when the endpoint does not answer valid JSON. */
		async function loadLiveStats() {
			try {
				const response = await fetch(USAGE_STATS_PATH);
				if (!response.ok) return null;
				const text = await response.text();
				const parsed = JSON.parse(text);
				if (parsed === null || typeof parsed !== "object") return null;
				const doc = parsed;
				return {
					...Array.isArray(doc.bySession) ? { bySession: doc.bySession } : {},
					...Array.isArray(doc.byTurn) ? { byTurn: doc.byTurn } : {}
				};
			} catch {
				return null;
			}
		}
		/** Load subscription quota slices; empty list on any failure. */
		async function loadQuotas() {
			try {
				const response = await fetch(SUBSCRIPTIONS_PATH);
				if (!response.ok) return [];
				const parsed = JSON.parse(await response.text());
				if (parsed === null || typeof parsed !== "object" || !("quotas" in parsed)) return [];
				const quotas = parsed.quotas;
				return Array.isArray(quotas) ? quotas : [];
			} catch {
				return [];
			}
		}
		/** 额度窗口类型 → 文案 key（本次 / 本周 / 本月 / 计费周期）。 */
		function windowLabelKey(kind) {
			switch (kind) {
				case "session": return "billing.subscriptionSession";
				case "weekly": return "billing.subscriptionWeekly";
				case "monthly": return "billing.subscriptionMonthly";
				default: return "billing.subscriptionBilling";
			}
		}
		/**
		* Render the live cost ticker for the current session.
		* @param props - framework session snapshot hook and locale.
		*/
		function LiveCostBar({ useSession, t }) {
			const sessionId = useSession((s) => s.sessionId);
			const [stats, setStats] = (0, react.useState)(null);
			const [quotas, setQuotas] = (0, react.useState)([]);
			const [nowMs, setNowMs] = (0, react.useState)(() => Date.now());
			(0, react.useEffect)(() => {
				let cancelled = false;
				const load = () => {
					loadLiveStats().then((data) => {
						if (!cancelled && data !== null) setStats(data);
					});
					loadQuotas().then((list) => {
						if (!cancelled) setQuotas(list);
					});
					if (!cancelled) setNowMs(Date.now());
				};
				load();
				const timer = setInterval(load, REFRESH_INTERVAL_MS);
				return () => {
					cancelled = true;
					clearInterval(timer);
				};
			}, [sessionId]);
			const sessionCost = (0, react.useMemo)(() => sessionCostOf(stats, sessionId), [stats, sessionId]);
			const turnCost = (0, react.useMemo)(() => turnCostOf(stats, sessionId), [stats, sessionId]);
			const tier = tierCountdown(nowMs);
			const chips = (0, react.useMemo)(() => lowQuotaChips(quotas), [quotas]);
			const money = (cny) => formatMoney(cny, "cny");
			if (sessionId === void 0) return null;
			const hasCost = sessionCost > 0 || turnCost > 0;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
				className: UsageBilling_module_css_default.liveCostBar,
				"data-testid": "billing-live-cost-bar",
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
						className: tier.tier === "peak" ? UsageBilling_module_css_default.liveTierPeak : UsageBilling_module_css_default.liveTierOff,
						"data-testid": "billing-live-tier",
						children: [
							tier.tier === "peak" ? t("billing.tierPeak") : t("billing.tierOff"),
							" · ",
							formatSwitchCountdown(tier.nextSwitchInMs),
							" ",
							tier.tier === "peak" ? t("billing.tierToOff") : t("billing.tierToPeak")
						]
					}),
					hasCost && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: UsageBilling_module_css_default.liveCostSep,
							"aria-hidden": "true",
							children: "·"
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
							className: UsageBilling_module_css_default.liveCostItem,
							"data-testid": "billing-live-turn",
							children: [
								t("billing.liveTurn"),
								" ",
								money(turnCost)
							]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: UsageBilling_module_css_default.liveCostSep,
							"aria-hidden": "true",
							children: "·"
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
							className: UsageBilling_module_css_default.liveCostItem,
							"data-testid": "billing-live-session",
							children: [
								t("billing.liveSession"),
								" ",
								money(sessionCost)
							]
						})
					] }),
					chips.map((chip) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: UsageBilling_module_css_default.liveCostSep,
						"aria-hidden": "true",
						children: "·"
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
						className: chip.pct <= 10 ? UsageBilling_module_css_default.liveQuotaCrit : UsageBilling_module_css_default.liveQuotaWarn,
						"data-testid": "billing-live-quota",
						children: [
							chip.name,
							" ",
							t(windowLabelKey(chip.kind)),
							" ",
							chip.pct,
							"%"
						]
					})] }, `${chip.name}:${chip.kind}`))
				]
			});
		}
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
					tierAlertDays: {},
					lastBalanceAlertDay: "",
					lastTierSwitchAt: 0
				}),
				persist: "dsh.ui-usage-billing.budget",
				actions: {
					setEnabled: (d, on) => {
						d.enabled = on;
					},
					setAmount: (d, value) => {
						d.amount = Number.isFinite(value) && value > 0 ? value : 0;
					},
					markTierAlerted: (d, tiers, day) => {
						d.tierAlertDays ??= {};
						for (const tier of tiers) d.tierAlertDays[String(tier)] = day;
					},
					markBalanceAlerted: (d, day) => {
						d.lastBalanceAlertDay = day;
					},
					markTierSwitchAlerted: (d, at) => {
						d.lastTierSwitchAt = at;
					}
				}
			});
		}
		//#endregion
		//#region src/client/completion-notify.ts
		/** 配置持久化 key：开启/关闭 + 提醒持续模式（0=常驻，其余=秒后自动关）。 */
		const COMPLETION_NOTIFY_KEY = "dsh-billing-completion-notify-v1";
		const DEFAULT_CONFIG = {
			enabled: false,
			timeout: 0
		};
		/** 读取本地配置（缺失/损坏时回退默认）。 */
		function loadNotifyConfig() {
			try {
				const raw = localStorage.getItem(COMPLETION_NOTIFY_KEY);
				if (raw === null) return { ...DEFAULT_CONFIG };
				const parsed = JSON.parse(raw);
				return {
					enabled: parsed.enabled === true,
					timeout: typeof parsed.timeout === "number" ? parsed.timeout : 0
				};
			} catch {
				return { ...DEFAULT_CONFIG };
			}
		}
		/** 判断一个会话是否「完成」：completed 标志为真，或已不再 running。 */
		function isFinished(summary) {
			if (summary.completed === true) return true;
			return summary.running === false;
		}
		/**
		* 安装对话完成提醒：订阅 sessions.list 快照，用 `previousFinished` 记住每条
		* 会话上次是运行中还是已完成；只有「之前运行中 → 现在已完成」的迁移才提醒，
		* 首次快照只建立基线、不提醒。返回清理函数（dispose 时释放订阅）。
		* @param list - `ctx.sessions.list`（宿主注入的会话列表快照源）。
		*/
		function installCompletionNotifier(list, getConfig) {
			const previousFinished = /* @__PURE__ */ new Set();
			let queuedTitle;
			const snapshot = list.getSnapshot();
			for (const id of snapshot.ids) {
				const summary = snapshot.byId[id];
				if (summary !== void 0 && isFinished(summary)) previousFinished.add(String(id));
			}
			const notify = (title) => {
				const { enabled, timeout } = getConfig();
				if (!enabled) return;
				if (typeof Notification === "undefined") return;
				if (Notification.permission !== "granted") return;
				try {
					new Notification(title, {
						body: title,
						tag: "dsh-billing-completion",
						requireInteraction: timeout === 0
					});
				} catch {}
			};
			return list.subscribe(() => {
				const state = list.getSnapshot();
				const finishedTitles = [];
				for (const id of state.ids) {
					const summary = state.byId[id];
					if (summary === void 0) continue;
					const key = String(id);
					const finished = isFinished(summary);
					if (finished && !previousFinished.has(key)) finishedTitles.push(summary.title ?? summary.id ?? key);
					if (finished) previousFinished.add(key);
					else previousFinished.delete(key);
				}
				if (finishedTitles.length > 0) {
					queuedTitle = finishedTitles.length === 1 ? finishedTitles[0] : `${finishedTitles.length} 个会话已完成`;
					if (queuedTitle !== void 0) notify(queuedTitle);
				}
			});
		}
		//#endregion
		//#region src/client/apply.ts
		/** Required services for the usage billing surface. */
		const inject = [
			"slots",
			"locale",
			"connection",
			"sessions"
		];
		/**
		* Client plugin body: the UsageBilling entry in the sidebar footer.
		* @param ctx - client root context.
		*/
		function apply(ctx) {
			const metrics = createBillingMetrics();
			ctx.provide("billingMetrics", metrics);
			const budgetStore = createBillingBudgetStore();
			const connection = ctx.get("connection");
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
							const { result } = await connection.api.llm.models({});
							if (!result.ok) return {
								checked: true,
								available: false,
								models: 0,
								failures: 0,
								okProviders: [],
								badProviders: []
							};
							const catalog = [];
							for (const group of result.value.groups) for (const model of group.models) catalog.push({
								id: model.id,
								...typeof model.name === "string" && model.name !== "" ? { name: model.name } : {},
								provider: group.name
							});
							return {
								checked: true,
								available: result.value.groups.length > 0,
								models: result.value.groups.reduce((sum, group) => sum + group.models.length, 0),
								failures: result.value.failures.length,
								okProviders: result.value.groups.map((group) => group.name),
								badProviders: result.value.failures.map((failure) => failure.name),
								catalog
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
			ctx.slots.inject("conversation.composer.dock", () => ctx.slots.register({
				name: "conversation.composer.dock",
				id: "usage-billing-cost",
				order: 0,
				locale: NS
			}, LiveCostBar));
			ctx.effect(() => {
				return installCompletionNotifier(ctx.sessions.list, loadNotifyConfig);
			}, "ui-usage-billing: completion notifier");
		}
		//#endregion
		exports.UsageBilling = UsageBilling;
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map