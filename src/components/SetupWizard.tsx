import React, { useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Key01Icon,
  UserCircle02Icon,
  MailIcon,
  LockIcon,
  ArrowRight01Icon,
  CheckmarkCircle02Icon,
  Alert02Icon,
  Shield01Icon,
  SparklesIcon,
  ArrowLeft01Icon,
  HeartPulse,
} from "@hugeicons/core-free-icons"
import {
  validateLicenseKey,
  formatLicenseKey,
} from "../services/licenseService"
import Logo from "./Logo"
import { APP_NAME, APP_TAGLINE } from "@/lib/brand"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Spinner } from "@/components/ui/spinner"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"

interface SetupWizardProps {
  onComplete: (userData: {
    name: string
    email: string
    password: string
    licenseKey: string
  }) => Promise<void>
}

const SetupWizard: React.FC<SetupWizardProps> = ({ onComplete }) => {
  const [step, setStep] = useState<1 | 2>(1)
  const [licenseKey, setLicenseKey] = useState("")
  const [email, setEmail] = useState("")
  const [name, setName] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const handleKeyChange = (value: string) => {
    const formatted = formatLicenseKey(value)
    setLicenseKey(formatted)
    setError("")
  }

  const handleValidateLicense = () => {
    if (!licenseKey || !email) {
      setError("Veuillez remplir tous les champs")
      return
    }
    if (!email.includes("@")) {
      setError("Adresse email invalide")
      return
    }
    if (!validateLicenseKey(licenseKey, email)) {
      setError("Clé de licence invalide pour cette adresse email")
      return
    }
    setError("")
    setStep(2)
  }

  const handleCreateAccount = async () => {
    if (!name || !password || !confirmPassword) {
      setError("Veuillez remplir tous les champs")
      return
    }
    if (password.length < 6) {
      setError("Le mot de passe doit contenir au moins 6 caractères")
      return
    }
    if (password !== confirmPassword) {
      setError("Les mots de passe ne correspondent pas")
      return
    }
    setIsLoading(true)
    setError("")
    try {
      await onComplete({ name, email, password, licenseKey })
    } catch (err) {
      setError("Erreur lors de la création du compte: " + String(err))
      setIsLoading(false)
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

      <div className="relative z-10 flex w-full max-w-md flex-col items-center">
        {/* Floating Branding Header */}
        <div className="mb-10 flex flex-col items-center text-center">
          <Logo size="xl" className="mb-6 drop-shadow-md" />
          <h1 className="font-heading text-3xl font-medium tracking-tight text-foreground sm:text-4xl">
            {step === 1 ? "Activation de Vetera" : "Bienvenue, Docteur."}
          </h1>
          <p className="mt-3 text-sm tracking-wide text-muted-foreground/80 sm:text-base">
            {step === 1
              ? "Préparez-vous à transformer votre pratique."
              : "Configuration de votre espace de travail."}
          </p>
        </div>

        {/* Glassmorphic Form Card */}
        <div className="w-full relative overflow-hidden rounded-[2rem] border border-white/20 bg-white/40 p-8 shadow-[0_8px_32px_rgba(0,0,0,0.04)] backdrop-blur-2xl dark:border-white/5 dark:bg-black/20 dark:shadow-[0_8px_32px_rgba(0,0,0,0.4)] sm:p-10">
          
          {/* Subtle inner light reflection */}
          <div className="absolute inset-x-0 -top-px h-px w-full bg-gradient-to-r from-transparent via-white/50 to-transparent dark:via-white/10" />

          {/* Steps indicator */}
          <div className="mb-8 flex items-center justify-center gap-3">
            <div
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-all duration-500",
                step >= 1
                  ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25"
                  : "bg-muted text-muted-foreground"
              )}
            >
              {step > 1 ? (
                <HugeiconsIcon icon={CheckmarkCircle02Icon} strokeWidth={2.5} className="size-4" />
              ) : (
                "1"
              )}
            </div>
            <div
              className={cn(
                "h-[2px] w-12 transition-colors duration-500 rounded-full",
                step >= 2 ? "bg-primary" : "bg-primary/10 dark:bg-primary/20"
              )}
            />
            <div
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-all duration-500",
                step >= 2
                  ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25"
                  : "bg-background border-2 border-muted-foreground/20 text-muted-foreground"
              )}
            >
              2
            </div>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="mb-6 flex animate-in fade-in slide-in-from-top-2 items-center gap-3 rounded-2xl border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive backdrop-blur-md">
              <HugeiconsIcon icon={Alert02Icon} strokeWidth={2} className="size-5 shrink-0" />
              <span className="font-medium">{error}</span>
            </div>
          )}

          {/* Step 1: License Form */}
          {step === 1 && (
            <div className="space-y-5 animate-in fade-in zoom-in-95 duration-300">
              <div className="space-y-2.5">
                <Label htmlFor="setup-email" className="ml-1 text-xs uppercase tracking-widest text-muted-foreground">Adresse email</Label>
                <div className="relative group">
                  <HugeiconsIcon
                    icon={MailIcon}
                    strokeWidth={2}
                    className="absolute top-1/2 left-4 size-5 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary"
                  />
                  <Input
                    id="setup-email"
                    type="email"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setError(""); }}
                    className="h-12 rounded-xl border-white/20 bg-white/50 pl-11 shadow-sm backdrop-blur-sm transition-all focus:border-primary focus:bg-white dark:border-white/5 dark:bg-black/30 dark:focus:bg-black/50"
                    placeholder="docteur@clinique.com"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2.5">
                <Label htmlFor="setup-license" className="ml-1 text-xs uppercase tracking-widest text-muted-foreground">Clé de licence</Label>
                <div className="relative group">
                  <HugeiconsIcon
                    icon={Key01Icon}
                    strokeWidth={2}
                    className="absolute top-1/2 left-4 size-5 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary"
                  />
                  <Input
                    id="setup-license"
                    type="text"
                    value={licenseKey}
                    onChange={(e) => handleKeyChange(e.target.value)}
                    className="h-12 rounded-xl border-white/20 bg-white/50 pl-11 font-mono tracking-widest uppercase shadow-sm backdrop-blur-sm transition-all focus:border-primary focus:bg-white dark:border-white/5 dark:bg-black/30 dark:focus:bg-black/50"
                    placeholder="XXXX-XXXX-XXXX-XXXX"
                    maxLength={19}
                    required
                  />
                </div>
              </div>

              <Button onClick={handleValidateLicense} size="lg" className="mt-4 w-full rounded-xl text-base shadow-lg shadow-primary/20 transition-all hover:scale-[1.02] hover:shadow-primary/30">
                Vérifier l'accès
                <HugeiconsIcon icon={ArrowRight01Icon} strokeWidth={2.5} className="ml-2 size-5" />
              </Button>
            </div>
          )}

          {/* Step 2: Account Form */}
          {step === 2 && (
            <div className="space-y-5 animate-in slide-in-from-right-4 fade-in duration-500">
              <div className="flex items-center justify-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3.5 text-sm font-medium text-emerald-700 backdrop-blur-sm dark:border-emerald-500/10 dark:text-emerald-400">
                <HugeiconsIcon icon={Shield01Icon} strokeWidth={2.5} className="size-4 shrink-0" />
                <span>Licence authentifiée</span>
              </div>

              <div className="space-y-2.5">
                <Label htmlFor="setup-name" className="ml-1 text-xs uppercase tracking-widest text-muted-foreground">Nom complet</Label>
                <div className="relative group">
                  <HugeiconsIcon icon={UserCircle02Icon} strokeWidth={2} className="absolute top-1/2 left-4 size-5 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary" />
                  <Input
                    id="setup-name"
                    type="text"
                    value={name}
                    onChange={(e) => { setName(e.target.value); setError(""); }}
                    className="h-12 rounded-xl border-white/20 bg-white/50 pl-11 shadow-sm backdrop-blur-sm transition-all focus:border-primary focus:bg-white dark:border-white/5 dark:bg-black/30 dark:focus:bg-black/50"
                    placeholder="Dr. Prénom Nom"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2.5">
                <Label htmlFor="setup-password" className="ml-1 text-xs uppercase tracking-widest text-muted-foreground">Mot de passe secret</Label>
                <div className="relative group">
                  <HugeiconsIcon icon={LockIcon} strokeWidth={2} className="absolute top-1/2 left-4 size-5 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary" />
                  <Input
                    id="setup-password"
                    type="password"
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setError(""); }}
                    className="h-12 rounded-xl border-white/20 bg-white/50 pl-11 shadow-sm backdrop-blur-sm transition-all focus:border-primary focus:bg-white dark:border-white/5 dark:bg-black/30 dark:focus:bg-black/50"
                    placeholder="••••••••"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2.5">
                <Label htmlFor="setup-confirm" className="ml-1 text-xs uppercase tracking-widest text-muted-foreground">Confirmer le mot de passe</Label>
                <div className="relative group">
                  <HugeiconsIcon icon={LockIcon} strokeWidth={2} className="absolute top-1/2 left-4 size-5 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary" />
                  <Input
                    id="setup-confirm"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => { setConfirmPassword(e.target.value); setError(""); }}
                    className="h-12 rounded-xl border-white/20 bg-white/50 pl-11 shadow-sm backdrop-blur-sm transition-all focus:border-primary focus:bg-white dark:border-white/5 dark:bg-black/30 dark:focus:bg-black/50"
                    placeholder="••••••••"
                    required
                  />
                </div>
              </div>

              <div className="pt-2">
                <Button onClick={handleCreateAccount} disabled={isLoading} size="lg" className="w-full rounded-xl text-base shadow-lg shadow-primary/20 transition-all hover:scale-[1.02] hover:shadow-primary/30">
                  {isLoading ? <Spinner className="size-5" /> : <>Terminer l'installation <HugeiconsIcon icon={SparklesIcon} strokeWidth={2.5} className="ml-2 size-5" /></>}
                </Button>
              </div>

              <div className="flex justify-center pt-2">
                <Button variant="ghost" size="sm" className="text-muted-foreground hover:bg-white/20 hover:text-foreground dark:hover:bg-white/5" onClick={() => setStep(1)}>
                  <HugeiconsIcon icon={ArrowLeft01Icon} strokeWidth={2} className="mr-2 size-4" /> Retour
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Floating Footer */}
        <div className="mt-10 flex items-center justify-center gap-6 text-sm font-medium text-muted-foreground/60">
          <span className="flex items-center gap-1.5 hover:text-foreground transition-colors"><HugeiconsIcon icon={Shield01Icon} strokeWidth={2} className="size-4" /> Crypté & Sécurisé</span>
          <span className="h-1 w-1 rounded-full bg-muted-foreground/30" />
          <span className="hover:text-foreground transition-colors">Support Vetera</span>
        </div>
      </div>
    </div>
  )
}

export default SetupWizard
