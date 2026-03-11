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

function formatTypingInput(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 8)
  const dd = digits.slice(0, 2)
  const mm = digits.slice(2, 4)
  const yyyy = digits.slice(4, 8)

  if (digits.length <= 2) return dd
  if (digits.length <= 4) return `${dd}/${mm}`
  return `${dd}/${mm}/${yyyy}`
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

  React.useEffect(() => {
    setDisplayValue(formatIsoToDisplay(value))
  }, [value])

  const selectedDate = React.useMemo(() => parseIsoDate(value), [value])

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const next = formatTypingInput(event.target.value)
    setDisplayValue(next)

    const iso = toIsoIfValid(next, min, max)
    if (iso) {
      onChangeAction(iso)
      return
    }

    // Keep parent state clean while user is still typing.
    onChangeAction('')
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
              onSelect={handleCalendarSelect}
              captionLayout="dropdown"
            />
          </PopoverContent>
        </Popover>
      )}
    </div>
  )
}
