import { LogIn, Mail, KeyRound } from 'lucide-react'
import { Button } from '../../../components/ui/Button'
import { FadeIn } from '../../../components/ui/FadeIn'
import { useDemoLogin, DEMO_EMAIL, DEMO_SENHA } from '../../../hooks/useDemoLogin'

export function DemoSection() {
  const { loading, enterDemo } = useDemoLogin()

  return (
    <section id="demo" className="mx-auto max-w-6xl px-4 py-20">
      <FadeIn>
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 via-indigo-600 to-violet-600 p-8 text-center shadow-xl sm:p-14">
          <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-20 -left-10 h-64 w-64 rounded-full bg-white/10 blur-3xl" />

          <h2 className="text-2xl font-bold text-white sm:text-3xl">🚀 Experimente Gratuitamente</h2>
          <p className="mx-auto mt-3 max-w-lg text-indigo-100">
            Você pode testar todas as funcionalidades sem criar uma conta.
          </p>

          <div className="mx-auto mt-8 flex max-w-md flex-col gap-3 rounded-2xl bg-white/10 p-5 backdrop-blur-sm sm:flex-row sm:items-center sm:justify-center sm:gap-8">
            <div className="flex items-center justify-center gap-2 text-sm text-white">
              <Mail className="h-4 w-4 text-indigo-200" />
              <span className="font-mono">{DEMO_EMAIL}</span>
            </div>
            <div className="hidden h-4 w-px bg-white/30 sm:block" />
            <div className="flex items-center justify-center gap-2 text-sm text-white">
              <KeyRound className="h-4 w-4 text-indigo-200" />
              <span className="font-mono">{DEMO_SENHA}</span>
            </div>
          </div>

          <Button
            size="lg"
            className="mt-8 bg-white text-indigo-700 shadow-lg hover:bg-indigo-50"
            loading={loading}
            leftIcon={<LogIn className="h-4 w-4" />}
            onClick={enterDemo}
          >
            Entrar como Demonstração
          </Button>
        </div>
      </FadeIn>
    </section>
  )
}
