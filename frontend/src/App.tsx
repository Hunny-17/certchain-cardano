import { Routes, Route } from 'react-router-dom'
import Landing from './pages/Landing'
import Verifier from './pages/Verifier'
import IssuerPortal from './pages/IssuerPortal'
import Pitch from './pages/Pitch'
import Holder from './pages/Holder'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/verify" element={<Verifier />} />
      <Route path="/verify/:txHash" element={<Verifier />} />
      <Route path="/issue" element={<IssuerPortal />} />
      <Route path="/holder" element={<Holder />} /> 
      <Route path="/pitch" element={<Pitch />} />
    </Routes>
  )
}

export default App