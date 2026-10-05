import React from "react";

import type { View } from "@/types";

import { useFinancesPageModel } from "../hooks/use-finances-page-model";
import { FinancesView } from "../components/finances-view";

const Finances: React.FC<{ onNavigate?: (view: View) => void }> = (props) => (
  <FinancesView {...useFinancesPageModel(props)} />
);
export default React.memo(Finances);
