/** @vitest-environment jsdom */
import { cleanup, render, screen, within } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import type { UserEvent } from '@testing-library/user-event'
import { afterEach, describe, expect, test, vi as mocking } from 'vitest'

import { App } from './App'
import { createAppError } from './lib/errors'
import { fail, succeed } from './lib/result'
import type { StorageAdapter } from './lib/storage'
import type { AppState } from './lib/types'
import { buildSettings, buy, sell } from './test/builders'

const saveError = createAppError(
  'saveFailed',
  'Couldn’t save. Your last change is only in this tab.',
)

interface FakeStorageOptions {
  readonly stored?: AppState | null
  readonly save?: StorageAdapter['save']
}

/** An in-memory adapter: loads `stored` and records saves. */
function createFakeStorage({ stored = null, save }: FakeStorageOptions = {}) {
  const saveSpy = save ?? mocking.fn<StorageAdapter['save']>().mockResolvedValue(succeed(null))
  const storage: StorageAdapter = { load: async () => succeed(stored), save: saveSpy }

  return { storage, saveSpy }
}

/** Select a field's text and type over it, as a user would. */
async function replaceText(user: UserEvent, field: HTMLElement, text: string): Promise<void> {
  await user.tripleClick(field)
  await user.keyboard(text)
}

function getSheet() {
  return within(screen.getByRole('dialog'))
}

afterEach(() => {
  cleanup()
})

describe('App', () => {
  test('shows the empty log once storage has loaded', async () => {
    const { storage, saveSpy } = createFakeStorage()

    render(<App storage={storage} />)

    expect(screen.getByText('Loading your log…')).toBeTruthy()

    expect(
      await screen.findByText('No open positions. Log a buy to start the next round.'),
    ).toBeTruthy()

    expect(saveSpy).not.toHaveBeenCalled()
  })

  test('logs a buy and a sell, showing the net result and saving each change', async () => {
    const user = userEvent.setup()
    const { storage, saveSpy } = createFakeStorage()

    render(<App storage={storage} />)
    await user.click(await screen.findByRole('button', { name: 'Log a buy' }))
    await user.type(getSheet().getByLabelText('Ticker'), 'kdk')
    await user.type(getSheet().getByLabelText('Shares'), '1095')
    await user.type(getSheet().getByLabelText('Buy price'), '0,91258')
    await user.click(getSheet().getByRole('button', { name: 'Log buy' }))

    expect(screen.getByText(/999,28.€ invested/)).toBeTruthy()

    await user.click(screen.getByRole('button', { name: 'Sell' }))
    await user.type(getSheet().getByLabelText('Sell price'), '1,05')

    expect(getSheet().getByText(/Before tax/).textContent).toMatch(/\+150,47/)

    await user.click(getSheet().getByRole('button', { name: 'Log sell' }))

    expect(screen.getByText(/\+150,47.€ net/)).toBeTruthy()
    expect(saveSpy).toHaveBeenCalledTimes(2)
  })

  test('explains what is missing instead of logging an invalid buy', async () => {
    const user = userEvent.setup()
    const { storage, saveSpy } = createFakeStorage()

    render(<App storage={storage} />)
    await user.click(await screen.findByRole('button', { name: 'Log a buy' }))
    await user.click(getSheet().getByRole('button', { name: 'Log buy' }))

    expect(getSheet().getByRole('alert').textContent).toBe('Enter a ticker or name.')
    expect(saveSpy).not.toHaveBeenCalled()
  })

  test('reopens a closed trade and deletes it after a second tap', async () => {
    const user = userEvent.setup()
    const closed = sell(buy({ tradeId: 'kdk' }), { price: 2, date: '2026-03-01' })

    const { storage } = createFakeStorage({
      stored: { settings: buildSettings(), trades: [closed] },
    })

    render(<App storage={storage} />)
    await user.click(await screen.findByRole('button', { name: /KDK/ }))
    await user.click(getSheet().getByRole('button', { name: 'Reopen position' }))

    expect(screen.getByRole('button', { name: 'Sell' })).toBeTruthy()

    await user.click(screen.getByRole('button', { name: 'Edit KDK' }))
    await user.click(getSheet().getByRole('button', { name: 'Delete trade' }))
    await user.click(getSheet().getByRole('button', { name: 'Tap again to delete' }))

    expect(screen.getByText('No open positions. Log a buy to start the next round.')).toBeTruthy()
  })

  test('validates settings and saves them', async () => {
    const user = userEvent.setup()
    const { storage } = createFakeStorage()

    render(<App storage={storage} />)
    await user.click(await screen.findByRole('button', { name: 'Settings' }))
    await replaceText(user, getSheet().getByLabelText('Tax rate (%)'), '70')
    await user.click(getSheet().getByRole('button', { name: 'Save settings' }))

    expect(getSheet().getByRole('alert').textContent).toBe('Enter a tax rate between 0 and 60.')

    await replaceText(user, getSheet().getByLabelText('Start budget (€)'), '500')
    await replaceText(user, getSheet().getByLabelText('Tax rate (%)'), '25')
    await user.click(getSheet().getByRole('button', { name: 'Save settings' }))

    expect(screen.getByText(/from 500,00/)).toBeTruthy()
  })

  test('shows when a change could not be saved, until a retry succeeds', async () => {
    const user = userEvent.setup()

    const save = mocking
      .fn<StorageAdapter['save']>()
      .mockResolvedValueOnce(fail(saveError))
      .mockResolvedValue(succeed(null))

    const { storage } = createFakeStorage({ save })

    render(<App storage={storage} />)
    await user.click(await screen.findByRole('button', { name: 'Settings' }))
    await user.click(getSheet().getByRole('button', { name: 'Save settings' }))

    expect((await screen.findByRole('alert')).textContent).toMatch(/Couldn’t save/)

    await user.click(screen.getByRole('button', { name: 'Try again' }))

    expect(await screen.findByRole('button', { name: 'Log a buy' })).toBeTruthy()
    expect(screen.queryByText(/Couldn’t save/)).toBeNull()
    expect(save).toHaveBeenCalledTimes(2)
  })

  test('never saves over data it could not read', async () => {
    const loadError = createAppError('loadFailed', 'Couldn’t read your saved log.')
    const save = mocking.fn<StorageAdapter['save']>()
    const storage: StorageAdapter = { load: async () => fail(loadError), save }

    render(<App storage={storage} />)

    expect((await screen.findByRole('alert')).textContent).toMatch(/Nothing was changed/)
    expect(screen.queryByRole('button', { name: 'Log a buy' })).toBeNull()
    expect(save).not.toHaveBeenCalled()
  })
})
