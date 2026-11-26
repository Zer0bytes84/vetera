import React from "react";

import type { View } from "@/types";
import { AgendaView } from "../components/agenda-view";
import { useAgendaPageModel } from "../hooks/use-agenda-page-model";

const Agenda: React.FC<{ onNavigate: (view: View) => void }> = ({
  onNavigate,
}) => <AgendaView {...useAgendaPageModel(onNavigate)} />;
export default React.memo(Agenda);
