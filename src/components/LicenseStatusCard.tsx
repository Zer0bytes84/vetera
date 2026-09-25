import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
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
    <section className="rounded-xl border bg-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-sm font-semibold">Licence de ce poste</h3>
        <Button
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
      </div>
      <p role="status" className="mt-2 text-sm text-muted-foreground">
        {access?.message || "Lecture de l’activation…"}
      </p>
      {access?.allowed && (
        <p className="mt-2 text-xs text-muted-foreground">
          {access.expiresAt
            ? `Valable jusqu’au ${new Date(access.expiresAt).toLocaleString("fr-FR")}`
            : "Licence sans date d’expiration"}{" "}
          · contrôle périodique en ligne
        </p>
      )}
      <p className="mt-2 text-xs text-muted-foreground">
        Après une vérification réussie, l’accès reste disponible jusqu’à sept
        jours hors connexion, dans la limite de validité de la licence.
      </p>
    </section>
  );
}
