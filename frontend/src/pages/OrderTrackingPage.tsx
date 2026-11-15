import { useEffect, useState } from 'react'
import { ArrowLeft, ArrowUpRight, Check, PackageCheck } from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { orderApi } from '../api/orderApi'
import { OrderTimeline } from '../components/OrderTimeline'
import { colorLabel, orderStatusLabel, shoeDescription } from '../i18n'
import type { OrderStatusHistory, ShoeOrder } from '../types'

export function OrderTrackingPage() {
  const { orderId = 'current' } = useParams()
  const navigate = useNavigate()
  const [orders, setOrders] = useState<ShoeOrder[]>([])
  const [order, setOrder] = useState<ShoeOrder | null>(null)
  const [history, setHistory] = useState<OrderStatusHistory[]>([])
  const [error, setError] = useState('')
  const [working, setWorking] = useState(false)

  async function refresh() {
    try {
      if (orderId === 'current') setOrders(await orderApi.mine())
      else {
        const [current, events] = await Promise.all([orderApi.get(orderId), orderApi.history(orderId)])
        setOrder(current)
        setHistory(events)
      }
    } catch { setError('Không thể tải thông tin đơn hàng.') }
  }
  useEffect(() => { void refresh() }, [orderId])

  async function act(action: 'pay' | 'cancel') {
    if (!order) return
    setWorking(true)
    setError('')
    try {
      const updated = action === 'pay' ? await orderApi.pay(order.orderId) : await orderApi.cancel(order.orderId)
      setOrder(updated)
      setHistory(await orderApi.history(order.orderId))
    } catch {
      setError('Không thể cập nhật đơn hàng. Vui lòng thử lại.')
    } finally { setWorking(false) }
  }

  if (orderId === 'current') return <main className="page-shell orders-page">
    <Link to="/" className="back-link"><ArrowLeft size={16} /> Cửa hàng</Link><div className="section-heading"><div><span className="eyebrow">TÀI KHOẢN CỦA BẠN</span><h1>Lịch sử đơn hàng</h1></div><PackageCheck size={23} /></div>
    {error && <p className="notice error-notice">{error}</p>}
    {orders.length === 0 ? <div className="empty-state order-empty">Bạn chưa có đơn hàng nào. Hãy chọn đôi giày yêu thích nhé.</div> : <div className="order-list">{orders.map((item) => <Link className="order-list-row" key={item.orderId} to={`/orders/${encodeURIComponent(item.orderId)}`}><div><span className="eyebrow">{new Date(item.createdAt).toLocaleDateString('vi-VN')}</span><strong>{item.orderId}</strong><span>{item.items.map((line) => line.shoeName).join(', ')}</span></div><div><span className={`status-label status-${item.status.toLowerCase()}`}>{orderStatusLabel(item.status)}</span><strong>{new Intl.NumberFormat('vi-VN').format(item.totalAmount)} ₫</strong></div><ArrowUpRight size={17} /></Link>)}</div>}
  </main>

  if (!order) return <main className="page-shell loading-state">{error || 'Đang tải đơn hàng…'}</main>
  const paymentQrUrl = `https://img.vietqr.io/image/MB-0889916597-compact2.svg?${new URLSearchParams({
    amount: String(order.totalAmount),
    accountName: 'PhamTruongThong',
    addInfo: order.orderId,
  }).toString()}`

  return <main className="page-shell tracking-page">
    <button className="back-link" onClick={() => navigate('/orders/current')}><ArrowLeft size={16} /> Tất cả đơn hàng</button>
    <div className="tracking-heading"><div><span className="eyebrow">NGÀY ĐẶT {new Date(order.createdAt).toLocaleDateString('vi-VN')}</span><h1>{order.orderId}</h1></div><span className={`status-label status-${order.status.toLowerCase()}`}>{orderStatusLabel(order.status)}</span></div>
    <div className="tracking-layout"><section className="tracking-main"><h2>Tiến độ giao hàng</h2><OrderTimeline status={order.status} history={history} />
      <div className="tracking-items"><h2>Sản phẩm trong đơn</h2>{order.items.map((item) => <div className="tracking-item" key={`${item.shoeId}-${item.size}-${item.color}`}><div><strong>{item.shoeName}</strong><span>{shoeDescription(item.shoeId, '')} · {colorLabel(item.color)} · Cỡ EU {item.size} · SL {item.quantity}</span></div><strong>{new Intl.NumberFormat('vi-VN').format(item.unitPrice * item.quantity)} ₫</strong></div>)}</div>
    </section><aside className="order-summary"><span className="eyebrow">ĐỊA CHỈ GIAO HÀNG</span><p>{order.shippingAddress}</p><div className="total-row grand-total"><span>{order.status === 'PENDING_PAYMENT' ? 'Cần thanh toán' : 'Tổng tiền'}</span><strong>{new Intl.NumberFormat('vi-VN').format(order.totalAmount)} <small>₫</small></strong></div>
      {order.status === 'PENDING_PAYMENT' && <section className="vietqr-payment" aria-labelledby="vietqr-title">
        <h2 id="vietqr-title">Thanh toán chuyển khoản</h2>
        <p>Quét mã bằng ứng dụng ngân hàng. Số tiền đã được điền sẵn cho đơn hàng này.</p>
        <img className="vietqr-image" src={paymentQrUrl} alt={`Mã QR thanh toán ${new Intl.NumberFormat('vi-VN').format(order.totalAmount)} đồng`} />
        <dl className="payment-details">
          <div><dt>Ngân hàng</dt><dd>MB Bank</dd></div>
          <div><dt>Số tài khoản</dt><dd>0889916597</dd></div>
          <div><dt>Chủ tài khoản</dt><dd>PhamTruongThong</dd></div>
          <div><dt>Nội dung chuyển khoản</dt><dd>{order.orderId}</dd></div>
          <div className="payment-amount"><dt>Số tiền</dt><dd>{new Intl.NumberFormat('vi-VN').format(order.totalAmount)} ₫</dd></div>
        </dl>
      </section>}
      {error && <p className="notice error-notice">{error}</p>}{order.status === 'PENDING_PAYMENT' && <button className="primary-button full-button" disabled={working} onClick={() => void act('pay')}>{working ? 'Đang xử lý…' : <>Xác nhận thanh toán <Check size={16} /></>}</button>}
      {['PENDING_PAYMENT', 'PAID', 'PROCESSING'].includes(order.status) && <button className="secondary-button full-button" disabled={working} onClick={() => void act('cancel')}>Hủy đơn hàng</button>}
    </aside></div>
  </main>
}
