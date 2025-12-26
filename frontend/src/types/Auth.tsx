import { ReactNode } from "react"

export type AuthProviderType = {
    children : ReactNode
}

export type AuthValueType = {
    children : ReactNode
}

export type AuthContextType = {
  user: any;
  signIn: (token: string) => void;
  signOut: () => void;
};

