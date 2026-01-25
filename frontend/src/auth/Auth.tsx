import React, {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import {
  AuthContextType,
  AuthProviderType,
  SignInPayload,
} from "../types/AuthType";
import { mainAxios } from "../api";
import { getUserById } from "../api/userApi";
import { toast } from "react-toastify";

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const authContext = useContext(AuthContext);
  if (!authContext) {
    throw new Error("useAuth must be used with a AuthProvider");
  }

  return authContext;
};

export const AuthProvider = ({ children }: AuthProviderType) => {
  const [user, setUser] = useState<any>(() => {
    const storedUser = localStorage.getItem("user");
    return storedUser ? JSON.parse(storedUser) : null;
  });
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const hasCheckedAuth = useRef(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (hasCheckedAuth.current) return;
    hasCheckedAuth.current = true;
    async function initiateAuth() {
      await verifyToken();
    }
    initiateAuth();
  }, []);

  //verifying token from local storage
  async function verifyToken() {
    setIsAuthLoading(true);
    //get token from local storage
    let token = localStorage.getItem("token");
    try {
      //call backend to verify token
      const tokenPayload = await mainAxios.post(`/verifyToken`, "", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const userInfo = await getUserById({
        user_id: tokenPayload.data.user_id,
        token: token,
      });

      var userData = userInfo;
      setUser(userData);
      localStorage.setItem("user", JSON.stringify(userData));
    } catch (error) {
      localStorage.clear();
      setUser(null);
    } finally {
      setIsAuthLoading(false);
    }
  }

  async function signIn(payload: SignInPayload) {
    try {
      setIsAuthLoading(true);
      const response = await mainAxios.post(`/users/login`, payload);
      localStorage.setItem("token", response.data.token);
      await verifyToken();
      setIsAuthLoading(false);
      return response.data;
    } catch (error) {
      localStorage.clear();
      setUser(null);
      throw error;
    }
  }

  function signOut() {
    const signOutTimer = 2000;
    toast.success(`Signing out...`, {
      autoClose: signOutTimer,
    });
    setTimeout(() => {
      localStorage.clear();
      setUser(null);
      window.location.reload();
      if (window.location.pathname == "/") {
        window.location.reload();
      } else {
        navigate("/");
      }
    }, signOutTimer);
  }

  const value = { user, isAuthLoading, verifyToken, signIn, signOut };
  return <AuthContext.Provider value={value}> {children}</AuthContext.Provider>;
};
