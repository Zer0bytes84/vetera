"use client";

import { AlertDialog as AlertDialogPrimitive } from "@base-ui/react/alert-dialog";
import { CircleHelp } from "lucide-react";
import type * as React from "react";
import { cloneElement, isValidElement, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  firstPanelField,
  flattenChildren,
  ModalBandActions,
  ModalChrome,
  ModalCloseIcon,
  markModalSlot,
  modalSlotOf,
  splitFooter,
  useInModalChrome,
} from "@/components/ui/modal-chrome";
import { cn } from "@/lib/utils";

function AlertDialog({ ...props }: AlertDialogPrimitive.Root.Props) {
  return <AlertDialogPrimitive.Root data-slot="alert-dialog" {...props} />;
}

function AlertDialogTrigger({ ...props }: AlertDialogPrimitive.Trigger.Props) {
  return (
    <AlertDialogPrimitive.Trigger data-slot="alert-dialog-trigger" {...props} />
  );
}

function AlertDialogPortal({ ...props }: AlertDialogPrimitive.Portal.Props) {
  return (
    <AlertDialogPrimitive.Portal data-slot="alert-dialog-portal" {...props} />
  );
}

function AlertDialogOverlay({
  className,
  ...props
}: AlertDialogPrimitive.Backdrop.Props) {
  return (
    <AlertDialogPrimitive.Backdrop
      className={cn(
        "modal-backdrop data-open:fade-in-0 data-closed:fade-out-0 fixed inset-0 isolate z-50 duration-[140ms] ease-[var(--ease-out)] data-closed:animate-out data-open:animate-in",
        className
      )}
      data-slot="alert-dialog-overlay"
      {...props}
    />
  );
}

function AlertDialogContent({
  className,
  children,
  forceBackdrop = false,
  initialFocus,
  size = "default",
  ...props
}: AlertDialogPrimitive.Popup.Props & {
  /** Assombrit aussi le fond quand la fenêtre s'ouvre dans une autre (panneau latéral). */
  forceBackdrop?: boolean;
  size?: "default" | "sm";
}) {
  const panel = useRef<HTMLDivElement>(null);
  // L'en-tête (icône, titre) va dans la bande, l'explication dans le panneau, les boutons en pilules dans la bande.
  const parts = flattenChildren(children);
  const headers = parts.filter((child) => modalSlotOf(child) === "header");
  const chrome = headers.length > 0;
  const band: React.ReactNode[] = [];
  const explanation: React.ReactNode[] = [];
  for (const header of headers) {
    if (!isValidElement<React.ComponentProps<"div">>(header)) continue;
    const inner = flattenChildren(header.props.children);
    explanation.push(
      ...inner.filter(
        (child) =>
          isValidElement(child) && child.type === AlertDialogDescription
      )
    );
    const heading = inner.filter(
      (child) =>
        !(isValidElement(child) && child.type === AlertDialogDescription)
    );
    // Sans illustration fournie, la question porte la même tuile que les autres en-têtes.
    const hasMedia = heading.some(
      (child) => isValidElement(child) && child.type === AlertDialogMedia
    );
    band.push(
      cloneElement(
        header,
        undefined,
        ...(hasMedia
          ? heading
          : [
              <span aria-hidden="true" data-slot="modal-icon" key="modal-icon">
                <CircleHelp />
              </span>,
              ...heading,
            ])
      )
    );
  }
  return (
    <AlertDialogPortal>
      <AlertDialogOverlay forceRender={forceBackdrop} />
      <AlertDialogPrimitive.Popup
        className={cn(
          "group/alert-dialog-content data-open:fade-in-0 data-open:zoom-in-95 data-closed:fade-out-0 data-closed:zoom-out-95 fixed start-1/2 top-1/2 z-50 grid w-full -translate-x-1/2 -translate-y-1/2 gap-4 rounded-xl bg-popover p-4 text-popover-foreground outline-none ring-1 ring-foreground/10 duration-[220ms] ease-[var(--ease-out)] data-[size=default]:max-w-xs data-[size=sm]:max-w-xs data-closed:animate-out data-open:animate-in data-[size=default]:sm:max-w-sm rtl:translate-x-1/2",
          chrome &&
            "data-[size=default]:max-w-[calc(100%-2rem)] data-[size=default]:sm:max-w-[440px]",
          className
        )}
        data-chrome={chrome ? "" : undefined}
        data-size={size}
        data-slot="alert-dialog-content"
        initialFocus={
          initialFocus ??
          (chrome ? () => firstPanelField(panel.current) ?? true : undefined)
        }
        {...props}
      >
        {chrome ? (
          <ModalChrome
            close={
              <AlertDialogPrimitive.Close
                aria-label="Fermer"
                data-slot="modal-close"
              >
                <ModalCloseIcon />
              </AlertDialogPrimitive.Close>
            }
            header={band}
            panelRef={panel}
          >
            {explanation}
            {parts.filter((child) => modalSlotOf(child) !== "header")}
          </ModalChrome>
        ) : (
          children
        )}
      </AlertDialogPrimitive.Popup>
    </AlertDialogPortal>
  );
}

function AlertDialogHeader({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "grid grid-rows-[auto_1fr] place-items-center gap-1.5 text-center has-data-[slot=alert-dialog-media]:grid-rows-[auto_auto_1fr] has-data-[slot=alert-dialog-media]:gap-x-4 sm:group-data-[size=default]/alert-dialog-content:place-items-start sm:group-data-[size=default]/alert-dialog-content:text-start sm:group-data-[size=default]/alert-dialog-content:has-data-[slot=alert-dialog-media]:grid-rows-[auto_1fr]",
        className
      )}
      data-slot="alert-dialog-header"
      {...props}
    />
  );
}
markModalSlot(AlertDialogHeader, "header");

function AlertDialogFooter({
  className,
  children,
  ...props
}: React.ComponentProps<"div">) {
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
        <ModalBandActions>{actions}</ModalBandActions>
      </>
    );
  }
  return (
    <div
      className={cn(
        "-mx-4 -mb-4 flex flex-col-reverse gap-2 rounded-b-xl border-t bg-muted/50 p-4 group-data-[size=sm]/alert-dialog-content:grid group-data-[size=sm]/alert-dialog-content:grid-cols-2 sm:flex-row sm:justify-end",
        className
      )}
      data-slot="alert-dialog-footer"
      {...props}
    >
      {children}
    </div>
  );
}
markModalSlot(AlertDialogFooter, "footer");

function AlertDialogMedia({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "mb-2 inline-flex size-10 items-center justify-center rounded-md bg-muted sm:group-data-[size=default]/alert-dialog-content:row-span-2 *:[svg:not([class*='size-'])]:size-6",
        className
      )}
      data-slot="alert-dialog-media"
      {...props}
    />
  );
}

function AlertDialogTitle({
  className,
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Title>) {
  return (
    <AlertDialogPrimitive.Title
      className={cn(
        "t-24 font-heading font-medium sm:group-data-[size=default]/alert-dialog-content:group-has-data-[slot=alert-dialog-media]/alert-dialog-content:col-start-2",
        className
      )}
      data-slot="alert-dialog-title"
      {...props}
    />
  );
}

function AlertDialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Description>) {
  return (
    <AlertDialogPrimitive.Description
      className={cn(
        "text-balance text-muted-foreground text-sm md:text-pretty *:[a]:underline *:[a]:underline-offset-3 *:[a]:hover:text-foreground",
        className
      )}
      data-slot="alert-dialog-description"
      {...props}
    />
  );
}

function AlertDialogAction({
  className,
  ...props
}: React.ComponentProps<typeof Button>) {
  return (
    <Button
      className={cn(className)}
      data-slot="alert-dialog-action"
      {...props}
    />
  );
}

function AlertDialogCancel({
  className,
  variant = "outline",
  size = "default",
  ...props
}: AlertDialogPrimitive.Close.Props &
  Pick<React.ComponentProps<typeof Button>, "variant" | "size">) {
  return (
    <AlertDialogPrimitive.Close
      className={cn(className)}
      data-slot="alert-dialog-cancel"
      render={<Button size={size} variant={variant} />}
      {...props}
    />
  );
}

export {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogOverlay,
  AlertDialogPortal,
  AlertDialogTitle,
  AlertDialogTrigger,
};
