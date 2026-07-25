import { LogIn } from 'lucide-react'
import { Button } from '../../../components/ui/Button'
import { FadeIn } from '../../../components/ui/FadeIn'
import { useDemoLogin, DEMO_EMAIL, DEMO_SENHA } from '../../../hooks/useDemoLogin'

export function DemoSection() {
  const { loading, enterDemo } = useDemoLogin()

  return (
    <section id="demo" className="mx-auto max-w-6xl px-4 py-20">
      <FadeIn>
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 via-indigo-600 to-violet-600 p-8 text-center shadow-xl transition-transform duration-300 hover:scale-[1.01] sm:p-14">
          <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-20 -left-10 h-64 w-64 rounded-full bg-white/10 blur-3xl" />

          <h2 className="text-2xl font-bold text-white sm:text-3xl">🚀 Teste a Demonstração</h2>
          <p className="mx-auto mt-3 max-w-lg text-indigo-100">
            Experimente gratuitamente todas as funcionalidades do sistema sem criar uma conta.
          </p>

          <div className="mx-auto mt-8 grid max-w-md grid-cols-1 gap-5 rounded-2xl bg-white/10 p-6 shadow-inner backdrop-blur-sm sm:grid-cols-2 sm:gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-indigo-200">📧 Email</p>
              <p className="mt-1 font-mono text-base text-white">{DEMO_EMAIL}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-indigo-200">🔑 Senha</p>
              <p className="mt-1 font-mono text-base text-white">{DEMO_SENHA}</p>
            </div>
          </div>

          <Button
            size="lg"
            className="mt-8 bg-white text-indigo-700 shadow-lg hover:bg-indigo-50"
            loading={loading}
            leftIcon={<LogIn className="h-4 w-4" />}
            onClick={enterDemo}
          >
            {loading ? 'Entrando na demonstração...' : 'Entrar como Demonstração'}
          </Button>
        </div>
      </FadeIn>
    </section>
  )
}
