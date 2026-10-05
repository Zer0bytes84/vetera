import React from "react";

import { PatientsProps } from "@/modules/patients/components/patients-shared";
import { usePatientsPageModel } from "../hooks/use-patients-page-model";
import { PatientsView } from "../components/patients-view";

const Patients: React.FC<PatientsProps> = (props) => (
  <PatientsView {...usePatientsPageModel(props)} />
);
export default React.memo(Patients);
