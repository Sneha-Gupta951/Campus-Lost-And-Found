import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Feed from './pages/Feed';
import ItemDetail from './pages/ItemDetail';
import PostItem from './pages/PostItem';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<ProtectedRoute><Feed /></ProtectedRoute>} />
          <Route path="/items/:id" element={<ProtectedRoute><ItemDetail /></ProtectedRoute>} />
          <Route path="/post" element={<ProtectedRoute><PostItem /></ProtectedRoute>} />
          {/* Still to build: /my-posts, /claims, /profile */}
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
