"use client";

import { MapIcon, XMarkIcon } from "@heroicons/react/16/solid";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Panel, Shell } from "@/components/ui/surface";
import { TOUR_INVITATION_COPY } from "./tour-steps";
import { closeInvitation, invitationVisible, showInvitation, startTour } from "./tour-state";
import { tourStore, useTourState } from "./tour-store";
import "./tour.css";

/**
 * L'invitation, sur le tableau de bord : une carte discrète, jamais bloquante. « Faire le tour » démarre ; la fermer la fait
 * disparaître pour de bon. Montrée au premier lancement seulement (installation neuve ou mise à jour), elle reste là
 * pendant cette session tant qu'on ne l'a pas fermée, et ne revient pas au lancement suivant.
 */
export function TourInvitation() {
  const state = useTourState();
  useEffect(() => {
    if (state.invitation === "unseen" && state.status === "idle" && tourStore.isWritable()) {
      tourStore.markInvitationShown();
      tourStore.update(showInvitation);
    }
  }, [state.invitation, state.status]);

  const visible = invitationVisible(state, { writable: tourStore.isWritable(), shownThisSession: tourStore.invitationShownThisSession() });
  if (!visible) return null;
  return (
    <section aria-label="Tour guidé" className="tour-invitation" data-tour-ui>
      <Shell>
        <Panel className="tour-invitation-panel">
          <span aria-hidden="true" className="tour-invitation-icon">
            <MapIcon className="size-4" />
          </span>
          <div className="tour-invitation-text">
            <h2 className="tour-invitation-title">{TOUR_INVITATION_COPY.title}</h2>
            <p className="tour-invitation-body">{TOUR_INVITATION_COPY.body}</p>
          </div>
          <div className="tour-invitation-actions">
            <Button className="rounded-full px-5" onClick={() => tourStore.update((current) => startTour(current, new Date()))} type="button">
              {TOUR_INVITATION_COPY.start}
            </Button>
            <Button aria-label={TOUR_INVITATION_COPY.close} className="rounded-full" onClick={() => tourStore.update(closeInvitation)} size="icon-sm" type="button" variant="ghost">
              <XMarkIcon aria-hidden="true" className="size-4" />
            </Button>
          </div>
        </Panel>
      </Shell>
    </section>
  );
}
