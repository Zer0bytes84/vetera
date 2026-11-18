import { ChatBubbleOvalLeftEllipsisIcon } from "@heroicons/react/20/solid";
import { toast } from "sonner";
import { whatsAppLink } from "@/lib/whatsapp";
import { openExternalLink } from "@/modules/documents/lib/open-external";

/**
 * « WhatsApp », next to the owner's number: opens the clinic's WhatsApp on that number with the message written, through
 * the system like every external link of the app. Renders nothing when the number cannot make a link.
 */
export function WhatsAppLink({
  className,
  message,
  ownerName,
  phone,
}: {
  className?: string;
  message: string;
  ownerName?: string;
  phone?: string | null;
}) {
  const link = whatsAppLink(phone, message);
  if (!link) {
    return null;
  }
  const label = ownerName?.trim()
    ? `Écrire sur WhatsApp à ${ownerName.trim()}`
    : "Écrire sur WhatsApp";
  return (
    <button
      aria-label={label}
      className={className}
      onClick={async () => {
        if (!(await openExternalLink(link))) {
          toast.error("WhatsApp n’a pas pu être ouvert.");
        }
      }}
      title={label}
      type="button"
    >
      <ChatBubbleOvalLeftEllipsisIcon
        aria-hidden="true"
        className="size-4 shrink-0"
      />
      <span>WhatsApp</span>
    </button>
  );
}
