import { ArrowUpRight, CircleUserRound, Database, ExternalLink, LogOut, ShoppingBag } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useCart } from '../context/CartContext'

export function Navbar() {
  const location = useLocation()
  const { user, isAdmin, logout } = useAuth()
  const { count } = useCart()
  return <header className={`site-header${location.pathname === '/admin/database' ? ' database-site-header' : ''}`}>
    <Link className="wordmark" to="/" aria-label="Trang chủ Form & Function"><span className="wordmark-mark">F/F</span><span>FORM & FUNCTION</span></Link>
    <nav className="main-nav" aria-label="Điều hướng chính">
      <Link to="/">Bộ sưu tập</Link>
      {user && <Link to="/orders/current">Đơn hàng <ArrowUpRight size={13} /></Link>}
      {isAdmin && <Link to="/admin">Quản trị</Link>}
      {isAdmin && <Link to="/admin/database"><Database size={14} /> Database</Link>}
      {isAdmin && <a href="http://localhost:2379/dashboard/#/monitoring" target="_blank" rel="noreferrer">Giám sát TiKV <ExternalLink size={13} /></a>}
    </nav>
    <div className="header-actions">
      {user ? <><span className="user-label"><CircleUserRound size={16} /> {user.username}</span><button className="icon-button" onClick={logout} title="Đăng xuất" aria-label="Đăng xuất"><LogOut size={18} /></button></> : <Link className="signin-link" to="/login">Đăng nhập</Link>}
      <Link className="bag-link" to="/cart" aria-label={`Giỏ hàng, ${count} sản phẩm`}><ShoppingBag size={18} /><span>Giỏ hàng</span><b>{count}</b></Link>
    </div>
  </header>
}
