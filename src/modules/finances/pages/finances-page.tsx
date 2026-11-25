import React from "react";

import type { View } from "@/types";
import { FinancesView } from "../components/finances-view";
import { useFinancesPageModel } from "../hooks/use-finances-page-model";

const Finances: React.FC<{ onNavigate?: (view: View) => void }> = (props) => (
  <FinancesView {...useFinancesPageModel(props)} />
);
export default React.memo(Finances);
