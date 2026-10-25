import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import CatalogPage from './pages/CatalogPage';

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<CatalogPage />} />
        <Route path="*" element={<CatalogPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
