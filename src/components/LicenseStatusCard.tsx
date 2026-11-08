import { useEffect, useState } from "react";
import { ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SettingsBody, SettingsSection } from "@/components/settings-section";
import {
  checkLicenseAccess,
  type LicenseAccess,
} from "@/services/licenseRuntime";

export function LicenseStatusCard() {
  const [access, setAccess] = useState<LicenseAccess | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let active = true;
    void checkLicenseAccess().then((value) => {
      if (active) setAccess(value);
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
          type="button"
          variant="outline"
          size="sm"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              setAccess(await checkLicenseAccess(true));
            } finally {
              setBusy(false);
            }
          }}
        >
          {busy ? "Vérification…" : "Vérifier maintenant"}
        </Button>
      }
      icon={ShieldCheck}
      subtitle="Activation et validité de ce poste."
      title="Licence de ce poste"
    >
      <SettingsBody className="gap-3">
        <p role="status" className="text-sm">
          {access?.message || "Lecture de l’activation…"}
        </p>
        {access?.allowed && (
          <p className="text-xs text-muted-foreground">
            {access.expiresAt
              ? `Valable jusqu’au ${new Date(access.expiresAt).toLocaleString("fr-FR")}`
              : "Licence sans date d’expiration"}{" "}
            · contrôle périodique en ligne
          </p>
        )}
        <p className="text-xs text-muted-foreground">
          Après une vérification réussie, l’accès reste disponible jusqu’à sept
          jours hors connexion, dans la limite de validité de la licence.
        </p>
      </SettingsBody>
    </SettingsSection>
  );
}
