import React, {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";
import { Navigate, useLocation } from "react-router-dom";
import { AuthContextType, AuthProviderType } from "../types/Auth";
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
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    verifyToken();
  }, []);

  //verifying token from local storage
  async function verifyToken() {
    //get token from local storage
    let token = localStorage.getItem("token");
    try {
      //call backend to verify token
      await mainAxios
        .post(`/verifyToken`, "", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })
        .then((result) => {
          //set user details
          setUser(result.data);
        });
    } catch (error) {
      //remove token when error verifying token
      localStorage.removeItem("token");
      setUser(null);
    }
  }

  async function signIn(username: string) {
    await mainAxios
      .post(`/users/login`, username)
      .then((response) => {
        console.log(response);
      })
      .catch((error) => {
        console.log(error);
      });
  }

  function signOut() {
    localStorage.clear();
    setUser(null);
  }
  
  const value = { user, signIn, signOut };
  return <AuthContext.Provider value={value}> {children}</AuthContext.Provider>;
};
