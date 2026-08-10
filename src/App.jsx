import { HashRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import Layout from './components/Layout'
import LoginPage from './pages/LoginPage'
import HomePage from './pages/HomePage'
import AnfitrionaPage from './pages/AnfitrionaPage'
import VehiculosPage from './pages/VehiculosPage'
import ComercialPage from './pages/ComercialPage'
import AdminPage from './pages/AdminPage'
import ReservasPage from './pages/ReservasPage'
import ComercialesPage from './pages/ComercialesPage'
import CambiarPasswordPage from './pages/CambiarPasswordPage'

export default function App() {
  return (
    <AuthProvider>
      <HashRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route path="/" element={<HomePage />} />
            <Route path="/cambiar-password" element={<CambiarPasswordPage />} />
            <Route
              path="/anfitriona"
              element={
                <ProtectedRoute roles={['admin', 'anfitriona']}>
                  <AnfitrionaPage />
                </ProtectedRoute>
              }
            />
            <Route path="/vehiculos" element={<VehiculosPage />} />
            <Route path="/reservas" element={<ReservasPage />} />
            <Route
              path="/comerciales"
              element={
                <ProtectedRoute roles={['admin', 'anfitriona', 'directivo']}>
                  <ComercialesPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/comercial"
              element={
                <ProtectedRoute roles={['comercial']}>
                  <ComercialPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin"
              element={
                <ProtectedRoute roles={['admin']}>
                  <AdminPage />
                </ProtectedRoute>
              }
            />
          </Route>
        </Routes>
      </HashRouter>
    </AuthProvider>
  )
}
