'use client'

import * as React from 'react'
import { CalendarIcon } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

type DateFieldProps = {
  id?: string
  name?: string
  value: string
  onChangeAction: (isoDate: string) => void
  placeholder?: string
  required?: boolean
  disabled?: boolean
  readOnly?: boolean
  min?: string
  max?: string
  className?: string
  ariaLabel?: string
}

function pad2(value: number): string {
  return String(value).padStart(2, '0')
}

function formatIsoToDisplay(isoDate: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return ''
  const [year, month, day] = isoDate.split('-')
  return `${day}/${month}/${year}`
}

function formatDateToIso(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`
}

function parseIsoDate(value: string): Date | undefined {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined
  const [yearStr, monthStr, dayStr] = value.split('-')
  const year = Number.parseInt(yearStr, 10)
  const month = Number.parseInt(monthStr, 10)
  const day = Number.parseInt(dayStr, 10)
  const d = new Date(year, month - 1, day)
  if (d.getFullYear() !== year || d.getMonth() !== month - 1 || d.getDate() !== day) return undefined
  return d
}

function formatTypingInput(raw: string, isDeleting: boolean): string {
  const digits = raw.replace(/\D/g, '').slice(0, 8)
  const dd = digits.slice(0, 2)
  const mm = digits.slice(2, 4)
  const yyyy = digits.slice(4, 8)

  if (isDeleting) {
    if (digits.length <= 2) return dd
    if (digits.length <= 4) return `${dd}/${mm}`
    return `${dd}/${mm}/${yyyy}`
  }

  if (digits.length < 2) return dd
  if (digits.length === 2) return `${dd}/`
  if (digits.length < 4) return `${dd}/${mm}`
  if (digits.length === 4) return `${dd}/${mm}/`
  return `${dd}/${mm}/${yyyy}`
}

function sanitizeFreeformInput(raw: string): string {
  const cleaned = raw.replace(/[^\d/]/g, '')
  const parts = cleaned.split('/')

  const day = (parts[0] || '').replace(/\D/g, '').slice(0, 2)
  const month = (parts[1] || '').replace(/\D/g, '').slice(0, 2)
  const year = (parts[2] || '').replace(/\D/g, '').slice(0, 4)
  const slashCount = (cleaned.match(/\//g) || []).length

  let out = day

  if (slashCount >= 1 || parts.length > 1) {
    out += `/${month}`
  }

  if (slashCount >= 2 || parts.length > 2) {
    out += `/${year}`
  }

  return out.slice(0, 10)
}

function parseDisplayDate(display: string): Date | undefined {
  if (!/^\d{2}\/\d{2}\/\d{4}$/.test(display)) return undefined
  const [dayStr, monthStr, yearStr] = display.split('/')
  const day = Number.parseInt(dayStr, 10)
  const month = Number.parseInt(monthStr, 10)
  const year = Number.parseInt(yearStr, 10)

  const d = new Date(year, month - 1, day)
  if (d.getFullYear() !== year || d.getMonth() !== month - 1 || d.getDate() !== day) return undefined
  return d
}

function toIsoIfValid(display: string, min: string, max: string): string {
  if (!/^\d{2}\/\d{2}\/\d{4}$/.test(display)) return ''
  const [dayStr, monthStr, yearStr] = display.split('/')
  const day = Number.parseInt(dayStr, 10)
  const month = Number.parseInt(monthStr, 10)
  const year = Number.parseInt(yearStr, 10)

  if (year < 1900 || year > 2100) return ''
  if (month < 1 || month > 12) return ''
  if (day < 1 || day > 31) return ''

  const date = new Date(year, month - 1, day)
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return ''

  const iso = `${year}-${pad2(month)}-${pad2(day)}`
  if (iso < min || iso > max) return ''

  return iso
}

export function DateField({
  id,
  name,
  value,
  onChangeAction,
  placeholder = 'dd/mm/yyyy',
  required,
  disabled,
  readOnly,
  min = '1900-01-01',
  max = '2100-12-31',
  className,
  ariaLabel,
}: DateFieldProps) {
  const [displayValue, setDisplayValue] = React.useState<string>(formatIsoToDisplay(value))
  const [open, setOpen] = React.useState(false)
  const [calendarMonth, setCalendarMonth] = React.useState<Date | undefined>(parseIsoDate(value))

  React.useEffect(() => {
    setDisplayValue(formatIsoToDisplay(value))
  }, [value])

  const selectedDate = React.useMemo(() => parseDisplayDate(displayValue) ?? parseIsoDate(value), [displayValue, value])

  React.useEffect(() => {
    if (open) {
      setCalendarMonth(selectedDate ?? new Date())
    }
  }, [open, selectedDate])

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const raw = event.target.value
    const isDeleting = raw.length < displayValue.length
    const caretAtEnd = (event.target.selectionStart ?? raw.length) === raw.length
    const next = caretAtEnd
      ? formatTypingInput(raw, isDeleting)
      : sanitizeFreeformInput(raw)
    setDisplayValue(next)

    const iso = toIsoIfValid(next, min, max)
    if (iso) {
      onChangeAction(iso)
      setCalendarMonth(parseIsoDate(iso))
      return
    }

    // Do not clear parent value during partial edits; this prevents full input reset on backspace.
    if (!next) {
      onChangeAction('')
      setCalendarMonth(undefined)
    }
  }

  const handleBlur = () => {
    if (!displayValue) {
      onChangeAction('')
      return
    }

    if (displayValue.length < 10) {
      return
    }

    const iso = toIsoIfValid(displayValue, min, max)
    if (iso) {
      onChangeAction(iso)
      setDisplayValue(formatIsoToDisplay(iso))
      return
    }

    // Reset only after full date is entered and invalid.
    setDisplayValue('')
    onChangeAction('')
  }

  const handleCalendarSelect = (date: Date | undefined) => {
    if (!date) {
      return
    }

    const iso = formatDateToIso(date)
    if (iso < min || iso > max) {
      return
    }

    onChangeAction(iso)
    setDisplayValue(formatIsoToDisplay(iso))
    setCalendarMonth(date)
    setOpen(false)
  }

  return (
    <div className={cn('relative', className)}>
      <Input
        id={id}
        name={name}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        placeholder={placeholder}
        value={displayValue}
        onChange={handleInputChange}
        onBlur={handleBlur}
        maxLength={10}
        disabled={disabled}
        readOnly={readOnly}
        required={required}
        aria-label={ariaLabel}
        className="pr-10"
      />

      {!readOnly && !disabled && (
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2"
              aria-label="Open calendar"
            >
              <CalendarIcon className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <Calendar
              mode="single"
              selected={selectedDate}
              month={calendarMonth}
              onMonthChange={setCalendarMonth}
              onSelect={handleCalendarSelect}
              captionLayout="dropdown"
            />
          </PopoverContent>
        </Popover>
      )}
    </div>
  )
}
