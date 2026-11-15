import { ArrowUpRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { ShoeProduct } from '../types'

export function ShoeCard({ product, index = 0 }: { product: ShoeProduct; index?: number }) {
  return <Link className="shoe-card" to={`/shoes/${encodeURIComponent(product.shoeId)}`} style={{ animationDelay: `${index * 70}ms` }}>
    <div className="shoe-image-wrap">
      <img src={product.imageUrl} alt={product.name} loading="lazy" />
      {product.shoeId === 'SHOE-LIMITED-01' && <span className="limited-tag">Chỉ còn 1 đôi</span>}
      <span className="shoe-open"><ArrowUpRight size={18} /></span>
    </div>
    <div className="shoe-card-copy"><div><span className="eyebrow">{product.brand}</span><h2>{product.name}</h2></div><strong>{new Intl.NumberFormat('vi-VN').format(product.price)} <small>₫</small></strong></div>
  </Link>
}
