import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps, ReactNode } from "react";
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

const formDialogIconVariants = cva(
  "flex size-[50px] shrink-0 items-center justify-center rounded-[15px] border shadow-[inset_0_1px_0_rgb(255_255_255_/_0.78),0_10px_24px_-18px_currentColor] [&_svg]:size-6",
  {
    variants: {
      tone: {
        teal: "border-teal-300/35 bg-[linear-gradient(135deg,#d8f7eb,#e0efff_56%,#f2e4ff)] text-teal-700 dark:border-teal-300/20 dark:bg-[linear-gradient(135deg,rgb(20_184_166_/_0.24),rgb(59_130_246_/_0.22)_56%,rgb(168_85_247_/_0.22))] dark:text-teal-200",
        sky: "border-sky-300/35 bg-[linear-gradient(135deg,#dff7ff,#e5edff_56%,#f1e6ff)] text-sky-700 dark:border-sky-300/20 dark:bg-[linear-gradient(135deg,rgb(56_189_248_/_0.22),rgb(99_102_241_/_0.2)_56%,rgb(168_85_247_/_0.2))] dark:text-sky-200",
        amber: "border-orange-300/35 bg-[linear-gradient(135deg,#fff0d8,#ffe4e8_56%,#eee5ff)] text-orange-800 dark:border-orange-300/20 dark:bg-[linear-gradient(135deg,rgb(251_146_60_/_0.2),rgb(244_114_182_/_0.18)_56%,rgb(139_92_246_/_0.2))] dark:text-orange-200",
        violet: "border-violet-300/35 bg-[linear-gradient(135deg,#f3e8ff,#e7e9ff_56%,#dff7ff)] text-violet-700 dark:border-violet-300/20 dark:bg-[linear-gradient(135deg,rgb(168_85_247_/_0.22),rgb(99_102_241_/_0.2)_56%,rgb(56_189_248_/_0.18))] dark:text-violet-200",
        rose: "border-rose-300/35 bg-[linear-gradient(135deg,#ffe4ec,#fff0d8_56%,#f3e8ff)] text-rose-700 dark:border-rose-300/20 dark:bg-[linear-gradient(135deg,rgb(244_63_94_/_0.2),rgb(251_146_60_/_0.18)_56%,rgb(168_85_247_/_0.2))] dark:text-rose-200",
      },
    },
    defaultVariants: {
      tone: "teal",
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
  description: ReactNode;
  icon: ReactNode;
  aside?: ReactNode;
  tone?: VariantProps<typeof formDialogIconVariants>["tone"];
};

function FormDialogHeader({
  aside,
  className,
  description,
  icon,
  title,
  tone,
  ...props
}: FormDialogHeaderProps) {
  return (
    <DialogHeader
      className={cn(
        "modal-medical-header shrink-0 border-b px-6 py-5 sm:px-8",
        className
      )}
      {...props}
    >
      <div className="flex items-start justify-between gap-6 pr-7">
        <div className="flex min-w-0 items-start gap-4">
          <span aria-hidden="true" className={formDialogIconVariants({ tone })}>
            {icon}
          </span>
          <div className="min-w-0 flex-1">
            <DialogTitle className="text-2xl tracking-[-0.03em]">
              {title}
            </DialogTitle>
            <DialogDescription className="mt-1 max-w-2xl leading-5">
              {description}
            </DialogDescription>
          </div>
        </div>
        {aside ? <div className="hidden shrink-0 sm:block">{aside}</div> : null}
      </div>
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
