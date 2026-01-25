import { JSX, ReactNode } from "react";

export type AuthProviderType = {
  children: ReactNode;
};

export type AuthValueType = {
  children: ReactNode;
};

export type AuthUserType = {
  user_id: number;
  username: string;
  display_name: string;
  bio: string;
  image_name: string;
  created_date: string;
  password: string;
};

export type AuthContextType = {
  user: AuthUserType;
  isAuthLoading: boolean;
  verifyToken: () => void;
  signIn: (payload: SignInPayload) => Promise<any>;
  signOut: () => void;
};

export type RequireAuthType = {
  component: JSX.Element;
};

export type SignInPayload = {
  username: string;
  password: string;
};

export type GetUserByIdPayload = {
  user_id: number;
  token: string | null;
};

export type GetUserByIdResult = {
  user_id: number;
  username: string;
  display_name: string;
  bio: string | null;
  image_id: number;
  image_name: string;
  created_time: string;
  token: string | null;
};
