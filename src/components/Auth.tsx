import {
  Alert02Icon,
  ArrowLeft01Icon,
  ArrowRight01Icon,
  CheckmarkCircle02Icon,
  LockIcon,
  Mail01Icon,
  SparklesIcon,
  StethoscopeIcon,
  User02Icon,
  ViewIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { AnimatePresence, motion } from "framer-motion";
import type React from "react";
import { useState } from "react";
import { Spinner } from "@/components/ui/spinner";
import { useAuth } from "@/contexts/AuthContext";
import { APP_NAME } from "@/lib/brand";
import Logo from "./Logo";

function AuthShader() {
  return (
    <div aria-hidden="true" className="auth-shader">
      <div className="auth-shader__orb auth-shader__orb--one" />
      <div className="auth-shader__orb auth-shader__orb--two" />
      <div className="auth-shader__orb auth-shader__orb--three" />
      <div className="auth-shader__grain" />
    </div>
  );
}

const BENEFITS = [
  "Parcours clinique unifié",
  "Données conservées localement",
  "Pensé pour les équipes vétérinaires",
];

const Auth: React.FC = () => {
  const [view, setView] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [formError, setFormError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { login, register, error: authError } = useAuth();
  const errorMessage = authError || formError;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setFormError("");
    setLoading(true);
    try {
      if (view === "login") {
        await login(email, password);
      } else {
        await register(email, password, name);
      }
    } catch (error) {
      console.error(error);
      setFormError(
        error instanceof Error
          ? error.message
          : "Une erreur est survenue. Veuillez réessayer."
      );
    } finally {
      setLoading(false);
    }
  };

  const changeView = (nextView: "login" | "register") => {
    setView(nextView);
    setFormError("");
    setShowPassword(false);
  };

  return (
    <main className="auth-shell relative min-h-screen overflow-x-hidden bg-[#f7f8f6] text-zinc-950 dark:bg-[#0b0c0d] dark:text-white">
      <AuthShader />

      <div className="relative z-10 grid min-h-screen lg:grid-cols-[minmax(0,1.08fr)_minmax(460px,0.92fr)]">
        <section className="relative hidden min-h-screen flex-col justify-between border-white/50 border-r p-10 lg:flex xl:p-14 dark:border-white/[0.06]">
          <div className="flex items-center justify-between">
            <Logo size="xl" textSize="lg" />
            <span className="rounded-full border border-black/[0.06] bg-white/45 px-3 py-1.5 font-medium text-[11px] text-zinc-600 uppercase tracking-[0.14em] backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.05] dark:text-zinc-300">
              Espace clinique
            </span>
          </div>

          <motion.div
            animate={{ opacity: 1, y: 0 }}
            className="max-w-[620px]"
            initial={{ opacity: 0, y: 22 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="mb-6 flex size-12 items-center justify-center rounded-2xl border border-black/[0.06] bg-white/55 shadow-[0_12px_35px_-22px_rgba(15,23,42,0.45)] backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.07]">
              <HugeiconsIcon
                className="size-5 text-primary"
                icon={StethoscopeIcon}
                strokeWidth={1.7}
              />
            </div>
            <p className="font-semibold text-[11px] text-zinc-500 uppercase tracking-[0.2em] dark:text-zinc-400">
              Votre pratique, parfaitement orchestrée
            </p>
            <h1 className="mt-4 max-w-[580px] text-balance font-heading font-semibold text-[clamp(2.8rem,5vw,5.6rem)] leading-[0.94] tracking-[-0.06em]">
              Plus de temps pour le soin.
              <span className="mt-2 block text-zinc-500 dark:text-zinc-400">
                Moins pour le reste.
              </span>
            </h1>
            <p className="mt-7 max-w-lg text-pretty text-base text-zinc-600 leading-relaxed dark:text-zinc-300">
              Baitari rassemble patients, consultations, agenda et suivi du
              cabinet dans un espace calme, rapide et précis.
            </p>

            <div className="mt-9 flex flex-wrap gap-2.5">
              {BENEFITS.map((benefit) => (
                <div
                  className="flex items-center gap-2 rounded-full border border-black/[0.06] bg-white/42 px-3.5 py-2 text-sm text-zinc-700 backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.045] dark:text-zinc-200"
                  key={benefit}
                >
                  <HugeiconsIcon
                    className="size-4 text-primary"
                    icon={CheckmarkCircle02Icon}
                    strokeWidth={1.8}
                  />
                  {benefit}
                </div>
              ))}
            </div>
          </motion.div>

          <div className="flex items-center gap-3 text-xs text-zinc-500 dark:text-zinc-400">
            <span className="size-1.5 rounded-full bg-primary shadow-[0_0_0_5px_color-mix(in_oklab,var(--primary)_12%,transparent)]" />
            Application locale conçue pour rester fluide au quotidien
          </div>
        </section>

        <section className="relative flex min-h-screen items-center justify-center p-5 sm:p-8 lg:p-12">
          <motion.div
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className="auth-panel w-full max-w-[480px] overflow-hidden rounded-[28px] border border-white/70 bg-white/72 shadow-[0_30px_90px_-46px_rgba(20,25,30,0.5)] backdrop-blur-2xl dark:border-white/10 dark:bg-zinc-950/72 dark:shadow-[0_35px_90px_-40px_rgba(0,0,0,0.8)]"
            initial={{ opacity: 0, y: 18, scale: 0.985 }}
            transition={{ duration: 0.6, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="border-black/[0.055] border-b px-6 py-5 sm:px-8 lg:hidden dark:border-white/[0.07]">
              <Logo size="lg" textSize="md" />
            </div>

            <form className="p-6 sm:p-8" onSubmit={handleSubmit}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="mb-4 flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/15">
                    <HugeiconsIcon
                      className="size-[18px]"
                      icon={SparklesIcon}
                      strokeWidth={1.8}
                    />
                  </div>
                  <h2 className="font-heading font-semibold text-2xl tracking-[-0.035em]">
                    {view === "login"
                      ? "Bon retour"
                      : `Bienvenue sur ${APP_NAME}`}
                  </h2>
                  <p className="mt-1.5 text-sm text-zinc-500 leading-relaxed dark:text-zinc-400">
                    {view === "login"
                      ? "Retrouvez votre espace clinique exactement comme vous l’avez laissé."
                      : "Créez votre espace de travail clinique local."}
                  </p>
                </div>
              </div>

              <AnimatePresence initial={false} mode="popLayout">
                {errorMessage ? (
                  <motion.div
                    animate={{ opacity: 1, height: "auto", y: 0 }}
                    className="mt-6 flex items-start gap-3 overflow-hidden rounded-xl border border-destructive/20 bg-destructive/[0.06] p-3.5 text-destructive text-xs leading-relaxed"
                    exit={{ opacity: 0, height: 0, y: -4 }}
                    initial={{ opacity: 0, height: 0, y: -4 }}
                    key="auth-error"
                    role="alert"
                  >
                    <HugeiconsIcon
                      className="mt-0.5 size-4 shrink-0"
                      icon={Alert02Icon}
                      strokeWidth={2}
                    />
                    <span className="font-medium">{errorMessage}</span>
                  </motion.div>
                ) : null}
              </AnimatePresence>

              <div className="mt-7 space-y-4">
                <AnimatePresence initial={false}>
                  {view === "register" ? (
                    <motion.div
                      animate={{ opacity: 1, height: "auto" }}
                      className="space-y-2 overflow-hidden"
                      exit={{ opacity: 0, height: 0 }}
                      initial={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.25 }}
                    >
                      <label className="auth-label" htmlFor="name">
                        Nom complet
                      </label>
                      <div className="auth-field">
                        <HugeiconsIcon
                          className="auth-field__icon"
                          icon={User02Icon}
                          strokeWidth={1.7}
                        />
                        <input
                          autoComplete="name"
                          className="auth-field__input"
                          id="name"
                          onChange={(event) => setName(event.target.value)}
                          placeholder="Dr Prénom Nom"
                          required
                          type="text"
                          value={name}
                        />
                      </div>
                    </motion.div>
                  ) : null}
                </AnimatePresence>

                <div className="space-y-2">
                  <label className="auth-label" htmlFor="email">
                    E-mail professionnel
                  </label>
                  <div className="auth-field">
                    <HugeiconsIcon
                      className="auth-field__icon"
                      icon={Mail01Icon}
                      strokeWidth={1.7}
                    />
                    <input
                      aria-invalid={Boolean(errorMessage)}
                      autoCapitalize="none"
                      autoComplete="email"
                      className="auth-field__input"
                      id="email"
                      onChange={(event) => setEmail(event.target.value)}
                      placeholder="vous@clinique.com"
                      required
                      spellCheck={false}
                      type="email"
                      value={email}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="auth-label" htmlFor="password">
                    Mot de passe
                  </label>
                  <div className="auth-field">
                    <HugeiconsIcon
                      className="auth-field__icon"
                      icon={LockIcon}
                      strokeWidth={1.7}
                    />
                    <input
                      aria-invalid={Boolean(errorMessage)}
                      autoComplete={
                        view === "login" ? "current-password" : "new-password"
                      }
                      className="auth-field__input pe-20"
                      id="password"
                      minLength={6}
                      onChange={(event) => setPassword(event.target.value)}
                      placeholder="6 caractères minimum"
                      required
                      type={showPassword ? "text" : "password"}
                      value={password}
                    />
                    <button
                      aria-label={
                        showPassword
                          ? "Masquer le mot de passe"
                          : "Afficher le mot de passe"
                      }
                      className="absolute inset-y-1.5 end-1.5 flex items-center gap-1.5 rounded-lg px-2.5 font-medium text-[11px] text-zinc-500 transition-colors hover:bg-black/[0.04] hover:text-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35 dark:hover:bg-white/[0.06] dark:hover:text-white"
                      onClick={() => setShowPassword((visible) => !visible)}
                      type="button"
                    >
                      <HugeiconsIcon
                        className="size-3.5"
                        icon={ViewIcon}
                        strokeWidth={1.7}
                      />
                      {showPassword ? "Masquer" : "Afficher"}
                    </button>
                  </div>
                </div>
              </div>

              <div className="mt-7 flex items-center gap-2.5 rounded-xl border border-black/[0.055] bg-black/[0.018] px-3.5 py-3 text-xs text-zinc-500 dark:border-white/[0.07] dark:bg-white/[0.025] dark:text-zinc-400">
                <HugeiconsIcon
                  className="size-4 shrink-0 text-primary"
                  icon={CheckmarkCircle02Icon}
                  strokeWidth={1.8}
                />
                Votre session et vos données restent sur cet appareil.
              </div>

              <button
                className="group mt-5 inline-flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-zinc-950 px-4 font-semibold text-sm text-white shadow-[0_10px_28px_-15px_rgba(9,9,11,0.7)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-zinc-800 hover:shadow-[0_14px_32px_-16px_rgba(9,9,11,0.8)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:translate-y-0 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-100"
                disabled={loading}
                type="submit"
              >
                {loading ? (
                  <Spinner className="size-4 text-current" />
                ) : (
                  <>
                    {view === "login"
                      ? "Ouvrir mon espace"
                      : "Créer mon espace"}
                    <HugeiconsIcon
                      className="size-4 transition-transform duration-200 group-hover:translate-x-0.5"
                      icon={ArrowRight01Icon}
                      strokeWidth={2}
                    />
                  </>
                )}
              </button>
            </form>

            <div className="border-black/[0.055] border-t bg-black/[0.018] px-6 py-4 text-center text-sm text-zinc-500 sm:px-8 dark:border-white/[0.07] dark:bg-white/[0.025] dark:text-zinc-400">
              {view === "login" ? (
                <>
                  Première utilisation ?
                  <button
                    className="ms-1.5 font-semibold text-zinc-950 transition-colors hover:text-primary focus-visible:underline focus-visible:outline-none dark:text-white"
                    onClick={() => changeView("register")}
                    type="button"
                  >
                    Créer un compte
                  </button>
                </>
              ) : (
                <button
                  className="mx-auto flex items-center justify-center gap-1.5 font-semibold text-zinc-950 transition-colors hover:text-primary focus-visible:underline focus-visible:outline-none dark:text-white"
                  onClick={() => changeView("login")}
                  type="button"
                >
                  <HugeiconsIcon
                    className="size-3.5"
                    icon={ArrowLeft01Icon}
                    strokeWidth={2}
                  />
                  Revenir à la connexion
                </button>
              )}
            </div>
          </motion.div>
        </section>
      </div>
    </main>
  );
};

export default Auth;
