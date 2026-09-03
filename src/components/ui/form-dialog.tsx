import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps, ReactNode } from "react";
import {
  ModalBanner,
  type ModalArtwork,
  type ModalBannerTone,
} from "@/components/ui/modal-banner";
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
  artwork?: ModalArtwork;
  icon: ReactNode;
  companionIcon?: ReactNode;
  compact?: boolean;
  aside?: ReactNode;
  tone?: ModalBannerTone | null;
};

function FormDialogHeader({
  artwork,
  aside,
  className,
  companionIcon,
  compact = false,
  description,
  icon,
  title,
  tone,
  ...props
}: FormDialogHeaderProps) {
  return (
    <DialogHeader
      className={cn("modal-medical-header shrink-0 gap-0", className)}
      {...props}
    >
      <ModalBanner
        artwork={artwork}
        className={compact ? "modal-banner-compact" : undefined}
        companionIcon={companionIcon}
        icon={icon}
        tone={tone}
      >
        <div className="modal-form-heading">
          <DialogTitle>
            {title}
          </DialogTitle>
          <DialogDescription
            className={cn(
              "text-pretty",
              !description && "sr-only"
            )}
          >
            {description}
          </DialogDescription>
          {aside ? (
            <div className="modal-form-heading-aside">{aside}</div>
          ) : null}
        </div>
      </ModalBanner>
    </DialogHeader>
  );
}

function FormDialogBody({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "modal-medical-body modal-form-fields min-h-0 overflow-y-auto p-6 sm:p-8",
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

export {
  FormDialogBody,
  FormDialogContent,
  FormDialogFooter,
  FormDialogHeader,
};
