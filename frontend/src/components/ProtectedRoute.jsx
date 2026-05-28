import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import BrandLoader from './BrandLoader'

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth()

  if (loading) {
    return <BrandLoader fullScreen label="Opening workspace" />
  }

  if (!user) return <Navigate to="/auth" replace />

  return children
}

export default ProtectedRoute
