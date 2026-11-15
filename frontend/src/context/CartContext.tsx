import { createContext, useContext, useState, type ReactNode } from 'react'
import type { ShoeProduct } from '../types'

export interface CartLine { product: ShoeProduct; size: number; color: string; quantity: number }
interface CartContextValue {
  items: CartLine[]
  add: (product: ShoeProduct, size: number, color: string, quantity?: number) => void
  remove: (shoeId: string, size: number, color: string) => void
  clear: () => void
  count: number
  total: number
}
const CartContext = createContext<CartContextValue | null>(null)

function readCart(): CartLine[] {
  try { return JSON.parse(localStorage.getItem('shoe-store-cart') ?? '[]') as CartLine[] }
  catch { return [] }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartLine[]>(readCart)
  function commit(next: CartLine[]) {
    localStorage.setItem('shoe-store-cart', JSON.stringify(next))
    setItems(next)
  }
  function add(product: ShoeProduct, size: number, color: string, quantity = 1) {
    const found = items.find((item) => item.product.shoeId === product.shoeId && item.size === size && item.color === color)
    commit(found ? items.map((item) => item === found ? { ...item, quantity: item.quantity + quantity } : item)
      : [...items, { product, size, color, quantity }])
  }
  function remove(shoeId: string, size: number, color: string) {
    commit(items.filter((item) => !(item.product.shoeId === shoeId && item.size === size && item.color === color)))
  }
  function clear() { commit([]) }
  const count = items.reduce((sum, item) => sum + item.quantity, 0)
  const total = items.reduce((sum, item) => sum + item.product.price * item.quantity, 0)
  return <CartContext.Provider value={{ items, add, remove, clear, count, total }}>{children}</CartContext.Provider>
}

export function useCart() {
  const value = useContext(CartContext)
  if (!value) throw new Error('useCart must be used within CartProvider')
  return value
}
