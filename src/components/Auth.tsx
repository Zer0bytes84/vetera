import React, { useState } from "react"
import { useAuth } from "../contexts/AuthContext"
import Logo from "./Logo"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  MailIcon,
  LockIcon,
  UserIcon,
  ArrowRight01Icon,
  Alert02Icon,
  ArrowLeft01Icon,
  Shield01Icon,
  SparklesIcon,
  CheckmarkCircle02Icon,
  HeartPulse,
} from "@hugeicons/core-free-icons"
import { APP_NAME, APP_TAGLINE } from "@/lib/brand"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Spinner } from "@/components/ui/spinner"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"

const Auth: React.FC = () => {
  const [view, setView] = useState<"login" | "register">("login")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [name, setName] = useState("")
  const [formError, setFormError] = useState("")
  const [loading, setLoading] = useState(false)
  const { login, register, error: authError } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError("")
    setLoading(true)
    try {
      if (view === "login") {
        await login(email, password)
      } else if (view === "register") {
        await register(email, password, name)
      }
    } catch (err: any) {
      console.error(err)
      setFormError(
        err.message || "Une erreur est survenue. Veuillez réessayer."
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen w-full">
      {/* Left panel — Branding */}
      <div className="relative hidden w-1/2 flex-col justify-between bg-gradient-to-br from-primary to-primary/80 p-10 text-primary-foreground lg:flex">
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-10">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)`,
              backgroundSize: "32px 32px",
            }}
          />
        </div>

        {/* Top */}
        <div className="relative z-10 space-y-2">
          <Logo size="lg" className="text-primary-foreground" />
          <p className="pl-14 text-sm text-primary-foreground/70">
            {APP_TAGLINE}
          </p>
        </div>

        {/* Center */}
        <div className="relative z-10 space-y-6">
          <div className="space-y-3">
            <h1 className="text-3xl font-bold tracking-tight">
              {view === "login"
                ? "Bon retour parmi nous"
                : "Bienvenue sur Vetera"}
            </h1>
            <p className="max-w-md text-lg text-primary-foreground/80">
              {view === "login"
                ? "Retrouvez votre tableau de bord et gérez votre clinique en toute simplicité."
                : "Créez votre compte et découvrez un outil pensé pour les vétérinaires modernes."}
            </p>
          </div>

          {/* Feature list */}
          <div className="space-y-3">
            {[
              {
                icon: HeartPulse,
                text: "Suivi médical complet des patients",
              },
              { icon: SparklesIcon, text: "Assistant IA local & intelligent" },
              { icon: Shield01Icon, text: "Données sécurisées et privées" },
            ].map((feature, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary-foreground/15">
                  <HugeiconsIcon
                    icon={feature.icon}
                    strokeWidth={2}
                    className="size-4"
                  />
                </div>
                <span className="text-sm text-primary-foreground/90">
                  {feature.text}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom */}
        <div className="relative z-10 flex items-center gap-2 text-sm text-primary-foreground/60">
          <HugeiconsIcon
            icon={CheckmarkCircle02Icon}
            strokeWidth={2}
            className="size-4 text-primary-foreground/40"
          />
          <span>{APP_NAME} — Logiciel de gestion vétérinaire</span>
        </div>
      </div>

      {/* Right panel — Form */}
      <div className="flex w-full flex-col items-center justify-center p-6 lg:w-1/2">
        <div className="w-full max-w-sm space-y-8">
          {/* Mobile logo */}
          <div className="lg:hidden">
            <div className="mb-2 flex justify-center">
              <Logo size="lg" />
            </div>
          </div>

          {/* Header */}
          <div className="space-y-2 text-center lg:text-left">
            <h2 className="text-2xl font-semibold tracking-tight text-foreground">
              {view === "login" ? "Connexion" : "Créer un compte"}
            </h2>
            <p className="text-sm text-muted-foreground">
              {view === "login"
                ? "Entrez vos identifiants pour accéder à votre espace"
                : "Remplissez le formulaire pour commencer. Le premier compte créé devient le compte principal."}
            </p>
          </div>

          {/* Error */}
          {(authError || formError) && (
            <div className="flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive">
              <HugeiconsIcon
                icon={Alert02Icon}
                strokeWidth={2}
                className="size-4 shrink-0"
              />
              <span>{authError || formError}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {view === "register" && (
              <div className="space-y-2">
                <Label htmlFor="name">Nom complet</Label>
                <div className="relative">
                  <HugeiconsIcon
                    icon={UserIcon}
                    strokeWidth={2}
                    className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                  />
                  <Input
                    id="name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="pl-9"
                    placeholder="Dr. Prénom Nom"
                    required
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <HugeiconsIcon
                  icon={MailIcon}
                  strokeWidth={2}
                  className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-9"
                  placeholder="exemple@clinique.com"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Mot de passe</Label>
                {view === "login" && (
                  <button
                    type="button"
                    className="text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground"
                  >
                    Mot de passe oublié ?
                  </button>
                )}
              </div>
              <div className="relative">
                <HugeiconsIcon
                  icon={LockIcon}
                  strokeWidth={2}
                  className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                />
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-9"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            <Button type="submit" disabled={loading} className="w-full">
              {loading ? (
                <Spinner className="size-4" />
              ) : (
                <>
                  {view === "login" ? "Se connecter" : "Créer mon compte"}
                  <HugeiconsIcon
                    icon={ArrowRight01Icon}
                    strokeWidth={2}
                    className="size-4"
                    data-icon="inline-end"
                  />
                </>
              )}
            </Button>
          </form>

          <Separator />

          {/* Toggle */}
          <div className="text-center text-sm text-muted-foreground">
            {view === "login" ? (
              <>
                Pas encore de compte ?{" "}
                <Button
                  variant="link"
                  className="px-1 font-medium text-foreground"
                  onClick={() => {
                    setView("register")
                    setFormError("")
                  }}
                >
                  S'inscrire
                </Button>
              </>
            ) : (
              <div className="flex items-center justify-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto p-0 text-muted-foreground"
                  onClick={() => {
                    setView("login")
                    setFormError("")
                  }}
                >
                  <HugeiconsIcon
                    icon={ArrowLeft01Icon}
                    strokeWidth={2}
                    className="mr-1 size-3.5"
                  />
                  Retour à la connexion
                </Button>
              </div>
            )}
          </div>

          {/* Footer */}
          <p className="text-center text-xs text-muted-foreground/60">
            {APP_NAME} · © {new Date().getFullYear()}
          </p>
        </div>
      </div>
    </div>
  )
}

export default Auth
