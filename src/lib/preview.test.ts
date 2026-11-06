import { describe, expect, test } from 'vitest'

import { describePreview } from './preview'

const previewBuild = {
  IS_PULL_REQUEST: 'true',
  RENDER_GIT_COMMIT: 'd777c09f1e2a3b4c5d6e7f8091a2b3c4d5e6f708',
  RENDER_GIT_BRANCH: 'docs/test-render-preview',
  RENDER_SERVICE_NAME: 'day-trading-rollercoaster-pr-5',
}

describe('describePreview', () => {
  test('labels a pull request preview with PR, branch and short commit', () => {
    expect(describePreview(previewBuild)).toBe(
      'Preview · PR #5 · docs/test-render-preview · d777c09',
    )
  })

  test('finds the PR number in the preview URL when the service name lacks it', () => {
    const fromUrl = {
      ...previewBuild,
      RENDER_SERVICE_NAME: 'day-trading-rollercoaster',
      RENDER_EXTERNAL_URL: 'https://day-trading-rollercoaster-pr-12.onrender.com',
    }

    expect(describePreview(fromUrl)).toBe('Preview · PR #12 · docs/test-render-preview · d777c09')
  })

  test('leaves out what the build does not tell', () => {
    expect(describePreview({ IS_PULL_REQUEST: 'true' })).toBe('Preview')
  })

  test('shows no badge for production or local builds', () => {
    expect(describePreview({ ...previewBuild, IS_PULL_REQUEST: 'false' })).toBeNull()
    expect(describePreview({})).toBeNull()
  })
})
