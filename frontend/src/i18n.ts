import type { OrderStatus } from './types'

const orderStatusLabels: Record<OrderStatus, string> = {
  PENDING_PAYMENT: 'Chờ thanh toán',
  PAID: 'Đã thanh toán',
  PROCESSING: 'Đang chuẩn bị hàng',
  SHIPPING: 'Đang giao hàng',
  DELIVERED: 'Đã giao hàng',
  CANCELLED: 'Đã hủy',
}

const shoeDescriptions: Record<string, string> = {
  'SHOE-NIKE-AJ1': 'Thiết kế kinh điển trên sân bóng với dáng cổ thấp và chất liệu da cao cấp.',
  'SHOE-ADIDAS-UB': 'Đệm đàn hồi êm ái cùng thân giày dệt thoáng khí cho những bước chạy mỗi ngày.',
  'SHOE-PUMA-SUEDE': 'Phom dáng da lộn vượt thời gian, kết hợp đế cao su bền chắc.',
  'SHOE-LIMITED-01': 'Phiên bản giới hạn chỉ có một đôi duy nhất.',
}

const colorLabels: Record<string, string> = {
  'Black/White': 'Đen/Trắng',
  'Chicago Red': 'Đỏ Chicago',
  'Core Black': 'Đen chủ đạo',
  'Cloud White': 'Trắng mây',
  'Puma Black': 'Đen Puma',
  Navy: 'Xanh navy',
  BLACK: 'Đen',
}

export function orderStatusLabel(status: OrderStatus): string {
  return orderStatusLabels[status]
}

export function shoeDescription(shoeId: string, fallback: string): string {
  return shoeDescriptions[shoeId] ?? fallback
}

export function colorLabel(color: string): string {
  return colorLabels[color] ?? color
}