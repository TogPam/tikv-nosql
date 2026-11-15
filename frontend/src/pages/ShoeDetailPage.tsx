import { useEffect, useState } from 'react'
import { ArrowLeft, ArrowUpRight, Check, Plus } from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { shoeApi } from '../api/shoeApi'
import { colorLabel, shoeDescription } from '../i18n'
import { useCart } from '../context/CartContext'
import type { ShoeProduct, SkuInventory } from '../types'

export function ShoeDetailPage() {
  const { shoeId = '' } = useParams()
  const navigate = useNavigate()
  const { add } = useCart()
  const [product, setProduct] = useState<ShoeProduct | null>(null)
  const [size, setSize] = useState<number | null>(null)
  const [color, setColor] = useState('')
  const [stock, setStock] = useState<SkuInventory | null>(null)
  const [checking, setChecking] = useState(false)
  const [error, setError] = useState('')
  const [added, setAdded] = useState(false)

  useEffect(() => {
    shoeApi.get(shoeId).then((item) => { setProduct(item); setSize(item.sizes[0] ?? null); setColor(item.colors[0] ?? '') })
      .catch(() => setError('Không tìm thấy sản phẩm này.'))
  }, [shoeId])

  useEffect(() => {
    if (!product || size === null || !color) return
    let active = true
    const check = () => {
      setChecking(true)
      shoeApi.inventory(product.shoeId, size, color).then((value) => { if (active) setStock(value) })
        .catch(() => { if (active) setStock(null) }).finally(() => { if (active) setChecking(false) })
    }
    check()
    const timer = window.setInterval(check, 5000)
    return () => { active = false; window.clearInterval(timer) }
  }, [product, size, color])

  if (error && !product) return <main className="page-shell"><p className="notice error-notice">{error}</p><Link to="/">Quay lại bộ sưu tập</Link></main>
  if (!product) return <main className="page-shell loading-state">Đang tải sản phẩm…</main>
  const canAdd = Boolean(stock && stock.availableQuantity > 0 && size && color)

  function addToBag() {
    if (!product || size === null || !color || !canAdd) return
    add(product, size, color)
    setAdded(true)
    window.setTimeout(() => setAdded(false), 1600)
  }

  return <main className="detail-page page-shell">
    <Link to="/" className="back-link"><ArrowLeft size={16} /> Bộ sưu tập</Link>
    <div className="detail-layout">
      <div className="detail-image"><img src={product.imageUrl} alt={product.name} /><span className="image-caption">MÃ SẢN PHẨM · {product.shoeId.slice(-4)}</span></div>
      <section className="detail-info"><span className="eyebrow">{product.brand} · BỘ SƯU TẬP</span><h1>{product.name}</h1><p className="detail-description">{shoeDescription(product.shoeId, product.description)}</p><div className="detail-price">{new Intl.NumberFormat('vi-VN').format(product.price)} <small>₫</small></div>
        <div className="selector-block"><div className="selector-title"><span>KÍCH CỠ</span><span>EU</span></div><div className="size-grid">{product.sizes.map((option) => <button key={option} className={size === option ? 'selected' : ''} onClick={() => setSize(option)}>{option}</button>)}</div></div>
        <div className="selector-block"><div className="selector-title"><span>MÀU SẮC</span><span>{colorLabel(color)}</span></div><div className="color-list">{product.colors.map((option) => <button key={option} className={color === option ? 'selected' : ''} onClick={() => setColor(option)}><span className={`color-dot color-${option.toLowerCase().replace(/[^a-z]+/g, '-')}`} />{colorLabel(option)}{color === option && <Check size={14} />}</button>)}</div></div>
        <div className={`stock-line ${stock?.availableQuantity ? 'in-stock' : 'out-stock'}`}><span className="stock-indicator" />{checking ? 'Đang kiểm tra tồn kho…' : stock ? stock.availableQuantity > 0 ? `Còn ${stock.availableQuantity} đôi ở kích cỡ này` : 'Sản phẩm hiện đã hết hàng' : 'Không thể kiểm tra tồn kho'}</div>
        <button className="primary-button add-button" disabled={!canAdd} onClick={addToBag}>{added ? <><Check size={17} /> Đã thêm vào giỏ</> : <><Plus size={17} /> Thêm vào giỏ <ArrowUpRight size={16} /></>}</button>
        <button className="text-button" onClick={() => navigate('/cart')}>Xem giỏ hàng <ArrowUpRight size={14} /></button>
        <p className="detail-note">Miễn phí giao hàng · Thanh toán an toàn</p>
      </section>
    </div>
  </main>
}
