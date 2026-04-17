import { useState } from 'react'
import {
  GoogleAuthProvider, signInWithCredential,
  signInWithEmailAndPassword, createUserWithEmailAndPassword,
} from 'firebase/auth'
import { auth, isConfigured, GOOGLE_CLIENT_ID } from '../../utils/firebase.js'
import { X, Mail, Lock, Loader } from 'lucide-react'

export default function AuthModal({ onClose }) {
  const [mode,     setMode]     = useState('login')   // login | register
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')

  const clearError = () => setError('')

  const handleGoogle = async () => {
    if (!isConfigured) { setError('Firebase is not configured yet. See src/utils/firebase.js.'); return }
    if (GOOGLE_CLIENT_ID.startsWith('YOUR_')) { setError('Set GOOGLE_CLIENT_ID in src/utils/firebase.js first.'); return }
    setLoading(true); clearError()
    try {
      // Chrome extensions cannot use signInWithPopup — use chrome.identity.launchWebAuthFlow instead
      const redirectUri = chrome.identity.getRedirectURL()
      const authUrl = new URL('https://accounts.google.com/o/oauth2/auth')
      authUrl.searchParams.set('client_id',     GOOGLE_CLIENT_ID)
      authUrl.searchParams.set('response_type', 'token')
      authUrl.searchParams.set('redirect_uri',  redirectUri)
      authUrl.searchParams.set('scope',         'openid email profile')

      const responseUrl = await new Promise((resolve, reject) => {
        chrome.identity.launchWebAuthFlow(
          { url: authUrl.toString(), interactive: true },
          (url) => {
            if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message))
            else if (!url) reject(new Error('auth/popup-closed-by-user'))
            else resolve(url)
          }
        )
      })

      // Access token is in the URL hash fragment
      const hash = new URL(responseUrl).hash.slice(1)
      const accessToken = new URLSearchParams(hash).get('access_token')
      if (!accessToken) throw new Error('auth/no-token')

      const credential = GoogleAuthProvider.credential(null, accessToken)
      await signInWithCredential(auth, credential)
      onClose()
    } catch (e) {
      setError(friendlyError(e.message || e.code))
    } finally {
      setLoading(false)
    }
  }

  const handleEmail = async (e) => {
    e.preventDefault()
    if (!isConfigured) { setError('Firebase is not configured yet. See src/utils/firebase.js.'); return }
    if (!email || !password) { setError('Please fill in all fields.'); return }
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return }
    setLoading(true); clearError()
    try {
      if (mode === 'login') {
        await signInWithEmailAndPassword(auth, email, password)
      } else {
        await createUserWithEmailAndPassword(auth, email, password)
      }
      onClose()
    } catch (e) {
      setError(friendlyError(e.code))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.7)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      backdropFilter: 'blur(4px)',
    }}>
      <div style={{
        width: 340,
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 16,
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
        position: 'relative',
        boxShadow: '0 24px 60px rgba(0,0,0,0.6)',
        animation: 'slideUp 0.2s ease',
      }}>
        {/* Close */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute', top: 14, right: 14,
            background: 'none', border: 'none',
            color: 'var(--muted)', cursor: 'pointer', padding: 4,
          }}
        >
          <X size={16} />
        </button>

        {/* Header */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <span style={{ fontSize: 20 }}>☁️</span>
            <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--text)' }}>
              {mode === 'login' ? 'Sign In to Sync' : 'Create Account'}
            </span>
          </div>
          <p style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.5, margin: 0 }}>
            Sync your stats, tasks, and settings across all your browsers. Works offline too.
          </p>
        </div>

        {/* Google */}
        <button
          onClick={handleGoogle}
          disabled={loading}
          style={{
            width: '100%', padding: '11px',
            borderRadius: 10,
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid var(--border)',
            color: 'var(--text)',
            fontSize: 13, fontWeight: 600,
            cursor: loading ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            transition: 'all 0.15s',
            opacity: loading ? 0.6 : 1,
          }}
          onMouseEnter={e => !loading && (e.currentTarget.style.background = 'rgba(255,255,255,0.1)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
        >
          <GoogleIcon />
          Continue with Google
        </button>

        {/* Divider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
          <span style={{ fontSize: 11, color: 'var(--muted2)' }}>or</span>
          <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
        </div>

        {/* Email form */}
        <form onSubmit={handleEmail} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ position: 'relative' }}>
            <Mail size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)', pointerEvents: 'none' }} />
            <input
              className="input"
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => { setEmail(e.target.value); clearError() }}
              style={{ paddingLeft: 32, fontSize: 13 }}
              autoFocus
            />
          </div>
          <div style={{ position: 'relative' }}>
            <Lock size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)', pointerEvents: 'none' }} />
            <input
              className="input"
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); clearError() }}
              style={{ paddingLeft: 32, fontSize: 13 }}
            />
          </div>

          {error && (
            <div style={{
              fontSize: 11, color: 'var(--accent)',
              background: 'rgba(248,81,73,0.1)',
              border: '1px solid rgba(248,81,73,0.2)',
              borderRadius: 7, padding: '7px 10px', lineHeight: 1.4,
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary"
            style={{ width: '100%', padding: '11px', fontSize: 13, opacity: loading ? 0.6 : 1, cursor: loading ? 'not-allowed' : 'pointer' }}
          >
            {loading
              ? <><Loader size={13} style={{ animation: 'spin-slow 1s linear infinite' }} /> Please wait…</>
              : mode === 'login' ? 'Sign In' : 'Create Account'
            }
          </button>
        </form>

        {/* Toggle mode */}
        <p style={{ fontSize: 12, color: 'var(--muted)', textAlign: 'center', margin: 0 }}>
          {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
          <button
            onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); clearError() }}
            style={{ background: 'none', border: 'none', color: 'var(--blue)', cursor: 'pointer', fontSize: 12, padding: 0 }}
          >
            {mode === 'login' ? 'Sign up' : 'Sign in'}
          </button>
        </p>

        {/* Skip */}
        <button
          onClick={onClose}
          style={{
            background: 'none', border: 'none',
            color: 'var(--muted2)', fontSize: 11, cursor: 'pointer', padding: 0,
            textAlign: 'center',
          }}
        >
          Continue without account (local only)
        </button>
      </div>
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  )
}

function friendlyError(code) {
  const map = {
    'auth/user-not-found':       'No account found with this email.',
    'auth/wrong-password':       'Incorrect password.',
    'auth/invalid-credential':   'Invalid email or password.',
    'auth/email-already-in-use': 'An account with this email already exists.',
    'auth/weak-password':        'Password must be at least 6 characters.',
    'auth/invalid-email':        'Please enter a valid email address.',
    'auth/popup-closed-by-user': 'Sign-in was cancelled. Please try again.',
    'auth/popup-blocked':        'Auth window was blocked. Please try again.',
    'auth/network-request-failed': 'Network error. Check your connection.',
    'auth/no-token':             'Google did not return a token. Check your OAuth Client ID and redirect URI.',
  }
  return map[code] || 'Something went wrong. Please try again.'
}
