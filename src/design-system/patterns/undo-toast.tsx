import type { ReactNode } from "react";
export function UndoToast({
  message,
  action,
}: {
  message: string;
  action: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 text-[13px]">
      <p>{message}</p>
      {action}
    </div>
  );
}
