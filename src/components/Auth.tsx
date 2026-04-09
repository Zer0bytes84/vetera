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
    <div className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-background p-6">
      {/* Ambient Mesh Gradient Background */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        {/* Top left primary glow */}
        <div className="absolute -left-[10%] -top-[10%] h-[50vh] w-[50vw] animate-pulse rounded-full bg-[var(--chart-1)]/20 blur-[120px] mix-blend-multiply duration-[10000ms] dark:bg-[var(--chart-1)]/15 dark:mix-blend-screen" />
        {/* Middle right secondary glow */}
        <div className="absolute -right-[10%] top-[20%] h-[60vh] w-[45vw] rounded-full bg-[var(--chart-2)]/15 blur-[120px] mix-blend-multiply dark:bg-[var(--chart-2)]/10 dark:mix-blend-screen" />
        {/* Bottom center deep glow */}
        <div className="absolute -bottom-[20%] left-[20%] h-[50vh] w-[60vw] rounded-full bg-[var(--chart-3)]/15 blur-[140px] mix-blend-multiply dark:bg-[var(--chart-3)]/10 dark:mix-blend-screen" />
      </div>

      <div className="relative z-10 flex w-full max-w-[26rem] flex-col items-center">
        {/* Floating Branding Header */}
        <div className="mb-10 flex flex-col items-center text-center animate-in fade-in slide-in-from-bottom-4 duration-700">
          <Logo size="xl" className="mb-6 drop-shadow-md" />
          <h1 className="font-heading text-3xl font-medium tracking-tight text-foreground sm:text-4xl drop-shadow-sm">
            {view === "login" ? "Bon retour" : "Rejoignez Vetera"}
          </h1>
          <p className="mt-3 text-sm tracking-wide text-muted-foreground/80 sm:text-base">
            {view === "login"
              ? "Gérez votre clinique en toute simplicité."
              : "Créez votre compte et découvrez l'outil de demain."}
          </p>
        </div>

        {/* Glassmorphic Form Card */}
        <div className="w-full relative overflow-hidden rounded-[2.5rem] border border-white/20 bg-white/40 p-8 pt-10 shadow-[0_8px_32px_rgba(0,0,0,0.04)] backdrop-blur-2xl dark:border-white/5 dark:bg-black/20 dark:shadow-[0_8px_32px_rgba(0,0,0,0.4)] sm:p-10 animate-in fade-in zoom-in-95 duration-500">
          
          {/* Subtle inner light reflection */}
          <div className="absolute inset-x-0 -top-px h-px w-full bg-gradient-to-r from-transparent via-white/50 to-transparent dark:via-white/10" />

          {/* Error Banner */}
          {(authError || formError) && (
            <div className="mb-6 flex animate-in fade-in slide-in-from-top-2 items-center gap-3 rounded-2xl border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive backdrop-blur-md">
              <HugeiconsIcon icon={Alert02Icon} strokeWidth={2} className="size-5 shrink-0" />
              <span className="font-medium leading-snug">{authError || formError}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {view === "register" && (
              <div className="space-y-2.5 animate-in fade-in slide-in-from-right-4 duration-300">
                <Label htmlFor="name" className="ml-1 text-xs uppercase tracking-widest text-muted-foreground">Nom complet</Label>
                <div className="relative group">
                  <HugeiconsIcon icon={UserIcon} strokeWidth={2} className="absolute top-1/2 left-4 size-5 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary" />
                  <Input
                    id="name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="h-12 rounded-xl border-white/20 bg-white/50 pl-11 shadow-sm backdrop-blur-sm transition-all focus:border-primary focus:bg-white dark:border-white/5 dark:bg-black/30 dark:focus:bg-black/50"
                    placeholder="Dr. Prénom Nom"
                    required
                  />
                </div>
              </div>
            )}

            <div className="space-y-2.5">
              <Label htmlFor="email" className="ml-1 text-xs uppercase tracking-widest text-muted-foreground">E-mail pro</Label>
              <div className="relative group">
                <HugeiconsIcon icon={MailIcon} strokeWidth={2} className="absolute top-1/2 left-4 size-5 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-12 rounded-xl border-white/20 bg-white/50 pl-11 shadow-sm backdrop-blur-sm transition-all focus:border-primary focus:bg-white dark:border-white/5 dark:bg-black/30 dark:focus:bg-black/50"
                  placeholder="exemple@clinique.com"
                  required
                />
              </div>
            </div>

            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="ml-1 text-xs uppercase tracking-widest text-muted-foreground">Mot de passe</Label>
                {view === "login" && (
                  <button type="button" className="text-[11px] uppercase tracking-widest text-primary/70 opacity-80 hover:text-primary hover:opacity-100 transition-colors">
                    Oublié ?
                  </button>
                )}
              </div>
              <div className="relative group">
                <HugeiconsIcon icon={LockIcon} strokeWidth={2} className="absolute top-1/2 left-4 size-5 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary" />
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-12 rounded-xl border-white/20 bg-white/50 pl-11 tracking-wider shadow-sm backdrop-blur-sm transition-all focus:border-primary focus:bg-white dark:border-white/5 dark:bg-black/30 dark:focus:bg-black/50"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            <Button type="submit" disabled={loading} size="lg" className="mt-6 w-full rounded-xl text-base shadow-lg shadow-primary/20 transition-all hover:scale-[1.02] hover:shadow-primary/30">
              {loading ? (
                <Spinner className="size-5" />
              ) : (
                <>
                  {view === "login" ? "Se connecter" : "Créer mon compte"}
                  <HugeiconsIcon icon={ArrowRight01Icon} strokeWidth={2.5} className="ml-2 size-5" />
                </>
              )}
            </Button>
          </form>

          {/* Toggle View */}
          <div className="mt-8 text-center text-sm text-muted-foreground/80">
            {view === "login" ? (
              <div className="flex flex-col gap-2">
                <span>Pas encore de compte ?</span>
                <Button variant="outline" className="w-full rounded-xl border-white/20 bg-white/30 backdrop-blur-sm hover:bg-white/50 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10" onClick={() => { setView("register"); setFormError(""); }}>
                  Demander un accès
                </Button>
              </div>
            ) : (
              <Button variant="ghost" size="sm" className="w-full rounded-xl hover:bg-white/20 dark:hover:bg-white/5" onClick={() => { setView("login"); setFormError(""); }}>
                <HugeiconsIcon icon={ArrowLeft01Icon} strokeWidth={2} className="mr-2 size-4" />
                Retour à la connexion
              </Button>
            )}
          </div>
        </div>

        {/* Floating Footer */}
        <div className="mt-10 flex items-center justify-center gap-6 text-sm font-medium text-muted-foreground/60 animate-in fade-in slide-in-from-top-4 duration-700">
          <span className="hover:text-foreground transition-colors cursor-pointer">Conditions</span>
          <span className="h-1 w-1 rounded-full bg-muted-foreground/30" />
          <span className="hover:text-foreground transition-colors cursor-pointer">Confidentialité</span>
        </div>
      </div>
    </div>
  )
}

export default Auth
