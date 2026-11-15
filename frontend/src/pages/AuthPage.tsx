import { useState } from 'react'
import { ArrowLeft, ArrowRight, Eye, EyeOff } from 'lucide-react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export function AuthPage() {
  const { login, register } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [working, setWorking] = useState(false)
  const target = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname ?? '/'

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setWorking(true)
    setError('')
    try {
      if (mode === 'login') await login(username, password)
      else await register(username, password)
      navigate(target, { replace: true })
    } catch { setError(mode === 'login' ? 'Tên đăng nhập hoặc mật khẩu không chính xác.' : 'Không thể tạo tài khoản.') }
    finally { setWorking(false) }
  }

  return <main className="auth-page">
    <div className="auth-image"><img src="https://images.unsplash.com/photo-1552346154-21d32810aba3?auto=format&fit=crop&w=1400&q=85" alt="Cận cảnh một đôi giày da" /><span>ĐI CÀNG LÂU, GIÀY CÀNG ĐẸP.</span></div>
    <section className="auth-panel"><Link to="/" className="back-link"><ArrowLeft size={15} /> Cửa hàng</Link><div className="auth-content"><span className="eyebrow">FORM & FUNCTION · THÀNH VIÊN</span><h1>{mode === 'login' ? 'Mừng bạn trở lại.' : 'Tạo tài khoản mới.'}</h1><p>{mode === 'login' ? 'Đăng nhập để tiếp tục hành trình chọn giày.' : 'Tạo tài khoản để theo dõi các đơn hàng của bạn.'}</p>
      <form className="auth-form" onSubmit={submit}><label>Tên đăng nhập<input autoComplete="username" required minLength={3} value={username} onChange={(event) => setUsername(event.target.value)} placeholder="Nhập tên đăng nhập" /></label><label>Mật khẩu<span className="password-field"><input autoComplete={mode === 'login' ? 'current-password' : 'new-password'} required minLength={6} type={showPassword ? 'text' : 'password'} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Ít nhất 6 ký tự" /><button type="button" className="icon-button" aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'} onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></span></label>
        {error && <p className="notice error-notice">{error}</p>}<button className="primary-button full-button" disabled={working}>{working ? 'Vui lòng đợi…' : mode === 'login' ? <>Đăng nhập <ArrowRight size={16} /></> : <>Tạo tài khoản <ArrowRight size={16} /></>}</button></form>
      <button className="mode-switch" onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError('') }}>{mode === 'login' ? 'Chưa có tài khoản? Đăng ký' : 'Đã có tài khoản? Đăng nhập'}</button>
    </div></section>
  </main>
}
