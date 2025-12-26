import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { AuthProvider } from './auth/Auth';
import { RequireAuth } from './auth/RequireAuth';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={null} />
          <Route path="/login" element={null} />
          <Route element={<RequireAuth />}>
            <Route path="/profile" element={null} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
