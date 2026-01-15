import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./Auth";
import { RequireAuthType } from "../types/AuthType";
import Loading from "../components/Loading";

export const RequireAuth = ({ component }: RequireAuthType) => {
  const { user, isAuthLoading } = useAuth();
  console.log("require auth user");
  console.log(user);

  return isAuthLoading ? (
    <Loading isLoading={isAuthLoading} />
  ) : user ? (
    component
  ) : (
    <Navigate replace to="/401" />
  );
};
