import {
  CheckListIcon,
  CheckmarkCircle02Icon,
  Heading01Icon,
  Heading02Icon,
  MagicWand01Icon,
  SparklesIcon,
  TextBoldIcon,
  TextItalicIcon,
  TextStrikethroughIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type { Editor } from "@tiptap/react";
import type React from "react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";

interface SelectionBubbleMenuProps {
  editor: Editor;
  onAiAction: (action: string) => void;
}

const SelectionBubbleMenu: React.FC<SelectionBubbleMenuProps> = ({
  editor,
  onAiAction,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const menuRef = useRef<HTMLDivElement>(null);

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
  ];

  useEffect(() => {
    const updateMenu = () => {
      const { selection } = editor.state;
      const { from, to } = selection;

      if (from === to) {
        setIsVisible(false);
        return;
      }

      const { view } = editor;
      const start = view.coordsAtPos(from);
      const end = view.coordsAtPos(to);

      const menuWidth = 340;
      const menuHeight = 50;

      let left = (start.left + end.left) / 2 - menuWidth / 2;
      left = Math.max(10, Math.min(left, window.innerWidth - menuWidth - 10));

      let top = start.top - menuHeight - 10;
      if (top < 10) {
        top = end.bottom + 10;
      }

      setPosition({ top, left });
      setIsVisible(true);
    };

    editor.on("selectionUpdate", updateMenu);
    return () => {
      editor.off("selectionUpdate", updateMenu);
    };
  }, [editor]);

  const handleAiAction = (action: string) => {
    setIsVisible(false);
    onAiAction(action);
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div
      className="fixed z-50 flex items-center gap-0.5 rounded-xl border border-border bg-popover p-1.5 shadow-xl backdrop-blur-md"
      ref={menuRef}
      style={{ top: position.top, left: position.left }}
    >
      <Button
        onClick={() => editor.chain().focus().toggleBold().run()}
        size="icon-sm"
        title="Gras"
        type="button"
        variant={editor.isActive("bold") ? "default" : "ghost"}
      >
        <HugeiconsIcon
          className="size-4"
          icon={TextBoldIcon}
          strokeWidth={1.5}
        />
      </Button>

      <Button
        onClick={() => editor.chain().focus().toggleItalic().run()}
        size="icon-sm"
        title="Italique"
        type="button"
        variant={editor.isActive("italic") ? "default" : "ghost"}
      >
        <HugeiconsIcon
          className="size-4"
          icon={TextItalicIcon}
          strokeWidth={1.5}
        />
      </Button>

      <Button
        onClick={() => editor.chain().focus().toggleStrike().run()}
        size="icon-sm"
        title="Barré"
        type="button"
        variant={editor.isActive("strike") ? "default" : "ghost"}
      >
        <HugeiconsIcon
          className="size-4"
          icon={TextStrikethroughIcon}
          strokeWidth={1.5}
        />
      </Button>

      <Separator className="mx-1 h-6" orientation="vertical" />

      <Button
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        size="icon-sm"
        title="Titre 1"
        type="button"
        variant={editor.isActive("heading", { level: 1 }) ? "default" : "ghost"}
      >
        <HugeiconsIcon
          className="size-4"
          icon={Heading01Icon}
          strokeWidth={1.5}
        />
      </Button>

      <Button
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        size="icon-sm"
        title="Titre 2"
        type="button"
        variant={editor.isActive("heading", { level: 2 }) ? "default" : "ghost"}
      >
        <HugeiconsIcon
          className="size-4"
          icon={Heading02Icon}
          strokeWidth={1.5}
        />
      </Button>

      <Separator className="mx-1 h-6" orientation="vertical" />

      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button size="icon-sm" title="IA" variant="secondary">
              <HugeiconsIcon
                className="size-4 text-primary"
                icon={SparklesIcon}
                strokeWidth={1.5}
              />
            </Button>
          }
        />
        <DropdownMenuContent align="start">
          {aiActions.map((item) => (
            <DropdownMenuItem
              key={item.label}
              onClick={() => handleAiAction(item.action)}
            >
              <HugeiconsIcon
                className="size-4 text-primary"
                icon={item.icon}
                strokeWidth={1.5}
              />
              {item.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

export default SelectionBubbleMenu;
