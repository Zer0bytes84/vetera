"use client";

import { Command as CommandPrimitive } from "cmdk";
import { CheckIcon, SearchIcon } from "@/lib/icons";
import type * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { InputGroup, InputGroupAddon } from "@/components/ui/input-group";
import { cn } from "@/lib/utils";

function Command({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive>) {
  return (
    <CommandPrimitive
      className={cn(
        "flex size-full flex-col overflow-hidden rounded-xl! bg-popover p-1 text-popover-foreground",
        className
      )}
      data-slot="command"
      {...props}
    />
  );
}

function CommandDialog({
  title = "Command Palette",
  description = "Search for a command to run...",
  children,
  className,
  overlayClassName,
  showCloseButton = false,
  ...props
}: Omit<React.ComponentProps<typeof Dialog>, "children"> & {
  title?: string;
  description?: string;
  className?: string;
  overlayClassName?: string;
  showCloseButton?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Dialog {...props}>
      <DialogHeader className="sr-only">
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>{description}</DialogDescription>
      </DialogHeader>
      <DialogContent
        className={cn(
          "top-1/2 -translate-y-1/2 overflow-hidden rounded-[24px]! border-border/80 bg-popover/88 p-0 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] backdrop-blur-3xl dark:shadow-[0_24px_70px_-24px_rgba(0,0,0,0.75)]",
          className
        )}
        overlayClassName={overlayClassName}
        showCloseButton={showCloseButton}
      >
        {children}
      </DialogContent>
    </Dialog>
  );
}

function CommandInput({
  className,
  endAddon,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Input> & {
  endAddon?: React.ReactNode;
}) {
  return (
    <div className="relative p-2 pb-1" data-slot="command-input-wrapper">
      <InputGroup className="h-12 rounded-xl border border-black/8 bg-black/[0.03] shadow-none transition-all duration-150 ease-out focus-within:border-zinc-900/35 focus-within:bg-white focus-within:shadow-[0_0_0_3px_rgba(25,25,25,0.08)] dark:border-white/10 dark:bg-white/[0.05] dark:focus-within:border-white/35 dark:focus-within:bg-zinc-800/90 dark:focus-within:shadow-[0_0_0_3px_rgba(255,255,255,0.08)] *:data-[slot=input-group-addon]:ps-3.5!">
        <CommandPrimitive.Input
          className={cn(
            "w-full font-medium text-[15px] outline-none border-none bg-transparent placeholder:text-muted-foreground/60 disabled:cursor-not-allowed disabled:opacity-50",
            className
          )}
          data-slot="command-input"
          {...props}
        />
        <InputGroupAddon align="inline-start">
          <SearchIcon className="size-4.5 shrink-0 text-muted-foreground/50 transition-colors group-focus-within/input-group:text-zinc-900 dark:group-focus-within/input-group:text-zinc-100" />
        </InputGroupAddon>
        {endAddon && (
          <InputGroupAddon align="inline-end" className="pe-3">
            {endAddon}
          </InputGroupAddon>
        )}
      </InputGroup>
    </div>
  );
}

function CommandList({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.List>) {
  return (
    <CommandPrimitive.List
      className={cn(
        "no-scrollbar max-h-[350px] scroll-py-1 overflow-y-auto overflow-x-hidden px-1 outline-none",
        className
      )}
      data-slot="command-list"
      {...props}
    />
  );
}

function CommandEmpty({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Empty>) {
  return (
    <CommandPrimitive.Empty
      className={cn("py-12 text-center text-sm", className)}
      data-slot="command-empty"
      {...props}
    />
  );
}

function CommandGroup({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Group>) {
  return (
    <CommandPrimitive.Group
      className={cn(
        "overflow-hidden p-1 text-foreground **:[[cmdk-group-heading]]:px-3 **:[[cmdk-group-heading]]:py-2 **:[[cmdk-group-heading]]:font-semibold **:[[cmdk-group-heading]]:text-muted-foreground/60 **:[[cmdk-group-heading]]:text-xs **:[[cmdk-group-heading]]:uppercase **:[[cmdk-group-heading]]:tracking-wider",
        className
      )}
      data-slot="command-group"
      {...props}
    />
  );
}

function CommandSeparator({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Separator>) {
  return (
    <CommandPrimitive.Separator
      className={cn("-mx-1 my-1 h-px bg-border/40", className)}
      data-slot="command-separator"
      {...props}
    />
  );
}

function CommandItem({
  className,
  children,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Item>) {
  return (
    <CommandPrimitive.Item
      className={cn(
        "group/command-item relative my-0.5 flex cursor-pointer select-none items-center in-data-[slot=dialog-content]:rounded-xl! rounded-xl px-3 py-2.5 text-sm outline-hidden transition-[background-color,color,box-shadow] duration-160 ease-out data-[disabled=true]:pointer-events-none data-selected:bg-accent data-selected:text-accent-foreground data-[disabled=true]:opacity-50 [&_svg:not([class*='size-'])]:size-4 [&_svg]:pointer-events-none [&_svg]:shrink-0 data-selected:*:[svg]:text-foreground",
        className
      )}
      data-slot="command-item"
      {...props}
    >
      {children}
      <CheckIcon className="ms-auto opacity-0 group-has-data-[slot=command-shortcut]/command-item:hidden group-data-[checked=true]/command-item:opacity-100" />
    </CommandPrimitive.Item>
  );
}

function CommandShortcut({
  className,
  ...props
}: React.ComponentProps<"span">) {
  return (
    <span
      className={cn(
        "ms-auto text-muted-foreground text-xs tracking-widest group-data-selected/command-item:text-foreground",
        className
      )}
      data-slot="command-shortcut"
      {...props}
    />
  );
}

export {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
};
