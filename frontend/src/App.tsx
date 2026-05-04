import { Routes, Route } from 'react-router-dom'
import Landing from './pages/Landing'
import Verifier from './pages/Verifier'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/verify" element={<Verifier />} />
    </Routes>
  )
}

export default App