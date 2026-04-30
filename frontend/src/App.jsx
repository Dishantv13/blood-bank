import { lazy, Suspense } from "react";
import {
  Routes,
  Route,
  useLocation,
} from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { SocketProvider } from "./context/SocketContext";
import { ToastProvider } from "./components/ToastContainer";
import { ThemeProvider } from './context/ThemeContext';
import PrivateRoute from "./components/PrivateRoute";
import Navbar from "./components/Navbar";
import ThemeToggle from './components/ThemeToggle';
import AdminLayout from "./adminPage/AdminLayout";
import { ROUTE_PATH } from "./enum/routePath";
import "./App.css";

// 1. EAGERLY IMPORT ALL CSS
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
import './adminPage.css/Admin.css';
import './adminPage.css/AdminTable.css';
import './adminPage.css/AdminUsers.css';
import './adminPage.css/AdminBloodBanks.css';
import './adminPage.css/AdminCamps.css';
import './adminPage.css/AdminEvents.css';
import './adminPage.css/AdminRequests.css';
import './adminPage.css/AdminDonations.css';
import './adminPage.css/AdminInventory.css';
import './adminPage.css/AdminExports.css';



// 2. LAZY LOAD ALL JAVASCRIPT
const Login = lazy(() => import('./pages/Login'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const BloodBanks = lazy(() => import('./pages/BloodBanks'));
const Donors = lazy(() => import('./pages/Donors'));
const Events = lazy(() => import('./pages/Events'));
const EventDetails = lazy(() => import('./pages/EventDetails'));
const CreateRequest = lazy(() => import('./pages/CreateRequest'));
const RequestDetails = lazy(() => import('./pages/RequestDetails'));
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
const BloodBankPublicDetails = lazy(() => import('./pages/BloodBankPublicDetails'));
const DonationHistory = lazy(() => import('./pages/DonationHistory'));
const VerifyCertificate = lazy(() => import('./pages/VerifyCertificate'));
const BloodBankUnitTracking = lazy(() => import('./pages/BloodBankUnitTracking'));

// ADMIN PAGE
const AdminLogin = lazy(() => import('./adminPage/AdminLogin'));
const AdminDashboard = lazy(() => import('./adminPage/AdminDashboard'));
const AdminUsers = lazy(() => import('./adminPage/AdminUsers'));
const AdminBloodBanks = lazy(() => import('./adminPage/AdminBloodBanks'));
const AdminBloodBankDetails = lazy(() => import('./adminPage/AdminBloodBankDetails'));
const AdminCamps = lazy(() => import('./adminPage/AdminCamps'));
const AdminCampsByBloodBank = lazy(() => import('./adminPage/AdminCampsByBloodBank'));
const AdminEvents = lazy(() => import('./adminPage/AdminEvents'));
const AdminEventsByBloodBank = lazy(() => import('./adminPage/AdminEventsByBloodBank'));
const AdminRequests = lazy(() => import('./adminPage/AdminRequests'));
const AdminRequestsByUser = lazy(() => import('./adminPage/AdminRequestsByUser'));
const AdminDonations = lazy(() => import('./adminPage/AdminDonations'));
const AdminDonationsByUser = lazy(() => import('./adminPage/AdminDonationsByUser'));
const AdminInventory = lazy(() => import('./adminPage/AdminInventory'));
const AdminInventoryDetails = lazy(() => import('./adminPage/AdminInventoryDetails'));
const AdminExports = lazy(() => import('./adminPage/AdminExports'));
const NotFound = lazy(() => import('./pages/NotFound'));

import SkeletonLoader from "./components/SkeletonLoader";
import ErrorBoundary from "./components/ErrorBoundary";

// Layout component that conditionally renders Navbar
const Layout = ({ children }) => {
  const location = useLocation();
  const noNavbarPaths = [
    ROUTE_PATH.BLOOD_BANK_BASE,
    ROUTE_PATH.ADMIN_BASE,
    ROUTE_PATH.LOGIN,
    ROUTE_PATH.SIGNUP
  ];
  const showNavbar = !noNavbarPaths.some((path) =>
    location.pathname === path || location.pathname.startsWith(path + "/")
  );

  return (
    <>
      <a href="#main-content" className="skip-link">Skip to main content</a>
      {showNavbar && <Navbar />}
      <main id="main-content">
        {children}
      </main>
    </>
  );
};


function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <SocketProvider>
          <ToastProvider>
            <div className="App">
              <Layout>
                <ErrorBoundary>
                  <Suspense fallback={<SkeletonLoader />}>
                    <Routes>
                      {/* Blood Bank Routes */}
                      <Route path={ROUTE_PATH.BLOOD_BANK_LOGIN} element={<BloodBankLogin />} />
                      <Route
                        path={ROUTE_PATH.BLOOD_BANK_REGISTER}
                        element={<BloodBankRegister />}
                      />
                      <Route
                        path={ROUTE_PATH.BLOOD_BANK_DASHBOARD}
                        element={
                          <PrivateRoute requireBloodBank>
                            <BloodBankDashboard />
                          </PrivateRoute>
                        }
                      />
                      <Route
                        path={ROUTE_PATH.BLOOD_BANK_CHANGE_PASSWORD}
                        element={
                          <PrivateRoute requireBloodBank>
                            <BloodBankChangePassword />
                          </PrivateRoute>
                        }
                      />
                      <Route
                        path={ROUTE_PATH.BLOOD_BANK_UNIT_TRACKING}
                        element={
                          <PrivateRoute requireBloodBank>
                            <BloodBankUnitTracking />
                          </PrivateRoute>
                        }
                      />
                      <Route
                        path={ROUTE_PATH.BLOOD_BANK_DETAILS}
                        element={
                          <PrivateRoute requireBloodBank>
                            <BloodBankDirectoryDetails />
                          </PrivateRoute>
                        }
                      />

                      {/* Forget Password Routes */}
                      <Route path={ROUTE_PATH.FORGOT_PASSWORD} element={<ForgotPassword />} />
                      <Route path={ROUTE_PATH.RESET_PASSWORD} element={<ResetPassword />} />
                      <Route
                        path={ROUTE_PATH.BLOOD_BANK_FORGOT_PASSWORD}
                        element={<BloodBankForgotPassword />}
                      />
                      <Route
                        path={ROUTE_PATH.BLOOD_BANK_RESET_PASSWORD}
                        element={<BloodBankResetPassword />}
                      />



                      {/* Admin Routes */}
                      <Route path={ROUTE_PATH.ADMIN_LOGIN} element={<AdminLogin />} />

                      <Route
                        path={ROUTE_PATH.ADMIN_BASE}
                        element={
                          <PrivateRoute requireAdmin>
                            <AdminLayout />
                          </PrivateRoute>
                        }
                      >
                        <Route path={ROUTE_PATH.ADMIN_DASHBOARD} element={<AdminDashboard />} />
                        <Route path={ROUTE_PATH.ADMIN_USERS} element={<AdminUsers />} />
                        <Route path={ROUTE_PATH.ADMIN_BLOOD_BANKS} element={<AdminBloodBanks />} />
                        <Route path={ROUTE_PATH.ADMIN_BLOOD_BANK_DETAILS} element={<AdminBloodBankDetails />} />
                        <Route path={ROUTE_PATH.ADMIN_CAMPS} element={<AdminCamps />} />
                        <Route path={ROUTE_PATH.ADMIN_CAMPS_BY_BANK} element={<AdminCampsByBloodBank />} />
                        <Route path={ROUTE_PATH.ADMIN_EVENTS} element={<AdminEvents />} />
                        <Route path={ROUTE_PATH.ADMIN_EVENTS_BY_BANK} element={<AdminEventsByBloodBank />} />
                        <Route path={ROUTE_PATH.ADMIN_REQUESTS} element={<AdminRequests />} />
                        <Route path={ROUTE_PATH.ADMIN_REQUESTS_BY_USER} element={<AdminRequestsByUser />} />
                        <Route path={ROUTE_PATH.ADMIN_DONATIONS} element={<AdminDonations />} />
                        <Route path={ROUTE_PATH.ADMIN_DONATIONS_BY_USER} element={<AdminDonationsByUser />} />
                        <Route path={ROUTE_PATH.ADMIN_INVENTORY} element={<AdminInventory />} />
                        <Route path={ROUTE_PATH.ADMIN_INVENTORY_DETAILS} element={<AdminInventoryDetails />} />
                        <Route path={ROUTE_PATH.ADMIN_EXPORTS} element={<AdminExports />} />
                      </Route>

                      {/* Auth Routes */}
                      <Route path={ROUTE_PATH.LOGIN} element={<Login />} />


                      <Route
                        path={ROUTE_PATH.HOME}
                        element={<Login />}
                      />

                      <Route
                        path={ROUTE_PATH.DASHBOARD}
                        element={
                          <PrivateRoute>
                            <Dashboard />
                          </PrivateRoute>
                        }
                      />
                      <Route
                        path={ROUTE_PATH.BLOOD_BANKS}
                        element={
                          <PrivateRoute>
                            <BloodBanks />
                          </PrivateRoute>
                        }
                      />
                      <Route
                        path={ROUTE_PATH.BLOOD_BANK_PUBLIC_DETAILS}
                        element={
                          <PrivateRoute>
                            <BloodBankPublicDetails />
                          </PrivateRoute>
                        }
                      />
                      <Route
                        path={ROUTE_PATH.DONORS}
                        element={
                          <PrivateRoute>
                            <Donors />
                          </PrivateRoute>
                        }
                      />
                      <Route
                        path={ROUTE_PATH.EVENTS}
                        element={
                          <PrivateRoute>
                            <Events />
                          </PrivateRoute>
                        }
                      />
                      <Route
                        path={ROUTE_PATH.EVENT_DETAILS}
                        element={
                          <PrivateRoute>
                            <EventDetails />
                          </PrivateRoute>
                        }
                      />
                      <Route
                        path={ROUTE_PATH.CREATE_REQUEST}
                        element={
                          <PrivateRoute>
                            <CreateRequest />
                          </PrivateRoute>
                        }
                      />
                      <Route
                        path={ROUTE_PATH.REQUEST_DETAILS}
                        element={
                          <PrivateRoute>
                            <RequestDetails />
                          </PrivateRoute>
                        }
                      />
                      <Route
                        path={ROUTE_PATH.PROFILE}
                        element={
                          <PrivateRoute>
                            <Profile />
                          </PrivateRoute>
                        }
                      />
                      <Route
                        path={ROUTE_PATH.CHANGE_PASSWORD}
                        element={
                          <PrivateRoute>
                            <ChangePassword />
                          </PrivateRoute>
                        }
                      />
                      <Route
                        path={ROUTE_PATH.DONOR_FORM}
                        element={
                          <PrivateRoute>
                            <DonorHealthForm />
                          </PrivateRoute>
                        }
                      />
                      <Route
                        path={ROUTE_PATH.DONATION_HISTORY}
                        element={
                          <PrivateRoute>
                            <DonationHistory />
                          </PrivateRoute>
                        }
                      />

                      <Route path={ROUTE_PATH.VERIFY_CERTIFICATE} element={<VerifyCertificate />} />

                      {/* Fallback */}
                      <Route path={ROUTE_PATH.WILDCARD} element={<NotFound />} />
                    </Routes>
                  </Suspense>
                </ErrorBoundary>
              </Layout>
            </div>
          </ToastProvider>
        </SocketProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
