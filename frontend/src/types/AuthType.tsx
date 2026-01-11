import { JSX, ReactNode } from "react"

export type AuthProviderType = {
    children : ReactNode
}

export type AuthValueType = {
    children : ReactNode
}

export type AuthContextType = {
  user: any
  isAuthLoading: boolean
  verifyToken: ()=> void
  signIn: (username: string) => Promise<any>
  signOut: () => void
};

export type RequireAuthType = {
    component : JSX.Element
}