import { useEffect, useState } from "react";
import { ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SettingsBody, SettingsSection } from "@/components/settings-section";
import {
  checkLicenseAccess,
  type LicenseAccess,
} from "@/services/licenseRuntime";
import { guard } from "@/lib/guard";

export function LicenseStatusCard() {
  const [access, setAccess] = useState<LicenseAccess | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let active = true;
    void checkLicenseAccess().then((value) => {
      if (active) {
        setAccess(value);
      }
    });
    return () => {
      active = false;
    };
  }, []);
  return (
    <SettingsSection
      aside={
        <Button
          className="rounded-full"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            await guard(
              async () => {
                setAccess(await checkLicenseAccess(true));
              },
              {
                cleanup: () => {
                  setBusy(false);
                },
              }
            );
          }}
          size="sm"
          type="button"
          variant="outline"
        >
          {busy ? "Vérification…" : "Vérifier maintenant"}
        </Button>
      }
      icon={ShieldCheck}
      subtitle="Activation et validité de ce poste."
      title="Licence de ce poste"
    >
      <SettingsBody className="gap-3">
        <p className="text-sm" role="status">
          {access?.message || "Lecture de l’activation…"}
        </p>
        {access?.allowed && (
          <p className="text-muted-foreground text-xs">
            {access.expiresAt
              ? `Valable jusqu’au ${new Date(access.expiresAt).toLocaleString("fr-FR")}`
              : "Licence sans date d’expiration"}{" "}
            · contrôle périodique en ligne
          </p>
        )}
        <p className="text-muted-foreground text-xs">
          Après une vérification réussie, l’accès reste disponible jusqu’à sept
          jours hors connexion, dans la limite de validité de la licence.
        </p>
      </SettingsBody>
    </SettingsSection>
  );
}
