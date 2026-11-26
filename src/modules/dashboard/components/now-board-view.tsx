import {
  ActionButton,
  EmptyState,
  Panel,
  SkeletonBlock,
} from "@/design-system/primitives";
import type { NowSnapshot } from "../model/clinical-dashboard";
import { VisitFlowBoard } from "./visit-flow-board";

export function NowBoardView({
  snapshot,
  loading,
  skeleton,
  error,
  onRetry,
  onFlux,
  viewControl,
}: {
  snapshot: NowSnapshot;
  loading: boolean;
  skeleton: boolean;
  error?: string | null;
  onRetry: () => void;
  onFlux: (appointmentId?: string) => void;
  viewControl?: React.ReactNode;
}) {
  return (
    <div aria-busy={loading || skeleton} aria-label="Maintenant" role="region">
      {loading || skeleton ? (
        <Panel>
          <div className={`min-h-[240px] p-5 ${skeleton ? "" : "opacity-0"}`}>
            <SkeletonBlock className="h-4 w-32" />
            <SkeletonBlock className="mt-4 h-10 w-1/2" />
            <SkeletonBlock className="mt-5 h-9 w-52" />
          </div>
        </Panel>
      ) : error ? (
        <Panel>
          <EmptyState
            action={
              <ActionButton onClick={onRetry} quiet>
                Réessayer
              </ActionButton>
            }
            title="Les visites n’ont pas pu être chargées"
          />
        </Panel>
      ) : (
        <VisitFlowBoard
          onFlux={onFlux}
          snapshot={snapshot}
          viewControl={viewControl}
        />
      )}
    </div>
  );
}
