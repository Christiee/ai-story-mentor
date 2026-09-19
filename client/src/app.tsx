import React from 'react';
import { Route, Routes } from 'react-router-dom';

import './api/axios-setup';

import Layout from './components/Layout';
import HomePage from './pages/HomePage/HomePage';
import CreatePage from './pages/CreatePage/CreatePage';
import PortfolioPage from './pages/PortfolioPage/PortfolioPage';
import ShowcasePage from './pages/ShowcasePage/ShowcasePage';
import ScriptDetailPage from './pages/ScriptDetailPage/ScriptDetailPage';
import ParentDailyPage from './pages/ParentDailyPage/ParentDailyPage';
import ParentWorksPage from './pages/ParentWorksPage/ParentWorksPage';
import ParentRadarPage from './pages/ParentRadarPage/ParentRadarPage';
import NotFound from './pages/NotFound/NotFound';
import { AuthProvider } from './hooks/useAuth';
import LoginPage from './pages/LoginPage/LoginPage';

const RoutesComponent = () => {
  return (
    <AuthProvider>
      <Routes>
        <Route path="login" element={<LoginPage />} />
        <Route element={<Layout />}>
          <Route index element={<HomePage />} />
          <Route path="create" element={<CreatePage />} />
          <Route path="portfolio" element={<PortfolioPage />} />
          <Route path="showcase" element={<ShowcasePage />} />
          <Route path="script/:id" element={<ScriptDetailPage />} />
          <Route path="parent/daily" element={<ParentDailyPage />} />
          <Route path="parent/works" element={<ParentWorksPage />} />
          <Route path="parent/radar" element={<ParentRadarPage />} />
        </Route>
        <Route path="*" element={<NotFound />} />
      </Routes>
    </AuthProvider>
  );
};

export default RoutesComponent;
