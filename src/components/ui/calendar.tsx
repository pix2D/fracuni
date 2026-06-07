import * as React from "react"
import { DayPicker } from "react-day-picker"
import { CaretLeftIcon, CaretRightIcon } from "@phosphor-icons/react"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"

type CalendarProps = React.ComponentProps<typeof DayPicker> & {
  holidayDates?: Date[]
}

function Calendar({
  className,
  classNames,
  holidayDates,
  modifiers,
  modifiersClassNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      data-slot="calendar"
      showOutsideDays={showOutsideDays}
      className={cn("p-3", className)}
      modifiers={{
        ...modifiers,
        holiday: holidayDates ?? [],
      }}
      modifiersClassNames={{
        ...modifiersClassNames,
        holiday: "text-destructive font-semibold",
      }}
      classNames={{
        months: "flex flex-col sm:flex-row gap-2",
        month: "flex flex-col gap-4",
        month_caption: "flex items-center justify-center pt-1 relative",
        caption_label: "text-xs font-medium",
        nav: "flex items-center gap-1",
        button_previous: cn(
          buttonVariants({ variant: "outline", size: "icon-xs" }),
          "absolute left-1",
        ),
        button_next: cn(
          buttonVariants({ variant: "outline", size: "icon-xs" }),
          "absolute right-1",
        ),
        month_grid: "w-full border-collapse",
        weekdays: "flex",
        weekday: "text-muted-foreground w-8 font-normal text-[0.65rem]",
        week: "flex w-full mt-1",
        day: cn(
          "relative p-0 text-center text-xs",
          "focus-within:relative focus-within:z-20",
        ),
        day_button: cn(
          buttonVariants({ variant: "ghost", size: "icon-xs" }),
          "size-8 font-normal",
        ),
        selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground",
        today: "bg-accent text-accent-foreground",
        outside: "text-muted-foreground/50",
        disabled: "text-muted-foreground/30",
        hidden: "invisible",
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation }) =>
          orientation === "left" ? (
            <CaretLeftIcon className="size-3" />
          ) : (
            <CaretRightIcon className="size-3" />
          ),
      }}
      {...props}
    />
  )
}

export { Calendar }
export type { CalendarProps }
