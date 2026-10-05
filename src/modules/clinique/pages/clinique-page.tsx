import React from "react";

import { CliniqueProps } from "@/modules/clinique/components/clinique-shared";
import { useCliniquePageModel } from "../hooks/use-clinique-page-model";
import { CliniqueView } from "../components/clinique-view";

const Clinique: React.FC<CliniqueProps> = (props) => (
  <CliniqueView {...useCliniquePageModel(props)} />
);
export default React.memo(Clinique);
