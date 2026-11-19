import { useState } from "react";
import { toast } from "sonner";
import { SettingsRow } from "@/components/settings-section";
import { Button } from "@/components/ui/button";
import { guard } from "@/lib/guard";
import { isTauriRuntime } from "@/services/browser-store";
import { checkForAppUpdates } from "@/services/updateService";

/**
 * « Rechercher une mise à jour », in Paramètres > À propos: the same check as at launch, asked by the person. It offers
 * the latest version even if « Plus tard » was chosen for it before, and says when there is none.
 */
export function UpdateCheckRow() {
  const [checking, setChecking] = useState(false);

  const search = async () => {
    if (!isTauriRuntime()) {
      toast.info(
        "La recherche de mise à jour se fait dans l’application installée."
      );
      return;
    }
    setChecking(true);
    await guard(() => checkForAppUpdates({ userInitiated: true }), {
      recover: (error) => {
        console.error("[Updater] Manual check failed:", error);
        toast.error("La recherche de mise à jour n’a pas abouti.", {
          description: "Vérifiez la connexion à Internet, puis réessayez.",
        });
      },
      cleanup: () => {
        setChecking(false);
      },
    });
  };

  return (
    <SettingsRow
      detail="Vérifie si une version plus récente est publiée et propose de l’installer."
      title="Mises à jour"
    >
      <Button
        className="rounded-full"
        data-testid="update-check"
        disabled={checking}
        onClick={search}
        type="button"
        variant="outline"
      >
        {checking ? "Recherche…" : "Rechercher une mise à jour"}
      </Button>
    </SettingsRow>
  );
}
