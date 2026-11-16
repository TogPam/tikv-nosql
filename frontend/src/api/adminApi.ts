import { httpClient } from './httpClient'
import type { OrderStatus, ShoeOrder, ShoeProduct, SkuInventory } from '../types'

export const adminApi = {
  async products() { return (await httpClient.get<ShoeProduct[]>('/admin/products')).data },
  async createProduct(product: ShoeProduct) { return (await httpClient.post<ShoeProduct>('/admin/products', product)).data },
  async updateProduct(product: ShoeProduct) {
    return (await httpClient.put<ShoeProduct>(`/admin/products/${encodeURIComponent(product.shoeId)}`, product)).data
  },
  async orders(status?: OrderStatus) {
    return (await httpClient.get<ShoeOrder[]>('/admin/orders', { params: status ? { status } : {} })).data
  },
  async inventory() { return (await httpClient.get<SkuInventory[]>('/admin/inventory')).data },
  async updateInventory(item: SkuInventory) {
    return (await httpClient.put<SkuInventory>(`/admin/inventory/${encodeURIComponent(item.shoeId)}/${item.size}/${encodeURIComponent(item.color)}`, {
      availableQuantity: item.availableQuantity, reservedQuantity: item.reservedQuantity,
    })).data
  },
  async updateOrderStatus(orderId: string, status: OrderStatus) {
    return (await httpClient.put<ShoeOrder>(`/admin/orders/${encodeURIComponent(orderId)}/status`, { status })).data
  },
}
