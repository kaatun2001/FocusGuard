import { useState } from 'react'
import {
  signInWithEmailAndPassword, createUserWithEmailAndPassword,
  sendPasswordResetEmail,
} from 'firebase/auth'
import { auth, isConfigured } from '../../utils/firebase.js'
import { X, Mail, Lock, Loader } from 'lucide-react'

export default function AuthModal({ onClose }) {
  const [mode,     setMode]     = useState('login')   // login | register | forgot
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')
  const [message,  setMessage]  = useState('')

  const clearError = () => { setError(''); setMessage('') }

  const handleForgot = async (e) => {
    e.preventDefault()
    if (!isConfigured) { setError('Firebase is not configured yet. See src/utils/firebase.js.'); return }
    if (!email) { setError('Enter your email address above.'); return }
    setLoading(true); clearError()
    try {
      await sendPasswordResetEmail(auth, email)
      setMessage('Password reset email sent. Check your inbox.')
    } catch (e) {
      setError(friendlyError(e.code))
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
              {mode === 'login' ? 'Sign In to Sync' : mode === 'register' ? 'Create Account' : 'Reset Password'}
            </span>
          </div>
          <p style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.5, margin: 0 }}>
            Sync your stats, tasks, and settings across all your browsers. Works offline too.
          </p>
        </div>

        {/* Email form */}
        <form onSubmit={mode === 'forgot' ? handleForgot : handleEmail} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
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

          {mode !== 'forgot' && (
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
          )}

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

          {message && (
            <div style={{
              fontSize: 11, color: 'var(--green)',
              background: 'rgba(63,185,80,0.1)',
              border: '1px solid rgba(63,185,80,0.2)',
              borderRadius: 7, padding: '7px 10px', lineHeight: 1.4,
            }}>
              {message}
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
              : mode === 'login' ? 'Sign In' : mode === 'register' ? 'Create Account' : 'Send Reset Email'
            }
          </button>
        </form>

        {/* Toggle mode */}
        <p style={{ fontSize: 12, color: 'var(--muted)', textAlign: 'center', margin: 0 }}>
          {mode === 'login' && (
            <>
              {"Don't have an account? "}
              <button onClick={() => { setMode('register'); clearError() }} style={{ background: 'none', border: 'none', color: 'var(--blue)', cursor: 'pointer', fontSize: 12, padding: 0 }}>
                Sign up
              </button>
              {' · '}
              <button onClick={() => { setMode('forgot'); clearError() }} style={{ background: 'none', border: 'none', color: 'var(--blue)', cursor: 'pointer', fontSize: 12, padding: 0 }}>
                Forgot password?
              </button>
            </>
          )}
          {mode === 'register' && (
            <>
              {'Already have an account? '}
              <button onClick={() => { setMode('login'); clearError() }} style={{ background: 'none', border: 'none', color: 'var(--blue)', cursor: 'pointer', fontSize: 12, padding: 0 }}>
                Sign in
              </button>
            </>
          )}
          {mode === 'forgot' && (
            <button onClick={() => { setMode('login'); clearError() }} style={{ background: 'none', border: 'none', color: 'var(--blue)', cursor: 'pointer', fontSize: 12, padding: 0 }}>
              ← Back to sign in
            </button>
          )}
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

function friendlyError(code) {
  const map = {
    'auth/user-not-found':       'No account found with this email.',
    'auth/wrong-password':       'Incorrect password.',
    'auth/invalid-credential':   'Invalid email or password.',
    'auth/email-already-in-use': 'An account with this email already exists.',
    'auth/weak-password':        'Password must be at least 6 characters.',
    'auth/invalid-email':        'Please enter a valid email address.',
    'auth/network-request-failed': 'Network error. Check your connection.',
  }
  return map[code] || 'Something went wrong. Please try again.'
}
