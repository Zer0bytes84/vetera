import React from "react";

import { useAgendaPageModel } from "../hooks/use-agenda-page-model";
import { AgendaView } from "../components/agenda-view";

const Agenda: React.FC = () => <AgendaView {...useAgendaPageModel()} />;
export default React.memo(Agenda);
