/**
 * Test setup. jsdom has no <dialog> methods; give it minimal ones so components can open and
 * close sheets in tests. Patching the prototype needs `this`, so those lines opt out of fp/no-this.
 */

function openDialog(this: HTMLDialogElement): void {
  // oxlint-disable-next-line fp/no-this -- jsdom polyfill patches HTMLDialogElement.prototype
  this.setAttribute('open', '')
}

function closeDialog(this: HTMLDialogElement): void {
  // oxlint-disable-next-line fp/no-this -- jsdom polyfill patches HTMLDialogElement.prototype
  this.removeAttribute('open')
  // oxlint-disable-next-line fp/no-this -- jsdom polyfill patches HTMLDialogElement.prototype
  this.dispatchEvent(new Event('close'))
}

function addDialogMethods(): void {
  const isMissing =
    typeof HTMLDialogElement !== 'undefined' && !('showModal' in HTMLDialogElement.prototype)

  if (isMissing) {
    Object.defineProperties(HTMLDialogElement.prototype, {
      showModal: { value: openDialog },
      close: { value: closeDialog },
    })
  }
}

addDialogMethods()
