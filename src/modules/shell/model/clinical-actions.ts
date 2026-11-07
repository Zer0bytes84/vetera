/** `time` ("HH:MM") and `vetId` open the form on that slot and that veterinarian. */
export function prepareAppointment(patientId?: string, date?: Date, time?: string, vetId?: string) {
  sessionStorage.setItem(
    "vetera:pending-appointment",
    JSON.stringify({ patientId, create: true, date: date?.toISOString(), time, vetId })
  );
}
export function prepareInvoice(
  ownerId: string,
  patientId?: string,
  appointmentId?: string
) {
  sessionStorage.setItem(
    "vetera:pending-invoice",
    JSON.stringify({ ownerId, patientId, appointmentId })
  );
}
export function prepareVaccination(patientId: string) {
  sessionStorage.setItem("vetera:pending-vaccination", patientId);
}
