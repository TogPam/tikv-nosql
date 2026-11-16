import { httpClient } from './httpClient'
import type { ShoeProduct, SkuInventory } from '../types'

export const shoeApi = {
  async list() { return (await httpClient.get<ShoeProduct[]>('/shoes')).data },
  async get(shoeId: string) { return (await httpClient.get<ShoeProduct>(`/shoes/${encodeURIComponent(shoeId)}`)).data },
  async inventory(shoeId: string, size: number, color: string) {
    return (await httpClient.get<SkuInventory>('/inventory', { params: { shoeId, size, color } })).data
  },
}
