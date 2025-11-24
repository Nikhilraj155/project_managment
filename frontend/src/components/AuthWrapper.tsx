import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { setCredentials, logout } from '../store/authSlice'
import type { RootState } from '../store/store'

interface AuthWrapperProps {
  children: React.ReactNode
}

// Helper function to decode JWT token
function decodeJwt(token: string) {
  try {
    // Basic JWT decoding - split and parse the payload
    const parts = token.split('.')
    if (parts.length !== 3) {
      throw new Error('Invalid JWT format')
    }
    const payload = JSON.parse(atob(parts[1]))
    return payload
  } catch (error) {
    console.error('Error decoding JWT:', error)
    return null
  }
}

export default function AuthWrapper({ children }: AuthWrapperProps) {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { user, token } = useSelector((state: RootState) => state.auth)

  useEffect(() => {
    const initializeAuth = () => {
      const storedToken = localStorage.getItem('token')
      const storedUserRole = localStorage.getItem('userRole')

      // If we have a token but no user in Redux, restore from localStorage
      if (storedToken && !user) {
        try {
          const decoded = decodeJwt(storedToken)
          if (decoded && decoded.user_id && storedUserRole) {
            // Restore user to Redux store
            dispatch(setCredentials({
              user: {
                id: decoded.user_id,
                username: decoded.username || 'User',
                email: decoded.email || '',
                role: storedUserRole as 'student' | 'mentor' | 'panel' | 'admin'
              },
              token: storedToken
            }))
          } else {
            // Invalid token or missing role, logout
            console.warn('Invalid token or missing user role, logging out')
            dispatch(logout())
            navigate('/login')
          }
        } catch (error) {
          console.error('Error restoring authentication:', error)
          dispatch(logout())
          navigate('/login')
        }
      } else if (!storedToken && user) {
        // Token exists in Redux but not in localStorage, clear Redux
        dispatch(logout())
      } else if (!storedToken && !user) {
        // No token and no user, redirect to login
        navigate('/login')
      }
    }

    initializeAuth()
  }, [dispatch, navigate, user])

  // Only render children once authentication is properly initialized
  // But always allow access to public routes like login and register
  const currentPath = window.location.pathname
  const isPublicRoute = currentPath === '/login' || currentPath === '/register'

  if (!token && !localStorage.getItem('token') && !isPublicRoute) {
    return null // Or a loading spinner
  }

  return <>{children}</>
}