export interface ShoeProduct {
  shoeId: string
  name: string
  brand: string
  price: number
  sizes: number[]
  colors: string[]
  description: string
  imageUrl: string
}

export interface SkuInventory {
  shoeId: string
  size: number
  color: string
  availableQuantity: number
  reservedQuantity: number
}

export type OrderStatus = 'PENDING_PAYMENT' | 'PAID' | 'PROCESSING' | 'SHIPPING' | 'DELIVERED' | 'CANCELLED'

export interface OrderItem {
  shoeId: string
  shoeName: string
  size: number
  color: string
  quantity: number
  unitPrice: number
}

export interface ShoeOrder {
  orderId: string
  customerId: string
  items: OrderItem[]
  totalAmount: number
  status: OrderStatus
  createdAt: string
  shippingAddress: string
}

export interface OrderStatusHistory {
  orderId: string
  status: OrderStatus
  changedAt: string
  note: string
}

export interface AuthResponse {
  token: string
  username: string
  roles: string[]
}
