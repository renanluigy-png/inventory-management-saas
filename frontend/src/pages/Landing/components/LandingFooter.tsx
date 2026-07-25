import { Github, Linkedin, Package } from 'lucide-react'
import { GITHUB_URL, LINKEDIN_URL } from '../constants'

export function LandingFooter() {
  const year = new Date().getFullYear()

  return (
    <footer className="border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="flex flex-col items-center gap-6 sm:flex-row sm:justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600">
              <Package className="h-4 w-4 text-white" />
            </div>
            <span className="text-sm font-bold text-gray-900 dark:text-white">Controle Estoque</span>
          </div>

          <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
            <span>
              Desenvolvido por <strong className="font-semibold text-gray-700 dark:text-gray-200">Luigy Renan</strong>
            </span>
            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg p-2 transition-colors hover:bg-gray-100 hover:text-indigo-600 dark:hover:bg-gray-800 dark:hover:text-indigo-400"
              title="GitHub"
              aria-label="GitHub"
            >
              <Github className="h-4 w-4" />
            </a>
            {LINKEDIN_URL && (
              <a
                href={LINKEDIN_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg p-2 transition-colors hover:bg-gray-100 hover:text-indigo-600 dark:hover:bg-gray-800 dark:hover:text-indigo-400"
                title="LinkedIn"
                aria-label="LinkedIn"
              >
                <Linkedin className="h-4 w-4" />
              </a>
            )}
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-gray-400 dark:text-gray-500">
          © {year} Controle Estoque. Projeto de portfólio full stack.
        </p>
      </div>
    </footer>
  )
}
