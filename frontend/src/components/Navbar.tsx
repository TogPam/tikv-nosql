import { ArrowUpRight, CircleUserRound, LogOut, ShoppingBag } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useCart } from '../context/CartContext'

export function Navbar() {
  const { user, isAdmin, logout } = useAuth()
  const { count } = useCart()
  return <header className="site-header">
    <Link className="wordmark" to="/" aria-label="Trang chủ Form & Function"><span className="wordmark-mark">F/F</span><span>FORM & FUNCTION</span></Link>
    <nav className="main-nav" aria-label="Điều hướng chính">
      <Link to="/">Bộ sưu tập</Link>
      {user && <Link to="/orders/current">Đơn hàng <ArrowUpRight size={13} /></Link>}
      {isAdmin && <Link to="/admin">Quản trị</Link>}
    </nav>
    <div className="header-actions">
      {user ? <><span className="user-label"><CircleUserRound size={16} /> {user.username}</span><button className="icon-button" onClick={logout} title="Đăng xuất" aria-label="Đăng xuất"><LogOut size={18} /></button></> : <Link className="signin-link" to="/login">Đăng nhập</Link>}
      <Link className="bag-link" to="/cart" aria-label={`Giỏ hàng, ${count} sản phẩm`}><ShoppingBag size={18} /><span>Giỏ hàng</span><b>{count}</b></Link>
    </div>
  </header>
}
