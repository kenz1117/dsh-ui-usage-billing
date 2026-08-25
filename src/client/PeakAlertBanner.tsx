/**
 * 峰谷切换提醒浮层：切档前状态条（右下角或居中）。用 `position: fixed` 即可在
 * 任意宿主容器内覆盖整个视口，因此不需要 portal。布局按设计 peak-card：头部
 * （档位 tag + 关闭）→ 大号等宽倒计时 → 一句说明。渲染是受控的：父组件把命中
 * （hit）与偏好传入，显示剩余分钟并在切换后消失。
 */

import { useEffect, useState } from 'react'
import clsx from 'clsx'
import type { PeakAlertConfig, PeakAlertHit } from './peak-alert.ts'
import type { UsageBillingKey } from './locales.ts'
import css from './UsageBilling.module.css'

/** Props: 命中的切档、偏好、国际化、关闭回调。 */
export interface PeakAlertBannerProps {
  hit: PeakAlertHit
  config: PeakAlertConfig
  t: (key: UsageBillingKey) => string
  onDismiss: () => void
}

/** 渲染一个切档前提醒状态条。 */
export function PeakAlertBanner({ hit, config, t, onDismiss }: PeakAlertBannerProps): React.ReactNode {
  // 每秒刷新剩余分钟；越过切换点后自动卸载。
  const [nowMs, setNowMs] = useState(() => Date.now())
  useEffect(() => {
    const timer = setInterval(() => setNowMs(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [])

  // 越过切换点：通知父组件清除命中状态从而卸载本组件，否则 `return null` 后
  // 组件仍挂载、每秒 setInterval 永久空转（不可见组件的隐性泄漏）。
  useEffect(() => {
    if (nowMs >= hit.atMs) onDismiss()
  }, [nowMs, hit.atMs, onDismiss])

  if (nowMs >= hit.atMs) return null
  const minutes = Math.max(1, Math.round((hit.atMs - nowMs) / 60_000))
  const entering = hit.entering
  const tag = entering === 'peak' ? t('billing.tierPeak') : t('billing.tierOff')
  const desc = entering === 'peak' ? t('billing.peakAlertDescPeak') : t('billing.peakAlertDescOff')
  const isPeak = entering === 'peak'

  return (
    <div
      className={clsx(
        css.peakCard,
        isPeak ? css.peakCardPeak : css.peakCardOff,
        config.position === 'center' ? css.peakCardCenter : css.peakCardCorner,
      )}
      data-testid="billing-peak-alert"
      role="alert"
    >
      <div className={css.peakHead}>
        <span className={clsx(css.peakTag, isPeak ? css.peakTagPrimary : css.peakTagSuccess)}>
          <span className={clsx(css.peakDot, isPeak ? css.peakDotPrimary : css.peakDotSuccess)} aria-hidden="true" />
          {tag}
        </span>
        <button type="button" className={css.peakClose} onClick={onDismiss} aria-label={t('billing.close')}>
          ×
        </button>
      </div>
      <div className={clsx(css.peakCount, isPeak ? css.peakCountPrimary : css.peakCountSuccess)}>{minutes}min</div>
      <p className={css.peakDesc}>{desc}</p>
    </div>
  )
}
