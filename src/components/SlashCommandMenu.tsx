import React, {
  useState,
  useEffect,
  forwardRef,
  useImperativeHandle,
} from "react"
import { cn } from "@/lib/utils"
import { SlashCommandItem } from "./SlashCommandsExtension"

interface SlashCommandMenuProps {
  items: SlashCommandItem[]
  command: (item: SlashCommandItem) => void
}

const SlashCommandMenu = forwardRef<any, SlashCommandMenuProps>(
  ({ items, command }, ref) => {
    const [selectedIndex, setSelectedIndex] = useState(0)

    const selectItem = (index: number) => {
      const item = items[index]
      if (item) {
        command(item)
      }
    }

    const upHandler = () => {
      setSelectedIndex((selectedIndex + items.length - 1) % items.length)
    }

    const downHandler = () => {
      setSelectedIndex((selectedIndex + 1) % items.length)
    }

    const enterHandler = () => {
      selectItem(selectedIndex)
    }

    useEffect(() => {
      setSelectedIndex(0)
    }, [items])

    useImperativeHandle(ref, () => ({
      onKeyDown: ({ event }: { event: KeyboardEvent }) => {
        if (event.key === "ArrowUp") {
          upHandler()
          return true
        }
        if (event.key === "ArrowDown") {
          downHandler()
          return true
        }
        if (event.key === "Enter") {
          enterHandler()
          return true
        }
        return false
      },
    }))

    if (items.length === 0) {
      return (
        <div className="min-w-[280px] rounded-lg border border-border bg-popover p-3 shadow-md">
          <p className="text-sm text-muted-foreground">
            Aucune commande trouvée
          </p>
        </div>
      )
    }

    const formatItems = items.filter((item) => item.group === "format")
    const aiItems = items.filter((item) => item.group === "ai")
    const ungroupedItems = items.filter((item) => !item.group)

    const renderItem = (item: SlashCommandItem, globalIndex: number) => (
      <button
        key={item.title}
        onClick={() => selectItem(globalIndex)}
        className={cn(
          "flex w-full items-center gap-3 rounded-md px-2 py-1.5 text-left transition-colors",
          globalIndex === selectedIndex
            ? "bg-accent text-accent-foreground"
            : "text-foreground hover:bg-accent/50"
        )}
      >
        <span className="flex size-7 shrink-0 items-center justify-center rounded-md border border-border bg-background text-base">
          {item.icon}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{item.title}</p>
          <p className="truncate text-xs text-muted-foreground">
            {item.description}
          </p>
        </div>
      </button>
    )

    const getGlobalIndex = (item: SlashCommandItem) =>
      items.findIndex((i) => i.title === item.title)

    const hasGroups = formatItems.length > 0 || aiItems.length > 0

    return (
      <div className="max-h-[320px] min-w-[280px] overflow-hidden overflow-y-auto rounded-lg border border-border bg-popover shadow-md">
        <div className="flex flex-col gap-0.5 p-1">
          {hasGroups ? (
            <>
              {formatItems.length > 0 && (
                <div>
                  <p className="px-2 pt-1.5 pb-1 text-xs font-medium text-muted-foreground">
                    Formatage
                  </p>
                  <div className="flex flex-col gap-0.5">
                    {formatItems.map((item) =>
                      renderItem(item, getGlobalIndex(item))
                    )}
                  </div>
                </div>
              )}
              {aiItems.length > 0 && (
                <div>
                  {formatItems.length > 0 && (
                    <div className="mx-2 my-1 border-t border-border" />
                  )}
                  <p className="px-2 pt-1.5 pb-1 text-xs font-medium text-muted-foreground">
                    Assistant
                  </p>
                  <div className="flex flex-col gap-0.5">
                    {aiItems.map((item) =>
                      renderItem(item, getGlobalIndex(item))
                    )}
                  </div>
                </div>
              )}
              {ungroupedItems.length > 0 && (
                <div className="flex flex-col gap-0.5">
                  {ungroupedItems.map((item) =>
                    renderItem(item, getGlobalIndex(item))
                  )}
                </div>
              )}
            </>
          ) : (
            items.map((item, index) => renderItem(item, index))
          )}
        </div>
      </div>
    )
  }
)

SlashCommandMenu.displayName = "SlashCommandMenu"

export default SlashCommandMenu
