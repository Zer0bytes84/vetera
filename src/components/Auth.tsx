import {
  Alert02Icon,
  ArrowLeft01Icon,
  ArrowRight01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { motion } from "framer-motion";
import type React from "react";
import { useState } from "react";
import { Spinner } from "@/components/ui/spinner";
import { useAuth } from "@/contexts/AuthContext";
import { APP_NAME } from "@/lib/brand";
import Logo from "./Logo";

// Radiant-inspired background gradient
export function GradientBackground() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute top-0 right-0 left-0 h-96 overflow-hidden"
    >
      <div className="relative mx-auto h-full max-w-7xl">
        <div
          className="absolute -top-44 -right-60 h-60 w-[36rem] rotate-[-10deg] transform-gpu rounded-full opacity-60 blur-3xl md:right-0 dark:opacity-20"
          style={{
            background:
              "linear-gradient(115deg, #fff1be 28%, #ee87cb 70%, #b060ff)",
          }}
        />
      </div>
    </div>
  );
}

const Auth: React.FC = () => {
  const [view, setView] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [formError, setFormError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login, register, error: authError } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    setLoading(true);
    try {
      if (view === "login") {
        await login(email, password);
      } else if (view === "register") {
        await register(email, password, name);
      }
    } catch (err: any) {
      console.error(err);
      setFormError(
        err.message || "Une erreur est survenue. Veuillez réessayer."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#FCFCFC] dark:bg-zinc-950">
      <GradientBackground />
      <div className="isolate flex min-h-screen items-center justify-center p-6 lg:p-8">
        <motion.div
          animate={{ opacity: 1, scale: 1 }}
          className="relative z-10 w-full max-w-md overflow-hidden rounded-xl border border-zinc-200/50 bg-white shadow-md ring-1 ring-black/5 dark:border-white/[0.04] dark:bg-zinc-900 dark:ring-white/5"
          initial={{ opacity: 0, scale: 0.96 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        >
          <form className="p-7 sm:p-11" onSubmit={handleSubmit}>
            <div className="flex justify-start">
              <Logo
                className="shrink-0 text-foreground drop-shadow-sm"
                size="xl"
              />
            </div>

            <h1 className="mt-8 font-semibold text-base text-zinc-950 dark:text-white">
              {view === "login"
                ? "Bon retour parmi nous !"
                : `Rejoignez ${APP_NAME}`}
            </h1>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              {view === "login"
                ? "Connectez-vous à votre compte pour continuer."
                : "Créez votre compte et gérez votre clinique en toute simplicité."}
            </p>

            {(authError || formError) && (
              <motion.div
                animate={{ opacity: 1, height: "auto" }}
                className="mt-6 flex items-center gap-3 overflow-hidden rounded-lg border border-destructive/20 bg-destructive/5 p-4 text-destructive text-xs leading-snug"
                initial={{ opacity: 0, height: 0 }}
              >
                <HugeiconsIcon
                  className="size-4 shrink-0"
                  icon={Alert02Icon}
                  strokeWidth={2}
                />
                <span className="font-medium">{authError || formError}</span>
              </motion.div>
            )}

            <div className="mt-8 space-y-6">
              {view === "register" && (
                <div className="space-y-2">
                  <label
                    className="font-medium text-sm text-zinc-950 dark:text-zinc-200"
                    htmlFor="name"
                  >
                    Nom complet
                  </label>
                  <input
                    className="block w-full rounded-lg border border-transparent bg-white px-3.5 py-2 text-base text-zinc-950 shadow-xs ring-1 ring-black/10 transition-all placeholder:text-zinc-400/50 focus:outline focus:outline-2 focus:outline-black focus:-outline-offset-1 sm:text-sm/6 dark:bg-zinc-800/40 dark:text-white dark:ring-white/10 dark:focus:outline-white"
                    id="name"
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Dr. Prénom Nom"
                    required
                    type="text"
                    value={name}
                  />
                </div>
              )}

              <div className="space-y-2">
                <label
                  className="font-medium text-sm text-zinc-950 dark:text-zinc-200"
                  htmlFor="email"
                >
                  E-mail
                </label>
                <input
                  className="block w-full rounded-lg border border-transparent bg-white px-3.5 py-2 text-base text-zinc-950 shadow-xs ring-1 ring-black/10 transition-all placeholder:text-zinc-400/50 focus:outline focus:outline-2 focus:outline-black focus:-outline-offset-1 sm:text-sm/6 dark:bg-zinc-800/40 dark:text-white dark:ring-white/10 dark:focus:outline-white"
                  id="email"
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="exemple@clinique.com"
                  required
                  type="email"
                  value={email}
                />
              </div>

              <div className="space-y-2">
                <label
                  className="font-medium text-sm text-zinc-950 dark:text-zinc-200"
                  htmlFor="password"
                >
                  Mot de passe
                </label>
                <input
                  className="block w-full rounded-lg border border-transparent bg-white px-3.5 py-2 text-base text-zinc-950 shadow-xs ring-1 ring-black/10 transition-all placeholder:text-zinc-400/50 focus:outline focus:outline-2 focus:outline-black focus:-outline-offset-1 sm:text-sm/6 dark:bg-zinc-800/40 dark:text-white dark:ring-white/10 dark:focus:outline-white"
                  id="password"
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  type="password"
                  value={password}
                />
              </div>
            </div>

            {view === "login" && (
              <div className="mt-8 flex items-center justify-between text-sm/5">
                <div className="flex items-center gap-3">
                  <input
                    className="size-4 cursor-pointer rounded-sm border-0 bg-white text-zinc-950 accent-zinc-950 ring-1 ring-black/10 focus:outline focus:outline-2 focus:outline-black focus:outline-offset-2 dark:bg-zinc-800 dark:text-white dark:accent-white dark:ring-white/20 dark:focus:outline-white"
                    id="remember-me"
                    name="remember-me"
                    type="checkbox"
                  />
                  <label
                    className="cursor-pointer select-none font-medium text-zinc-950 dark:text-zinc-200"
                    htmlFor="remember-me"
                  >
                    Se souvenir de moi
                  </label>
                </div>
                <button
                  className="cursor-pointer font-medium text-zinc-950 transition-colors hover:text-zinc-600 dark:text-zinc-200 dark:hover:text-zinc-400"
                  type="button"
                >
                  Oublié ?
                </button>
              </div>
            )}

            <div className="mt-8">
              <button
                className="inline-flex w-full cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap rounded-full border border-transparent bg-zinc-950 px-4 py-2.5 font-semibold text-sm text-white shadow-md transition-colors hover:bg-zinc-900 disabled:cursor-not-allowed disabled:opacity-40 sm:text-base dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-100"
                disabled={loading}
                type="submit"
              >
                {loading ? (
                  <Spinner className="size-4 text-white dark:text-zinc-950" />
                ) : (
                  <>
                    {view === "login" ? "Se connecter" : "Créer mon compte"}
                    <HugeiconsIcon
                      className="size-4"
                      icon={ArrowRight01Icon}
                      strokeWidth={2.5}
                    />
                  </>
                )}
              </button>
            </div>
          </form>

          <div className="m-1.5 rounded-lg bg-zinc-50/70 py-4 text-center text-sm/5 ring-1 ring-black/5 dark:bg-zinc-950/60 dark:ring-white/5">
            {view === "login" ? (
              <>
                Pas encore de compte ?{" "}
                <button
                  className="ml-1 cursor-pointer font-medium text-zinc-950 transition-colors hover:text-zinc-600 dark:text-white dark:hover:text-zinc-300"
                  onClick={() => {
                    setView("register");
                    setFormError("");
                  }}
                >
                  Créer un compte
                </button>
              </>
            ) : (
              <button
                className="mx-auto flex cursor-pointer items-center justify-center gap-1.5 font-medium text-zinc-950 transition-colors hover:text-zinc-600 dark:text-white dark:hover:text-zinc-300"
                onClick={() => {
                  setView("login");
                  setFormError("");
                }}
              >
                <HugeiconsIcon
                  className="size-3.5"
                  icon={ArrowLeft01Icon}
                  strokeWidth={2}
                />
                Retour à la connexion
              </button>
            )}
          </div>
        </motion.div>
      </div>
    </main>
  );
};

export default Auth;
