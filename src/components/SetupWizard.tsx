import {
  Alert02Icon,
  ArrowLeft01Icon,
  ArrowRight01Icon,
  CheckmarkCircle02Icon,
  Key01Icon,
  LockIcon,
  MailIcon,
  Shield01Icon,
  UserCircle02Icon,
  ViewIcon,
} from "@/lib/hugeicons";
import { HugeiconsIcon } from "@hugeicons/react";
import { AnimatePresence, motion } from "framer-motion";
import type React from "react";
import { useState } from "react";
import { Spinner } from "@/components/ui/spinner";
import { APP_NAME } from "@/lib/brand";
import { useTauriDrag } from "@/hooks/use-tauri-drag";
import {
  formatLicenseKey,
} from "@/services/licenseService";
import {
  activateLicense,
  createLicenseRequestMailto,
} from "@/services/licenseActivationService";
import Logo from "./Logo";
import { AuthBrandPanel, AuthGlassBackdrop } from "./auth-brand-panel";

interface SetupWizardProps {
  onComplete: (userData: {
    activationToken: string;
    name: string;
    email: string;
    password: string;
    licenseKey: string;
  }) => Promise<void>;
}

const SetupWizard: React.FC<SetupWizardProps> = ({ onComplete }) => {
  const {
    handleMouseDown: handleWindowMouseDown,
    isDesktopRuntime,
    ref: windowDragRef,
  } = useTauriDrag<HTMLElement>();
  const [step, setStep] = useState<1 | 2>(1);
  const [licenseKey, setLicenseKey] = useState("");
  const [activationToken, setActivationToken] = useState("");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPasswords, setShowPasswords] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isActivating, setIsActivating] = useState(false);

  const handleKeyChange = (value: string) => {
    setLicenseKey(formatLicenseKey(value));
    setError("");
  };

  const handleValidateLicense = async () => {
    if (!(licenseKey && email)) {
      setError("Veuillez remplir tous les champs");
      return;
    }
    if (!email.includes("@")) {
      setError("Adresse email invalide");
      return;
    }
    setIsActivating(true);
    setError("");
    try {
      const result = await activateLicense(email, licenseKey);
      setActivationToken(result.activationToken);
      setStep(2);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Impossible de vérifier cette licence."
      );
    } finally {
      setIsActivating(false);
    }
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
      await onComplete({
        activationToken,
        name,
        email,
        password,
        licenseKey,
      });
    } catch (err) {
      setError(`Erreur lors de la création du compte: ${String(err)}`);
      setIsLoading(false);
    }
  };

  const submitStep = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (step === 1) {
      void handleValidateLicense();
      return;
    }
    handleCreateAccount();
  };

  return (
    <main
      className="auth-shell auth-clinic relative min-h-screen overflow-x-hidden bg-background text-foreground"
      data-window-drag-region={isDesktopRuntime ? "true" : undefined}
      onMouseDown={handleWindowMouseDown}
      ref={windowDragRef}
    >
      <div className="relative z-10 grid min-h-screen lg:grid-cols-[minmax(0,1.08fr)_minmax(460px,0.92fr)]">
        <AuthBrandPanel rubrics={["Données locales", "Prêt au quotidien", "Accès personnel"]}>
          <p className="auth-clinic-eyebrow">
            Configuration locale <span>·</span> deux étapes
          </p>
          <h1 className="auth-clinic-title">
            <span>Un démarrage calme,</span>
            <span>un suivi précis.</span>
          </h1>
          <p className="auth-clinic-lead">
            Activez votre <mark className="auth-clinic-mark--blue">licence</mark>, créez
            votre <mark className="auth-clinic-mark--pink">accès</mark> et la clinique
            est prête à travailler.
          </p>
        </AuthBrandPanel>

        <section className="relative flex min-h-screen items-center justify-center p-5 sm:p-8 lg:p-12">
          <AuthGlassBackdrop />
          <motion.div
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className="auth-panel w-full max-w-[480px] overflow-hidden rounded-[28px]"
            initial={{ opacity: 0, y: 18, scale: 0.985 }}
            transition={{ duration: 0.6, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="border-black/[0.055] border-b px-6 py-5 sm:px-8 lg:hidden dark:border-white/[0.07]">
              <Logo size="lg" textSize="md" />
            </div>

            <form className="p-6 sm:p-8" onSubmit={submitStep}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="auth-clinic-step-label">
                    {step === 1 ? "Étape 1 · Activation" : "Étape 2 · Profil clinique"}
                  </p>
                  <h2 className="auth-clinic-welcome mt-2">
                    {step === 1 ? (
                      <>
                        Activez <em>{APP_NAME}.</em>
                      </>
                    ) : (
                      <>
                        Créez votre <em>accès.</em>
                      </>
                    )}
                  </h2>
                  <p className="mt-1.5 text-sm text-zinc-500 leading-relaxed dark:text-zinc-400">
                    {step === 1
                      ? "Associez votre licence à l’adresse e-mail utilisée lors de l’achat."
                      : "Définissez le compte administrateur de cette clinique."}
                  </p>
                </div>
                <fieldset className="auth-steps">
                  <legend className="sr-only">Étape {step} sur 2</legend>
                  {[1, 2].map((item) => (
                    <span className="auth-step" data-active={step >= item} key={item}>
                      {step > item ? (
                        <HugeiconsIcon className="size-3.5" icon={CheckmarkCircle02Icon} strokeWidth={1.8} />
                      ) : (
                        item
                      )}
                    </span>
                  ))}
                </fieldset>
              </div>

              <AnimatePresence initial={false} mode="popLayout">
                {error ? (
                  <motion.div
                    animate={{ opacity: 1, height: "auto", y: 0 }}
                    className="mt-6 flex items-start gap-3 overflow-hidden rounded-xl border border-destructive/20 bg-destructive/[0.06] p-3.5 text-destructive text-xs leading-relaxed"
                    exit={{ opacity: 0, height: 0, y: -4 }}
                    initial={{ opacity: 0, height: 0, y: -4 }}
                    key="setup-error"
                    role="alert"
                  >
                    <HugeiconsIcon className="mt-0.5 size-4 shrink-0" icon={Alert02Icon} strokeWidth={1.5} />
                    <span className="font-medium">{error}</span>
                  </motion.div>
                ) : null}
              </AnimatePresence>

              {step === 1 ? (
                <div className="mt-7 space-y-4">
                  <SetupField icon={MailIcon} id="setup-email" label="E-mail professionnel">
                    <input
                      aria-invalid={Boolean(error)}
                      autoCapitalize="none"
                      autoComplete="email"
                      className="auth-field__input"
                      id="setup-email"
                      onChange={(event) => {
                        setEmail(event.target.value);
                        setError("");
                      }}
                      placeholder="vous@clinique.com"
                      required
                      spellCheck={false}
                      type="email"
                      value={email}
                    />
                  </SetupField>

                  <SetupField icon={Key01Icon} id="setup-license" label="Clé de licence">
                    <input
                      aria-invalid={Boolean(error)}
                      autoComplete="off"
                      className="auth-field__input font-mono uppercase tracking-[0.08em]"
                      id="setup-license"
                      maxLength={24}
                      onChange={(event) => handleKeyChange(event.target.value)}
                      placeholder="XXXX-XXXX-XXXX-XXXX-XXXX"
                      required
                      spellCheck={false}
                      type="text"
                      value={licenseKey}
                    />
                  </SetupField>
                </div>
              ) : (
                <div className="mt-7 space-y-4">
                  <div className="flex items-center gap-2.5 rounded-xl border border-black/[0.055] bg-black/[0.018] px-3.5 py-3 text-xs text-zinc-500 dark:border-white/[0.07] dark:bg-white/[0.025] dark:text-zinc-400">
                    <HugeiconsIcon className="size-4 shrink-0 text-primary" icon={CheckmarkCircle02Icon} strokeWidth={1.5} />
                    <span>
                      Licence vérifiée pour <span className="font-medium text-foreground">{email}</span>
                    </span>
                  </div>

                  <SetupField icon={UserCircle02Icon} id="setup-name" label="Nom complet">
                    <input
                      autoComplete="name"
                      className="auth-field__input"
                      id="setup-name"
                      onChange={(event) => {
                        setName(event.target.value);
                        setError("");
                      }}
                      placeholder="Dr Prénom Nom"
                      required
                      type="text"
                      value={name}
                    />
                  </SetupField>

                  <SetupField icon={LockIcon} id="setup-password" label="Mot de passe">
                    <input
                      autoComplete="new-password"
                      className="auth-field__input pe-20"
                      id="setup-password"
                      minLength={6}
                      onChange={(event) => {
                        setPassword(event.target.value);
                        setError("");
                      }}
                      placeholder="6 caractères minimum"
                      required
                      type={showPasswords ? "text" : "password"}
                      value={password}
                    />
                    <button
                      aria-label={showPasswords ? "Masquer les mots de passe" : "Afficher les mots de passe"}
                      className="absolute inset-y-1.5 end-1.5 flex items-center gap-1.5 rounded-lg px-2.5 font-medium t-12 text-zinc-500 transition-colors hover:bg-black/[0.04] hover:text-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35 dark:hover:bg-white/[0.06] dark:hover:text-white"
                      onClick={() => setShowPasswords((visible) => !visible)}
                      type="button"
                    >
                      <HugeiconsIcon className="size-3.5" icon={ViewIcon} strokeWidth={1.5} />
                      {showPasswords ? "Masquer" : "Afficher"}
                    </button>
                  </SetupField>

                  <SetupField icon={LockIcon} id="setup-confirm" label="Confirmation">
                    <input
                      autoComplete="new-password"
                      className="auth-field__input"
                      id="setup-confirm"
                      minLength={6}
                      onChange={(event) => {
                        setConfirmPassword(event.target.value);
                        setError("");
                      }}
                      placeholder="Répétez le mot de passe"
                      required
                      type={showPasswords ? "text" : "password"}
                      value={confirmPassword}
                    />
                  </SetupField>
                </div>
              )}

              <div className="mt-7 flex items-center gap-2.5 rounded-xl border border-black/[0.055] bg-black/[0.018] px-3.5 py-3 text-xs text-zinc-500 dark:border-white/[0.07] dark:bg-white/[0.025] dark:text-zinc-400">
                <HugeiconsIcon className="size-4 shrink-0 text-primary" icon={Shield01Icon} strokeWidth={1.5} />
                Activation sécurisée. Vos données restent sur cet appareil.
              </div>

              <button
                className="group mt-5 inline-flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-primary px-4 font-semibold text-sm text-white shadow-[0_10px_28px_-15px_rgba(9,9,11,0.7)] transition duration-200 hover:-translate-y-0.5 hover:bg-primary/90 hover:shadow-[0_14px_32px_-16px_rgba(9,9,11,0.8)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:translate-y-0 dark:bg-primary dark:text-primary-foreground dark:hover:bg-primary/90"
                disabled={step === 1 ? isActivating : isLoading}
                type="submit"
              >
                {(step === 1 ? isActivating : isLoading) ? (
                  <Spinner className="size-4 text-current" />
                ) : (
                  <>
                    {step === 1 ? "Vérifier et continuer" : "Ouvrir mon espace"}
                    <HugeiconsIcon
                      className="size-4 transition-transform duration-200 group-hover:translate-x-0.5"
                      icon={ArrowRight01Icon}
                      strokeWidth={1.5}
                    />
                  </>
                )}
              </button>
            </form>

            <div className="border-black/[0.055] border-t bg-black/[0.018] px-6 py-4 text-center text-sm text-zinc-500 sm:px-8 dark:border-white/[0.07] dark:bg-white/[0.025] dark:text-zinc-400">
              {step === 1 ? (
                <>
                  Pas encore de licence ?
                  <button
                    className="ms-1.5 font-semibold text-zinc-950 transition-colors hover:text-primary focus-visible:underline focus-visible:outline-none dark:text-white"
                    onClick={() => {
                      window.location.href = createLicenseRequestMailto(email);
                    }}
                    type="button"
                  >
                    La demander par courriel
                  </button>
                </>
              ) : (
                <button
                  className="mx-auto flex items-center justify-center gap-1.5 font-semibold text-zinc-950 transition-colors hover:text-primary focus-visible:underline focus-visible:outline-none dark:text-white"
                  onClick={() => {
                    setError("");
                    setStep(1);
                  }}
                  type="button"
                >
                  <HugeiconsIcon className="size-3.5" icon={ArrowLeft01Icon} strokeWidth={1.5} />
                  Modifier la licence
                </button>
              )}
            </div>
          </motion.div>
        </section>
      </div>
    </main>
  );
};

interface SetupFieldProps {
  children: React.ReactNode;
  icon: Parameters<typeof HugeiconsIcon>[0]["icon"];
  id: string;
  label: string;
}

function SetupField({ children, icon, id, label }: SetupFieldProps) {
  return (
    <div className="space-y-2">
      <label className="auth-label" htmlFor={id}>
        {label}
      </label>
      <div className="auth-field">
        <HugeiconsIcon className="auth-field__icon" icon={icon} strokeWidth={1.5} />
        {children}
      </div>
    </div>
  );
}

export default SetupWizard;
