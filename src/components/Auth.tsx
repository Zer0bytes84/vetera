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
              L'innovation <br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-300 to-indigo-300">
                vétérinaire
              </span>
              <br/> commence ici.
            </h1>
            <p className="mt-6 max-w-md text-lg text-zinc-400">
              Une plateforme ultra-moderne conçue pour redéfinir la gestion de votre clinique au quotidien.
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
              <span className="text-white font-medium text-[13px] leading-tight">+2,000 professionnels</span>
              <span className="text-[11px] mt-0.5">font avancer la médecine</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="relative flex w-full flex-col items-center justify-center p-6 lg:p-12 z-10">
        
        {/* Only show logo here on small screens */}
        <div className="lg:hidden mb-10 flex flex-col items-center text-center animate-in fade-in slide-in-from-bottom-4 duration-700">
          <Logo size="xl" className="mb-6 drop-shadow-md" />
        </div>

        <div className="w-full max-w-[26rem] flex-col items-center">
          <div className="mb-8 flex flex-col items-center text-center animate-in fade-in slide-in-from-bottom-4 duration-700">
            <h1 className="font-heading text-3xl font-medium tracking-tight text-foreground sm:text-4xl drop-shadow-sm">
              {view === "login" ? "Bon retour" : `Rejoignez ${APP_NAME}`}
            </h1>
            <p className="mt-3 text-sm tracking-wide text-muted-foreground/80 sm:text-base">
              {view === "login"
                ? "Gérez votre clinique en toute simplicité."
                : "Créez votre compte et découvrez l'outil de demain."}
            </p>
          </div>

          <div className="w-full relative overflow-hidden rounded-[2.5rem] border border-border/50 bg-background/50 p-8 shadow-[0_8px_32px_rgba(0,0,0,0.04)] sm:p-10 animate-in fade-in zoom-in-95 duration-500">
            {(authError || formError) && (
              <div className="mb-6 flex animate-in fade-in slide-in-from-top-2 items-center gap-3 rounded-2xl border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive backdrop-blur-md">
                <HugeiconsIcon icon={Alert02Icon} strokeWidth={2} className="size-5 shrink-0" />
                <span className="font-medium leading-snug">{authError || formError}</span>
              </div>
            )}

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
                      className="h-12 rounded-xl border-border/50 bg-background/50 pl-11 shadow-sm transition-all focus:border-primary focus:bg-background"
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
                    className="h-12 rounded-xl border-border/50 bg-background/50 pl-11 shadow-sm transition-all focus:border-primary focus:bg-background"
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
                    className="h-12 rounded-xl border-border/50 bg-background/50 pl-11 tracking-wider shadow-sm transition-all focus:border-primary focus:bg-background"
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

            <div className="mt-8 text-center text-sm text-muted-foreground/80">
              {view === "login" ? (
                <div className="flex flex-col gap-2">
                  <span>Pas encore de compte ?</span>
                  <Button variant="outline" className="w-full rounded-xl border-border/40 bg-background/30 hover:bg-background/80" onClick={() => { setView("register"); setFormError(""); }}>
                    Demander un accès
                  </Button>
                </div>
              ) : (
                <Button variant="ghost" size="sm" className="w-full rounded-xl hover:bg-background/80" onClick={() => { setView("login"); setFormError(""); }}>
                  <HugeiconsIcon icon={ArrowLeft01Icon} strokeWidth={2} className="mr-2 size-4" />
                  Retour à la connexion
                </Button>
              )}
            </div>
          </div>

          <div className="mt-10 flex items-center justify-center gap-6 text-sm font-medium text-muted-foreground/60 animate-in fade-in slide-in-from-top-4 duration-700">
            <span className="hover:text-foreground transition-colors cursor-pointer">Conditions</span>
            <span className="h-1 w-1 rounded-full bg-muted-foreground/30" />
            <span className="hover:text-foreground transition-colors cursor-pointer">Confidentialité</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Auth
