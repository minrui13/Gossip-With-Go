import { BrowserRouter, Routes, Route, Link, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./auth/Auth";
import { RequireAuth } from "./auth/RequireAuth";
import MainPage from "./pages/MainPage";
import Login from "./pages/Login";
import "./css/base.css";
import "./css/index.css";
import Profile from "./pages/Profile";
import PageLayout from "./components/PageLayout";
import { ToastContainer } from "react-toastify";
import SignUp from "./pages/SignUp";
import { StrictMode } from "react";
import Error from "./pages/Error";

export default function App() {
  return (
    <StrictMode>
      <ToastContainer
        autoClose={5000}
        limit={5}
        position="top-right"
        closeOnClick
      />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<SignUp />} />
            <Route element={<PageLayout />}>
              <Route path="/" element={<MainPage />} />
              <Route path="/hive">
                <Route path=":hive_name" element={<MainPage />} />
              </Route>
              <Route
                path="/profile/:username"
                element={<RequireAuth component={<Profile/>} />}
              />
            </Route>
            <Route path="/404" element={<Error errorCode="404" />} />
            <Route path="/401" element={<Error errorCode="401" />} />
            <Route path="*" element={<Navigate to="/404" />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </StrictMode>
  );
}
