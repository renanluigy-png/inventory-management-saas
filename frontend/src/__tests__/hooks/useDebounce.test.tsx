import { renderHook, act } from '@testing-library/react'
import { useDebounce } from '../../hooks/useDebounce'

describe('useDebounce', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('deve retornar o valor inicial imediatamente', () => {
    const { result } = renderHook(() => useDebounce('inicial', 400))
    expect(result.current).toBe('inicial')
  })

  it('deve manter o valor antigo durante o delay', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 400),
      { initialProps: { value: 'primeiro' } }
    )

    rerender({ value: 'segundo' })

    expect(result.current).toBe('primeiro')
  })

  it('deve atualizar o valor após o delay', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 400),
      { initialProps: { value: 'primeiro' } }
    )

    rerender({ value: 'segundo' })

    act(() => {
      vi.advanceTimersByTime(400)
    })

    expect(result.current).toBe('segundo')
  })

  it('deve cancelar o debounce se o valor mudar novamente antes do delay', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 400),
      { initialProps: { value: 'a' } }
    )

    rerender({ value: 'b' })

    act(() => {
      vi.advanceTimersByTime(200)
    })

    rerender({ value: 'c' })

    act(() => {
      vi.advanceTimersByTime(400)
    })

    expect(result.current).toBe('c')
  })

  it('deve usar delay padrão de 400ms quando não especificado', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value),
      { initialProps: { value: 'inicial' } }
    )

    rerender({ value: 'novo' })

    act(() => {
      vi.advanceTimersByTime(399)
    })
    expect(result.current).toBe('inicial')

    act(() => {
      vi.advanceTimersByTime(1)
    })
    expect(result.current).toBe('novo')
  })

  it('deve funcionar com tipos não-string', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 200),
      { initialProps: { value: 1 } }
    )

    rerender({ value: 2 })

    act(() => {
      vi.advanceTimersByTime(200)
    })

    expect(result.current).toBe(2)
  })
})
