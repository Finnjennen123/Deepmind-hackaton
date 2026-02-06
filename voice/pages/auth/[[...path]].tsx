import { AuthView } from '@neondatabase/auth/react/ui'
import { Fraunces } from 'next/font/google'
import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'

const fredFont = Fraunces({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  display: 'swap',
})

/**
 * Auth pages: /auth/sign-in, /auth/sign-up, /auth/forgot-password, etc.
 */
export default function AuthPage() {
  const router = useRouter()
  const path = (router.query.path as string[] | undefined) ?? []
  const pathname = path[0] ?? 'sign-in'
  const [redirectTo, setRedirectTo] = useState('/')

  useEffect(() => {
    setRedirectTo(typeof window !== 'undefined' ? window.location.origin + '/' : '/')
  }, [])

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#fffaf5',
        padding: '24px',
      }}
    >
      <div
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: 440,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div
          className={fredFont.className}
          style={{
            position: 'absolute',
            top: -108,
            left: '50%',
            transform: 'translateX(-50%)',
            textAlign: 'center',
            fontSize: 'clamp(64px, 8vw, 84px)',
            fontWeight: 600,
            letterSpacing: '-0.02em',
            lineHeight: 1,
            color: '#ff8a33',
            textShadow: '0 1px 0 rgba(0,0,0,0.04)',
            pointerEvents: 'none',
            userSelect: 'none',
          }}
        >
          Fred
        </div>

        <div
          style={
            {
              width: '100%',
              display: 'flex',
              justifyContent: 'center',
              // Neon Auth UI theme overrides (scoped to this page/subtree)
              '--background': '#fffaf5',
              '--foreground': '#1f2937',
              '--card': '#fff7ed',
              '--card-foreground': '#1f2937',
              '--popover': '#ffffff',
              '--popover-foreground': '#1f2937',
              '--primary': '#ff6b00',
              '--primary-foreground': '#ffffff',
              '--secondary': '#ffedd5',
              '--secondary-foreground': '#7c2d12',
              '--muted': '#fff0e0',
              '--muted-foreground': '#6b7280',
              '--accent': '#ffedd5',
              '--accent-foreground': '#7c2d12',
              '--border': '#fed7aa',
              '--input': '#fed7aa',
              '--ring': '#ff6b00',
              '--radius': '16px',
            } as unknown as React.CSSProperties
          }
        >
          <AuthView pathname={pathname} redirectTo={redirectTo} />
        </div>
      </div>
    </div>
  )
}
