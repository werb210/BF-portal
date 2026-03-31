import { getToken } from "@/auth/token"
import { Navigate } from "react-router-dom"

export default function ProtectedRoute({ children }) {
  if (!getToken()) {
    return <Navigate to="/login" replace />
  }

  return children
}
