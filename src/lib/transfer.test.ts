import { describe, expect, test } from 'vitest'

import { buildSettings, buy, sell } from '../test/builders'
import { createExportFileName, parseImport, serializeExport } from './transfer'

const TODAY = '2026-11-07'

const state = {
  settings: buildSettings(),
  trades: [sell(buy({ tradeId: 'closed' }), { price: 3 }), buy({ tradeId: 'open' })],
}

describe('serializeExport', () => {
  test('wraps the log with its format, version and date', () => {
    expect(JSON.parse(serializeExport(state, TODAY))).toEqual({
      format: 'trading-log',
      version: 1,
      exportedOn: TODAY,
      state,
    })
  })
})

describe('createExportFileName', () => {
  test('dates the file', () => {
    expect(createExportFileName(TODAY)).toBe('trading-log-2026-11-07.json')
  })
})

describe('parseImport', () => {
  test('reads an export back into the same log', () => {
    expect(parseImport(serializeExport(state, TODAY))).toEqual({ isSuccess: true, output: state })
  })

  test.each([
    { name: 'text that isn’t JSON', text: 'not json', message: /isn’t valid JSON/ },
    { name: 'JSON of another kind', text: '{"trades":[]}', message: /isn’t a trading log export/ },
    { name: 'a newer version', text: '{"format":"trading-log","version":2}', message: /export/ },
    { name: 'null', text: 'null', message: /isn’t a trading log export/ },
  ])('turns away $name', ({ text, message }) => {
    const imported = parseImport(text)

    expect(imported.isSuccess).toBe(false)

    expect(imported.isSuccess ? '' : imported.error).toMatchObject({
      kind: 'importFailed',
      message,
    })
  })

  test('says what is wrong with an export whose log is invalid', () => {
    const broken = { format: 'trading-log', version: 1, state: { ...state, trades: [{}] } }
    const imported = parseImport(JSON.stringify(broken))

    expect(imported.isSuccess ? '' : imported.error.message).toMatch(/^This export can’t be read: /)
  })
})
