/** Build environment variables, e.g. process.env at build time. */
export type BuildEnvironment = Readonly<Record<string, string | undefined>>

const PULL_REQUEST_NUMBER = /pr[-\s#]*(\d+)/i
const SHORT_COMMIT_LENGTH = 7

/**
 * Label for the preview badge, from Render's build variables, e.g.
 * "Preview · PR #5 · docs/test-render-preview · d777c09". Null outside pull request previews,
 * so production shows no badge.
 */
export function describePreview(environment: BuildEnvironment): string | null {
  if (environment['IS_PULL_REQUEST'] !== 'true') {
    return null
  }

  const commit = (environment['RENDER_GIT_COMMIT'] ?? '').slice(0, SHORT_COMMIT_LENGTH)

  const parts = [
    'Preview',
    findPullRequestLabel(environment),
    environment['RENDER_GIT_BRANCH'] ?? '',
    commit,
  ]

  return parts.filter((part) => part !== '').join(' · ')
}

/** "PR #5" from the preview's service name or URL (…-pr-5…), or '' if neither has it. */
function findPullRequestLabel(environment: BuildEnvironment): string {
  const sources = [environment['RENDER_SERVICE_NAME'], environment['RENDER_EXTERNAL_URL']]

  const pullRequestNumber = sources
    .map((source) => PULL_REQUEST_NUMBER.exec(source ?? '')?.[1])
    .find((match) => match !== undefined)

  return pullRequestNumber === undefined ? '' : `PR #${pullRequestNumber}`
}
