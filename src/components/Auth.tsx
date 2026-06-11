import {
  Alert02Icon,
  ArrowLeft01Icon,
  ArrowRight01Icon,
  LockIcon,
  MailIcon,
  UserIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { motion } from "framer-motion";
import type React from "react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MeshGradient } from "@/components/ui/mesh-gradient";
import { Spinner } from "@/components/ui/spinner";
import { useAuth } from "@/contexts/AuthContext";
import { APP_NAME, APP_TAGLINE } from "@/lib/brand";
import Logo from "./Logo";

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
    <MeshGradient className="min-h-screen p-4 lg:p-8">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="mx-auto flex min-h-[calc(100vh-2rem)] lg:min-h-[calc(100vh-4rem)] w-full max-w-[1200px] flex-col overflow-hidden rounded-[2.5rem] border border-white/40 bg-white/60 shadow-[0_8px_32px_rgba(0,0,0,0.08)] backdrop-blur-3xl dark:border-white/10 dark:bg-black/50 dark:shadow-[0_8px_32px_rgba(0,0,0,0.4)] lg:grid lg:grid-cols-2"
      >
        {/* Left Panel - Hero Visuals */}
        <div className="relative hidden w-full flex-col justify-between p-12 lg:flex border-r border-white/20 dark:border-white/5">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2, duration: 0.8 }}
            className="flex items-center justify-between"
          >
            <Logo className="shrink-0 drop-shadow-sm" size="xl" />
            <span className="rounded-full border border-white/30 bg-white/30 px-3 py-1 font-medium text-foreground/80 text-xs shadow-sm backdrop-blur-md dark:border-white/10 dark:bg-white/5 dark:text-foreground/70">
              {APP_TAGLINE}
            </span>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.8 }}
            className="max-w-[29rem]"
          >
            <h1 className="font-heading font-semibold text-5xl text-foreground leading-[1.1] tracking-tight text-balance">
              L'innovation vétérinaire commence ici.
            </h1>
            <p className="mt-6 max-w-md text-lg text-foreground/70 leading-relaxed text-balance font-medium">
              Une interface claire, rapide et premium pour gérer les patients, les
              rendez-vous et les opérations de la clinique.
            </p>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.8 }}
            className="w-full max-w-md rounded-2xl border border-white/30 bg-white/40 p-5 shadow-lg backdrop-blur-xl transition-transform hover:scale-[1.02] dark:border-white/10 dark:bg-black/40"
          >
            <div className="flex items-center gap-4">
              <div className="flex -space-x-2">
                {["DR", "AS", "KM", "LV"].map((initials, i) => (
                  <div
                    className="flex size-11 items-center justify-center rounded-full border-2 border-white/50 bg-gradient-to-br from-primary/20 to-primary/10 font-semibold text-foreground text-xs backdrop-blur-md dark:border-white/10 dark:from-primary/30 dark:to-primary/5"
                    key={initials}
                    style={{ zIndex: 4 - i }}
                  >
                    {initials}
                  </div>
                ))}
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-foreground text-sm">
                  +2,000 professionnels
                </p>
                <p className="text-foreground/60 text-xs font-medium">
                  font avancer la médecine vétérinaire
                </p>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Right Panel - Login Form */}
        <div className="relative z-10 flex w-full flex-col items-center justify-center p-6 lg:p-12">
          {/* Only show logo here on small screens */}
          <div className="mb-10 flex flex-col items-center text-center lg:hidden">
            <Logo className="mb-6 drop-shadow-md" size="xl" />
          </div>

          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="w-full max-w-[28rem] flex-col items-center"
          >
            <div className="mb-8 flex flex-col items-center text-center">
              <h2 className="font-heading font-semibold text-3xl text-foreground drop-shadow-sm sm:text-4xl tracking-tight">
                {view === "login" ? "Bon retour parmi nous" : `Rejoignez ${APP_NAME}`}
              </h2>
              <p className="mt-3 text-foreground/70 text-base font-medium">
                {view === "login"
                  ? "Gérez votre clinique en toute simplicité."
                  : "Créez votre compte et découvrez l'outil de demain."}
              </p>
            </div>

            <div className="relative w-full rounded-3xl border border-white/50 bg-white/50 p-8 shadow-xl backdrop-blur-2xl dark:border-white/10 dark:bg-black/40 sm:p-10">
              {(authError || formError) && (
                <motion.div 
                  initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                  animate={{ opacity: 1, height: "auto", marginBottom: 24 }}
                  className="flex items-center gap-3 rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-destructive text-sm backdrop-blur-md overflow-hidden"
                >
                  <HugeiconsIcon
                    className="size-5 shrink-0"
                    icon={Alert02Icon}
                    strokeWidth={2.5}
                  />
                  <span className="font-medium leading-snug">
                    {authError || formError}
                  </span>
                </motion.div>
              )}

              <form className="space-y-6" onSubmit={handleSubmit}>
                {view === "register" && (
                  <motion.div 
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="space-y-2.5"
                  >
                    <Label className="ml-1 text-foreground/80 text-xs font-semibold uppercase tracking-wider" htmlFor="name">
                      Nom complet
                    </Label>
                    <div className="group relative">
                      <HugeiconsIcon
                        className="absolute top-1/2 left-4 size-5 -translate-y-1/2 text-foreground/40 transition-colors group-focus-within:text-primary"
                        icon={UserIcon}
                        strokeWidth={2}
                      />
                      <Input
                        className="h-14 rounded-2xl border-white/40 bg-white/50 pl-12 text-base shadow-inner transition-all hover:bg-white/60 focus:border-primary focus:bg-white/80 focus:ring-4 focus:ring-primary/10 dark:border-white/10 dark:bg-black/40 dark:hover:bg-black/50 dark:focus:bg-black/60"
                        id="name"
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Dr. Prénom Nom"
                        required
                        type="text"
                        value={name}
                      />
                    </div>
                  </motion.div>
                )}

                <div className="space-y-2.5">
                  <Label className="ml-1 text-foreground/80 text-xs font-semibold uppercase tracking-wider" htmlFor="email">
                    E-mail pro
                  </Label>
                  <div className="group relative">
                    <HugeiconsIcon
                      className="absolute top-1/2 left-4 size-5 -translate-y-1/2 text-foreground/40 transition-colors group-focus-within:text-primary"
                      icon={MailIcon}
                      strokeWidth={2}
                    />
                    <Input
                      className="h-14 rounded-2xl border-white/40 bg-white/50 pl-12 text-base shadow-inner transition-all hover:bg-white/60 focus:border-primary focus:bg-white/80 focus:ring-4 focus:ring-primary/10 dark:border-white/10 dark:bg-black/40 dark:hover:bg-black/50 dark:focus:bg-black/60"
                      id="email"
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="exemple@clinique.com"
                      required
                      type="email"
                      value={email}
                    />
                  </div>
                </div>

                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <Label className="ml-1 text-foreground/80 text-xs font-semibold uppercase tracking-wider" htmlFor="password">
                      Mot de passe
                    </Label>
                    {view === "login" && (
                      <button
                        className="text-[11px] font-semibold text-primary/80 uppercase tracking-wider transition-colors hover:text-primary"
                        type="button"
                      >
                        Oublié ?
                      </button>
                    )}
                  </div>
                  <div className="group relative">
                    <HugeiconsIcon
                      className="absolute top-1/2 left-4 size-5 -translate-y-1/2 text-foreground/40 transition-colors group-focus-within:text-primary"
                      icon={LockIcon}
                      strokeWidth={2}
                    />
                    <Input
                      className="h-14 rounded-2xl border-white/40 bg-white/50 pl-12 text-base shadow-inner transition-all hover:bg-white/60 focus:border-primary focus:bg-white/80 focus:ring-4 focus:ring-primary/10 dark:border-white/10 dark:bg-black/40 dark:hover:bg-black/50 dark:focus:bg-black/60"
                      id="password"
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      type="password"
                      value={password}
                    />
                  </div>
                </div>

                <Button
                  className="mt-8 h-14 w-full rounded-2xl text-lg font-medium shadow-[0_4px_14px_0_var(--tw-shadow-color)] shadow-primary/30 transition-all hover:-translate-y-0.5 hover:shadow-[0_6px_20px_var(--tw-shadow-color)] active:translate-y-0"
                  disabled={loading}
                  type="submit"
                >
                  {loading ? (
                    <Spinner className="size-6 text-primary-foreground" />
                  ) : (
                    <>
                      {view === "login" ? "Se connecter" : "Créer mon compte"}
                      <HugeiconsIcon
                        className="ml-2 size-5"
                        icon={ArrowRight01Icon}
                        strokeWidth={2.5}
                      />
                    </>
                  )}
                </Button>
              </form>

              <div className="mt-8 text-center text-foreground/70 text-sm font-medium">
                {view === "login" ? (
                  <div className="flex flex-col gap-3">
                    <span>Pas encore de compte ?</span>
                    <Button
                      className="h-12 w-full rounded-2xl border-white/40 bg-white/30 text-foreground hover:bg-white/50 shadow-sm backdrop-blur-md dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
                      onClick={() => {
                        setView("register");
                        setFormError("");
                      }}
                      variant="outline"
                    >
                      Demander un accès
                    </Button>
                  </div>
                ) : (
                  <Button
                    className="h-12 w-full rounded-2xl text-foreground hover:bg-white/30 dark:hover:bg-white/10"
                    onClick={() => {
                      setView("login");
                      setFormError("");
                    }}
                    variant="ghost"
                  >
                    <HugeiconsIcon
                      className="mr-2 size-4"
                      icon={ArrowLeft01Icon}
                      strokeWidth={2}
                    />
                    Retour à la connexion
                  </Button>
                )}
              </div>
            </div>

            <div className="mt-8 flex items-center justify-center gap-6 font-medium text-foreground/50 text-xs uppercase tracking-wider">
              <span className="cursor-pointer transition-colors hover:text-foreground/80">
                Conditions
              </span>
              <span className="size-1 rounded-full bg-foreground/20" />
              <span className="cursor-pointer transition-colors hover:text-foreground/80">
                Confidentialité
              </span>
            </div>
          </motion.div>
        </div>
      </motion.div>
    </MeshGradient>
  );
};

export default Auth;

