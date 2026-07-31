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
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import type React from "react";
import { useState } from "react";
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

const fieldClassName =
  "block h-12 w-full rounded-xl border border-zinc-200 bg-white pr-4 pl-11 text-[15px] text-zinc-950 shadow-[0_1px_2px_rgba(24,24,27,0.04)] outline-none transition duration-200 placeholder:text-zinc-400 focus:border-emerald-600 focus:ring-4 focus:ring-emerald-600/10";

const setupBenefits: Array<{
  description: string;
  icon: IconSvgElement;
  title: string;
}> = [
  {
    description: "Les dossiers restent sur cet appareil.",
    icon: Shield01Icon,
    title: "Données locales",
  },
  {
    description: "Patients, agenda et suivi réunis.",
    icon: SparklesIcon,
    title: "Prêt au quotidien",
  },
  {
    description: "Un compte administrateur sécurisé.",
    icon: UserCircle02Icon,
    title: "Accès personnel",
  },
];

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
    setLicenseKey(formatLicenseKey(value));
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
      setError(`Erreur lors de la création du compte: ${String(err)}`);
      setIsLoading(false);
    }
  };

  const submitStep = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (step === 1) {
      handleValidateLicense();
      return;
    }
    handleCreateAccount();
  };

  return (
    <main
      className="relative min-h-dvh overflow-auto bg-[#f4f5f1] text-zinc-950"
      style={{ colorScheme: "light" }}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 overflow-hidden"
      >
        <div className="absolute -top-32 left-[38%] size-[34rem] rounded-full bg-[#d7eee5]/70 blur-3xl" />
        <div className="absolute -right-32 bottom-[-14rem] size-[38rem] rounded-full bg-[#f4dfc3]/70 blur-3xl" />
        <div className="absolute inset-0 opacity-[0.035] [background-image:linear-gradient(to_right,#18181b_1px,transparent_1px),linear-gradient(to_bottom,#18181b_1px,transparent_1px)] [background-size:32px_32px]" />
      </div>

      <div className="relative mx-auto grid min-h-dvh w-full max-w-[1600px] lg:grid-cols-[minmax(340px,0.82fr)_minmax(560px,1.18fr)]">
        <section className="relative hidden flex-col justify-between overflow-hidden border-zinc-900/10 border-r bg-[#17231f] px-10 py-9 text-white lg:flex xl:px-14 xl:py-12">
          <div className="absolute inset-0 opacity-30 [background:radial-gradient(circle_at_20%_10%,#4a806d_0,transparent_38%),radial-gradient(circle_at_90%_80%,#715f47_0,transparent_34%)]" />
          <div className="absolute top-0 right-0 h-full w-px bg-gradient-to-b from-transparent via-white/25 to-transparent" />

          <div className="relative flex items-center justify-between gap-4">
            <Logo className="brightness-0 invert" size="xl" />
            <span className="rounded-full border border-white/15 bg-white/8 px-3 py-1.5 font-medium text-[11px] text-white/75 uppercase tracking-[0.12em]">
              Configuration locale
            </span>
          </div>

          <div className="relative my-10 max-w-[31rem]">
            <p className="mb-5 font-semibold text-emerald-300 text-xs uppercase tracking-[0.18em]">
              Votre clinique, prête à travailler
            </p>
            <h1 className="max-w-[28rem] font-heading font-semibold text-[clamp(2.5rem,4vw,4.6rem)] leading-[0.98] tracking-[-0.055em]">
              Un démarrage calme. Un suivi précis.
            </h1>
            <p className="mt-6 max-w-md text-[15px] text-white/62 leading-7">
              Deux étapes suffisent pour sécuriser votre espace et commencer à
              gérer les patients de la clinique.
            </p>
          </div>

          <div className="relative grid gap-2.5">
            {setupBenefits.map(({ description, icon, title }) => (
              <div
                className="flex items-center gap-3.5 rounded-2xl border border-white/10 bg-white/[0.055] p-3.5 backdrop-blur-sm"
                key={String(title)}
              >
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/10 text-emerald-200">
                  <HugeiconsIcon
                    className="size-5"
                    icon={icon}
                    strokeWidth={1.8}
                  />
                </span>
                <span className="min-w-0">
                  <span className="block font-semibold text-sm">{title}</span>
                  <span className="mt-0.5 block text-white/50 text-xs">
                    {description}
                  </span>
                </span>
              </div>
            ))}
          </div>
        </section>

        <section className="flex min-h-dvh items-center justify-center px-5 py-8 sm:px-8 lg:px-12 lg:py-10">
          <div className="w-full max-w-[540px]">
            <div className="mb-8 flex items-center justify-between gap-5 lg:mb-10">
              <Logo className="lg:hidden" size="lg" />
              <fieldset className="ml-auto flex items-center gap-2">
                <legend className="sr-only">Étape {step} sur 2</legend>
                {[1, 2].map((item) => (
                  <div className="flex items-center gap-2" key={item}>
                    {item > 1 && (
                      <span className="h-px w-6 bg-zinc-300 sm:w-9" />
                    )}
                    <span
                      className={cn(
                        "flex size-8 items-center justify-center rounded-full border font-semibold text-xs transition-all duration-300",
                        step >= item
                          ? "border-[#17231f] bg-[#17231f] text-white"
                          : "border-zinc-300 bg-white/60 text-zinc-400"
                      )}
                    >
                      {step > item ? (
                        <HugeiconsIcon
                          className="size-4"
                          icon={CheckmarkCircle02Icon}
                          strokeWidth={2.4}
                        />
                      ) : (
                        item
                      )}
                    </span>
                  </div>
                ))}
              </fieldset>
            </div>

            <div className="mb-7">
              <p className="font-semibold text-emerald-700 text-xs uppercase tracking-[0.16em]">
                {step === 1
                  ? "Étape 1 · Activation"
                  : "Étape 2 · Profil clinique"}
              </p>
              <h2 className="mt-3 font-heading font-semibold text-3xl leading-tight tracking-[-0.035em] sm:text-[2.5rem]">
                {step === 1 ? `Activez ${APP_NAME}` : "Créez votre accès"}
              </h2>
              <p className="mt-2.5 max-w-md text-[15px] text-zinc-600 leading-6">
                {step === 1
                  ? "Associez votre licence à l’adresse email utilisée lors de l’achat."
                  : "Définissez le compte administrateur de cette clinique."}
              </p>
            </div>

            <form
              className="rounded-[1.75rem] border border-white/80 bg-white/88 p-5 shadow-[0_24px_80px_rgba(24,35,31,0.10),0_2px_10px_rgba(24,35,31,0.04)] ring-1 ring-zinc-950/5 backdrop-blur-xl sm:p-7"
              onSubmit={submitStep}
            >
              {error && (
                <div className="fade-in slide-in-from-top-2 mb-5 flex animate-in items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-3.5 text-red-700 text-sm">
                  <HugeiconsIcon
                    className="mt-0.5 size-4 shrink-0"
                    icon={Alert02Icon}
                    strokeWidth={2}
                  />
                  <span>{error}</span>
                </div>
              )}

              {step === 1 ? (
                <div className="fade-in animate-in space-y-5 duration-300">
                  <SetupField
                    icon={MailIcon}
                    id="setup-email"
                    label="Adresse email"
                  >
                    <input
                      autoComplete="email"
                      className={fieldClassName}
                      id="setup-email"
                      onChange={(event) => {
                        setEmail(event.target.value);
                        setError("");
                      }}
                      placeholder="docteur@clinique.com"
                      required
                      type="email"
                      value={email}
                    />
                  </SetupField>

                  <SetupField
                    icon={Key01Icon}
                    id="setup-license"
                    label="Clé de licence"
                  >
                    <input
                      autoComplete="off"
                      className={`${fieldClassName} font-mono uppercase tracking-[0.08em]`}
                      id="setup-license"
                      maxLength={19}
                      onChange={(event) => handleKeyChange(event.target.value)}
                      placeholder="XXXX-XXXX-XXXX-XXXX"
                      required
                      type="text"
                      value={licenseKey}
                    />
                  </SetupField>

                  <button
                    className="group mt-1 inline-flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#17231f] px-5 font-semibold text-[15px] text-white shadow-[0_10px_24px_rgba(23,35,31,0.18)] transition duration-200 hover:-translate-y-0.5 hover:bg-[#22352e] focus-visible:outline-2 focus-visible:outline-emerald-700 focus-visible:outline-offset-2"
                    type="submit"
                  >
                    Vérifier et continuer
                    <HugeiconsIcon
                      className="size-4 transition-transform group-hover:translate-x-0.5"
                      icon={ArrowRight01Icon}
                      strokeWidth={2.4}
                    />
                  </button>
                </div>
              ) : (
                <div className="fade-in slide-in-from-right-3 animate-in space-y-4 duration-300">
                  <div className="mb-5 flex items-center gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-3 font-medium text-emerald-800 text-sm">
                    <HugeiconsIcon
                      className="size-4.5 shrink-0"
                      icon={CheckmarkCircle02Icon}
                      strokeWidth={2.2}
                    />
                    Licence vérifiée pour {email}
                  </div>

                  <SetupField
                    icon={UserCircle02Icon}
                    id="setup-name"
                    label="Nom complet"
                  >
                    <input
                      autoComplete="name"
                      className={fieldClassName}
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

                  <div className="grid gap-4 sm:grid-cols-2">
                    <SetupField
                      icon={LockIcon}
                      id="setup-password"
                      label="Mot de passe"
                    >
                      <input
                        autoComplete="new-password"
                        className={fieldClassName}
                        id="setup-password"
                        minLength={6}
                        onChange={(event) => {
                          setPassword(event.target.value);
                          setError("");
                        }}
                        placeholder="6 caractères minimum"
                        required
                        type="password"
                        value={password}
                      />
                    </SetupField>
                    <SetupField
                      icon={LockIcon}
                      id="setup-confirm"
                      label="Confirmation"
                    >
                      <input
                        autoComplete="new-password"
                        className={fieldClassName}
                        id="setup-confirm"
                        minLength={6}
                        onChange={(event) => {
                          setConfirmPassword(event.target.value);
                          setError("");
                        }}
                        placeholder="Répétez le mot de passe"
                        required
                        type="password"
                        value={confirmPassword}
                      />
                    </SetupField>
                  </div>

                  <button
                    className="mt-2 inline-flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#17231f] px-5 font-semibold text-[15px] text-white shadow-[0_10px_24px_rgba(23,35,31,0.18)] transition duration-200 hover:-translate-y-0.5 hover:bg-[#22352e] disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={isLoading}
                    type="submit"
                  >
                    {isLoading ? (
                      <Spinner className="size-5 text-white" />
                    ) : (
                      <>
                        Ouvrir mon espace
                        <HugeiconsIcon
                          className="size-4"
                          icon={SparklesIcon}
                          strokeWidth={2.2}
                        />
                      </>
                    )}
                  </button>

                  <button
                    className="mx-auto flex cursor-pointer items-center gap-1.5 pt-1 font-medium text-sm text-zinc-600 transition hover:text-zinc-950"
                    onClick={() => {
                      setError("");
                      setStep(1);
                    }}
                    type="button"
                  >
                    <HugeiconsIcon
                      className="size-4"
                      icon={ArrowLeft01Icon}
                      strokeWidth={2}
                    />
                    Modifier la licence
                  </button>
                </div>
              )}
            </form>

            <div className="mt-6 flex items-center justify-center gap-2 text-center text-xs text-zinc-500">
              <HugeiconsIcon
                className="size-4 text-emerald-700"
                icon={Shield01Icon}
                strokeWidth={2}
              />
              Activation sécurisée · Vos données restent sur cet appareil
            </div>
          </div>
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
      <label className="font-semibold text-[13px] text-zinc-800" htmlFor={id}>
        {label}
      </label>
      <div className="group relative">
        <HugeiconsIcon
          className="pointer-events-none absolute top-1/2 left-3.5 z-10 size-5 -translate-y-1/2 text-zinc-400 transition-colors group-focus-within:text-emerald-700"
          icon={icon}
          strokeWidth={1.9}
        />
        {children}
      </div>
    </div>
  );
}

export default SetupWizard;
