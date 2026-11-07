/**
 * Sahifalar xaritasi (react-router):
 *   /                       katalog (hamma uchun)
 *   /mahsulot/:id           mahsulot sahifasi
 *   /kirish, /royxatdan-otish
 *   /savatcha, /buyurtmalarim         — faqat login qilganlar
 *   /admin/mahsulotlar, /admin/kategoriyalar, /admin/buyurtmalar — faqat admin
 */
import { Navigate, Route, Routes } from 'react-router-dom';
import Header from './components/layout/Header';
import RequireAuth from './components/layout/RequireAuth';
import CatalogPage from './pages/CatalogPage';
import ProductPage from './pages/ProductPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import CartPage from './pages/CartPage';
import OrdersPage from './pages/OrdersPage';
import NotFoundPage from './pages/NotFoundPage';
import AdminLayout from './pages/admin/AdminLayout';
import AdminResourcePage from './pages/admin/AdminResourcePage';
import AdminOrdersPage from './pages/admin/AdminOrdersPage';

export default function App() {
  return (
    <>
      <Header />
      <main className="page">
        <Routes>
          <Route path="/" element={<CatalogPage />} />
          <Route path="/mahsulot/:id" element={<ProductPage />} />
          <Route path="/kirish" element={<LoginPage />} />
          <Route path="/royxatdan-otish" element={<RegisterPage />} />
          <Route path="/savatcha" element={<RequireAuth><CartPage /></RequireAuth>} />
          <Route path="/buyurtmalarim" element={<RequireAuth><OrdersPage /></RequireAuth>} />
          <Route path="/admin" element={<RequireAuth admin><AdminLayout /></RequireAuth>}>
            <Route index element={<Navigate to="buyurtmalar" replace />} />
            <Route path="buyurtmalar" element={<AdminOrdersPage />} />
            <Route path="mahsulotlar" element={<AdminResourcePage key="products" resourceKey="products" />} />
            <Route path="kategoriyalar" element={<AdminResourcePage key="categories" resourceKey="categories" />} />
          </Route>
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </main>
    </>
  );
}
