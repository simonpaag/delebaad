import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import Login from './pages/Login'
import UserDashboard from './pages/UserDashboard'
import AdminDashboard from './pages/AdminDashboard'

// Protected Route: Kun for indloggede brugere
function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <div>Indlæser...</div>
  return user ? children : <Navigate to="/login" />
}

// Admin Route: Kun for admin-brugere
function AdminRoute({ children }) {
  const { user, isAdmin, loading } = useAuth()
  if (loading) return <div>Indlæser...</div>
  if (!user) return <Navigate to="/login" />
  return isAdmin ? children : <Navigate to="/dashboard" />
}

// Route der tjekker for indlogget bruger på roden, og videresender
function RootRoute() {
  const { user, isAdmin, loading } = useAuth()
  if (loading) return <div>Indlæser...</div>
  if (!user) return <Navigate to="/login" />
  return isAdmin ? <Navigate to="/admin" /> : <Navigate to="/dashboard" />
}

function AppContent() {
  return (
    <Routes>
      <Route path="/" element={<RootRoute />} />
      <Route path="/login" element={<Login />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <UserDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/*"
        element={
          <AdminRoute>
            <AdminDashboard />
          </AdminRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  )
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppContent />
      </Router>
    </AuthProvider>
  )
}

export default App
