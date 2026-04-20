import React, {
  useState,
  useEffect,
  forwardRef,
  useImperativeHandle,
} from "react"
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
        <div className="min-w-[280px] rounded-xl border border-border bg-popover p-3 shadow-xl">
          <p className="text-sm text-muted-foreground">
            Aucune commande trouvée
          </p>
        </div>
      )
    }

    return (
      <div className="max-h-[320px] min-w-[280px] overflow-hidden overflow-y-auto rounded-xl border border-border bg-popover shadow-xl">
        <div className="border-b border-border bg-muted p-2">
          <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            Commandes
          </p>
        </div>
        <div className="p-1">
          {items.map((item, index) => (
            <button
              key={item.title}
              onClick={() => selectItem(index)}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-all ${
                index === selectedIndex
                  ? "bg-muted text-foreground"
                  : "text-foreground hover:bg-muted"
              } `}
            >
              <span
                className={`flex h-8 w-8 items-center justify-center rounded-lg text-xl ${index === selectedIndex ? "bg-muted" : "bg-muted"}`}
              >
                {item.icon}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{item.title}</p>
                <p className="truncate text-xs text-muted-foreground opacity-90">
                  {item.description}
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>
    )
  }
)

SlashCommandMenu.displayName = "SlashCommandMenu"

export default SlashCommandMenu
