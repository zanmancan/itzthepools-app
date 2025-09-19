import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import AuthGate from './components/AuthGate';
import Dashboard from './components/Dashboard';
import Recover from './components/Recover';

export default function App() {
  return (
    <Routes>
      {/* Authenticated app */}
      <Route
        path="/"
        element={
          <AuthGate>
            <Dashboard />
          </AuthGate>
        }
      />
      {/* Password reset handler */}
      <Route path="/recover" element={<Recover />} />
      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
