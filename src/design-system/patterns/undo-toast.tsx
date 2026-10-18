import type { ReactNode } from "react";
export function UndoToast({
  message,
  action,
}: {
  message: string;
  action: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 t-13">
      <p>{message}</p>
      {action}
    </div>
  );
}
