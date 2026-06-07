import { useState, useEffect, useCallback } from "react"
import { format } from "date-fns"
import { CalendarBlankIcon, ArrowClockwiseIcon } from "@phosphor-icons/react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

interface DatePickerProps {
  value?: Date
  onChange: (date: Date | undefined) => void
  placeholder?: string
}

function DatePicker({ value, onChange, placeholder = "Pick a date" }: DatePickerProps) {
  const [open, setOpen] = useState(false)
  const [month, setMonth] = useState<Date>(value ?? new Date())
  const [holidays, setHolidays] = useState<Date[]>([])
  const [refreshing, setRefreshing] = useState(false)

  const fetchHolidays = useCallback(async (year: number) => {
    try {
      const res = await fetch(`/api/holidays?year=${year}`)
      if (!res.ok) return
      const data = await res.json()
      setHolidays((prev) => {
        const existingYears = new Set(prev.map((d) => d.getFullYear()))
        if (existingYears.has(year)) {
          return prev
            .filter((d) => d.getFullYear() !== year)
            .concat(data.holidays.map((s: string) => new Date(s + "T00:00:00")))
        }
        return prev.concat(data.holidays.map((s: string) => new Date(s + "T00:00:00")))
      })
    } catch {
      // silently ignore fetch errors — holidays are purely visual
    }
  }, [])

  useEffect(() => {
    fetchHolidays(month.getFullYear())
  }, [month, fetchHolidays])

  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      const year = month.getFullYear()
      const res = await fetch(`/api/holidays?year=${year}`, { method: "POST" })
      if (!res.ok) return
      const data = await res.json()
      setHolidays((prev) =>
        prev
          .filter((d) => d.getFullYear() !== year)
          .concat(data.holidays.map((s: string) => new Date(s + "T00:00:00")))
      )
    } catch {
      // silently ignore
    } finally {
      setRefreshing(false)
    }
  }

  const handleSelect = (date: Date | undefined) => {
    onChange(date)
    if (date) setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full justify-start text-left font-normal",
            !value && "text-muted-foreground",
          )}
        >
          <CalendarBlankIcon data-icon="inline-start" className="size-4" />
          {value ? format(value, "dd.MM.yyyy.") : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0">
        <div className="flex items-center justify-end border-b border-border px-3 py-1.5">
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={handleRefresh}
            disabled={refreshing}
            title="Refresh holidays"
          >
            <ArrowClockwiseIcon className={cn("size-3", refreshing && "animate-spin")} />
          </Button>
        </div>
        <Calendar
          mode="single"
          selected={value}
          onSelect={handleSelect}
          month={month}
          onMonthChange={setMonth}
          holidayDates={holidays}
        />
      </PopoverContent>
    </Popover>
  )
}

export { DatePicker }
export type { DatePickerProps }
