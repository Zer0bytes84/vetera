import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const messageVariants = cva(
  "group/message flex w-full min-w-0 items-start gap-3 text-sm",
  {
    variants: {
      align: {
        start: "justify-start",
        end: "flex-row-reverse justify-start",
      },
    },
    defaultVariants: {
      align: "start",
    },
  }
);

function Message({
  align = "start",
  className,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof messageVariants>) {
  return (
    <div
      data-slot="message"
      data-align={align}
      className={cn(messageVariants({ align }), className)}
      {...props}
    />
  );
}

function MessageAvatar({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="message-avatar"
      className={cn("size-8 shrink-0", className)}
      {...props}
    />
  );
}

function MessageContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="message-content"
      className={cn(
        "flex min-w-0 max-w-[min(90%,48rem)] flex-col gap-1",
        className
      )}
      {...props}
    />
  );
}

function MessageFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="message-footer"
      className={cn(
        "flex items-center gap-2 px-1 text-[11px] text-muted-foreground/60",
        className
      )}
      {...props}
    />
  );
}

export { Message, MessageAvatar, MessageContent, MessageFooter };
