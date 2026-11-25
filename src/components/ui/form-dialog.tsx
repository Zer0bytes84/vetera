import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps, ReactNode } from "react";
import { markFocusesClose, markModalSlot } from "@/components/ui/modal-chrome";
import { cn } from "@/lib/utils";
import {
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const formDialogContentVariants = cva(
  "modal-medical-shell grid max-h-[calc(100dvh-2rem)] grid-rows-[auto_minmax(0,1fr)_auto] gap-0 overflow-hidden p-0 sm:max-h-[calc(100dvh-3rem)]",
  {
    variants: {
      size: {
        sm: "max-w-[min(520px,calc(100%-2rem))] sm:max-w-[min(520px,calc(100%-2rem))]",
        md: "max-w-[min(720px,calc(100%-2rem))] sm:max-w-[min(720px,calc(100%-2rem))]",
        lg: "max-w-[min(940px,calc(100%-2rem))] sm:max-w-[min(940px,calc(100%-2rem))]",
        xl: "max-w-[min(1040px,calc(100%-2rem))] sm:max-w-[min(1040px,calc(100%-2rem))]",
      },
    },
    defaultVariants: {
      size: "md",
    },
  }
);

type FormDialogContentProps = ComponentProps<typeof DialogContent> &
  VariantProps<typeof formDialogContentVariants>;

function FormDialogContent({
  className,
  size,
  ...props
}: FormDialogContentProps) {
  return (
    <DialogContent
      className={cn(formDialogContentVariants({ size }), className)}
      {...props}
    />
  );
}

type FormDialogHeaderProps = Omit<
  ComponentProps<typeof DialogHeader>,
  "title"
> & {
  title: ReactNode;
  description?: ReactNode;
  icon: ReactNode;
  aside?: ReactNode;
};

/** L'en-tête homogène des fenêtres : tuile d'icône, titre, sous-titre, dans la première bande. */
function FormDialogHeader({
  aside,
  className,
  description,
  icon,
  title,
  ...props
}: FormDialogHeaderProps) {
  return (
    <DialogHeader
      className={cn("modal-medical-header", className)}
      icon={icon}
      {...props}
    >
      <DialogTitle>{title}</DialogTitle>
      <DialogDescription
        className={cn("text-pretty", !description && "sr-only")}
      >
        {description}
      </DialogDescription>
      {aside ? <div className="modal-form-heading-aside">{aside}</div> : null}
    </DialogHeader>
  );
}
markModalSlot(FormDialogHeader, "header");
// Sa bannière portait la croix avant le contenu : la croix recevait le focus à l'ouverture.
markFocusesClose(FormDialogHeader);

function FormDialogBody({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "modal-medical-body modal-form-fields min-h-0 min-w-0 overflow-x-hidden overflow-y-auto overscroll-contain p-5 sm:p-8",
        className
      )}
      {...props}
    />
  );
}

function FormDialogFooter({
  className,
  ...props
}: ComponentProps<typeof DialogFooter>) {
  return (
    <DialogFooter
      className={cn(
        "modal-medical-footer !mx-0 !mb-0 shrink-0 gap-3 px-6 py-5 sm:items-center sm:px-8",
        className
      )}
      {...props}
    />
  );
}
markModalSlot(FormDialogFooter, "footer");

export {
  FormDialogBody,
  FormDialogContent,
  FormDialogFooter,
  FormDialogHeader,
};
