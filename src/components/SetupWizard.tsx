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
    <div className="relative flex min-h-screen w-full lg:grid lg:grid-cols-2 overflow-hidden bg-background">
      
      {/* Left Panel - Hero Visuals */}
      <div className="relative hidden w-full flex-col bg-zinc-950 p-10 text-white lg:flex justify-between overflow-hidden">
        {/* Spectacular Geometric Mesh only inside the left panel */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.05)_1px,transparent_1.5px)] bg-[length:24px_24px]" />
        
        {/* Top Glow & Drift - Toned down */}
        <div className="pointer-events-none absolute inset-0 transform-gpu overflow-hidden">
          <div className="absolute top-[-10%] right-[-10%] w-[70%] aspect-square rounded-full mix-blend-screen filter blur-[100px] opacity-15 animate-mesh-drift bg-gradient-to-tr from-rose-400/50 via-fuchsia-500/50 to-indigo-500/50" />
          <div className="absolute bottom-[-10%] left-[-10%] w-[80%] aspect-square rounded-full mix-blend-screen filter blur-[120px] opacity-10 animate-mesh-drift-slow bg-gradient-to-tl from-cyan-400/50 via-blue-500/50 to-purple-600/50" />
          <div className="absolute top-[30%] left-[20%] w-[50%] aspect-square rounded-full mix-blend-screen filter blur-[110px] opacity-[0.08] animate-mesh-drift bg-gradient-to-br from-amber-300/50 to-orange-500/50" />
        </div>

        {/* Left Content */}
        <div className="relative z-10 flex flex-col justify-between h-full">
          <div className="dark">
            <Logo size="xl" className="mb-6 drop-shadow-md brightness-200" />
            <h1 className="mt-14 font-heading text-4xl font-medium tracking-tight text-white/90 sm:text-5xl leading-tight">
              Rejoignez <br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-300 to-indigo-300">
                la nouvelle ère
              </span>
              <br/> de votre clinique.
            </h1>
            <p className="mt-6 max-w-md text-lg text-zinc-400">
              Activez votre compte pour découvrir une plateforme ultra-moderne conçue pour redéfinir la gestion vétérinaire.
            </p>
          </div>
          
          <div className="flex gap-5 items-center bg-white/5 p-4 pr-6 rounded-2xl w-max backdrop-blur-md border border-white/10 shadow-xl">
            <div className="flex -space-x-3">
              {[
                "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?q=80&w=200&auto=format&fit=crop",
                "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?q=80&w=200&auto=format&fit=crop",
                "https://images.unsplash.com/photo-1622253692010-333f2da6031d?q=80&w=200&auto=format&fit=crop",
                "https://images.unsplash.com/photo-1537368910025-700350fe46c7?q=80&w=200&auto=format&fit=crop"
              ].map((src, i) => (
                <div key={i} className="rounded-full ring-2 ring-zinc-950 overflow-hidden size-12 shadow-md">
                   <img src={src} alt="Professionnel" className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
            <div className="flex flex-col justify-center text-xs text-zinc-400">
              <div className="flex items-center gap-1.5 mb-0.5">
                {[1, 2, 3, 4, 5].map((star) => (
                  <svg key={star} className="w-3.5 h-3.5 text-amber-500 fill-amber-500" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.176 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
              <span className="text-white font-medium text-[13px] leading-tight">Déjà activé par</span>
              <span className="text-[11px] mt-0.5">+2,000 cliniques leaders</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Setup Wizard Form */}
      <div className="relative flex w-full flex-col items-center justify-center p-6 lg:p-12 z-10">
        
        {/* Only show logo here on small screens */}
        <div className="lg:hidden mb-10 flex flex-col items-center text-center">
          <Logo size="xl" className="mb-6 drop-shadow-md" />
        </div>

        <div className="w-full max-w-md flex-col items-center">
          <div className="mb-8 flex flex-col items-center text-center">
            <h1 className="font-heading text-3xl font-medium tracking-tight text-foreground sm:text-4xl">
              {step === 1 ? `Activation de ${APP_NAME}` : "Bienvenue, Docteur."}
            </h1>
            <p className="mt-3 text-sm tracking-wide text-muted-foreground/80 sm:text-base">
              {step === 1
                ? "Préparez-vous à transformer votre pratique."
                : "Configuration de votre espace de travail."}
            </p>
          </div>

          <div className="w-full relative overflow-hidden rounded-[2rem] border border-border/50 bg-background/50 p-8 shadow-[0_8px_32px_rgba(0,0,0,0.04)] sm:p-10">
            {/* Steps indicator */}
            <div className="mb-8 flex items-center justify-center gap-3">
              <div
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold transition-all duration-500",
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
                  "flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold transition-all duration-500",
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
                      className="h-12 rounded-xl border-border/50 bg-background/50 pl-11 shadow-sm transition-all focus:border-primary focus:bg-background"
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
                      className="h-12 rounded-xl border-border/50 bg-background/50 pl-11 font-mono tracking-widest uppercase shadow-sm transition-all focus:border-primary focus:bg-background"
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
                      className="h-12 rounded-xl border-border/50 bg-background/50 pl-11 shadow-sm transition-all focus:border-primary focus:bg-background"
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
                      className="h-12 rounded-xl border-border/50 bg-background/50 pl-11 shadow-sm transition-all focus:border-primary focus:bg-background"
                      placeholder="••••••••"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2.5">
                  <Label htmlFor="setup-confirm" className="ml-1 text-xs uppercase tracking-widest text-muted-foreground">Confirmer le {`mot de passe`}</Label>
                  <div className="relative group">
                    <HugeiconsIcon icon={LockIcon} strokeWidth={2} className="absolute top-1/2 left-4 size-5 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary" />
                    <Input
                      id="setup-confirm"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => { setConfirmPassword(e.target.value); setError(""); }}
                      className="h-12 rounded-xl border-border/50 bg-background/50 pl-11 shadow-sm transition-all focus:border-primary focus:bg-background"
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
                  <Button variant="ghost" size="sm" className="text-muted-foreground hover:bg-background/80 hover:text-foreground" onClick={() => setStep(1)}>
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
            <span className="hover:text-foreground transition-colors">{`Support ${APP_NAME}`}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SetupWizard
