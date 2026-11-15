import { useState } from 'react'
import { ArrowLeft, ArrowRight, Trash2 } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { orderApi } from '../api/orderApi'
import { colorLabel, shoeDescription } from '../i18n'
import { useCart } from '../context/CartContext'

export function CartCheckoutPage() {
  const { items, total, remove, clear } = useCart()
  const navigate = useNavigate()
  const [address, setAddress] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  async function checkout(event: React.FormEvent) {
    event.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      const order = await orderApi.create({ shippingAddress: address, items: items.map((item) => ({
        shoeId: item.product.shoeId, size: item.size, color: item.color, quantity: item.quantity,
      })) })
      clear()
      navigate(`/orders/${encodeURIComponent(order.orderId)}`)
    } catch {
      setError('Không thể đặt hàng. Tồn kho có thể vừa thay đổi, vui lòng thử lại.')
    } finally { setSubmitting(false) }
  }

  return <main className="page-shell checkout-page">
    <Link to="/" className="back-link"><ArrowLeft size={16} /> Tiếp tục mua sắm</Link>
    <div className="section-heading checkout-heading"><div><span className="eyebrow">SẢN PHẨM ĐÃ CHỌN</span><h1>Giỏ hàng</h1></div><span className="result-count">{items.length} sản phẩm</span></div>
    {items.length === 0 ? <div className="empty-bag"><p>Giỏ hàng của bạn đang trống.</p><Link to="/" className="primary-button">Khám phá bộ sưu tập <ArrowRight size={16} /></Link></div> : <div className="checkout-layout">
      <div className="bag-lines">{items.map((item) => <article className="bag-line" key={`${item.product.shoeId}-${item.size}-${item.color}`}>
        <img src={item.product.imageUrl} alt={item.product.name} /><div className="bag-line-details"><span className="eyebrow">{item.product.brand}</span><h2>{item.product.name}</h2><p>{shoeDescription(item.product.shoeId, item.product.description)} · EU {item.size} · {colorLabel(item.color)} · SL {item.quantity}</p></div><strong>{new Intl.NumberFormat('vi-VN').format(item.product.price * item.quantity)} <small>₫</small></strong><button className="icon-button remove-button" onClick={() => remove(item.product.shoeId, item.size, item.color)} title="Xóa sản phẩm" aria-label="Xóa sản phẩm"><Trash2 size={17} /></button>
      </article>)}</div>
      <form className="checkout-form" onSubmit={checkout}><span className="eyebrow">THÔNG TIN GIAO HÀNG</span><label>Địa chỉ nhận hàng<textarea required minLength={8} value={address} onChange={(event) => setAddress(event.target.value)} placeholder="Số nhà, phường/xã, quận/huyện, tỉnh/thành phố" /></label>
        <div className="total-row"><span>Tạm tính</span><strong>{new Intl.NumberFormat('vi-VN').format(total)} ₫</strong></div><div className="total-row shipping-row"><span>Giao hàng</span><span>Miễn phí</span></div><div className="total-row grand-total"><span>Tổng cộng</span><strong>{new Intl.NumberFormat('vi-VN').format(total)} <small>₫</small></strong></div>
        {error && <p className="notice error-notice">{error}</p>}<button className="primary-button full-button" disabled={submitting}>{submitting ? 'Đang tạo đơn…' : <>Đặt hàng <ArrowRight size={17} /></>}</button><p className="checkout-caption">Bạn có thể thanh toán tại trang chi tiết đơn hàng.</p>
      </form>
    </div>}
  </main>
}
