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
              {step === 1 ? "Activation de la licence" : "Création du compte"}
            </h1>
            <p className="max-w-md text-lg text-primary-foreground/80">
              {step === 1
                ? "Activez votre licence pour débloquer toutes les fonctionnalités de Vetera."
                : "Configurez votre compte administrateur pour commencer à utiliser l'application."}
            </p>
          </div>

          {/* Steps indicator */}
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-colors",
                step >= 1
                  ? "bg-primary-foreground text-primary"
                  : "bg-primary-foreground/20 text-primary-foreground/40"
              )}
            >
              {step > 1 ? (
                <HugeiconsIcon
                  icon={CheckmarkCircle02Icon}
                  strokeWidth={2}
                  className="size-4"
                />
              ) : (
                "1"
              )}
            </div>
            <div
              className={cn(
                "h-px flex-1 transition-colors",
                step >= 2
                  ? "bg-primary-foreground/60"
                  : "bg-primary-foreground/20"
              )}
            />
            <div
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-colors",
                step >= 2
                  ? "bg-primary-foreground text-primary"
                  : "bg-primary-foreground/20 text-primary-foreground/40"
              )}
            >
              2
            </div>
          </div>

          {/* Feature list */}
          <div className="space-y-3">
            {[
              { icon: Shield01Icon, text: "Licence valide à vie" },
              { icon: HeartPulse, text: "Suivi médical complet" },
              { icon: SparklesIcon, text: "Assistant IA intégré" },
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
          <span>
            {APP_NAME} · {APP_TAGLINE}
          </span>
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
            {/* Mobile step indicator */}
            <div className="mt-4 flex items-center justify-center gap-3">
              <div
                className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold",
                  step >= 1
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {step > 1 ? (
                  <HugeiconsIcon
                    icon={CheckmarkCircle02Icon}
                    strokeWidth={2}
                    className="size-3.5"
                  />
                ) : (
                  "1"
                )}
              </div>
              <div
                className={cn(
                  "h-px w-12 transition-colors",
                  step >= 2 ? "bg-primary" : "bg-muted"
                )}
              />
              <div
                className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold",
                  step >= 2
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                )}
              >
                2
              </div>
            </div>
          </div>

          {/* Header */}
          <div className="space-y-2 text-center lg:text-left">
            <h2 className="text-2xl font-semibold tracking-tight text-foreground">
              {step === 1 ? "Activation de la licence" : "Créer votre compte"}
            </h2>
            <p className="text-sm text-muted-foreground">
              {step === 1
                ? "Entrez votre clé de licence et l'email associé"
                : "Configurez votre compte administrateur"}
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive">
              <HugeiconsIcon
                icon={Alert02Icon}
                strokeWidth={2}
                className="size-4 shrink-0"
              />
              <span>{error}</span>
            </div>
          )}

          {/* Step 1: License */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="setup-email">Adresse email</Label>
                <div className="relative">
                  <HugeiconsIcon
                    icon={MailIcon}
                    strokeWidth={2}
                    className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                  />
                  <Input
                    id="setup-email"
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value)
                      setError("")
                    }}
                    className="pl-9"
                    placeholder="dr.example@clinique.com"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="setup-license">Clé de licence</Label>
                <div className="relative">
                  <HugeiconsIcon
                    icon={Key01Icon}
                    strokeWidth={2}
                    className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                  />
                  <Input
                    id="setup-license"
                    type="text"
                    value={licenseKey}
                    onChange={(e) => handleKeyChange(e.target.value)}
                    className="pl-9 font-mono tracking-wider uppercase"
                    placeholder="XXXX-XXXX-XXXX-XXXX"
                    maxLength={19}
                    required
                  />
                </div>
              </div>

              <Button onClick={handleValidateLicense} className="w-full">
                Continuer
                <HugeiconsIcon
                  icon={ArrowRight01Icon}
                  strokeWidth={2}
                  className="size-4"
                  data-icon="inline-end"
                />
              </Button>

              <p className="text-center text-xs text-muted-foreground">
                Pas de licence ? Contactez votre administrateur {APP_NAME}
              </p>
            </div>
          )}

          {/* Step 2: Account */}
          {step === 2 && (
            <div className="space-y-4">
              {/* Verified email */}
              <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-500/5 p-3 text-sm text-emerald-700 dark:border-emerald-800 dark:text-emerald-400">
                <HugeiconsIcon
                  icon={CheckmarkCircle02Icon}
                  strokeWidth={2}
                  className="size-4 shrink-0"
                />
                <span>
                  Licence activée pour <strong>{email}</strong>
                </span>
              </div>

              <div className="space-y-2">
                <Label htmlFor="setup-name">Nom complet</Label>
                <div className="relative">
                  <HugeiconsIcon
                    icon={UserCircle02Icon}
                    strokeWidth={2}
                    className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                  />
                  <Input
                    id="setup-name"
                    type="text"
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value)
                      setError("")
                    }}
                    className="pl-9"
                    placeholder="Dr. Prénom Nom"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="setup-password">Mot de passe</Label>
                <div className="relative">
                  <HugeiconsIcon
                    icon={LockIcon}
                    strokeWidth={2}
                    className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                  />
                  <Input
                    id="setup-password"
                    type="password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value)
                      setError("")
                    }}
                    className="pl-9"
                    placeholder="••••••••"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="setup-confirm">Confirmer le mot de passe</Label>
                <div className="relative">
                  <HugeiconsIcon
                    icon={LockIcon}
                    strokeWidth={2}
                    className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                  />
                  <Input
                    id="setup-confirm"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value)
                      setError("")
                    }}
                    className="pl-9"
                    placeholder="••••••••"
                    required
                  />
                </div>
              </div>

              <Button
                onClick={handleCreateAccount}
                disabled={isLoading}
                className="w-full"
              >
                {isLoading ? (
                  <Spinner className="size-4" />
                ) : (
                  <>
                    <HugeiconsIcon
                      icon={CheckmarkCircle02Icon}
                      strokeWidth={2}
                      className="size-4"
                    />
                    Créer mon compte
                  </>
                )}
              </Button>

              <Separator />

              <Button
                variant="ghost"
                size="sm"
                className="w-full text-muted-foreground"
                onClick={() => setStep(1)}
              >
                <HugeiconsIcon
                  icon={ArrowLeft01Icon}
                  strokeWidth={2}
                  className="mr-1.5 size-3.5"
                />
                Retour à l'activation
              </Button>
            </div>
          )}

          {/* Footer */}
          <p className="text-center text-xs text-muted-foreground/60">
            {APP_NAME} · © {new Date().getFullYear()}
          </p>
        </div>
      </div>
    </div>
  )
}

export default SetupWizard
