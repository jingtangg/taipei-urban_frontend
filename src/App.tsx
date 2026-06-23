import MapPage from './pages/MapPage'
import HualienPage from './pages/HualienPage'

const isHualien = window.location.pathname.startsWith('/hualien')

export default function App() {
  return isHualien ? <HualienPage /> : <MapPage />
}