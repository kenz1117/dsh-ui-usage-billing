/**
 * 峰谷切换提醒浮层：切档前状态条（右下角或居中）。用 `position: fixed` 即可在
 * 任意宿主容器内覆盖整个视口，因此不需要 portal。布局为「档位徽标 + 大号等宽
 * 倒计时 + 一句说明 + 关闭」，克制冷调、无重力阴影。渲染是受控的：父组件把命中
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

  if (nowMs >= hit.atMs) return null
  const minutes = Math.max(1, Math.round((hit.atMs - nowMs) / 60_000))
  const entering = hit.entering
  const tag = entering === 'peak' ? t('billing.tierPeak') : t('billing.tierOff')
  const desc = entering === 'peak' ? t('billing.peakAlertDescPeak') : t('billing.peakAlertDescOff')

  return (
    <div
      className={clsx(
        css.peakAlert,
        entering === 'peak' ? css.peakAlertPeak : css.peakAlertOff,
        config.position === 'center' ? css.peakAlertCenter : css.peakAlertCorner,
      )}
      data-testid="billing-peak-alert"
      role="alert"
    >
      <span className={css.peakAlertTag}>{tag}</span>
      <span className={css.peakAlertCountdown}>{minutes}m</span>
      <span className={css.peakAlertText}>{desc}</span>
      <button type="button" className={css.peakAlertClose} onClick={onDismiss} aria-label={t('billing.close')}>
        ×
      </button>
    </div>
  )
}
