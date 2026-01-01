import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./Auth";
import { RequireAuthType } from "../types/Auth";

export const RequireAuth = ({ component }: RequireAuthType) => {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  return component;
};
