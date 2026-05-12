import {
  Alert02Icon,
  ArrowLeft01Icon,
  ArrowRight01Icon,
  LockIcon,
  MailIcon,
  UserIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type React from "react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
    <div className="relative flex min-h-screen w-full overflow-hidden bg-background lg:grid lg:grid-cols-2">
      {/* Left Panel - Hero Visuals */}
      <div className="relative hidden w-full flex-col justify-between overflow-hidden border-border border-r bg-card p-10 text-foreground lg:flex">
        <div className="flex items-center justify-between">
          <Logo className="shrink-0" size="xl" />
          <span className="rounded-full border border-border bg-background px-3 py-1 font-medium text-muted-foreground text-xs">
            {APP_TAGLINE}
          </span>
        </div>

        <div className="max-w-[29rem]">
          <h1 className="font-heading font-semibold text-5xl text-foreground leading-[1.04]">
            L'innovation vétérinaire commence ici.
          </h1>
          <p className="mt-6 max-w-md text-base text-muted-foreground leading-7">
            Une interface claire, rapide et premium pour gérer les patients, les
            rendez-vous et les opérations de la clinique.
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
                +2,000 professionnels
              </p>
              <p className="text-muted-foreground text-xs">
                font avancer la médecine vétérinaire
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="relative z-10 flex w-full flex-col items-center justify-center p-6 lg:p-12">
        {/* Only show logo here on small screens */}
        <div className="fade-in slide-in-from-bottom-4 mb-10 flex animate-in flex-col items-center text-center duration-700 lg:hidden">
          <Logo className="mb-6 drop-shadow-md" size="xl" />
        </div>

        <div className="w-full max-w-[26rem] flex-col items-center">
          <div className="fade-in slide-in-from-bottom-4 mb-8 flex animate-in flex-col items-center text-center duration-700">
            <h1 className="font-heading font-medium text-3xl text-foreground drop-shadow-sm sm:text-4xl">
              {view === "login" ? "Bon retour" : `Rejoignez ${APP_NAME}`}
            </h1>
            <p className="mt-3 text-muted-foreground/80 text-sm sm:text-base">
              {view === "login"
                ? "Gérez votre clinique en toute simplicité."
                : "Créez votre compte et découvrez l'outil de demain."}
            </p>
          </div>

          <div className="fade-in zoom-in-95 relative w-full animate-in overflow-hidden rounded-2xl border border-border bg-card p-8 shadow-soft duration-500 sm:p-10">
            {(authError || formError) && (
              <div className="fade-in slide-in-from-top-2 mb-6 flex animate-in items-center gap-3 rounded-2xl border border-destructive/20 bg-destructive/10 p-4 text-destructive text-sm backdrop-blur-md">
                <HugeiconsIcon
                  className="size-5 shrink-0"
                  icon={Alert02Icon}
                  strokeWidth={2}
                />
                <span className="font-medium leading-snug">
                  {authError || formError}
                </span>
              </div>
            )}

            <form className="space-y-5" onSubmit={handleSubmit}>
              {view === "register" && (
                <div className="fade-in slide-in-from-right-4 animate-in space-y-2.5 duration-300">
                  <Label
                    className="st ml-1 text-muted-foreground text-xs uppercase"
                    htmlFor="name"
                  >
                    Nom complet
                  </Label>
                  <div className="group relative">
                    <HugeiconsIcon
                      className="absolute top-1/2 left-4 size-5 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary"
                      icon={UserIcon}
                      strokeWidth={2}
                    />
                    <Input
                      className="h-12 rounded-xl border-border bg-background pl-11 shadow-sm transition-all focus:border-primary focus:bg-background"
                      id="name"
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Dr. Prénom Nom"
                      required
                      type="text"
                      value={name}
                    />
                  </div>
                </div>
              )}

              <div className="space-y-2.5">
                <Label
                  className="st ml-1 text-muted-foreground text-xs uppercase"
                  htmlFor="email"
                >
                  E-mail pro
                </Label>
                <div className="group relative">
                  <HugeiconsIcon
                    className="absolute top-1/2 left-4 size-5 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary"
                    icon={MailIcon}
                    strokeWidth={2}
                  />
                  <Input
                    className="h-12 rounded-xl border-border bg-background pl-11 shadow-sm transition-all focus:border-primary focus:bg-background"
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
                  <Label
                    className="st ml-1 text-muted-foreground text-xs uppercase"
                    htmlFor="password"
                  >
                    Mot de passe
                  </Label>
                  {view === "login" && (
                    <button
                      className="st text-[11px] text-primary/70 uppercase opacity-80 transition-colors hover:text-primary hover:opacity-100"
                      type="button"
                    >
                      Oublié ?
                    </button>
                  )}
                </div>
                <div className="group relative">
                  <HugeiconsIcon
                    className="absolute top-1/2 left-4 size-5 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary"
                    icon={LockIcon}
                    strokeWidth={2}
                  />
                  <Input
                    className="r h-12 rounded-xl border-border bg-background pl-11 shadow-sm transition-all focus:border-primary focus:bg-background"
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
                className="mt-6 w-full rounded-xl text-base shadow-soft transition-all hover:shadow-[var(--shadow-lift)]"
                disabled={loading}
                size="lg"
                type="submit"
              >
                {loading ? (
                  <Spinner className="size-5" />
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

            <div className="mt-8 text-center text-muted-foreground/80 text-sm">
              {view === "login" ? (
                <div className="flex flex-col gap-2">
                  <span>Pas encore de compte ?</span>
                  <Button
                    className="w-full rounded-xl border-border bg-background hover:bg-muted"
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
                  className="w-full rounded-xl hover:bg-background/80"
                  onClick={() => {
                    setView("login");
                    setFormError("");
                  }}
                  size="sm"
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

          <div className="fade-in slide-in-from-top-4 mt-10 flex animate-in items-center justify-center gap-6 font-medium text-muted-foreground/60 text-sm duration-700">
            <span className="cursor-pointer transition-colors hover:text-foreground">
              Conditions
            </span>
            <span className="h-1 w-1 rounded-full bg-muted-foreground/30" />
            <span className="cursor-pointer transition-colors hover:text-foreground">
              Confidentialité
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;
