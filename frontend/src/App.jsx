import React, { lazy, Suspense } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { ToastProvider } from "./components/ToastContainer";
import { ThemeProvider } from './context/ThemeContext';
import PrivateRoute from "./components/PrivateRoute";
import Navbar from "./components/Navbar";
import "./App.css";

// 1. EAGERLY IMPORT ALL CSS
// This guarantees Webpack bundles the CSS in the main initial chunk,
// preventing CSS specificity and SVG sizing regressions!
import './pages.css/Auth.css';
import './pages.css/Dashboard.css';
import './pages.css/BloodBanks.css';
import './pages.css/Donors.css';
import './pages.css/Events.css';
import './pages.css/EventDetails.css';
import './pages.css/CreateRequest.css';
import './pages.css/Profile.css';
import './pages.css/DonorHealthForm.css';
import './pages.css/BloodBankAuth.css';
import './pages.css/BloodBankDashboard.css';
import './pages.css/ForgotPassword.css';
import './pages.css/ResetPassword.css';
import './pages.css/BloodBankForgotPassword.css';
import './pages.css/BloodBankResetPassword.css';
import './pages.css/ChangePassword.css';
import './pages.css/BloodBankChangePassword.css';
import './pages.css/BloodBankDirectoryDetails.css';

// 2. LAZY LOAD ALL JAVASCRIPT
// This splits the JS bundle without breaking the CSS cascade!
const Login = lazy(() => import('./pages/Login'));
const Signup = lazy(() => import('./pages/Signup'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const BloodBanks = lazy(() => import('./pages/BloodBanks'));
const Donors = lazy(() => import('./pages/Donors'));
const Events = lazy(() => import('./pages/Events'));
const EventDetails = lazy(() => import('./pages/EventDetails'));
const CreateRequest = lazy(() => import('./pages/CreateRequest'));
const Profile = lazy(() => import('./pages/Profile'));
const DonorHealthForm = lazy(() => import('./pages/DonorHealthForm'));
const BloodBankLogin = lazy(() => import('./pages/BloodBankLogin'));
const BloodBankRegister = lazy(() => import('./pages/BloodBankRegister'));
const BloodBankDashboard = lazy(() => import('./pages/BloodBankDashboard'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
const BloodBankForgotPassword = lazy(() => import('./pages/BloodBankForgotPassword'));
const BloodBankResetPassword = lazy(() => import('./pages/BloodBankResetPassword'));
const ChangePassword = lazy(() => import('./pages/ChangePassword'));
const BloodBankChangePassword = lazy(() => import('./pages/BloodBankChangePassword'));
const BloodBankDirectoryDetails = lazy(() => import('./pages/BloodBankDirectoryDetails'));

// Loading fallback component
const PageLoader = () => (
  <div className="loading" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', fontSize: '1.2rem', color: '#e63946' }}>
    Loading...
  </div>
);

// Layout component that conditionally renders Navbar
const Layout = ({ children }) => {
  const location = useLocation();
  const noNavbarPaths = ["/blood-bank/", "/login", "/signup"];
  const showNavbar = !noNavbarPaths.some((path) =>
    location.pathname.startsWith(path),
  );

  return (
    <>
      {showNavbar && <Navbar />}
      {children}
    </>
  );
};


function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ToastProvider>
          <Router>
            <div className="App">
              <Layout>
                <Suspense fallback={<PageLoader />}>
                  <Routes>
                    {/* Blood Bank Routes */}
                    <Route path="/blood-bank/login" element={<BloodBankLogin />} />
                    <Route
                      path="/blood-bank/register"
                      element={<BloodBankRegister />}
                    />
                    <Route
                      path="/blood-bank/dashboard"
                      element={<BloodBankDashboard />}
                    />
                    <Route
                      path="/blood-bank/change-password"
                      element={<BloodBankChangePassword />}
                    />
                    <Route
                      path="/blood-bank/banks/:bankId"
                      element={<BloodBankDirectoryDetails />}
                    />

                    {/* Forget Password Routes */}
                    <Route path="/forgot-password" element={<ForgotPassword />} />
                    <Route path="/reset-password" element={<ResetPassword />} />
                    <Route
                      path="/blood-bank/forgot-password"
                      element={<BloodBankForgotPassword />}
                    />
                    <Route
                      path="/blood-bank/reset-password"
                      element={<BloodBankResetPassword />}
                    />

                    {/* Auth Routes */}
                    <Route path="/login" element={<Login />} />
                    <Route path="/signup" element={<Signup />} />

                    {/* Protected Routes */}
                    <Route
                      path="/"
                      element={
                        // <PrivateRoute>
                          <Dashboard />
                        // </PrivateRoute>
                      }
                    />
                    <Route
                      path="/dashboard"
                      element={
                        // <PrivateRoute>
                          <Dashboard />
                        // </PrivateRoute>
                      }
                    />
                    <Route
                      path="/blood-banks"
                      element={
                        // <PrivateRoute>
                          <BloodBanks />
                        // </PrivateRoute>
                      }
                    />
                    <Route
                      path="/donors"
                      element={
                        // <PrivateRoute>
                          <Donors />
                        // </PrivateRoute>
                      }
                    />
                    <Route
                      path="/events"
                      element={
                        // <PrivateRoute>
                          <Events />
                        // </PrivateRoute>
                      }
                    />
                    <Route
                      path="/events/:eventId"
                      element={
                        // <PrivateRoute>
                          <EventDetails />
                        // </PrivateRoute>
                      }
                    />
                    <Route
                      path="/create-request"
                      element={
                        // <PrivateRoute>
                          <CreateRequest />
                        // </PrivateRoute>
                      }
                    />
                    <Route
                      path="/profile"
                      element={
                        // <PrivateRoute>
                          <Profile />
                        // </PrivateRoute>
                      }
                    />
                    <Route
                      path="/change-password"
                      element={
                        // <PrivateRoute>
                          <ChangePassword />
                        // </PrivateRoute>
                      }
                    />
                    <Route
                      path="/donor-form"
                      element={
                        // <PrivateRoute>
                          <DonorHealthForm />
                        // </PrivateRoute>
                      }
                    />

                    {/* Fallback */}
                    <Route path="*" element={<Navigate to="/dashboard" />} />
                  </Routes>
                </Suspense>
              </Layout>
            </div>
          </Router>
        </ToastProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
