// @vitest-environment jsdom
/**
 * Client `apply()` dashboard-shortcut contract.
 *
 * With the sidebar entry set to Hidden the trigger unmounts, so the only way
 * back into the dashboard is the host Settings page, `/usage`, or this
 * shortcut. The command must therefore register through the host's shortcut
 * catalog (rebindable, localized, no binding conflicts) and its action must
 * reach the sidebar instance's `openDashboard` even while that entry renders
 * nothing.
 *
 * The context is a recording double: `inject(['shortcuts'])` runs its callback
 * at once (the "service already provided" branch), and `effect` executes only
 * the shortcut registration — the other effects depend on services this double
 * does not model.
 */

import { describe, expect, it, vi } from 'vitest'
import type { Context } from '@deepseek-ai/cordis'
import { apply } from '../src/client/apply.ts'
import { en, zh } from '../src/client/locales.ts'
import { saveLanguage } from '../src/client/usage-billing-settings.ts'
import type { BillingMetricsRuntime } from '../src/client/billing-service.ts'

interface Binding {
  code: string
  secondCode?: string
  modifiers: readonly string[]
}

interface Resolution {
  status: string
  reason?: string
  run?: () => void
}

interface ShortcutCommand {
  id: string
  label: () => string
  aliases: readonly string[]
  defaults: Readonly<Record<string, Binding | undefined>>
  regions: readonly string[]
  modals: readonly string[]
  resolve: (context: unknown) => Resolution
}

const SHORTCUT_EFFECT_LABEL = 'ui-usage-billing: dashboard shortcut'

function shortcutContext(): {
  ctx: Context
  commands: ShortcutCommand[]
  provided: Map<string, unknown>
} {
  const commands: ShortcutCommand[] = []
  const provided = new Map<string, unknown>()
  const shortcuts = {
    register: (command: ShortcutCommand) => {
      commands.push(command)
      return () => {}
    },
  }
  const ctx = {
    provide: (name: string, value: unknown) => { provided.set(name, value) },
    effect: (callback: () => unknown, label?: string) => {
      if (label === SHORTCUT_EFFECT_LABEL) callback()
      return () => {}
    },
    get: () => undefined,
    inject: (deps: readonly string[], callback: (scoped: unknown) => unknown) => {
      if (deps.includes('shortcuts')) callback(ctx)
      return () => {}
    },
    shortcuts,
    locale: { register: () => () => {} },
    remote: {},
    sessions: {},
    slots: { inject: () => () => {}, register: () => () => {} },
  }
  return { ctx: ctx as unknown as Context, commands, provided }
}

function applyOnce(): ReturnType<typeof shortcutContext> & { command: ShortcutCommand } {
  const recorded = shortcutContext()
  apply(recorded.ctx)
  const command = recorded.commands[0]
  if (command === undefined) throw new Error('apply() registered no shortcut command')
  return { ...recorded, command }
}

describe('client apply(): dashboard shortcut', () => {
  it('registers exactly one command on a default the host does not already own', () => {
    const { commands, command } = applyOnce()
    expect(commands).toHaveLength(1)
    expect(command.id).toBe('usage-billing.open-dashboard')
    expect(command.aliases).toEqual(['usage', 'billing', 'dashboard'])
    // 宿主现有默认占用 KeyB/KeyN/KeyK/KeyT/KeyP/Slash/Comma/Backquote；重复会
    // 让 register() 直接抛错，连累整颗插件。
    expect(command.defaults['desktop:macos']).toEqual({ code: 'KeyU', modifiers: ['primary', 'shift'] })
    expect(command.defaults['desktop:windows']).toEqual({ code: 'KeyU', modifiers: ['primary', 'shift'] })
    expect(command.defaults['desktop:linux']).toEqual({ code: 'KeyU', modifiers: ['primary', 'shift'] })
    // 桌面与 Web 统一 primary+shift（宿主 ui-open-in-app 的 web 档同样是
    // primary+shift+字母，说明浏览器不保留这个组合）。
    expect(command.defaults['web:macos']).toEqual({ code: 'KeyU', modifiers: ['primary', 'shift'] })
    expect(command.defaults['web:windows']).toEqual({ code: 'KeyU', modifiers: ['primary', 'shift'] })
    // 宿主 ui-workspace 也不声明 web:linux 默认值（Linux Web 的放行集合更窄）。
    expect(command.defaults['web:linux']).toBeUndefined()
  })

  it('fires from the page and from composer focus, and stays out of modal layers', () => {
    const { command } = applyOnce()
    expect(command.regions).toEqual(['page', 'editable'])
    expect(command.modals).toEqual([])
  })

  it('opens the dashboard instance the sidebar entry registered', () => {
    const { command, provided } = applyOnce()
    const metrics = provided.get('billingMetrics') as BillingMetricsRuntime
    const open = vi.fn()
    const release = metrics.registerOpen(open)

    const resolution = command.resolve({ region: 'page', modal: null, target: null })
    expect(resolution.status).toBe('handled')
    resolution.run?.()
    expect(open).toHaveBeenCalledTimes(1)

    // 侧栏实例换挂后快捷键退化成空操作，而不是抛错。
    release()
    const orphaned = command.resolve({ region: 'page', modal: null, target: null })
    expect(orphaned.status).toBe('handled')
    expect(() => orphaned.run?.()).not.toThrow()
  })

  it('localizes the catalog label with the dashboard language', () => {
    // 词典默认 zh：从未保存过偏好时 loadLanguage() 落中文。
    expect(applyOnce().command.label()).toBe(zh.shortcutOpenDashboard)

    saveLanguage('en')
    try {
      expect(applyOnce().command.label()).toBe(en.shortcutOpenDashboard)
    } finally {
      saveLanguage('zh')
    }
  })
})
