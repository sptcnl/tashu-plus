import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'

type ToastTone = 'default' | 'success' | 'error'

interface ToastContextValue {
  showToast: (message: string, tone?: ToastTone) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

const TONE_CLASS: Record<ToastTone, string> = {
  default: 'bg-navy',
  success: 'bg-mint',
  error: 'bg-warn',
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<{ message: string; tone: ToastTone } | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const showToast = useCallback((message: string, tone: ToastTone = 'default') => {
    if (timer.current) clearTimeout(timer.current)
    setToast({ message, tone })
    timer.current = setTimeout(() => setToast(null), 2200)
  }, [])

  const value = useMemo(() => ({ showToast }), [showToast])

  return (
    <ToastContext.Provider value={value}>
      {children}
      {toast && (
        <div
          role="status"
          className="pointer-events-none fixed bottom-28 left-1/2 z-50 w-[330px] -translate-x-1/2"
        >
          <div
            className={`${TONE_CLASS[toast.tone]} rounded-xl px-4 py-3 text-center text-[13px] font-medium text-white shadow-float`}
          >
            {toast.message}
          </div>
        </div>
      )}
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast 는 ToastProvider 안에서만 사용할 수 있습니다.')
  return ctx
}
