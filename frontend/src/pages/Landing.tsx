import Navbar from '../components/Navbar'
import Hero from '../components/Hero'
import RoleCards from '../components/RoleCards'
import ProofSection from '../components/ProofSection'
import Footer from '../components/Footer'

export default function Landing() {
  return (
    <div className="min-h-screen">
      <Navbar />
      <Hero />
      <RoleCards />
      <ProofSection />
      <Footer />
    </div>
  )
}