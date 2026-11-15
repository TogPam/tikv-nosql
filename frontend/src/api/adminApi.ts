import { httpClient } from './httpClient'
import type { OrderStatus, ShoeOrder, SkuInventory } from '../types'

export const adminApi = {
  async orders(status?: OrderStatus) {
    return (await httpClient.get<ShoeOrder[]>('/admin/orders', { params: status ? { status } : {} })).data
  },
  async inventory() { return (await httpClient.get<SkuInventory[]>('/admin/inventory')).data },
  async updateInventory(item: SkuInventory) {
    return (await httpClient.put<SkuInventory>(`/admin/inventory/${encodeURIComponent(item.shoeId)}/${item.size}/${encodeURIComponent(item.color)}`, {
      availableQuantity: item.availableQuantity, reservedQuantity: item.reservedQuantity,
    })).data
  },
}
