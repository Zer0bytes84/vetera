import { Tabs as TabsPrimitive } from "@base-ui/react/tabs";

import { cn } from "@/lib/utils";

export function Tabs(props: TabsPrimitive.Root.Props) {
  return <TabsPrimitive.Root data-slot="tabs" {...props} />;
}

export function TabsList({ className, ...props }: TabsPrimitive.List.Props) {
  return (
    <TabsPrimitive.List
      className={cn(
        "inline-flex h-10 items-center justify-center rounded-lg border border-[var(--border-color)] bg-[var(--surface-200)] p-1 text-[var(--text-secondary)]",
        className
      )}
      data-slot="tabs-list"
      {...props}
    />
  );
}

export function TabsTrigger({ className, ...props }: TabsPrimitive.Tab.Props) {
  return (
    <TabsPrimitive.Tab
      className={cn(
        "inline-flex items-center justify-center whitespace-nowrap rounded-md px-3.5 py-1.5 font-medium text-sm transition-all disabled:pointer-events-none disabled:opacity-50 data-[selected]:bg-[var(--surface-100)] data-[selected]:text-foreground data-[selected]:shadow-sm",
        className
      )}
      data-slot="tabs-trigger"
      {...props}
    />
  );
}

export function TabsPanel({ className, ...props }: TabsPrimitive.Panel.Props) {
  return (
    <TabsPrimitive.Panel
      className={cn("pt-6", className)}
      data-slot="tabs-panel"
      {...props}
    />
  );
}
