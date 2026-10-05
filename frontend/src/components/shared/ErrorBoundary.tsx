import { Component, type ReactNode } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

const CHUNK_RELOAD_KEY = 'cde-chunk-reload-attempt'

function isChunkLoadError(error: Error | null): boolean {
  const message = error?.message ?? ''
  return /failed to fetch dynamically imported module|importing a module script failed|loading chunk [\w-]+ failed|chunkloaderror/i.test(
    message
  )
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    console.error('[ErrorBoundary]', error.message, info.componentStack)

    // GitHub Pages pode manter o HTML anterior em cache enquanto a nova
    // publicação já disponibilizou hashes de chunks diferentes. Nesse caso,
    // uma única recarga limpa o descompasso sem entrar em loop infinito.
    if (isChunkLoadError(error)) {
      try {
        const attemptedAt = Number(sessionStorage.getItem(CHUNK_RELOAD_KEY) ?? '0')
        const recentlyRetried = Date.now() - attemptedAt < 30_000

        if (!recentlyRetried) {
          sessionStorage.setItem(CHUNK_RELOAD_KEY, String(Date.now()))
          window.location.reload()
        }
      } catch {
        // sessionStorage pode estar indisponível em navegação privada/bloqueada.
      }
    }
  }

  componentDidMount() {
    // Após uma montagem bem-sucedida, qualquer tentativa anterior de recovery
    // deixa de ser relevante.
    try {
      sessionStorage.removeItem(CHUNK_RELOAD_KEY)
    } catch {
      // noop
    }
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null })
  }

  private handleHome = () => {
    window.location.replace(import.meta.env.BASE_URL)
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback

      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
          <div className="max-w-md w-full text-center">
            <div className="flex justify-center mb-4">
              <div className="h-16 w-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <AlertTriangle className="h-8 w-8 text-red-600 dark:text-red-400" />
              </div>
            </div>

            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Algo deu errado
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mb-1 text-sm">
              Ocorreu um erro inesperado na aplicação.
            </p>
            {this.state.error && (
              <p className="text-xs text-red-500 dark:text-red-400 mb-6 font-mono bg-red-50 dark:bg-red-900/20 rounded px-3 py-2 break-all">
                {this.state.error.message}
              </p>
            )}

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={this.handleReset}
                className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium transition-colors"
              >
                <RefreshCw className="h-4 w-4" />
                Tentar novamente
              </button>
              <button
                onClick={this.handleHome}
                className="inline-flex items-center justify-center px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-200 text-sm font-medium"
              >
                Voltar ao início
              </button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
