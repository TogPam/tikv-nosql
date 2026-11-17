import { useEffect, useState, type FormEvent } from 'react'
import { Activity, ArrowDownToLine, Boxes, Check, ChevronRight, CircleAlert, Database, LayoutDashboard, Package, RefreshCw, Search, ShoppingCart, X } from 'lucide-react'
import { adminApi } from '../api/adminApi'
import { colorLabel, orderStatusLabel } from '../i18n'
import type { OrderStatus, ShoeOrder, ShoeProduct, SkuInventory } from '../types'
import './database-console.css'

type Section = 'overview' | 'products' | 'inventory' | 'orders'
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
const sectionItems: { id: Section; label: string; icon: typeof LayoutDashboard }[] = [
  { id: 'overview', label: 'Tổng quan', icon: LayoutDashboard },
  { id: 'products', label: 'Sản phẩm', icon: Package },
  { id: 'inventory', label: 'Tồn kho', icon: Boxes },
  { id: 'orders', label: 'Đơn hàng', icon: ShoppingCart },
]
const statuses: OrderStatus[] = ['PENDING_PAYMENT', 'PAID', 'PROCESSING', 'SHIPPING', 'DELIVERED', 'CANCELLED']
const nextStatuses: Record<OrderStatus, OrderStatus[]> = {
  PENDING_PAYMENT: ['PAID', 'CANCELLED'],
  PAID: ['PROCESSING', 'CANCELLED'],
  PROCESSING: ['SHIPPING', 'CANCELLED'],
  SHIPPING: ['DELIVERED'],
  DELIVERED: [],
  CANCELLED: [],
}
const statusText: Record<OrderStatus, string> = {
  PENDING_PAYMENT: 'Chờ thanh toán', PAID: 'Đã thanh toán', PROCESSING: 'Đang chuẩn bị hàng',
  SHIPPING: 'Đang giao hàng', DELIVERED: 'Đã giao hàng', CANCELLED: 'Đã hủy',
}
const money = (value: number) => new Intl.NumberFormat('vi-VN').format(value)

function productToDraft(product: ShoeProduct): ProductDraft {
  return { ...product, price: String(product.price), sizes: product.sizes.join(', '), colors: product.colors.join(', ') }
}

function draftToProduct(draft: ProductDraft): ShoeProduct {
  return {
    ...draft,
    price: Number(draft.price),
    sizes: draft.sizes.split(',').map(Number).filter((size) => Number.isInteger(size) && size > 0),
    colors: draft.colors.split(',').map((color) => color.trim()).filter(Boolean),
  }
}

export function DatabaseConsolePage() {
  const [section, setSection] = useState<Section>('overview')
  const [products, setProducts] = useState<ShoeProduct[]>([])
  const [inventory, setInventory] = useState<SkuInventory[]>([])
  const [orders, setOrders] = useState<ShoeOrder[]>([])
  const [search, setSearch] = useState('')
  const [orderFilter, setOrderFilter] = useState<OrderStatus | ''>('')
  const [selectedOrder, setSelectedOrder] = useState<ShoeOrder | null>(null)
  const [productDraft, setProductDraft] = useState<ProductDraft>(emptyProduct)
  const [editingProduct, setEditingProduct] = useState(false)
  const [productFormOpen, setProductFormOpen] = useState(false)
  const [inventoryDrafts, setInventoryDrafts] = useState<Record<string, { available: number; reserved: number }>>({})
  const [orderStatusDraft, setOrderStatusDraft] = useState<OrderStatus | ''>('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')

  async function load() {
    setLoading(true)
    setError('')
    try {
      const [nextProducts, nextInventory, nextOrders] = await Promise.all([
        adminApi.products(), adminApi.inventory(), adminApi.orders(),
      ])
      setProducts(nextProducts)
      setInventory(nextInventory)
      setOrders(nextOrders)
      setSelectedOrder((current) => current ? nextOrders.find((order) => order.orderId === current.orderId) ?? null : null)
    } catch {
      setError('Không thể tải dữ liệu từ TiKV. Hãy kiểm tra backend và thử tải lại.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [])

  function inventoryKey(item: SkuInventory) { return `${item.shoeId}:${item.size}:${item.color}` }
  function inventoryValue(item: SkuInventory) {
    return inventoryDrafts[inventoryKey(item)] ?? { available: item.availableQuantity, reserved: item.reservedQuantity }
  }

  function showResult(message: string) {
    setNotice(message)
    setError('')
  }

  function showFailure(message: string) {
    setError(message)
    setNotice('')
  }

  function openCreateProduct() {
    setProductDraft(emptyProduct)
    setEditingProduct(false)
    setProductFormOpen(true)
    setNotice('')
  }

  function openEditProduct(product: ShoeProduct) {
    setProductDraft(productToDraft(product))
    setEditingProduct(true)
    setProductFormOpen(true)
    setNotice('')
  }

  async function saveProduct(event: FormEvent) {
    event.preventDefault()
    setSaving(true)
    setError('')
    setNotice('')
    try {
      const product = draftToProduct(productDraft)
      if (!product.sizes.length || !product.colors.length) {
        showFailure('Cần nhập ít nhất một cỡ giày và một màu.')
        return
      }
      if (editingProduct) await adminApi.updateProduct(product)
      else await adminApi.createProduct(product)
      setProductFormOpen(false)
      showResult(editingProduct ? 'Đã cập nhật sản phẩm trong TiKV.' : 'Đã tạo sản phẩm trong TiKV; tồn kho ban đầu bằng 0.')
      await load()
    } catch (reason) {
      const response = (reason as { response?: { data?: { message?: string; error?: string } } }).response?.data
      showFailure(response?.message ?? response?.error ?? 'Không thể lưu sản phẩm. Kiểm tra mã sản phẩm và dữ liệu.')
    } finally {
      setSaving(false)
    }
  }

  async function saveInventory(item: SkuInventory) {
    const value = inventoryValue(item)
    try {
      await adminApi.updateInventory({ ...item, availableQuantity: value.available, reservedQuantity: value.reserved })
      showResult(`Đã cập nhật tồn kho ${item.shoeId} · cỡ ${item.size} · ${colorLabel(item.color)}.`)
      await load()
    } catch {
      showFailure('Không thể cập nhật tồn kho.')
    }
  }

  async function saveOrderStatus() {
    if (!selectedOrder || !orderStatusDraft) return
    setSaving(true)
    try {
      await adminApi.updateOrderStatus(selectedOrder.orderId, orderStatusDraft)
      showResult(`Đã cập nhật trạng thái đơn ${selectedOrder.orderId}.`)
      setOrderStatusDraft('')
      await load()
    } catch {
      showFailure('Không thể chuyển trạng thái. Hãy kiểm tra trạng thái tiếp theo hợp lệ.')
    } finally {
      setSaving(false)
    }
  }

  function exportData() {
    const payload = { exportedAt: new Date().toISOString(), products, inventory, orders }
    const file = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(file)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `shoe-store-data-${new Date().toISOString().slice(0, 10)}.json`
    anchor.click()
    URL.revokeObjectURL(url)
    showResult('Đã xuất snapshot dữ liệu hiện tải từ TiKV.')
  }

  const query = search.trim().toLocaleLowerCase('vi')
  const filteredProducts = products.filter((product) => `${product.shoeId} ${product.name} ${product.brand}`.toLocaleLowerCase('vi').includes(query))
  const filteredInventory = inventory.filter((item) => `${item.shoeId} ${item.color} ${item.size}`.toLocaleLowerCase('vi').includes(query))
  const filteredOrders = orders
    .filter((order) => !orderFilter || order.status === orderFilter)
    .filter((order) => `${order.orderId} ${order.customerId} ${order.status}`.toLocaleLowerCase('vi').includes(query))
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
  const lowStock = inventory.filter((item) => item.availableQuantity <= 2).length
  const title = sectionItems.find((item) => item.id === section)?.label ?? 'Tổng quan'

  return <main className="database-console">
    <aside className="database-sidebar" aria-label="Điều hướng database">
      <div className="database-sidebar-title"><span className="database-mark"><Database size={17} /></span><div><strong>DATA / STORE</strong><small>TI KV CONSOLE</small></div></div>
      <p className="database-nav-caption">KHU VỰC DỮ LIỆU</p>
      <nav className="database-nav">
        {sectionItems.map(({ id, label, icon: Icon }) => <button key={id} className={section === id ? 'active' : ''} onClick={() => { setSection(id); setSearch(''); setNotice(''); setError('') }} aria-current={section === id ? 'page' : undefined}>
          <Icon size={17} /><span>{label}</span>{section === id && <ChevronRight className="database-nav-current" size={15} />}
        </button>)}
      </nav>
      <div className="database-sidebar-bottom"><span className="database-live-dot" /> Kết nối API quản trị</div>
    </aside>

    <section className="database-main">
      <header className="database-topline">
        <div><span className="eyebrow">QUẢN TRỊ · TI KV</span><h1>{section === 'overview' ? 'Database console' : title}</h1></div>
        <div className="database-toolbar">
          <button className="db-icon-action" onClick={() => void load()} disabled={loading} title="Tải lại dữ liệu" aria-label="Tải lại dữ liệu"><RefreshCw size={17} className={loading ? 'spinning' : ''} /></button>
          <button className="db-export-button" onClick={exportData} disabled={loading}><ArrowDownToLine size={16} /><span>Xuất JSON</span></button>
        </div>
      </header>

      {notice && <p className="db-feedback db-success"><Check size={16} />{notice}<button onClick={() => setNotice('')} aria-label="Đóng thông báo"><X size={15} /></button></p>}
      {error && <p className="db-feedback db-error"><CircleAlert size={16} />{error}<button onClick={() => setError('')} aria-label="Đóng thông báo"><X size={15} /></button></p>}

      {section === 'overview' && <>
        <div className="db-intro-line"><span>Trạng thái lưu trữ</span><strong><i className="database-live-dot" /> TiKV · qua backend API</strong></div>
        <div className="db-stat-grid">
          <article className="db-stat"><span>PRODUCT RECORDS</span><Package size={18} /><strong>{loading ? '—' : products.length}</strong><small>Hồ sơ sản phẩm</small></article>
          <article className="db-stat"><span>INVENTORY KEYS</span><Boxes size={18} /><strong>{loading ? '—' : inventory.length}</strong><small>SKU theo cỡ và màu</small></article>
          <article className="db-stat"><span>ORDER RECORDS</span><ShoppingCart size={18} /><strong>{loading ? '—' : orders.length}</strong><small>Đơn hàng đã ghi</small></article>
          <article className="db-stat db-stat-warning"><span>LOW STOCK</span><Activity size={18} /><strong>{loading ? '—' : lowStock}</strong><small>SKU còn không quá 2 đôi</small></article>
        </div>
        <div className="db-overview-grid">
          <section className="db-panel">
            <div className="db-panel-heading"><div><span className="eyebrow">QUICK READ</span><h2>Sản phẩm mới nhất</h2></div><button className="db-text-action" onClick={() => setSection('products')}>Mở danh sách <ChevronRight size={14} /></button></div>
            <div className="db-record-list">{products.slice(0, 5).map((product) => <button key={product.shoeId} className="db-product-row" onClick={() => { setSection('products'); setSearch(product.shoeId) }}><span className="db-record-id">{product.shoeId}</span><strong>{product.name}</strong><span>{money(product.price)} ₫</span></button>)}</div>
            {!loading && products.length === 0 && <p className="db-empty">Chưa có sản phẩm.</p>}
          </section>
          <section className="db-panel db-health-panel">
            <div className="db-panel-heading"><div><span className="eyebrow">DATA SAFETY</span><h2>Thao tác được cấp</h2></div><Database size={19} /></div>
            <p>Trang này chỉ đọc và cập nhật qua các API quản trị. Không có thao tác xóa key hoặc sửa dữ liệu TiKV thô.</p>
            <div className="db-health-row"><span>Quyền truy cập</span><strong>Admin only</strong></div>
            <div className="db-health-row"><span>Giao thức</span><strong>REST · JWT</strong></div>
            <div className="db-health-row"><span>Xuất snapshot</span><strong>JSON</strong></div>
          </section>
        </div>
      </>}

      {section === 'products' && <section className="db-panel db-data-panel">
        <div className="db-panel-heading"><div><span className="eyebrow">PREFIX · product:</span><h2>Danh mục sản phẩm <small>{filteredProducts.length}</small></h2></div><button className="db-primary-action" onClick={openCreateProduct}><Package size={16} /> Thêm sản phẩm</button></div>
        <label className="db-search"><Search size={16} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm theo mã, tên hoặc thương hiệu" /></label>
        <div className="db-table-scroll"><table className="db-table"><thead><tr><th>KEY / ID</th><th>SẢN PHẨM</th><th>BRAND</th><th>GIÁ</th><th>SKU OPTIONS</th><th /></tr></thead><tbody>
          {filteredProducts.map((product) => <tr key={product.shoeId}><td><code>product:{product.shoeId}</code></td><td><strong>{product.name}</strong><small>{product.description}</small></td><td>{product.brand}</td><td>{money(product.price)} ₫</td><td>{product.sizes.length} cỡ · {product.colors.length} màu</td><td><button className="db-row-action" onClick={() => openEditProduct(product)}>Sửa</button></td></tr>)}
        </tbody></table>{!loading && filteredProducts.length === 0 && <p className="db-empty">Không tìm thấy sản phẩm phù hợp.</p>}</div>
      </section>}

      {section === 'inventory' && <section className="db-panel db-data-panel">
        <div className="db-panel-heading"><div><span className="eyebrow">PREFIX · inv:</span><h2>Tồn kho theo SKU <small>{filteredInventory.length}</small></h2></div><span className="db-read-badge">{lowStock} SKU thấp</span></div>
        <label className="db-search"><Search size={16} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm theo mã sản phẩm, cỡ hoặc màu" /></label>
        <div className="db-table-scroll"><table className="db-table"><thead><tr><th>KEY / SKU</th><th>CỠ</th><th>MÀU</th><th>CÓ THỂ BÁN</th><th>ĐANG GIỮ</th><th /></tr></thead><tbody>
          {filteredInventory.map((item) => { const key = inventoryKey(item); const value = inventoryValue(item); return <tr key={key}><td><code>inv:{item.shoeId}:{item.size}:{item.color}</code></td><td>{item.size}</td><td>{colorLabel(item.color)}</td><td><input aria-label={`Số lượng bán ${key}`} type="number" min="0" value={value.available} onChange={(event) => setInventoryDrafts({ ...inventoryDrafts, [key]: { ...value, available: Number(event.target.value) } })} /></td><td><input aria-label={`Số lượng giữ ${key}`} type="number" min="0" value={value.reserved} onChange={(event) => setInventoryDrafts({ ...inventoryDrafts, [key]: { ...value, reserved: Number(event.target.value) } })} /></td><td><button className="db-icon-action db-save-action" onClick={() => void saveInventory(item)} title="Lưu tồn kho" aria-label={`Lưu tồn kho ${key}`}><Check size={16} /></button></td></tr> })}
        </tbody></table>{!loading && filteredInventory.length === 0 && <p className="db-empty">Không tìm thấy SKU phù hợp.</p>}</div>
      </section>}

      {section === 'orders' && <div className="db-orders-layout">
        <section className="db-panel db-data-panel">
          <div className="db-panel-heading"><div><span className="eyebrow">PREFIX · order:</span><h2>Đơn hàng <small>{filteredOrders.length}</small></h2></div></div>
          <div className="db-order-filters"><label className="db-search"><Search size={16} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Mã đơn, khách hàng" /></label><select aria-label="Lọc trạng thái đơn" value={orderFilter} onChange={(event) => setOrderFilter(event.target.value as OrderStatus | '')}><option value="">Mọi trạng thái</option>{statuses.map((status) => <option key={status} value={status}>{statusText[status]}</option>)}</select></div>
          <div className="db-table-scroll"><table className="db-table db-orders-table"><thead><tr><th>MÃ ĐƠN</th><th>KHÁCH HÀNG</th><th>TRẠNG THÁI</th><th>TỔNG</th></tr></thead><tbody>
            {filteredOrders.map((order) => <tr key={order.orderId} className={selectedOrder?.orderId === order.orderId ? 'selected' : ''} onClick={() => { setSelectedOrder(order); setOrderStatusDraft('') }} tabIndex={0} onKeyDown={(event) => { if (event.key === 'Enter') { setSelectedOrder(order); setOrderStatusDraft('') } }}><td><code>{order.orderId}</code></td><td>{order.customerId}</td><td><span className={`status-label status-${order.status.toLowerCase()}`}>{orderStatusLabel(order.status)}</span></td><td>{money(order.totalAmount)} ₫</td></tr>)}
          </tbody></table>{!loading && filteredOrders.length === 0 && <p className="db-empty">Không tìm thấy đơn hàng.</p>}</div>
        </section>
        <section className="db-panel db-order-detail">
          {selectedOrder ? <>
            <div className="db-panel-heading"><div><span className="eyebrow">RECORD DETAIL</span><h2>Chi tiết đơn</h2></div><button className="db-icon-action" onClick={() => setSelectedOrder(null)} title="Đóng chi tiết" aria-label="Đóng chi tiết"><X size={16} /></button></div>
            <code className="db-detail-key">order:{selectedOrder.orderId}</code>
            <dl className="db-order-meta"><div><dt>Khách hàng</dt><dd>{selectedOrder.customerId}</dd></div><div><dt>Ngày tạo</dt><dd>{new Date(selectedOrder.createdAt).toLocaleString('vi-VN')}</dd></div><div><dt>Địa chỉ</dt><dd>{selectedOrder.shippingAddress}</dd></div><div><dt>Trạng thái</dt><dd><span className={`status-label status-${selectedOrder.status.toLowerCase()}`}>{orderStatusLabel(selectedOrder.status)}</span></dd></div></dl>
            <h3 className="db-detail-subtitle">Mặt hàng</h3>
            <div className="db-line-items">{selectedOrder.items.map((item, index) => <div key={`${item.shoeId}-${item.size}-${item.color}-${index}`}><div><strong>{item.shoeName}</strong><small>{item.shoeId} · cỡ {item.size} · {colorLabel(item.color)} · SL {item.quantity}</small></div><span>{money(item.unitPrice * item.quantity)} ₫</span></div>)}</div>
            <div className="db-total-line"><span>Tổng cộng</span><strong>{money(selectedOrder.totalAmount)} ₫</strong></div>
            {nextStatuses[selectedOrder.status].length > 0 && <div className="db-status-control"><label>Chuyển trạng thái<select value={orderStatusDraft} onChange={(event) => setOrderStatusDraft(event.target.value as OrderStatus | '')}><option value="">Chọn trạng thái tiếp</option>{nextStatuses[selectedOrder.status].map((status) => <option key={status} value={status}>{statusText[status]}</option>)}</select></label><button className="db-primary-action" disabled={!orderStatusDraft || saving} onClick={() => void saveOrderStatus()}><Check size={15} /> Cập nhật</button></div>}
          </> : <div className="db-detail-empty"><ShoppingCart size={22} /><strong>Chọn một đơn hàng</strong><span>Bản ghi và mặt hàng sẽ hiển thị ở đây.</span></div>}
        </section>
      </div>}

      {loading && <div className="db-loading"><RefreshCw size={17} className="spinning" /> Đang đồng bộ dữ liệu…</div>}
    </section>

    {productFormOpen && <div className="db-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setProductFormOpen(false) }}>
      <section className="db-modal" role="dialog" aria-modal="true" aria-labelledby="db-product-form-title">
        <div className="db-panel-heading"><div><span className="eyebrow">PRODUCT RECORD</span><h2 id="db-product-form-title">{editingProduct ? 'Sửa sản phẩm' : 'Thêm sản phẩm'}</h2></div><button className="db-icon-action" onClick={() => setProductFormOpen(false)} title="Đóng" aria-label="Đóng"><X size={17} /></button></div>
        <form className="db-product-form" onSubmit={(event) => void saveProduct(event)}>
          <label>Mã sản phẩm<input required minLength={3} disabled={editingProduct} value={productDraft.shoeId} onChange={(event) => setProductDraft({ ...productDraft, shoeId: event.target.value })} placeholder="SHOE-NEW-001" /></label>
          <label>Tên sản phẩm<input required value={productDraft.name} onChange={(event) => setProductDraft({ ...productDraft, name: event.target.value })} /></label>
          <label>Thương hiệu<input required value={productDraft.brand} onChange={(event) => setProductDraft({ ...productDraft, brand: event.target.value })} /></label>
          <label>Giá bán (₫)<input required type="number" min="1" value={productDraft.price} onChange={(event) => setProductDraft({ ...productDraft, price: event.target.value })} /></label>
          <label>Cỡ EU<input required value={productDraft.sizes} onChange={(event) => setProductDraft({ ...productDraft, sizes: event.target.value })} placeholder="39, 40, 41" /></label>
          <label>Màu sắc<input required value={productDraft.colors} onChange={(event) => setProductDraft({ ...productDraft, colors: event.target.value })} placeholder="Black, White" /></label>
          <label className="db-form-wide">Mô tả<textarea value={productDraft.description} onChange={(event) => setProductDraft({ ...productDraft, description: event.target.value })} /></label>
          <label className="db-form-wide">URL ảnh<input required type="url" value={productDraft.imageUrl} onChange={(event) => setProductDraft({ ...productDraft, imageUrl: event.target.value })} placeholder="https://..." /></label>
          <div className="db-modal-actions"><button className="secondary-button" type="button" onClick={() => setProductFormOpen(false)}>Hủy</button><button className="db-primary-action" disabled={saving}>{saving ? 'Đang lưu…' : editingProduct ? 'Lưu thay đổi' : 'Tạo bản ghi'}</button></div>
        </form>
      </section>
    </div>}
  </main>
}
