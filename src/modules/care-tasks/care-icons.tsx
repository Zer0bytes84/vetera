/*! Lucide Icons, ISC. Feather-derived icons, MIT. See /licenses/lucide-care-icons.txt. */
import type { ReactNode, SVGProps } from "react";
type CareIconProps = Omit<SVGProps<SVGSVGElement>, "children" | "strokeWidth">;
function CareIcon({ children, ...props }: CareIconProps & { children: ReactNode }) {
  return <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props} strokeWidth={1}>{children}</svg>;
}

export function CalendarDays(props: CareIconProps) {
  return <CareIcon {...props}>
      <path d="M8 2v3" />
      <path d="M16 2v3" />
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M3 9h18" />
      <path d="M8 13h.01" />
      <path d="M12 13h.01" />
      <path d="M16 13h.01" />
      <path d="M8 17h.01" />
      <path d="M12 17h.01" />
      <path d="M16 17h.01" />
  </CareIcon>;
}

export function Clock(props: CareIconProps) {
  return <CareIcon {...props}>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 6v6l4 2" />
  </CareIcon>;
}

export function ChevronDown(props: CareIconProps) {
  return <CareIcon {...props}>
      <path d="m6 9 6 6 6-6" />
  </CareIcon>;
}

export function Clipboard(props: CareIconProps) {
  return <CareIcon {...props}>
      <rect width="8" height="4" x="8" y="2" rx="1" ry="1" />
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
  </CareIcon>;
}
