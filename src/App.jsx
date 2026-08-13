import { lazy, Suspense } from 'react'
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

// La librería de generación de Excel es pesada (~900kB) y solo la usa
// admin/anfitriona/directivo al entrar a Reportes — se separa en su propio
// chunk para no cargarla en el resto de la app (incluido el celular de
// cualquier comercial, que nunca visita esta pantalla).
const ReportesPage = lazy(() => import('./pages/ReportesPage'))

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
                <ProtectedRoute roles={['admin', 'gerente', 'anfitriona']}>
                  <AnfitrionaPage />
                </ProtectedRoute>
              }
            />
            <Route path="/vehiculos" element={<VehiculosPage />} />
            <Route path="/reservas" element={<ReservasPage />} />
            <Route
              path="/comerciales"
              element={
                <ProtectedRoute roles={['admin', 'gerente', 'anfitriona', 'directivo']}>
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
                <ProtectedRoute roles={['admin', 'gerente']}>
                  <AdminPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/reportes"
              element={
                <ProtectedRoute roles={['admin', 'gerente', 'anfitriona', 'directivo']}>
                  <Suspense fallback={<div className="p-6 text-center text-gray-500 text-sm">Cargando…</div>}>
                    <ReportesPage />
                  </Suspense>
                </ProtectedRoute>
              }
            />
          </Route>
        </Routes>
      </HashRouter>
    </AuthProvider>
  )
}
