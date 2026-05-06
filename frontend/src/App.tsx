import { Routes, Route } from 'react-router-dom'
import Landing from './pages/Landing'
import Verifier from './pages/Verifier'
import IssuerPortal from './pages/IssuerPortal'
import Pitch from './pages/Pitch'
import Holder from './pages/Holder'
import RoleGuard from './components/RoleGuard'

function App() {
  return (
    <Routes>
      {/* PUBLIC ROUTES — anyone, no role needed */}
      <Route path="/" element={<Landing />} />
      <Route path="/pitch" element={<Pitch />} />
      <Route path="/verify" element={<Verifier />} />
      <Route path="/verify/:txHash" element={<Verifier />} />

      {/* PROTECTED — University only */}
      <Route
        path="/issue"
        element={
          <RoleGuard allowedRoles={['university']}>
            <IssuerPortal />
          </RoleGuard>
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