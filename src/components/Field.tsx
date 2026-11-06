import type { ChangeEvent } from 'react'

import styles from './Field.module.css'

type FieldKind = 'decimal' | 'text' | 'date'

interface FieldProps<Name extends string> {
  readonly label: string
  readonly name: Name
  readonly text: string
  readonly onChange: (name: Name, text: string) => void
  readonly kind?: FieldKind
  readonly placeholder?: string
  readonly isFullWidth?: boolean
}

const inputModes = {
  decimal: 'decimal',
  text: 'text',
  date: undefined,
} as const satisfies Record<FieldKind, 'decimal' | 'text' | undefined>

/** A labelled input. The text stays exactly as typed; forms parse it on submit. */
export function Field<Name extends string>({
  label,
  name,
  text,
  onChange,
  kind = 'decimal',
  placeholder,
  isFullWidth = false,
}: FieldProps<Name>) {
  function handleChange({ currentTarget }: ChangeEvent<HTMLInputElement>) {
    onChange(name, currentTarget.value)
  }

  return (
    <div className={isFullWidth ? styles.fullWidth : undefined}>
      <label className={styles.label}>
        {label}
        <input
          className={styles.input}
          name={name}
          value={text}
          type={kind === 'date' ? 'date' : 'text'}
          inputMode={inputModes[kind]}
          placeholder={placeholder}
          autoComplete="off"
          onChange={handleChange}
        />
      </label>
    </div>
  )
}
