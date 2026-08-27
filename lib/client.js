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
		//#region ../deepseek-harness/node_modules/.pnpm/clsx@2.1.1/node_modules/clsx/dist/clsx.mjs
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
		//#region src/client/usage-billing-settings.ts
		/** 默认浮窗偏好：综合模式、无指定目标（向后兼容现有综合速览卡）。 */
		const DEFAULT_FLOAT_WINDOW_PREFS = {
			mode: "combined",
			targets: []
		};
		/** localStorage key（与 budget store 的 `dsh.ui-usage-billing.*` 命名空间一致）。 */
		const FLOAT_WINDOW_STORAGE_KEY = "dsh.ui-usage-billing.float";
		/** 读取浮窗偏好（含损坏/缺失回退到默认）。仅在浏览器半区调用。
		*  返回全新对象（含 targets 数组拷贝），避免调用方就地修改污染共享默认值。 */
		function loadFloatWindowPrefs() {
			try {
				const raw = localStorage.getItem(FLOAT_WINDOW_STORAGE_KEY);
				if (raw === null) return {
					...DEFAULT_FLOAT_WINDOW_PREFS,
					targets: [...DEFAULT_FLOAT_WINDOW_PREFS.targets]
				};
				const parsed = JSON.parse(raw);
				return {
					mode: parsed.mode === "subscription" ? "subscription" : "combined",
					targets: Array.isArray(parsed.targets) ? parsed.targets.filter((entry) => typeof entry === "string") : []
				};
			} catch {
				return {
					...DEFAULT_FLOAT_WINDOW_PREFS,
					targets: [...DEFAULT_FLOAT_WINDOW_PREFS.targets]
				};
			}
		}
		/** 写入浮窗偏好。失败静默（展示偏好非关键）。 */
		function saveFloatWindowPrefs(prefs) {
			try {
				localStorage.setItem(FLOAT_WINDOW_STORAGE_KEY, JSON.stringify(prefs));
			} catch {}
		}
		//#endregion
		//#region \0dsh-css:/Users/ken/dsh-ui-usage-billing/src/client/UsageBilling.module.css.mjs
		const css = ".KFXqYa_railButton{border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-2);width:36px;height:36px;color:var(--dsw-alias-label-secondary);cursor:pointer;border-radius:8px;flex:none;justify-content:center;align-items:center;padding:0;transition:border-color .16s,color .16s;display:flex}.KFXqYa_railButton:hover,.KFXqYa_railButton:focus-visible{border-color:var(--dsw-static-blue-500);color:var(--dsw-static-blue-500);outline:none}.KFXqYa_railButton svg{stroke-width:2px;width:18px;height:18px}.KFXqYa_trigger{border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-2);width:100%;min-width:0;color:var(--dsw-alias-label-primary);cursor:pointer;text-align:left;border-radius:14px;align-items:center;gap:10px;padding:9px 12px;transition:border-color .16s,transform .16s,box-shadow .16s;display:flex;position:relative;overflow:hidden;box-shadow:0 1px 2px #0000000a}.KFXqYa_trigger:hover,.KFXqYa_trigger:focus-visible{border-color:var(--dsw-static-blue-500);box-shadow:0 6px 18px -8px color-mix(in srgb, var(--dsw-static-blue-500) 45%, transparent);outline:none;transform:translateY(-1px)}.KFXqYa_triggerIcon{border:1px solid var(--dsw-alias-border-l1);width:32px;height:32px;color:var(--dsw-alias-label-secondary);opacity:.8;border-radius:8px;flex:none;justify-content:center;align-items:center;display:inline-flex}.KFXqYa_triggerIcon svg{stroke-width:2px;width:16px;height:16px}.KFXqYa_triggerMain{flex-direction:column;flex:1;gap:2px;min-width:0;display:flex}.KFXqYa_triggerPrimary{align-items:baseline;gap:5px;min-width:0;display:inline-flex}.KFXqYa_triggerLabel{color:var(--dsw-alias-label-tertiary);white-space:nowrap;text-overflow:ellipsis;min-width:0;font-size:11px;line-height:15px;overflow:hidden}.KFXqYa_triggerYen{color:var(--dsw-alias-label-tertiary);font-variant-numeric:tabular-nums;font-size:12px;font-weight:600;line-height:16px}.KFXqYa_triggerMetric{color:var(--dsw-alias-label-primary);letter-spacing:-.02em;font-variant-numeric:tabular-nums;white-space:nowrap;text-overflow:ellipsis;min-width:0;font-size:20px;font-weight:700;line-height:24px;overflow:hidden}.KFXqYa_triggerSub{color:var(--dsw-alias-label-tertiary);white-space:nowrap;text-overflow:ellipsis;font-size:10px;line-height:14px;overflow:hidden}.KFXqYa_triggerSpark{flex:none;align-items:flex-end;gap:2px;height:20px;display:flex}.KFXqYa_triggerSparkBar,.KFXqYa_triggerSparkHot{background:var(--dsw-static-blue-500);opacity:.6;border-radius:1px 1px 0 0;width:3px}.KFXqYa_triggerSparkHot{opacity:1}.KFXqYa_triggerWrap{flex:auto;width:100%;min-width:0;display:block;position:relative;container:KFXqYa_billing-trigger/inline-size}@container KFXqYa_billing-trigger (width<=200px){.KFXqYa_trigger{gap:6px;padding:8px 10px}.KFXqYa_triggerSpark{display:none}}@container KFXqYa_billing-trigger (width<=170px){.KFXqYa_triggerSub,.KFXqYa_triggerLabel{display:none}}@container KFXqYa_billing-trigger (width<=110px){.KFXqYa_triggerIcon,.KFXqYa_triggerSpark,.KFXqYa_triggerSub,.KFXqYa_triggerLabel{display:none}.KFXqYa_trigger{justify-content:center;padding:8px 6px}}.KFXqYa_triggerPop{border:1px solid color-mix(in srgb, var(--dsw-alias-border-l1) 80%, transparent);background:color-mix(in srgb, var(--dsw-alias-bg-layer-2) 72%, transparent);-webkit-backdrop-filter:blur(14px)saturate(1.3);box-shadow:0 12px 32px #00000029, inset 0 1px 0 color-mix(in srgb, var(--dsw-alias-label-primary) 8%, transparent);opacity:0;pointer-events:none;z-index:10;border-radius:14px;flex-direction:column;gap:5px;padding:10px 12px;transition:opacity .16s,transform .16s;display:flex;position:absolute;bottom:calc(100% + 8px);left:0;right:0;overflow:hidden;transform:translateY(4px)}.KFXqYa_triggerPop:before{content:\"\";background:linear-gradient(90deg, transparent 0%, var(--dsw-static-amber-500) 30%, var(--dsw-alias-label-primary) 50%, var(--dsw-static-amber-500) 70%, transparent 100%);opacity:.9;pointer-events:none;background-size:200% 100%;height:1.5px;animation:4s ease-in-out infinite KFXqYa_subscriptionGoldFlow;position:absolute;top:0;left:0;right:0}.KFXqYa_triggerWrap:hover .KFXqYa_triggerPop,.KFXqYa_triggerWrap:focus-within .KFXqYa_triggerPop{opacity:1;transform:translateY(0)}.KFXqYa_popHead{justify-content:space-between;align-items:baseline;gap:8px;display:flex}.KFXqYa_popTitle{color:var(--dsw-alias-label-primary);font-size:13px;font-weight:700;line-height:18px}.KFXqYa_metricGrid{grid-template-columns:repeat(3,1fr);gap:10px 8px;display:grid}.KFXqYa_metricCell{flex-direction:column;gap:2px;min-width:0;display:flex}.KFXqYa_metricLabel{color:var(--dsw-alias-label-tertiary);font-size:10px;line-height:14px}.KFXqYa_metricValue{color:var(--dsw-alias-label-primary);font-variant-numeric:tabular-nums;white-space:nowrap;font-size:12px;font-weight:700;line-height:16px}.KFXqYa_metricValuePrimary{color:var(--dsw-static-amber-500)}.KFXqYa_metricValueSuccess{color:var(--dsw-static-green-500)}.KFXqYa_popModel{border-top:1px solid var(--dsw-alias-border-l1);flex-direction:column;gap:6px;padding-top:10px;display:flex}.KFXqYa_popModelLabel{color:var(--dsw-alias-label-tertiary);font-size:10px;line-height:14px}.KFXqYa_popModelRow{align-items:center;gap:8px;min-width:0;display:flex}.KFXqYa_popDot{border-radius:999px;flex:none;width:6px;height:6px}.KFXqYa_popDotDirect{background:var(--dsw-static-green-500)}.KFXqYa_popDotSub{background:var(--dsw-static-amber-500)}.KFXqYa_popDotNeutral{background:var(--dsw-alias-label-tertiary)}.KFXqYa_popTagPrimary,.KFXqYa_popTagSub{white-space:nowrap;border-radius:5px;flex:none;align-items:center;height:18px;padding:0 6px;font-size:10px;font-weight:600;line-height:14px;display:inline-flex}.KFXqYa_popTagPrimary{background:color-mix(in srgb, var(--dsw-static-blue-500) 14%, transparent);color:var(--dsw-static-blue-500)}.KFXqYa_popTagSub{background:color-mix(in srgb, var(--dsw-static-amber-500) 18%, transparent);color:var(--dsw-static-amber-500)}.KFXqYa_popModelName{color:var(--dsw-alias-label-secondary);text-overflow:ellipsis;white-space:nowrap;font-size:11px;font-weight:500;line-height:16px;overflow:hidden}.KFXqYa_popModelStatus{color:var(--dsw-alias-label-primary);font-variant-numeric:tabular-nums;white-space:nowrap;margin-left:auto;font-size:11px;font-weight:600;line-height:16px}.KFXqYa_popModelStatusLow{color:var(--dsw-static-red-500)}.KFXqYa_triggerPopRow{white-space:nowrap;justify-content:space-between;align-items:baseline;gap:12px;display:flex}.KFXqYa_triggerPopLabel{letter-spacing:.01em;color:var(--dsw-alias-label-tertiary);white-space:nowrap;flex:none;font-size:10.5px;line-height:16px}.KFXqYa_triggerPopValue{min-width:0;color:var(--dsw-alias-label-primary);font-variant-numeric:tabular-nums;justify-content:flex-end;align-items:baseline;gap:8px;font-size:12.5px;font-weight:600;line-height:17px;display:inline-flex}.KFXqYa_triggerPopName{text-overflow:ellipsis;white-space:nowrap;max-width:110px;color:var(--dsw-alias-label-secondary);font-size:12px;font-weight:500;overflow:hidden}.KFXqYa_triggerPopTitle{color:var(--dsw-alias-label-primary);white-space:nowrap;align-items:baseline;gap:8px;font-size:12px;font-weight:700;display:flex}.KFXqYa_triggerPopTitleMonth{color:var(--dsw-alias-label-tertiary);font-size:11px;font-weight:500}.KFXqYa_triggerPopStrong{color:var(--dsw-alias-label-primary);margin-left:8px;font-size:12.5px;font-weight:700}.KFXqYa_triggerPopAlert{color:var(--dsw-static-red-500);white-space:nowrap;font-size:11px;line-height:16px}.KFXqYa_triggerPopValueStack{flex-direction:column;align-items:flex-end;gap:2px;display:flex}.KFXqYa_triggerPopMuted{color:var(--dsw-alias-label-tertiary);font-weight:500}.KFXqYa_triggerPopHead{justify-content:space-between;align-items:baseline;gap:10px;display:flex}.KFXqYa_triggerPopUpdated{color:var(--dsw-alias-label-tertiary);white-space:nowrap;font-size:10px}.KFXqYa_triggerPopMetrics{grid-template-columns:1fr 1fr;gap:7px 12px;display:grid}.KFXqYa_triggerPopMetric{flex-direction:column;align-items:flex-start;gap:1px;display:flex}.KFXqYa_triggerPopMetricLabel{color:var(--dsw-alias-label-tertiary);white-space:nowrap;font-size:10px}.KFXqYa_triggerPopMetricValue{color:var(--dsw-alias-label-primary);font-variant-numeric:tabular-nums;white-space:nowrap;font-size:14px;font-weight:700;line-height:18px}.KFXqYa_triggerPopMetricHighlight{color:var(--dsw-static-amber-500)}.KFXqYa_triggerPopFoot{border-top:1px solid color-mix(in srgb, var(--dsw-alias-border-l1) 70%, transparent);flex-direction:column;gap:4px;padding-top:6px;display:flex}.KFXqYa_triggerPopFootTitle{text-align:center;letter-spacing:.05em;color:var(--dsw-alias-label-tertiary);border-bottom:1px solid color-mix(in srgb, var(--dsw-alias-border-l1) 70%, transparent);padding-bottom:4px;font-size:10px;font-weight:600}.KFXqYa_triggerPopFootNotes{flex-direction:column;gap:1px;min-width:0;display:flex}.KFXqYa_triggerPopFootNote{align-items:baseline;gap:4px;min-width:0;display:flex}.KFXqYa_triggerPopFootName{color:var(--dsw-alias-label-tertiary);white-space:nowrap;text-overflow:ellipsis;font-size:10px;overflow:hidden}.KFXqYa_triggerPopBadge{white-space:nowrap;border-radius:5px;flex:none;padding:1px 6px;font-size:9.5px;font-weight:600;line-height:14px}.KFXqYa_triggerPopBadgeDirect{background:color-mix(in srgb, var(--dsw-alias-label-primary) 12%, transparent);color:var(--dsw-alias-label-primary)}.KFXqYa_triggerPopBadgeSub{background:color-mix(in srgb, var(--dsw-static-amber-500) 18%, transparent);color:var(--dsw-static-amber-500)}.KFXqYa_triggerPopFootStrong{color:var(--dsw-alias-label-secondary);font-weight:600}.KFXqYa_triggerPopFootStatus{color:var(--dsw-alias-label-primary);font-variant-numeric:tabular-nums;white-space:nowrap;font-size:14px;font-weight:700;line-height:18px}.KFXqYa_triggerPopFootStatusLow{color:var(--dsw-static-red-500)}.KFXqYa_triggerPopOpenBtn{pointer-events:auto;border:1px solid color-mix(in srgb, var(--dsw-alias-border-l1) 80%, transparent);color:var(--dsw-alias-label-primary);background:color-mix(in srgb, var(--dsw-alias-bg-layer-3) 70%, transparent);cursor:pointer;border-radius:999px;flex:none;padding:5px 11px;font-size:11px;font-weight:600;transition:border-color .16s,background-color .16s}.KFXqYa_triggerPopOpenBtn:hover{border-color:var(--dsw-static-blue-500);background:color-mix(in srgb, var(--dsw-static-blue-500) 12%, var(--dsw-alias-bg-layer-3))}.KFXqYa_triggerPopBars{border-top:1px solid var(--dsw-alias-border-l1);align-items:flex-end;gap:4px;height:22px;margin-top:4px;padding-top:8px;display:flex}.KFXqYa_triggerPopBar{background:var(--dsw-static-blue-500);border-radius:2px;flex:1;transition:height .2s}.KFXqYa_dashboardModal{border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-1);border-radius:16px;width:min(760px,100vw - 48px);max-height:min(760px,88vh);animation:.18s ease-out KFXqYa_dashboardIn;box-shadow:0 12px 32px -12px #0000002e,0 2px 8px #0000000f}@keyframes KFXqYa_dashboardIn{0%{opacity:0;transform:translateY(8px)scale(.98)}to{opacity:1;transform:none}}div[role=presentation]:has(>.dsh-billing-modal)>div[aria-hidden=true]:first-child{backdrop-filter:blur(8px)saturate(1.25)}.KFXqYa_dashboard{flex-direction:column;width:100%;max-height:min(760px,88vh);display:flex}.KFXqYa_dashboardHead{border-bottom:1px solid var(--dsw-alias-border-l1);justify-content:space-between;align-items:center;gap:12px;padding:20px 24px;display:flex}.KFXqYa_dashboardTitle{color:var(--dsw-alias-label-primary);margin:0;font-size:16px;font-weight:600;line-height:24px}.KFXqYa_dashboardSubtitle{color:var(--dsw-alias-label-caption);margin:2px 0 0;font-size:11px;line-height:16px}.KFXqYa_closeButton{border:1px solid var(--dsw-alias-border-l1);width:32px;height:32px;color:var(--dsw-alias-label-secondary);cursor:pointer;background:0 0;border-radius:8px;flex:none;justify-content:center;align-items:center;transition:background-color .14s,color .14s;display:inline-flex}.KFXqYa_closeButton:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}.KFXqYa_closeButton svg{stroke-width:2px;width:16px;height:16px}.KFXqYa_dashboardBody{flex-direction:column;gap:14px;padding:16px 24px 24px;display:flex;overflow-y:auto}.KFXqYa_modalFooter{border-top:1px solid var(--dsw-alias-border-l1);color:var(--dsw-alias-label-tertiary);flex-wrap:wrap;justify-content:space-between;align-items:center;gap:16px;padding:12px 24px;font-size:11px;line-height:16px;display:flex}.KFXqYa_tabNav{border-bottom:1px solid var(--dsw-alias-border-l1);align-items:center;gap:4px;padding:0 24px;display:flex}.KFXqYa_tabButton{color:var(--dsw-alias-label-tertiary);cursor:pointer;background:0 0;border:none;border-radius:8px;margin:8px 0;padding:6px 12px;font-size:13px;font-weight:500;line-height:20px;transition:background-color .16s,color .16s}.KFXqYa_tabButton:hover,.KFXqYa_tabButton:focus-visible{color:var(--dsw-alias-label-primary);background:color-mix(in srgb, var(--dsw-alias-bg-layer-3) 62%, transparent);outline:none}.KFXqYa_tabButtonActive,.KFXqYa_tabButtonActive:hover,.KFXqYa_tabButtonActive:focus-visible{background:var(--dsw-alias-bg-layer-3);color:var(--dsw-alias-label-primary);font-weight:600}.KFXqYa_tabPanel{flex-direction:column;gap:14px;animation:.14s ease-out KFXqYa_tabPanelIn;display:flex}@keyframes KFXqYa_tabPanelIn{0%{opacity:0;transform:translateY(4px)}to{opacity:1;transform:none}}.KFXqYa_reconcileNotice{border:1px solid color-mix(in srgb, var(--dsw-alias-border-l1) 78%, transparent);background:color-mix(in srgb, var(--dsw-alias-bg-layer-2) 62%, transparent);color:var(--dsw-alias-label-secondary);border-radius:10px;align-items:flex-start;gap:10px;padding:10px 12px;font-size:12px;line-height:1.55;display:flex}.KFXqYa_reconcileIcon{color:var(--dsw-alias-label-tertiary);flex:none;margin-top:1px;display:inline-flex}.KFXqYa_reconcileText{flex:1}.KFXqYa_reconcileDismiss{color:var(--dsw-alias-label-tertiary);cursor:pointer;white-space:nowrap;background:0 0;border:none;border-radius:6px;flex:none;padding:2px 8px;font-size:12px;line-height:1.4;transition:color .15s,background-color .15s}.KFXqYa_reconcileDismiss:hover{color:var(--dsw-alias-label-primary);background:color-mix(in srgb, var(--dsw-alias-label-primary) 8%, transparent)}.KFXqYa_hero{border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-2);border-radius:12px;flex-direction:column;gap:18px;padding:24px;display:flex;position:relative;overflow:hidden}.KFXqYa_heroTop{justify-content:space-between;align-items:center;gap:24px;display:flex}.KFXqYa_heroMain{flex-direction:column;gap:2px;min-width:0;display:flex}.KFXqYa_heroLabel{color:var(--dsw-alias-label-tertiary);white-space:nowrap;font-size:11px;line-height:16px}.KFXqYa_heroReadout{align-items:baseline;gap:4px;display:flex}.KFXqYa_heroCurrency{letter-spacing:-.01em;color:var(--dsw-alias-label-secondary);font-variant-numeric:tabular-nums;font-size:22px;font-weight:600;line-height:28px}.KFXqYa_heroValue{letter-spacing:-.02em;font-variant-numeric:tabular-nums;white-space:nowrap;color:var(--dsw-alias-label-primary);font-size:40px;font-weight:700;line-height:48px}.KFXqYa_heroMeta{color:var(--dsw-alias-label-caption);white-space:nowrap;margin-top:4px;font-size:12px;line-height:17px}.KFXqYa_heroGauge{flex:none;width:96px;height:96px;position:relative}.KFXqYa_heroGaugeSvg{width:100%;height:100%;display:block;transform:rotate(-90deg)}.KFXqYa_heroGaugeTrack{fill:none;stroke:var(--dsw-alias-bg-module-platform);stroke-width:9px}.KFXqYa_heroGaugeArc{fill:none;stroke:var(--dsw-static-blue-500);stroke-width:9px;stroke-linecap:round;transition:stroke-dasharray .26s}.KFXqYa_heroGaugeArcOver{stroke:var(--dsw-static-red-500)}.KFXqYa_heroGaugeCenter{flex-direction:column;justify-content:center;align-items:center;gap:1px;display:flex;position:absolute;inset:0}.KFXqYa_heroGaugePct{letter-spacing:-.02em;font-variant-numeric:tabular-nums;color:var(--dsw-alias-label-primary);font-size:18px;font-weight:700;line-height:22px}.KFXqYa_heroGaugePctOver{color:var(--dsw-static-red-500)}.KFXqYa_heroGaugeLabel{color:var(--dsw-alias-label-tertiary);font-size:10px;line-height:14px}.KFXqYa_heroBudget{border-top:1px solid var(--dsw-alias-border-l1);align-items:center;gap:14px;padding-top:14px;display:flex}.KFXqYa_heroBudgetLabel{color:var(--dsw-alias-label-secondary);white-space:nowrap;flex:none;font-size:11px;line-height:16px}.KFXqYa_heroBudgetTrack{background:var(--dsw-alias-border-l1);border-radius:999px;flex:1;min-width:0;height:6px;overflow:hidden}.KFXqYa_heroBudgetFill{background:var(--dsw-static-blue-500);border-radius:999px;height:100%;transition:width .22s}.KFXqYa_heroBudgetFillOver{background:var(--dsw-static-red-500)}.KFXqYa_heroBudgetValue{color:var(--dsw-alias-label-secondary);font-variant-numeric:tabular-nums;white-space:nowrap;flex:none;font-size:11px;line-height:16px}.KFXqYa_heroSide{border-top:1px solid var(--dsw-alias-border-l1);align-items:stretch;padding-top:14px;display:flex}.KFXqYa_heroSideItem{border-left:1px solid var(--dsw-alias-border-l1);flex-direction:column;flex:1;gap:3px;min-width:0;padding-left:16px;display:flex}.KFXqYa_heroSideItem:first-child{border-left:none;padding-left:0}.KFXqYa_heroSideLabel{color:var(--dsw-alias-label-tertiary);white-space:nowrap;font-size:11px;line-height:15px}.KFXqYa_heroSideValue{color:var(--dsw-alias-label-primary);font-variant-numeric:tabular-nums;letter-spacing:-.01em;white-space:nowrap;align-items:baseline;gap:6px;font-size:18px;font-weight:600;line-height:24px;display:inline-flex}.KFXqYa_heroSideSpacer{flex:1;display:block}.KFXqYa_delta{align-items:center;gap:2px;margin-left:4px;font-size:11px;font-weight:600;line-height:17px;display:inline-flex}.KFXqYa_deltaUp{color:var(--dsw-static-green-500)}.KFXqYa_deltaDown{color:var(--dsw-static-red-500)}.KFXqYa_unpricedHint{border:1px solid color-mix(in srgb, var(--dsw-static-amber-500) 30%, transparent);background:color-mix(in srgb, var(--dsw-static-amber-500) 8%, transparent);color:var(--dsw-static-amber-500);border-radius:8px;align-items:center;padding:8px 12px;font-size:11.5px;font-weight:500;line-height:17px;display:flex}.KFXqYa_kpiGrid{grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;display:grid}.KFXqYa_kpiTile{border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-2);border-radius:12px;flex-direction:column;gap:3px;padding:16px;transition:border-color .16s;display:flex;position:relative;overflow:hidden}.KFXqYa_kpiTile:hover{border-color:var(--dsw-alias-border-l2)}.KFXqYa_kpiLabel{color:var(--dsw-alias-label-tertiary);font-size:11px;line-height:15px}.KFXqYa_kpiValue{color:var(--dsw-alias-label-primary);font-variant-numeric:tabular-nums;letter-spacing:-.01em;font-size:24px;font-weight:600;line-height:32px}.KFXqYa_kpiGreen{color:var(--dsw-static-green-500)}.KFXqYa_kpiDetail{color:var(--dsw-alias-label-caption);white-space:nowrap;text-overflow:ellipsis;font-size:11px;line-height:15px;overflow:hidden}.KFXqYa_panel{border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-2);border-radius:12px;flex-direction:column;gap:10px;padding:16px 18px;transition:border-color .16s;display:flex}.KFXqYa_panelHead{justify-content:space-between;align-items:baseline;gap:10px;display:flex}.KFXqYa_panelTitle{letter-spacing:-.005em;color:var(--dsw-alias-label-primary);margin:0;font-size:14px;font-weight:600;line-height:20px}.KFXqYa_panelHint{color:var(--dsw-alias-label-caption);white-space:nowrap;font-size:11px;line-height:16px}.KFXqYa_pricingTip{color:var(--dsw-alias-label-caption);margin:0 0 2px;font-size:11px;line-height:16px}.KFXqYa_rangeToggle{border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-1);border-radius:8px;gap:2px;padding:2px;display:inline-flex}.KFXqYa_rangeButton{color:var(--dsw-alias-label-tertiary);cursor:pointer;background:0 0;border:none;border-radius:6px;padding:2px 8px;font-size:11px;line-height:16px;transition:background-color .14s,color .14s}.KFXqYa_rangeButtonActive{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary);font-weight:600}.KFXqYa_exportBar{justify-content:flex-end;align-items:center;gap:8px;display:flex}.KFXqYa_exportLabel{color:var(--dsw-alias-label-caption);font-size:11px;line-height:16px}.KFXqYa_exportButton{border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-secondary);cursor:pointer;border-radius:999px;padding:4px 12px;font-size:11.5px;line-height:16px;transition:border-color .16s,color .16s,background-color .16s}.KFXqYa_exportButton:hover,.KFXqYa_exportButton:focus-visible{border-color:var(--dsw-alias-border-l2);color:var(--dsw-alias-label-primary);outline:none}.KFXqYa_shareTrack{background:var(--dsw-alias-bg-module-platform);border-radius:999px;height:10px;display:flex;overflow:hidden}.KFXqYa_shareSeg{height:100%;transition:width .2s}.KFXqYa_shareSegPeak{background:var(--dsw-static-blue-500)}.KFXqYa_shareSegOff{background:color-mix(in srgb, var(--dsw-static-blue-500) 25%, var(--dsw-alias-bg-module-platform))}.KFXqYa_shareSegUser{background:var(--dsw-static-blue-500)}.KFXqYa_shareSegAssistant{background:var(--dsw-static-green-500)}.KFXqYa_shareSegTool{background:var(--dsw-static-amber-500)}.KFXqYa_shareLegend{align-items:center;gap:16px;display:flex}.KFXqYa_shareItem{color:var(--dsw-alias-label-secondary);align-items:baseline;gap:6px;font-size:12px;line-height:17px;display:inline-flex}.KFXqYa_bucketCost{align-items:baseline;gap:3px;display:inline-flex}.KFXqYa_bucketOfficial{color:var(--dsw-static-blue-500);font-weight:600}.KFXqYa_bucketSep{color:var(--dsw-alias-label-dimmed)}.KFXqYa_bucketThird{color:var(--dsw-alias-label-secondary)}.KFXqYa_bucketSummary{grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;display:grid}.KFXqYa_bucketStat{border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-2);border-radius:12px;flex-direction:column;gap:4px;padding:12px 14px;display:flex}.KFXqYa_bucketStatLabel{color:var(--dsw-alias-label-tertiary);text-transform:uppercase;letter-spacing:.05em;font-size:11px;line-height:15px}.KFXqYa_bucketStatValue{color:var(--dsw-alias-label-primary);font-variant-numeric:tabular-nums;letter-spacing:-.01em;font-size:20px;font-weight:700;line-height:26px}.KFXqYa_bucketStatSub{color:var(--dsw-alias-label-caption);font-variant-numeric:tabular-nums;font-size:11px;line-height:16px}.KFXqYa_shareDot{border-radius:50%;flex:none;align-self:center;width:8px;height:8px}.KFXqYa_shareValue{color:var(--dsw-alias-label-primary);font-variant-numeric:tabular-nums;font-weight:600}.KFXqYa_budget{border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-1);border-radius:14px;flex-direction:column;gap:8px;padding:12px 16px;display:flex}.KFXqYa_budgetHead{justify-content:space-between;align-items:baseline;gap:10px;display:flex}.KFXqYa_budgetLabel{color:var(--dsw-alias-label-primary);font-size:13px;font-weight:600}.KFXqYa_budgetValue{color:var(--dsw-alias-label-secondary);font-variant-numeric:tabular-nums;white-space:nowrap;font-size:12px;line-height:17px}.KFXqYa_budgetControls{align-items:center;gap:8px;min-width:0;display:inline-flex}.KFXqYa_budgetInputWrap{border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-1);border-radius:6px;align-items:center;gap:2px;padding:2px 6px;display:inline-flex}.KFXqYa_budgetInputWrap:focus-within{border-color:var(--dsw-alias-border-l3)}.KFXqYa_budgetUnit{color:var(--dsw-alias-label-tertiary);font-size:11px;line-height:16px}.KFXqYa_budgetInput{width:64px;color:var(--dsw-alias-label-primary);font-variant-numeric:tabular-nums;text-align:right;background:0 0;border:none;padding:0;font-size:12px;line-height:16px}.KFXqYa_budgetInput:focus-visible{outline:none}.KFXqYa_switch{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-module-platform);cursor:pointer;border-radius:999px;flex:none;width:30px;height:17px;padding:0;transition:background-color .16s,border-color .16s;position:relative}.KFXqYa_switchOn{border-color:var(--dsw-alias-border-l1);background:var(--dsw-alias-label-primary)}.KFXqYa_switchKnob{background:var(--dsw-static-neutral-bluish-00);border-radius:50%;width:11px;height:11px;transition:transform .16s;position:absolute;top:2px;left:2px}.KFXqYa_switchOn .KFXqYa_switchKnob{transform:translate(13px)}.KFXqYa_budgetTrack{background:var(--dsw-alias-bg-module-platform);border-radius:999px;height:6px;overflow:hidden}.KFXqYa_budgetFill{background:var(--dsw-static-blue-500);border-radius:999px;height:100%;transition:width .2s}.KFXqYa_budgetFillWarn{background:var(--dsw-static-amber-500)}.KFXqYa_budgetFillOver{background:var(--dsw-static-red-500);animation:1.6s ease-in-out infinite KFXqYa_budgetOverPulse}@keyframes KFXqYa_budgetOverPulse{50%{opacity:.55}}.KFXqYa_chartWrap{width:100%;position:relative}.KFXqYa_chartSvg{width:100%;height:auto;display:block}.KFXqYa_chartEmpty{height:140px;color:var(--dsw-alias-label-caption);justify-content:center;align-items:center;font-size:13px;display:flex}.KFXqYa_emptyRow{text-align:center;color:var(--dsw-alias-label-caption);padding:28px 0;font-size:13px}.KFXqYa_chartGrid{stroke:var(--dsw-alias-border-l1);stroke-width:1px}.KFXqYa_chartAxisLabel{fill:var(--dsw-alias-label-tertiary);font-size:10px}.KFXqYa_chartBar{fill:var(--dsw-static-blue-500);opacity:.7}.KFXqYa_chartBar:hover{opacity:1}.KFXqYa_chartStack{stroke:var(--dsw-alias-bg-layer-1);stroke-width:.75px}.KFXqYa_chartStack:hover{opacity:.9}.KFXqYa_chartLine{stroke:var(--dsw-static-blue-500);stroke-width:2px;stroke-linecap:round;stroke-linejoin:round}.KFXqYa_chartCrosshair{stroke:var(--dsw-alias-label-dimmed);stroke-width:1px;stroke-dasharray:3 3}.KFXqYa_chartDot{fill:var(--dsw-static-neutral-bluish-00);stroke:var(--dsw-static-blue-500);stroke-width:2px}.KFXqYa_chartTooltip{pointer-events:none;z-index:2;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-2);box-shadow:none;white-space:nowrap;border-radius:8px;padding:8px 10px;position:absolute;transform:translate(-50%,calc(-100% - 10px))}.KFXqYa_chartTooltipDate{color:var(--dsw-alias-label-primary);margin-bottom:3px;font-size:11px;font-weight:600}.KFXqYa_chartTooltipRow{color:var(--dsw-alias-label-secondary);align-items:center;gap:5px;font-size:11px;line-height:17px;display:flex}.KFXqYa_chartTooltipRow strong{color:var(--dsw-alias-label-primary);font-variant-numeric:tabular-nums;font-weight:600}.KFXqYa_chartBarPlaceholder{fill:color-mix(in srgb, var(--dsw-alias-label-secondary) 30%, transparent)}.KFXqYa_chartLegendLine{background:var(--dsw-static-blue-500);border-radius:2px;width:10px;height:3px;display:inline-block}.KFXqYa_chartLegendBar{background:var(--dsw-static-blue-500);opacity:.5;border-radius:2px;width:7px;height:7px;display:inline-block}.KFXqYa_chartTooltipSwatch{border-radius:3px;flex:none;width:8px;height:8px;display:inline-block}.KFXqYa_chartLegend{color:var(--dsw-alias-label-tertiary);justify-content:flex-end;gap:14px;margin-top:2px;font-size:11px;display:flex}.KFXqYa_chartLegend span{align-items:center;gap:5px;display:inline-flex}.KFXqYa_tableScroll{border:1px solid var(--dsw-alias-border-l1);--dsh-scrollbar-thumb:var(--dsw-alias-scrollbar-bg-l2);--dsh-scrollbar-thumb-hover:var(--dsw-alias-scrollbar-hover-l2);border-radius:12px;overflow:auto}.KFXqYa_ubAlert{border:1px solid color-mix(in srgb, var(--dsw-static-blue-500) 30%, transparent);background:color-mix(in srgb, var(--dsw-static-blue-500) 8%, transparent);border-radius:10px;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:12px;padding:10px 14px;font-size:12px;line-height:17px;display:flex}.KFXqYa_ubAlertLeft{align-items:center;gap:8px;display:inline-flex}.KFXqYa_ubRate{color:var(--dsw-alias-label-primary);font-variant-numeric:tabular-nums;font-weight:600}.KFXqYa_ubAlertNote{color:var(--dsw-alias-label-secondary);margin:0}.KFXqYa_ubTag,.KFXqYa_ubTagSuccess,.KFXqYa_ubTagNeutral,.KFXqYa_ubTagAlert,.KFXqYa_ubTagPromo{white-space:nowrap;border-radius:999px;align-items:center;height:18px;padding:0 7px;font-size:10px;font-weight:600;line-height:14px;display:inline-flex}.KFXqYa_ubTagSuccess{background:color-mix(in srgb, var(--dsw-static-green-500) 14%, transparent);color:var(--dsw-static-green-500)}.KFXqYa_ubTagNeutral{background:var(--dsw-alias-bg-layer-3);color:var(--dsw-alias-label-secondary)}.KFXqYa_ubTagAlert{background:color-mix(in srgb, var(--dsw-static-amber-500) 16%, transparent);color:var(--dsw-static-amber-500)}.KFXqYa_ubTagPromo{background:color-mix(in srgb, var(--dsw-static-red-500) 14%, transparent);color:var(--dsw-static-red-500);cursor:help}.KFXqYa_ubExtraRow td{opacity:.72;padding-top:2px;padding-bottom:2px;font-size:12px}.KFXqYa_ubExtraName{color:var(--dsw-alias-label-secondary);margin-left:26px}.KFXqYa_ubExtraNote{color:var(--dsw-alias-label-tertiary);margin-left:8px;font-size:10px}.KFXqYa_ubCard{border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-2);border-radius:12px;flex-direction:column;gap:12px;padding:16px 18px;display:flex}.KFXqYa_ubCardHead{justify-content:space-between;align-items:baseline;gap:12px;display:flex}.KFXqYa_ubCardTitle{color:var(--dsw-alias-label-primary);margin:0;font-size:13px;font-weight:600;line-height:18px}.KFXqYa_ubCardSub{color:var(--dsw-alias-label-tertiary);font-size:11px;line-height:16px}.KFXqYa_ubTablewrap{border:1px solid var(--dsw-alias-border-l1);border-radius:10px;overflow:auto}.KFXqYa_ubTable{border-collapse:collapse;white-space:nowrap;width:100%;font-size:12.5px}.KFXqYa_ubTable th,.KFXqYa_ubTable td{border-bottom:1px solid var(--dsw-alias-border-l1);text-align:left;padding:9px 12px}.KFXqYa_ubTable tbody tr:last-child td{border-bottom:0}.KFXqYa_ubTable thead th{color:var(--dsw-alias-label-tertiary);text-transform:uppercase;letter-spacing:.05em;font-size:11px;font-weight:600}.KFXqYa_ubModel{align-items:center;gap:8px;display:inline-flex}.KFXqYa_ubModelDot{border-radius:50%;flex:none;width:9px;height:9px}.KFXqYa_vendorLogo{object-fit:contain;border-radius:4px;flex:none;width:18px;height:18px}.KFXqYa_vendorLetter{color:#fff;border-radius:4px;flex:none;justify-content:center;align-items:center;width:18px;height:18px;font-size:10px;font-weight:600;line-height:1;display:inline-flex}.KFXqYa_ubModelName{color:var(--dsw-alias-label-primary);align-items:center;gap:6px;font-weight:500;display:inline-flex}.KFXqYa_ubPricepair{flex-wrap:wrap;gap:6px;display:inline-flex}.KFXqYa_ubChipPeak,.KFXqYa_ubChipOff{font-variant-numeric:tabular-nums;border-radius:999px;align-items:center;gap:5px;height:20px;padding:0 8px;font-size:11px;line-height:16px;display:inline-flex}.KFXqYa_ubChipLabel{font-size:10px;font-weight:600}.KFXqYa_ubChipPeak{background:color-mix(in srgb, var(--dsw-static-blue-500) 14%, transparent);color:var(--dsw-static-blue-500)}.KFXqYa_ubChipOff{background:color-mix(in srgb, var(--dsw-static-green-500) 14%, transparent);color:var(--dsw-static-green-500)}.KFXqYa_ubNotes{flex-direction:column;gap:8px;margin:0;padding:0;list-style:none;display:flex}.KFXqYa_ubNotesItem{align-items:baseline;gap:10px;display:flex}.KFXqYa_ubNotesTerm{color:var(--dsw-alias-label-primary);flex:0 0 72px;font-size:12px;font-weight:500}.KFXqYa_ubNotesDesc{min-width:0;color:var(--dsw-alias-label-secondary);flex:1;font-size:12px;line-height:17px}.KFXqYa_ubCardControlGroup{flex-wrap:wrap;align-items:center;gap:8px;display:inline-flex}.KFXqYa_ubTagError{white-space:nowrap;background:color-mix(in srgb, var(--dsw-static-red-500) 14%, transparent);height:18px;color:var(--dsw-static-red-500);border-radius:999px;align-items:center;padding:0 7px;font-size:10px;font-weight:600;line-height:14px;display:inline-flex}.KFXqYa_ubStatGrid{grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;display:grid}.KFXqYa_ubStatCard{border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-2);border-radius:12px;flex-direction:column;gap:4px;padding:14px 16px;display:flex}.KFXqYa_ubStatLabel{color:var(--dsw-alias-label-tertiary);font-size:11px;line-height:16px}.KFXqYa_ubStatValue{color:var(--dsw-alias-label-primary);font-variant-numeric:tabular-nums;letter-spacing:-.01em;font-size:22px;font-weight:700;line-height:28px}.KFXqYa_ubStatDetail{color:var(--dsw-alias-label-tertiary);font-variant-numeric:tabular-nums;font-size:11px;line-height:16px}.KFXqYa_rowlist{flex-direction:column;gap:4px;margin:0;padding:0;list-style:none;display:flex}.KFXqYa_rowline{width:100%;min-width:0;color:var(--dsw-alias-label-primary);text-align:left;cursor:pointer;background:0 0;border:1px solid #0000;border-radius:10px;justify-content:space-between;align-items:center;gap:12px;padding:9px 12px;transition:background-color .14s,border-color .14s;display:flex}.KFXqYa_rowline:hover{background:color-mix(in srgb, var(--dsw-alias-bg-layer-3) 60%, transparent);border-color:var(--dsw-alias-border-l1)}.KFXqYa_rowlineName{min-width:0;color:var(--dsw-alias-label-primary);white-space:nowrap;text-overflow:ellipsis;flex:1;font-size:12.5px;font-weight:500;overflow:hidden}.KFXqYa_rowlineRight{font-variant-numeric:tabular-nums;flex:none;align-items:baseline;gap:8px;display:inline-flex}.KFXqYa_rowlineMuted{color:var(--dsw-alias-label-tertiary);font-size:11px;line-height:16px}.KFXqYa_rowlineChev{color:var(--dsw-alias-label-tertiary);font-size:14px}.KFXqYa_rowlineDrillWrap{padding-left:12px}.KFXqYa_rowlineDrill{border-left:1px solid var(--dsw-alias-border-l1);justify-content:space-between;align-items:center;gap:12px;padding:6px 12px;font-size:12px;display:flex}.KFXqYa_modelTable,.KFXqYa_pricingTable{border-collapse:collapse;width:100%;font-size:12.5px}.KFXqYa_modelTable th,.KFXqYa_modelTable td,.KFXqYa_pricingTable th,.KFXqYa_pricingTable td{border-bottom:1px solid var(--dsw-alias-border-l1);text-align:left;white-space:nowrap;padding:9px 12px}.KFXqYa_modelTable tbody tr:last-child td,.KFXqYa_pricingTable tbody tr:last-child td{border-bottom:0}.KFXqYa_modelTable thead th,.KFXqYa_pricingTable thead th{color:var(--dsw-alias-label-tertiary);text-transform:uppercase;letter-spacing:.05em;background:0 0;font-size:11px;font-weight:600}.KFXqYa_modelTable tbody tr,.KFXqYa_pricingTable tbody tr{transition:background-color .12s}.KFXqYa_modelTable tbody tr:hover,.KFXqYa_pricingTable tbody tr:hover{background:0 0}.KFXqYa_numCol{text-align:right;font-variant-numeric:tabular-nums}.KFXqYa_costCol{color:var(--dsw-alias-label-primary);font-weight:600}.KFXqYa_na{color:var(--dsw-alias-label-dimmed)}.KFXqYa_modelCell{align-items:center;gap:8px;display:inline-flex}.KFXqYa_modelDot{border-radius:50%;flex:none;width:9px;height:9px}.KFXqYa_modelName{color:var(--dsw-alias-label-primary);font-weight:500;line-height:16px;display:block}.KFXqYa_modelProvider{color:var(--dsw-alias-label-caption);font-size:10.5px;line-height:14px;display:block}.KFXqYa_pricingToggle{cursor:pointer;text-align:left;background:0 0;border:none;justify-content:space-between;align-items:center;gap:10px;width:100%;padding:0;display:flex}.KFXqYa_pricingToggle:hover .KFXqYa_panelTitle,.KFXqYa_pricingToggle:focus-visible .KFXqYa_panelTitle{color:var(--dsw-alias-label-primary)}.KFXqYa_rateBadge{vertical-align:1px;white-space:nowrap;border-radius:999px;align-items:center;margin-left:6px;padding:1px 6px;font-size:10px;font-weight:500;line-height:14px;display:inline-flex}.KFXqYa_rateBadgeLive{color:var(--dsw-static-green-500);background:var(--dsw-alias-bg-layer-2)}.KFXqYa_siteRow{border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-1);border-radius:10px;justify-content:space-between;align-items:center;gap:12px;padding:8px 10px;display:flex}.KFXqYa_siteRowName{align-items:center;gap:8px;min-width:0;display:inline-flex}.KFXqYa_siteKindTag{white-space:nowrap;border-radius:999px;flex:none;align-items:center;padding:1px 7px;font-size:10.5px;font-weight:600;line-height:16px;display:inline-flex}.KFXqYa_siteKindSite{color:var(--dsw-static-blue-500);background:color-mix(in srgb, var(--dsw-static-blue-500) 14%, transparent)}.KFXqYa_siteKindDirect{color:var(--dsw-static-green-500);background:color-mix(in srgb, var(--dsw-static-green-500) 14%, transparent)}.KFXqYa_siteKindUnknown{color:var(--dsw-static-red-500);background:color-mix(in srgb, var(--dsw-static-red-500) 14%, transparent)}.KFXqYa_siteRowTitle{color:var(--dsw-alias-label-primary);text-overflow:ellipsis;white-space:nowrap;font-size:12.5px;font-weight:600;line-height:18px;overflow:hidden}.KFXqYa_siteRowMeta{flex:none;align-items:center;gap:10px;display:inline-flex}.KFXqYa_siteRowCost{color:var(--dsw-alias-label-primary);font-variant-numeric:tabular-nums;font-size:12.5px;font-weight:700;line-height:18px}.KFXqYa_siteRowCalls{color:var(--dsw-alias-label-secondary);font-variant-numeric:tabular-nums;font-size:11.5px;line-height:17px}.KFXqYa_siteRowCallsLow{color:var(--dsw-static-red-500)}.KFXqYa_rateBadgeBuiltin{color:var(--dsw-alias-label-tertiary);background:var(--dsw-alias-bg-layer-2)}.KFXqYa_pricingToggleText{align-items:baseline;gap:10px;min-width:0;display:flex}.KFXqYa_pricingChevron{width:16px;height:16px;color:var(--dsw-alias-label-tertiary);flex:none;transition:transform .16s}.KFXqYa_pricingChevronOpen{transform:rotate(180deg)}.KFXqYa_bandPrice{align-items:baseline;gap:6px;display:inline-flex}.KFXqYa_bandPriceOff{color:var(--dsw-alias-label-caption)}.KFXqYa_bandPriceOff:before{content:\"/\";color:var(--dsw-alias-label-dimmed);margin-right:4px}.KFXqYa_bandTag{color:var(--dsw-alias-label-secondary);flex-direction:column;gap:1px;font-size:10.5px;line-height:14px;display:inline-flex}.KFXqYa_bandTagOff{color:var(--dsw-static-green-500);font-weight:600}.KFXqYa_bandTag>span:first-child{color:var(--dsw-alias-label-primary);font-weight:500}.KFXqYa_flatTag{color:var(--dsw-alias-label-caption);font-size:10.5px;line-height:14px}.KFXqYa_healthDot{border-radius:50%;flex:none;width:8px;height:8px;display:inline-block}.KFXqYa_healthOk{background:var(--dsw-static-green-500)}.KFXqYa_healthBad{background:var(--dsw-static-red-500)}.KFXqYa_healthIdle{background:var(--dsw-static-neutral-bluish-400)}.KFXqYa_dashboardRight{align-items:center;gap:8px;min-width:0;display:flex}.KFXqYa_healthBadge{white-space:nowrap;border-radius:999px;align-items:center;gap:6px;padding:3px 9px;font-size:11px;line-height:16px;display:inline-flex}.KFXqYa_healthBadgeOk{color:var(--dsw-static-green-500);background:var(--dsw-alias-bg-layer-2)}.KFXqYa_healthBadgeBad{color:var(--dsw-static-red-500);background:var(--dsw-alias-bg-layer-2)}.KFXqYa_planTag{color:var(--dsw-static-green-500);background:var(--dsw-alias-bg-layer-2);border-radius:999px;align-items:center;padding:1px 8px;font-size:11px;font-weight:500;line-height:17px;display:inline-flex}.KFXqYa_uncataloguedTag{vertical-align:1px;color:var(--dsw-static-amber-500);background:var(--dsw-alias-bg-layer-2);border-radius:999px;margin-left:6px;padding:0 6px;font-size:10px;font-weight:600;line-height:16px;display:inline-block}.KFXqYa_estimatedTag{vertical-align:1px;color:var(--dsw-static-blue-500);background:var(--dsw-alias-bg-layer-2);border-radius:999px;margin-left:6px;padding:0 6px;font-size:10px;font-weight:600;line-height:16px;display:inline-block}.KFXqYa_feeBar{border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-secondary);font-variant-numeric:tabular-nums;border-radius:999px;flex-wrap:wrap;align-items:center;gap:8px;padding:6px 12px;font-size:11px;line-height:16px;display:inline-flex}.KFXqYa_feeCount{color:var(--dsw-alias-label-primary);font-weight:600}.KFXqYa_feeSuffix{color:var(--dsw-alias-label-tertiary)}.KFXqYa_feeItem{color:var(--dsw-alias-label-secondary);white-space:nowrap}.KFXqYa_feeNum{color:var(--dsw-alias-label-primary)}.KFXqYa_feeSep{color:var(--dsw-alias-label-tertiary)}.KFXqYa_feeChipPrimary,.KFXqYa_feeChipOff,.KFXqYa_feeChipAlert,.KFXqYa_feeChipError{font-variant-numeric:tabular-nums;white-space:nowrap;border-radius:999px;align-items:center;height:20px;padding:0 8px;font-size:10px;font-weight:600;line-height:14px;display:inline-flex}.KFXqYa_feeChipPrimary{background:color-mix(in srgb, var(--dsw-static-blue-500) 14%, transparent);color:var(--dsw-static-blue-500)}.KFXqYa_feeChipOff{background:color-mix(in srgb, var(--dsw-static-green-500) 14%, transparent);color:var(--dsw-static-green-500)}.KFXqYa_feeChipAlert{background:color-mix(in srgb, var(--dsw-static-amber-500) 16%, transparent);color:var(--dsw-static-amber-500)}.KFXqYa_feeChipError{background:color-mix(in srgb, var(--dsw-static-red-500) 14%, transparent);color:var(--dsw-static-red-500)}.KFXqYa_balanceCell{align-items:center;gap:6px;display:inline-flex;position:relative}.KFXqYa_balanceDays{color:var(--dsw-alias-label-caption);white-space:nowrap;font-size:10.5px;line-height:14px}.KFXqYa_balanceDaysLow{color:var(--dsw-static-red-500);font-weight:600}.KFXqYa_balanceDaysBadge{border:1px solid var(--dsw-alias-label-caption);background:color-mix(in srgb, var(--dsw-alias-label-caption) 10%, transparent);min-width:24px;height:24px;color:var(--dsw-alias-label-secondary);cursor:pointer;border-radius:12px;justify-content:center;align-items:center;padding:0 6px;font-size:10.5px;font-weight:600;line-height:1;display:inline-flex}.KFXqYa_balanceDaysBadge:hover{border-color:var(--dsw-alias-label-secondary);background:color-mix(in srgb, var(--dsw-alias-label-caption) 18%, transparent)}.KFXqYa_balanceDaysBadgeLow{color:var(--dsw-static-red-500);border-color:var(--dsw-static-red-500);background:color-mix(in srgb, var(--dsw-static-red-500) 10%, transparent)}.KFXqYa_balanceDetailPop{z-index:20;background:var(--dsw-alias-bg-layer-3);border:1px solid var(--dsw-alias-label-caption);white-space:nowrap;border-radius:8px;flex-direction:column;gap:6px;min-width:180px;padding:8px 10px;display:inline-flex;position:absolute;top:calc(100% + 6px);right:0;box-shadow:0 6px 20px #0000002e}.KFXqYa_balanceDetailHead{justify-content:space-between;align-items:center;gap:12px;display:flex}.KFXqYa_balanceDetailTitle{color:var(--dsw-alias-label-primary);font-size:12px;font-weight:600}.KFXqYa_balanceDetailClose{cursor:pointer;color:var(--dsw-alias-label-caption);background:0 0;border:none;font-size:14px;line-height:1}.KFXqYa_balanceDetailClose:hover{color:var(--dsw-alias-label-primary)}.KFXqYa_balanceDetailGrid{flex-direction:column;gap:4px;display:inline-flex}.KFXqYa_balanceDetailRow{color:var(--dsw-alias-label-secondary);font-variant-numeric:tabular-nums;justify-content:space-between;gap:16px;font-size:11px;line-height:15px;display:flex}.KFXqYa_balanceDetailLabel{color:var(--dsw-alias-label-caption)}.KFXqYa_balanceDetailValue{color:var(--dsw-alias-label-primary);font-weight:500}body[data-zine-mode] .KFXqYa_trigger,body[data-zine-mode] .KFXqYa_triggerPop,body[data-zine-mode] .KFXqYa_railButton{display:none}body[data-zine-mode] .KFXqYa_dashboardHead{background:#000;border-bottom:2px solid #e8ff00}body[data-zine-mode] .KFXqYa_headTitleRow{align-items:center;gap:8px;margin-top:4px;display:flex}body[data-zine-mode] .KFXqYa_dashboardTitle{color:#e8ff00;letter-spacing:.04em;text-transform:uppercase;text-shadow:0 0 8px #e8ff0066;font-weight:900}body[data-zine-mode] .KFXqYa_dashboardSubtitle{color:#c9d98a;letter-spacing:.08em;text-transform:uppercase;font-size:10px}body[data-zine-mode] .KFXqYa_closeButton{color:#0a0a05;background:#ff2d95;border:1.5px solid #ff2d95;border-radius:0;box-shadow:0 0 10px #ff2d9573}body[data-zine-mode] .KFXqYa_hero{background:#000;border:2.5px solid #e8ff00;border-radius:0;position:relative;box-shadow:0 0 0 1px #0009,0 0 24px #e8ff002e}body[data-zine-mode] .KFXqYa_heroLabel{color:#c9d98a;letter-spacing:.12em;text-transform:uppercase;font-size:10px;font-weight:900}body[data-zine-mode] .KFXqYa_heroValue{color:#e8ff00;letter-spacing:-.02em;text-shadow:0 0 12px #e8ff0073;-webkit-text-fill-color:#e8ff00;background:0 0;font-size:38px;font-weight:900}body[data-zine-mode] .KFXqYa_heroMeta{color:#c9d98a;letter-spacing:.06em;text-transform:uppercase;font-size:10.5px}body[data-zine-mode] .KFXqYa_heroSideLabel{color:#c9d98a;letter-spacing:.1em;text-transform:uppercase;font-size:10px;font-weight:900}body[data-zine-mode] .KFXqYa_heroSideValue{color:#e8ff00;text-shadow:0 0 6px #e8ff0059}body[data-zine-mode] .KFXqYa_delta{font-weight:900}body[data-zine-mode] .KFXqYa_deltaUp{color:#ff2d95}body[data-zine-mode] .KFXqYa_deltaDown{color:#c9d98a}body[data-zine-mode] .KFXqYa_tabNav{background:#000;border-bottom:2px solid #e8ff00}body[data-zine-mode] .KFXqYa_tabButton{color:#c9d98a;letter-spacing:.08em;text-transform:uppercase;border-radius:0;font-size:10.5px;font-weight:900}body[data-zine-mode] .KFXqYa_tabButton:hover,body[data-zine-mode] .KFXqYa_tabButton:focus-visible{color:#e8ff00;background:#e8ff001f}body[data-zine-mode] .KFXqYa_tabButtonActive,body[data-zine-mode] .KFXqYa_tabButtonActive:hover,body[data-zine-mode] .KFXqYa_tabButtonActive:focus-visible{color:#0a0a05;background:#e8ff00;box-shadow:0 0 10px #e8ff0073}body[data-zine-mode] .KFXqYa_panel{background:#000;border:2px solid #e8ff00;border-radius:0}body[data-zine-mode] .KFXqYa_trendPanel{position:relative}body[data-zine-mode] .KFXqYa_panelTitle{color:#e8ff00;letter-spacing:.06em;text-transform:uppercase;text-shadow:0 0 6px #e8ff0066;font-weight:900}body[data-zine-mode] .KFXqYa_panelHint{color:#c9d98a;letter-spacing:.08em;text-transform:uppercase;font-size:10px;font-weight:900}body[data-zine-mode] .KFXqYa_modelTableScroll{background:#000;border:1.5px solid #e8ff0080;border-radius:0}.KFXqYa_currencyToggle{background:var(--dsw-alias-bg-layer-3);border:none;border-radius:8px;align-items:center;gap:2px;margin-right:8px;padding:2px;display:inline-flex}.KFXqYa_currencyButton{color:var(--dsw-alias-label-secondary);white-space:nowrap;cursor:pointer;background:0 0;border:0;border-radius:6px;padding:4px 8px;font-size:11px;font-weight:700;line-height:1}.KFXqYa_currencyButtonActive{background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary)}.KFXqYa_subscriptionGrid{grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:10px;margin-top:10px;display:grid}.KFXqYa_subscriptionCard{border:1px solid color-mix(in srgb, var(--dsw-alias-border-l1) 75%, transparent);background:color-mix(in srgb, var(--dsw-alias-bg-layer-2) 62%, transparent);-webkit-backdrop-filter:blur(12px)saturate(1.3);border-radius:12px;padding:12px 14px;transition:border-color .2s,box-shadow .2s;position:relative;overflow:hidden;box-shadow:0 8px 24px #0000001a}.KFXqYa_subscriptionCard:before{content:\"\";background:linear-gradient(90deg, transparent 0%, var(--dsw-static-amber-500) 30%, var(--dsw-alias-label-primary) 50%, var(--dsw-static-amber-500) 70%, transparent 100%);opacity:.9;pointer-events:none;background-size:200% 100%;height:1.5px;animation:3.6s ease-in-out infinite KFXqYa_subscriptionGoldFlow;position:absolute;top:0;left:0;right:0}@keyframes KFXqYa_subscriptionGoldFlow{0%{background-position:200% 0}to{background-position:-200% 0}}.KFXqYa_subscriptionCard:hover{border-color:color-mix(in srgb, var(--dsw-static-amber-500) 55%, var(--dsw-alias-border-l1));box-shadow:0 10px 30px #00000029}.KFXqYa_subscriptionHead{flex-wrap:wrap;align-items:baseline;gap:6px;margin-bottom:8px;display:flex}.KFXqYa_subscriptionName{font-size:13px;font-weight:700}.KFXqYa_subscriptionPlan{color:var(--dsw-alias-label-secondary);font-size:11px}.KFXqYa_subscriptionPlan[data-kind=code],.KFXqYa_subscriptionPlan[data-kind=token]{color:var(--dsw-alias-label-secondary);background:var(--dsw-alias-bg-layer-3);border-radius:999px;padding:1px 8px;font-weight:500}.KFXqYa_subscriptionTier{color:var(--dsw-alias-label-secondary);margin-left:6px}.KFXqYa_subscriptionAuto{color:var(--dsw-static-blue-500);background:color-mix(in srgb, var(--dsw-static-blue-500) 14%, var(--dsw-alias-bg-layer-2));border-radius:999px;margin-left:6px;padding:1px 6px;font-size:10px}.KFXqYa_subscriptionStatus{color:var(--dsw-alias-label-secondary);margin-bottom:6px;font-size:11px}.KFXqYa_subscriptionWindow{align-items:center;gap:10px;margin-top:8px;font-size:11px;display:flex}.KFXqYa_subscriptionWindowLabel{color:var(--dsw-alias-label-secondary);flex:0 0 44px}.KFXqYa_subscriptionTrack{background:var(--dsw-alias-bg-layer-3);border-radius:3px;flex:1;height:6px;overflow:hidden}.KFXqYa_subscriptionFill{background:var(--dsw-static-blue-500);border-radius:3px;height:100%;transition:width .2s;display:block}.KFXqYa_subscriptionFillWarn{background:var(--dsw-static-amber-500)}.KFXqYa_subscriptionFillOver{background:var(--dsw-static-red-500)}.KFXqYa_subscriptionMeta{flex-direction:column;flex:none;align-items:flex-end;gap:2px;display:flex}.KFXqYa_subscriptionPct{text-align:right;font-variant-numeric:tabular-nums;flex:none;min-width:52px}.KFXqYa_subscriptionExhausted{color:var(--dsw-static-red-500);min-width:52px;font-weight:600}.KFXqYa_subscriptionReset{color:var(--dsw-alias-label-caption);white-space:nowrap;flex:none;font-size:10px}.KFXqYa_providerGroupList{flex-direction:column;gap:10px;display:flex}.KFXqYa_providerGroup{border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-1);border-radius:12px;padding:12px 14px}.KFXqYa_providerGroupHead{justify-content:space-between;align-items:baseline;gap:12px;display:flex}.KFXqYa_providerGroupTitle{align-items:center;gap:7px;min-width:0;display:inline-flex}.KFXqYa_providerGroupName{color:var(--dsw-alias-label-primary);font-size:13px;font-weight:600;line-height:18px}.KFXqYa_providerGroupMeta{flex:none;align-items:center;gap:10px;display:inline-flex}.KFXqYa_providerGroupBadge{color:var(--dsw-static-green-500);background:var(--dsw-alias-bg-layer-2);border-radius:999px;align-items:center;padding:1px 8px;font-size:11px;font-weight:500;line-height:17px;display:inline-flex}.KFXqYa_providerGroupBalance{color:var(--dsw-alias-label-secondary);font-variant-numeric:tabular-nums;white-space:nowrap;align-items:baseline;gap:6px;font-size:12px;line-height:17px;display:inline-flex}.KFXqYa_providerGroupBalanceLabel{color:var(--dsw-alias-label-caption);font-size:11px;line-height:17px}.KFXqYa_roundsFlagBadge{color:var(--dsw-static-neutral-bluish-00);background:var(--dsw-static-red-500);border-radius:999px;margin-left:8px;padding:1px 7px;font-size:10px;font-weight:800}.KFXqYa_rounds{margin-top:10px}.KFXqYa_roundsBars{align-items:flex-end;gap:3px;height:124px;padding:16px 2px 0;display:flex;overflow-x:auto}.KFXqYa_roundsBarCol{border-radius:5px 5px 0 0;flex-direction:column;flex:1 0 28px;justify-content:flex-end;align-items:stretch;height:100%;display:flex;position:relative}.KFXqYa_roundsBarColPeak{background:color-mix(in srgb, var(--dsw-static-amber-500) 16%, transparent)}.KFXqYa_roundsBarColOff{background:var(--dsw-alias-bg-module-platform)}.KFXqYa_roundsBarLabel{text-align:center;color:var(--dsw-alias-label-secondary);white-space:nowrap;text-overflow:ellipsis;max-width:100%;font-size:9px;line-height:1.2;position:absolute;bottom:0;left:0;right:0;overflow:hidden;transform:translateY(-100%)}.KFXqYa_roundsBarWrap{flex:1;align-items:flex-end;min-height:0;display:flex}.KFXqYa_roundsBar{background:var(--dsw-static-blue-500);border-radius:2px 2px 0 0;width:100%;min-height:2px;position:relative}.KFXqYa_roundsBarFlagged{background:var(--dsw-static-red-500);border-radius:2px 2px 0 0;width:100%;min-height:2px;position:relative}.KFXqYa_roundsFlagMark{background:var(--dsw-static-red-500);border-radius:50%;width:7px;height:7px;position:absolute;top:-3px;right:-3px}.KFXqYa_roundsAxis{color:var(--dsw-alias-label-secondary);justify-content:space-between;margin-top:6px;font-size:10px;display:flex}.KFXqYa_roundsEmpty{color:var(--dsw-alias-label-secondary);margin-top:10px;font-size:12px}.KFXqYa_heatmap{margin-top:10px}.KFXqYa_heatmapGrid{grid-template-columns:repeat(7,minmax(0,1fr));gap:8px;display:grid}.KFXqYa_heatmapCellEmpty{background:var(--dsw-alias-bg-layer-1);height:30px;color:var(--dsw-alias-label-dimmed);font-variant-numeric:tabular-nums;border-radius:8px;justify-content:center;align-items:center;font-size:11px;display:flex}.KFXqYa_heatmapCell{font-variant-numeric:tabular-nums;cursor:pointer;border:0;border-radius:8px;justify-content:center;align-items:center;height:30px;padding:0;font-size:11px;display:flex}.KFXqYa_heatmapCell[data-level=\"0\"],.KFXqYa_heatmapCell[data-level=\"1\"],.KFXqYa_heatmapCell[data-level=\"2\"]{color:var(--dsw-alias-label-primary)}.KFXqYa_heatmapCell[data-level=\"3\"],.KFXqYa_heatmapCell[data-level=\"4\"]{color:var(--dsw-static-neutral-bluish-00)}.KFXqYa_heatmapFooter{color:var(--dsw-alias-label-secondary);align-items:center;gap:8px;margin-top:10px;font-size:10px;display:flex}.KFXqYa_heatmapLegend{gap:3px;display:inline-flex}.KFXqYa_heatmapLegend i{border-radius:4px;width:14px;height:14px;display:block}.KFXqYa_heatmapHover{font-variant-numeric:tabular-nums;margin-left:auto}.KFXqYa_heatmapRangeSwitch{gap:4px;margin-left:auto;display:inline-flex}.KFXqYa_heatmapRangeButton{border:1px solid var(--dsw-alias-border-l1);color:var(--dsw-alias-text-secondary);cursor:pointer;background:0 0;border-radius:6px;padding:2px 8px;font-size:11px;line-height:1.4}.KFXqYa_heatmapRangeButtonActive{color:var(--dsw-alias-text-primary);border-color:currentColor;font-weight:600}.KFXqYa_heatmapYear{flex-direction:column;gap:6px;display:flex}.KFXqYa_heatmapYearBody{align-items:flex-start;gap:6px;display:flex}.KFXqYa_heatmapYearWeekdays{color:var(--dsw-alias-text-tertiary);flex:none;grid-template-rows:repeat(7,11px);gap:3px;padding-top:12px;font-size:9px;line-height:11px;display:grid}.KFXqYa_heatmapYearWeekday{white-space:nowrap;text-align:right;height:11px}.KFXqYa_heatmapYearMonths{min-width:max-content;color:var(--dsw-alias-text-tertiary);grid-template-columns:repeat(52,11px);gap:3px;font-size:9px;line-height:12px;display:grid;overflow:visible}.KFXqYa_heatmapYearMonth{white-space:nowrap;overflow:visible}.KFXqYa_heatmapYearScroll{padding-bottom:2px;overflow-x:auto}.KFXqYa_heatmapYearGrid{grid-template-rows:repeat(7,11px);grid-auto-flow:column;gap:3px;min-width:max-content;display:grid}.KFXqYa_heatmapYearCell{cursor:pointer;border:0;border-radius:2px;width:11px;height:11px;padding:0}.KFXqYa_triggerPopSubscription{width:auto;left:0;right:0}.KFXqYa_floatSub{flex-direction:column;gap:6px;min-width:0;display:flex}.KFXqYa_floatSubHead{flex-wrap:wrap;align-items:baseline;gap:6px;min-width:0;display:flex}.KFXqYa_floatSubName{color:var(--dsw-alias-label-primary);font-size:12px;font-weight:700}.KFXqYa_floatSubPlan{color:var(--dsw-alias-label-secondary);font-size:10px}.KFXqYa_floatSub .KFXqYa_subscriptionWindow{flex-wrap:wrap;gap:4px 10px}.KFXqYa_floatSub .KFXqYa_subscriptionWindowLabel{flex:none}.KFXqYa_floatSub .KFXqYa_subscriptionMeta{min-width:0;max-width:100%}.KFXqYa_floatSub .KFXqYa_subscriptionPct{min-width:0}.KFXqYa_floatSub .KFXqYa_subscriptionReset{white-space:normal;overflow-wrap:anywhere}.KFXqYa_triggerPopEmpty{color:var(--dsw-alias-label-tertiary);padding:2px 0;font-size:11px;line-height:1.5}.KFXqYa_triggerPopSwitcher{justify-content:flex-end;align-items:center;gap:8px;margin-top:2px;display:flex}.KFXqYa_triggerPopSwitchBtn{color:var(--dsw-alias-label-secondary);cursor:pointer;background:0 0;border:0;border-radius:6px;padding:2px 4px;font-size:14px;line-height:1}.KFXqYa_triggerPopSwitchBtn:hover{color:var(--dsw-alias-label-primary);background:color-mix(in srgb, var(--dsw-alias-border-l1) 45%, transparent)}.KFXqYa_triggerPopSwitchCount{color:var(--dsw-alias-label-tertiary);font-variant-numeric:tabular-nums;font-size:10px}.KFXqYa_floatModeRow{gap:8px;margin-bottom:8px;display:flex}.KFXqYa_floatModeBtn{border:1px solid color-mix(in srgb, var(--dsw-alias-border-l1) 75%, transparent);background:color-mix(in srgb, var(--dsw-alias-bg-layer-2) 60%, transparent);color:var(--dsw-alias-label-secondary);white-space:nowrap;cursor:pointer;border-radius:10px;flex:1;padding:7px 10px;font-size:12px}.KFXqYa_floatModeBtnOn{border-color:var(--dsw-static-blue-500);color:var(--dsw-alias-label-primary);background:color-mix(in srgb, var(--dsw-static-blue-500) 16%, transparent)}.KFXqYa_floatTargets{flex-wrap:wrap;gap:6px;margin-bottom:8px;display:flex}.KFXqYa_floatTarget{color:var(--dsw-alias-label-secondary);cursor:pointer;align-items:center;gap:5px;font-size:12px;display:inline-flex}.KFXqYa_floatTargetLabel{color:var(--dsw-alias-label-secondary)}.KFXqYa_staleNotice{color:var(--dsw-static-amber-500);background:color-mix(in srgb, var(--dsw-static-amber-500) 12%, transparent);border:1px solid color-mix(in srgb, var(--dsw-static-amber-500) 30%, transparent);border-radius:10px;align-items:center;gap:6px;margin:0 0 10px;padding:8px 10px;font-size:11px;display:flex}.KFXqYa_plgHead{align-items:flex-start;gap:12px;display:flex}.KFXqYa_plgIcon{border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-1);width:40px;height:40px;color:var(--dsw-alias-label-secondary);border-radius:10px;flex:none;justify-content:center;align-items:center;display:inline-flex}.KFXqYa_plgTitle{flex-direction:column;gap:4px;min-width:0;display:flex}.KFXqYa_plgNameRow{align-items:center;gap:8px;display:flex}.KFXqYa_plgName{color:var(--dsw-alias-label-primary);margin:0;font-size:13px;font-weight:600;line-height:18px}.KFXqYa_plgTag{height:18px;color:var(--dsw-alias-label-secondary);background:var(--dsw-alias-bg-layer-3);white-space:nowrap;border-radius:5px;align-items:center;padding:0 6px;font-size:10px;font-weight:600;display:inline-flex}.KFXqYa_plgDesc{color:var(--dsw-alias-label-secondary);margin:0;font-size:11px;line-height:16px}.KFXqYa_plgGrid{border-top:1px solid var(--dsw-alias-border-l1);grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;padding-top:12px;display:grid}.KFXqYa_plgItem{flex-direction:column;gap:2px;min-width:0;display:flex}.KFXqYa_plgLabel{color:var(--dsw-alias-label-tertiary);font-size:10px;line-height:14px}.KFXqYa_plgVal{color:var(--dsw-alias-label-primary);word-break:break-all;font-size:12px;line-height:17px}.KFXqYa_plgLink{color:var(--dsw-static-blue-500);word-break:break-all;font-size:12px;line-height:17px;text-decoration:none}.KFXqYa_plgLink:hover{text-decoration:underline}.KFXqYa_pluginInfo{flex-direction:column;gap:8px;margin-top:10px;display:flex}.KFXqYa_pluginInfoRow{align-items:baseline;gap:12px;font-size:12px;display:flex}.KFXqYa_pluginInfoLabel{color:var(--dsw-alias-label-secondary);flex:0 0 72px}.KFXqYa_pluginInfoValue{color:var(--dsw-alias-label-primary);word-break:break-all}.KFXqYa_pluginInfoLink{color:var(--dsw-static-blue-500);word-break:break-all;text-decoration:none}.KFXqYa_pluginInfoLink:hover{text-decoration:underline}.KFXqYa_tokenPanel{flex-direction:column;gap:14px;display:flex}.KFXqYa_tokenModelBar{background:var(--dsw-alias-bg-layer-2);border-radius:999px;height:8px;overflow:hidden}.KFXqYa_tokenModelParts{height:100%;display:flex}.KFXqYa_tokenModelPartIn{background:var(--dsw-static-blue-500)}.KFXqYa_tokenModelPartOut{background:var(--dsw-static-amber-500)}.KFXqYa_tokenModelShareRow{align-items:center;gap:6px;display:inline-flex}@media (width<=640px){.KFXqYa_kpiGrid{grid-template-columns:repeat(2,minmax(0,1fr))}.KFXqYa_hero{gap:14px}.KFXqYa_heroTop{flex-direction:column;align-items:flex-start;gap:12px}.KFXqYa_heroGauge{width:72px;height:72px}.KFXqYa_heroSide{gap:12px}.KFXqYa_heroSideSpacer{display:none}}.KFXqYa_peakCard{z-index:2000;border:1px solid var(--dsw-alias-border-l1);background:color-mix(in srgb, var(--dsw-alias-bg-layer-2) 82%, transparent);-webkit-backdrop-filter:blur(12px)saturate(1.2);border-radius:12px;flex-direction:column;gap:8px;min-width:280px;max-width:380px;padding:16px;animation:.2s KFXqYa_peakAlertIn;display:flex;position:fixed;box-shadow:0 4px 16px #00000014}.KFXqYa_peakCardCorner{bottom:18px;right:18px}.KFXqYa_peakCardCenter{top:20%;left:50%;transform:translate(-50%)}.KFXqYa_peakCardPeak{color:var(--dsw-static-blue-500)}.KFXqYa_peakCardOff{color:var(--dsw-static-green-500)}.KFXqYa_peakHead{justify-content:space-between;align-items:center;gap:8px;display:flex}.KFXqYa_peakTag{white-space:nowrap;border-radius:6px;align-items:center;gap:6px;height:20px;padding:0 8px;font-size:11px;font-weight:600;line-height:14px;display:inline-flex}.KFXqYa_peakTagPrimary{background:var(--dsw-alias-bg-layer-3);color:var(--dsw-static-blue-500)}.KFXqYa_peakTagSuccess{background:var(--dsw-alias-bg-layer-3);color:var(--dsw-static-green-500)}.KFXqYa_peakDot{border-radius:999px;flex:none;width:6px;height:6px}.KFXqYa_peakDotPrimary{background:var(--dsw-static-blue-500)}.KFXqYa_peakDotSuccess{background:var(--dsw-static-green-500)}.KFXqYa_peakClose{width:24px;height:24px;color:var(--dsw-alias-label-secondary);cursor:pointer;background:0 0;border:0;border-radius:6px;justify-content:center;align-items:center;font-size:15px;line-height:1;transition:background-color .14s,color .14s;display:inline-flex}.KFXqYa_peakClose:hover{color:var(--dsw-alias-label-primary);background:var(--dsw-alias-bg-layer-2)}.KFXqYa_peakCount{font-variant-numeric:tabular-nums;font-size:28px;font-weight:700;line-height:34px}.KFXqYa_peakCountPrimary{color:var(--dsw-static-blue-500)}.KFXqYa_peakCountSuccess{color:var(--dsw-static-green-500)}.KFXqYa_peakDesc{color:var(--dsw-alias-label-secondary);margin:0;font-size:12px;line-height:18px}@keyframes KFXqYa_peakAlertIn{0%{opacity:0}to{opacity:1}}.KFXqYa_peakAlertPanel{border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-1);border-radius:16px;flex-direction:column;gap:10px;padding:14px 16px;display:flex}.KFXqYa_peakAlertPanelHead{justify-content:space-between;align-items:center;gap:10px;display:flex}.KFXqYa_peakAlertPanelLabel{color:var(--dsw-alias-label-primary);font-size:13px;font-weight:600}.KFXqYa_peakAlertPanelBody{flex-wrap:wrap;align-items:center;gap:12px 16px;display:flex}.KFXqYa_peakAlertField{color:var(--dsw-alias-label-secondary);align-items:center;gap:8px;font-size:12px;display:inline-flex}.KFXqYa_peakAlertNum{border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-2);width:56px;color:var(--dsw-alias-label-primary);font-variant-numeric:tabular-nums;border-radius:6px;padding:4px 6px}.KFXqYa_peakAlertSelect{border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary);border-radius:6px;padding:4px 6px;font-size:12px}.KFXqYa_peakAlertCheck{color:var(--dsw-alias-label-secondary);align-items:center;gap:6px;font-size:12px;display:inline-flex}.KFXqYa_peakAlertPreview{border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary);cursor:pointer;border-radius:6px;padding:5px 10px;font-size:12px}.KFXqYa_peakAlertPreview:hover{background:var(--dsw-alias-bg-layer-3)}.KFXqYa_setCard{border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-2);border-radius:12px;flex-direction:column;gap:12px;padding:16px 18px;display:flex}.KFXqYa_setCardHead{justify-content:space-between;align-items:flex-start;gap:12px;display:flex}.KFXqYa_setCardMeta{flex-direction:column;gap:4px;min-width:0;display:flex}.KFXqYa_setCardTitle{color:var(--dsw-alias-label-primary);margin:0;font-size:13px;font-weight:600;line-height:18px}.KFXqYa_setCardDesc{color:var(--dsw-alias-label-secondary);margin:0;font-size:11px;line-height:16px}.KFXqYa_ctlCol{flex-direction:column;gap:10px;padding-top:2px;display:flex}.KFXqYa_ctlRow{align-items:center;gap:12px;min-height:28px;display:flex}.KFXqYa_ctlRowStretch{display:flex}.KFXqYa_ctlLabel{color:var(--dsw-alias-label-secondary);flex:0 0 96px;font-size:11px;line-height:16px}.KFXqYa_ctlGroup{flex-wrap:wrap;align-items:center;gap:8px;display:inline-flex}.KFXqYa_rdo{color:var(--dsw-alias-label-secondary);cursor:pointer;white-space:nowrap;align-items:center;gap:6px;font-size:12px;line-height:16px;display:inline-flex}.KFXqYa_rdo input{opacity:0;pointer-events:none;position:absolute}.KFXqYa_rdoDot{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1);border-radius:50%;flex:none;width:14px;height:14px;position:relative}.KFXqYa_rdo input:checked+.KFXqYa_rdoDot{border-color:var(--dsw-static-blue-500)}.KFXqYa_rdo input:checked+.KFXqYa_rdoDot:after{content:\"\";background:var(--dsw-static-blue-500);border-radius:50%;position:absolute;inset:3px}.KFXqYa_inp{border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-1);border-radius:6px;align-items:center;gap:4px;padding:2px 6px;display:inline-flex}.KFXqYa_affix{color:var(--dsw-alias-label-tertiary);font-size:11px;line-height:16px}.KFXqYa_sel{border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);border-radius:6px;padding:3px 8px;font-size:12px;line-height:16px}.KFXqYa_prog{background:var(--dsw-alias-bg-module-platform);border-radius:999px;flex:1;min-width:0;height:6px;overflow:hidden}.KFXqYa_progFill{background:var(--dsw-static-blue-500);border-radius:999px;height:100%;transition:width .2s}.KFXqYa_btn{border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-1);height:28px;color:var(--dsw-alias-label-secondary);cursor:pointer;border-radius:999px;align-items:center;gap:6px;padding:0 12px;font-size:12px;line-height:16px;transition:border-color .16s,color .16s,background-color .16s;display:inline-flex}.KFXqYa_btn:hover{border-color:var(--dsw-static-blue-500);color:var(--dsw-alias-label-primary);background:color-mix(in srgb, var(--dsw-static-blue-500) 12%, var(--dsw-alias-bg-layer-1))}.KFXqYa_settingsHead{flex-direction:column;gap:4px;margin-bottom:2px;display:flex}.KFXqYa_settingsTitle{letter-spacing:-.005em;color:var(--dsw-alias-label-primary);margin:0;font-size:15px;font-weight:650;line-height:22px}.KFXqYa_settingsHint{color:var(--dsw-alias-label-caption);margin:0;font-size:11px;line-height:16px}.KFXqYa_budgetHint,.KFXqYa_peakAlertHint{color:var(--dsw-alias-label-caption);margin:6px 0 0;font-size:11px;line-height:16px}";
		const tagId = "@kenz1117/dsh-ui-usage-billing/UsageBilling.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@kenz1117/dsh-ui-usage-billing";
			tag.dataset.pluginCss = tagId;
			tag.textContent = css;
			document.head.appendChild(tag);
		}
		var UsageBilling_module_css_default = {
			"budgetFillWarn": "KFXqYa_budgetFillWarn",
			"subscriptionCard": "KFXqYa_subscriptionCard",
			"healthBadgeOk": "KFXqYa_healthBadgeOk",
			"floatModeBtn": "KFXqYa_floatModeBtn",
			"peakAlertHint": "KFXqYa_peakAlertHint",
			"ubNotesTerm": "KFXqYa_ubNotesTerm",
			"popModelLabel": "KFXqYa_popModelLabel",
			"peakCount": "KFXqYa_peakCount",
			"dashboardModal": "KFXqYa_dashboardModal",
			"dashboardBody": "KFXqYa_dashboardBody",
			"rateBadgeLive": "KFXqYa_rateBadgeLive",
			"ubTagAlert": "KFXqYa_ubTagAlert",
			"feeNum": "KFXqYa_feeNum",
			"shareDot": "KFXqYa_shareDot",
			"providerGroupBadge": "KFXqYa_providerGroupBadge",
			"pluginInfoLabel": "KFXqYa_pluginInfoLabel",
			"siteRowMeta": "KFXqYa_siteRowMeta",
			"sel": "KFXqYa_sel",
			"tokenModelPartOut": "KFXqYa_tokenModelPartOut",
			"heroBudget": "KFXqYa_heroBudget",
			"triggerPopLabel": "KFXqYa_triggerPopLabel",
			"modelProvider": "KFXqYa_modelProvider",
			"plgNameRow": "KFXqYa_plgNameRow",
			"budgetControls": "KFXqYa_budgetControls",
			"railButton": "KFXqYa_railButton",
			"heatmap": "KFXqYa_heatmap",
			"ubAlertLeft": "KFXqYa_ubAlertLeft",
			"floatSubName": "KFXqYa_floatSubName",
			"rangeButtonActive": "KFXqYa_rangeButtonActive",
			"triggerPopSwitcher": "KFXqYa_triggerPopSwitcher",
			"kpiTile": "KFXqYa_kpiTile",
			"triggerPopValueStack": "KFXqYa_triggerPopValueStack",
			"balanceDetailClose": "KFXqYa_balanceDetailClose",
			"ctlLabel": "KFXqYa_ctlLabel",
			"healthBadgeBad": "KFXqYa_healthBadgeBad",
			"healthOk": "KFXqYa_healthOk",
			"siteRowCallsLow": "KFXqYa_siteRowCallsLow",
			"tabNav": "KFXqYa_tabNav",
			"deltaDown": "KFXqYa_deltaDown",
			"peakDotPrimary": "KFXqYa_peakDotPrimary",
			"subscriptionWindow": "KFXqYa_subscriptionWindow",
			"heatmapLegend": "KFXqYa_heatmapLegend",
			"rowline": "KFXqYa_rowline",
			"balanceDetailHead": "KFXqYa_balanceDetailHead",
			"peakCountSuccess": "KFXqYa_peakCountSuccess",
			"rowlineRight": "KFXqYa_rowlineRight",
			"subscriptionAuto": "KFXqYa_subscriptionAuto",
			"ubAlertNote": "KFXqYa_ubAlertNote",
			"feeItem": "KFXqYa_feeItem",
			"floatSub": "KFXqYa_floatSub",
			"chartLegend": "KFXqYa_chartLegend",
			"siteRowCost": "KFXqYa_siteRowCost",
			"heatmapYearCell": "KFXqYa_heatmapYearCell",
			"peakCard": "KFXqYa_peakCard",
			"ubChipLabel": "KFXqYa_ubChipLabel",
			"metricCell": "KFXqYa_metricCell",
			"heroGaugePctOver": "KFXqYa_heroGaugePctOver",
			"ubTablewrap": "KFXqYa_ubTablewrap",
			"tabPanelIn": "KFXqYa_tabPanelIn",
			"panelHead": "KFXqYa_panelHead",
			"triggerPopFootStrong": "KFXqYa_triggerPopFootStrong",
			"chartTooltipDate": "KFXqYa_chartTooltipDate",
			"balanceDaysBadgeLow": "KFXqYa_balanceDaysBadgeLow",
			"peakAlertPanelHead": "KFXqYa_peakAlertPanelHead",
			"pluginInfoRow": "KFXqYa_pluginInfoRow",
			"floatModeRow": "KFXqYa_floatModeRow",
			"setCardHead": "KFXqYa_setCardHead",
			"rdoDot": "KFXqYa_rdoDot",
			"ubStatCard": "KFXqYa_ubStatCard",
			"bucketStat": "KFXqYa_bucketStat",
			"feeSep": "KFXqYa_feeSep",
			"modelCell": "KFXqYa_modelCell",
			"triggerPopMetric": "KFXqYa_triggerPopMetric",
			"feeBar": "KFXqYa_feeBar",
			"triggerPopBadge": "KFXqYa_triggerPopBadge",
			"trigger": "KFXqYa_trigger",
			"shareSegOff": "KFXqYa_shareSegOff",
			"roundsBarWrap": "KFXqYa_roundsBarWrap",
			"feeChipAlert": "KFXqYa_feeChipAlert",
			"chartAxisLabel": "KFXqYa_chartAxisLabel",
			"chartTooltip": "KFXqYa_chartTooltip",
			"ubRate": "KFXqYa_ubRate",
			"subscriptionGoldFlow": "KFXqYa_subscriptionGoldFlow",
			"modelDot": "KFXqYa_modelDot",
			"peakAlertPreview": "KFXqYa_peakAlertPreview",
			"heroBudgetFillOver": "KFXqYa_heroBudgetFillOver",
			"triggerPopMetrics": "KFXqYa_triggerPopMetrics",
			"balanceDetailValue": "KFXqYa_balanceDetailValue",
			"heroSide": "KFXqYa_heroSide",
			"ubNotesDesc": "KFXqYa_ubNotesDesc",
			"btn": "KFXqYa_btn",
			"triggerPopFootStatusLow": "KFXqYa_triggerPopFootStatusLow",
			"progFill": "KFXqYa_progFill",
			"switch": "KFXqYa_switch",
			"modelName": "KFXqYa_modelName",
			"peakCountPrimary": "KFXqYa_peakCountPrimary",
			"numCol": "KFXqYa_numCol",
			"healthBad": "KFXqYa_healthBad",
			"pricingToggle": "KFXqYa_pricingToggle",
			"budgetTrack": "KFXqYa_budgetTrack",
			"siteRow": "KFXqYa_siteRow",
			"tabButtonActive": "KFXqYa_tabButtonActive",
			"flatTag": "KFXqYa_flatTag",
			"balanceDaysBadge": "KFXqYa_balanceDaysBadge",
			"currencyToggle": "KFXqYa_currencyToggle",
			"providerGroupList": "KFXqYa_providerGroupList",
			"siteRowCalls": "KFXqYa_siteRowCalls",
			"setCard": "KFXqYa_setCard",
			"triggerPopAlert": "KFXqYa_triggerPopAlert",
			"triggerPopFootName": "KFXqYa_triggerPopFootName",
			"roundsBarLabel": "KFXqYa_roundsBarLabel",
			"kpiDetail": "KFXqYa_kpiDetail",
			"heatmapCellEmpty": "KFXqYa_heatmapCellEmpty",
			"budgetInput": "KFXqYa_budgetInput",
			"heroGaugeSvg": "KFXqYa_heroGaugeSvg",
			"triggerMetric": "KFXqYa_triggerMetric",
			"peakAlertPanelLabel": "KFXqYa_peakAlertPanelLabel",
			"roundsFlagMark": "KFXqYa_roundsFlagMark",
			"peakCardCorner": "KFXqYa_peakCardCorner",
			"tabButton": "KFXqYa_tabButton",
			"triggerPopSubscription": "KFXqYa_triggerPopSubscription",
			"pluginInfo": "KFXqYa_pluginInfo",
			"triggerPopBars": "KFXqYa_triggerPopBars",
			"heroGaugeCenter": "KFXqYa_heroGaugeCenter",
			"chartBar": "KFXqYa_chartBar",
			"ubTagSuccess": "KFXqYa_ubTagSuccess",
			"triggerIcon": "KFXqYa_triggerIcon",
			"rowlineMuted": "KFXqYa_rowlineMuted",
			"triggerPopMetricValue": "KFXqYa_triggerPopMetricValue",
			"balanceCell": "KFXqYa_balanceCell",
			"ubAlert": "KFXqYa_ubAlert",
			"hero": "KFXqYa_hero",
			"rangeToggle": "KFXqYa_rangeToggle",
			"subscriptionReset": "KFXqYa_subscriptionReset",
			"floatModeBtnOn": "KFXqYa_floatModeBtnOn",
			"bucketStatLabel": "KFXqYa_bucketStatLabel",
			"popModelRow": "KFXqYa_popModelRow",
			"ubCardTitle": "KFXqYa_ubCardTitle",
			"subscriptionStatus": "KFXqYa_subscriptionStatus",
			"subscriptionExhausted": "KFXqYa_subscriptionExhausted",
			"triggerPopTitle": "KFXqYa_triggerPopTitle",
			"balanceDetailGrid": "KFXqYa_balanceDetailGrid",
			"currencyButton": "KFXqYa_currencyButton",
			"chartCrosshair": "KFXqYa_chartCrosshair",
			"ubModelDot": "KFXqYa_ubModelDot",
			"reconcileNotice": "KFXqYa_reconcileNotice",
			"triggerPopRow": "KFXqYa_triggerPopRow",
			"triggerPopFoot": "KFXqYa_triggerPopFoot",
			"ubCardControlGroup": "KFXqYa_ubCardControlGroup",
			"na": "KFXqYa_na",
			"peakAlertPanel": "KFXqYa_peakAlertPanel",
			"popTagSub": "KFXqYa_popTagSub",
			"dashboardSubtitle": "KFXqYa_dashboardSubtitle",
			"heroMain": "KFXqYa_heroMain",
			"tokenModelParts": "KFXqYa_tokenModelParts",
			"popTitle": "KFXqYa_popTitle",
			"roundsBarColPeak": "KFXqYa_roundsBarColPeak",
			"triggerPopOpenBtn": "KFXqYa_triggerPopOpenBtn",
			"chartBarPlaceholder": "KFXqYa_chartBarPlaceholder",
			"ubPricepair": "KFXqYa_ubPricepair",
			"peakCardPeak": "KFXqYa_peakCardPeak",
			"siteKindTag": "KFXqYa_siteKindTag",
			"subscriptionWindowLabel": "KFXqYa_subscriptionWindowLabel",
			"chartLegendLine": "KFXqYa_chartLegendLine",
			"heroBudgetValue": "KFXqYa_heroBudgetValue",
			"shareLegend": "KFXqYa_shareLegend",
			"heroBudgetTrack": "KFXqYa_heroBudgetTrack",
			"ubExtraNote": "KFXqYa_ubExtraNote",
			"triggerPopBadgeDirect": "KFXqYa_triggerPopBadgeDirect",
			"ubExtraRow": "KFXqYa_ubExtraRow",
			"balanceDetailTitle": "KFXqYa_balanceDetailTitle",
			"heroGaugeLabel": "KFXqYa_heroGaugeLabel",
			"planTag": "KFXqYa_planTag",
			"heroTop": "KFXqYa_heroTop",
			"ubExtraName": "KFXqYa_ubExtraName",
			"pricingChevronOpen": "KFXqYa_pricingChevronOpen",
			"ctlGroup": "KFXqYa_ctlGroup",
			"triggerPopMetricLabel": "KFXqYa_triggerPopMetricLabel",
			"ubStatGrid": "KFXqYa_ubStatGrid",
			"pluginInfoLink": "KFXqYa_pluginInfoLink",
			"rowlineDrillWrap": "KFXqYa_rowlineDrillWrap",
			"ubStatValue": "KFXqYa_ubStatValue",
			"heroCurrency": "KFXqYa_heroCurrency",
			"heatmapFooter": "KFXqYa_heatmapFooter",
			"rowlist": "KFXqYa_rowlist",
			"providerGroupName": "KFXqYa_providerGroupName",
			"heroBudgetFill": "KFXqYa_heroBudgetFill",
			"rangeButton": "KFXqYa_rangeButton",
			"switchKnob": "KFXqYa_switchKnob",
			"chartEmpty": "KFXqYa_chartEmpty",
			"providerGroupHead": "KFXqYa_providerGroupHead",
			"peakDesc": "KFXqYa_peakDesc",
			"heroSideItem": "KFXqYa_heroSideItem",
			"estimatedTag": "KFXqYa_estimatedTag",
			"triggerPopBadgeSub": "KFXqYa_triggerPopBadgeSub",
			"metricGrid": "KFXqYa_metricGrid",
			"budgetValue": "KFXqYa_budgetValue",
			"balanceDaysLow": "KFXqYa_balanceDaysLow",
			"rateBadge": "KFXqYa_rateBadge",
			"peakAlertPanelBody": "KFXqYa_peakAlertPanelBody",
			"setCardMeta": "KFXqYa_setCardMeta",
			"ctlRowStretch": "KFXqYa_ctlRowStretch",
			"roundsBar": "KFXqYa_roundsBar",
			"subscriptionPlan": "KFXqYa_subscriptionPlan",
			"floatTargetLabel": "KFXqYa_floatTargetLabel",
			"chartLegendBar": "KFXqYa_chartLegendBar",
			"plgName": "KFXqYa_plgName",
			"inp": "KFXqYa_inp",
			"feeCount": "KFXqYa_feeCount",
			"billing-trigger": "KFXqYa_billing-trigger",
			"kpiLabel": "KFXqYa_kpiLabel",
			"ubCardHead": "KFXqYa_ubCardHead",
			"subscriptionTrack": "KFXqYa_subscriptionTrack",
			"popDotSub": "KFXqYa_popDotSub",
			"switchOn": "KFXqYa_switchOn",
			"rowlineName": "KFXqYa_rowlineName",
			"triggerPopFootStatus": "KFXqYa_triggerPopFootStatus",
			"budgetHead": "KFXqYa_budgetHead",
			"exportButton": "KFXqYa_exportButton",
			"triggerPopBar": "KFXqYa_triggerPopBar",
			"siteKindDirect": "KFXqYa_siteKindDirect",
			"triggerPop": "KFXqYa_triggerPop",
			"chartStack": "KFXqYa_chartStack",
			"ubModelName": "KFXqYa_ubModelName",
			"budgetInputWrap": "KFXqYa_budgetInputWrap",
			"dashboardHead": "KFXqYa_dashboardHead",
			"setCardTitle": "KFXqYa_setCardTitle",
			"rdo": "KFXqYa_rdo",
			"metricValueSuccess": "KFXqYa_metricValueSuccess",
			"subscriptionMeta": "KFXqYa_subscriptionMeta",
			"roundsEmpty": "KFXqYa_roundsEmpty",
			"triggerPopSwitchCount": "KFXqYa_triggerPopSwitchCount",
			"plgTitle": "KFXqYa_plgTitle",
			"panelHint": "KFXqYa_panelHint",
			"bandPrice": "KFXqYa_bandPrice",
			"shareSeg": "KFXqYa_shareSeg",
			"budget": "KFXqYa_budget",
			"heroGaugePct": "KFXqYa_heroGaugePct",
			"subscriptionFillOver": "KFXqYa_subscriptionFillOver",
			"heatmapYearScroll": "KFXqYa_heatmapYearScroll",
			"triggerPopStrong": "KFXqYa_triggerPopStrong",
			"triggerYen": "KFXqYa_triggerYen",
			"triggerPrimary": "KFXqYa_triggerPrimary",
			"uncataloguedTag": "KFXqYa_uncataloguedTag",
			"floatSubHead": "KFXqYa_floatSubHead",
			"roundsBarColOff": "KFXqYa_roundsBarColOff",
			"peakAlertNum": "KFXqYa_peakAlertNum",
			"tokenModelPartIn": "KFXqYa_tokenModelPartIn",
			"currencyButtonActive": "KFXqYa_currencyButtonActive",
			"providerGroupTitle": "KFXqYa_providerGroupTitle",
			"peakTag": "KFXqYa_peakTag",
			"bucketStatSub": "KFXqYa_bucketStatSub",
			"ubStatDetail": "KFXqYa_ubStatDetail",
			"heroSideLabel": "KFXqYa_heroSideLabel",
			"shareItem": "KFXqYa_shareItem",
			"dashboardTitle": "KFXqYa_dashboardTitle",
			"roundsBarFlagged": "KFXqYa_roundsBarFlagged",
			"ubTagError": "KFXqYa_ubTagError",
			"popModelName": "KFXqYa_popModelName",
			"triggerPopFootTitle": "KFXqYa_triggerPopFootTitle",
			"heroSideValue": "KFXqYa_heroSideValue",
			"bucketThird": "KFXqYa_bucketThird",
			"emptyRow": "KFXqYa_emptyRow",
			"chartDot": "KFXqYa_chartDot",
			"heatmapHover": "KFXqYa_heatmapHover",
			"dashboard": "KFXqYa_dashboard",
			"tokenModelShareRow": "KFXqYa_tokenModelShareRow",
			"subscriptionGrid": "KFXqYa_subscriptionGrid",
			"pricingTable": "KFXqYa_pricingTable",
			"budgetLabel": "KFXqYa_budgetLabel",
			"triggerSub": "KFXqYa_triggerSub",
			"triggerPopValue": "KFXqYa_triggerPopValue",
			"popModelStatus": "KFXqYa_popModelStatus",
			"chartTooltipSwatch": "KFXqYa_chartTooltipSwatch",
			"reconcileText": "KFXqYa_reconcileText",
			"healthIdle": "KFXqYa_healthIdle",
			"popModelStatusLow": "KFXqYa_popModelStatusLow",
			"dashboardRight": "KFXqYa_dashboardRight",
			"balanceDays": "KFXqYa_balanceDays",
			"rounds": "KFXqYa_rounds",
			"heatmapYearBody": "KFXqYa_heatmapYearBody",
			"heatmapYearMonths": "KFXqYa_heatmapYearMonths",
			"peakDot": "KFXqYa_peakDot",
			"budgetHint": "KFXqYa_budgetHint",
			"pricingTip": "KFXqYa_pricingTip",
			"ubModel": "KFXqYa_ubModel",
			"siteRowName": "KFXqYa_siteRowName",
			"popModel": "KFXqYa_popModel",
			"triggerPopName": "KFXqYa_triggerPopName",
			"balanceDetailPop": "KFXqYa_balanceDetailPop",
			"popDotNeutral": "KFXqYa_popDotNeutral",
			"tokenPanel": "KFXqYa_tokenPanel",
			"peakHead": "KFXqYa_peakHead",
			"heatmapGrid": "KFXqYa_heatmapGrid",
			"plgHead": "KFXqYa_plgHead",
			"ctlRow": "KFXqYa_ctlRow",
			"chartGrid": "KFXqYa_chartGrid",
			"subscriptionPct": "KFXqYa_subscriptionPct",
			"pricingChevron": "KFXqYa_pricingChevron",
			"peakClose": "KFXqYa_peakClose",
			"ubTagNeutral": "KFXqYa_ubTagNeutral",
			"ubTagPromo": "KFXqYa_ubTagPromo",
			"staleNotice": "KFXqYa_staleNotice",
			"peakAlertIn": "KFXqYa_peakAlertIn",
			"heroGaugeTrack": "KFXqYa_heroGaugeTrack",
			"providerGroupBalance": "KFXqYa_providerGroupBalance",
			"heatmapRangeButton": "KFXqYa_heatmapRangeButton",
			"bandTagOff": "KFXqYa_bandTagOff",
			"triggerPopFootNotes": "KFXqYa_triggerPopFootNotes",
			"metricValuePrimary": "KFXqYa_metricValuePrimary",
			"plgDesc": "KFXqYa_plgDesc",
			"peakAlertCheck": "KFXqYa_peakAlertCheck",
			"triggerWrap": "KFXqYa_triggerWrap",
			"affix": "KFXqYa_affix",
			"subscriptionFillWarn": "KFXqYa_subscriptionFillWarn",
			"rowlineDrill": "KFXqYa_rowlineDrill",
			"roundsBars": "KFXqYa_roundsBars",
			"peakTagPrimary": "KFXqYa_peakTagPrimary",
			"reconcileDismiss": "KFXqYa_reconcileDismiss",
			"heatmapYearWeekday": "KFXqYa_heatmapYearWeekday",
			"kpiValue": "KFXqYa_kpiValue",
			"ctlCol": "KFXqYa_ctlCol",
			"bucketOfficial": "KFXqYa_bucketOfficial",
			"ubNotesItem": "KFXqYa_ubNotesItem",
			"triggerMain": "KFXqYa_triggerMain",
			"floatSubPlan": "KFXqYa_floatSubPlan",
			"trendPanel": "KFXqYa_trendPanel",
			"roundsFlagBadge": "KFXqYa_roundsFlagBadge",
			"siteRowTitle": "KFXqYa_siteRowTitle",
			"providerGroupMeta": "KFXqYa_providerGroupMeta",
			"floatTarget": "KFXqYa_floatTarget",
			"vendorLetter": "KFXqYa_vendorLetter",
			"triggerPopUpdated": "KFXqYa_triggerPopUpdated",
			"delta": "KFXqYa_delta",
			"subscriptionName": "KFXqYa_subscriptionName",
			"feeChipError": "KFXqYa_feeChipError",
			"subscriptionTier": "KFXqYa_subscriptionTier",
			"subscriptionFill": "KFXqYa_subscriptionFill",
			"bandTag": "KFXqYa_bandTag",
			"ubTag": "KFXqYa_ubTag",
			"tokenModelBar": "KFXqYa_tokenModelBar",
			"modalFooter": "KFXqYa_modalFooter",
			"settingsHead": "KFXqYa_settingsHead",
			"vendorLogo": "KFXqYa_vendorLogo",
			"heatmapYearMonth": "KFXqYa_heatmapYearMonth",
			"heroLabel": "KFXqYa_heroLabel",
			"heroReadout": "KFXqYa_heroReadout",
			"roundsBarCol": "KFXqYa_roundsBarCol",
			"pluginInfoValue": "KFXqYa_pluginInfoValue",
			"settingsTitle": "KFXqYa_settingsTitle",
			"tableScroll": "KFXqYa_tableScroll",
			"costCol": "KFXqYa_costCol",
			"triggerSpark": "KFXqYa_triggerSpark",
			"heroGauge": "KFXqYa_heroGauge",
			"prog": "KFXqYa_prog",
			"triggerPopSwitchBtn": "KFXqYa_triggerPopSwitchBtn",
			"tabPanel": "KFXqYa_tabPanel",
			"ubChipOff": "KFXqYa_ubChipOff",
			"plgTag": "KFXqYa_plgTag",
			"peakCardOff": "KFXqYa_peakCardOff",
			"triggerSparkBar": "KFXqYa_triggerSparkBar",
			"triggerLabel": "KFXqYa_triggerLabel",
			"ubCard": "KFXqYa_ubCard",
			"kpiGreen": "KFXqYa_kpiGreen",
			"exportLabel": "KFXqYa_exportLabel",
			"metricValue": "KFXqYa_metricValue",
			"heatmapRangeSwitch": "KFXqYa_heatmapRangeSwitch",
			"feeSuffix": "KFXqYa_feeSuffix",
			"heroMeta": "KFXqYa_heroMeta",
			"chartTooltipRow": "KFXqYa_chartTooltipRow",
			"popHead": "KFXqYa_popHead",
			"heroBudgetLabel": "KFXqYa_heroBudgetLabel",
			"budgetFill": "KFXqYa_budgetFill",
			"chartSvg": "KFXqYa_chartSvg",
			"shareSegPeak": "KFXqYa_shareSegPeak",
			"ubTable": "KFXqYa_ubTable",
			"ubStatLabel": "KFXqYa_ubStatLabel",
			"chartWrap": "KFXqYa_chartWrap",
			"healthBadge": "KFXqYa_healthBadge",
			"triggerPopTitleMonth": "KFXqYa_triggerPopTitleMonth",
			"dashboardIn": "KFXqYa_dashboardIn",
			"triggerPopEmpty": "KFXqYa_triggerPopEmpty",
			"shareSegTool": "KFXqYa_shareSegTool",
			"plgGrid": "KFXqYa_plgGrid",
			"shareSegUser": "KFXqYa_shareSegUser",
			"ubNotes": "KFXqYa_ubNotes",
			"heroSideSpacer": "KFXqYa_heroSideSpacer",
			"bucketSep": "KFXqYa_bucketSep",
			"feeChipOff": "KFXqYa_feeChipOff",
			"heroValue": "KFXqYa_heroValue",
			"subscriptionHead": "KFXqYa_subscriptionHead",
			"peakAlertField": "KFXqYa_peakAlertField",
			"triggerSparkHot": "KFXqYa_triggerSparkHot",
			"panel": "KFXqYa_panel",
			"reconcileIcon": "KFXqYa_reconcileIcon",
			"bucketCost": "KFXqYa_bucketCost",
			"triggerPopHead": "KFXqYa_triggerPopHead",
			"modelTableScroll": "KFXqYa_modelTableScroll",
			"popDot": "KFXqYa_popDot",
			"shareTrack": "KFXqYa_shareTrack",
			"panelTitle": "KFXqYa_panelTitle",
			"budgetFillOver": "KFXqYa_budgetFillOver",
			"rowlineChev": "KFXqYa_rowlineChev",
			"floatTargets": "KFXqYa_floatTargets",
			"plgLink": "KFXqYa_plgLink",
			"chartLine": "KFXqYa_chartLine",
			"kpiGrid": "KFXqYa_kpiGrid",
			"plgLabel": "KFXqYa_plgLabel",
			"triggerPopFootNote": "KFXqYa_triggerPopFootNote",
			"popTagPrimary": "KFXqYa_popTagPrimary",
			"siteKindSite": "KFXqYa_siteKindSite",
			"providerGroup": "KFXqYa_providerGroup",
			"heatmapYear": "KFXqYa_heatmapYear",
			"ubChipPeak": "KFXqYa_ubChipPeak",
			"peakCardCenter": "KFXqYa_peakCardCenter",
			"shareSegAssistant": "KFXqYa_shareSegAssistant",
			"shareValue": "KFXqYa_shareValue",
			"peakAlertSelect": "KFXqYa_peakAlertSelect",
			"deltaUp": "KFXqYa_deltaUp",
			"setCardDesc": "KFXqYa_setCardDesc",
			"heatmapCell": "KFXqYa_heatmapCell",
			"siteKindUnknown": "KFXqYa_siteKindUnknown",
			"headTitleRow": "KFXqYa_headTitleRow",
			"bucketStatValue": "KFXqYa_bucketStatValue",
			"heroGaugeArc": "KFXqYa_heroGaugeArc",
			"metricLabel": "KFXqYa_metricLabel",
			"settingsHint": "KFXqYa_settingsHint",
			"unpricedHint": "KFXqYa_unpricedHint",
			"plgIcon": "KFXqYa_plgIcon",
			"providerGroupBalanceLabel": "KFXqYa_providerGroupBalanceLabel",
			"heroGaugeArcOver": "KFXqYa_heroGaugeArcOver",
			"plgVal": "KFXqYa_plgVal",
			"budgetOverPulse": "KFXqYa_budgetOverPulse",
			"pricingToggleText": "KFXqYa_pricingToggleText",
			"triggerPopMetricHighlight": "KFXqYa_triggerPopMetricHighlight",
			"heatmapYearWeekdays": "KFXqYa_heatmapYearWeekdays",
			"closeButton": "KFXqYa_closeButton",
			"modelTable": "KFXqYa_modelTable",
			"roundsAxis": "KFXqYa_roundsAxis",
			"heatmapRangeButtonActive": "KFXqYa_heatmapRangeButtonActive",
			"feeChipPrimary": "KFXqYa_feeChipPrimary",
			"bucketSummary": "KFXqYa_bucketSummary",
			"ubCardSub": "KFXqYa_ubCardSub",
			"peakTagSuccess": "KFXqYa_peakTagSuccess",
			"balanceDetailRow": "KFXqYa_balanceDetailRow",
			"healthDot": "KFXqYa_healthDot",
			"popDotDirect": "KFXqYa_popDotDirect",
			"balanceDetailLabel": "KFXqYa_balanceDetailLabel",
			"plgItem": "KFXqYa_plgItem",
			"bandPriceOff": "KFXqYa_bandPriceOff",
			"budgetUnit": "KFXqYa_budgetUnit",
			"exportBar": "KFXqYa_exportBar",
			"triggerPopMuted": "KFXqYa_triggerPopMuted",
			"rateBadgeBuiltin": "KFXqYa_rateBadgeBuiltin",
			"heatmapYearGrid": "KFXqYa_heatmapYearGrid",
			"peakDotSuccess": "KFXqYa_peakDotSuccess"
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
			"minimax-cn": { type: "code" },
			"minimax-token-plan": { type: "code" },
			"minimax-token-plan-cn": { type: "code" },
			"hunyuan-token-plan": { type: "code" },
			"tencent-token-plan": { type: "code" },
			"hy-token-plan": { type: "code" },
			"xinghuo-token-plan": { type: "code" },
			"xfyun-coding": { type: "code" },
			"spark-coding": { type: "code" },
			"huawei-token-plan": { type: "code" },
			"pangu-token-plan": { type: "code" },
			"huawei-maas-token-plan": { type: "code" },
			"volcengine-agent-plan": { type: "code" },
			"ark-agent-plan": { type: "code" },
			"baidu-token-plan": { type: "code" },
			"ernie-token-plan": { type: "code" },
			"wenxin-token-plan": { type: "code" }
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
			liveRate = typeof pricing.rate === "number" && Number.isFinite(pricing.rate) && pricing.rate > 0 ? pricing.rate : void 0;
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
				key: "glm-5.3-flash",
				name: "GLM-5.3-Flash",
				provider: "智谱 AI",
				colorVar: "dsw-static-blue-300",
				price: {
					currency: "CNY",
					input: .8,
					cacheHit: .23,
					output: 2.8
				},
				promo: {
					factor: .5,
					endsAtMs: Date.UTC(2026, 8, 8, 16, 0, 0),
					note: "限时 5 折"
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
				key: "glm-4.5-air",
				name: "GLM-4.5-Air",
				provider: "智谱 AI",
				colorVar: "dsw-static-blue-300",
				price: {
					currency: "CNY",
					input: .8,
					cacheHit: .16,
					output: 2
				}
			},
			{
				key: "glm-4.7",
				name: "GLM-4.7",
				provider: "智谱 AI",
				colorVar: "dsw-static-blue-400",
				price: {
					currency: "CNY",
					input: 4,
					cacheHit: 1,
					output: 16
				},
				estimated: true
			},
			{
				key: "glm-5-turbo",
				name: "GLM-5-Turbo",
				provider: "智谱 AI",
				colorVar: "dsw-static-blue-500",
				price: {
					currency: "CNY",
					input: 5,
					cacheHit: 1.2,
					output: 22
				}
			},
			{
				key: "glm-5.1",
				name: "GLM-5.1",
				provider: "智谱 AI",
				colorVar: "dsw-static-blue-600",
				price: {
					currency: "CNY",
					input: 6,
					cacheHit: 1.2,
					output: 24
				}
			},
			{
				key: "glm-5v-turbo",
				name: "GLM-5V-Turbo",
				provider: "智谱 AI",
				colorVar: "dsw-static-blue-300",
				price: {
					currency: "CNY",
					input: 5,
					cacheHit: 1.2,
					output: 22
				}
			},
			{
				key: "qwen-3.8-max",
				name: "Qwen3.8 Max",
				provider: "阿里通义",
				colorVar: "dsw-static-blue-600",
				price: {
					currency: "CNY",
					input: 12,
					cacheHit: 1.5,
					output: 36
				},
				extraRows: [
					{
						label: "显式缓存创建",
						input: 15
					},
					{
						label: "显式缓存命中",
						input: 1
					},
					{
						label: "Batch File",
						input: 6,
						output: 18,
						note: "长期半价"
					},
					{
						label: "Batch Chat",
						input: 12,
						output: 36,
						note: "与标准价一致"
					}
				]
			},
			{
				key: "qwen-3.8-flash",
				name: "Qwen3.8 Flash",
				provider: "阿里通义",
				colorVar: "dsw-static-blue-400",
				price: {
					currency: "CNY",
					input: 1,
					cacheHit: .1,
					output: 3
				},
				extraRows: [
					{
						label: "显式缓存创建",
						input: 1.25
					},
					{
						label: "显式缓存命中",
						input: .1
					},
					{
						label: "Batch File",
						input: .5,
						output: 1.5,
						note: "长期半价"
					},
					{
						label: "Batch Chat",
						input: 1,
						output: 3,
						note: "与标准价一致"
					}
				]
			},
			{
				key: "qwen-max",
				name: "Qwen3.7-Max",
				provider: "阿里通义",
				colorVar: "dsw-static-blue-300",
				price: {
					currency: "CNY",
					input: 12,
					cacheHit: 1.2,
					output: 36
				},
				promo: {
					factor: .5,
					note: "限时 5 折"
				},
				extraRows: [
					{
						label: "显式缓存创建",
						input: 15
					},
					{
						label: "显式缓存命中",
						input: 1.2
					},
					{
						label: "Batch File",
						input: 6,
						output: 18,
						note: "长期半价"
					},
					{
						label: "Batch Chat",
						input: 12,
						output: 36,
						note: "与标准价一致"
					}
				]
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
				},
				extraRows: [
					{
						label: "显式缓存创建",
						input: 1
					},
					{
						label: "显式缓存命中",
						input: .08
					},
					{
						label: "Batch File",
						input: .4,
						output: 2.4,
						note: "长期半价"
					},
					{
						label: "Batch Chat",
						input: .8,
						output: 4.8,
						note: "与标准价一致"
					}
				]
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
				},
				extraRows: [{
					label: "显式缓存创建",
					input: .25
				}, {
					label: "显式缓存命中",
					input: .02
				}]
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
				key: "doubao-seed-evolving",
				name: "Doubao-Seed-Evolving",
				provider: "字节豆包",
				colorVar: "dsw-static-red-500",
				price: {
					currency: "CNY",
					input: 6,
					cacheHit: 1.2,
					output: 30
				}
			},
			{
				key: "doubao-seed-2.1-pro",
				name: "Doubao Seed-2.1 Pro",
				provider: "字节豆包",
				colorVar: "dsw-static-red-400",
				price: {
					currency: "CNY",
					input: 6,
					cacheHit: 1.2,
					output: 30
				}
			},
			{
				key: "doubao-seed-2.1-turbo",
				name: "Doubao Seed-2.1 Turbo",
				provider: "字节豆包",
				colorVar: "dsw-static-red-300",
				price: {
					currency: "CNY",
					input: 3,
					cacheHit: .6,
					output: 15
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
				key: "minimax-m2.7",
				name: "MiniMax-M2.7",
				provider: "MiniMax",
				colorVar: "dsw-static-amber-400",
				price: {
					currency: "CNY",
					input: 2.1,
					cacheHit: .42,
					output: 8.4
				}
			},
			{
				key: "minimax-m2.7-highspeed",
				name: "MiniMax-M2.7-highspeed",
				provider: "MiniMax",
				colorVar: "dsw-static-amber-500",
				price: {
					currency: "CNY",
					input: 4.2,
					cacheHit: .42,
					output: 16.8
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
				key: "claude-opus-4-6",
				name: "Claude Opus 4.6",
				provider: "Anthropic",
				colorVar: "dsw-static-red-500",
				price: {
					currency: "USD",
					input: 5,
					cacheHit: .5,
					output: 25
				}
			},
			{
				key: "claude-sonnet-4-6",
				name: "Claude Sonnet 4.6",
				provider: "Anthropic",
				colorVar: "dsw-static-red-400",
				price: {
					currency: "USD",
					input: 3,
					cacheHit: .3,
					output: 15
				}
			},
			{
				key: "claude-haiku-4-5",
				name: "Claude Haiku 4.5",
				provider: "Anthropic",
				colorVar: "dsw-static-red-300",
				price: {
					currency: "USD",
					input: 1,
					cacheHit: .1,
					output: 5
				}
			},
			{
				key: "claude-opus-5",
				name: "Claude Opus 5",
				provider: "Anthropic",
				colorVar: "dsw-static-red-500",
				price: {
					currency: "USD",
					input: 5,
					cacheHit: .5,
					output: 25
				}
			},
			{
				key: "claude-sonnet-5",
				name: "Claude Sonnet 5",
				provider: "Anthropic",
				colorVar: "dsw-static-red-400",
				price: {
					currency: "USD",
					input: 2,
					cacheHit: .2,
					output: 10
				}
			},
			{
				key: "mistral-large-2512",
				name: "Mistral Large 3",
				provider: "Mistral AI",
				colorVar: "dsw-static-violet-500",
				price: {
					currency: "USD",
					input: .5,
					cacheHit: .05,
					output: 1.5
				}
			},
			{
				key: "mistral-small-2603",
				name: "Mistral Small 4",
				provider: "Mistral AI",
				colorVar: "dsw-static-violet-400",
				price: {
					currency: "USD",
					input: .15,
					cacheHit: .015,
					output: .6
				}
			},
			{
				key: "ministral-8b-latest",
				name: "Ministral 8B",
				provider: "Mistral AI",
				colorVar: "dsw-static-violet-300",
				price: {
					currency: "USD",
					input: .1,
					cacheHit: .01,
					output: .1
				}
			},
			{
				key: "command-a-03-2025",
				name: "Command A",
				provider: "Cohere",
				colorVar: "dsw-static-cyan-500",
				price: {
					currency: "USD",
					input: 2.5,
					cacheHit: .25,
					output: 10
				}
			},
			{
				key: "command-r-08-2024",
				name: "Command R",
				provider: "Cohere",
				colorVar: "dsw-static-cyan-400",
				price: {
					currency: "USD",
					input: .15,
					cacheHit: .015,
					output: .6
				}
			},
			{
				key: "longcat-2.0",
				name: "LongCat 2.0",
				provider: "美团",
				colorVar: "dsw-static-amber-500",
				price: {
					currency: "CNY",
					input: 4,
					cacheHit: .8,
					output: 16
				},
				estimated: true
			},
			{
				key: "minicpm-v-4.5",
				name: "MiniCPM-V 4.5",
				provider: "面壁智能",
				colorVar: "dsw-static-green-500",
				price: {
					currency: "CNY",
					input: 1,
					cacheHit: .2,
					output: 4
				},
				estimated: true
			},
			{
				key: "ernie-4.5",
				name: "ERNIE-4.5 300B",
				provider: "百度文心",
				colorVar: "dsw-static-blue-300",
				price: {
					currency: "CNY",
					input: 2,
					cacheHit: .4,
					output: 8
				},
				estimated: true
			},
			{
				key: "dots-3-note-preview",
				name: "Dots3-Note Preview",
				provider: "小红书",
				colorVar: "dsw-static-red-500",
				price: {
					currency: "CNY",
					input: 2,
					cacheHit: .4,
					output: 8
				},
				estimated: true
			},
			{
				key: "qwen3.6-max",
				name: "Qwen3.6 Max",
				provider: "阿里通义",
				colorVar: "dsw-static-orange-500",
				price: {
					currency: "CNY",
					input: 9,
					cacheHit: .9,
					output: 54
				},
				extraRows: [{
					label: "显式缓存创建",
					input: 11.25
				}, {
					label: "显式缓存命中",
					input: .9
				}]
			},
			{
				key: "qwen3-coder-plus",
				name: "Qwen3-Coder Plus",
				provider: "阿里通义",
				colorVar: "dsw-static-orange-400",
				price: {
					currency: "CNY",
					input: 4,
					cacheHit: .8,
					output: 16
				},
				extraRows: [{
					label: "显式缓存创建",
					input: 5
				}, {
					label: "显式缓存命中",
					input: .4
				}]
			},
			{
				key: "qwen3-coder",
				name: "Qwen3-Coder 480B",
				provider: "阿里通义",
				colorVar: "dsw-static-orange-300",
				price: {
					currency: "CNY",
					input: 4,
					cacheHit: .8,
					output: 16
				},
				estimated: true
			},
			{
				key: "glm-4.5-x",
				name: "GLM-4.5-X",
				provider: "智谱 AI",
				colorVar: "dsw-static-blue-400",
				price: {
					currency: "CNY",
					input: 4,
					cacheHit: 1,
					output: 16
				},
				estimated: true
			},
			{
				key: "glm-5.2-fast",
				name: "GLM-5.2 Fast",
				provider: "智谱 AI",
				colorVar: "dsw-static-blue-300",
				price: {
					currency: "CNY",
					input: 6,
					cacheHit: 1.2,
					output: 24
				},
				estimated: true
			},
			{
				key: "kimi-k3-fast",
				name: "Kimi K3 Fast",
				provider: "月之暗面",
				colorVar: "dsw-static-cyan-400",
				price: {
					currency: "CNY",
					input: 20,
					cacheHit: 2,
					output: 100
				},
				estimated: true
			},
			{
				key: "kimi-k2.7-code-fast",
				name: "Kimi K2.7 Code Fast",
				provider: "月之暗面",
				colorVar: "dsw-static-cyan-400",
				price: {
					currency: "CNY",
					input: 6.5,
					cacheHit: 1.3,
					output: 27
				},
				estimated: true
			},
			{
				key: "kimi-k2.6-fast",
				name: "Kimi K2.6 Fast",
				provider: "月之暗面",
				colorVar: "dsw-static-cyan-300",
				price: {
					currency: "CNY",
					input: 6.5,
					cacheHit: 1.1,
					output: 27
				},
				estimated: true
			},
			{
				key: "kimi-k2.6-turbo",
				name: "Kimi K2.6 Turbo",
				provider: "月之暗面",
				colorVar: "dsw-static-cyan-300",
				price: {
					currency: "CNY",
					input: 6.5,
					cacheHit: 1.1,
					output: 27
				},
				estimated: true
			},
			{
				key: "kimi-k2-thinking-turbo",
				name: "Kimi K2 Thinking Turbo",
				provider: "月之暗面",
				colorVar: "dsw-static-cyan-300",
				price: {
					currency: "CNY",
					input: 8,
					cacheHit: 1,
					output: 58
				}
			},
			{
				key: "doubao-seed-2.0-code",
				name: "Doubao Seed-2.0 Code",
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
				key: "doubao-seed-2.0-lite",
				name: "Doubao Seed-2.0 Lite",
				provider: "字节豆包",
				colorVar: "dsw-static-red-300",
				price: {
					currency: "CNY",
					input: .6,
					cacheHit: .12,
					output: 3.6
				}
			},
			{
				key: "other",
				name: "其他模型",
				provider: "Custom",
				colorVar: "dsw-static-neutral-bluish-500",
				price: {
					currency: "CNY",
					input: 0,
					cacheHit: 0,
					cacheMiss: 0,
					output: 0
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
			"glm-4.5-air": "glm-4.5-air",
			"glm-4.5air": "glm-4.5-air",
			"glm-4.7": "glm-4.7",
			"glm-5-turbo": "glm-5-turbo",
			"glm-5.1": "glm-5.1",
			"glm-5.3-flash": "glm-5.3-flash",
			"glm-5v-turbo": "glm-5v-turbo",
			"glm-5v.1": "glm-5v-turbo",
			"claude-opus-4-6": "claude-opus-4-6",
			"claude-opus-4.6": "claude-opus-4-6",
			"claude-sonnet-4-6": "claude-sonnet-4-6",
			"claude-sonnet-4.6": "claude-sonnet-4-6",
			"claude-haiku-4-5": "claude-haiku-4-5",
			"claude-haiku-4.5": "claude-haiku-4-5",
			"claude-opus-5": "claude-opus-5",
			"claude-sonnet-5": "claude-sonnet-5",
			"mistral-large-2512": "mistral-large-2512",
			"mistral-large-3": "mistral-large-2512",
			"mistral-small-2603": "mistral-small-2603",
			"mistral-small-4": "mistral-small-2603",
			"ministral-8b-latest": "ministral-8b-latest",
			"ministral-8b": "ministral-8b-latest",
			"command-a-03-2025": "command-a-03-2025",
			"command-a": "command-a-03-2025",
			"command-r-08-2024": "command-r-08-2024",
			"command-r": "command-r-08-2024",
			"longcat-2.0": "longcat-2.0",
			"longcat-2": "longcat-2.0",
			"minicpm-v-4.5": "minicpm-v-4.5",
			"minicpm-v-4.5-thinking": "minicpm-v-4.5",
			"ernie-4.5": "ernie-4.5",
			"ernie-4.5-300b": "ernie-4.5",
			"dots-3-note-preview": "dots-3-note-preview",
			"dots-3-note": "dots-3-note-preview",
			"dots3-note-preview": "dots-3-note-preview",
			"rednote-dots3": "dots-3-note-preview",
			"doubao-seed-evolving": "doubao-seed-evolving",
			"doubao-seed-evolve": "doubao-seed-evolving",
			"doubao-seed-2.1-pro": "doubao-seed-2.1-pro",
			"doubao-seed-2.1-pro-290000": "doubao-seed-2.1-pro",
			"doubao-seed-2.1-turbo": "doubao-seed-2.1-turbo",
			"doubao-seed-2-1-turbo": "doubao-seed-2.1-turbo",
			"qwen3.8-max": "qwen-3.8-max",
			"qwen3.8-flash": "qwen-3.8-flash",
			"qwen3.7-max": "qwen-max",
			"qwen3.6-max": "qwen3.6-max",
			"qwen3.6-max-preview": "qwen3.6-max",
			"qwen3-coder-plus": "qwen3-coder-plus",
			"qwen3-coder": "qwen3-coder",
			"qwen3-coder-480b": "qwen3-coder",
			"glm-4.5-x": "glm-4.5-x",
			"glm-4.5x": "glm-4.5-x",
			"glm-5.2-fast": "glm-5.2-fast",
			"glm-5.2f": "glm-5.2-fast",
			"kimi-k3-fast": "kimi-k3-fast",
			"kimi-k3f": "kimi-k3-fast",
			"kimi-k2.7-code-fast": "kimi-k2.7-code-fast",
			"kimi-k2.7-code-f": "kimi-k2.7-code-fast",
			"kimi-k2.6-fast": "kimi-k2.6-fast",
			"kimi-k2.6-turbo": "kimi-k2.6-turbo",
			"kimi-k2-thinking-turbo": "kimi-k2-thinking-turbo",
			"doubao-seed-2.0-code": "doubao-seed-2.0-code",
			"doubao-seed-2-0-code": "doubao-seed-2.0-code",
			"doubao-seed-2.0-lite": "doubao-seed-2.0-lite",
			"doubao-seed-2-0-lite": "doubao-seed-2.0-lite",
			"qwen-max": "qwen-max",
			"hunyuan-t1": "hunyuan-t1",
			"step-3.7-flash": "step",
			"seed-2.0-mini": "doubao-mini",
			"k3": "kimi-k3",
			"kimi-k3": "kimi-k3",
			"minimax-m1": "minimax",
			"minimax-m2": "minimax",
			"minimax-m3": "minimax",
			"minimax-m2.7": "minimax-m2.7",
			"minimax-m2.7-highspeed": "minimax-m2.7-highspeed",
			"minimax-m2.7-high-speed": "minimax-m2.7-highspeed",
			"minimax-m2-7": "minimax-m2.7",
			"minimax-m2-7-highspeed": "minimax-m2.7-highspeed",
			"minimax-m2-7-high-speed": "minimax-m2.7-highspeed"
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
		* 促销在 nowMs 是否生效：factor 必须落在 (0,1) 区间，截止时刻及之后视为过期；
		* endsAtMs 缺省表示长期活动，在 factor 合法期间持续生效。
		* 导出供测试：纯函数。
		* @param promo - 待判定的促销窗口。
		* @param nowMs - 判定时刻（epoch ms）。
		*/
		function isPromoActive(promo, nowMs) {
			const expired = promo.endsAtMs !== void 0 && nowMs >= promo.endsAtMs;
			return Number.isFinite(nowMs) && !expired && promo.factor > 0 && promo.factor < 1;
		}
		/**
		* 把限时促销折入条目单价：生效期内返回 price 主档与 offPeak 全部乘 factor 的
		* 副本，其余字段原样保留；不在促销期（过期/未开始/factor 非法）原样返回。
		* 幂等由调用方保证——计价与费率表显示各自只折一次，勿对已折价副本重复应用。
		* @param entry - 目录条目（price 保持刊例价口径）。
		* @param nowMs - 判定时刻（epoch ms）。
		*/
		function applyPromo(entry, nowMs) {
			const { promo } = entry;
			if (promo === void 0 || !isPromoActive(promo, nowMs)) return entry;
			const scaled = (band) => ({
				input: band.input * promo.factor,
				cacheHit: band.cacheHit * promo.factor,
				...band.cacheMiss !== void 0 ? { cacheMiss: band.cacheMiss * promo.factor } : {},
				output: band.output * promo.factor
			});
			return {
				...entry,
				price: {
					...scaled(entry.price),
					currency: entry.price.currency,
					...entry.price.offPeak !== void 0 ? { offPeak: scaled(entry.price.offPeak) } : {}
				}
			};
		}
		/**
		* 费率表渲染的完整目录：内置 + 探活命中的模型（无价标记未收录）。
		* models.dev 补充条目**不**整表渲染——那是数百网关厂商的全量模型清单（数千行），
		* 会把费率表撑爆；它们只作为目录外模型的计价回退源（见 {@link livePriceOf} /
		* {@link modelOf}）。探活模型在此逐个对价：内置已有的跳过去重；目录外但
		* models.dev 有价的按归一化 id 复用其 USD 价；两者皆无的标 `uncatalogued`。
		* 内置条目按 nowMs 折算限时促销（生效中的条目显示折后单价，过期自动恢复刊例价）。
		* @param nowMs - 促销判定时刻；缺省当前时刻。
		*/
		function catalogEntries(nowMs = Date.now()) {
			const entries = [...MODEL_CATALOG.map((entry) => applyPromo(entry, nowMs))];
			const known = new Set(entries.map((entry) => entry.key.toLowerCase()));
			const knownCanon = new Set(entries.map((entry) => canonModelId(entry.key)));
			for (const model of liveCatalogModels ?? []) {
				const rawKey = model.id.toLowerCase();
				if ((() => {
					const aliasKey = resolveCatalogKey(model.id);
					return MODEL_CATALOG.find((item) => item.key === aliasKey);
				})() !== void 0) continue;
				const idCanon = canonModelId(model.id);
				if (known.has(rawKey) || idCanon !== "" && knownCanon.has(idCanon)) continue;
				const extra = (liveExtraModels ?? []).find((item) => canonModelId(item.key) === idCanon);
				let entry;
				if (extra !== void 0) {
					entry = extraEntryOf(extra);
					if (model.name !== void 0 && model.name !== "") entry = {
						...entry,
						name: model.name
					};
				} else {
					const fallbackLive = livePriceOf(rawKey);
					if (fallbackLive !== void 0) entry = {
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
				}
				known.add(entry.key.toLowerCase());
				if (idCanon !== "") knownCanon.add(idCanon);
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
		function computeCost(entry, buckets, peakShare = DEFAULT_PEAK_SHARE, nowMs = Date.now()) {
			const priced = applyPromo(entry, nowMs);
			const peak = priceBandCost(priced.price, buckets, priced.price.currency);
			const off = priced.price.offPeak === void 0 ? peak : priceBandCost(priced.price.offPeak, buckets, priced.price.currency);
			return peak * peakShare + off * (1 - peakShare);
		}
		/** 人民币 → 美元（显示换算用）：用当前生效汇率（实时优先，缺失回退内置），
		*  与计价链路的 `currentRate()` 同口径，避免实时汇率生效时 USD 显示与计价不一致。 */
		function cnyToUsd(cny) {
			const rate = currentRate();
			return rate > 0 ? cny / rate : cny;
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
		* Render the daily bars plus the total-calls line.
		* @param props.data - sorted daily rows (ascending date).
		* @param props.models - the model legend, in bar order (used by the `cost` metric).
		* @param props.currency - display currency for the cost labels.
		* @param props.metric - `cost` (stacked per-model CNY, default) or `tokens` (single-color total tokens).
		*/
		function TrendChart({ data, models = [], currency = "cny", metric = "cost" }) {
			const [hover, setHover] = (0, react.useState)(null);
			const money = (cny) => formatMoney(currency === "usd" ? cnyToUsd(cny) : cny, currency);
			const axisOf = (value) => metric === "tokens" ? shortNumber$1(value) : money(value);
			const valueOf = (d) => metric === "tokens" ? d.tokens ?? 0 : d.cost;
			const layout = (0, react.useMemo)(() => {
				const n = data.length;
				if (n === 0) return null;
				const plotW = W$2 - PAD$2.left - PAD$2.right;
				const plotH = H$2 - PAD$2.top - PAD$2.bottom;
				const inner = (i) => {
					if (n === 1) return PAD$2.left + plotW / 2;
					return PAD$2.left + plotW * i / (n - 1);
				};
				const maxCost = metric === "tokens" ? Math.max(...data.map((d) => d.tokens ?? 0), 1e-4) : Math.max(...data.map((d) => Math.max(d.cost, Object.values(d.byModel ?? {}).reduce((sum, v) => sum + v, 0))), 1e-4);
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
						if (models.length === 0 || metric === "tokens") return [{
							date: d.date,
							model: TOTAL_MODEL,
							x,
							base: 0,
							value: valueOf(d),
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
			}, [
				data,
				models,
				metric
			]);
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
									children: axisOf(value)
								})] }, `cost-${idx}`);
							}),
							bars.map((bar) => {
								if (bar.value > 0) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("rect", {
									x: bar.x,
									y: yCost(bar.base + bar.value),
									width: barW,
									height: yCost(bar.base) - yCost(bar.base + bar.value),
									rx: bar.topRounded ? 2 : 0,
									className: bar.model.color === "" ? UsageBilling_module_css_default.chartBar : UsageBilling_module_css_default.chartStack,
									style: bar.model.color === "" ? void 0 : { fill: bar.model.color }
								}, `${bar.date}-${bar.model.key}`);
								const day = data.find((d) => d.date === bar.date);
								if (day !== void 0 && day.calls > 0 && bar.base === 0) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("rect", {
									x: bar.x,
									y: yCost(0) - 1,
									width: barW,
									height: 1,
									rx: 0,
									className: UsageBilling_module_css_default.chartBarPlaceholder
								}, `${bar.date}-${bar.model.key}-placeholder`);
								return null;
							}),
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
							metric !== "tokens" && models.filter((model) => (activePoint.byModel?.[model.key] ?? 0) > 0).map((model) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
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
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", { children: metric === "tokens" ? shortNumber$1(activePoint.tokens ?? 0) : money(activePoint.cost) })
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
					models.length > 0 && metric !== "tokens" && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
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
		* PluginInfoCard: 「设置 → 插件信息」卡——图标 + 插件名/版本 tag + 描述，下接
		* 元信息网格（作者 / 仓库 / npm / 许可证）。版本号来自服务端 usage-stats 的
		* `pluginVersion`（读自包 package.json），其余元信息静态来自 `plugin-info.ts`。
		* 无版本号时显示 em dash。
		*/
		/** 信息卡 props：locale 函数 + 版本号（服务端下发，可为空）。 */
		function PluginInfoCard({ t, version }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
				className: UsageBilling_module_css_default.setCard,
				"data-testid": "billing-plugin-info",
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: UsageBilling_module_css_default.plgHead,
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: UsageBilling_module_css_default.plgIcon,
						"aria-hidden": "true",
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("svg", {
							width: "20",
							height: "20",
							viewBox: "0 0 24 24",
							fill: "none",
							stroke: "currentColor",
							strokeWidth: "2",
							strokeLinecap: "round",
							strokeLinejoin: "round",
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M10 3a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v2a2 2 0 0 0 4 0V4a1 1 0 0 1 1-1h1a1 1 0 0 1 1 1v1a2 2 0 0 0 4 0 1 1 0 0 1 1 1v2a1 1 0 0 1-1 1h-1a2 2 0 0 0 0 4h1a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1h-1a2 2 0 0 0-4 0v1a1 1 0 0 1-1 1h-2a1 1 0 0 1-1-1v-2a2 2 0 0 0-4 0v1a1 1 0 0 1-1 1h-1a1 1 0 0 1-1-1v-1a2 2 0 0 0-4 0 1 1 0 0 1-1 1H3a1 1 0 0 1-1-1v-2a1 1 0 0 1 1-1h1a2 2 0 0 0 0-4H3a1 1 0 0 1-1-1v-2a1 1 0 0 1 1-1h1a2 2 0 0 0 4 0z" })
						})
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: UsageBilling_module_css_default.plgTitle,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: UsageBilling_module_css_default.plgNameRow,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h3", {
								className: UsageBilling_module_css_default.plgName,
								children: PLUGIN_NAME
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: UsageBilling_module_css_default.plgTag,
								children: version === void 0 ? "—" : `v${version}`
							})]
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							className: UsageBilling_module_css_default.plgDesc,
							children: PLUGIN_DESCRIPTION
						})]
					})]
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: UsageBilling_module_css_default.plgGrid,
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: UsageBilling_module_css_default.plgItem,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: UsageBilling_module_css_default.plgLabel,
								children: t("billing.pluginAuthor")
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("a", {
								className: UsageBilling_module_css_default.plgLink,
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
							className: UsageBilling_module_css_default.plgItem,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: UsageBilling_module_css_default.plgLabel,
								children: t("billing.pluginRepository")
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("a", {
								className: UsageBilling_module_css_default.plgLink,
								href: PLUGIN_REPOSITORY,
								target: "_blank",
								rel: "noreferrer",
								children: "GitHub"
							})]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: UsageBilling_module_css_default.plgItem,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: UsageBilling_module_css_default.plgLabel,
								children: t("billing.pluginNpm")
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("a", {
								className: UsageBilling_module_css_default.plgLink,
								href: PLUGIN_NPM_URL,
								target: "_blank",
								rel: "noreferrer",
								children: PLUGIN_NAME
							})]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: UsageBilling_module_css_default.plgItem,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: UsageBilling_module_css_default.plgLabel,
								children: t("billing.pluginLicense")
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: UsageBilling_module_css_default.plgVal,
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
		const HIT_COLOR = "#14b8a6";
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
			const { stats, trendDays, onTrendDays, t } = props;
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
				setTimeout(() => URL.revokeObjectURL(a.href), 0);
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
				setTimeout(() => URL.revokeObjectURL(a.href), 0);
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
		/** 月份缩写（年度热力图横轴标签，GitHub 风格）。 */
		const MONTH_ABBR = [
			"Jan",
			"Feb",
			"Mar",
			"Apr",
			"May",
			"Jun",
			"Jul",
			"Aug",
			"Sep",
			"Oct",
			"Nov",
			"Dec"
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
				const monthLabels = [];
				let lastMonth = -1;
				yearWeeks.forEach((week, i) => {
					const m = Number(week[0]?.date.slice(5, 7) ?? 0);
					if (m !== lastMonth) {
						monthLabels.push({
							index: i,
							label: MONTH_ABBR[m - 1] ?? ""
						});
						lastMonth = m;
					}
				});
				return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: UsageBilling_module_css_default.heatmapYear,
					"data-testid": "heatmap-year",
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: UsageBilling_module_css_default.heatmapYearBody,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: UsageBilling_module_css_default.heatmapYearWeekdays,
							"aria-hidden": "true",
							children: [
								{
									label: "Mon",
									row: 1
								},
								{
									label: "Wed",
									row: 3
								},
								{
									label: "Fri",
									row: 5
								}
							].map((item) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: UsageBilling_module_css_default.heatmapYearWeekday,
								style: { gridRow: item.row },
								children: item.label
							}, item.label))
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: UsageBilling_module_css_default.heatmapYearScroll,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: UsageBilling_module_css_default.heatmapYearMonths,
								"aria-hidden": "true",
								"data-testid": "heatmap-year-months",
								children: monthLabels.map((m) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: UsageBilling_module_css_default.heatmapYearMonth,
									style: { gridColumn: m.index + 1 },
									children: m.label
								}, m.index))
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
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
							})]
						})]
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
			const window = options?.window ?? DEFAULTS.window;
			const threshold = options?.threshold ?? DEFAULTS.threshold;
			const reasonFactor = options?.reasonFactor ?? DEFAULTS.reasonFactor;
			const reasonHitDropPp = options?.reasonHitDropPp ?? DEFAULTS.reasonHitDropPp;
			const flags = [];
			if (window <= 0 || threshold <= 0) return flags;
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
				if (baselineCost !== null && baselineCost > 0 && round.cost > baselineCost * threshold) {
					const baselineOutput = mean(baselineOutputs);
					const baselineInput = mean(baselineInputs);
					const baselineHit = mean(baselineHits);
					if (baselineOutput !== null && baselineOutput > 0 && output > baselineOutput * reasonFactor) reasons.push("output-growth");
					if (baselineInput !== null && baselineInput > 0 && input > baselineInput * reasonFactor) reasons.push("context-bloat");
					if (baselineHit !== null && hit !== null && hit < baselineHit - reasonHitDropPp) reasons.push("cache-hit-drop");
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
				while (baselineCosts.length > window) baselineCosts.shift();
				while (baselineOutputs.length > window) baselineOutputs.shift();
				while (baselineInputs.length > window) baselineInputs.shift();
				while (baselineHits.length > window) baselineHits.shift();
			}
			return flags;
		}
		//#endregion
		//#region src/client/export.ts
		/** CSV 单元格转义：含逗号 / 引号 / 换行 / 回车的值加双引号并内层引号双写。 */
		function csvCell(value) {
			return /[",\r\n]/.test(value) ? `"${value.replace(/"/g, "\"\"")}"` : value;
		}
		/** 防 CSV 公式注入：以 `=` / `+` / `-` / `@` / tab / 回车开头的值前置单引号，
		*  避免在 Excel/WPS 打开时被当作公式执行。用户/模型可控的会话标题会进 CSV。 */
		function csvSafe(value) {
			return /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
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
		/** 按站点（中转站/直连/未知路由）CSV：站点,类别,调用,费用(元)。 */
		function siteRowsCsv(bySite) {
			return ["site,kind,calls,cost_cny", ...Object.entries(bySite).map(([key, usage]) => {
				const site = key.startsWith("site:") ? key.slice(5) : key.startsWith("direct:") ? key.slice(7) : "unknown";
				const kind = key.startsWith("site:") ? "site" : key.startsWith("direct:") ? "direct" : "unknown";
				return [
					csvCell(csvSafe(site)),
					kind,
					usage.calls,
					money(usage.cost)
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
				csvCell(csvSafe(row.id)),
				csvCell(csvSafe(row.title ?? "")),
				csvCell(csvSafe(projectOf(row.cwd))),
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
			setTimeout(() => URL.revokeObjectURL(url), 0);
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
			"billing.trendMetric": "趋势指标",
			"billing.trendMetricCost": "费用",
			"billing.trendMetricTokens": "Token",
			"billing.trendEmpty": "暂无趋势数据",
			"billing.budget": "本月预算",
			"billing.budgetAmount": "预算金额",
			"billing.budgetSummary": "本月已用 {used} / {total}；达到 80% 时提醒，达到 100% 时红色脉冲警示",
			"billing.sessions": "会话明细",
			"billing.sessionTitle": "标题",
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
			"billing.footer": "每 30s 自动轮询 · 仅统计本机 dsh 会话",
			"billing.footerCredit": "dsh-ui-usage-billing {version} · MIT",
			"billing.lastUpdated": "数据更新于",
			"billing.noData": "暂无计费数据",
			"billing.todayRate": "今日汇率",
			"billing.rateLive": "实时",
			"billing.rateBuiltin": "内置",
			"billing.promoBadge": "限时折扣",
			"billing.promoUntil": "促销价至 {date}，之后自动恢复刊例价",
			"billing.promoOpenEnded": "厂商未公布截止时间，当前按折扣计价；公告截止后自动恢复刊例价",
			"billing.pricingTip": "DeepSeek 模型自北京时间 2026-08-23（周日）00:00 起：工作日高峰 9-12 / 14-18（×2），周末（周六 / 周日）全天低谷价；双价单元格按峰 / 谷展示，费用按调用时刻计。",
			"billing.pricingUnit": "单位：人民币 / 每百万 Token",
			"billing.pricingNotes": "计价说明",
			"billing.ubPeak": "峰",
			"billing.ubOff": "谷",
			"billing.peakBand": "峰谷分带",
			"billing.pricingSource": "数据来源",
			"billing.noteCache": "命中部分按缓存价计费，显著降低成本。",
			"billing.noteBand": "高峰与空闲时段单价不同，空闲约半价。",
			"billing.noteSource": "价格来自实时汇率 + 模型定价目录，未收录模型按 0 计并提示。",
			"billing.balance": "余额",
			"billing.balanceUnconfigured": "未配置",
			"billing.balanceUnauthorized": "密钥无效",
			"billing.balanceUnreachable": "查询失败",
			"billing.uncatalogued": "未收录",
			"billing.estimatedPricing": "估算价",
			"billing.balanceDays": "约可撑 {days} 天",
			"billing.balanceLowBody": "{name} 余额 {balance}，约可撑 {days} 天，请及时充值",
			"billing.reconcileDrift": "系统监控到{provider}官方余额变动 {spent}，本面板记录 {today}，差额通常由其它工具或 API 的消耗所致",
			"billing.reconcileDismiss": "知道了",
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
			"billing.floatWindow": "模型用量悬浮窗",
			"billing.floatModeCombined": "综合",
			"billing.floatModeSubscription": "订阅卡",
			"billing.floatMode": "展示模式",
			"billing.floatTargets": "订阅目标",
			"billing.floatWindowHint": "悬浮在左下角计费卡上的用量速览；综合=当前样式，订阅卡=每次展示一张订阅额度卡（可切换）。",
			"billing.floatNoTargets": "未指定订阅通道，请在设置中勾选要展示的订阅。",
			"billing.floatNoTargetsHint": "暂无可选的订阅通道。",
			"billing.floatPrev": "上一张订阅",
			"billing.floatNext": "下一张订阅",
			"billing.subscriptionsStale": "订阅额度刷新失败，以下为缓存数据",
			"billing.heatmapLess": "少",
			"billing.heatmapMore": "多",
			"billing.currency": "币种",
			"billing.currencyCny": "人民币",
			"billing.currencyUsd": "美元",
			"billing.heatmap": "用量热力图",
			"billing.rounds": "每轮费用",
			"billing.roundsHint": "最近 {count} 轮 · 柱顶为金额 · 底色为峰谷时段",
			"billing.anomaly": "成本突增",
			"billing.workspaces": "工作区统计",
			"billing.workspacesHint": "点击行下钻项目成本前 5 会话",
			"billing.plan": "套餐",
			"billing.remaining": "剩余",
			"billing.unknownModel": "未定价",
			"billing.model": "模型",
			"billing.thModel": "模型名称",
			"billing.thInputMiss": "输入缓存未命中",
			"billing.thInputHit": "输入缓存命中",
			"billing.currentRound": "当前",
			"billing.costAbbr": "费用",
			"billing.tabOverview": "概览",
			"billing.tabTrends": "趋势",
			"billing.tabProviders": "账单",
			"billing.tabDetails": "统计",
			"billing.tabPricing": "费率",
			"billing.tabSettings": "设置",
			"billing.settingsHead": "偏好设置",
			"billing.settingsHint": "管理与计费相关的偏好",
			"billing.budgetHint": "设置月度上限，用于本月预计与超支分段提醒",
			"billing.peakAlertHint": "在切档前弹窗提醒，可选同步系统通知",
			"billing.peakAlertDescPeak": "即将进入高峰时段，价格将上调，请提前安排长任务",
			"billing.peakAlertDescOff": "即将进入平价时段，价格减半，适合运行大批量任务",
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
			"billing.peakAlertPos": "位置",
			"billing.peakAlertMode": "提醒模式",
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
			"billing.tokenMiss": "输入（缓存未命中）",
			"billing.tokenHit": "输入（缓存命中）",
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
			"billing.popTitle": "用量速览",
			"billing.popNoConsumption": "暂无消耗",
			"billing.popQuotaAlert": "额度提醒",
			"billing.popRiskNone": "余额与配额正常",
			"billing.popDirectLead": "直联",
			"billing.popSubLead": "订阅",
			"billing.popBalanceNormal": "余额正常",
			"billing.popBalanceLow": "余额不足",
			"billing.popQuotaNormal": "配额正常",
			"billing.popQuotaLow": "配额将尽",
			"billing.alertBalanceLow": "{name} 余额不足",
			"billing.alertQuotaLow": "{name} 配额将尽",
			"billing.unpricedHint": "{count} 个模型未收录计价，费用已按 0 计",
			"billing.exportCsvSite": "按站点 CSV",
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
			"billing.trendMetric": "Trend metric",
			"billing.trendMetricCost": "Cost",
			"billing.trendMetricTokens": "Tokens",
			"billing.trendEmpty": "No trend data yet",
			"billing.budget": "Monthly budget",
			"billing.budgetAmount": "Budget amount",
			"billing.budgetSummary": "Used {used} / {total} this month; warn at 80%, pulse red at 100%",
			"billing.sessions": "Sessions",
			"billing.sessionTitle": "Title",
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
			"billing.footer": "Polls every 30s · local dsh sessions only",
			"billing.footerCredit": "dsh-ui-usage-billing {version} · MIT",
			"billing.lastUpdated": "Updated",
			"billing.noData": "No billing data yet",
			"billing.todayRate": "Today rate",
			"billing.rateLive": "Live",
			"billing.rateBuiltin": "Built-in",
			"billing.promoBadge": "Promo",
			"billing.promoUntil": "Promo price until {date}, then list price resumes automatically",
			"billing.promoOpenEnded": "End date not announced; billed at the discounted rate until further notice, then list price resumes",
			"billing.pricingTip": "DeepSeek models: from 2026-08-23 (Sun) 00:00 Beijing, weekdays peak 9-12 / 14-18 (×2), weekends (Sat/Sun) all-day off-peak; cells show peak/off-peak price, billed at call time.",
			"billing.pricingUnit": "Unit: CNY / per 1M tokens",
			"billing.pricingNotes": "Pricing notes",
			"billing.ubPeak": "Peak",
			"billing.ubOff": "Off",
			"billing.peakBand": "Peak/off-peak band",
			"billing.pricingSource": "Data source",
			"billing.noteCache": "Cache hits are billed at the cache rate, cutting cost.",
			"billing.noteBand": "Peak and off-peak prices differ; off-peak is roughly half price.",
			"billing.noteSource": "Prices come from the live rate + model catalog; unlisted models count as 0 and are flagged.",
			"billing.balance": "Balance",
			"billing.balanceUnconfigured": "Not set",
			"billing.balanceUnauthorized": "Bad key",
			"billing.balanceUnreachable": "Unavailable",
			"billing.uncatalogued": "Not catalogued",
			"billing.estimatedPricing": "Estimated",
			"billing.balanceDays": "~{days} days left",
			"billing.balanceLowBody": "{name} balance {balance}, ~{days} days left, please top up",
			"billing.reconcileDrift": "Detected {provider} official balance moved {spent}, this panel recorded {today}; the gap usually comes from other tools or APIs consuming too",
			"billing.reconcileDismiss": "Got it",
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
			"billing.floatWindow": "Model usage popover",
			"billing.floatModeCombined": "Combined",
			"billing.floatModeSubscription": "Subscription card",
			"billing.floatMode": "Display mode",
			"billing.floatTargets": "Targets",
			"billing.floatWindowHint": "Usage summary floating on the footer card; Combined=current style, Subscription cards=one quota card at a time (switchable).",
			"billing.floatNoTargets": "No subscription selected — pick some in Settings.",
			"billing.floatNoTargetsHint": "No subscription channel available.",
			"billing.floatPrev": "Previous subscription",
			"billing.floatNext": "Next subscription",
			"billing.subscriptionsStale": "Subscription refresh failed — showing cached data",
			"billing.heatmapLess": "Less",
			"billing.heatmapMore": "More",
			"billing.currency": "Currency",
			"billing.currencyCny": "CNY",
			"billing.currencyUsd": "USD",
			"billing.heatmap": "Usage heatmap",
			"billing.rounds": "Cost per turn",
			"billing.roundsHint": "Last {count} rounds · bar tops show amount · fill = peak/off-peak",
			"billing.anomaly": "Cost spike",
			"billing.workspaces": "Workspaces",
			"billing.workspacesHint": "Click a row to drill into its top-5 sessions",
			"billing.plan": "Plan",
			"billing.remaining": "Left",
			"billing.unknownModel": "Unpriced",
			"billing.model": "Model",
			"billing.thModel": "Model name",
			"billing.thInputMiss": "Input (cache miss)",
			"billing.thInputHit": "Input (cache hit)",
			"billing.currentRound": "current",
			"billing.costAbbr": "cost",
			"billing.tabOverview": "Overview",
			"billing.tabTrends": "Trends",
			"billing.tabProviders": "Bills",
			"billing.tabDetails": "Stats",
			"billing.tabPricing": "Rates",
			"billing.tabSettings": "Settings",
			"billing.settingsHead": "Preferences",
			"billing.settingsHint": "Manage billing-related preferences",
			"billing.budgetHint": "Set a monthly cap for projections and tier alerts",
			"billing.peakAlertHint": "Alert before a tier switch, optionally via system notification",
			"billing.peakAlertDescPeak": "About to enter peak hours — prices rise, plan long tasks ahead",
			"billing.peakAlertDescOff": "About to enter off-peak hours — price halves, ideal for large batches",
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
			"billing.peakAlertPos": "Position",
			"billing.peakAlertMode": "Remind mode",
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
			"billing.tokenMiss": "Input (cache miss)",
			"billing.tokenHit": "Input (cache hit)",
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
			"billing.popTitle": "Usage overview",
			"billing.popNoConsumption": "No usage yet",
			"billing.popQuotaAlert": "Quota alerts",
			"billing.popRiskNone": "Balances & quotas OK",
			"billing.popDirectLead": "Direct",
			"billing.popSubLead": "Subscription",
			"billing.popBalanceNormal": "balance ok",
			"billing.popBalanceLow": "balance low",
			"billing.popQuotaNormal": "quota ok",
			"billing.popQuotaLow": "quota low",
			"billing.alertBalanceLow": "{name} balance low",
			"billing.alertQuotaLow": "{name} quota low",
			"billing.unpricedHint": "{count} models not priced; their cost counts as 0",
			"billing.exportCsvSite": "By site CSV",
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
		//#region src/client/vendor-logos.ts
		/**
		* Vendandor logos: inlined data URIs fetched from models.dev /logos/{id}.svg.
		* Keyed by the MODEL_CATALOG entry provider display name so the pricing table
		* / model rows can render a real vendor mark before the model name. Vendors not
		* listed here fall back to a brand-color letter badge in the UI.
		*/
		const VENDOR_LOGOS = {
			"Anthropic": "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCA0MCA0MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTI2Ljk1NjggOS44ODE4NEgyMi4xMjY1TDMwLjc3NTMgMzEuNzg0OEgzNS40OTE3TDI2Ljk1NjggOS44ODE4NFpNMTMuMDI4IDkuODgxODRMNC40OTE3IDMxLjc4NDhIOS4zMjIwM0wxMS4yMzA1IDI3LjE3OTNIMjAuMjE2NkwyMi4wMTI2IDMxLjY3MjRIMjYuODQ0NEwxOC4wODMyIDkuODgxODRIMTMuMDI4Wk0xMi41NzgzIDIzLjEzNjFMMTUuNDk4NyAxNS4zODUzTDE4LjUzMTUgMjMuMTM2MUgxMi41NzgzWiIgZmlsbD0iY3VycmVudENvbG9yIi8+Cjwvc3ZnPg==",
			"Cohere": "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTkuMTQ4ODIgMTMuNTU1MkM5LjU4MDgyIDEzLjU1NTIgMTAuNDQ0OCAxMy41MzM2IDExLjY1NDQgMTMuMDM2OEMxMy4wNTg0IDEyLjQ1MzYgMTUuODIzMiAxMS40MTY4IDE3LjgzMiAxMC4zMzY4QzE5LjIzNiA5LjU4MDggMTkuODQwOCA4LjU4NzIgMTkuODQwOCA3LjI0OEMxOS44NDA4IDUuNDEyIDE4LjM1MDQgMy45IDE2LjQ5MjggMy45SDguNzE2ODJDNi4wNjAwMiAzLjkgMy45MDAwMiA2LjA2IDMuOTAwMDIgOC43MTY4QzMuOTAwMDIgMTEuMzczNiA1LjkzMDQyIDEzLjU1NTIgOS4xNDg4MiAxMy41NTUyWiIgZmlsbD0iY3VycmVudENvbG9yIi8+CjxwYXRoIGQ9Ik0xMC40NjY0IDE2Ljg2QzEwLjQ2NjQgMTUuNTY0IDExLjI0NCAxNC4zNzYgMTIuNDUzNiAxMy44NzkyTDE0Ljg5NDQgMTIuODY0QzE3LjM3ODQgMTEuODQ4OCAyMC4xIDEzLjY2MzIgMjAuMSAxNi4zNDE2QzIwLjEgMTguNDE1MiAxOC40MTUyIDIwLjEgMTYuMzQxNiAyMC4xSDEzLjY4NDhDMTEuOTEzNiAyMC4xIDEwLjQ2NjQgMTguNjUyOCAxMC40NjY0IDE2Ljg2WiIgZmlsbD0iY3VycmVudENvbG9yIi8+CjxwYXRoIGQ9Ik02LjY4NjQyIDE0LjE4MTZDNS4xNTI4MiAxNC4xODE2IDMuOTAwMDIgMTUuNDM0NCAzLjkwMDAyIDE2Ljk2OFYxNy4zMzUyQzMuOTAwMDIgMTguODQ3MiA1LjE1MjgyIDIwLjEgNi42ODY0MiAyMC4xQzguMjIwMDMgMjAuMSA5LjQ3MjgzIDE4Ljg0NzIgOS40NzI4MyAxNy4zMTM2VjE2Ljk0NjRDOS40NTEyMyAxNS40MzQ0IDguMjIwMDMgMTQuMTgxNiA2LjY4NjQyIDE0LjE4MTZaIiBmaWxsPSJjdXJyZW50Q29sb3IiLz4KPC9zdmc+Cg==",
			"DeepSeek": "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCA0MCA0MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTM1LjY2MzggOS45MTk2NUMzNS4zMjUxIDkuNzU0MzIgMzUuMTc4NSAxMC4wNzAzIDM0Ljk4MTEgMTAuMjMxNkMzNC45MTMxIDEwLjI4MzYgMzQuODU1OCAxMC4zNTE2IDM0Ljc5ODUgMTAuNDEzQzM0LjMwMjUgMTAuOTQyMyAzMy43MjM4IDExLjI4OSAzMi45Njc4IDExLjI0NzZDMzEuODYyNSAxMS4xODYzIDMwLjkxODYgMTEuNTMzIDMwLjA4MzkgMTIuMzc4M0MyOS45MDY2IDExLjMzNTYgMjkuMzE3MyAxMC43MTQzIDI4LjQyMTMgMTAuMzE0M0MyNy45NTE5IDEwLjEwNjMgMjcuNDc3MyA5Ljg5OTY1IDI3LjE0OCA5LjQ0NzY2QzI2LjkxODYgOS4xMjYzMyAyNi44NTYgOC43Njc2NyAyNi43NDEzIDguNDE1NjhDMjYuNjY4IDguMjAyMzUgMjYuNTk0NiA3Ljk4NTAyIDI2LjM1MDYgNy45NDkwMkMyNi4wODQgNy45MDc2OSAyNS45OCA4LjEzMDM1IDI1Ljg3NiA4LjMxNzAyQzI1LjQ1ODcgOS4wNzk2NyAyNS4yOTczIDkuOTE5NjUgMjUuMzEzMyAxMC43NzAzQzI1LjM0OTMgMTIuNjg0OSAyNi4xNTczIDE0LjIxMDIgMjcuNzY0IDE1LjI5NDJDMjcuOTQ2NiAxNS40MTgyIDI3Ljk5MzMgMTUuNTQzNSAyNy45MzU5IDE1LjcyNDlDMjcuODI2NiAxNi4wOTgyIDI3LjY5NiAxNi40NjA5IDI3LjU4MTMgMTYuODM1NUMyNy41MDggMTcuMDc0MiAyNy4zOTg2IDE3LjEyNDggMjcuMTQyNiAxNy4wMjIyQzI2LjI3NzcgMTYuNjUwNCAyNS40OTE5IDE2LjExNjQgMjQuODI4IDE1LjQ0ODlDMjMuNjg1NCAxNC4zNDQ5IDIyLjY1MzQgMTMuMTI2MyAyMS4zNjU0IDEyLjE3MTZDMjEuMDY3IDExLjk1MTEgMjAuNzYwNiAxMS43NDE2IDIwLjQ0NjggMTEuNTQzNkMxOS4xMzM1IDEwLjI2NzYgMjAuNjIwMSA5LjIxOTY3IDIwLjk2NDEgOS4wOTU2N0MyMS4zMjQxIDguOTY1IDIxLjA4ODEgOC41MTk2OCAxOS45MjU0IDguNTI1MDFDMTguNzYyOCA4LjUzMDM1IDE3LjY5ODggOC45MTgzNCAxNi4zNDI4IDkuNDM2OTlDMTYuMTQxMyA5LjUxNDIxIDE1LjkzNCA5LjU3NTI5IDE1LjcyMjkgOS42MTk2NkMxNC40NTU3IDkuMzgwOTEgMTMuMTU5OCA5LjMzNTA2IDExLjg3ODkgOS40ODM2NkM5LjM2NTY1IDkuNzYzNjUgNy4zNTkwMiAxMC45NTMgNS44ODMwNSAxMi45ODA5QzQuMTA5NzUgMTUuNDE4MiAzLjY5MjQzIDE4LjE4ODggNC4yMDMwOCAyMS4wNzY4QzQuNzQwNDEgMjQuMTIyIDYuMjk1MDQgMjYuNjQzMyA4LjY4MyAyOC42MTM5QzExLjE2MDMgMzAuNjU3OSAxNC4wMTIyIDMxLjY1OTIgMTcuMjY2OCAzMS40NjcyQzE5LjI0MjggMzEuMzUzOSAyMS40NDQxIDMxLjA4ODYgMjMuOTI1NCAyOC45ODczQzI0LjU1MiAyOS4yOTkzIDI1LjIwOCAyOS40MjMzIDI2LjI5ODYgMjkuNTE2NkMyNy4xMzg2IDI5LjU5NTMgMjcuOTQ2NiAyOS40NzY2IDI4LjU3MTkgMjkuMzQ1OUMyOS41NTE5IDI5LjEzNzkgMjkuNDgzOSAyOC4yMyAyOS4xMzA2IDI4LjA2NDZDMjYuMjU3MyAyNi43MjYgMjYuODg4IDI3LjI3MTMgMjYuMzEzMyAyNi44M0MyNy43NzQ2IDI1LjEwMiAyOS45NzQ2IDIzLjMwNzQgMzAuODM1OSAxNy40OTI4QzMwLjkwMjYgMTcuMDMwMiAzMC44NDUyIDE2LjczOTUgMzAuODM1OSAxNi4zNjYyQzMwLjgzMDYgMTYuMTM5NSAzMC44ODI2IDE2LjA1MDIgMzEuMTQyNiAxNi4wMjQ5QzMxLjg2MzkgMTUuOTUgMzIuNTYzNyAxNS43MzQ5IDMzLjIwMjUgMTUuMzkxNUMzNS4wNjM4IDE0LjM3NDIgMzUuODE1OCAxMi43MDQ5IDM1Ljk5MzEgMTAuNzAyM0MzNi4wMTk4IDEwLjM5NTYgMzUuOTg3OCAxMC4wODEgMzUuNjYzOCA5LjkxOTY1Wk0xOS40NDE0IDI3Ljk0MzNDMTYuNjU2MiAyNS43NTQgMTUuMzA1NSAyNS4wMzI3IDE0Ljc0ODIgMjUuMDYzNEMxNC4yMjU2IDI1LjA5NTQgMTQuMzIwMiAyNS42OTEzIDE0LjQzNDkgMjYuMDgwN0MxNC41NTQ5IDI2LjQ2NDcgMTQuNzEwOSAyNi43Mjg2IDE0LjkyOTUgMjcuMDY2QzE1LjA4MTUgMjcuMjg4NiAxNS4xODU1IDI3LjYyMDYgMTQuNzc4OSAyNy44N0MxMy44ODE2IDI4LjQyNDYgMTIuMzIyOSAyNy42ODMzIDEyLjI0OTYgMjcuNjQ3M0MxMC40MzUgMjYuNTc4IDguOTE2MzIgMjUuMTY3MyA3Ljg0ODM0IDIzLjIzODFDNi44MTYzNyAyMS4zODA4IDYuMjE2MzggMTkuMzg4OCA2LjExNzcxIDE3LjI2MjJDNi4wOTEwNSAxNi43NDc1IDYuMjQxNzEgMTYuNTY2MiA2Ljc1MzcgMTYuNDcyOUM3LjQyNTgzIDE2LjM0NDIgOC4xMTQ1MSAxNi4zMjY3IDguNzkyMzMgMTYuNDIwOUMxMS42MzQ5IDE2LjgzNjggMTQuMDUzNiAxOC4xMDc1IDE2LjA4MjggMjAuMTE5NEMxNy4yNDAyIDIxLjI2NjEgMTguMTE2MSAyMi42MzU0IDE5LjAxODggMjMuOTc0QzE5Ljk3ODggMjUuMzk1MyAyMS4wMTA4IDI2Ljc1IDIyLjMyNTQgMjcuODU5M0MyMi43ODk0IDI4LjI0ODYgMjMuMTU4NyAyOC41NDQ2IDIzLjUxMzQgMjguNzYxOUMyMi40NDQxIDI4Ljg4MTkgMjAuNjYwMSAyOC45MDg2IDE5LjQ0MTQgMjcuOTQzM1pNMjAuNzc0OCAxOS4zNTY4QzIwLjc3NDUgMTkuMjkwNiAyMC43OTA0IDE5LjIyNTMgMjAuODIxMSAxOS4xNjY2QzIwLjg1MTcgMTkuMTA3OCAyMC44OTYyIDE5LjA1NzUgMjAuOTUwNyAxOS4wMTk4QzIxLjAwNTIgMTguOTgyMSAyMS4wNjggMTguOTU4MyAyMS4xMzM3IDE4Ljk1MDNDMjEuMTk5NSAxOC45NDI0IDIxLjI2NjIgMTguOTUwNSAyMS4zMjgxIDE4Ljk3NDFDMjEuNDA3IDE5LjAwMjQgMjEuNDc1IDE5LjA1NDYgMjEuNTIyOCAxOS4xMjM1QzIxLjU3MDYgMTkuMTkyMyAyMS41OTU4IDE5LjI3NDMgMjEuNTk0NyAxOS4zNTgxQzIxLjU5NDkgMTkuNDEyMyAyMS41ODQzIDE5LjQ2NTkgMjEuNTYzNiAxOS41MTU5QzIxLjU0MjggMTkuNTY1OSAyMS41MTIzIDE5LjYxMTMgMjEuNDczOCAxOS42NDk0QzIxLjQzNTQgMTkuNjg3NSAyMS4zODk3IDE5LjcxNzYgMjEuMzM5NSAxOS43Mzc4QzIxLjI4OTMgMTkuNzU4MSAyMS4yMzU2IDE5Ljc2ODIgMjEuMTgxNCAxOS43Njc1QzIxLjEyNzcgMTkuNzY3NiAyMS4wNzQ1IDE5Ljc1NzEgMjEuMDI0OCAxOS43MzY1QzIwLjk3NTIgMTkuNzE1OCAyMC45MzAyIDE5LjY4NTUgMjAuODkyNSAxOS42NDczQzIwLjg1NDggMTkuNjA5IDIwLjgyNSAxOS41NjM2IDIwLjgwNSAxOS41MTM4QzIwLjc4NSAxOS40NjM5IDIwLjc3MzkgMTkuNDEwNSAyMC43NzQ4IDE5LjM1NjhaTTI0LjkyMTMgMjEuNDg0OEMyNC42NTQ3IDIxLjU5MjggMjQuMzg5MyAyMS42ODYxIDI0LjEzNDcgMjEuNjk4MUMyMy43NTE2IDIxLjcxMTQgMjMuMzc1NiAyMS41OTE4IDIzLjA3MDcgMjEuMzU5NEMyMi43MDU0IDIxLjA1MjggMjIuNDQ0MSAyMC44ODIxIDIyLjMzNDcgMjAuMzQ4OEMyMi4yOTcgMjAuMDg4MSAyMi4zMDQyIDE5LjgyMyAyMi4zNTYxIDE5LjU2NDhDMjIuNDQ5NCAxOS4xMjg4IDIyLjM0NTQgMTguODQ4OCAyMi4wMzc0IDE4LjU5NTVDMjEuNzg4MSAxOC4zODc1IDIxLjQ2OTQgMTguMzMwMiAyMS4xMjAxIDE4LjMzMDJDMjEuMDAwNSAxOC4zMjMyIDIwLjg4NDMgMTguMjg3NSAyMC43ODE0IDE4LjIyNjJDMjAuNjM0OCAxOC4xNTQyIDIwLjUxNDggMTcuOTcyOCAyMC42Mjk0IDE3Ljc0ODhDMjAuNjY2OCAxNy42NzY4IDIwLjg0MjggMTcuNTAwOCAyMC44ODU0IDE3LjQ2ODhDMjEuMzYwMSAxNy4xOTk1IDIxLjkwODEgMTcuMjg3NSAyMi40MTM0IDE3LjQ5MDJDMjIuODgyNyAxNy42ODIyIDIzLjIzNzQgMTguMDM0MiAyMy43NDggMTguNTMyOEMyNC4yNjk0IDE5LjEzNDEgMjQuMzY0IDE5LjMwMDggMjQuNjYxMyAxOS43NTE1QzI0Ljg5NiAyMC4xMDQ4IDI1LjEwOTMgMjAuNDY3NCAyNS4yNTQ3IDIwLjg4MjFDMjUuMzQ0IDIxLjE0MjEgMjUuMjI5MyAyMS4zNTQxIDI0LjkyMTMgMjEuNDg0OFoiIGZpbGw9ImN1cnJlbnRDb2xvciIvPgo8L3N2Zz4K",
			"Google": "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCA0MCA0MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTM3IDIwLjAzNEMyNy44ODA5IDIwLjU4MzcgMjAuNTgwOCAyNy44ODA5IDIwLjAzMjYgMzdIMTkuOTY2QzE5LjQxNjMgMjcuODgwOSAxMi4xMTc3IDIwLjU4MzcgMyAyMC4wMzRWMTkuOTY3NEMxMi4xMTkxIDE5LjQxNjMgMTkuNDE2MyAxMi4xMTkxIDE5Ljk2NiAzSDIwLjAzMjZDMjAuNTgyMiAxMi4xMTkxIDI3Ljg4MDkgMTkuNDE2MyAzNyAxOS45Njc0VjIwLjAzNFoiIGZpbGw9ImN1cnJlbnRDb2xvciIvPgo8L3N2Zz4K",
			"Meta": "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCA0MCA0MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTI3LjE5NDIgOS4wMzUwOUMyNC40ODgxIDkuMDM1MDkgMjIuMzcyNiAxMS4wNzMxIDIwLjQ1NzQgMTMuNjYyM0MxNy44MjU4IDEwLjMxMTQgMTUuNjI1NSA5LjAzNTA5IDEyLjk5MjUgOS4wMzUwOUM3LjYyNDA0IDkuMDM1MDkgMy41MTAwMSAxNi4wMjM0IDMuNTEwMDEgMjMuNDE4MUMzLjUxMDAxIDI4LjA0NTMgNS43NDgzMSAzMC45NjQ5IDkuNDk4MzEgMzAuOTY0OUMxMi4xOTcxIDMwLjk2NDkgMTQuMTM4NyAyOS42OTMgMTcuNTkwNCAyMy42NTk0QzE3LjU5MDQgMjMuNjU5NCAxOS4wMjkgMjEuMTE5OSAyMC4wMTczIDE5LjM2OTlDMjAuMzY0MyAxOS45MjkzIDIwLjcyOTggMjAuNTMyNyAyMS4xMTM4IDIxLjE3OThMMjIuNzMyMiAyMy45MDJDMjUuODg0MyAyOS4xNzY5IDI3LjY0MTYgMzAuOTY0OSAzMC44MjI5IDMwLjk2NDlDMzQuNDc3OCAzMC45NjQ5IDM2LjUxIDI4LjAwNTggMzYuNTEgMjMuMjgyMkMzNi41MSAxNS41MzggMzIuMzAzOSA5LjAzNTA5IDI3LjE5NDIgOS4wMzUwOVpNMTQuOTU3NCAyMi4wMjYzQzEyLjE2MDYgMjYuNDEyMyAxMS4xOTI4IDI3LjM5NjIgOS42MzU3NCAyNy4zOTYyQzguMDMxOTQgMjcuMzk2MiA3LjA3ODcyIDI1Ljk4ODMgNy4wNzg3MiAyMy40NzgxQzcuMDc4NzIgMTguMTA5NiA5Ljc1NTYyIDEyLjYxOTkgMTIuOTQ3MSAxMi42MTk5QzE0LjY3NTIgMTIuNjE5OSAxNi4xMTk3IDEzLjYxNyAxOC4zMzE2IDE2Ljc4MzZDMTYuMjMwOCAyMC4wMDU4IDE0Ljk1NzQgMjIuMDI2MyAxNC45NTc0IDIyLjAyNjNaTTI1LjUyMDIgMjEuNDc1MUwyMy41ODMxIDE4LjI0NTZDMjMuMDk2OSAxNy40NTE0IDIyLjU5MzggMTYuNjY3NiAyMi4wNzQzIDE1Ljg5NDdDMjMuODE4NSAxMy4yMDMyIDI1LjI1NTYgMTEuODYxMSAyNi45Njc2IDExLjg2MTFDMzAuNTIwMiAxMS44NjExIDMzLjM2MzggMTcuMDk1IDMzLjM2MzggMjMuNTIxOUMzMy4zNjM4IDI1Ljk3MjIgMzIuNTYxMiAyNy4zOTQ3IDMwLjg5ODkgMjcuMzk0N0MyOS4zMDUzIDI3LjM5NDcgMjguNTQ1MSAyNi4zNDIxIDI1LjUxODggMjEuNDczNyIgZmlsbD0iY3VycmVudENvbG9yIi8+Cjwvc3ZnPgo=",
			"MiniMax": "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCA0MCA0MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTE3Ljg3NTggOS4yMDg2NUMxNy44NzU4IDguNTk0NjEgMTcuMzc3NyA4LjA5NjM0IDE2Ljc2NjMgOC4wOTYzNEMxNi4xNTUgOC4wOTYzNCAxNS42NTY3IDguNTk1NzUgMTUuNjU2NyA5LjIwODY1VjI3LjY0NDZDMTUuNjU2NyAyOS4wNzE0IDE0LjQ5ODUgMzAuMjMyNCAxMy4wNzU1IDMwLjIzMjRDMTEuNjUyMyAzMC4yMzI0IDEwLjQ5NDEgMjkuMDcxNCAxMC40OTQxIDI3LjY0NDZWMTUuODE2N0MxMC40OTQxIDE1LjIwMjcgOS45OTU5MSAxNC43MDQ0IDkuMzg0NTMgMTQuNzA0NEM4Ljc3MzE2IDE0LjcwNDQgOC4yNzUgMTUuMjAzOCA4LjI3NSAxNS44MTY3VjIwLjgzMDFDOC4yNzUgMjIuMjU2NyA3LjExNjc4IDIzLjQxNzkgNS42OTM2NCAyMy40MTc5QzQuMjcwNSAyMy40MTc5IDMuMTEyMyAyMi4yNTY3IDMuMTEyMyAyMC44MzAxVjE5LjAxMjlDMy4xMTIzIDE4LjYwNTQgMy40NDE3NyAxOC4yNzUyIDMuODQ4MjIgMTguMjc1MkM0LjI1NDY3IDE4LjI3NTIgNC41ODQxMyAxOC42MDU0IDQuNTg0MTMgMTkuMDEyOVYyMC44MzAxQzQuNTg0MTMgMjEuNDQ0MSA1LjA4MjI3IDIxLjk0MjQgNS42OTM2NCAyMS45NDI0QzYuMzA1MDIgMjEuOTQyNCA2LjgwMzE3IDIxLjQ0MyA2LjgwMzE3IDIwLjgzMDFWMTUuODE2N0M2LjgwMzE3IDE0LjM5IDcuOTYxMzkgMTMuMjI4OSA5LjM4NDUzIDEzLjIyODlDMTAuODA3NyAxMy4yMjg5IDExLjk2NTkgMTQuMzkgMTEuOTY1OSAxNS44MTY3VjI3LjY0NDZDMTEuOTY1OSAyOC4yNTg3IDEyLjQ2NDEgMjguNzU2OSAxMy4wNzU1IDI4Ljc1NjlDMTMuNjg2OCAyOC43NTY5IDE0LjE4NDkgMjguMjU3NSAxNC4xODQ5IDI3LjY0NDZWMjAuNDEyM1Y5LjIwODY1QzE0LjE4NDkgNy43ODE5NCAxNS4zNDMxIDYuNjIwODIgMTYuNzY2MyA2LjYyMDgyQzE4LjE4OTQgNi42MjA4MiAxOS4zNDc2IDcuNzgxOTQgMTkuMzQ3NiA5LjIwODY1VjI0LjQ3NDZDMTkuMzQ3NiAyNC44ODIxIDE5LjAxODIgMjUuMjEyMyAxOC42MTE3IDI1LjIxMjNDMTguMjA1MyAyNS4yMTIzIDE3Ljg3NTggMjQuODgyMSAxNy44NzU4IDI0LjQ3NDZWOS4yMDg2NVpNMzEuNTMxIDEzLjIyODlDMzAuMTA3OSAxMy4yMjg5IDI4Ljk0OTYgMTQuMzkgMjguOTQ5NiAxNS44MTY3VjI1LjY5NjlDMjguOTQ5NiAyNi4zMTEgMjguNDUxNSAyNi44MDkzIDI3Ljg0MDEgMjYuODA5M0MyNy4yMjg3IDI2LjgwOTMgMjYuNzMwNiAyNi4zMDk5IDI2LjczMDYgMjUuNjk2OVY5LjIwODY1QzI2LjczMDYgNy43ODE5NCAyNS41NzIzIDYuNjIwODIgMjQuMTQ5MiA2LjYyMDgyQzIyLjcyNjEgNi42MjA4MiAyMS41Njc5IDcuNzgxOTQgMjEuNTY3OSA5LjIwODY1VjMwLjEzODNDMjEuNTY3OSAzMC43NTIzIDIxLjA2OTcgMzEuMjUwNiAyMC40NTgzIDMxLjI1MDZDMTkuODQ2OSAzMS4yNTA2IDE5LjM0ODggMzAuNzUxMSAxOS4zNDg4IDMwLjEzODNWMjcuNTQ3MUMxOS4zNDg4IDI3LjEzOTYgMTkuMDE5NCAyNi44MDkzIDE4LjYxMjkgMjYuODA5M0MxOC4yMDY1IDI2LjgwOTMgMTcuODc3IDI3LjEzOTYgMTcuODc3IDI3LjU0NzFWMzAuMTM4M0MxNy44NzcgMzEuNTY1IDE5LjAzNTIgMzIuNzI2MSAyMC40NTgzIDMyLjcyNjFDMjEuODgxNSAzMi43MjYxIDIzLjAzOTcgMzEuNTY1IDIzLjAzOTcgMzAuMTM4M1Y5LjIwODY1QzIzLjAzOTcgOC41OTQ2MSAyMy41Mzc4IDguMDk2MzQgMjQuMTQ5MiA4LjA5NjM0QzI0Ljc2MDUgOC4wOTYzNCAyNS4yNTg3IDguNTk1NzUgMjUuMjU4NyA5LjIwODY1VjI1LjY5NjlDMjUuMjU4NyAyNy4xMjM3IDI2LjQxNyAyOC4yODQ4IDI3Ljg0MDEgMjguMjg0OEMyOS4yNjMyIDI4LjI4NDggMzAuNDIxNSAyNy4xMjM3IDMwLjQyMTUgMjUuNjk2OVYxNS44MTY3QzMwLjQyMTUgMTUuMjAyNyAzMC45MTk2IDE0LjcwNDQgMzEuNTMxIDE0LjcwNDRDMzIuMTQyNCAxNC43MDQ0IDMyLjY0MDUgMTUuMjAzOCAzMi42NDA1IDE1LjgxNjdWMjQuNDc0NkMzMi42NDA1IDI0Ljg4MjEgMzIuOTcgMjUuMjEyMyAzMy4zNzY0IDI1LjIxMjNDMzMuNzgyOSAyNS4yMTIzIDM0LjExMjMgMjQuODgyMSAzNC4xMTIzIDI0LjQ3NDZWMTUuODE2N0MzNC4xMTIzIDE0LjM5IDMyLjk1NDEgMTMuMjI4OSAzMS41MzEgMTMuMjI4OVoiIGZpbGw9ImN1cnJlbnRDb2xvciIvPgo8L3N2Zz4K",
			"Mistral AI": "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCA0MCA0MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTguOTI3ODMgOC44ODEwMUgxMy4zNTdWMTMuMzA4OEgxNy43ODYxVjE3LjczOEgxNy43ODM1SDIyLjIxNTJWMTMuMzA4OEgyNi42NDE4VjguODgxMDFIMzEuMDcyMlYyNi41OTQ5SDM1LjVWMzEuMDI0MUgyMi4yMTM5VjI2LjU5NjJIMTcuNzg2MVYyMi4xNjcxSDEzLjM1NTdWMjYuNTk0OUwxNy43ODYxIDI2LjU5NjJWMzEuMDI0MUg0LjVWMjYuNTk0OUg4LjkyNzgzVjguODgxMDFaTTIyLjIxMzkgMjYuNTk2MkgyNi42NDE4VjIyLjE2NzFIMjIuMjE1MlYyNi41OTYySDIyLjIxMzlaIiBmaWxsPSJjdXJyZW50Q29sb3IiLz4KPC9zdmc+Cg==",
			"OpenAI": "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCA0MCA0MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTMyLjgzNzcgMTcuMjgyQzMzLjIxMjcgMTYuMjUgMzMuMzA3MiAxNS4yMTggMzMuMjEyNyAxNC4xODc1QzMzLjExOTcgMTMuMTU3MSAzMi43NDQ3IDEyLjEyNTEgMzIuMjc1MiAxMS4xODc2QzMxLjQzMjIgOS43ODIwOSAzMC4yMTI3IDguNjU3MSAyOC44MDcyIDguMDAwMUMyNy4zMDcyIDcuMzQ0NjEgMjUuNzEyNyA3LjE1NzExIDI0LjExOTcgNy41MzIxMUMyMy4zNjk4IDYuNzgyMTIgMjIuNTI1MyA2LjEyNTEyIDIxLjU4NzggNS42NTcxM0MyMC42NTAzIDUuMTg5MTMgMTkuNTI1MyA1LjAwMDEzIDE4LjQ5NDggNS4wMDAxM0MxNi44ODUxIDQuOTkwNzQgMTUuMzEyNSA1LjQ4MjQ2IDEzLjk5NDggNi40MDcxMkMxMi42ODI0IDcuMzQzMTEgMTEuNzQ0OSA4LjY1NzEgMTEuMjc1NCAxMC4xNTcxQzEwLjE1MDQgMTAuNDM3NiA5LjIxMjg5IDEwLjkwNzEgOC4yNzUzOSAxMS40Njk2QzcuNDMyNCAxMi4xMjUxIDYuNzc1NDEgMTIuOTY5NiA2LjIxMjkxIDEzLjgxMjZDNS4zNjk5MiAxNS4yMTk1IDUuMDg3OTIgMTYuODEyNSA1LjI3NTQyIDE4LjQwN0M1LjQ2Mzk5IDE5Ljk5NjggNi4xMTYwNSAyMS40OTYgNy4xNTA0IDIyLjcxOEM2Ljc5NjA4IDIzLjcwODYgNi42Njc5NSAyNC43NjU5IDYuNzc1NDEgMjUuODEyNEM2Ljg2OTkxIDI2Ljg0NDQgNy4yNDQ5IDI3Ljg3NDkgNy43MTI5IDI4LjgxMjRDOC41NTczOSAzMC4yMTk0IDkuNzc1MzggMzEuMzQ0NCAxMS4xODI0IDMxLjk5OTlDMTIuNjgyNCAzMi42NTY5IDE0LjI3NTMgMzIuODQ0NCAxNS44Njk4IDMyLjQ2OTRDMTYuNjE5OCAzMy4yMTk0IDE3LjQ2MjggMzMuODc0OSAxOC40MDAzIDM0LjM0NDRDMTkuMzM3OCAzNC44MTM5IDIwLjQ2MjggMzQuOTk5OSAyMS40OTQ4IDM0Ljk5OTlDMjMuMTA0MyAzNS4wMDk3IDI0LjY3NjkgMzQuNTE4NSAyNS45OTQ3IDMzLjU5NDRDMjcuMzA3MiAzMi42NTY5IDI4LjI0NDcgMzEuMzQ0NCAyOC43MTI3IDI5Ljg0NDRDMjkuNzcxOSAyOS42NDMyIDMwLjc2ODIgMjkuMTkzNCAzMS42MTk3IDI4LjUzMTlDMzIuNDYyNyAyNy44NzQ5IDMzLjIxMjcgMjcuMTI0OSAzMy42ODIyIDI2LjE4NzRDMzQuNTI1MSAyNC43ODE5IDM0LjgwNzEgMjMuMTg3NSAzNC42MTk2IDIxLjU5NDVDMzQuNDMyMiAyMCAzMy44Njk3IDE4LjUwMTUgMzIuODM3NyAxNy4yODJaTTIxLjU4NzggMzMuMDMwNEMyMC4wODc4IDMzLjAzMDQgMTguOTYyOCAzMi41NjA5IDE3LjkzMjMgMzEuNzE3OUMxNy45MzIzIDMxLjcxNzkgMTguMDI1MyAzMS42MjM0IDE4LjExOTggMzEuNjIzNEwyNC4xMTk3IDI4LjE1NTRDMjQuMjg2MiAyOC4wODAzIDI0LjQxOTYgMjcuOTQ2OSAyNC40OTQ3IDI3Ljc4MDRDMjQuNTY5OCAyNy42MzYgMjQuNjAyMSAyNy40NzMxIDI0LjU4NzcgMjcuMzEwOVYxOC44NzVMMjcuMTE5NyAyMC4zNzVWMjcuMzEyNEMyNy4xNDU1IDI4LjA1NDcgMjcuMDIxNSAyOC43OTQ1IDI2Ljc1NSAyOS40ODc4QzI2LjQ4ODUgMzAuMTgxIDI2LjA4NSAzMC44MTM0IDI1LjU2ODcgMzEuMzQ3M0MyNS4wNTIzIDMxLjg4MTEgMjQuNDMzNyAzMi4zMDU0IDIzLjc0OTcgMzIuNTk0OUMyMy4wNjU4IDMyLjg4NDMgMjIuMzMwNSAzMy4wMzE0IDIxLjU4NzggMzMuMDMwNFpNOS40OTQ4OCAyNy44NzQ5QzguODM3ODkgMjYuNzQ5OSA4LjU1NzM5IDI1LjQzNzQgOC44Mzc4OSAyNC4xMjVDOC44Mzc4OSAyNC4xMjUgOC45MzIzOSAyNC4yMTk1IDkuMDI1MzkgMjQuMjE5NUwxNS4wMjUzIDI3LjY4NzRDMTUuMTY5MyAyNy43NjM4IDE1LjMzMjUgMjcuNzk2NiAxNS40OTQ4IDI3Ljc4MTlDMTUuNjgyMyAyNy43ODE5IDE1Ljg2OTggMjcuNzgxOSAxNS45NjI4IDI3LjY4NzRMMjMuMjc1MyAyMy40Njk1VjI2LjM3NDlMMTcuMTgyMyAyOS45Mzc0QzE2LjU1MDYgMzAuMzA0MiAxNS44NTI3IDMwLjU0MjcgMTUuMTI4NyAzMC42MzkzQzE0LjQwNDYgMzAuNzM1OCAxMy42Njg2IDMwLjY4ODQgMTIuOTYyOSAzMC40OTk5QzExLjQ2MjkgMzAuMTI0OSAxMC4yNDQ5IDI5LjE4NzQgOS40OTQ4OCAyNy44NzQ5Wk03LjkwMDQgMTQuODQ0NUM4LjU2MjM5IDEzLjcyMzQgOS41ODgyNiAxMi44NjI3IDEwLjgwNzQgMTIuNDA1NlYxOS41MzJDMTAuODA3NCAxOS43MTggMTAuODA3NCAxOS45MDcgMTAuOTAwNCAyMEMxMC45NzU1IDIwLjE2NjUgMTEuMTA4OSAyMC4yOTk4IDExLjI3NTQgMjAuMzc1TDE4LjU4NzggMjQuNTk0NEwxNi4wNTczIDI2LjA5NDRMMTAuMDU3NCAyMi42MjVDOS40MTg0MiAyMi4yNjM5IDguODU3NDIgMjEuNzc5NyA4LjQwNjg0IDIxLjIwMDRDNy45NTYyNyAyMC42MjExIDcuNjI1MDYgMTkuOTU4MiA3LjQzMjQgMTkuMjVDNy4wNTc0MSAxNy44NDQ1IDcuMTUwNCAxNi4xNTcgNy45MDA0IDE0Ljg0NDVaTTI4LjYxOTcgMTkuNjI1TDIxLjMwNzMgMTUuNDA3TDIzLjgzNzcgMTMuOTA3MUwyOS44Mzc3IDE3LjM3NUMzMC43NzUyIDE3LjkzNzUgMzEuNTI1MiAxOC42ODc1IDMxLjk5NDcgMTkuNjI1QzMyLjQ2NDIgMjAuNTYyNSAzMi43NDQ3IDIxLjU5NDUgMzIuNjUwMiAyMi43MTk1QzMyLjU2MDMgMjMuNzc1NSAzMi4xNjk5IDI0Ljc4MzcgMzEuNTI1MiAyNS42MjQ5QzMwLjg2OTcgMjYuNDY5NCAzMC4wMjUyIDI3LjEyNDkgMjguOTk0NyAyNy40OTk5VjIwLjM3NUMyOC45OTQ3IDIwLjE4NzUgMjguOTk0NyAyMCAyOC45MDAyIDE5LjkwN0MyOC45MDAyIDE5LjkwNyAyOC44MDcyIDE5LjcxOCAyOC42MTk3IDE5LjYyNVpNMzEuMTUwMiAxNS44NzVDMzEuMTUwMiAxNS44NzUgMzEuMDU3MiAxNS43ODIgMzAuOTYyNyAxNS43ODJMMjQuOTYyNyAxMi4zMTI2QzI0Ljc3NTIgMTIuMjE5NiAyNC42ODIyIDEyLjIxOTYgMjQuNDk0NyAxMi4yMTk2QzI0LjMwNzIgMTIuMjE5NiAyNC4xMTk3IDEyLjIxOTYgMjQuMDI1MiAxMi4zMTI2TDE2LjcxMjggMTYuNTMyVjEzLjYyNTFMMjIuODA3MyAxMC4wNjI2QzIzLjc0NDggOS41MDAwOSAyNC43NzUyIDkuMzEyNTkgMjUuOTAwMiA5LjMxMjU5QzI2LjkzMjIgOS4zMTI1OSAyNy45NjI3IDkuNjg3NTkgMjguOTAwMiAxMC4zNDQ2QzI5Ljc0NDcgMTEuMDAwMSAzMC40OTQ3IDExLjg0NDYgMzAuODY5NyAxMi43ODIxQzMxLjI0NDcgMTMuNzE5NiAzMS4zMzc3IDE0Ljg0NDUgMzEuMTUwMiAxNS44NzVaTTE1LjQwMDMgMjEuMTI1TDEyLjg2OTkgMTkuNjI1VjEyLjU5NDZDMTIuODY5OSAxMS41NjI2IDEzLjE1MDMgMTAuNDM3NiAxMy43MTI4IDkuNTk0NTlDMTQuMjc1MyA4LjY1NzEgMTUuMTE5OCA4LjAwMDEgMTYuMDU3MyA3LjUzMjExQzE3LjAxMjcgNy4wNTI0OSAxOC4wOTU2IDYuODg4MTIgMTkuMTUwMyA3LjA2MjYxQzIwLjE4MjMgNy4xNTcxMSAyMS4yMTI4IDcuNjI1MTEgMjIuMDU3MyA4LjI4MjFDMjIuMDU3MyA4LjI4MjEgMjEuOTYyOCA4LjM3NTEgMjEuODY5OCA4LjM3NTFMMTUuODY5OCAxMS44NDQ2QzE1LjcwMzMgMTEuOTE5NyAxNS41NyAxMi4wNTMxIDE1LjQ5NDggMTIuMjE5NkMxNS40MDAzIDEyLjQwNzEgMTUuNDAwMyAxMi41MDAxIDE1LjQwMDMgMTIuNjg3NlYyMS4xMjVaTTE2LjcxMjggMTguMTI1TDE5Ljk5NDggMTYuMjVMMjMuMjc1MyAxOC4xMjVWMjEuODc1TDE5Ljk5NDggMjMuNzVMMTYuNzEyOCAyMS44NzVWMTguMTI1WiIgZmlsbD0iY3VycmVudENvbG9yIi8+Cjwvc3ZnPgo=",
			"xAI": "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCA0MCA0MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTEyLjQ1NzkgMTUuNjAzNkwyNi4xNTI5IDM1SDIwLjA2NTZMNi4zNzA1OSAxNS42MDM2SDEyLjQ1NzlaTTEyLjQ1MjQgMjYuMzc2NEwxNS40OTc0IDMwLjY5MDlMMTIuNDU1MSAzNUg2LjM2Mzc3TDEyLjQ1MjQgMjYuMzc2NFpNMzMuNjM2NSA3LjE1NzI3VjM1SDI4LjY0N1YxNC4yMjM2TDMzLjYzNjUgNy4xNTcyN1pNMzMuNjM2NSA1TDIwLjA2NTYgMjQuMjIwNUwxNy4wMjA2IDE5LjkwNzNMMjcuNTQ1MSA1SDMzLjYzNjVaIiBmaWxsPSJjdXJyZW50Q29sb3IiLz4KPC9zdmc+Cg==",
			"阿里通义": "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCA0MCA0MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTM3Ljk5OTggMjMuMDIxQzMzLjc5OTggMjUuMjg4OSAyOS41Njk4IDI3LjM2NDkgMjQuODYxNCAyOC4zMDY5QzIzLjgxMTQgMjguNTE1NCAyMi42NDc0IDI4LjUxNTQgMjEuNTgwOSAyOC4zNzE0QzIwLjU2MzkgMjguMjQzOSAyMC4wNTU0IDI3LjM0ODQgMjAuNDE2OSAyNi40MDY0QzIwLjc2MTkgMjUuNTI4OSAyMS4yMjA5IDI0LjYzNSAyMS44MTE5IDIzLjlDMjMuMDg5OSAyMi4zMDI1IDI0LjUzMjkgMjAuODQ5IDI1LjgyODkgMTkuMjY4QzI2LjYyMDMgMTguMjk5MSAyNy4zMzM1IDE3LjI2ODkgMjcuOTYxOCAxNi4xODdDMjguNDIwOCAxNS40MjA1IDI4LjIwNzggMTQuNDkzNSAyNy40MDM4IDE0LjExMUMyNi4wNTg0IDEzLjQ1NTYgMjQuNjE1NCAxMi45OTM2IDIzLjE4ODkgMTIuNDk4NkMyMy4wMjM5IDEyLjQzNDEgMjIuNzc3OSAxMi42MDk2IDIyLjQ1MDkgMTIuNzIyMUMyMi44NjA0IDEzLjA4ODEgMjMuMTU1OSAxMy4zNTk2IDIzLjU2NTQgMTMuNzI3QzE5LjMzMzkgMTQuNDQ3IDE1LjMzMDUgMTUuNDY3IDExLjQ0NTUgMTYuODc0QzExLjQyNzUgMTYuOTUzNSAxMS4zOTYgMTcuMDE2NSAxMS40MTEgMTcuMDQ5NUMxMS45ODU1IDE3LjkyNyAxMS43MjMgMTguNTk3NSAxMC44ODYgMTkuMTQwNUMxMC41NjExIDE5LjM1MzEgMTAuMjczMiAxOS42MTc2IDEwLjAzNCAxOS45MjM1QzEyLjU5MyAyMC42NzM1IDE0Ljg3MyAyMC4yNDMgMTcuMDUzOSAxOC44MjFDMTYuOTIzNCAxOC42MzA1IDE2Ljc5MTQgMTguNDU1IDE2LjY2MDkgMTguMjYzQzE3LjQ3OTkgMTguNDA3IDE3Ljk3MTkgMTguODU0IDE4LjAzNzkgMTkuNTU2QzE4LjA1NDQgMTkuNzE2NSAxNy45NTY5IDE5Ljg3NTUgMTcuOTA3NCAyMC4wMzZDMTcuNzkxOSAxOS45MDcgMTcuNjQ0OSAxOS43ODEgMTcuNTQ3NCAxOS42MzU1QzE3LjQ3OTkgMTkuNTM5NSAxNy40NjM0IDE5LjQyODUgMTcuNDE1NCAxOS4yNjhDMTQuODIzNSAyMC45OTMgMTIuMDM1IDIxLjQyNSA4Ljk2NzUxIDIwLjUzMUM4Ljk2NzUxIDIxLjEzNyA4LjkzNDUxIDIxLjY0ODUgOC45ODQwMSAyMi4xNDM1QzkuMDE3MDEgMjIuNTc0IDguODM3MDEgMjIuNzY2IDguNDQ0MDEgMjIuOTg5NUM3LjU1NzUyIDIzLjUzMjUgNi42MzgwMyAyNC4wOTIgNS45MDAwMyAyNC44MTA1QzUuMDE1MDQgMjUuNjg3OSA1LjM0MzU0IDI2Ljc1ODkgNi41NDA1MyAyNy4yMDU5QzcuOTAxMDIgMjcuNzE1OSA5LjMyOSAyNy43MzA5IDEwLjc1NTUgMjcuNTU2OUMxMi40NDQ1IDI3LjM0ODQgMTQuMTAwNSAyNy4wNzY5IDE1LjkzOTQgMjYuODIxOUMxMy43OSAyNy44MjY5IDExLjY3MzUgMjguNTMxOSA5LjQ0NDUgMjguODE2OUM3Ljg4NDUyIDI5LjAyNjkgNi4zMjc1MyAyOS4xMzc5IDQuNzg1NTQgMjguNjkwOUMyLjU3MTU2IDI4LjA2ODQgMS41ODYwNyAyNi40Mzk0IDIuMTYwNTcgMjQuMjUxQzIuNzAyMDYgMjIuMjA2NSA0LjAxNDU1IDIwLjU3NzUgNS40MjQ1NCAxOS4wNzZDMTAuMTMzIDE0LjA3OCAxNi4wODY0IDExLjU0MDEgMjIuOTc0NCAxMS4wMjg2QzI0LjU4MjQgMTAuOTE3NiAyNi4yMDY5IDExLjEyNDYgMjcuNzE0MyAxMS43OTUxQzI5LjgzMDggMTIuNzUzNiAzMC43MTczIDE0Ljc4IDI5LjY4MzggMTYuODI2QzI5LjAxMTggMTguMTgzNSAyOC4wNzU4IDE5LjQyODUgMjcuMTQxMyAyMC42NTg1QzI2LjIyMzQgMjEuODcyIDI1LjE4OTkgMjIuOTg5NSAyNC4yMjI0IDI0LjE1NUMyMy45NDM0IDI0LjUwNiAyMy42ODA5IDI0Ljg3NSAyMy40Njc5IDI1LjI3MjRDMjMuMDU2OSAyNi4wMjI0IDIzLjMzNTkgMjYuNTE3NCAyNC4yMDU5IDI2LjQzOTRDMjYuMDI1NCAyNi4yNjI0IDI3Ljg4MDggMjYuMTE5OSAyOS42MzU4IDI1LjY3MjlDMzIuMjA5OCAyNS4wMTc0IDM0LjcxOTMgMjQuMDkyIDM3LjI2MTggMjMuMjc3NUMzNy41MjQzIDIzLjIxMyAzNy43NzAzIDIzLjExNyAzNy45OTk4IDIzLjAyMjVWMjMuMDIxWiIgZmlsbD0iY3VycmVudENvbG9yIi8+Cjwvc3ZnPgo=",
			"阶跃星辰": "data:image/svg+xml;base64,PHN2ZwogIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIKICB2aWV3Qm94PSIwIDAgMjggMjgiCiAgICA+CiAgICAgIDxnIGNsaXBQYXRoPSJ1cmwoI2NsaXAwXzkzOTZfOTI0MCkiPgogICAgICAgIDxwYXRoCiAgICAgICAgICBkPSJNMTQgMEM2LjI3MiAwIDAgNi4yNzIgMCAxNEMwIDIxLjcyOCA2LjI3MiAyOCAxNCAyOEMyMS43MjggMjggMjggMjEuNzI4IDI4IDE0QzI4IDYuMjcyIDIxLjcyOCAwIDE0IDBaTTEwLjIyIDIyLjg3Nkg1LjExVjE3Ljc2NkgxMC4yMlYyMi44NzZaTTE2LjU0OCAyMi44NzZIMTEuNDM4VjE3Ljc2NkgxNi41NDhWMjIuODc2Wk0xNi41NDggMTYuNTYySDExLjQzOFYxMS40MzhIMTYuNTQ4VjE2LjU2MlpNMTYuNTQ4IDEwLjIzNEgxMS40MzhWNS4xMjRIMTYuNTQ4VjEwLjIzNFpNMjIuODc2IDEwLjIzNEgxNy43NjZWNS4xMUgyMi44NzZWMTAuMjM0WiIKICAgICAgICAgIGZpbGw9ImN1cnJlbnRDb2xvciIKICAgICAgICAvPgogICAgICA8L2c+CiAgICAgIDxkZWZzPgogICAgICAgIDxjbGlwUGF0aCBpZD0iY2xpcDBfOTM5Nl85MjQwIj4KICAgICAgICAgIDxyZWN0IHdpZHRoPSIyOCIgaGVpZ2h0PSIyOCIgLz4KICAgICAgICA8L2NsaXBQYXRoPgogICAgICA8L2RlZnM+CiAgICA8L3N2Zz4K",
			"美团": "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAzNiAzNiIgZmlsbD0iY3VycmVudENvbG9yIj4KICA8ZyB0cmFuc2Zvcm09InRyYW5zbGF0ZSgwIDAuNDgpIj4KICAgIDxwYXRoIGZpbGwtcnVsZT0iZXZlbm9kZCIgZD0iTTEuNjY1NDQzMDIwMzA5NDQ4MSwyOS41MTk4MTAyNDQ3NTA5OEMxLjE4OTg2MjAyMDMwOTQ0ODMsMjkuNTE5ODEwMjQ0NzUwOTgsMC44NDQ5MzIwMjAzMDk0NDgzLDI5LjA2NjkxMDI0NDc1MDk3NSwwLjk3MTM0NDUyMDMwOTQ0ODMsMjguNjA4NDEwMjQ0NzUwOTc4TDcuMDQzNzg5MDIwMzA5NDQ5LDYuNTg0ODYwMjQ0NzUwOTc3QzcuMzAzMzQ5MDIwMzA5NDQ4LDUuNjQzMzkzMjQ0NzUwOTc2NSw4LjQwNDk0OTAyMDMwOTQ0OSw1LjIyNzkwMjI0NDc1MDk3Niw5LjIyMTYwOTAyMDMwOTQ0Nyw1Ljc2MzQyNTI0NDc1MDk3N0wxNy4yMTE3MjkwMjAzMDk0NSwxMS4wMDI4ODAyNDQ3NTA5NzZDMTcuNjkwNTI5MDIwMzA5NDQ4LDExLjMxNjgzMDI0NDc1MDk3NiwxOC4zMDk4MjkwMjAzMDk0NDcsMTEuMzE3MzQwMjQ0NzUwOTc3LDE4Ljc4OTEyOTAyMDMwOTQ1LDExLjAwNDEwMDI0NDc1MDk3NkwyNi44MTMyMjkwMjAzMDk0NSw1Ljc2MDU1MDI0NDc1MDk3NkMyNy42MzA2MjkwMjAzMDk0NSw1LjIyNjM5NTI0NDc1MDk3NywyOC43MzEzMjkwMjAzMDk0NSw1LjY0MzQyMTI0NDc1MDk3NywyOC45ODk2MjkwMjAzMDk0NDcsNi41ODUxMDAyNDQ3NTA5NzY2TDM1LjAzMDMyOTAyMDMwOTQ0NSwyOC42MDkzMTAyNDQ3NTA5NzZDMzUuMTU2MDI5MDIwMzA5NDUsMjkuMDY3NjEwMjQ0NzUwOTc3LDM0LjgxMTEyOTAyMDMwOTQ1LDI5LjUxOTgxMDI0NDc1MDk4LDM0LjMzNTkyOTAyMDMwOTQ1LDI5LjUxOTgxMDI0NDc1MDk4TDI2LjYyMzYyOTAyMDMwOTQ0OCwyOS41MTk4MTAyNDQ3NTA5OEMyOC4wMjc2MjkwMjAzMDk0NDgsMjcuODk0MjEwMjQ0NzUwOTc2LDI4LjgwMDAyOTAyMDMwOTQ1LDI1LjgxNzkxMDI0NDc1MDk3NiwyOC44MDAwMjkwMjAzMDk0NSwyMy42NzAwMTAyNDQ3NTA5NzZMMjguODAwMDI5MDIwMzA5NDUsMjMuNDE5MzEwMjQ0NzUwOTc4QzI4LjgwMDAyOTAyMDMwOTQ1LDIxLjMxODMxMDI0NDc1MDk3NSwyOC4wMzU4MjkwMjAzMDk0NSwxOS4yODkxMTAyNDQ3NTA5NzYsMjYuNjQ5ODI5MDIwMzA5NDQ3LDE3LjcxMDAxMDI0NDc1MDk3NkwyNS42NjAwMjkwMjAzMDk0NDgsMTIuNzQxODkwMjQ0NzUwOTc3QzI1LjYwMTkyOTAyMDMwOTQ1LDEyLjQ1MDAwMDI0NDc1MDk3OCwyNS4zNDU3MjkwMjAzMDk0NSwxMi4yMzk4MDAyNDQ3NTA5NzcsMjUuMDQ4MTI5MDIwMzA5NDUsMTIuMjM5ODAwMjQ0NzUwOTc3QzI0LjkxMzAyOTAyMDMwOTQ0OCwxMi4yMzk4MDAyNDQ3NTA5NzcsMjQuNzgxNjI5MDIwMzA5NDUsMTIuMjgzNTcwMjQ0NzUwOTc2LDI0LjY3MzYyOTAyMDMwOTQ1LDEyLjM2NDU4MDI0NDc1MDk3N0wyMC45NDE5MjkwMjAzMDk0NSwxNS4xNjMzOTAyNDQ3NTA5NzdDMjAuNjc2MTI5MDIwMzA5NDUsMTUuMzYyNjkwMjQ0NzUwOTc3LDIwLjMzMjQyOTAyMDMwOTQ0OCwxNS40MjYxOTAyNDQ3NTA5NzcsMjAuMDEzMDI5MDIwMzA5NDUsMTUuMzM0OTAwMjQ0NzUwOTc2QzE4LjY5NzMyOTAyMDMwOTQ1LDE0Ljk1OTAyMDI0NDc1MDk3NiwxNy4zMDI3MjkwMjAzMDk0NSwxNC45NTkwMjAyNDQ3NTA5NzYsMTUuOTg3MTI5MDIwMzA5NDQ4LDE1LjMzNDkwMDI0NDc1MDk3NkMxNS42Njc2MjkwMjAzMDk0NDgsMTUuNDI2MTkwMjQ0NzUwOTc3LDE1LjMyMzkyOTAyMDMwOTQ0OCwxNS4zNjI2OTAyNDQ3NTA5NzcsMTUuMDU4MjI5MDIwMzA5NDQ5LDE1LjE2MzM5MDI0NDc1MDk3N0wxMS4zMjQ4MjkwMjAzMDk0NDgsMTIuMzYzMzUwMjQ0NzUwOTc2QzExLjIxNzkyOTAyMDMwOTQ0OCwxMi4yODMxNDAyNDQ3NTA5NzYsMTEuMDg3ODI5MDIwMzA5NDQ4LDEyLjIzOTgwMDI0NDc1MDk3NywxMC45NTQxMjkwMjAzMDk0NDgsMTIuMjM5ODAwMjQ0NzUwOTc3QzEwLjY1NjIwOTAyMDMwOTQ0OSwxMi4yMzk4MDAyNDQ3NTA5NzcsMTAuNDAwNzE5MDIwMzA5NDQ5LDEyLjQ1MjM0MDI0NDc1MDk3NiwxMC4zNDY1MzkwMjAzMDk0NDgsMTIuNzQ1MjQwMjQ0NzUwOTc4TDkuMzg2Mjc5MDIwMzA5NDQ4LDE3LjkzNjYxMDI0NDc1MDk3N0M3Ljk4NTE4OTAyMDMwOTQ0OCwxOS4zNjEzMTAyNDQ3NTA5NzUsNy4yMDAwNjkwMjAzMDk0NDgsMjEuMjc5NjEwMjQ0NzUwOTc3LDcuMjAwMDY5MDIwMzA5NDQ4LDIzLjI3NzgxMDI0NDc1MDk3N0w3LjIwMDA2OTAyMDMwOTQ0OCwyMy43NTI3MTAyNDQ3NTA5NzVDNy4yMDAwNjkwMjAzMDk0NDgsMjUuODQ4MDEwMjQ0NzUwOTc3LDcuOTQ5NjI5MDIwMzA5NDQ4LDI3Ljg3NDMxMDI0NDc1MDk3Niw5LjMxMzIzOTAyMDMwOTQ0OCwyOS40NjUyMTAyNDQ3NTA5NzhMOS4zNjAwNjkwMjAzMDk0NDgsMjkuNTE5ODEwMjQ0NzUwOThMMS42NjU0NDMwMjAzMDk0NDgxLDI5LjUxOTgxMDI0NDc1MDk4WiIvPgogICAgPHBhdGggZD0iTTE0LjA0MDAwODMwNjUwMzI5NiwyNS4xOTk5ODA3NzM5MjU3OEwxNi4yMDAwMDgzMDY1MDMyOTYsMjUuMTk5OTgwNzczOTI1NzhMMTYuMjAwMDA4MzA2NTAzMjk2LDIwLjE1OTk4MDc3MzkyNTc4TDE0LjM2NzI4MTMwNjUwMzI5NiwyMC4xNTk5ODA3NzM5MjU3OEwxNC4wNDAwMDgzMDY1MDMyOTYsMjUuMTk5OTgwNzczOTI1NzhaTTIxLjk2MDAwODMwNjUwMzI5OCwyNS4xOTk5ODA3NzM5MjU3OEwxOS44MDAwMDgzMDY1MDMyOTQsMjUuMTk5OTgwNzczOTI1NzhMMTkuODAwMDA4MzA2NTAzMjk0LDIwLjE1OTk4MDc3MzkyNTc4TDIxLjYzMjcyODMwNjUwMzI5NiwyMC4xNTk5ODA3NzM5MjU3OEwyMS45NjAwMDgzMDY1MDMyOTgsMjUuMTk5OTgwNzczOTI1NzhaIi8+CiAgPC9nPgo8L3N2Zz4K",
			"腾讯混元": "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAzMiAzMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZmlsbC1ydWxlPSJldmVub2RkIiBjbGlwLXJ1bGU9ImV2ZW5vZGQiIGQ9Ik0xOC4wODM1IDI1LjE1NDFDMTkuNTgyMSAyNi43Njg0IDIxLjE0NjYgMjguMTI5MiAyMi42Njk0IDI5LjIxMTdMMjEuNTEwMyAzMC44NDE2QzE5Ljg5OTIgMjkuNjk2MyAxOC4yNTQzIDI4LjI2NzUgMTYuNjgwMiAyNi41ODA4QzE3LjE0NTUgMjYuMTQ4NiAxNy42MTQzIDI1LjY3MjIgMTguMDgzNSAyNS4xNTQxWk05Ljk5MzY1IDIuNzQ5NzlDMTEuNzYzOSAxLjczMjU1IDEzLjgwNTQgMi4yNDg5NyAxNS42NDc5IDMuMzIzMDRDMTcuNTIgNC40MTQ0OCAxOS40NTczIDYuMjI0NzcgMjEuMjYwMyA4LjMzODY2TDE5LjczNzggOS42MzY1MUMxOC4wMDQ1IDcuNjA0MzQgMTYuMjM4IDUuOTgxNjEgMTQuNjQxMSA1LjA1MDU4QzEzLjAxNDcgNC4xMDI0NyAxMS44MjAzIDQuMDA2ODIgMTAuOTg5NyA0LjQ4NDE3QzEwLjAzNjYgNS4wMzI1NSA5LjQxNjc4IDYuNDc0OTYgOS43ODI3MSA5LjE3MTY3QzkuODY1NDkgOS43ODEyNyA5Ljk5OTY1IDEwLjQzNDUgMTAuMTgxMiAxMS4xMjc3QzExLjYxNDQgMTAuOTQ5NyAxMy4wOTg1IDEwLjg1MTMgMTQuNjE2NyAxMC44NTQzQzE3LjcxMDQgMTAuODYwNCAyMC40NzQxIDExLjE1MDYgMjIuNzk0NCAxMS42ODA1TDIyLjc5NjQgMTEuNjgxNEMyMy4yIDExLjc2MDkgMjMuNTkxNCAxMS44NTggMjMuOTcwMiAxMS45NjU2QzIzLjk2ODUgMTEuOTcwMyAyMy45NjYxIDExLjk3NDYgMjMuOTY0NCAxMS45NzkzQzI0LjY2MSAxMi4xNzY2IDI1LjMxMDEgMTIuMzk2MSAyNS45MDY3IDEyLjY0MDRDMjguNjA2NiAxMy43NDYyIDMwLjYwNzcgMTUuNDk0NyAzMC42MDMgMTcuODg1NUMzMC41OTkgMTkuOTI3NCAyOS4xMzE0IDIxLjQzNzIgMjcuMjc5OCAyMi40OTU5QzI1LjM5ODYgMjMuNTcxNCAyMi44NjI1IDI0LjM0NCAyMC4xMzA0IDI0Ljg0ODRMMTkuNzY3MSAyMi44ODA3QzIyLjM5MzUgMjIuMzk1NyAyNC42ODE5IDIxLjY3NyAyNi4yODY2IDIwLjc1OTZDMjcuOTIwOSAxOS44MjUxIDI4LjYwMTEgMTguODM5NiAyOC42MDMgMTcuODgxNkMyOC42MDUxIDE2Ljc4MTggMjcuNjY2OSAxNS41MjM3IDI1LjE0NzkgMTQuNDkyQzI0LjU2NzIgMTQuMjU0MiAyMy45MjA4IDE0LjAzODcgMjMuMjEzNCAxMy44NDY1QzIyLjY1MTcgMTUuMTQzNyAyMi4wMDM1IDE2LjQ0NDQgMjEuMjYxMiAxNy43MjQ0QzE4LjkzOTIgMjEuNzI4MSAxNi40MzcgMjQuNzc2IDE0LjA2ODggMjYuNjA4MkMxMS43NjE0IDI4LjM5MzIgOS4yNDYzMSAyOS4yNTI5IDcuMTc4MjIgMjguMDUzNUM1LjQxMjA5IDI3LjAyOTEgNC44MzgyOCAyNS4wMDI2IDQuODQ3MTcgMjIuODY5OUM0Ljg1NjMyIDIwLjcwMzIgNS40NTUyNCAxOC4xMjA4IDYuMzg0MjggMTUuNTAyN0w4LjI3MDAyIDE2LjE3MTdDNy4zNzY4NSAxOC42ODg3IDYuODU0OTcgMjEuMDMwNCA2Ljg0NzE3IDIyLjg3ODdDNi44MzkzOSAyNC43NjA3IDcuMzUzNjcgMjUuODQyNCA4LjE4MjEzIDI2LjMyM0M5LjEzMzQ5IDI2Ljg3NDcgMTAuNjkyNSAyNi42OTE1IDEyLjg0NTIgMjUuMDI2MkMxMy4zMTkxIDI0LjY1OTUgMTMuODA0NSAyNC4yMjk1IDE0LjMwMDMgMjMuNzQyQzEzLjQ0OTMgMjIuNjEyOSAxMi42Mzk1IDIxLjQwMjEgMTEuODk3IDIwLjExMDFDOS41OTA4NCAxNi4wOTc2IDguMjAzMDMgMTIuNDA3MSA3LjgwMDI5IDkuNDQwMjJDNy40MDgwMyA2LjU0OTM2IDcuOTIxMTYgMy45NDEzNCA5Ljk5MzY1IDIuNzQ5NzlaTTE0LjYxMjggMTIuODU0M0MxMy4zMDQ0IDEyLjg1MTggMTIuMDIzNSAxMi45MjkxIDEwLjc4MjcgMTMuMDcwMUMxMS40MzUzIDE0LjkwMTMgMTIuMzgwOCAxNi45MzgxIDEzLjYzMTMgMTkuMTE0MUMxNC4yNjk4IDIwLjIyNDkgMTQuOTYwNiAyMS4yNzE1IDE1LjY4NDEgMjIuMjUzN0MxNi45NTUzIDIwLjc2NTQgMTguMjU5MiAxOC45MTM4IDE5LjUzMDggMTYuNzIxNUMyMC4xNjc5IDE1LjYyMyAyMC43MzE1IDE0LjUxMDIgMjEuMjI3MSAxMy40MDEyQzE5LjMyNDYgMTMuMDU1OCAxNy4xMDMzIDEyLjg1OTIgMTQuNjEyOCAxMi44NTQzWk02LjIzMTkzIDExLjg0MTZDNi4zOTc5OSAxMi40NTkgNi41OTgxNyAxMy4wOTgyIDYuODMxNTQgMTMuNzU2NkM0Ljg3MTcgMTQuMjIwNyAzLjA3MjE4IDE0LjgzNiAxLjQ5ODU0IDE1LjUzOThMMC42ODIxMjkgMTMuNzEzN0MyLjMzMTY3IDEyLjk3NTkgNC4yMDIyNCAxMi4zMzA5IDYuMjMxOTMgMTEuODQxNlpNMjQuODkwMSAzLjYyNjc1TDI1Ljg4NTMgMy43MDk3NkMyNS43MjA2IDUuNjg0NTkgMjUuMjk4MSA3Ljg0MjIxIDI0LjYxMjggMTAuMDcwMUMyNC4xNTcyIDkuOTM4MSAyMy42ODAxIDkuODE2NCAyMy4xODMxIDkuNzE4NTRDMjMuMDEwMSA5LjY4NDUgMjIuODMzNyA5LjY1NTkgMjIuNjU2NyA5LjYyNTc3QzIzLjMyNzggNy40NzkxNiAyMy43MzczIDUuNDExNzYgMjMuODkzMSAzLjU0Mjc2TDI0Ljg5MDEgMy42MjY3NVoiIGZpbGw9ImN1cnJlbnRDb2xvciIvPgo8L3N2Zz4K",
			"小米": "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCA0MCA0MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTE3LjM1OTggNS4wMzUyMkMxMy42Mzc4IDUuMjA1NzcgMTEuMzkwNSA1Ljc4NzY1IDkuNDc0MzIgNy4wNzE3OUM4LjEwOTkyIDcuOTc0NzEgNy4xMDY2OCA5LjE0ODQ5IDYuMzg0MzUgMTAuNjkzNUM1LjU5MTc5IDEyLjM4OSA1LjI0MDY2IDE0LjI1NSA1LjA5MDE3IDE3LjcyNjJDNC45MDk1OSAyMS42MDg3IDUuMTcwNDMgMjUuNDgxMiA1Ljc1MjMxIDI3LjUzNzhDNi4yNzM5OSAyOS40MDM5IDcuMTA2NjggMzAuODI4NSA4LjM4MDc5IDMyLjAyMjNDOS45NTU4OCAzMy40ODcgMTEuNzIxNiAzNC4yNTk1IDE0LjQ2MDQgMzQuNjcwOUMxNi45Njg1IDM1LjA0MjEgMjIuNzc3MyAzNS4wNjIxIDI1LjMxNTQgMzQuNzExQzI4LjQwNTQgMzQuMjg5NiAzMC4zNzE4IDMzLjQxNjggMzEuOTg3IDMxLjc0MTRDMzIuNzg5NiAzMC45MTg3IDMzLjE2MDggMzAuMzc3IDMzLjY4MjQgMjkuMjgzNUMzNC40OTUxIDI3LjU2NzkgMzQuODI2MSAyNS43OTIyIDM0Ljk4NjcgMjIuMjQwN0MzNS4xMDcgMTkuNzAyNiAzNC45ODY3IDE2LjA5MDkgMzQuNzM1OCAxNC40MDU1QzM0LjE0MzkgMTAuNDUyNyAzMi40NTg1IDcuODg0NDEgMjkuNTE5IDYuMzk5NjJDMjcuOTY0IDUuNjI3MTMgMjUuNjc2NiA1LjE3NTY3IDIyLjQ5NjMgNS4wMjUxOUMyMC4wOTg2IDQuOTE0ODMgMTkuNzc3NiA0LjkxNDgzIDE3LjM1OTggNS4wMzUyMlpNMjEuMDYxNyAxNC4zODU0QzIyLjM4NiAxNC42OTY0IDIzLjAyODEgMTUuMTM3OCAyMy40NDk0IDE2LjA0MDdDMjMuODgwOCAxNi45NjM3IDIzLjk1MSAxNy43MjYyIDIzLjk1MSAyMS44ODk2VjI1LjgwMjJMMjIuNTI2NCAyNS43NzIxTDIxLjA5MTggMjUuNzQyTDIxLjA0MTcgMjEuOTI5N0MyMC45OTE1IDE3Ljc2NjMgMjAuOTcxNCAxNy42MzU5IDIwLjM4OTUgMTcuMTg0NEMxOS44Njc5IDE2Ljc3MzEgMTkuNDI2NCAxNi43MjI5IDE2LjU3NzIgMTYuNzEyOUgxMy44Njg1TDEzLjgxODMgMjEuMjI3NUwxMy43NjgyIDI1Ljc0MkgxMC45NTkxTDEwLjkyOSAyMC4wMzM2QzEwLjkwOSAxNS41MjkxIDEwLjkzOSAxNC4yOTUxIDExLjAyOTMgMTQuMjM0OUMxMS4wOTk2IDE0LjE4NDcgMTMuMjM2NSAxNC4xNjQ3IDE1Ljc3NDcgMTQuMTg0N0MxOS40OTY3IDE0LjIyNDkgMjAuNTIgMTQuMjY1IDIxLjA2MTcgMTQuMzg1NFpNMjguOTQ3MiAxNC4zMjUyQzI5LjAxNzQgMTQuNDY1NyAyOS4wNDc1IDI1LjM3MDggMjguOTc3MyAyNS43MjJDMjguOTc3MyAyNS43NjIxIDI4LjMyNTIgMjUuNzgyMiAyNy41NDI2IDI1Ljc3MjFMMjYuMTA4IDI1Ljc0MkwyNi4wNzc5IDIwLjA4MzhDMjYuMDY3OSAxNS45OTA2IDI2LjA4NzkgMTQuMzg1NCAyNi4xNjgyIDE0LjI5NTFDMjYuMjU4NSAxNC4xODQ3IDI2LjYwOTYgMTQuMTU0NiAyNy41NzI3IDE0LjE1NDZDMjguNjk2NCAxNC4xNTQ2IDI4Ljg2NjkgMTQuMTc0NyAyOC45NDcyIDE0LjMyNTJaTTE4LjkzNDkgMjIuMjMwN1YyNS44MDIyTDE3LjQ2MDEgMjUuNzcyMUwxNS45NzUzIDI1Ljc0MkwxNS45NDUyIDIyLjMzMUMxNS45MzUyIDIwLjQ1NSAxNS45NDUyIDE4Ljg1OTggMTUuOTc1MyAxOC43OTk2QzE2LjAwNTQgMTguNjk5MyAxNi4zOTY3IDE4LjY2OTIgMTcuNDgwMiAxOC42NjkySDE4LjkzNDlWMjIuMjMwN1oiIGZpbGw9ImN1cnJlbnRDb2xvciIvPgo8L3N2Zz4K",
			"月之暗面": "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCA0MCA0MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTUuODU4OTMgMjYuMzQ5OUwxOC4xODAxIDI5LjY0NjNDMTguMTYzNSAzMC41MjIzIDE4LjE4OTQgMzEuMzk4NyAxOC4yNTc2IDMyLjI3MjJMMjUuOTUwNyAzNC4zMjk4QzIzLjY2OSAzNS4yNzE2IDIxLjE5NTIgMzUuNjU0NyAxOC43MzU1IDM1LjQ0NzFMMTguNTAzIDM1LjQyNjVMMTguNDQ2MiAzNS40MjEzTDE4LjMzNzcgMzUuNDA5N0wxOC4yMTYzIDM1LjM5NjhDMTguMTQ4NiAzNS4zODg2IDE4LjA4MSAzNS4zOCAxOC4wMTM1IDM1LjM3MDlMMTcuODc1MyAzNS4zNTI4TDE3LjczMzIgMzUuMzMyMkMxNy41OTUxIDM1LjMxMjEgMTcuNDU3MyAzNS4yOTAxIDE3LjMxOTggMzUuMjY2M0wxNy4yNjU2IDM1LjI1NkwxNy4xNjg3IDM1LjIzOTJMMTcuMDMwNSAzNS4yMTMzTDE2Ljk0MDEgMzUuMTk0TDE2LjgyIDM1LjE2OTRMMTYuNzIzMSAzNS4xNDg4TDE2LjYwMDQgMzUuMTIyOUwxNi40NzUxIDM1LjA5MzJMMTYuMzUzNyAzNS4wNjQ4TDE2LjI2NTkgMzUuMDQyOEwxNi4xNTIyIDM1LjAxNDRMMTYuMDM1OSAzNC45ODM0TDE1LjkxMzIgMzQuOTUxMUwxNS44MDczIDM0LjkyMTRMMTUuNjY2NSAzNC44ODI3TDE1LjU4NjQgMzQuODU2OEwxNS40Nzc5IDM0LjgyNDVMMTUuMzU3OCAzNC43ODg0TDE1LjIyMjIgMzQuNzQ0NUwxNS4xNDczIDM0LjcxOTlMMTUuMDQzOSAzNC42ODYzTDE0LjkyNzcgMzQuNjQ2M0wxNC44NDI0IDM0LjYxNTNDMTQuODIzNSAzNC42MDg5IDE0LjgwNDUgMzQuNjAyNSAxNC43ODU2IDM0LjU5NTlMMTQuNjk3OCAzNC41NjM2TDE0LjU2NzMgMzQuNTE1OEwxNC40OTM3IDM0LjQ4NzRMMTQuMzkwNCAzNC40NDg3TDE0LjI3OCAzNC40MDM1TDE0LjE2NDMgMzQuMzU4M0wxNC4wNjIzIDM0LjMxNjlMMTMuOTM5NiAzNC4yNjUzTDEzLjg1ODIgMzQuMjI5MUwxMy43NzY4IDM0LjE5NDJDMTMuNzU5MSAzNC4xODY1IDEzLjc0MTUgMzQuMTc4OCAxMy43MjM5IDM0LjE3MUwxMy42Mzg2IDM0LjEzMjJMMTMuNTA1NiAzNC4wNzE1TDEzLjQzODQgMzQuMDQwNUwxMy4zMTQ0IDMzLjk4MTFMMTMuMjM0MyAzMy45NDIzTDEzLjEyNTggMzMuODkwN0wxMy4wMTQ3IDMzLjgzMzhMMTIuODk0NiAzMy43NzMxTDEyLjgyNzQgMzMuNzM4M0wxMi42OTQ0IDMzLjY2NzJMMTIuNjIwOCAzMy42Mjg1TDEyLjU0NTkgMzMuNTg3MUMxMi41MjYgMzMuNTc2IDEyLjUwNjIgMzMuNTY0OCAxMi40ODY0IDMzLjU1MzZMMTIuMzY1IDMzLjQ4NTFMMTIuMjg3NSAzMy40NDEyTDEyLjIyMTcgMzMuNDAyNEwxMi4xMjg3IDMzLjM0OTVMMTIuMDIyNyAzMy4yODQ5TDExLjkwMjYgMzMuMjEyNkwxMS44MzU0IDMzLjE3MTJMMTEuNzI2OSAzMy4xMDI4TDExLjY0ODIgMzMuMDUyNEwxMS41NDYxIDMyLjk4NzhMMTEuNDU1NyAzMi45MjcxTDExLjM4NzIgMzIuODgxOUMxMS4zNjM5IDMyLjg2NjUgMTEuMzQwNyAzMi44NTEgMTEuMzE3NSAzMi44MzU0TDExLjI2MDcgMzIuNzk2NkwxMS4yMDM4IDMyLjc1NzlDMTEuMTg2NiAzMi43NDU5IDExLjE2OTMgMzIuNzMzOCAxMS4xNTIyIDMyLjcyMTdMMTEuMDc4NSAzMi42NzAxTDEwLjk4MDQgMzIuNjAwM0wxMC44OTEyIDMyLjUzNTdMMTAuNzk1NyAzMi40NjZMMTAuNzIzMyAzMi40MTE3TDEwLjYyNTIgMzIuMzM4MUwxMC41MjcgMzIuMjYxOUwxMC40MTU5IDMyLjE3NTNMMTAuMzU3OCAzMi4xMzAxTDEwLjI3NTEgMzIuMDYzTDEwLjE3OTUgMzEuOTg1NUwxMC4wNjQ2IDMxLjg5MTJMMTAuMDA1MiAzMS44NDA4TDkuOTQ1NzUgMzEuNzkwNEM5LjkyNzE3IDMxLjc3NDYgOS45MDg2NiAzMS43NTg2IDkuODkwMiAzMS43NDI2TDkuODMyMDggMzEuNjkxTDkuNzUzMjkgMzEuNjIyNUw5LjY2Mjg3IDMxLjU0MjRMOS41NzUwNCAzMS40NjQ5TDkuNDk0OTYgMzEuMzlMOS40MDg0MSAzMS4zMDk5TDkuMzM5OTYgMzEuMjQ1M0w5LjIyNjI5IDMxLjEzNjhDOS4xODM0NSAzMS4wOTUzIDkuMTQwODIgMzEuMDUzNSA5LjA5ODQyIDMxLjAxMTZMOS4wNjA5NiAzMC45NzU0TDkuMDA4IDMwLjkyMTFMOC45MTg4NyAzMC44MzA3TDguODU0MjkgMzAuNzY0OEw4Ljc4OTcxIDMwLjY5NjRDOC43MTU5MiAzMC42MjA3IDguNjQzNTcgMzAuNTQzNiA4LjU3MjcxIDMwLjQ2NTJMOC40NjkzOCAzMC4zNTE1TDguMzg5MjkgMzAuMjYxMUw4LjI5NzU4IDMwLjE1NzhMOC4yNDMzMyAzMC4wOTQ1TDguMTc0ODggMzAuMDE0NEw4LjA5OTk2IDI5LjkyNjZMOC4wNDA1NCAyOS44NTQyQzguMDI4ODggMjkuODQwMSA4LjAxNzI1IDI5LjgyNTggOC4wMDU2NyAyOS44MTE2TDcuOTQ3NTQgMjkuNzQwNkw3Ljg2MjI5IDI5LjYzNDZMNy44MDkzNCAyOS41Njc1TDcuNzQ0NzUgMjkuNDg0OEw3LjcxODkyIDI5LjQ1MjVDNi45Nzk4NSAyOC40OTQ1IDYuMzU1NiAyNy40NTMyIDUuODU4OTMgMjYuMzQ5OVpNNC41NDE0MyAxOC44NjYxTDE5LjIwNTcgMjIuNzg4OEMxOC45NjAyIDIzLjY0MzkgMTguNzU4IDI0LjUxMDkgMTguNTk5OSAyNS4zODY0TDMyLjU3MTggMjkuMTI0NEMzMS44Nzc3IDMwLjA3NDggMzEuMDc4MiAzMC45NDM2IDMwLjE4ODcgMzEuNzE0Mkw1LjM0ODcyIDI1LjA2NzNMNS4zMjgwNSAyNS4wMDc5TDUuMjgyODQgMjQuODczNkM1LjI2MDg3IDI0LjgwNzggNS4yMzkzNCAyNC43NDIgNS4yMTgyNiAyNC42NzZMNS4yMDkyMiAyNC42NDYyQzUuMTA5OCAyNC4zMzAyIDUuMDIwNjMgMjQuMDExIDQuOTQxODQgMjMuNjg5MUw0LjkwMzA5IDIzLjUyNjRMNC44Nzk4NCAyMy40MjNMNC44NTI3MiAyMy4yOTc4TDQuODI5NDcgMjMuMTkzMUw0LjgwNjIyIDIzLjA3NjlMNC43ODQyNiAyMi45Njg0TDQuNzYxMDEgMjIuODQ3QzQuNzI3NDMgMjIuNjY0OCA0LjY5NjQzIDIyLjQ4MTQgNC42NjkzIDIyLjI5NjdMNC42NDczNSAyMi4xNDQzTDQuNjMzMTQgMjIuMDM3MUw0LjYxNjM1IDIxLjkwNTNDNC42MDc3IDIxLjgzNjEgNC41OTk1MiAyMS43NjY4IDQuNTkxOCAyMS42OTc0TDQuNTg1MzUgMjEuNjM2N0M0LjQ4ODg0IDIwLjcxNjIgNC40NzQxNCAxOS43ODkxIDQuNTQxNDMgMTguODY2MVpNNi41OTkwNSAxMi4yMTRMMjIuMDMxOCAxNi4zNDIxQzIxLjU1NjUgMTcuMTIzNiAyMS4xMjEyIDE3LjkzMjIgMjAuNzI3MyAxOC43NjRMMzUuMzE2NiAyMi42Njc0QzM1LjEzMzIgMjMuNzI2NiAzNC44NDEzIDI0Ljc0OTYgMzQuNDUzOCAyNS43MjIyTDE5LjUzNTEgMjEuNzMxTDQuNjYwMjYgMTcuNzUyNkw0LjY3OTY0IDE3LjYyMzVMNC42ODk5NyAxNy41NjAyTDQuNzAyODkgMTcuNDczNkw0LjcyMjI2IDE3LjM2MTNMNC43NDU1MSAxNy4yMzQ3QzQuNzc5MSAxNy4wNDM1IDQuODE3ODUgMTYuODUzNiA0Ljg1OTE4IDE2LjY2MzhMNC44OTUzNCAxNi41MDM2TDQuOTIxMTggMTYuMzkzOEw0Ljk1MjE4IDE2LjI2ODVDNC45ODA1OSAxNi4xNTIzIDUuMDEwMyAxNi4wMzYgNS4wNDI1OSAxNS45MjI0TDUuMDc4NzYgMTUuNzkwNkw1LjEwODQ3IDE1LjY4MzRMNS4xNDcyMiAxNS41NTQyTDUuMTc5NTEgMTUuNDQ4M0w1LjIxODI2IDE1LjMyNDNMNS4yNTE4NCAxNS4yMTg0TDUuMjkxODkgMTUuMDk1N0M1LjYyNjM3IDE0LjA5MjQgNi4wNjM1NSAxMy4xMjYyIDYuNTk2NDYgMTIuMjEyN0w2LjU5OTA1IDEyLjIxNFpNMTIuMzM2NiA2LjUzMDY4TDI2LjkxMyAxMC40Mjg5QzI2LjE0MzggMTEuMTI3MSAyNS40MTU4IDExLjg2OTMgMjQuNzMyNyAxMi42NTE5TDM0LjgzNzQgMTUuMzU1M0MzNS4xODIzIDE2LjQ1NTggMzUuNDA4MyAxNy42MDggMzUuNSAxOC43OTc2TDcuMjIwMzQgMTEuMjMzNkw3LjI3ODQ2IDExLjE0OTdMNy4zMTMzNCAxMS4wOThMNy4zNjUgMTEuMDI3TDcuNDI0NDIgMTAuOTQzTDcuNDk1NDYgMTAuODQ0OEw3LjU2NTIxIDEwLjc1MThMNy42NDc4OCAxMC42NDA3TDcuNzEyNDYgMTAuNTU2OEw3Ljc4NjA5IDEwLjQ2MjVMNy44NTcxMyAxMC4zNzIxTDcuOTM0NjMgMTAuMjc2NUw4LjAwNTY3IDEwLjE4NzRMOC4wODk2MyAxMC4wODc5TDguMTU5MzggMTAuMDAyN0w4LjI0NDYzIDkuOTAzMjFMOC4zMTMwOCA5LjgyNTcxTDguNDA2MDggOS43MTk3OUw4LjQ3NDU0IDkuNjQyMjlMOC41NjEwOCA5LjU0NjcxTDguNjMwODMgOS40NzE3OUw4LjcyNTEyIDkuMzcxMDRMOC44MDAwNCA5LjI5MzU0TDguODgxNDIgOS4yMDdMOS4wOTg0MiA4Ljk4NzQyTDkuMjI3NTggOC44NjA4NEw5LjMwMzc5IDguNzg4NUw5LjQwMTk2IDguNjk2NzlDMTAuMjkyMiA3Ljg2MjU0IDExLjI3NzEgNy4xMzU1NCAxMi4zMzY2IDYuNTMwNjhaTTIwLjAyMiA0LjUwMDE4SDIwLjE0NzNMMjAuMjUzMiA0LjUwMTQ3TDIwLjM0MjMgNC41MDI3N0wyMC40MTIxIDQuNTA1MzVMMjAuNDk5OSA0LjUwNzkzTDIwLjU1OTMgNC41MDkyMkwyMC42NTc1IDQuNTEzMUwyMC43MTgyIDQuNTE1NjhMMjAuNzk1NyA0LjUxOTU2TDIwLjg2NTUgNC41MjIxNEwyMC45Nzc4IDQuNTI4NkwyMS4xMTM1IDQuNTM3NjRMMjEuMjk5NSA0LjU1MTg1TDIxLjQxMzEgNC41NjA4OUwyMS40NyA0LjU2NjA2TDIxLjU2OTQgNC41NzYzOUwyMS42NzUzIDQuNTg2NzJMMjEuNzM2IDQuNTkzMThMMjEuODY3OCA0LjYwODY4TDIxLjkzMjQgNC42MTY0M0wyMi4wNzE5IDQuNjM0NTJMMjIuMTc2NSA0LjY0NzQzTDIyLjIzMDggNC42NTUxOEwyMi4zMTQ3IDQuNjY4MUwyMi41ODIxIDQuNzA5NDNMMjIuNjcyNSA0LjcyNDkzTDIyLjc1NjUgNC43MzkxNEwyMi45MzczIDQuNzcyNzJMMjMuMDU2MSA0Ljc5NTk3TDIzLjE5ODIgNC44MjQzOUwyMy4yNTc2IDQuODM3MzFMMjMuMzU0NSA0Ljg1Nzk3TDIzLjQwNzUgNC44NzA4OUwyMy40ODc1IDQuODg3NjhMMjMuNTQxOCA0LjkwMDZMMjMuNjI1NyA0LjkxOTk3TDIzLjY4OSA0LjkzNTQ3TDIzLjc4MDcgNC45NTc0M0wyMy45MDQ3IDQuOTg4NDNMMjQuMDQ5NCA1LjAyNzE4TDI0LjE5NTQgNS4wNjU5M0wyNC4zNDEzIDUuMTA3MjZMMjQuNDA1OSA1LjEyNjY0TDI0LjQ5NjMgNS4xNTI0N0wyNC41OTcxIDUuMTgzNDdMMjQuNjkxNCA1LjIxMzE4TDI0Ljc1NiA1LjIzMzg1TDI0LjgyMDUgNS4yNTQ1MUwyNC45MTg3IDUuMjg2ODFMMjUuMDQ2NiA1LjMyOTQzTDI1LjE3ODMgNS4zNzU5M0wyNS4yNDAzIDUuMzk3ODlMMjUuMzIzIDUuNDI3NkwyNS40NDMxIDUuNDcxNTFMMjUuNTg1MiA1LjUyNDQ3TDI1LjczNSA1LjU4MjZMMjUuODY0MiA1LjYzNDI2TDI1LjkyNDkgNS42NjAxTDI2LjAwMjQgNS42OTExTDI2LjA1NTQgNS43MTQzNUwyNi4xMzY3IDUuNzQ3OTNMMjYuMTg4NCA1Ljc3MTE4TDI2LjI2MiA1LjgwMzQ3TDI2LjQwNDEgNS44NjU0N0wyNi41MzMzIDUuOTI0ODlMMjYuNjI4OSA1Ljk3MDA5TDI2LjcyNTcgNi4wMTY1OUwyNi44MDMyIDYuMDUyNzZMMjYuOTIyMSA2LjExMjE4TDI3LjAzOTYgNi4xNzAzTDI3LjE3MTQgNi4yMzc0N0wyNy4yMzk4IDYuMjczNjRMMjcuMzAzMSA2LjMwNzIyTDI3LjM2MjUgNi4zMzgyMkwyNy40NCA2LjM4MDg0TDI3LjQ5MyA2LjQwOTI2TDI3LjU2MDIgNi40NDY3MkwyNy42NzM4IDYuNTExM0wyNy44MTA3IDYuNTg4OEwyNy45MjMxIDYuNjU0NjhMMjcuOTk2NyA2LjY5ODU5TDI4LjA2NTIgNi43Mzk5M0wyOC4xODkyIDYuODE2MTNMMjguMzAyOSA2Ljg4NzE4TDI4LjQyOTQgNi45NjcyNkwyOC40NzU5IDYuOTk4MjZMMjguNTU4NiA3LjA1MTIyTDI4LjY2NzEgNy4xMjM1NUwyOC43MTg4IDcuMTU4NDJMMjguNzk4OSA3LjIxMjY3TDI4Ljg3ODkgNy4yNjgyMkwyOC45MDg2IDcuMjkwMTdDMjguOTc4NCA3LjMzNzk3IDI5LjA0ODEgNy4zODcwNSAyOS4xMTY2IDcuNDM3NDJMMjkuMjIzOCA3LjUxNDkyTDI5LjMwNzggNy41NzY5MkwyOS4zODAxIDcuNjMyNDZMMjkuNDkxMiA3LjcxNjQyTDI5LjU5NzEgNy43OTkwOUwyOS42NDg4IDcuODM3ODRMMjkuNzEzNCA3Ljg5MDhMMjkuODI0NCA3Ljk3OTkyTDI5LjkyNjUgOC4wNjM4OEwzMC4wMzYzIDguMTU1NTlDMzAuOTU1OSA4LjkzMDU5IDMxLjc4MzkgOS44MTI3OSAzMi41MDIxIDEwLjc3OUwxMy44Mjg1IDUuNzg0MUwxMy45MDg2IDUuNzQ5MjJMMTMuOTkyNSA1LjcxMzA1TDE0LjA5NzEgNS42NjkxNEwxNC4yMDgyIDUuNjIzOTNDMTQuMzU0MiA1LjU2NTggMTQuNTAxNCA1LjUwNzY4IDE0LjY0ODcgNS40NTQ3MkwxNC43NzI3IDUuNDA5NTFMMTQuODkyOCA1LjM2Njg5TDE1LjAwMTMgNS4zMjgxNEwxNS4xMjUzIDUuMjg4MUMxNS4yMzc3IDUuMjQ5MzUgMTUuMzUyNiA1LjIxMzE4IDE1LjQ2NjMgNS4xNzgzMUwxNS41ODM5IDUuMTQzNDNMMTUuNjk0OSA1LjExMTE0TDE1LjgyNjcgNS4wNzIzOUwxNS45MzY1IDUuMDQyNjhMMTYuMDY1NiA1LjAwOTFMMTYuMTc2NyA0Ljk3ODFMMTYuMjkzIDQuOTQ4MzlMMTYuNDEwNSA0LjkxOTk3TDE2LjUzMzIgNC44OTE1NkwxNi42NDk1IDQuODY1NzJMMTYuNzc2MSA0LjgzODZMMTYuODkzNiA0LjgxMjc2TDE3LjAxNjMgNC43ODk1MUwxNy4xMzUxIDQuNzY2MjdMMTcuMjY0MyA0Ljc0MzAyTDE3LjM4MTggNC43MjIzNUwxNy41MDg0IDQuNzAwMzlMMTcuNjI3MyA0LjY4MjMxTDE3Ljc1MjYgNC42NjI5M0wxNy44NzE0IDQuNjQ2MTRMMTguMDAzMSA0LjYyOTM1TDE4LjEyMDcgNC42MTM4NUwxOC4yNTYzIDQuNTk4MzVMMTguMzcyNiA0LjU4NTQzTDE4LjUwODIgNC41NzI1MkMxOC42MjgzIDQuNTU5NiAxOC43NDg0IDQuNTQ5MjcgMTguODY5OCA0LjU0MTUyTDE5LjAwNjggNC41MzExOEwxOS4xMjMgNC41MjQ3MkwxOS4yNjUxIDQuNTE2OTdMMTkuMzg1MiA0LjUxMTgxTDE5LjUxNDQgNC41MDY2NEwxOS42Mzk3IDQuNTA0MDZMMTkuNzY3NSA0LjUwMTQ3TDIwLjAyMiA0LjQ5ODg5VjQuNTAwMThaIiBmaWxsPSJjdXJyZW50Q29sb3IiLz4KPC9zdmc+Cg==",
			"智谱 AI": "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCA0MCA0MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTIwLjEzMTIgNy41MDAwMkwxNy40MDg4IDExLjE5MTNINS44MTYyNUw4LjUzNzUgNy41MDAwMkgyMC4xMzI1SDIwLjEzMTJaTTM0LjA2NzUgMjguODFMMzEuMzQ3NSAzMi41SDE5Ljc5NUwyMi41MTI1IDI4LjgxSDM0LjA2NzVaTTM1IDcuNTAwMDJMMTYuNTggMzIuNUg1TDIzLjQyIDcuNTAwMDJIMzVaIiBmaWxsPSJjdXJyZW50Q29sb3IiLz4KPC9zdmc+Cg==",
			"百度文心": "data:image/svg+xml;base64,PHN2ZyByb2xlPSJpbWciIGZpbGw9ImN1cnJlbnRDb2xvciIgdmlld0JveD0iMCAwIDI0IDI0IiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxwYXRoIGQ9Ik05LjE1NCAwQzcuNzEgMCA2LjU0IDEuNjU4IDYuNTQgMy43MDdjMCAyLjA1MSAxLjE3MSAzLjcxIDIuNjE1IDMuNzEgMS40NDYgMCAyLjYxNC0xLjY1OSAyLjYxNC0zLjcxQzExLjc2OCAxLjY1OCAxMC42IDAgOS4xNTQgMHptNy4wMjUuNTk0QzE0Ljg2LjU4IDEzLjM0NyAyLjU4OSAxMy4yIDMuOTI3Yy0uMTg3IDEuNzQ1LjI1IDMuNDg3IDIuMTc5IDMuNzM1IDEuOTMzLjI1IDMuMTc1LTEuODA2IDMuNDIyLTMuMzY0LjI1Mi0xLjU1NS0uOTk1LTMuMzY0LTIuMzYyLTMuNjc0YTEuMjE4IDEuMjE4IDAgMCAwLS4yNjEtLjAzek0zLjU4MiA1LjUzNWEyLjgxMSAyLjgxMSAwIDAgMC0uMTU2LjAwOGMtMi4xMTguMTktMi40MjggMy4yNC0yLjQyOCAzLjI0LS4yODcgMS40MS42ODYgNC40MjUgMy4yOTcgMy44NjQgMi42MTctLjU2MSAyLjI2Mi0zLjY4IDIuMTgzLTQuMzYyLS4xMjUtMS4wMTgtMS4yOTItMi43NzMtMi44OTYtMi43NXptMTYuNTM0IDEuNzUzYy0yLjMwOCAwLTIuNjE3IDIuMTE5LTIuNjE3IDMuNjE2IDAgMS40My4xMjEgMy40MjUgMi45ODggMy4zNjIgMi44NjctLjA2MyAyLjU1My0zLjIzOCAyLjU1My0zLjk4OCAwLS43NDUtLjYyLTIuOTktMi45MjQtMi45OXptLTguMjY0IDIuNDc4Yy0xLjQyNC4wMTQtMi43MDguOTI1LTMuMzIzIDEuOTQ3LTEuMTE4IDEuODY4LTIuODYzIDMuMDUtMy4xMTIgMy4zNjMtLjI1LjMwOS0zLjYxIDIuMTE2LTIuODY0IDUuNDIuNzQ2IDMuMzAxIDMuMzY1IDMuMjM3IDMuMzY1IDMuMjM3czEuOTMuMTkgNC4xNzEtLjMxYzIuMjQtLjQ5NSA0LjE3LjEyMyA0LjE3LjEyM3M1LjIzMyAxLjc0OCA2LjY2NS0xLjYxNmMxLjQzLTMuMzY0LS44MDgtNS4xMDktLjgwOC01LjEwOXMtMi45OS0yLjMwNi00LjczNi00Ljc5OGMtMS4wNzItMS42NjUtMi4zNDgtMi4yNjgtMy41MjgtMi4yNTd6bS0yLjIzNCAzLjg0bDEuNTQyLjAyNHY4LjE5N0g3Ljc1OGMtMS40Ny0uMjkxLTIuMDU1LTEuMjkyLTIuMTMtMS40NjItLjA3Mi0uMTczLS40ODgtLjk3Ni0uMjY4LTIuMzQzLjYzNS0yLjA0OSAyLjQ0Ny0yLjE5NiAyLjQ0Ny0yLjE5NmgxLjgxem0zLjk2NCAyLjM5djMuODgxYy4wOTYuNDEzLjYxMi40ODguNjEyLjQ4OGgxLjYxNHYtNC4zNDNoMS42ODl2NS43ODJoLTMuOTE1Yy0xLjUxNy0uMzktMS41OS0xLjQ2NS0xLjU5LTEuNDY1di00LjMxN3ptLTUuNDU4IDEuMTQ3Yy0uNjYuMTk3LS45NzguNzA4LTEuMDUuOTI4LS4wNzYuMjItLjI0Ny43OC0uMSAxLjI2OS4yOTQgMS4wOTUgMS4yNDggMS4xNDQgMS4yNDggMS4xNDRoMS4zN3YtMy4zNHoiLz48L3N2Zz4=",
			"字节豆包": "data:image/svg+xml;base64,PHN2ZyBmaWxsPSJjdXJyZW50Q29sb3IiIGZpbGwtcnVsZT0iZXZlbm9kZCIgaGVpZ2h0PSIxZW0iIHN0eWxlPSJmbGV4Om5vbmU7bGluZS1oZWlnaHQ6MSIgdmlld0JveD0iMCAwIDI0IDI0IiB3aWR0aD0iMWVtIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxwYXRoIGQ9Ik03LjI5IDUuMzZMMy4xNDggMjEuNzM3YS4yMTUuMjE1IDAgMDAuMjAzLjI2MWg4LjI5YS4yMTQuMjE0IDAgMDAuMjE1LS4yNjFMNy43IDUuMzU5YS4yMTQuMjE0IDAgMDAtLjQxIDB6IiBmaWxsLW9wYWNpdHk9Ii41Ij48L3BhdGg+PHBhdGggY2xpcC1ydWxlPSJldmVub2RkIiBkPSJNNC41NTMgMTYuMThsLTEuNDA2IDUuNTU4YS4yMTQuMjE0IDAgMDAuMjAzLjI2MWgyLjQyLTQuNTUxYS4yMTQuMjE0IDAgMDEtLjIxNC0uMjZsMi4yNzUtOC45NjFhLjIxNC4yMTQgMCAwMS40MDkgMGwuODY0IDMuNDAyeiI+PC9wYXRoPjxwYXRoIGQ9Ik0xNC40NC4xNWEuMjE0LjIxNCAwIDAwLS40MSAwTDguMzY2IDIxLjczOWEuMjE0LjIxNCAwIDAwLjIxNC4yNjFIMTkuOWEuMjE0LjIxNCAwIDAwLjIxNS0uMjYxTDE0LjQ0LjE1MXoiIGZpbGwtb3BhY2l0eT0iLjUiPjwvcGF0aD48cGF0aCBjbGlwLXJ1bGU9ImV2ZW5vZGQiIGQ9Ik0xNi42OTQgMjJoMy4yMDdhLjIxNS4yMTUgMCAwMC4yMTQtLjI2MmwtMS44MzktNi45OTMgMS4xNjQtNC41OTJhLjIxNC4yMTQgMCAwMS40MTEgMGwyLjk1MSAxMS41ODZhLjIxNC4yMTQgMCAwMS0uMjE0LjI2MWgtNS44OTR6Ij48L3BhdGg+PHBhdGggZD0iTTEwLjI3OCA3Ljc0MUw2LjY4NSAyMS43MzZhLjIxNC4yMTQgMCAwMC4yMTQuMjY0aDcuMTdhLjIxNi4yMTYgMCAwMC4yMTQtLjE2Ni4yMTYuMjE2IDAgMDAwLS4wOThMMTAuNjg3IDcuNzQyYS4yMTQuMjE0IDAgMDAtLjQwOSAweiI+PC9wYXRoPjwvc3ZnPg=="
		};
		function vendorLogoOf(provider) {
			return VENDOR_LOGOS[provider];
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
		* 任意宿主容器内覆盖整个视口，因此不需要 portal。布局按设计 peak-card：头部
		* （档位 tag + 关闭）→ 大号等宽倒计时 → 一句说明。渲染是受控的：父组件把命中
		* （hit）与偏好传入，显示剩余分钟并在切换后消失。
		*/
		/** 渲染一个切档前提醒状态条。 */
		function PeakAlertBanner({ hit, config, t, onDismiss }) {
			const [nowMs, setNowMs] = (0, react.useState)(() => Date.now());
			(0, react.useEffect)(() => {
				const timer = setInterval(() => setNowMs(Date.now()), 1e3);
				return () => clearInterval(timer);
			}, []);
			(0, react.useEffect)(() => {
				if (nowMs >= hit.atMs) onDismiss();
			}, [
				nowMs,
				hit.atMs,
				onDismiss
			]);
			if (nowMs >= hit.atMs) return null;
			const minutes = Math.max(1, Math.round((hit.atMs - nowMs) / 6e4));
			const entering = hit.entering;
			const tag = entering === "peak" ? t("billing.tierPeak") : t("billing.tierOff");
			const desc = entering === "peak" ? t("billing.peakAlertDescPeak") : t("billing.peakAlertDescOff");
			const isPeak = entering === "peak";
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: clsx(UsageBilling_module_css_default.peakCard, isPeak ? UsageBilling_module_css_default.peakCardPeak : UsageBilling_module_css_default.peakCardOff, config.position === "center" ? UsageBilling_module_css_default.peakCardCenter : UsageBilling_module_css_default.peakCardCorner),
				"data-testid": "billing-peak-alert",
				role: "alert",
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: UsageBilling_module_css_default.peakHead,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
							className: clsx(UsageBilling_module_css_default.peakTag, isPeak ? UsageBilling_module_css_default.peakTagPrimary : UsageBilling_module_css_default.peakTagSuccess),
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: clsx(UsageBilling_module_css_default.peakDot, isPeak ? UsageBilling_module_css_default.peakDotPrimary : UsageBilling_module_css_default.peakDotSuccess),
								"aria-hidden": "true"
							}), tag]
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							className: UsageBilling_module_css_default.peakClose,
							onClick: onDismiss,
							"aria-label": t("billing.close"),
							children: "×"
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: clsx(UsageBilling_module_css_default.peakCount, isPeak ? UsageBilling_module_css_default.peakCountPrimary : UsageBilling_module_css_default.peakCountSuccess),
						children: [minutes, "min"]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: UsageBilling_module_css_default.peakDesc,
						children: desc
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
		* Tab 定义（顺序即渲染顺序）：概览=主数字/KPI/热力图，账单=厂商计费与订阅，
		* 用量=Token 用量，趋势=趋势图/每轮费用，费率=模型单价表，设置=预算与峰谷提醒。
		* 导出供测试断言 tab 与文案 key 对齐、decor 锚点落在正确分区。
		*/
		const DASHBOARD_TABS = [
			{
				id: "overview",
				labelKey: "billing.tabOverview"
			},
			{
				id: "providers",
				labelKey: "billing.tabProviders"
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
			"Meta": ["meta", "llama"],
			"Anthropic": ["claude", "anthropic"],
			"Mistral AI": [
				"mistral",
				"ministral",
				"devstral"
			],
			"Cohere": ["cohere", "command"],
			"美团": ["longcat", "meituan"],
			"面壁智能": ["minicpm", "modelbest"],
			"小红书": [
				"dots",
				"rednote",
				"xiaohongshu"
			]
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
			"minimax-cn": "MiniMax",
			"minimax-token-plan": "MiniMax",
			"minimax-token-plan-cn": "MiniMax",
			"hunyuan-token-plan": "腾讯混元",
			"tencent-token-plan": "腾讯混元",
			"hy-token-plan": "腾讯混元",
			"xinghuo-token-plan": "讯飞星火",
			"xfyun-coding": "讯飞星火",
			"spark-coding": "讯飞星火",
			"huawei-token-plan": "华为云",
			"pangu-token-plan": "华为云",
			"huawei-maas-token-plan": "华为云",
			"volcengine-agent-plan": "字节豆包",
			"ark-agent-plan": "字节豆包",
			"baidu-token-plan": "百度文心",
			"ernie-token-plan": "百度文心",
			"wenxin-token-plan": "百度文心",
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
		/** 实时定价重试链是否已在进行：挂载/开弹窗/轮询多个调用点会并发触发 loadLivePricing，
		*  若都在 `builtin` 时各自起 setTimeout 重试链会叠加出多余请求，这里只保留一条。 */
		let livePricingRetryPending = false;
		async function loadLivePricing(attempt = 0) {
			const MAX_ATTEMPTS = 4;
			try {
				const response = await fetch(PRICING_PATH);
				if (!response.ok) {
					livePricingRetryPending = false;
					return;
				}
				const text = await response.text();
				const parsed = JSON.parse(text);
				if (parsed === null || typeof parsed !== "object" || !("source" in parsed)) {
					livePricingRetryPending = false;
					return;
				}
				const pricing = parsed;
				if (pricing.source === "builtin" && attempt < MAX_ATTEMPTS - 1) {
					if (attempt === 0) {
						if (livePricingRetryPending) return;
						livePricingRetryPending = true;
					}
					setTimeout(() => {
						loadLivePricing(attempt + 1);
					}, 2e3);
					return;
				}
				livePricingRetryPending = false;
				applyLivePricing(pricing);
			} catch {
				livePricingRetryPending = false;
			}
		}
		/**
		* 一次拉取 `/api/billing/balance` 的完整响应（余额行 + 对账提示）。余额与对账
		* 提示来自同一响应体，拆成两个函数会导致每 30 秒对同一端点发两次请求，故合并
		* 为单次 fetch；失败返回空值（余额 []、对账 undefined），由调用方降级。
		* @returns the balances and reconcile notice (both degraded on any failure).
		*/
		async function fetchBalanceDoc() {
			try {
				const response = await fetch(BALANCE_PATH);
				if (!response.ok) return { balances: [] };
				const text = await response.text();
				const parsed = JSON.parse(text);
				if (parsed === null || typeof parsed !== "object") return { balances: [] };
				const doc = parsed;
				return {
					balances: Array.isArray(doc.balances) ? doc.balances : [],
					...doc.reconcile === void 0 ? {} : { reconcile: doc.reconcile }
				};
			} catch {
				return { balances: [] };
			}
		}
		/**
		* 拉取订阅套餐剩余额度（供订阅面板）；失败返回空列表。
		* @returns the quota rows, or an empty list on any failure.
		*/
		async function fetchSubscriptions() {
			const response = await fetch(SUBSCRIPTIONS_PATH$1);
			if (!response.ok) throw new Error(`subscriptions HTTP ${String(response.status)}`);
			const text = await response.text();
			const parsed = JSON.parse(text);
			if (parsed !== null && typeof parsed === "object" && "quotas" in parsed) return parsed.quotas;
			throw new Error("subscriptions: invalid response");
		}
		/**
		* 拉取中转站额度（New API / Sub2API 的余额与滚动窗口）；失败抛出（调用方据此保留旧快照）。
		* @returns the relay-site quota rows（成功但无中转配置时为空数组）。
		*/
		async function fetchRelayQuotas() {
			const response = await fetch(RELAY_PATH);
			if (!response.ok) throw new Error(`relay-quotas HTTP ${String(response.status)}`);
			const text = await response.text();
			const parsed = JSON.parse(text);
			if (parsed !== null && typeof parsed === "object" && "quotas" in parsed) return parsed.quotas;
			throw new Error("relay-quotas: invalid response");
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
			const { wide, t, onOpen, monthCost, todayCost, weekCost, days, vendorStatus, dash, floatPrefs, subscriptions } = props;
			const targetSubs = (0, react.useMemo)(() => floatPrefs.targets.map((id) => subscriptions.find((s) => s.provider === id)).filter((s) => s !== void 0), [floatPrefs.targets, subscriptions]);
			const [subIndex, setSubIndex] = (0, react.useState)(0);
			const effectiveSubIndex = targetSubs.length === 0 ? 0 : Math.min(subIndex, targetSubs.length - 1);
			const currentSub = targetSubs[effectiveSubIndex];
			(0, react.useEffect)(() => {
				if (floatPrefs.mode !== "subscription" || targetSubs.length < 2) return;
				const timer = setInterval(() => setSubIndex((index) => (index + 1) % targetSubs.length), 1500);
				return () => clearInterval(timer);
			}, [floatPrefs.mode, targetSubs.length]);
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
							className: UsageBilling_module_css_default.triggerMain,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
								className: UsageBilling_module_css_default.triggerPrimary,
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: UsageBilling_module_css_default.triggerLabel,
										children: t("billing.triggerMonth")
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: UsageBilling_module_css_default.triggerYen,
										"aria-hidden": "true",
										children: formatMoney(monthCost).charAt(0)
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: UsageBilling_module_css_default.triggerMetric,
										children: formatMoney(monthCost).slice(1)
									})
								]
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
								className: UsageBilling_module_css_default.triggerSub,
								"data-testid": "billing-trigger-today",
								children: [
									t("billing.triggerToday"),
									" ",
									formatMoney(todayCost),
									" · ",
									t("billing.weekCost"),
									" ",
									formatMoney(weekCost)
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
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					className: clsx(UsageBilling_module_css_default.triggerPop, floatPrefs.mode === "subscription" && UsageBilling_module_css_default.triggerPopSubscription),
					"data-testid": "billing-trigger-pop",
					"aria-hidden": "true",
					children: floatPrefs.mode === "subscription" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(react_jsx_runtime.Fragment, { children: targetSubs.length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: UsageBilling_module_css_default.triggerPopEmpty,
						children: t("billing.floatNoTargets")
					}) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [currentSub !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: UsageBilling_module_css_default.floatSub,
						"data-testid": "billing-float-subscription",
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: UsageBilling_module_css_default.floatSubHead,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: UsageBilling_module_css_default.floatSubName,
								children: currentSub.displayName
							}), currentSub.plan !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: UsageBilling_module_css_default.floatSubPlan,
								children: currentSub.plan
							})]
						}), currentSub.windows.map((window) => (() => {
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
						})())]
					}), targetSubs.length > 1 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: UsageBilling_module_css_default.triggerPopSwitcher,
						"data-testid": "billing-float-switcher",
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
							className: UsageBilling_module_css_default.triggerPopSwitchCount,
							children: [
								effectiveSubIndex + 1,
								"/",
								targetSubs.length
							]
						})
					})] }) }) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: UsageBilling_module_css_default.popHead,
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: UsageBilling_module_css_default.popTitle,
								children: t("billing.popTitle")
							})
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
							className: UsageBilling_module_css_default.metricGrid,
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
									className: UsageBilling_module_css_default.metricCell,
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: UsageBilling_module_css_default.metricLabel,
										children: t("billing.monthCost")
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: clsx(UsageBilling_module_css_default.metricValue, UsageBilling_module_css_default.metricValuePrimary),
										children: formatMoney(monthCost)
									})]
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
									className: UsageBilling_module_css_default.metricCell,
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: UsageBilling_module_css_default.metricLabel,
										children: t("billing.tokenTotal")
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: UsageBilling_module_css_default.metricValue,
										children: formatTokens(dash.totalToken)
									})]
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
									className: UsageBilling_module_css_default.metricCell,
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: UsageBilling_module_css_default.metricLabel,
										children: t("billing.input")
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: UsageBilling_module_css_default.metricValue,
										children: formatTokens(dash.input)
									})]
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
									className: UsageBilling_module_css_default.metricCell,
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: UsageBilling_module_css_default.metricLabel,
										children: t("billing.output")
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: UsageBilling_module_css_default.metricValue,
										children: formatTokens(dash.output)
									})]
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
									className: UsageBilling_module_css_default.metricCell,
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: UsageBilling_module_css_default.metricLabel,
										children: t("billing.cacheHit")
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: clsx(UsageBilling_module_css_default.metricValue, UsageBilling_module_css_default.metricValueSuccess),
										children: formatTokens(dash.cacheRead)
									})]
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
									className: UsageBilling_module_css_default.metricCell,
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: UsageBilling_module_css_default.metricLabel,
										children: t("billing.calls")
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: UsageBilling_module_css_default.metricValue,
										children: dash.calls.toLocaleString()
									})]
								})
							]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
							className: UsageBilling_module_css_default.popModel,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: UsageBilling_module_css_default.popModelLabel,
								children: t("billing.popTodayModel")
							}), vendorStatus.direct !== void 0 || vendorStatus.sub !== void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [vendorStatus.direct !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
								className: UsageBilling_module_css_default.popModelRow,
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: clsx(UsageBilling_module_css_default.popDot, UsageBilling_module_css_default.popDotDirect),
										"aria-hidden": "true"
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: UsageBilling_module_css_default.popTagPrimary,
										children: t("billing.popDirectLead")
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: UsageBilling_module_css_default.popModelName,
										children: vendorStatus.direct.name
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: clsx(UsageBilling_module_css_default.popModelStatus, vendorStatus.direct.low && UsageBilling_module_css_default.popModelStatusLow),
										children: vendorStatus.direct.text
									})
								]
							}), vendorStatus.sub !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
								className: UsageBilling_module_css_default.popModelRow,
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: clsx(UsageBilling_module_css_default.popDot, UsageBilling_module_css_default.popDotSub),
										"aria-hidden": "true"
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: UsageBilling_module_css_default.popTagSub,
										children: t("billing.popSubLead")
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: UsageBilling_module_css_default.popModelName,
										children: vendorStatus.sub.name
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: clsx(UsageBilling_module_css_default.popModelStatus, vendorStatus.sub.low && UsageBilling_module_css_default.popModelStatusLow),
										children: vendorStatus.sub.text
									})
								]
							})] }) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
								className: UsageBilling_module_css_default.popModelRow,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: clsx(UsageBilling_module_css_default.popDot, UsageBilling_module_css_default.popDotNeutral),
									"aria-hidden": "true"
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: UsageBilling_module_css_default.popModelStatus,
									children: t("billing.popNoConsumption")
								})]
							})]
						})
					] })
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
		function BillingDashboard({ stats, t, onClose, health, balances, reconcile, quotas, relayQuotas, currency, onCurrency, turns, renderSlot, budgetEnabled, budgetAmount, onToggleBudget, onBudgetAmount, peakConfig, onPeakConfig, onPreviewPeak, floatPrefs, onFloatPrefs, quotasStale }) {
			const [trendMetric, setTrendMetric] = (0, react.useState)("cost");
			const { total, byModel, byDay } = stats;
			const [tab, setTab] = (0, react.useState)("overview");
			const [trendDays, setTrendDays] = (0, react.useState)(7);
			const [reconcileDismissedDay, setReconcileDismissedDay] = (0, react.useState)(() => {
				try {
					return window.localStorage.getItem("dsh-billing:reconcile-dismissed") ?? "";
				} catch {
					return "";
				}
			});
			const dayStampLocal = () => {
				const d = /* @__PURE__ */ new Date();
				const pad = (n) => String(n).padStart(2, "0");
				return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
			};
			const dismissReconcile = (0, react.useCallback)(() => {
				const day = dayStampLocal();
				setReconcileDismissedDay(day);
				try {
					window.localStorage.setItem("dsh-billing:reconcile-dismissed", day);
				} catch {}
			}, []);
			const [heatmapRange, setHeatmapRange] = (0, react.useState)("month");
			const subscriptionOptions = (0, react.useMemo)(() => quotas.filter((quota) => quota.status === "ok" && quota.windows.length > 0).map((quota) => ({
				id: quota.provider,
				label: quota.displayName
			})), [quotas]);
			const [balanceDetailFor, setBalanceDetailFor] = (0, react.useState)();
			const [expandedProject, setExpandedProject] = (0, react.useState)();
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
					label: Number.isFinite(budgetPct) ? t("billing.budget") : t("billing.monthCost")
				};
			}, [
				budgetEnabled,
				budgetAmount,
				monthCost,
				yearCost,
				t
			]);
			const heroBudgetPct = budgetEnabled && budgetAmount > 0 ? monthCost / budgetAmount * 100 : 0;
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
					byModel,
					tokens: day === void 0 ? 0 : day.input + day.output + day.cacheHit + day.cacheMiss
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
				const vendorByNorm = /* @__PURE__ */ new Map();
				for (const vendor of subscriptionsByVendor.keys()) vendorByNorm.set(normalizeProvider(vendor), vendor);
				for (const row of modelRows) {
					let vendorName = row.provider;
					if (row.plan === true) {
						const inferred = providerFromModelKey(row.key);
						if (inferred !== void 0) vendorName = inferred;
					}
					const key = vendorByNorm.get(normalizeProvider(vendorName)) ?? vendorName;
					const list = modelsByVendor.get(key);
					if (list === void 0) modelsByVendor.set(key, [row]);
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
										latestDate,
										stats.timezone === void 0 ? null : ` · ${stats.timezone.name} (${stats.timezone.offset})`
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
											children: unit === "cny" ? "¥ CNY" : "$ USD"
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
										reconcile?.kind === "drift" && reconcile.spent !== void 0 && reconcileDismissedDay !== dayStampLocal() && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
											className: UsageBilling_module_css_default.reconcileNotice,
											"data-testid": "billing-reconcile-notice",
											role: "note",
											children: [
												/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
													className: UsageBilling_module_css_default.reconcileIcon,
													"aria-hidden": "true",
													children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("svg", {
														width: "14",
														height: "14",
														viewBox: "0 0 24 24",
														fill: "none",
														stroke: "currentColor",
														strokeWidth: "2",
														strokeLinecap: "round",
														strokeLinejoin: "round",
														children: [
															/* @__PURE__ */ (0, react_jsx_runtime.jsx)("circle", {
																cx: "12",
																cy: "12",
																r: "9"
															}),
															/* @__PURE__ */ (0, react_jsx_runtime.jsx)("line", {
																x1: "12",
																y1: "10",
																x2: "12",
																y2: "16"
															}),
															/* @__PURE__ */ (0, react_jsx_runtime.jsx)("line", {
																x1: "12",
																y1: "7.5",
																x2: "12.01",
																y2: "7.5"
															})
														]
													})
												}),
												/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
													className: UsageBilling_module_css_default.reconcileText,
													children: t("billing.reconcileDrift").replace("{provider}", reconcile.provider ?? "").replace("{spent}", money(reconcile.spent)).replace("{today}", money(reconcile.todayOfficialCost ?? 0))
												}),
												/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
													type: "button",
													className: UsageBilling_module_css_default.reconcileDismiss,
													"data-testid": "billing-reconcile-dismiss",
													onClick: dismissReconcile,
													children: t("billing.reconcileDismiss")
												})
											]
										}),
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
																	total.calls.toLocaleString(),
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
												budgetEnabled && budgetAmount > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
													className: UsageBilling_module_css_default.heroBudget,
													"data-testid": "billing-hero-budget",
													children: [
														/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
															className: UsageBilling_module_css_default.heroBudgetLabel,
															children: t("billing.budget")
														}),
														/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
															className: UsageBilling_module_css_default.heroBudgetTrack,
															role: "progressbar",
															"aria-valuenow": Math.min(heroBudgetPct, 100),
															"aria-valuemin": 0,
															"aria-valuemax": 100,
															"aria-label": t("billing.budget"),
															children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
																className: clsx(UsageBilling_module_css_default.heroBudgetFill, heroBudgetPct >= 100 && UsageBilling_module_css_default.heroBudgetFillOver),
																style: { width: `${Math.min(heroBudgetPct, 100)}%` }
															})
														}),
														/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
															className: UsageBilling_module_css_default.heroBudgetValue,
															children: [
																money(monthCost),
																" / ",
																money(budgetAmount),
																" · ",
																heroBudgetPct.toFixed(1),
																"%"
															]
														})
													]
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
										(stats.unpricedModels?.length ?? 0) > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
											className: UsageBilling_module_css_default.unpricedHint,
											"data-testid": "billing-unpriced-hint",
											children: t("billing.unpricedHint").replace("{count}", String(stats.unpricedModels?.length ?? 0))
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
												children: [
													/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h3", {
														className: UsageBilling_module_css_default.panelTitle,
														children: t("billing.heatmap")
													}),
													/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
														className: UsageBilling_module_css_default.heatmapRangeSwitch,
														"data-testid": "billing-heatmap-range",
														role: "group",
														"aria-label": t("billing.heatmap"),
														children: ["month", "year"].map((r) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
															type: "button",
															className: clsx(UsageBilling_module_css_default.heatmapRangeButton, heatmapRange === r && UsageBilling_module_css_default.heatmapRangeButtonActive),
															"data-testid": `billing-heatmap-range-${r}`,
															"aria-pressed": heatmapRange === r,
															onClick: () => {
																setHeatmapRange(r);
															},
															children: r === "month" ? t("billing.heatmapMonth") : t("billing.heatmapYear")
														}, r))
													}),
													/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
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
													})
												]
											}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(UsageHeatmap, {
												days: heatmapDays,
												currency,
												t,
												range: heatmapRange
											})]
										})
									]
								}),
								tab === "settings" && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: UsageBilling_module_css_default.tabPanel,
									"data-testid": "billing-tab-panel-settings",
									children: [
										/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
											className: UsageBilling_module_css_default.setCard,
											"data-testid": "billing-budget",
											children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
												className: UsageBilling_module_css_default.setCardHead,
												children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
													className: UsageBilling_module_css_default.setCardMeta,
													children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h3", {
														className: UsageBilling_module_css_default.setCardTitle,
														children: t("billing.budget")
													}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
														className: UsageBilling_module_css_default.setCardDesc,
														children: t("billing.budgetHint")
													})]
												}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
													type: "button",
													role: "switch",
													"aria-checked": budgetEnabled,
													"aria-label": t("billing.budget"),
													"data-testid": "billing-budget-toggle",
													className: clsx(UsageBilling_module_css_default.switch, budgetEnabled && UsageBilling_module_css_default.switchOn),
													onClick: onToggleBudget,
													children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { className: UsageBilling_module_css_default.switchKnob })
												})]
											}), budgetEnabled && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
												className: UsageBilling_module_css_default.ctlCol,
												children: [
													/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
														className: UsageBilling_module_css_default.ctlRow,
														children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
															className: UsageBilling_module_css_default.ctlLabel,
															children: t("billing.budgetAmount")
														}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
															className: UsageBilling_module_css_default.inp,
															"data-testid": "billing-budget-input-wrap",
															children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
																className: UsageBilling_module_css_default.affix,
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
														})]
													}),
													budgetAmount > 0 && (() => {
														const pct = monthCost / budgetAmount * 100;
														return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
															className: UsageBilling_module_css_default.ctlRowStretch,
															children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
																className: UsageBilling_module_css_default.prog,
																role: "progressbar",
																"aria-valuenow": Math.min(pct, 100),
																"aria-valuemin": 0,
																"aria-valuemax": 100,
																"aria-label": t("billing.budget"),
																"data-testid": "billing-budget-track",
																children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
																	className: clsx(UsageBilling_module_css_default.progFill, pct >= 100 && UsageBilling_module_css_default.budgetFillOver, pct >= 80 && pct < 100 && UsageBilling_module_css_default.budgetFillWarn),
																	style: { width: `${Math.min(pct, 100)}%` }
																})
															})
														});
													})(),
													budgetAmount > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
														className: UsageBilling_module_css_default.setCardDesc,
														"data-testid": "billing-budget-value",
														children: t("billing.budgetSummary").replace("{used}", money(monthCost)).replace("{total}", money(budgetAmount))
													})
												]
											})]
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
											className: UsageBilling_module_css_default.setCard,
											"data-testid": "billing-peak-alert-settings",
											children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
												className: UsageBilling_module_css_default.setCardHead,
												children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
													className: UsageBilling_module_css_default.setCardMeta,
													children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h3", {
														className: UsageBilling_module_css_default.setCardTitle,
														children: t("billing.peakAlert")
													}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
														className: UsageBilling_module_css_default.setCardDesc,
														children: t("billing.peakAlertHint")
													})]
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
											}), peakConfig.enabled && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
												className: UsageBilling_module_css_default.ctlCol,
												children: [
													/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
														className: UsageBilling_module_css_default.ctlRow,
														children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
															className: UsageBilling_module_css_default.ctlLabel,
															children: t("billing.peakAlertLeadMin")
														}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
															className: UsageBilling_module_css_default.inp,
															children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
																type: "number",
																min: 1,
																max: 30,
																step: 1,
																value: peakConfig.leadMin,
																className: UsageBilling_module_css_default.budgetInput,
																"aria-label": t("billing.peakAlertLeadMin"),
																onChange: (e) => {
																	const v = Number(e.target.valueAsNumber);
																	onPeakConfig({
																		...peakConfig,
																		leadMin: Number.isFinite(v) ? Math.min(30, Math.max(1, Math.round(v))) : peakConfig.leadMin
																	});
																}
															})
														})]
													}),
													/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
														className: UsageBilling_module_css_default.ctlRow,
														children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
															className: UsageBilling_module_css_default.ctlLabel,
															children: t("billing.peakAlertPos")
														}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
															className: UsageBilling_module_css_default.ctlGroup,
															role: "radiogroup",
															"aria-label": t("billing.peakAlertPos"),
															children: ["bottom-right", "center"].map((pos) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
																className: UsageBilling_module_css_default.rdo,
																children: [
																	/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
																		type: "radio",
																		name: "peak-pos",
																		checked: peakConfig.position === pos,
																		onChange: () => onPeakConfig({
																			...peakConfig,
																			position: pos
																		})
																	}),
																	/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
																		className: UsageBilling_module_css_default.rdoDot,
																		"aria-hidden": "true"
																	}),
																	pos === "bottom-right" ? t("billing.peakAlertPosCorner") : t("billing.peakAlertPosCenter")
																]
															}, pos))
														})]
													}),
													/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
														className: UsageBilling_module_css_default.ctlRow,
														children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
															className: UsageBilling_module_css_default.ctlLabel,
															children: t("billing.peakAlertMode")
														}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
															className: UsageBilling_module_css_default.ctlGroup,
															role: "radiogroup",
															"aria-label": t("billing.peakAlertMode"),
															children: [
																"both",
																"peak",
																"offPeak"
															].map((m) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
																className: UsageBilling_module_css_default.rdo,
																children: [
																	/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
																		type: "radio",
																		name: "peak-mode",
																		checked: peakConfig.mode === m,
																		onChange: () => onPeakConfig({
																			...peakConfig,
																			mode: m
																		})
																	}),
																	/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
																		className: UsageBilling_module_css_default.rdoDot,
																		"aria-hidden": "true"
																	}),
																	m === "both" ? t("billing.peakAlertModeBoth") : m === "peak" ? t("billing.peakAlertModePeak") : t("billing.peakAlertModeOff")
																]
															}, m))
														})]
													}),
													/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
														className: UsageBilling_module_css_default.ctlRow,
														children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
															className: UsageBilling_module_css_default.ctlLabel,
															children: t("billing.peakAlertWebNotify")
														}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
															type: "checkbox",
															checked: peakConfig.webNotify,
															"aria-label": t("billing.peakAlertWebNotify"),
															onChange: (e) => {
																onPeakConfig({
																	...peakConfig,
																	webNotify: e.target.checked
																});
															}
														})]
													}),
													/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
														className: UsageBilling_module_css_default.ctlRow,
														children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
															type: "button",
															className: UsageBilling_module_css_default.btn,
															onClick: onPreviewPeak,
															children: t("billing.peakAlertPreview")
														})
													})
												]
											})]
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("section", {
											className: UsageBilling_module_css_default.setCard,
											"data-testid": "billing-usage-stats-tool-setting",
											children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
												className: UsageBilling_module_css_default.setCardHead,
												children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
													className: UsageBilling_module_css_default.setCardMeta,
													children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h3", {
														className: UsageBilling_module_css_default.setCardTitle,
														children: t("billing.usageStatsTool")
													}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
														className: UsageBilling_module_css_default.setCardDesc,
														children: t("billing.usageStatsToolHint")
													})]
												}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
													type: "button",
													role: "switch",
													"aria-checked": usageStatsEnabled,
													"aria-label": t("billing.usageStatsTool"),
													"data-testid": "billing-usage-stats-tool-toggle",
													className: clsx(UsageBilling_module_css_default.switch, usageStatsEnabled && UsageBilling_module_css_default.switchOn),
													onClick: toggleUsageStats,
													children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { className: UsageBilling_module_css_default.switchKnob })
												})]
											})
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
											className: UsageBilling_module_css_default.setCard,
											"data-testid": "billing-float-setting",
											children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
												className: UsageBilling_module_css_default.setCardHead,
												children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
													className: UsageBilling_module_css_default.setCardMeta,
													children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h3", {
														className: UsageBilling_module_css_default.setCardTitle,
														children: t("billing.floatWindow")
													}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
														className: UsageBilling_module_css_default.setCardDesc,
														children: t("billing.floatWindowHint")
													})]
												})
											}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
												className: UsageBilling_module_css_default.ctlCol,
												children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
													className: UsageBilling_module_css_default.ctlRow,
													children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
														className: UsageBilling_module_css_default.ctlLabel,
														children: t("billing.floatMode")
													}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
														className: UsageBilling_module_css_default.ctlGroup,
														"data-testid": "billing-float-mode",
														children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
															type: "button",
															className: clsx(UsageBilling_module_css_default.floatModeBtn, floatPrefs.mode === "combined" && UsageBilling_module_css_default.floatModeBtnOn),
															"data-testid": "billing-float-mode-combined",
															onClick: () => onFloatPrefs({
																mode: "combined",
																targets: floatPrefs.targets
															}),
															children: t("billing.floatModeCombined")
														}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
															type: "button",
															className: clsx(UsageBilling_module_css_default.floatModeBtn, floatPrefs.mode === "subscription" && UsageBilling_module_css_default.floatModeBtnOn),
															"data-testid": "billing-float-mode-subscription",
															onClick: () => onFloatPrefs({
																mode: "subscription",
																targets: floatPrefs.targets
															}),
															children: t("billing.floatModeSubscription")
														})]
													})]
												}), floatPrefs.mode === "subscription" && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
													className: UsageBilling_module_css_default.ctlRow,
													children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
														className: UsageBilling_module_css_default.ctlLabel,
														children: t("billing.floatTargets")
													}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
														className: UsageBilling_module_css_default.ctlGroup,
														"data-testid": "billing-float-targets",
														children: [subscriptionOptions.map((option) => {
															const on = floatPrefs.targets.includes(option.id);
															return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
																className: UsageBilling_module_css_default.floatTarget,
																children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
																	type: "checkbox",
																	checked: on,
																	"data-testid": `billing-float-target-${option.id}`,
																	onChange: () => onFloatPrefs({
																		mode: "subscription",
																		targets: on ? floatPrefs.targets.filter((id) => id !== option.id) : [...floatPrefs.targets, option.id]
																	})
																}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
																	className: UsageBilling_module_css_default.floatTargetLabel,
																	children: option.label
																})]
															}, option.id);
														}), subscriptionOptions.length === 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
															className: UsageBilling_module_css_default.setCardDesc,
															children: t("billing.floatNoTargetsHint")
														})]
													})]
												})]
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
											className: clsx(UsageBilling_module_css_default.ubCard, UsageBilling_module_css_default.trendPanel),
											"data-testid": "billing-panel-trend",
											children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
												className: UsageBilling_module_css_default.ubCardHead,
												children: [
													/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h3", {
														className: UsageBilling_module_css_default.ubCardTitle,
														children: t("billing.trend")
													}),
													renderSlot("billing.dashboard.decor", { position: "trend" }),
													/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
														className: UsageBilling_module_css_default.ubCardControlGroup,
														children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
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
														}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
															className: UsageBilling_module_css_default.rangeToggle,
															role: "group",
															"aria-label": t("billing.trendMetric"),
															children: ["cost", "tokens"].map((m) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
																type: "button",
																className: clsx(UsageBilling_module_css_default.rangeButton, trendMetric === m && UsageBilling_module_css_default.rangeButtonActive),
																"aria-pressed": trendMetric === m,
																"data-testid": `billing-trend-metric-${m}`,
																onClick: () => {
																	setTrendMetric(m);
																},
																children: m === "cost" ? t("billing.trendMetricCost") : t("billing.trendMetricTokens")
															}, m))
														})]
													}),
													/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
														className: UsageBilling_module_css_default.ubCardSub,
														children: latestDate
													})
												]
											}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(TrendChart, {
												data: trend,
												models: chartModels,
												currency,
												metric: trendMetric
											})]
										}),
										turns.length > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
											className: UsageBilling_module_css_default.ubCard,
											"data-testid": "billing-panel-rounds",
											children: [
												/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
													className: UsageBilling_module_css_default.ubCardHead,
													children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h3", {
														className: UsageBilling_module_css_default.ubCardTitle,
														children: t("billing.rounds")
													}), roundFlags.length > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
														className: UsageBilling_module_css_default.ubTagError,
														"data-testid": "billing-rounds-flag-count",
														children: [
															roundFlags.length,
															" ",
															t("billing.anomaly")
														]
													})]
												}),
												/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
													className: UsageBilling_module_css_default.ubCardSub,
													children: t("billing.roundsHint").replace("{count}", String(turns.length))
												}),
												/* @__PURE__ */ (0, react_jsx_runtime.jsx)(RoundCostChart, {
													rounds: turns,
													flags: roundFlags,
													currency,
													t
												})
											]
										}),
										turns.length > 0 && (() => {
											const shareTotal = peakShare.peak + peakShare.offPeak;
											if (shareTotal <= 0) return null;
											const peakPct = peakShare.peak / shareTotal * 100;
											return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
												className: UsageBilling_module_css_default.ubCard,
												"data-testid": "billing-panel-share",
												children: [
													/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
														className: UsageBilling_module_css_default.ubCardHead,
														children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h3", {
															className: UsageBilling_module_css_default.ubCardTitle,
															children: t("billing.peakShare")
														}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
															className: UsageBilling_module_css_default.ubCardSub,
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
														}), (row.windows?.length ?? 0) > 0 ? row.windows?.map((window) => {
															const low = window.remainingPercent < 20;
															return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
																className: clsx(UsageBilling_module_css_default.siteRowCalls, low && UsageBilling_module_css_default.siteRowCallsLow),
																children: [
																	t("billing.relayWindowUsed"),
																	" ",
																	window.usedPercent,
																	"%"
																]
															}, window.kind);
														}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
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
												quotasStale && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
													className: UsageBilling_module_css_default.staleNotice,
													"data-testid": "billing-subscriptions-stale",
													children: t("billing.subscriptionsStale")
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
																		/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", { children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
																			className: UsageBilling_module_css_default.modelCell,
																			children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(VendorLogo, {
																				provider: row.provider,
																				colorVar: row.color
																			}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
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
												})
											]
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
												stats.bySite !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
													type: "button",
													className: UsageBilling_module_css_default.exportButton,
													"data-testid": "billing-export-sites",
													onClick: () => {
														downloadText(exportFileName("usage-sites", "csv", Object.keys(byDay)), siteRowsCsv(stats.bySite ?? {}), "text/csv");
													},
													children: t("billing.exportCsvSite")
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
										bucketSummary !== void 0 && (() => {
											const totalCost = bucketSummary.officialCost + bucketSummary.thirdCost;
											const officialPct = totalCost > 0 ? bucketSummary.officialCost / totalCost * 100 : 0;
											return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
												className: UsageBilling_module_css_default.ubStatGrid,
												"data-testid": "billing-panel-buckets",
												children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
													className: UsageBilling_module_css_default.ubStatCard,
													children: [
														/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
															className: UsageBilling_module_css_default.ubStatLabel,
															children: [t("billing.official"), "（=DeepSeek 直连）"]
														}),
														/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
															className: UsageBilling_module_css_default.ubStatValue,
															children: money(bucketSummary.officialCost)
														}),
														/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
															className: UsageBilling_module_css_default.ubStatDetail,
															children: [
																bucketSummary.officialCalls,
																" ",
																t("billing.calls"),
																" · ",
																officialPct.toFixed(1),
																"%"
															]
														})
													]
												}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
													className: UsageBilling_module_css_default.ubStatCard,
													children: [
														/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
															className: UsageBilling_module_css_default.ubStatLabel,
															children: [t("billing.thirdParty"), "（中转）"]
														}),
														/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
															className: UsageBilling_module_css_default.ubStatValue,
															children: money(bucketSummary.thirdCost)
														}),
														/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
															className: UsageBilling_module_css_default.ubStatDetail,
															children: [
																bucketSummary.thirdCalls,
																" ",
																t("billing.calls"),
																" · ",
																(100 - officialPct).toFixed(1),
																"%"
															]
														})
													]
												})]
											});
										})(),
										stats.byWorkspace !== void 0 && stats.byWorkspace.length > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
											className: UsageBilling_module_css_default.ubCard,
											"data-testid": "billing-panel-workspaces",
											children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
												className: UsageBilling_module_css_default.ubCardHead,
												children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h3", {
													className: UsageBilling_module_css_default.ubCardTitle,
													children: t("billing.workspaces")
												}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
													className: UsageBilling_module_css_default.ubCardSub,
													children: t("billing.workspacesHint")
												})]
											}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("ul", {
												className: UsageBilling_module_css_default.rowlist,
												children: stats.byWorkspace.map((row) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("li", { children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
													type: "button",
													className: UsageBilling_module_css_default.rowline,
													"data-testid": `billing-workspace-${row.name}`,
													onClick: () => {
														setExpandedProject(expandedProject === row.name ? void 0 : row.name);
													},
													children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
														className: UsageBilling_module_css_default.rowlineName,
														children: row.name
													}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
														className: UsageBilling_module_css_default.rowlineRight,
														children: [
															/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
																className: UsageBilling_module_css_default.num,
																children: money(row.cost)
															}),
															/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
																className: UsageBilling_module_css_default.rowlineMuted,
																children: [
																	row.calls,
																	" ",
																	t("billing.calls")
																]
															}),
															/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
																className: UsageBilling_module_css_default.rowlineChev,
																"aria-hidden": "true",
																children: "›"
															})
														]
													})]
												}) }), expandedProject === row.name && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("li", {
													className: UsageBilling_module_css_default.rowlineDrillWrap,
													children: stats.bySession?.filter((s) => projectName(s.cwd) === row.name).slice(0, 5).map((s) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
														className: UsageBilling_module_css_default.rowlineDrill,
														children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
															className: UsageBilling_module_css_default.rowlineName,
															children: s.title ?? s.id.slice(0, 8)
														}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
															className: UsageBilling_module_css_default.rowlineRight,
															children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
																className: UsageBilling_module_css_default.num,
																children: money(s.cost)
															}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
																className: UsageBilling_module_css_default.rowlineMuted,
																children: [
																	s.calls,
																	" ",
																	t("billing.calls")
																]
															})]
														})]
													}, s.id))
												})] }, row.name))
											})]
										}),
										stats.bySession !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
											className: UsageBilling_module_css_default.ubCard,
											"data-testid": "billing-panel-sessions",
											children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
												className: UsageBilling_module_css_default.ubCardHead,
												children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h3", {
													className: UsageBilling_module_css_default.ubCardTitle,
													children: t("billing.sessions")
												}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
													className: UsageBilling_module_css_default.ubCardSub,
													children: stats.bySession.length > SESSION_DISPLAY_LIMIT ? t("billing.sessionOverflow").replace("{limit}", String(SESSION_DISPLAY_LIMIT)).replace("{total}", String(stats.bySession.length)) : `${stats.bySession.length}`
												})]
											}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
												className: UsageBilling_module_css_default.ubTablewrap,
												"data-testid": "billing-sessions-table",
												children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("table", {
													className: UsageBilling_module_css_default.ubTable,
													children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("thead", { children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("tr", { children: [
														/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", { children: t("billing.sessionTitle") }),
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
								tab === "pricing" && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: UsageBilling_module_css_default.tabPanel,
									"data-testid": "billing-tab-panel-pricing",
									children: [
										/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
											className: UsageBilling_module_css_default.ubAlert,
											role: "note",
											children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
												className: UsageBilling_module_css_default.ubAlertLeft,
												children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
													className: UsageBilling_module_css_default.ubRate,
													"data-testid": "billing-rate",
													children: [
														t("billing.todayRate"),
														" 1 USD = ",
														formatMoney(rateInfo.rate)
													]
												}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
													className: clsx(UsageBilling_module_css_default.ubTag, rateInfo.live ? UsageBilling_module_css_default.ubTagSuccess : UsageBilling_module_css_default.ubTagNeutral),
													children: rateInfo.live ? t("billing.rateLive") : t("billing.rateBuiltin")
												})]
											}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
												className: UsageBilling_module_css_default.ubAlertNote,
												children: t("billing.pricingTip")
											})]
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
											className: UsageBilling_module_css_default.ubCard,
											"data-testid": "billing-panel-pricing",
											children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
												className: UsageBilling_module_css_default.ubCardHead,
												children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h3", {
													className: UsageBilling_module_css_default.ubCardTitle,
													children: t("billing.pricing")
												}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
													className: UsageBilling_module_css_default.ubCardSub,
													children: t("billing.pricingUnit")
												})]
											}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
												className: UsageBilling_module_css_default.ubTablewrap,
												children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("table", {
													className: UsageBilling_module_css_default.ubTable,
													children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("thead", { children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("tr", { children: [
														/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", { children: t("billing.thModel") }),
														/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", {
															className: UsageBilling_module_css_default.numCol,
															children: t("billing.thInputMiss")
														}),
														/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", {
															className: UsageBilling_module_css_default.numCol,
															children: t("billing.thInputHit")
														}),
														/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", {
															className: UsageBilling_module_css_default.numCol,
															children: t("billing.output")
														}),
														/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", {
															className: UsageBilling_module_css_default.numCol,
															children: t("billing.band")
														})
													] }) }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("tbody", { children: catalogEntries().map((entry) => {
														const hasPrice = entry.price.input > 0 || entry.price.output > 0;
														return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("tr", { children: [
															/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", { children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
																className: UsageBilling_module_css_default.ubModel,
																children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(VendorLogo, {
																	provider: entry.provider,
																	colorVar: resolveToken(entry.colorVar)
																}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
																	className: UsageBilling_module_css_default.ubModelName,
																	children: [
																		entry.name,
																		entry.uncatalogued && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
																			className: UsageBilling_module_css_default.ubTagAlert,
																			"data-testid": "billing-price-uncatalogued",
																			children: t("billing.uncatalogued")
																		}),
																		entry.promo !== void 0 && isPromoActive(entry.promo, Date.now()) && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
																			className: UsageBilling_module_css_default.ubTagPromo,
																			"data-testid": "billing-price-promo",
																			title: entry.promo.endsAtMs === void 0 ? t("billing.promoOpenEnded") : t("billing.promoUntil", { date: new Date(entry.promo.endsAtMs).toLocaleDateString() }),
																			children: entry.promo.note ?? t("billing.promoBadge")
																		})
																	]
																})]
															}) }),
															/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", {
																className: UsageBilling_module_css_default.numCol,
																children: hasPrice ? unitMoney(entry.price.input, entry.price.currency) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
																	className: UsageBilling_module_css_default.na,
																	children: "—"
																})
															}),
															/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", {
																className: UsageBilling_module_css_default.numCol,
																children: hasPrice ? unitMoney(entry.price.cacheHit, entry.price.currency) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
																	className: UsageBilling_module_css_default.na,
																	children: "—"
																})
															}),
															/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", {
																className: UsageBilling_module_css_default.numCol,
																children: hasPrice ? unitMoney(entry.price.output, entry.price.currency) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
																	className: UsageBilling_module_css_default.na,
																	children: "—"
																})
															}),
															/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", {
																className: UsageBilling_module_css_default.numCol,
																children: hasPrice && entry.price.offPeak !== void 0 && entry.peakHours !== void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
																	className: UsageBilling_module_css_default.ubPricepair,
																	children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
																		className: UsageBilling_module_css_default.ubChipPeak,
																		children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
																			className: UsageBilling_module_css_default.ubChipLabel,
																			children: t("billing.ubPeak")
																		}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
																			className: UsageBilling_module_css_default.num,
																			children: [
																				unitMoney(entry.price.input, entry.price.currency),
																				" / ",
																				unitMoney(entry.price.output, entry.price.currency)
																			]
																		})]
																	}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
																		className: UsageBilling_module_css_default.ubChipOff,
																		children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
																			className: UsageBilling_module_css_default.ubChipLabel,
																			children: t("billing.ubOff")
																		}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
																			className: UsageBilling_module_css_default.num,
																			children: [
																				unitMoney(entry.price.offPeak.input, entry.price.currency),
																				" / ",
																				unitMoney(entry.price.offPeak.output, entry.price.currency)
																			]
																		})]
																	})]
																}) : hasPrice ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
																	className: UsageBilling_module_css_default.flatTag,
																	children: t("billing.flat")
																}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
																	className: UsageBilling_module_css_default.na,
																	children: "—"
																})
															})
														] }), (entry.extraRows ?? []).map((row) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("tr", {
															className: UsageBilling_module_css_default.ubExtraRow,
															children: [
																/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("td", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
																	className: UsageBilling_module_css_default.ubExtraName,
																	children: row.label
																}), row.note !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
																	className: UsageBilling_module_css_default.ubExtraNote,
																	children: row.note
																})] }),
																/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", {
																	className: UsageBilling_module_css_default.numCol,
																	children: row.input === void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
																		className: UsageBilling_module_css_default.na,
																		children: "—"
																	}) : unitMoney(row.input, entry.price.currency)
																}),
																/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", {
																	className: UsageBilling_module_css_default.numCol,
																	children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
																		className: UsageBilling_module_css_default.na,
																		children: "—"
																	})
																}),
																/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", {
																	className: UsageBilling_module_css_default.numCol,
																	children: row.output === void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
																		className: UsageBilling_module_css_default.na,
																		children: "—"
																	}) : unitMoney(row.output, entry.price.currency)
																}),
																/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", {
																	className: UsageBilling_module_css_default.numCol,
																	children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
																		className: UsageBilling_module_css_default.na,
																		children: "—"
																	})
																})
															]
														}, `${entry.key}:${row.label}`))] }, entry.key);
													}) })]
												})
											})]
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
											className: UsageBilling_module_css_default.ubCard,
											children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
												className: UsageBilling_module_css_default.ubCardHead,
												children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("h3", {
													className: UsageBilling_module_css_default.ubCardTitle,
													children: t("billing.pricingNotes")
												})
											}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("ul", {
												className: UsageBilling_module_css_default.ubNotes,
												children: [
													/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("li", {
														className: UsageBilling_module_css_default.ubNotesItem,
														children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
															className: UsageBilling_module_css_default.ubNotesTerm,
															children: t("billing.cacheHit")
														}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
															className: UsageBilling_module_css_default.ubNotesDesc,
															children: t("billing.noteCache")
														})]
													}),
													/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("li", {
														className: UsageBilling_module_css_default.ubNotesItem,
														children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
															className: UsageBilling_module_css_default.ubNotesTerm,
															children: t("billing.peakBand")
														}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
															className: UsageBilling_module_css_default.ubNotesDesc,
															children: t("billing.noteBand")
														})]
													}),
													/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("li", {
														className: UsageBilling_module_css_default.ubNotesItem,
														children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
															className: UsageBilling_module_css_default.ubNotesTerm,
															children: t("billing.pricingSource")
														}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
															className: UsageBilling_module_css_default.ubNotesDesc,
															children: t("billing.noteSource")
														})]
													})
												]
											})]
										})
									]
								}),
								renderSlot("billing.dashboard.decor", { position: "footer" })
							]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("footer", {
							className: UsageBilling_module_css_default.modalFooter,
							"data-testid": "billing-footer",
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: t("billing.footer") }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: t("billing.footerCredit").replace("{version}", stats.pluginVersion === void 0 ? "—" : `v${stats.pluginVersion}`) })]
						})
					]
				})
			});
		}
		/**
		* VendorLogo: 模型名前显示厂商 logo（内嵌 SVG data URI，来自 models.dev）。
		* 未收录 logo 的厂商（字节豆包/文心/讯飞/商汤/百川/零一/面壁/小红书 等）回退为
		* 品牌色字母徽章，保证所有厂商都有可辨识标记，且不引入外部素材/版权风险。
		*/
		function VendorLogo({ provider, colorVar }) {
			const logo = vendorLogoOf(provider);
			if (logo !== void 0) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("img", {
				className: UsageBilling_module_css_default.vendorLogo,
				src: logo,
				alt: "",
				"aria-hidden": "true"
			});
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
				className: UsageBilling_module_css_default.vendorLetter,
				style: colorVar !== void 0 ? { background: colorVar } : void 0,
				"aria-hidden": "true",
				children: provider.trim().charAt(0).toUpperCase()
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
			const [reconcile, setReconcile] = (0, react.useState)(void 0);
			const [quotas, setQuotas] = (0, react.useState)([]);
			const [quotasStale, setQuotasStale] = (0, react.useState)(false);
			const [relayQuotas, setRelayQuotas] = (0, react.useState)([]);
			const [currency, setCurrency] = (0, react.useState)("cny");
			const [floatPrefs, setFloatPrefs] = (0, react.useState)(() => loadFloatWindowPrefs());
			const updateFloatPrefs = (0, react.useCallback)((next) => {
				setFloatPrefs(next);
				saveFloatWindowPrefs(next);
			}, []);
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
				fetchBalanceDoc().then(({ balances, reconcile }) => {
					if (balances.length > 0) setBalances(balances);
					setReconcile(reconcile);
				});
				fetchSubscriptions().then((list) => {
					if (list.length > 0) {
						setQuotas(list);
						setQuotasStale(false);
					} else setQuotasStale(false);
				}).catch(() => {
					setQuotasStale(true);
				});
				fetchRelayQuotas().then((list) => {
					setRelayQuotas(list);
				}).catch(() => {});
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
			const [nowMs, setNowMs] = (0, react.useState)(() => Date.now());
			(0, react.useEffect)(() => {
				const timer = setInterval(() => setNowMs(Date.now()), STATS_REFRESH_INTERVAL_MS);
				return () => {
					clearInterval(timer);
				};
			}, []);
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
				const upcoming = computePeakAlert(nowMs, peakConfig, lastTierSwitchAt);
				if (upcoming === null) return;
				actions.markTierSwitchAlerted(upcoming.atMs);
				setPeakHit(upcoming);
				if (!peakConfig.webNotify) return;
				if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
				const minutes = Math.max(1, Math.round((upcoming.atMs - nowMs) / 6e4));
				const title = upcoming.entering === "peak" ? t("billing.peakAlertTitlePeak") : t("billing.peakAlertTitleOff");
				const body = upcoming.entering === "peak" ? t("billing.tierAlertEnterPeak").replace("{minutes}", String(minutes)) : t("billing.tierAlertEnterOff").replace("{minutes}", String(minutes));
				try {
					new Notification(title, { body });
				} catch {}
			}, [
				nowMs,
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
					calls: total.calls
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
					dash,
					floatPrefs,
					subscriptions: quotas
				}),
				open && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(BillingDashboard, {
					stats,
					t,
					onClose: close,
					health,
					balances,
					...reconcile === void 0 ? {} : { reconcile },
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
					onPreviewPeak: previewPeak,
					floatPrefs,
					onFloatPrefs: updateFloatPrefs,
					quotasStale
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
			const isPeak = tier.tier === "peak";
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
				className: UsageBilling_module_css_default.feeBar,
				"data-testid": "billing-live-cost-bar",
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: isPeak ? UsageBilling_module_css_default.feeChipPrimary : UsageBilling_module_css_default.feeChipOff,
						"data-testid": "billing-live-tier",
						children: isPeak ? t("billing.tierPeak") : t("billing.tierOff")
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: UsageBilling_module_css_default.feeCount,
						children: formatSwitchCountdown(tier.nextSwitchInMs)
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: UsageBilling_module_css_default.feeSuffix,
						children: isPeak ? t("billing.tierToOff") : t("billing.tierToPeak")
					}),
					hasCost && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: UsageBilling_module_css_default.feeSep,
							"aria-hidden": "true",
							children: "·"
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
							className: UsageBilling_module_css_default.feeItem,
							"data-testid": "billing-live-turn",
							children: [
								t("billing.liveTurn"),
								" ",
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: UsageBilling_module_css_default.feeNum,
									children: money(turnCost)
								})
							]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: UsageBilling_module_css_default.feeSep,
							"aria-hidden": "true",
							children: "·"
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
							className: UsageBilling_module_css_default.feeItem,
							"data-testid": "billing-live-session",
							children: [
								t("billing.liveSession"),
								" ",
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: UsageBilling_module_css_default.feeNum,
									children: money(sessionCost)
								})
							]
						})
					] }),
					chips.map((chip) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: UsageBilling_module_css_default.feeSep,
						"aria-hidden": "true",
						children: "·"
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
						className: chip.pct <= 10 ? UsageBilling_module_css_default.feeChipError : UsageBilling_module_css_default.feeChipAlert,
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
					for (const listener of listeners) try {
						listener(next);
					} catch {}
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
			const seen = /* @__PURE__ */ new Set();
			let closeTimer;
			const snapshot = list.getSnapshot();
			for (const id of snapshot.ids) {
				const summary = snapshot.byId[id];
				if (summary !== void 0) {
					seen.add(String(id));
					if (isFinished(summary)) previousFinished.add(String(id));
				}
			}
			const notify = (title) => {
				const { enabled, timeout } = getConfig();
				if (!enabled) return;
				if (typeof Notification === "undefined") return;
				if (Notification.permission !== "granted") return;
				try {
					const notification = new Notification(title, {
						body: title,
						tag: "dsh-billing-completion",
						requireInteraction: timeout === 0
					});
					if (timeout > 0) {
						if (closeTimer !== void 0) clearTimeout(closeTimer);
						closeTimer = setTimeout(() => notification.close(), timeout * 1e3);
					}
				} catch {}
			};
			const unsubscribe = list.subscribe(() => {
				const state = list.getSnapshot();
				const finishedTitles = [];
				for (const id of state.ids) {
					const summary = state.byId[id];
					if (summary === void 0) continue;
					const key = String(id);
					const finished = isFinished(summary);
					const firstSeen = !seen.has(key);
					if (firstSeen) seen.add(key);
					if (finished && !firstSeen && !previousFinished.has(key)) finishedTitles.push(summary.title ?? summary.id ?? key);
					if (finished) previousFinished.add(key);
					else previousFinished.delete(key);
				}
				if (finishedTitles.length > 0) {
					const title = finishedTitles.length === 1 ? finishedTitles[0] : `${finishedTitles.length} 个会话已完成`;
					if (title !== void 0) notify(title);
				}
			});
			return () => {
				unsubscribe();
				if (closeTimer !== void 0) clearTimeout(closeTimer);
			};
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