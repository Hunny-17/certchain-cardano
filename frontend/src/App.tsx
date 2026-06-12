import { Routes, Route } from 'react-router-dom'
import Landing from './pages/Landing'
import Verifier from './pages/Verifier'
import IssuerPortal from './pages/IssuerPortal'
import Pitch from './pages/Pitch'
import Holder from './pages/Holder'
import Login from './pages/Login'
import PendingVerification from './pages/PendingVerification'
import Unauthorized from './pages/Unauthorized'
import RoleGuard from './components/RoleGuard'
import AuthGuard from './components/AuthGuard'
import V3Demo from './pages/v3/V3Demo'
import ErrorBoundary from './components/ErrorBoundary'

function App() {
  return (
    <Routes>
      {/* PUBLIC ROUTES — anyone, no role needed */}
      <Route path="/" element={<Landing />} />
      <Route path="/v3-demo" element={<V3Demo />} />
      <Route path="/pitch" element={<Pitch />} />
      <Route path="/login" element={<Login />} />
      <Route path="/pending-verification" element={<PendingVerification />} />
      <Route path="/unauthorized" element={<Unauthorized />} />
      <Route path="/verify" element={<ErrorBoundary><Verifier /></ErrorBoundary>} />
      <Route path="/verify/:txHash" element={<ErrorBoundary><Verifier /></ErrorBoundary>} />

      {/* PROTECTED — Verified university issuer (Supabase Auth) */}
      <Route
        path="/issue"
        element={
          <AuthGuard requireRole="issuer">
            <IssuerPortal />
          </AuthGuard>
        }
      />

      {/* PROTECTED — Student or University */}
      <Route
        path="/holder"
        element={
          <RoleGuard allowedRoles={['student', 'university']}>
            <Holder />
          </RoleGuard>
        }
      />
    </Routes>
  )
}

export default App