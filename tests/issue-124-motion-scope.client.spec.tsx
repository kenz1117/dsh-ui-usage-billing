// @vitest-environment jsdom
/**
 * Issue #124 —— 「动效强度」设置不得越界影响宿主与其他插件。
 *
 * 报告者实测：动效切到「克制」后，页面上**所有元素**的动画被压平（宿主自己的
 * 右键菜单、对话框，以及其他插件加的动画全部失效），切回「丰富」才恢复。
 *
 * 根因：`data-motion` 写在 <html> 上，配 `[data-motion="off"] *` 通配符 +
 * !important —— 选择器从 <html> 起算又是通配符，全文档每个元素的动画时长都被
 * 压成 .001ms。
 *
 * 修复契约：
 * ① 偏好属性名命名空间化：<html> 上是 data-dsh-billing-motion /
 *    data-dsh-billing-density，不再是通用名（通用名会被宿主/第三方插件的同名
 *    属性互相覆盖）；
 * ② 动效压制规则只作用在本插件自有根容器 .dsh-billing-root 之内——本插件每处
 *    自有 DOM 根（触发卡 / 图标钮 / 悬浮速览 / 仪表盘 / 弹窗外壳 / 宿主设置页 /
 *    峰谷浮层 / 即时代费条 / 低谷队列控件）都必须挂这个作用域类。
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import type { ComponentProps } from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { bindSnapshotSelector } from './bind-snapshot-selector'
import { UsageBilling } from '../src/client/UsageBilling.tsx'
import { NativeSettingsSection } from '../src/client/NativeSettingsSection.tsx'
import { createBillingBudgetStore } from '../src/client/budget-store.ts'
import { zh } from '../src/client/locales.ts'
import { BILLING_ROOT_CLASS } from '../src/client/constants.ts'

beforeEach(() => {
  localStorage.clear()
  delete document.documentElement.dataset.dshBillingMotion
  delete document.documentElement.dataset.dshBillingDensity
})

afterEach(() => {
  cleanup()
  delete document.documentElement.dataset.dshBillingMotion
  delete document.documentElement.dataset.dshBillingDensity
})

const t = (key: string): string => (zh as Record<string, string>)[key] ?? key

/** 组件 props：数据桥 stub 空实现 + 真实预算 store 实例。 */
function makeProps(): ComponentProps<typeof UsageBilling> {
  const budgetStore = createBillingBudgetStore().create()
  return {
    wide: true,
    t,
    checkModels: async () => ({
      checked: true, available: true, models: 1, failures: 0, okProviders: [], badProviders: [],
    }),
    publishCosts: () => {},
    registerOpen: () => () => {},
    renderSlot: () => null,
    useStore: bindSnapshotSelector(budgetStore),
    actions: budgetStore.actions,
  } as unknown as ComponentProps<typeof UsageBilling>
}

/** 类名是否带本插件根容器标记（CSS 模块类名会被哈希，只有全局类名是字面量）。 */
function hasRootClass(el: Element | null): boolean {
  return el !== null && typeof el.className === 'string' && el.className.split(/\s+/).includes(BILLING_ROOT_CLASS)
}

describe('issue #124：动效压制只在本插件根容器内生效', () => {
  it('侧栏触发卡与悬浮速览都挂在根容器标记下', () => {
    const { container } = render(<UsageBilling {...makeProps()} />)
    // wide 触发卡（.triggerWrap 包裹 .trigger）
    expect(hasRootClass(container.querySelector('[data-testid="billing-trigger"]')?.parentElement ?? null)).toBe(true)
    // 悬浮速览 portal 到 body：不在触发卡子树里，必须自己挂标记
    expect(hasRootClass(document.querySelector('[data-testid="billing-trigger-pop"]'))).toBe(true)
  })

  it('compact 图标钮挂根容器标记（该档没有 triggerWrap 包裹）', () => {
    const props = makeProps()
    const { container } = render(<UsageBilling {...props} wide={false} />)
    const rail = container.querySelector('[data-testid="billing-rail-button"]')
    expect(rail).not.toBeNull()
    expect(hasRootClass(rail)).toBe(true)
  })

  it('仪表盘内容根与弹窗外壳都挂根容器标记', async () => {
    const { container } = render(<UsageBilling {...makeProps()} />)
    fireEvent.click(container.querySelector('button')!)
    expect(await screen.findByText('使用统计')).toBeTruthy()
    // 弹窗外壳：宿主 Modal 的根（承载 dashboardIn 入场动画）
    expect(hasRootClass(document.querySelector('.dsh-billing-modal'))).toBe(true)
    // 仪表盘内容根
    expect(hasRootClass(screen.getByTestId('billing-dashboard'))).toBe(true)
  })

  it('宿主原生设置页根容器挂标记', () => {
    const props = makeProps()
    render(
      <NativeSettingsSection
        {...(props as unknown as ComponentProps<typeof NativeSettingsSection>)}
      />,
    )
    expect(hasRootClass(screen.getByTestId('native-billing-settings'))).toBe(true)
  })

  it('偏好写到命名空间化的 <html> 属性上，且不再留下通用名属性', async () => {
    const { container } = render(<UsageBilling {...makeProps()} />)
    fireEvent.click(container.querySelector('button')!)
    fireEvent.click(await screen.findByTestId('billing-tab-settings'))
    fireEvent.click(await screen.findByTestId('billing-motion-subtle'))
    expect(document.documentElement.dataset.dshBillingMotion).toBe('subtle')
    // 通用名必须不存在：宿主或第三方插件若写同名属性，不该被本插件压制/覆盖
    expect(document.documentElement.getAttribute('data-motion')).toBeNull()
    expect(document.documentElement.getAttribute('data-density')).toBeNull()
    expect(document.documentElement.dataset.dshBillingDensity).toBe('default')
  })

  it('CSS 契约：动效选择器必须带作用域类，且没有裸通配符压制', () => {
    const cssSource = readFileSync(resolve(process.cwd(), 'src/client/UsageBilling.module.css'), 'utf8')
    const code = cssSource.replace(/\/\*[\s\S]*?\*\//g, '')
    const motionLines = code.split('\n').filter(line => line.includes('[data-dsh-billing-motion'))
    expect(motionLines.length).toBeGreaterThan(0)
    for (const line of motionLines) {
      expect(line).toContain('.dsh-billing-root')
    }
    // 旧的越界写法不得复现：属性挂在 <html> 上配通配符 * + !important
    expect(code).not.toMatch(/\[data-motion[=\]]\s*\*/)
    expect(code).not.toMatch(/\[data-density[=\]]/)
  })
})
