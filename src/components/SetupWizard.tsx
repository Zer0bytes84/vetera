import {
  Alert02Icon,
  ArrowLeft01Icon,
  ArrowRight01Icon,
  CheckmarkCircle02Icon,
  Key01Icon,
  LockIcon,
  MailIcon,
  Shield01Icon,
  SparklesIcon,
  UserCircle02Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type React from "react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { APP_NAME } from "@/lib/brand";
import { cn } from "@/lib/utils";
import {
  formatLicenseKey,
  validateLicenseKey,
} from "@/services/licenseService";
import Logo from "./Logo";

interface SetupWizardProps {
  onComplete: (userData: {
    name: string;
    email: string;
    password: string;
    licenseKey: string;
  }) => Promise<void>;
}

const SetupWizard: React.FC<SetupWizardProps> = ({ onComplete }) => {
  const [step, setStep] = useState<1 | 2>(1);
  const [licenseKey, setLicenseKey] = useState("");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleKeyChange = (value: string) => {
    const formatted = formatLicenseKey(value);
    setLicenseKey(formatted);
    setError("");
  };

  const handleValidateLicense = () => {
    if (!(licenseKey && email)) {
      setError("Veuillez remplir tous les champs");
      return;
    }
    if (!email.includes("@")) {
      setError("Adresse email invalide");
      return;
    }
    if (!validateLicenseKey(licenseKey, email)) {
      setError("Clé de licence invalide pour cette adresse email");
      return;
    }
    setError("");
    setStep(2);
  };

  const handleCreateAccount = async () => {
    if (!(name && password && confirmPassword)) {
      setError("Veuillez remplir tous les champs");
      return;
    }
    if (password.length < 6) {
      setError("Le mot de passe doit contenir au moins 6 caractères");
      return;
    }
    if (password !== confirmPassword) {
      setError("Les mots de passe ne correspondent pas");
      return;
    }
    setIsLoading(true);
    setError("");
    try {
      await onComplete({ name, email, password, licenseKey });
    } catch (err) {
      setError("Erreur lors de la création du compte: " + String(err));
      setIsLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen w-full overflow-hidden bg-background lg:grid lg:grid-cols-2">
      {/* Left Panel - Hero Visuals */}
      <div className="relative hidden w-full flex-col justify-between overflow-hidden border-border border-r bg-card p-10 text-foreground lg:flex">
        <div className="flex items-center justify-between">
          <Logo className="shrink-0" size="xl" />
          <span className="rounded-full border border-border bg-background px-3 py-1 font-medium text-muted-foreground text-xs">
            Activation privée
          </span>
        </div>

        <div className="max-w-[29rem]">
          <h1 className="font-heading font-semibold text-5xl text-foreground leading-[1.04]">
            Rejoignez la nouvelle ère de votre clinique.
          </h1>
          <p className="mt-6 max-w-md text-base text-muted-foreground leading-7">
            Activez votre espace pour retrouver une gestion clinique précise,
            calme et prête pour le quotidien.
          </p>
        </div>

        <div className="w-full max-w-md rounded-2xl border border-border bg-background p-4 shadow-soft">
          <div className="flex items-center gap-4">
            <div className="flex -space-x-2">
              {["DR", "AS", "KM", "LV"].map((initials) => (
                <div
                  className="flex size-11 items-center justify-center rounded-full border-2 border-card bg-muted font-semibold text-foreground text-xs"
                  key={initials}
                >
                  {initials}
                </div>
              ))}
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-foreground text-sm">
                Déjà activé par
              </p>
              <p className="text-muted-foreground text-xs">
                +2,000 cliniques leaders
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Setup Wizard Form */}
      <div className="relative z-10 flex w-full flex-col items-center justify-center p-6 lg:p-12">
        {/* Only show logo here on small screens */}
        <div className="mb-10 flex flex-col items-center text-center lg:hidden">
          <Logo className="mb-6 drop-shadow-md" size="xl" />
        </div>

        <div className="w-full max-w-md flex-col items-center">
          <div className="mb-8 flex flex-col items-center text-center">
            <h1 className="font-heading font-medium text-3xl text-foreground sm:text-4xl">
              {step === 1 ? `Activation de ${APP_NAME}` : "Bienvenue, Docteur."}
            </h1>
            <p className="mt-3 text-muted-foreground/80 text-sm sm:text-base">
              {step === 1
                ? "Préparez-vous à transformer votre pratique."
                : "Configuration de votre espace de travail."}
            </p>
          </div>

          <div className="relative w-full overflow-hidden rounded-2xl border border-border bg-card p-8 shadow-soft sm:p-10">
            {/* Steps indicator */}
            <div className="mb-8 flex items-center justify-center gap-3">
              <div
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full font-semibold text-xs transition-all duration-500",
                  step >= 1
                    ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {step > 1 ? (
                  <HugeiconsIcon
                    className="size-4"
                    icon={CheckmarkCircle02Icon}
                    strokeWidth={2.5}
                  />
                ) : (
                  "1"
                )}
              </div>
              <div
                className={cn(
                  "h-[2px] w-12 rounded-full transition-colors duration-500",
                  step >= 2 ? "bg-primary" : "bg-primary/10 dark:bg-primary/20"
                )}
              />
              <div
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full font-semibold text-xs transition-all duration-500",
                  step >= 2
                    ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25"
                    : "border-2 border-muted-foreground/20 bg-background text-muted-foreground"
                )}
              >
                2
              </div>
            </div>

            {/* Error Banner */}
            {error && (
              <div className="fade-in slide-in-from-top-2 mb-6 flex animate-in items-center gap-3 rounded-2xl border border-destructive/20 bg-destructive/10 p-4 text-destructive text-sm backdrop-blur-md">
                <HugeiconsIcon
                  className="size-5 shrink-0"
                  icon={Alert02Icon}
                  strokeWidth={2}
                />
                <span className="font-medium">{error}</span>
              </div>
            )}

            {/* Step 1: License Form */}
            {step === 1 && (
              <div className="fade-in zoom-in-95 animate-in space-y-5 duration-300">
                <div className="space-y-2.5">
                  <Label
                    className="st ml-1 text-muted-foreground text-xs uppercase"
                    htmlFor="setup-email"
                  >
                    Adresse email
                  </Label>
                  <div className="group relative">
                    <HugeiconsIcon
                      className="absolute top-1/2 left-4 size-5 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary"
                      icon={MailIcon}
                      strokeWidth={2}
                    />
                    <Input
                      className="h-12 rounded-xl border-border bg-background pl-11 shadow-sm transition-all focus:border-primary focus:bg-background"
                      id="setup-email"
                      onChange={(e) => {
                        setEmail(e.target.value);
                        setError("");
                      }}
                      placeholder="docteur@clinique.com"
                      required
                      type="email"
                      value={email}
                    />
                  </div>
                </div>

                <div className="space-y-2.5">
                  <Label
                    className="st ml-1 text-muted-foreground text-xs uppercase"
                    htmlFor="setup-license"
                  >
                    Clé de licence
                  </Label>
                  <div className="group relative">
                    <HugeiconsIcon
                      className="absolute top-1/2 left-4 size-5 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary"
                      icon={Key01Icon}
                      strokeWidth={2}
                    />
                    <Input
                      className="st h-12 rounded-xl border-border bg-background pl-11 font-mono uppercase shadow-sm transition-all focus:border-primary focus:bg-background"
                      id="setup-license"
                      maxLength={19}
                      onChange={(e) => handleKeyChange(e.target.value)}
                      placeholder="XXXX-XXXX-XXXX-XXXX"
                      required
                      type="text"
                      value={licenseKey}
                    />
                  </div>
                </div>

                <Button
                  className="mt-4 w-full rounded-xl text-base shadow-soft transition-all hover:shadow-[var(--shadow-lift)]"
                  onClick={handleValidateLicense}
                  size="lg"
                >
                  Vérifier l'accès
                  <HugeiconsIcon
                    className="ml-2 size-5"
                    icon={ArrowRight01Icon}
                    strokeWidth={2.5}
                  />
                </Button>
              </div>
            )}

            {/* Step 2: Account Form */}
            {step === 2 && (
              <div className="slide-in-from-right-4 fade-in animate-in space-y-5 duration-500">
                <div className="flex items-center justify-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3.5 font-medium text-emerald-700 text-sm backdrop-blur-sm dark:border-emerald-500/10 dark:text-emerald-400">
                  <HugeiconsIcon
                    className="size-4 shrink-0"
                    icon={Shield01Icon}
                    strokeWidth={2.5}
                  />
                  <span>Licence authentifiée</span>
                </div>

                <div className="space-y-2.5">
                  <Label
                    className="st ml-1 text-muted-foreground text-xs uppercase"
                    htmlFor="setup-name"
                  >
                    Nom complet
                  </Label>
                  <div className="group relative">
                    <HugeiconsIcon
                      className="absolute top-1/2 left-4 size-5 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary"
                      icon={UserCircle02Icon}
                      strokeWidth={2}
                    />
                    <Input
                      className="h-12 rounded-xl border-border bg-background pl-11 shadow-sm transition-all focus:border-primary focus:bg-background"
                      id="setup-name"
                      onChange={(e) => {
                        setName(e.target.value);
                        setError("");
                      }}
                      placeholder="Dr. Prénom Nom"
                      required
                      type="text"
                      value={name}
                    />
                  </div>
                </div>

                <div className="space-y-2.5">
                  <Label
                    className="st ml-1 text-muted-foreground text-xs uppercase"
                    htmlFor="setup-password"
                  >
                    Mot de passe secret
                  </Label>
                  <div className="group relative">
                    <HugeiconsIcon
                      className="absolute top-1/2 left-4 size-5 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary"
                      icon={LockIcon}
                      strokeWidth={2}
                    />
                    <Input
                      className="h-12 rounded-xl border-border bg-background pl-11 shadow-sm transition-all focus:border-primary focus:bg-background"
                      id="setup-password"
                      onChange={(e) => {
                        setPassword(e.target.value);
                        setError("");
                      }}
                      placeholder="••••••••"
                      required
                      type="password"
                      value={password}
                    />
                  </div>
                </div>

                <div className="space-y-2.5">
                  <Label
                    className="st ml-1 text-muted-foreground text-xs uppercase"
                    htmlFor="setup-confirm"
                  >
                    Confirmer le {"mot de passe"}
                  </Label>
                  <div className="group relative">
                    <HugeiconsIcon
                      className="absolute top-1/2 left-4 size-5 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary"
                      icon={LockIcon}
                      strokeWidth={2}
                    />
                    <Input
                      className="h-12 rounded-xl border-border bg-background pl-11 shadow-sm transition-all focus:border-primary focus:bg-background"
                      id="setup-confirm"
                      onChange={(e) => {
                        setConfirmPassword(e.target.value);
                        setError("");
                      }}
                      placeholder="••••••••"
                      required
                      type="password"
                      value={confirmPassword}
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <Button
                    className="w-full rounded-xl text-base shadow-soft transition-all hover:shadow-[var(--shadow-lift)]"
                    disabled={isLoading}
                    onClick={handleCreateAccount}
                    size="lg"
                  >
                    {isLoading ? (
                      <Spinner className="size-5" />
                    ) : (
                      <>
                        Terminer l'installation{" "}
                        <HugeiconsIcon
                          className="ml-2 size-5"
                          icon={SparklesIcon}
                          strokeWidth={2.5}
                        />
                      </>
                    )}
                  </Button>
                </div>

                <div className="flex justify-center pt-2">
                  <Button
                    className="text-muted-foreground hover:bg-background/80 hover:text-foreground"
                    onClick={() => setStep(1)}
                    size="sm"
                    variant="ghost"
                  >
                    <HugeiconsIcon
                      className="mr-2 size-4"
                      icon={ArrowLeft01Icon}
                      strokeWidth={2}
                    />{" "}
                    Retour
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Floating Footer */}
          <div className="mt-10 flex items-center justify-center gap-6 font-medium text-muted-foreground/60 text-sm">
            <span className="flex items-center gap-1.5 transition-colors hover:text-foreground">
              <HugeiconsIcon
                className="size-4"
                icon={Shield01Icon}
                strokeWidth={2}
              />{" "}
              Crypté & Sécurisé
            </span>
            <span className="h-1 w-1 rounded-full bg-muted-foreground/30" />
            <span className="transition-colors hover:text-foreground">{`Support ${APP_NAME}`}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SetupWizard;
