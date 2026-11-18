import { ChatBubbleOvalLeftEllipsisIcon } from "@heroicons/react/20/solid";
import { toast } from "sonner";
import { whatsAppLink } from "@/lib/whatsapp";
import { openExternalLink } from "@/modules/documents/lib/open-external";

/**
 * Hands a whatsapp:// link to the system, like every external link of the app. When the system cannot open it (no
 * WhatsApp on this computer, for one), a plain message says so: there is no fallback to WhatsApp's site.
 */
export async function openWhatsApp(link: string): Promise<void> {
  if (!(await openExternalLink(link))) {
    toast.error("WhatsApp n’a pas pu être ouvert.");
  }
}

/**
 * « WhatsApp », next to the owner's number: opens the clinic's WhatsApp on that number with the message written, through
 * the system like every external link of the app. Renders nothing when the number cannot make a link.
 */
export function WhatsAppLink({
  action = "Écrire sur WhatsApp",
  className,
  message,
  ownerName,
  phone,
  text = "WhatsApp",
}: {
  /** Said to assistive technology and in the tooltip, followed by « à <owner> ». */
  action?: string;
  className?: string;
  message: string;
  ownerName?: string;
  phone?: string | null;
  /** The visible label. */
  text?: string;
}) {
  const link = whatsAppLink(phone, message);
  if (!link) {
    return null;
  }
  const label = ownerName?.trim() ? `${action} à ${ownerName.trim()}` : action;
  return (
    <button
      aria-label={label}
      className={className}
      onClick={() => openWhatsApp(link)}
      title={label}
      type="button"
    >
      <ChatBubbleOvalLeftEllipsisIcon
        aria-hidden="true"
        className="size-4 shrink-0"
      />
      <span>{text}</span>
    </button>
  );
}
