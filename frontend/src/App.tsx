import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import { AuthProvider, useAuth } from "./auth/Auth";
import { RequireAuth } from "./auth/RequireAuth";
import MainPage from "./pages/MainPage";
import Login from "./pages/Login";
import "./css/base.css";
import Profile from "./pages/Profile";
import PageLayout from "./components/PageLayout";
import { ToastContainer } from "react-toastify";

export default function App() {
  return (
    <>
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
            <Route element={<PageLayout />}>
              <Route path="/" element={<MainPage />} />
              <Route
                path="/profile"
                element={<RequireAuth component={<Profile />} />}
              />
            </Route>
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </>
  );
}
