import { httpClient } from './httpClient'
import type { OrderStatusHistory, ShoeOrder } from '../types'

export interface OrderInput {
  shippingAddress: string
  items: Array<{ shoeId: string; size: number; color: string; quantity: number }>
}

export const orderApi = {
  async create(input: OrderInput) { return (await httpClient.post<ShoeOrder>('/orders', input)).data },
  async mine() { return (await httpClient.get<ShoeOrder[]>('/orders')).data },
  async get(orderId: string) { return (await httpClient.get<ShoeOrder>(`/orders/${encodeURIComponent(orderId)}`)).data },
  async history(orderId: string) { return (await httpClient.get<OrderStatusHistory[]>(`/orders/${encodeURIComponent(orderId)}/history`)).data },
  async pay(orderId: string) { return (await httpClient.post<ShoeOrder>(`/orders/${encodeURIComponent(orderId)}/pay`, { method: 'DEMO' })).data },
  async cancel(orderId: string) { return (await httpClient.post<ShoeOrder>(`/orders/${encodeURIComponent(orderId)}/cancel`)).data },
}
