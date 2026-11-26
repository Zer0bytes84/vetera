// biome-ignore-all assist/source/organizeImports: ranger ces imports déplace une feuille CSS vers un autre morceau (A2, CSS_CHANGE, décision du 25/11) ; l'ordre actuel est celui que l'app affiche
import {
  useAppointmentsRepository,
  useOwnersRepository,
  usePatientsRepository,
  useVaccinationsRepository,
  useWeightEntriesRepository,
} from "@/data/repositories";
import { PatientPeekView } from "../components/patient-peek-view";
import { useDelayedSkeleton } from "@/hooks/useDelayedSkeleton";
export const PATIENT_PEEK_EVENT = "baitari:patient-peek";
export interface PatientPeekDetail {
  /** Opened from a list cursor: no backdrop, focus stays on the list. */
  follow?: boolean;
  id: string;
  /** Same patient already shown: close instead (Space twice). */
  toggle?: boolean;
}
export function openPatientPeek(
  id: string,
  options: Omit<PatientPeekDetail, "id"> = {}
) {
  window.dispatchEvent(
    new CustomEvent<PatientPeekDetail>(PATIENT_PEEK_EVENT, {
      detail: { id, ...options },
    })
  );
}
export function PatientPeek({
  patientId,
  follow = false,
  onClose,
  onOpenFull,
}: {
  patientId: string;
  follow?: boolean;
  onClose: () => void;
  onOpenFull: () => void;
}) {
  const patients = usePatientsRepository();
  const owners = useOwnersRepository();
  const appointments = useAppointmentsRepository();
  const vaccinations = useVaccinationsRepository();
  const weights = useWeightEntriesRepository();
  const profileLoading = patients.loading || owners.loading;
  const historyLoading = appointments.loading;
  const followUpLoading = vaccinations.loading || weights.loading;
  const skeletons = {
    profile: useDelayedSkeleton(profileLoading),
    history: useDelayedSkeleton(historyLoading),
    followUp: useDelayedSkeleton(followUpLoading),
  };
  const patient = patients.data.find((row) => row.id === patientId);
  return (
    <PatientPeekView
      appointments={appointments.data
        .filter((row) => row.patientId === patientId)
        .sort((a, b) => b.startTime.localeCompare(a.startTime))}
      error={!!(patients.error || owners.error)}
      follow={follow}
      followUpError={!!(vaccinations.error || weights.error)}
      followUpLoading={followUpLoading}
      historyError={!!appointments.error}
      historyLoading={historyLoading}
      loading={profileLoading}
      onClose={onClose}
      onOpenFull={onOpenFull}
      onRetry={() => {
        void patients.refresh();
        void owners.refresh();
        void appointments.refresh();
        void vaccinations.refresh();
        void weights.refresh();
      }}
      owner={owners.data.find((row) => row.id === patient?.ownerId)}
      patient={patient}
      skeletons={skeletons}
      vaccinations={vaccinations.data.filter(
        (row) => row.patientId === patientId
      )}
      weights={weights.data
        .filter((row) => row.patientId === patientId)
        .sort((a, b) => b.measuredAt.localeCompare(a.measuredAt))}
    />
  );
}
