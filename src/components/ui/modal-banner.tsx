import { XIcon } from "lucide-react";
import type { CSSProperties, ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { DialogClose } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type ModalBannerTone = "teal" | "sky" | "amber" | "violet" | "rose";

// Stable compositions keep each workflow recognizable across openings/themes.
const botanicalScenes = {
  patient: "chiens",
  "patient-record": "lilas",
  "patient-created": "chiens",
  "patient-picker": "lilas",
  appointment: "oiseaux",
  consultation: "sauge",
  product: "lapins",
  restock: "lapins",
  invoice: "lilas",
  "invoice-detail": "lilas",
  payment: "sauge",
  transaction: "sauge",
  billing: "lilas",
  team: "chiens",
  credentials: "oiseaux",
  weight: "lapins",
  vaccination: "chiens",
  hospitalization: "sauge",
  vitals: "sauge",
  anesthesia: "lapins",
  monitoring: "lapins",
  medication: "oiseaux",
  prescription: "sauge",
  assistant: "lilas",
  automation: "oiseaux",
} as const;

type ModalArtwork = keyof typeof botanicalScenes;

const artworkDefaultTones: Record<ModalArtwork, ModalBannerTone> = {
  patient: "teal",
  "patient-record": "teal",
  "patient-created": "teal",
  "patient-picker": "teal",
  consultation: "teal",
  vaccination: "teal",
  weight: "teal",
  appointment: "sky",
  product: "amber",
  restock: "amber",
  payment: "amber",
  transaction: "amber",
  billing: "amber",
  invoice: "violet",
  "invoice-detail": "violet",
  team: "violet",
  credentials: "violet",
  hospitalization: "violet",
  anesthesia: "violet",
  monitoring: "violet",
  medication: "violet",
  prescription: "violet",
  assistant: "violet",
  automation: "teal",
  vitals: "rose",
};

interface ModalBannerProps {
  artwork?: ModalArtwork;
  children?: ReactNode;
  className?: string;
  companionIcon?: ReactNode;
  icon: ReactNode;
  tone?: ModalBannerTone | null;
}

/** A single light field brings the identity, title and close control together. */
function ModalBanner({
  artwork = "patient",
  children,
  className,
  companionIcon,
  icon,
  tone,
}: ModalBannerProps) {
  const { t } = useTranslation();
  const botanicalScene = botanicalScenes[artwork];
  const resolvedTone = tone ?? artworkDefaultTones[artwork] ?? "teal";

  return (
    <div
      className={cn("modal-banner modal-banner-illustrated", className)}
      data-slot="modal-banner"
      data-artwork={artwork}
      data-tone={resolvedTone}
      style={{ "--modal-botanical-image": `url(/art/cabinet-floral-${botanicalScene}.png)` } as CSSProperties}
    >
      <div
        aria-hidden="true"
        className="modal-banner-botanical"
        style={
          {
            backgroundImage: `url(/art/cabinet-floral-${botanicalScene}.png)`,
          } as CSSProperties
        }
      />

      {/* 5. Glass Badges & Optical Links */}
      <div aria-hidden="true" className="modal-banner-marks">
        {companionIcon ? (
          <>
            <span className="modal-banner-glass">{companionIcon}</span>
            <span className="modal-banner-connection">
              <span />
              <span />
              <span />
            </span>
          </>
        ) : null}
        <span className="modal-banner-glass modal-banner-feature">{icon}</span>
      </div>

      {/* 6. Title, Subtitle, Actions */}
      {children}

      {/* 7. Accessible Floating Frosted Close Control */}
      <DialogClose
        aria-label={t("common.close", { defaultValue: "Fermer" })}
        className="modal-banner-close"
      >
        <XIcon aria-hidden="true" size={17} strokeWidth={2} />
      </DialogClose>
    </div>
  );
}

export { ModalBanner, type ModalArtwork, type ModalBannerTone };
