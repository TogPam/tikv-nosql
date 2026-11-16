import { useEffect, useState } from 'react'
import { ArrowDownRight, ArrowUpRight, Search } from 'lucide-react'
import { shoeApi } from '../api/shoeApi'
import { ShoeCard } from '../components/ShoeCard'
import type { ShoeProduct } from '../types'

export function StorefrontPage() {
  const [shoes, setShoes] = useState<ShoeProduct[]>([])
  const [brand, setBrand] = useState('Tất cả')
  const [search, setSearch] = useState('')
  const [size, setSize] = useState('')
  const [minPrice, setMinPrice] = useState('')
  const [maxPrice, setMaxPrice] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    shoeApi.list().then(setShoes).catch(() => setError('Không thể tải danh sách giày. Vui lòng kiểm tra kết nối máy chủ.'))
  }, [])

  const brands = ['Tất cả', ...new Set(shoes.map((shoe) => shoe.brand))]
  const filtered = shoes.filter((shoe) => (brand === 'Tất cả' || shoe.brand === brand)
    && `${shoe.name} ${shoe.brand}`.toLowerCase().includes(search.toLowerCase())
    && (!size || shoe.sizes.includes(Number(size)))
    && (!minPrice || shoe.price >= Number(minPrice))
    && (!maxPrice || shoe.price <= Number(maxPrice)))
  const sizes = [...new Set(shoes.flatMap((shoe) => shoe.sizes))].sort((a, b) => a - b)
  const featured = shoes.find((shoe) => shoe.shoeId === 'SHOE-LIMITED-01') ?? shoes[0]

  return <main className="store-page">
    {featured && <section className="feature-strip">
      <img src={featured.imageUrl} alt={featured.name} />
      <div className="feature-shade" />
      <div className="feature-copy"><span className="feature-kicker">F/F · PHIÊN BẢN GIỚI HẠN</span><h1>{featured.name}</h1><p>Một đôi giày đặc biệt, sinh ra để đồng hành cùng bạn.</p><a className="feature-link" href={`/shoes/${encodeURIComponent(featured.shoeId)}`}>Khám phá ngay <ArrowUpRight size={17} /></a></div>
      <span className="feature-index">01 / 04</span>
      <a className="scroll-cue" href="#collection"><span>Xem bộ sưu tập</span><ArrowDownRight size={15} /></a>
    </section>}
    <section className="collection-section" id="collection">
      <div className="section-heading"><div><span className="eyebrow">BỘ SƯU TẬP ĐƯỢC TUYỂN CHỌN</span><h2>Tìm đôi giày dành cho bạn.</h2></div><span className="result-count">{filtered.length.toString().padStart(2, '0')} mẫu</span></div>
      <div className="collection-tools"><div className="brand-tabs">{brands.map((name) => <button key={name} className={brand === name ? 'active' : ''} onClick={() => setBrand(name)}>{name}</button>)}</div><label className="search-box"><Search size={16} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm trong bộ sưu tập" /></label></div>
      <div className="catalog-filters" aria-label="Bộ lọc sản phẩm">
        <label>Kích cỡ<select value={size} onChange={(event) => setSize(event.target.value)}><option value="">Tất cả kích cỡ</option>{sizes.map((option) => <option key={option} value={option}>EU {option}</option>)}</select></label>
        <label>Giá từ<input type="number" min="0" value={minPrice} onChange={(event) => setMinPrice(event.target.value)} placeholder="0 ₫" /></label>
        <label>Đến<input type="number" min="0" value={maxPrice} onChange={(event) => setMaxPrice(event.target.value)} placeholder="Không giới hạn" /></label>
        {(size || minPrice || maxPrice) && <button className="text-button" onClick={() => { setSize(''); setMinPrice(''); setMaxPrice('') }}>Xóa lọc</button>}
      </div>
      {error && <p className="notice error-notice">{error}</p>}
      <div className="product-grid">{filtered.map((shoe, index) => <ShoeCard key={shoe.shoeId} product={shoe} index={index} />)}</div>
      {!error && filtered.length === 0 && <p className="empty-state">Không tìm thấy mẫu giày phù hợp.</p>}
    </section>
    <footer className="site-footer"><span>FORM & FUNCTION · VIỆT NAM</span><span>Bền bỉ đồng hành trên mọi hành trình.</span><span>© 2026</span></footer>
  </main>
}
