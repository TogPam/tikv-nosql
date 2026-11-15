import { useEffect, useState } from 'react'
import { Check, RefreshCw } from 'lucide-react'
import { adminApi } from '../api/adminApi'
import { colorLabel, orderStatusLabel } from '../i18n'
import type { ShoeOrder, SkuInventory } from '../types'

export function AdminDashboardPage() {
  const [orders, setOrders] = useState<ShoeOrder[]>([])
  const [inventory, setInventory] = useState<SkuInventory[]>([])
  const [drafts, setDrafts] = useState<Record<string, { available: number; reserved: number }>>({})
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  async function load() {
    try {
      const [nextOrders, nextInventory] = await Promise.all([adminApi.orders(), adminApi.inventory()])
      setOrders(nextOrders)
      setInventory(nextInventory)
    } catch { setError('Không thể tải dữ liệu quản trị.') }
  }
  useEffect(() => { void load() }, [])

  function key(item: SkuInventory) { return `${item.shoeId}:${item.size}:${item.color}` }
  function draft(item: SkuInventory) { return drafts[key(item)] ?? { available: item.availableQuantity, reserved: item.reservedQuantity } }
  async function save(item: SkuInventory) {
    setMessage('')
    setError('')
    const value = draft(item)
    try {
      await adminApi.updateInventory({ ...item, availableQuantity: value.available, reservedQuantity: value.reserved })
      setMessage(`Đã lưu tồn kho cho ${item.shoeId}, cỡ ${item.size}.`)
      await load()
    } catch { setError('Cập nhật tồn kho thất bại.') }
  }

  return <main className="page-shell admin-page">
    <div className="section-heading"><div><span className="eyebrow">VẬN HÀNH · QUẢN TRỊ</span><h1>Quản lý cửa hàng</h1></div><button className="icon-button" onClick={() => void load()} title="Tải lại dữ liệu" aria-label="Tải lại dữ liệu"><RefreshCw size={17} /></button></div>
    {message && <p className="notice success-notice">{message}</p>}{error && <p className="notice error-notice">{error}</p>}
    <section className="admin-section"><div className="admin-section-heading"><h2>Tồn kho</h2><span>{inventory.length} phân loại</span></div>
      <div className="table-scroll"><table className="data-table"><thead><tr><th>Mã sản phẩm</th><th>Cỡ</th><th>Màu sắc</th><th>Có thể bán</th><th>Đang giữ</th><th /></tr></thead><tbody>
        {inventory.map((item) => { const value = draft(item); return <tr key={key(item)}><td>{item.shoeId}</td><td>{item.size}</td><td>{colorLabel(item.color)}</td><td><input aria-label="Số lượng có thể bán" type="number" min="0" value={value.available} onChange={(event) => setDrafts({ ...drafts, [key(item)]: { ...value, available: Number(event.target.value) } })} /></td><td><input aria-label="Số lượng đang giữ" type="number" min="0" value={value.reserved} onChange={(event) => setDrafts({ ...drafts, [key(item)]: { ...value, reserved: Number(event.target.value) } })} /></td><td><button className="icon-button" title="Lưu tồn kho" aria-label="Lưu tồn kho" onClick={() => void save(item)}><Check size={16} /></button></td></tr> })}
      </tbody></table></div>
    </section>
    <section className="admin-section"><div className="admin-section-heading"><h2>Đơn hàng gần đây</h2><span>{orders.length} đơn</span></div>
      <div className="table-scroll"><table className="data-table"><thead><tr><th>Mã đơn</th><th>Khách hàng</th><th>Ngày đặt</th><th>Trạng thái</th><th>Tổng tiền</th></tr></thead><tbody>
        {orders.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map((order) => <tr key={order.orderId}><td>{order.orderId}</td><td>{order.customerId}</td><td>{new Date(order.createdAt).toLocaleDateString('vi-VN')}</td><td><span className={`status-label status-${order.status.toLowerCase()}`}>{orderStatusLabel(order.status)}</span></td><td>{new Intl.NumberFormat('vi-VN').format(order.totalAmount)} ₫</td></tr>)}
      </tbody></table></div>
    </section>
  </main>
}
