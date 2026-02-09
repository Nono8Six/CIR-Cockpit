"use client"

import * as React from "react"
import { Check, ChevronsUpDown } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

type ComboboxContextValue = {
  items: readonly string[]
  filteredItems: readonly string[]
  value: string
  onValueChange: (value: string) => void
  open: boolean
  onOpenChange: (open: boolean) => void
  query: string
  onQueryChange: (query: string) => void
  disabled: boolean
}

const ComboboxContext = React.createContext<ComboboxContextValue>({
  items: [],
  filteredItems: [],
  value: "",
  onValueChange: () => undefined,
  open: false,
  onOpenChange: () => undefined,
  query: "",
  onQueryChange: () => undefined,
  disabled: false,
})

const useComboboxContext = () => React.useContext(ComboboxContext)

type ComboboxProps = {
  items: readonly string[]
  value: string
  onValueChange: (value: string) => void
  open?: boolean
  onOpenChange?: (open: boolean) => void
  disabled?: boolean
  className?: string
  children: React.ReactNode
}

const normalizeValue = (value: string) =>
  value.trim().toLowerCase()

function Combobox({
  items,
  value,
  onValueChange,
  open,
  onOpenChange,
  disabled = false,
  className,
  children,
}: ComboboxProps) {
  const [internalOpen, setInternalOpen] = React.useState(false)
  const [query, setQuery] = React.useState("")

  const isControlled = typeof open === "boolean"
  const resolvedOpen = isControlled ? open : internalOpen
  const handleOpenChange = React.useCallback(
    (nextOpen: boolean) => {
      if (!isControlled) {
        setInternalOpen(nextOpen)
      }
      onOpenChange?.(nextOpen)
      if (!nextOpen) {
        setQuery("")
      }
    },
    [isControlled, onOpenChange]
  )

  const filteredItems = React.useMemo(() => {
    const normalizedQuery = normalizeValue(query)
    if (!normalizedQuery) return items
    return items.filter((item) =>
      normalizeValue(item).includes(normalizedQuery)
    )
  }, [items, query])

  return (
    <ComboboxContext.Provider
      value={{
        items,
        filteredItems,
        value,
        onValueChange,
        open: resolvedOpen,
        onOpenChange: handleOpenChange,
        query,
        onQueryChange: setQuery,
        disabled,
      }}
    >
      <Popover open={resolvedOpen} onOpenChange={handleOpenChange}>
        <div className={cn("w-full", className)}>{children}</div>
      </Popover>
    </ComboboxContext.Provider>
  )
}

type ComboboxInputProps = {
  placeholder: string
  searchPlaceholder?: string
  className?: string
  disabled?: boolean
}

function ComboboxInput({
  placeholder,
  searchPlaceholder,
  className,
  disabled,
  ...props
}: ComboboxInputProps & React.ComponentPropsWithoutRef<"button">) {
  const { value, open, disabled: contextDisabled } = useComboboxContext()
  const resolvedDisabled = contextDisabled || disabled
  const label = value || placeholder

  return (
    <PopoverTrigger asChild>
      <Button
        variant="outline"
        role="combobox"
        aria-expanded={open}
        disabled={resolvedDisabled}
        className={cn(
          "h-8 w-full justify-between rounded-md border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-700 shadow-sm hover:bg-cir-red/5 hover:border-cir-red/40",
          !value && "text-slate-500",
          className
        )}
        title={searchPlaceholder}
        {...props}
      >
        <span className="truncate">{label}</span>
        <ChevronsUpDown className="size-3.5 shrink-0 text-slate-400" aria-hidden="true" />
      </Button>
    </PopoverTrigger>
  )
}

function ComboboxContent({
  className,
  children,
}: React.ComponentPropsWithoutRef<"div">) {
  const { query, onQueryChange } = useComboboxContext()

  return (
    <PopoverContent className={cn("w-[320px] max-w-[calc(100vw-1.5rem)] p-0", className)}>
      <Command shouldFilter={false}>
        <CommandInput
          value={query}
          onValueChange={onQueryChange}
          placeholder="Rechercher..."
          className="h-9"
        />
        {children}
      </Command>
    </PopoverContent>
  )
}

function ComboboxEmpty({ children }: { children: React.ReactNode }) {
  return <CommandEmpty>{children}</CommandEmpty>
}

function ComboboxList({
  children,
}: {
  children: (item: string) => React.ReactNode
}) {
  const { filteredItems } = useComboboxContext()

  return (
    <CommandList>
      <CommandGroup>
        {filteredItems.map((item) => children(item))}
      </CommandGroup>
    </CommandList>
  )
}

type ComboboxItemProps = {
  value: string
  children: React.ReactNode
  className?: string
}

function ComboboxItem({ value, children, className }: ComboboxItemProps) {
  const { value: selectedValue, onValueChange, onOpenChange } = useComboboxContext()
  const isSelected = selectedValue === value

  return (
    <CommandItem
      value={value}
      onSelect={() => {
        onValueChange(value)
        onOpenChange(false)
      }}
      className={cn("text-sm", className)}
    >
      <span className="flex-1">{children}</span>
      <Check
        className={cn(
          "size-4 text-cir-red transition-opacity",
          isSelected ? "opacity-100" : "opacity-0"
        )}
        aria-hidden="true"
      />
    </CommandItem>
  )
}

export {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
}
