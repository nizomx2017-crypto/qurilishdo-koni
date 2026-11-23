/**
 * Sahifalar xaritasi (react-router):
 *   Ochiq qism (mijoz, login yo'q) — PublicLayout:
 *     /                   katalog
 *     /mahsulot/:id       mahsulot sahifasi
 *     /savatcha           savatcha va buyurtma (ism, telefon, manzil shu yerda)
 *   Xodimlar paneli — /panel/* (username + parol), PanelLayout:
 *     /panel/login, /panel/change-password (vaqtinchalik parolda majburiy), /panel/buyurtmalar, /panel/mahsulotlar, /panel/kategoriyalar  — access bo'yicha
 *     /panel/users, /panel/roles  — ADMIN, DIRECTOR;  /panel/login-attempts — ADMIN
 * Sessiya tugasa faqat /panel/* sahifalari loginga qaytadi; ochiq sahifalar ishlashda davom etadi.
 */
import { Navigate, Route, Routes } from 'react-router-dom';
import PublicLayout from './components/layout/PublicLayout';
import PanelLayout from './components/layout/PanelLayout';
import ProtectedRoute from './components/auth/ProtectedRoute';
import CatalogPage from './pages/CatalogPage';
import ProductPage from './pages/ProductPage';
import CartPage from './pages/CartPage';
import NotFoundPage from './pages/NotFoundPage';
import PanelLoginPage from './pages/panel/LoginPage';
import ChangePasswordPage from './pages/panel/ChangePasswordPage';
import PanelHome from './pages/panel/PanelHome';
import UsersPage from './pages/panel/UsersPage';
import RolesPage from './pages/panel/RolesPage';
import LoginAttemptsPage from './pages/panel/LoginAttemptsPage';
import AdminResourcePage from './pages/admin/AdminResourcePage';
import AdminOrdersPage from './pages/admin/AdminOrdersPage';

const MANAGERS = ['ADMIN', 'DIRECTOR'];

export default function App() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route path="/" element={<CatalogPage />} />
        <Route path="/mahsulot/:id" element={<ProductPage />} />
        <Route path="/savatcha" element={<CartPage />} />
        {/* Eski manzillar */}
        <Route path="/kirish" element={<Navigate to="/panel/login" replace />} />
        <Route path="/royxatdan-otish" element={<Navigate to="/" replace />} />
        <Route path="/buyurtmalarim" element={<Navigate to="/" replace />} />
        <Route path="/admin/*" element={<Navigate to="/panel" replace />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>

      <Route path="/panel/login" element={<main className="page"><PanelLoginPage /></main>} />
      <Route path="/panel/change-password" element={<main className="page"><ChangePasswordPage /></main>} />
      <Route path="/panel" element={<ProtectedRoute><PanelLayout /></ProtectedRoute>}>
        <Route index element={<PanelHome />} />
        <Route path="buyurtmalar" element={<ProtectedRoute access="ORDER_VIEW"><AdminOrdersPage /></ProtectedRoute>} />
        <Route
          path="mahsulotlar"
          element={<ProtectedRoute access="PRODUCT_VIEW"><AdminResourcePage key="products" resourceKey="products" /></ProtectedRoute>}
        />
        <Route
          path="kategoriyalar"
          element={<ProtectedRoute access="CATEGORY_VIEW"><AdminResourcePage key="categories" resourceKey="categories" /></ProtectedRoute>}
        />
        <Route path="users" element={<ProtectedRoute roleTypes={MANAGERS}><UsersPage /></ProtectedRoute>} />
        <Route path="roles" element={<ProtectedRoute roleTypes={MANAGERS}><RolesPage /></ProtectedRoute>} />
        <Route path="login-attempts" element={<ProtectedRoute roleTypes={['ADMIN']}><LoginAttemptsPage /></ProtectedRoute>} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
