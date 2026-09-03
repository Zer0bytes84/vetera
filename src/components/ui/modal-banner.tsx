import { XIcon } from "lucide-react";
import type { CSSProperties, ReactNode } from "react";
import { useTranslation } from "react-i18next";
import airbrushTexture from "@/assets/modal-airbrush.webp";
import amberTexture from "@/assets/modal-amber-light.webp";
import { DialogClose } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type ModalBannerTone = "teal" | "sky" | "amber" | "violet" | "rose";

// Stable compositions keep each workflow recognizable across openings/themes.
const modalArtworks = {
  patient: [airbrushTexture, 0, "50% 32%", false],
  "patient-record": [airbrushTexture, 38, "50% 58%", true],
  "patient-created": [airbrushTexture, 115, "50% 40%", false],
  "patient-picker": [airbrushTexture, 185, "50% 20%", true],
  appointment: [airbrushTexture, 235, "50% 64%", true],
  consultation: [airbrushTexture, 155, "50% 36%", false],
  product: [amberTexture, 0, "50% 54%", false],
  restock: [airbrushTexture, 120, "50% 68%", true],
  invoice: [airbrushTexture, 305, "50% 44%", true],
  "invoice-detail": [airbrushTexture, 290, "50% 65%", false],
  payment: [amberTexture, 25, "50% 42%", true],
  transaction: [amberTexture, 335, "50% 65%", false],
  billing: [amberTexture, 350, "50% 30%", true],
  team: [airbrushTexture, 335, "50% 70%", true],
  credentials: [airbrushTexture, 275, "50% 26%", false],
  weight: [airbrushTexture, 145, "50% 78%", true],
  vaccination: [airbrushTexture, 205, "50% 46%", false],
  hospitalization: [airbrushTexture, 170, "50% 60%", true],
  vitals: [airbrushTexture, 355, "50% 40%", false],
  anesthesia: [airbrushTexture, 255, "50% 72%", false],
  monitoring: [airbrushTexture, 20, "50% 52%", true],
  medication: [airbrushTexture, 85, "50% 25%", false],
  prescription: [airbrushTexture, 190, "50% 80%", false],
  assistant: [airbrushTexture, 320, "50% 30%", true],
  automation: [airbrushTexture, 65, "50% 58%", false],
} as const;

type ModalArtwork = keyof typeof modalArtworks;

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
  tone = "teal",
}: ModalBannerProps) {
  const { t } = useTranslation();
  const [texture, hue, position, flipped] = modalArtworks[artwork];

  return (
    <div
      className={cn("modal-banner", className)}
      data-slot="modal-banner"
      data-artwork={artwork}
      data-tone={tone ?? "teal"}
    >
      <div
        aria-hidden="true"
        className="modal-banner-art"
        style={
          {
            backgroundImage: `url(${texture})`,
            backgroundPosition: position,
            "--modal-art-filter": `hue-rotate(${hue}deg)`,
            transform: flipped ? "scaleX(-1)" : undefined,
          } as CSSProperties
        }
      />
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
      {children}
      <DialogClose
        aria-label={t("common.close", { defaultValue: "Fermer" })}
        className="modal-banner-close"
      >
        <XIcon aria-hidden="true" size={18} strokeWidth={1.7} />
      </DialogClose>
    </div>
  );
}

export { ModalBanner, type ModalArtwork, type ModalBannerTone };
