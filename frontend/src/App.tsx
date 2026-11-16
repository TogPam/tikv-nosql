import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Navbar } from './components/Navbar'
import { ProtectedRoute } from './components/ProtectedRoute'
import { AuthProvider } from './context/AuthContext'
import { CartProvider } from './context/CartContext'
import { AdminDashboardPage } from './pages/AdminDashboardPage'
import { AuthPage } from './pages/AuthPage'
import { CartCheckoutPage } from './pages/CartCheckoutPage'
import { OrderTrackingPage } from './pages/OrderTrackingPage'
import { ShoeDetailPage } from './pages/ShoeDetailPage'
import { StorefrontPage } from './pages/StorefrontPage'
import './features.css'

export function App() {
  return <AuthProvider><CartProvider><BrowserRouter><Navbar /><Routes>
    <Route path="/" element={<StorefrontPage />} />
    <Route path="/shoes/:shoeId" element={<ShoeDetailPage />} />
    <Route path="/login" element={<AuthPage />} />
    <Route element={<ProtectedRoute />}>
      <Route path="/cart" element={<CartCheckoutPage />} />
      <Route path="/orders/:orderId" element={<OrderTrackingPage />} />
      <Route path="/orders" element={<Navigate to="/orders/current" replace />} />
    </Route>
    <Route element={<ProtectedRoute admin />}><Route path="/admin" element={<AdminDashboardPage />} /></Route>
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes></BrowserRouter></CartProvider></AuthProvider>
}
