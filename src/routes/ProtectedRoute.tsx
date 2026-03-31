import type { ReactElement } from "react"
import { getToken } from "@/auth/token"
import { Navigate } from "react-router-dom"

export function ProtectedRoute({ children }: { children: ReactElement }) {
  if (!getToken()) {
    return <Navigate to="/login" replace />
  }
  return children
}

export default ProtectedRoute
