// @vitest-environment jsdom
/**
 * PluginInfoCard component test: renders author / repository / version /
 * license metadata; an absent version shows an em dash rather than fabricating.
 */

import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PluginInfoCard } from '../src/client/PluginInfoCard.tsx'
import { zh } from '../src/client/locales.ts'

const t = (key: Parameters<typeof zh>[0]): string => (zh as Record<string, string>)[key] ?? key

describe('PluginInfoCard', () => {
  it('renders name, description, version, author, repository, npm and license', () => {
    render(<PluginInfoCard t={t} version="0.9.4" />)
    expect(screen.getByTestId('billing-plugin-info')).toBeTruthy()
    // 包名在「插件名」与「npm」两行各出现一次。
    expect(screen.getAllByText('@kenz1117/dsh-ui-usage-billing').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('v0.9.4')).toBeTruthy()
    expect(screen.getByText(/KenZ \(kenz1117\)/)).toBeTruthy()
    // 仓库行：链接文本「GitHub」，href 指向仓库主页。
    const repoLink = screen.getByRole('link', { name: 'GitHub' })
    expect(repoLink).toBeTruthy()
    expect(repoLink.getAttribute('href')).toBe('https://github.com/kenz1117/dsh-ui-usage-billing')
    expect(screen.getByText('MIT')).toBeTruthy()
  })

  it('shows an em dash version when the server did not supply one (older snapshot)', () => {
    render(<PluginInfoCard t={t} version={undefined} />)
    expect(screen.getByText('—')).toBeTruthy()
  })
})
