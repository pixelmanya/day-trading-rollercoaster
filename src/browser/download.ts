/** A file to hand to the user. */
export interface DownloadFile {
  readonly fileName: string
  readonly text: string
  readonly mimeType: string
}

/** Save text as a file through the browser's download. Call from an event handler only. */
export function downloadTextFile({ fileName, text, mimeType }: DownloadFile): void {
  const url = URL.createObjectURL(new Blob([text], { type: mimeType }))
  const link = Object.assign(document.createElement('a'), { href: url, download: fileName })

  link.click()
  URL.revokeObjectURL(url)
}
