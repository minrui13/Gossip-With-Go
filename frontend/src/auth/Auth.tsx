import React, {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { AuthContextType, AuthProviderType } from "../types/AuthType";
import { mainAxios } from "../api";

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

      const userInfo = await mainAxios.post(
        `/users/${tokenPayload.data.user_id}`,
        "",
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      var userData = userInfo.data;
      //get image name from image id
      const imageData = await mainAxios.post(
        `/images/${userData.image_id}`,
        "",
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      //put the image name into the json
      userData.image_name = imageData.data.image_name;
      setUser(userData);
      localStorage.setItem("user", JSON.stringify(userData));
    } catch (error) {
      localStorage.removeItem("token");
      setUser(null);
    } finally {
      setIsAuthLoading(false);
    }
  }

  async function signIn(username: string) {
    try {
      setIsAuthLoading(true);
      const response = await mainAxios.post(`/users/login`, {
        username: username,
      });
      localStorage.setItem("token", response.data.token);
      await verifyToken();
      setIsAuthLoading(false);
      return response.data;
    } catch (error) {
      localStorage.removeItem("token");
      setUser(null);
      throw error;
    }
  }

  function signOut() {
    localStorage.clear();
    setUser(null);
  }

  const value = { user, isAuthLoading, verifyToken, signIn, signOut };
  return <AuthContext.Provider value={value}> {children}</AuthContext.Provider>;
};
