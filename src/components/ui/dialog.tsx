import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import type * as React from "react";
import { useRef } from "react";
import {
  firstPanelField,
  flattenChildren,
  headerFocusesClose,
  markModalSlot,
  ModalBandActions,
  ModalChrome,
  ModalCloseIcon,
  modalSlotOf,
  splitFooter,
  useInModalChrome,
} from "@/components/ui/modal-chrome";
import { Button } from "@/components/ui/button";
import { XIcon } from "@/lib/icons";
import { cn } from "@/lib/utils";

function Dialog({ ...props }: DialogPrimitive.Root.Props) {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />;
}

function DialogTrigger({ ...props }: DialogPrimitive.Trigger.Props) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />;
}

function DialogPortal({ ...props }: DialogPrimitive.Portal.Props) {
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />;
}

function DialogClose({ ...props }: DialogPrimitive.Close.Props) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />;
}

function DialogOverlay({
  className,
  ...props
}: DialogPrimitive.Backdrop.Props) {
  return (
    <DialogPrimitive.Backdrop
      className={cn(
        "modal-backdrop data-open:fade-in-0 data-closed:fade-out-0 fixed inset-0 isolate z-50 duration-[180ms] ease-[var(--ease-out)] data-closed:animate-out data-open:animate-in",
        className
      )}
      data-slot="dialog-overlay"
      {...props}
    />
  );
}

function DialogContent({
  className,
  children,
  focusClose = false,
  forceBackdrop = false,
  initialFocus,
  overlayClassName,
  showCloseButton = false,
  ...props
}: DialogPrimitive.Popup.Props & {
  /** La croix reçoit le focus à l'ouverture, comme le faisait la croix d'origine, première de la fenêtre. */
  focusClose?: boolean;
  /** Assombrit aussi le fond quand la fenêtre s'ouvre dans une autre (panneau latéral). */
  forceBackdrop?: boolean;
  overlayClassName?: string;
  /** Sans en-tête rangé dans la bande (fenêtre libre), ajoute une croix de fermeture. */
  showCloseButton?: boolean;
}) {
  const panel = useRef<HTMLDivElement>(null);
  // Une fenêtre dont l'en-tête est un DialogHeader suit la charte : bande, actions en pilules, panneau qui défile.
  const parts = flattenChildren(children);
  const header = parts.filter((child) => modalSlotOf(child) === "header");
  const chrome = header.length > 0;
  const close = useRef<HTMLButtonElement>(null);
  const focusesClose = focusClose || headerFocusesClose(header);
  return (
    <DialogPortal>
      <DialogOverlay className={overlayClassName} forceRender={forceBackdrop} />
      <DialogPrimitive.Popup
        className={cn(
          "data-open:fade-in-0 data-closed:fade-out-0 fixed start-1/2 top-1/2 z-50 grid w-full max-w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 gap-4 rounded-2xl border border-foreground/10 bg-popover p-5 text-popover-foreground text-sm shadow-[0_24px_80px_-32px_rgba(0,0,0,0.45)] outline-none duration-[220ms] ease-[var(--ease-out)] data-closed:animate-out data-open:animate-in sm:max-w-sm sm:p-6 rtl:translate-x-1/2 dark:border-white/10 dark:shadow-[0_28px_90px_-36px_rgba(0,0,0,0.75)]",
          className
        )}
        data-chrome={chrome ? "" : undefined}
        data-slot="dialog-content"
        initialFocus={initialFocus ?? (chrome ? () => (focusesClose ? close.current : firstPanelField(panel.current)) ?? true : undefined)}
        {...props}
      >
        {chrome ? (
          <ModalChrome
            close={
              <DialogPrimitive.Close aria-label="Fermer" data-slot="modal-close" ref={close}>
                <ModalCloseIcon />
              </DialogPrimitive.Close>
            }
            header={header}
            panelRef={panel}
          >
            {parts.filter((child) => modalSlotOf(child) !== "header")}
          </ModalChrome>
        ) : (
          children
        )}
        {!chrome && showCloseButton && (
          <DialogPrimitive.Close
            data-slot="dialog-close"
            render={
              <Button
                className="absolute end-2 top-2"
                size="icon-sm"
                variant="ghost"
              />
            }
          >
            <XIcon />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Popup>
    </DialogPortal>
  );
}

function DialogHeader({
  className,
  children,
  icon,
  ...props
}: React.ComponentProps<"div"> & {
  /** Tuile d'icône à gauche du titre, comme l'en-tête des cartes. */
  icon?: React.ReactNode;
}) {
  return (
    <div
      className={cn("flex flex-col gap-2", className)}
      data-slot="dialog-header"
      {...props}
    >
      {icon ? (
        <span aria-hidden="true" data-slot="modal-icon">
          {icon}
        </span>
      ) : null}
      {icon ? <div data-slot="modal-heading-text">{children}</div> : children}
    </div>
  );
}
markModalSlot(DialogHeader, "header");

function DialogFooter({
  className,
  showCloseButton = false,
  children,
  ...props
}: React.ComponentProps<"div"> & {
  showCloseButton?: boolean;
}) {
  const inChrome = useInModalChrome();
  if (inChrome) {
    const { actions, meta } = splitFooter(children);
    return (
      <>
        {meta.length ? (
          <div data-slot="modal-footer-meta" {...props}>
            {meta}
          </div>
        ) : null}
        <ModalBandActions>
          {actions}
          {showCloseButton && (
            <DialogPrimitive.Close render={<Button variant="outline" />}>
              Close
            </DialogPrimitive.Close>
          )}
        </ModalBandActions>
      </>
    );
  }
  return (
    <div
      className={cn(
        "-mx-4 -mb-4 flex flex-col-reverse gap-3 rounded-b-2xl border-foreground/8 border-t bg-popover/94 p-4 shadow-[0_-10px_24px_-24px_rgba(0,0,0,0.28)] backdrop-blur-sm sm:flex-row sm:items-center sm:justify-end dark:border-white/8 dark:bg-zinc-950/70",
        className
      )}
      data-slot="dialog-footer"
      {...props}
    >
      {children}
      {showCloseButton && (
        <DialogPrimitive.Close render={<Button variant="outline" />}>
          Close
        </DialogPrimitive.Close>
      )}
    </div>
  );
}
markModalSlot(DialogFooter, "footer");

function DialogTitle({ className, ...props }: DialogPrimitive.Title.Props) {
  return (
    <DialogPrimitive.Title
      className={cn("t-24 font-heading font-medium leading-tight", className)}
      data-slot="dialog-title"
      {...props}
    />
  );
}

function DialogDescription({
  className,
  ...props
}: DialogPrimitive.Description.Props) {
  return (
    <DialogPrimitive.Description
      className={cn(
        "text-muted-foreground text-sm *:[a]:underline *:[a]:underline-offset-3 *:[a]:hover:text-foreground",
        className
      )}
      data-slot="dialog-description"
      {...props}
    />
  );
}

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
};
