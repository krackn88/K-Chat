import React, { useContext, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import CssBaseline from '@mui/material/CssBaseline';
import { ThemeProvider, createTheme } from '@mui/material/styles';

// Pages
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';

// Context
import AuthContext from './context/auth/authContext';

// Create dark theme
const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#3f51b5',
    },
    secondary: {
      main: '#f50057',
    },
    background: {
      default: '#121212',
      paper: '#1e1e1e',
    },
  },
});

const App = () => {
  const { loadUser, isAuthenticated, loading } = useContext(AuthContext);

  useEffect(() => {
    loadUser();
    // eslint-disable-next-line
  }, []);

  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <Router>
        <Routes>
          <Route path="/login" element={!isAuthenticated && !loading ? <Login /> : <Navigate to="/" />} />
          <Route path="/register" element={!isAuthenticated && !loading ? <Register /> : <Navigate to="/" />} />
          <Route path="/*" element={isAuthenticated ? <Dashboard /> : <Navigate to="/login" />} />
        </Routes>
      </Router>
    </ThemeProvider>
  );
};

export default App;