import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';

// Lazy loaded pages
const Home = lazy(() => import('./pages/Home'));
const MovieDetail = lazy(() => import('./pages/MovieDetail'));
const Profile = lazy(() => import('./pages/Profile'));
const Auth = lazy(() => import('./pages/Auth'));
const Search = lazy(() => import('./pages/Search'));
const Events = lazy(() => import('./pages/Events'));
const EventScan = lazy(() => import('./pages/EventScan'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const ReviewForm = lazy(() => import('./pages/liff/ReviewForm'));
const ProfileCard = lazy(() => import('./pages/liff/ProfileCard'));
const CampaignScan = lazy(() => import('./pages/liff/CampaignScan'));

function App() {
  return (
    <BrowserRouter>
      <Navbar />
      <div className="app-content">
        <Suspense fallback={<div style={{ display: 'flex', justifyContent: 'center', padding: '50px', color: 'var(--text-secondary)' }}>載入中...</div>}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/events" element={<Events />} />
            <Route path="/events/:id/scan" element={<EventScan />} />
            <Route path="/search" element={<Search />} />
            <Route path="/movies/:id" element={<MovieDetail />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/liff/review-form" element={<ReviewForm />} />
            <Route path="/liff/profile" element={<ProfileCard />} />
            <Route path="/liff/campaign-scan" element={<CampaignScan />} />
          </Routes>
        </Suspense>
      </div>
      <Footer />
    </BrowserRouter>
  );
}

export default App;
