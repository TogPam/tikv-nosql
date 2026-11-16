import { useEffect, useState, type FormEvent } from 'react'
import { Check, RefreshCw } from 'lucide-react'
import { adminApi } from '../api/adminApi'
import { colorLabel, orderStatusLabel } from '../i18n'
import type { OrderStatus, ShoeOrder, ShoeProduct, SkuInventory } from '../types'

interface ProductDraft {
  shoeId: string
  name: string
  brand: string
  price: string
  sizes: string
  colors: string
  description: string
  imageUrl: string
}

const emptyProduct: ProductDraft = { shoeId: '', name: '', brand: '', price: '', sizes: '', colors: '', description: '', imageUrl: '' }
const allowedNextStatus: Record<OrderStatus, OrderStatus[]> = {
  PENDING_PAYMENT: ['PAID', 'CANCELLED'],
  PAID: ['PROCESSING', 'CANCELLED'],
  PROCESSING: ['SHIPPING', 'CANCELLED'],
  SHIPPING: ['DELIVERED'],
  DELIVERED: [],
  CANCELLED: [],
}
const statusNames: Record<OrderStatus, string> = {
  PENDING_PAYMENT: 'Chờ thanh toán', PAID: 'Đã thanh toán', PROCESSING: 'Đang chuẩn bị hàng',
  SHIPPING: 'Đang giao hàng', DELIVERED: 'Đã giao hàng', CANCELLED: 'Đã hủy',
}

function toDraft(product: ShoeProduct): ProductDraft {
  return { ...product, price: String(product.price), sizes: product.sizes.join(', '), colors: product.colors.join(', ') }
}

function fromDraft(draft: ProductDraft): ShoeProduct {
  return {
    ...draft,
    price: Number(draft.price),
    sizes: draft.sizes.split(',').map(Number).filter((size) => Number.isInteger(size) && size > 0),
    colors: draft.colors.split(',').map((color) => color.trim()).filter(Boolean),
  }
}

export function AdminDashboardPage() {
  const [orders, setOrders] = useState<ShoeOrder[]>([])
  const [products, setProducts] = useState<ShoeProduct[]>([])
  const [inventory, setInventory] = useState<SkuInventory[]>([])
  const [drafts, setDrafts] = useState<Record<string, { available: number; reserved: number }>>({})
  const [productDraft, setProductDraft] = useState<ProductDraft>(emptyProduct)
  const [editingProduct, setEditingProduct] = useState(false)
  const [orderStatusDrafts, setOrderStatusDrafts] = useState<Record<string, OrderStatus>>({})
  const [savingProduct, setSavingProduct] = useState(false)
  const [savingOrder, setSavingOrder] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  async function load() {
    try {
      const [nextOrders, nextInventory, nextProducts] = await Promise.all([adminApi.orders(), adminApi.inventory(), adminApi.products()])
      setOrders(nextOrders)
      setInventory(nextInventory)
      setProducts(nextProducts)
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

  async function saveProduct(event: FormEvent) {
    event.preventDefault()
    setMessage('')
    setError('')
    setSavingProduct(true)
    try {
      const product = fromDraft(productDraft)
      if (editingProduct) await adminApi.updateProduct(product)
      else await adminApi.createProduct(product)
      setMessage(editingProduct ? 'Đã cập nhật sản phẩm.' : 'Đã tạo sản phẩm mới. SKU mới được khởi tạo với tồn kho bằng 0.')
      setProductDraft(emptyProduct)
      setEditingProduct(false)
      await load()
    } catch (reason) {
      const response = (reason as { response?: { data?: { error?: string; message?: string } } }).response?.data
      setError(response?.error ?? response?.message ?? 'Không thể lưu sản phẩm. Vui lòng kiểm tra dữ liệu.')
    } finally { setSavingProduct(false) }
  }

  async function saveOrderStatus(order: ShoeOrder) {
    const nextStatus = orderStatusDrafts[order.orderId]
    if (!nextStatus) return
    setMessage('')
    setError('')
    setSavingOrder(order.orderId)
    try {
      await adminApi.updateOrderStatus(order.orderId, nextStatus)
      setMessage(`Đã chuyển đơn ${order.orderId} sang trạng thái ${statusNames[nextStatus]}.`)
      await load()
    } catch { setError('Không thể chuyển trạng thái đơn hàng. Hãy kiểm tra luồng trạng thái hợp lệ.') }
    finally { setSavingOrder(null) }
  }

  return <main className="page-shell admin-page">
    <div className="section-heading"><div><span className="eyebrow">VẬN HÀNH · QUẢN TRỊ</span><h1>Quản lý cửa hàng</h1></div><button className="icon-button" onClick={() => void load()} title="Tải lại dữ liệu" aria-label="Tải lại dữ liệu"><RefreshCw size={17} /></button></div>
    {message && <p className="notice success-notice">{message}</p>}{error && <p className="notice error-notice">{error}</p>}
    <section className="admin-section"><div className="admin-section-heading"><h2>Sản phẩm giày dép</h2><span>{products.length} sản phẩm</span></div>
      <form className="admin-product-form" onSubmit={saveProduct}>
        <label>Mã sản phẩm<input required minLength={3} disabled={editingProduct} value={productDraft.shoeId} onChange={(event) => setProductDraft({ ...productDraft, shoeId: event.target.value })} placeholder="Ví dụ: SHOE-NIKE-AJ1" /></label>
        <label>Tên sản phẩm<input required value={productDraft.name} onChange={(event) => setProductDraft({ ...productDraft, name: event.target.value })} /></label>
        <label>Thương hiệu<input required value={productDraft.brand} onChange={(event) => setProductDraft({ ...productDraft, brand: event.target.value })} /></label>
        <label>Giá bán (₫)<input required type="number" min="1" value={productDraft.price} onChange={(event) => setProductDraft({ ...productDraft, price: event.target.value })} /></label>
        <label>Kích cỡ EU<input required value={productDraft.sizes} onChange={(event) => setProductDraft({ ...productDraft, sizes: event.target.value })} placeholder="39, 40, 41" /></label>
        <label>Màu sắc<input required value={productDraft.colors} onChange={(event) => setProductDraft({ ...productDraft, colors: event.target.value })} placeholder="Đen, Trắng" /></label>
        <label className="admin-product-wide">Mô tả<textarea value={productDraft.description} onChange={(event) => setProductDraft({ ...productDraft, description: event.target.value })} /></label>
        <label className="admin-product-wide">Đường dẫn ảnh<input required type="url" value={productDraft.imageUrl} onChange={(event) => setProductDraft({ ...productDraft, imageUrl: event.target.value })} placeholder="https://..." /></label>
        <div className="admin-product-actions"><button className="primary-button" disabled={savingProduct}>{savingProduct ? 'Đang lưu…' : editingProduct ? 'Lưu thay đổi' : 'Thêm sản phẩm'}</button>{editingProduct && <button className="secondary-button" type="button" onClick={() => { setEditingProduct(false); setProductDraft(emptyProduct) }}>Hủy sửa</button>}</div>
      </form>
      <div className="table-scroll"><table className="data-table"><thead><tr><th>Mã</th><th>Tên sản phẩm</th><th>Thương hiệu</th><th>Giá</th><th>Kích cỡ / màu</th><th /></tr></thead><tbody>
        {products.map((product) => <tr key={product.shoeId}><td>{product.shoeId}</td><td>{product.name}</td><td>{product.brand}</td><td>{new Intl.NumberFormat('vi-VN').format(product.price)} ₫</td><td>{product.sizes.join(', ')} / {product.colors.map(colorLabel).join(', ')}</td><td><button className="secondary-button" onClick={() => { setProductDraft(toDraft(product)); setEditingProduct(true); setError(''); setMessage('') }}>Sửa</button></td></tr>)}
      </tbody></table></div>
    </section>
    <section className="admin-section"><div className="admin-section-heading"><h2>Tồn kho</h2><span>{inventory.length} phân loại</span></div>
      <div className="table-scroll"><table className="data-table"><thead><tr><th>Mã sản phẩm</th><th>Cỡ</th><th>Màu sắc</th><th>Có thể bán</th><th>Đang giữ</th><th /></tr></thead><tbody>
        {inventory.map((item) => { const value = draft(item); return <tr key={key(item)}><td>{item.shoeId}</td><td>{item.size}</td><td>{colorLabel(item.color)}</td><td><input aria-label="Số lượng có thể bán" type="number" min="0" value={value.available} onChange={(event) => setDrafts({ ...drafts, [key(item)]: { ...value, available: Number(event.target.value) } })} /></td><td><input aria-label="Số lượng đang giữ" type="number" min="0" value={value.reserved} onChange={(event) => setDrafts({ ...drafts, [key(item)]: { ...value, reserved: Number(event.target.value) } })} /></td><td><button className="icon-button" title="Lưu tồn kho" aria-label="Lưu tồn kho" onClick={() => void save(item)}><Check size={16} /></button></td></tr> })}
      </tbody></table></div>
    </section>
    <section className="admin-section"><div className="admin-section-heading"><h2>Đơn hàng gần đây</h2><span>{orders.length} đơn</span></div>
      <div className="table-scroll"><table className="data-table"><thead><tr><th>Mã đơn</th><th>Khách hàng</th><th>Ngày đặt</th><th>Trạng thái</th><th>Tổng tiền</th><th>Thao tác</th></tr></thead><tbody>
        {orders.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map((order) => { const options = allowedNextStatus[order.status]; return <tr key={order.orderId}><td>{order.orderId}</td><td>{order.customerId}</td><td>{new Date(order.createdAt).toLocaleDateString('vi-VN')}</td><td><span className={`status-label status-${order.status.toLowerCase()}`}>{orderStatusLabel(order.status)}</span></td><td>{new Intl.NumberFormat('vi-VN').format(order.totalAmount)} ₫</td><td>{options.length > 0 && <div className="admin-order-actions"><select aria-label={`Trạng thái mới cho ${order.orderId}`} value={orderStatusDrafts[order.orderId] ?? ''} onChange={(event) => setOrderStatusDrafts({ ...orderStatusDrafts, [order.orderId]: event.target.value as OrderStatus })}><option value="">Chọn trạng thái</option>{options.map((status) => <option key={status} value={status}>{statusNames[status]}</option>)}</select><button className="icon-button" title="Cập nhật trạng thái" aria-label="Cập nhật trạng thái" disabled={!orderStatusDrafts[order.orderId] || savingOrder === order.orderId} onClick={() => void saveOrderStatus(order)}><Check size={16} /></button></div>}</td></tr> })}
      </tbody></table></div>
    </section>
  </main>
}
