import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "next-themes";

// Context Providers
import { AuthProvider } from "./contexts/AuthContext";
import { CompanyProvider } from "./contexts/CompanyContext";

// Layout Components
import { Layout } from "./components/layout/Layout";
import { ProtectedRoute } from "./components/ProtectedRoute";

// Pages
import { Auth } from "./pages/Auth";
import { Dashboard } from "./pages/Dashboard";
import { Products } from "./pages/Products";
import { Customers } from "./pages/Customers";
import { Categories } from "./pages/Categories";
import { Invoices } from "./pages/Invoices";
import { Returns } from "./pages/Returns";
import { Payments } from "./pages/Payments";
import { Archive } from "./pages/Archive";
import { Users } from "./pages/Users";
import { Settings } from "./pages/Settings";
import { NotFoundPage } from "./pages/NotFoundPage";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
      <TooltipProvider>
        <AuthProvider>
          <CompanyProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Layout>
            <Routes>
              {/* Public Routes */}
              <Route path="/auth" element={<Auth />} />
              
              {/* Protected Routes */}
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route 
                path="/dashboard" 
                element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/products" 
                element={
                  <ProtectedRoute>
                    <Products />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/customers" 
                element={
                  <ProtectedRoute>
                    <Customers />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/categories" 
                element={
                  <ProtectedRoute>
                    <Categories />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/invoices" 
                element={
                  <ProtectedRoute>
                    <Invoices />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/returns" 
                element={
                  <ProtectedRoute>
                    <Returns />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/payments" 
                element={
                  <ProtectedRoute>
                    <Payments />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/archive" 
                element={
                  <ProtectedRoute>
                    <Archive />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/users" 
                element={
                  <ProtectedRoute>
                    <Users />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/settings" 
                element={
                  <ProtectedRoute>
                    <Settings />
                  </ProtectedRoute>
                } 
              />
              
              {/* 404 Route */}
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </Layout>
        </BrowserRouter>
          </CompanyProvider>
        </AuthProvider>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
