import React, { StrictMode } from "react"
import { createRoot } from "react-dom/client"

import { AuthProvider } from "@/contexts/AuthContext"
import App from "@/App"
import "./index.css"
import "@/i18n/config"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"
import { DirectionProvider } from "@/components/ui/direction"
import i18n, { isRtlLanguage } from "@/i18n/config"

type ErrorBoundaryState = {
  hasError: boolean
  error: Error | null
}

class ErrorBoundary extends React.Component<React.PropsWithChildren, ErrorBoundaryState> {
  constructor(props: React.PropsWithChildren) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen overflow-auto bg-background p-10 text-red-600">
          <h1 className="mb-5 text-2xl font-semibold">Crash Application</h1>
          <div className="rounded-xl bg-muted p-5 font-mono text-sm text-foreground">
            <strong>Error:</strong> {this.state.error?.toString()}
            <pre className="mt-4 whitespace-pre-wrap">{this.state.error?.stack}</pre>
          </div>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-5 rounded-lg bg-primary px-4 py-2 text-primary-foreground"
          >
            Recharger
          </button>
        </div>
      )
    }

    return this.props.children
  }
}

function AppDirectionProvider({ children }: React.PropsWithChildren) {
  const [dir, setDir] = React.useState<"ltr" | "rtl">(
    isRtlLanguage(i18n.language) ? "rtl" : "ltr"
  )

  React.useEffect(() => {
    const onLanguageChanged = (language: string) => {
      setDir(isRtlLanguage(language) ? "rtl" : "ltr")
    }

    i18n.on("languageChanged", onLanguageChanged)
    return () => {
      i18n.off("languageChanged", onLanguageChanged)
    }
  }, [])

  return <DirectionProvider direction={dir}>{children}</DirectionProvider>
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ErrorBoundary>
      <AppDirectionProvider>
        <ThemeProvider>
          <AuthProvider>
            <TooltipProvider>
              <App />
              <Toaster />
            </TooltipProvider>
          </AuthProvider>
        </ThemeProvider>
      </AppDirectionProvider>
    </ErrorBoundary>
  </StrictMode>
)
