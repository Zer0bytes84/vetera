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
import { Spinner } from "@/components/ui/spinner";
import { APP_NAME } from "@/lib/brand";
import { cn } from "@/lib/utils";
import {
  formatLicenseKey,
  validateLicenseKey,
} from "@/services/licenseService";
import { GradientBackground } from "./Auth";
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
    <div className="relative flex min-h-screen w-full overflow-hidden bg-[#FCFCFC] lg:grid lg:grid-cols-2 dark:bg-zinc-950">
      {/* Left Panel - Hero Visuals */}
      <div className="relative hidden w-full flex-col justify-between overflow-hidden border-border border-r bg-white p-10 text-foreground lg:flex dark:bg-zinc-900/60">
        <div className="flex items-center justify-between">
          <Logo className="shrink-0" size="xl" />
          <span className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 font-medium text-xs text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
            Activation privée
          </span>
        </div>

        <div className="max-w-[29rem]">
          <h1 className="font-heading font-semibold text-5xl text-zinc-950 leading-[1.04] tracking-tight dark:text-white">
            Rejoignez la nouvelle ère de votre clinique.
          </h1>
          <p className="mt-6 max-w-md text-base text-zinc-500 leading-7 dark:text-zinc-400">
            Activez votre espace pour retrouver une gestion clinique précise,
            calme et prête pour le quotidien.
          </p>
        </div>

        <div className="w-full max-w-md rounded-xl border border-zinc-200/50 bg-white p-4 shadow-sm ring-1 ring-black/5 dark:border-white/[0.04] dark:bg-zinc-900 dark:ring-white/5">
          <div className="flex items-center gap-4">
            <div className="flex -space-x-2">
              {["DR", "AS", "KM", "LV"].map((initials) => (
                <div
                  className="flex size-11 items-center justify-center rounded-full border-2 border-white bg-zinc-100 font-semibold text-xs text-zinc-950 dark:border-zinc-900 dark:bg-zinc-800 dark:text-white"
                  key={initials}
                >
                  {initials}
                </div>
              ))}
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-sm text-zinc-950 dark:text-white">
                Déjà activé par
              </p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                +2,000 cliniques leaders
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Setup Wizard Form */}
      <div className="relative z-10 flex w-full flex-col items-center justify-center p-6 lg:p-12">
        <GradientBackground />

        {/* Only show logo here on small screens */}
        <div className="mb-10 flex flex-col items-center text-center lg:hidden">
          <Logo className="mb-6 drop-shadow-md" size="xl" />
        </div>

        <div className="relative z-10 w-full max-w-md flex-col items-center">
          <div className="mb-8 flex flex-col items-center text-center">
            <h1 className="font-heading font-semibold text-3xl text-zinc-950 tracking-tight sm:text-4xl dark:text-white">
              {step === 1 ? `Activation de ${APP_NAME}` : "Bienvenue, Docteur."}
            </h1>
            <p className="mt-3 text-sm text-zinc-500 sm:text-base dark:text-zinc-400">
              {step === 1
                ? "Préparez-vous à transformer votre pratique."
                : "Configuration de votre espace de travail."}
            </p>
          </div>

          <div className="relative w-full overflow-hidden rounded-xl border border-zinc-200/50 bg-white p-8 shadow-md ring-1 ring-black/5 backdrop-blur-md sm:p-10 dark:border-white/[0.04] dark:bg-zinc-900/90 dark:ring-white/5">
            {/* Steps indicator */}
            <div className="mb-8 flex items-center justify-center gap-3">
              <div
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full font-semibold text-xs transition-all duration-500",
                  step >= 1
                    ? "bg-zinc-950 text-white shadow-md dark:bg-white dark:text-zinc-950"
                    : "bg-zinc-100 text-zinc-500 dark:bg-zinc-800"
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
                  step >= 2
                    ? "bg-zinc-950 dark:bg-white"
                    : "bg-zinc-200 dark:bg-zinc-800"
                )}
              />
              <div
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full font-semibold text-xs transition-all duration-500",
                  step >= 2
                    ? "bg-zinc-950 text-white shadow-md dark:bg-white dark:text-zinc-950"
                    : "border-2 border-zinc-200 bg-transparent text-zinc-400 dark:border-zinc-800"
                )}
              >
                2
              </div>
            </div>

            {/* Error Banner */}
            {error && (
              <div className="fade-in slide-in-from-top-2 mb-6 flex animate-in items-center gap-3 overflow-hidden rounded-lg border border-destructive/20 bg-destructive/5 p-4 text-destructive text-xs leading-snug">
                <HugeiconsIcon
                  className="size-4 shrink-0"
                  icon={Alert02Icon}
                  strokeWidth={2}
                />
                <span className="font-medium">{error}</span>
              </div>
            )}

            {/* Step 1: License Form */}
            {step === 1 && (
              <div className="fade-in zoom-in-95 animate-in space-y-6 duration-300">
                <div className="space-y-2">
                  <label
                    className="font-medium text-sm text-zinc-950 dark:text-zinc-200"
                    htmlFor="setup-email"
                  >
                    Adresse email
                  </label>
                  <div className="group relative">
                    <HugeiconsIcon
                      className="absolute top-1/2 left-4 size-5 -translate-y-1/2 text-zinc-400 transition-colors group-focus-within:text-zinc-950 dark:text-zinc-500 dark:group-focus-within:text-white"
                      icon={MailIcon}
                      strokeWidth={2}
                    />
                    <input
                      className="block w-full rounded-lg border border-transparent bg-white py-2.5 pr-3.5 pl-11 text-base text-zinc-950 shadow-xs ring-1 ring-black/10 transition-all placeholder:text-zinc-400/50 focus:outline focus:outline-2 focus:outline-black focus:-outline-offset-1 sm:text-sm/6 dark:bg-zinc-800/40 dark:text-white dark:ring-white/10 dark:focus:outline-white"
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

                <div className="space-y-2">
                  <label
                    className="font-medium text-sm text-zinc-950 dark:text-zinc-200"
                    htmlFor="setup-license"
                  >
                    Clé de licence
                  </label>
                  <div className="group relative">
                    <HugeiconsIcon
                      className="absolute top-1/2 left-4 size-5 -translate-y-1/2 text-zinc-400 transition-colors group-focus-within:text-zinc-950 dark:text-zinc-500 dark:group-focus-within:text-white"
                      icon={Key01Icon}
                      strokeWidth={2}
                    />
                    <input
                      className="block w-full rounded-lg border border-transparent bg-white py-2.5 pr-3.5 pl-11 font-mono text-base text-zinc-950 uppercase shadow-xs ring-1 ring-black/10 transition-all placeholder:text-zinc-400/50 focus:outline focus:outline-2 focus:outline-black focus:-outline-offset-1 sm:text-sm/6 dark:bg-zinc-800/40 dark:text-white dark:ring-white/10 dark:focus:outline-white"
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

                <button
                  className="inline-flex w-full cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap rounded-full border border-transparent bg-zinc-950 px-4 py-2.5 font-semibold text-sm text-white shadow-md transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-40 sm:text-base dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-100"
                  onClick={handleValidateLicense}
                >
                  Vérifier l'accès
                  <HugeiconsIcon
                    className="size-4"
                    icon={ArrowRight01Icon}
                    strokeWidth={2.5}
                  />
                </button>
              </div>
            )}

            {/* Step 2: Account Form */}
            {step === 2 && (
              <div className="slide-in-from-right-4 fade-in animate-in space-y-6 duration-500">
                <div className="flex items-center justify-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3.5 font-medium text-emerald-600 text-xs leading-snug dark:text-emerald-400">
                  <HugeiconsIcon
                    className="size-4 shrink-0"
                    icon={Shield01Icon}
                    strokeWidth={2.5}
                  />
                  <span>Licence authentifiée</span>
                </div>

                <div className="space-y-2">
                  <label
                    className="font-medium text-sm text-zinc-950 dark:text-zinc-200"
                    htmlFor="setup-name"
                  >
                    Nom complet
                  </label>
                  <div className="group relative">
                    <HugeiconsIcon
                      className="absolute top-1/2 left-4 size-5 -translate-y-1/2 text-zinc-400 transition-colors group-focus-within:text-zinc-950 dark:text-zinc-500 dark:group-focus-within:text-white"
                      icon={UserCircle02Icon}
                      strokeWidth={2}
                    />
                    <input
                      className="block w-full rounded-lg border border-transparent bg-white py-2.5 pr-3.5 pl-11 text-base text-zinc-950 shadow-xs ring-1 ring-black/10 transition-all placeholder:text-zinc-400/50 focus:outline focus:outline-2 focus:outline-black focus:-outline-offset-1 sm:text-sm/6 dark:bg-zinc-800/40 dark:text-white dark:ring-white/10 dark:focus:outline-white"
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

                <div className="space-y-2">
                  <label
                    className="font-medium text-sm text-zinc-950 dark:text-zinc-200"
                    htmlFor="setup-password"
                  >
                    Mot de passe secret
                  </label>
                  <div className="group relative">
                    <HugeiconsIcon
                      className="absolute top-1/2 left-4 size-5 -translate-y-1/2 text-zinc-400 transition-colors group-focus-within:text-zinc-950 dark:text-zinc-500 dark:group-focus-within:text-white"
                      icon={LockIcon}
                      strokeWidth={2}
                    />
                    <input
                      className="block w-full rounded-lg border border-transparent bg-white py-2.5 pr-3.5 pl-11 text-base text-zinc-950 shadow-xs ring-1 ring-black/10 transition-all placeholder:text-zinc-400/50 focus:outline focus:outline-2 focus:outline-black focus:-outline-offset-1 sm:text-sm/6 dark:bg-zinc-800/40 dark:text-white dark:ring-white/10 dark:focus:outline-white"
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

                <div className="space-y-2">
                  <label
                    className="font-medium text-sm text-zinc-950 dark:text-zinc-200"
                    htmlFor="setup-confirm"
                  >
                    Confirmer le mot de passe
                  </label>
                  <div className="group relative">
                    <HugeiconsIcon
                      className="absolute top-1/2 left-4 size-5 -translate-y-1/2 text-zinc-400 transition-colors group-focus-within:text-zinc-950 dark:text-zinc-500 dark:group-focus-within:text-white"
                      icon={LockIcon}
                      strokeWidth={2}
                    />
                    <input
                      className="block w-full rounded-lg border border-transparent bg-white py-2.5 pr-3.5 pl-11 text-base text-zinc-950 shadow-xs ring-1 ring-black/10 transition-all placeholder:text-zinc-400/50 focus:outline focus:outline-2 focus:outline-black focus:-outline-offset-1 sm:text-sm/6 dark:bg-zinc-800/40 dark:text-white dark:ring-white/10 dark:focus:outline-white"
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
                  <button
                    className="inline-flex w-full cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap rounded-full border border-transparent bg-zinc-950 px-4 py-2.5 font-semibold text-sm text-white shadow-md transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-40 sm:text-base dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-100"
                    disabled={isLoading}
                    onClick={handleCreateAccount}
                  >
                    {isLoading ? (
                      <Spinner className="size-5 text-white dark:text-zinc-950" />
                    ) : (
                      <>
                        Terminer l'installation{" "}
                        <HugeiconsIcon
                          className="size-4"
                          icon={SparklesIcon}
                          strokeWidth={2.5}
                        />
                      </>
                    )}
                  </button>
                </div>

                <div className="flex justify-center pt-2">
                  <button
                    className="mx-auto flex cursor-pointer items-center justify-center gap-1.5 font-medium text-sm text-zinc-950 transition-colors hover:text-zinc-600 dark:text-zinc-200 dark:hover:text-zinc-400"
                    onClick={() => setStep(1)}
                  >
                    <HugeiconsIcon
                      className="size-3.5"
                      icon={ArrowLeft01Icon}
                      strokeWidth={2}
                    />{" "}
                    Retour
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Floating Footer */}
          <div className="mt-10 flex items-center justify-center gap-6 font-medium text-sm text-zinc-400 dark:text-zinc-500">
            <span className="flex items-center gap-1.5 transition-colors hover:text-zinc-600 dark:hover:text-zinc-400">
              <HugeiconsIcon
                className="size-4"
                icon={Shield01Icon}
                strokeWidth={2}
              />{" "}
              Crypté & Sécurisé
            </span>
            <span className="h-1 w-1 rounded-full bg-zinc-200 dark:bg-zinc-800" />
            <span className="transition-colors hover:text-zinc-600 dark:hover:text-zinc-400">{`Support ${APP_NAME}`}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SetupWizard;
