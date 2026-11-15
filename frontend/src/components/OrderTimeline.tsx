import type { OrderStatus, OrderStatusHistory } from '../types'

const stages: OrderStatus[] = ['PENDING_PAYMENT', 'PAID', 'PROCESSING', 'SHIPPING', 'DELIVERED']
const labels: Record<OrderStatus, string> = {
  PENDING_PAYMENT: 'Chờ thanh toán', PAID: 'Đã thanh toán', PROCESSING: 'Đang chuẩn bị hàng', SHIPPING: 'Đang giao hàng', DELIVERED: 'Đã giao hàng', CANCELLED: 'Đã hủy',
}

export function OrderTimeline({ status, history }: { status: OrderStatus; history: OrderStatusHistory[] }) {
  if (status === 'CANCELLED') return <div className="cancelled-state">Đơn hàng đã được hủy</div>
  const current = stages.indexOf(status)
  return <ol className="order-timeline">
    {stages.map((stage, index) => {
      const event = history.find((item) => item.status === stage)
      return <li key={stage} className={index <= current ? 'complete' : ''}>
        <span className="timeline-dot" />
        <div><strong>{labels[stage]}</strong>{event && <time>{new Date(event.changedAt).toLocaleString('vi-VN')}</time>}</div>
      </li>
    })}
  </ol>
}
