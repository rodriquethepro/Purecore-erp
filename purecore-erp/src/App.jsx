import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { supabase } from "./lib/supabaseClient";

// Components
import Navbar from "./components/Navbar";

// Pages
import SignIn from "./pages/SignIn";
import Dashboard from "./components/Dashboard";
import Products from "./pages/Products";
import Invoices from "./pages/Invoices";
import PurchaseOrders from "./pages/PurchaseOrders";
import Customers from "./pages/Customers"; // ✅ ADDED

function App() {
  const [session, setSession] = useState(null);

  useEffect(() => {
    // Get current session on app load
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    // Listen for auth changes (login/logout)
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  // If no session, redirect to SignIn
  const PrivateRoute = ({ children }) => {
    return session ? children : <Navigate to="/signin" />;
  };

  return (
    <BrowserRouter>
      {/* Only show Navbar if logged in */}
      {session && <Navbar />}

      <Routes>
        {/* Public Route */}
        <Route path="/signin" element={<SignIn />} />

        {/* Private/Admin Routes */}
        <Route
          path="/"
          element={
            <PrivateRoute>
              <Dashboard />
            </PrivateRoute>
          }
        />

        <Route
          path="/products"
          element={
            <PrivateRoute>
              <Products />
            </PrivateRoute>
          }
        />

        <Route
          path="/invoices"
          element={
            <PrivateRoute>
              <Invoices />
            </PrivateRoute>
          }
        />

        <Route
          path="/purchase-orders"
          element={
            <PrivateRoute>
              <PurchaseOrders />
            </PrivateRoute>
          }
        />

        {/* ✅ NEW CUSTOMERS ROUTE */}
        <Route
          path="/customers"
          element={
            <PrivateRoute>
              <Customers />
            </PrivateRoute>
          }
        />

        {/* Redirect unknown routes */}
        <Route
          path="*"
          element={session ? <Navigate to="/" /> : <Navigate to="/signin" />}
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;