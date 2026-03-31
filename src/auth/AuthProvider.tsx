import { createContext, useState, useEffect, type ReactNode } from "react"
import { getToken } from "@/auth/token"

export const AuthContext = createContext({ token: null as string | null })

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setTokenState] = useState(getToken())

  useEffect(() => {
    const interval = setInterval(() => {
      setTokenState(getToken())
    }, 500)

    return () => clearInterval(interval)
  }, [])

  return (
    <AuthContext.Provider value={{ token }}>
      {children}
    </AuthContext.Provider>
  )
}
