import { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Auth from './components/Auth';
import Dashboard from './pages/Dashboard';
import { api } from './api';
import './App.css';

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initializeAuth = async () => {
      const token = localStorage.getItem('token');
      const user = localStorage.getItem('user');
      
      if (token && user) {
        try {
          setIsLoggedIn(true);
          const parsedUser = JSON.parse(user);
          setCurrentUser(parsedUser);
          
          // Optionally fetch full user profile if displayName is missing
          if (!parsedUser.displayName) {
             try {
               const response = await api.get('/users/me'); // Assuming backend has this endpoint
               if (response.data) {
                  const updatedUser = { ...parsedUser, ...response.data };
                  setCurrentUser(updatedUser);
                  localStorage.setItem('user', JSON.stringify(updatedUser));
               }
             } catch (err) {
               console.warn("Could not fetch full user profile on load", err);
             }
          }
        } catch (e) {
          console.error('Failed to parse user from localStorage', e);
          handleLogout();
        }
      }
      setLoading(false);
    };

    initializeAuth();
  }, []);

  const handleLoginSuccess = async (userData: any) => {
    setIsLoggedIn(true);
    setCurrentUser(userData);
    
    // Fallback: If login response doesn't have displayName, try fetching it
    if (!userData.displayName) {
       try {
           const response = await api.get('/users/me'); // Assuming backend has this endpoint
           if (response.data) {
              const updatedUser = { ...userData, ...response.data };
              setCurrentUser(updatedUser);
              localStorage.setItem('user', JSON.stringify(updatedUser));
           }
       } catch (err) {
           console.warn("Could not fetch full user profile after login", err);
       }
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setIsLoggedIn(false);
    setCurrentUser(null);
  };

  if (loading) {
    return <div>Loading...</div>; // Or a spinner component
  }

  return (
    <Routes>
      <Route
        path="/"
        element={isLoggedIn ? <Navigate to="/dashboard" /> : <Auth onLoginSuccess={handleLoginSuccess} />}
      />
      <Route
        path="/dashboard"
        element={isLoggedIn ? <Dashboard user={currentUser} onLogout={handleLogout} /> : <Navigate to="/" />}
      />
    </Routes>
  );
}

export default App;