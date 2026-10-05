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
export function openPatientPeek(id: string) {
  window.dispatchEvent(new CustomEvent(PATIENT_PEEK_EVENT, { detail: { id } }));
}
export function PatientPeek({
  patientId,
  onClose,
  onOpenFull,
}: {
  patientId: string;
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
      key={patientId}
      patient={patient}
      owner={owners.data.find((row) => row.id === patient?.ownerId)}
      appointments={appointments.data
        .filter((row) => row.patientId === patientId)
        .sort((a, b) => b.startTime.localeCompare(a.startTime))}
      vaccinations={vaccinations.data.filter(
        (row) => row.patientId === patientId
      )}
      weights={weights.data
        .filter((row) => row.patientId === patientId)
        .sort((a, b) => b.measuredAt.localeCompare(a.measuredAt))}
      loading={profileLoading}
      error={!!(patients.error || owners.error)}
      skeletons={skeletons}
      historyLoading={historyLoading}
      followUpLoading={followUpLoading}
      historyError={!!appointments.error}
      followUpError={!!(vaccinations.error || weights.error)}
      onRetry={() => {
        void patients.refresh();
        void owners.refresh();
        void appointments.refresh();
        void vaccinations.refresh();
        void weights.refresh();
      }}
      onClose={onClose}
      onOpenFull={onOpenFull}
    />
  );
}
