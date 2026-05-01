import React, { useState, useEffect, useRef } from "react"
import { Editor } from "@tiptap/react"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  TextBoldIcon,
  TextItalicIcon,
  TextStrikethroughIcon,
  Heading01Icon,
  Heading02Icon,
  SparklesIcon,
  CheckmarkCircle02Icon,
  MagicWand01Icon,
  CheckListIcon,
} from "@hugeicons/core-free-icons"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Separator } from "@/components/ui/separator"

interface SelectionBubbleMenuProps {
  editor: Editor
  onAiAction: (action: string) => void
}

const SelectionBubbleMenu: React.FC<SelectionBubbleMenuProps> = ({
  editor,
  onAiAction,
}) => {
  const [isVisible, setIsVisible] = useState(false)
  const [position, setPosition] = useState({ top: 0, left: 0 })
  const menuRef = useRef<HTMLDivElement>(null)

  const aiActions = [
    {
      label: "Corriger",
      action: "Corrige l'orthographe et la grammaire",
      icon: CheckmarkCircle02Icon,
    },
    {
      label: "Reformuler",
      action: "Reformule de manière professionnelle",
      icon: MagicWand01Icon,
    },
    { label: "Résumer", action: "Résume en points clés", icon: CheckListIcon },
  ]

  useEffect(() => {
    const updateMenu = () => {
      const { selection } = editor.state
      const { from, to } = selection

      if (from === to) {
        setIsVisible(false)
        return
      }

      const { view } = editor
      const start = view.coordsAtPos(from)
      const end = view.coordsAtPos(to)

      const menuWidth = 340
      const menuHeight = 50

      let left = (start.left + end.left) / 2 - menuWidth / 2
      left = Math.max(10, Math.min(left, window.innerWidth - menuWidth - 10))

      let top = start.top - menuHeight - 10
      if (top < 10) {
        top = end.bottom + 10
      }

      setPosition({ top, left })
      setIsVisible(true)
    }

    editor.on("selectionUpdate", updateMenu)
    return () => {
      editor.off("selectionUpdate", updateMenu)
    }
  }, [editor])

  const handleAiAction = (action: string) => {
    setIsVisible(false)
    onAiAction(action)
  }

  if (!isVisible) return null

  return (
    <div
      ref={menuRef}
      className="fixed z-50 flex items-center gap-0.5 rounded-xl border border-border bg-popover p-1.5 shadow-xl backdrop-blur-md"
      style={{ top: position.top, left: position.left }}
    >
      <Button
        type="button"
        variant={editor.isActive("bold") ? "default" : "ghost"}
        size="icon-sm"
        onClick={() => editor.chain().focus().toggleBold().run()}
        title="Gras"
      >
        <HugeiconsIcon icon={TextBoldIcon} strokeWidth={1.5} className="size-4" />
      </Button>

      <Button
        type="button"
        variant={editor.isActive("italic") ? "default" : "ghost"}
        size="icon-sm"
        onClick={() => editor.chain().focus().toggleItalic().run()}
        title="Italique"
      >
        <HugeiconsIcon
          icon={TextItalicIcon}
          strokeWidth={1.5}
          className="size-4"
        />
      </Button>

      <Button
        type="button"
        variant={editor.isActive("strike") ? "default" : "ghost"}
        size="icon-sm"
        onClick={() => editor.chain().focus().toggleStrike().run()}
        title="Barré"
      >
        <HugeiconsIcon
          icon={TextStrikethroughIcon}
          strokeWidth={1.5}
          className="size-4"
        />
      </Button>

      <Separator orientation="vertical" className="mx-1 h-6" />

      <Button
        type="button"
        variant={editor.isActive("heading", { level: 1 }) ? "default" : "ghost"}
        size="icon-sm"
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        title="Titre 1"
      >
        <HugeiconsIcon
          icon={Heading01Icon}
          strokeWidth={1.5}
          className="size-4"
        />
      </Button>

      <Button
        type="button"
        variant={editor.isActive("heading", { level: 2 }) ? "default" : "ghost"}
        size="icon-sm"
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        title="Titre 2"
      >
        <HugeiconsIcon
          icon={Heading02Icon}
          strokeWidth={1.5}
          className="size-4"
        />
      </Button>

      <Separator orientation="vertical" className="mx-1 h-6" />

      <DropdownMenu>
        <DropdownMenuTrigger
          render={(
            <Button variant="secondary" size="icon-sm" title="IA">
              <HugeiconsIcon
                icon={SparklesIcon}
                strokeWidth={1.5}
                className="size-4 text-primary"
              />
            </Button>
          )}
        />
        <DropdownMenuContent align="start">
          {aiActions.map((item) => (
            <DropdownMenuItem
              key={item.label}
              onClick={() => handleAiAction(item.action)}
            >
              <HugeiconsIcon
                icon={item.icon}
                strokeWidth={1.5}
                className="size-4 text-primary"
              />
              {item.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

export default SelectionBubbleMenu
