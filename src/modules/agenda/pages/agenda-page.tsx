import React from "react";

import type { View } from "@/types";

import { useAgendaPageModel } from "../hooks/use-agenda-page-model";
import { AgendaView } from "../components/agenda-view";

const Agenda: React.FC<{ onNavigate: (view: View) => void }> = ({
  onNavigate,
}) => <AgendaView {...useAgendaPageModel(onNavigate)} />;
export default React.memo(Agenda);
