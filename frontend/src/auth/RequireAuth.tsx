import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "./Auth";

export const RequireAuth = () => {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) {
    //naviagate to homepage if unauthorised
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  //render the matching route of a parent route or nothing if no child route matches
  return <Outlet />;
};
