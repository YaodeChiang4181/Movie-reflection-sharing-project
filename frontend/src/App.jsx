import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import MovieDetail from './pages/MovieDetail';
import Profile from './pages/Profile';
import Auth from './pages/Auth';
import Search from './pages/Search';
import Events from './pages/Events';
import AdminDashboard from './pages/AdminDashboard';
import ReviewForm from './pages/liff/ReviewForm';
import ProfileCard from './pages/liff/ProfileCard';
import CampaignScan from './pages/liff/CampaignScan';
function App() {
  return (
    <BrowserRouter>
      <Navbar />
      <div className="app-content">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/events" element={<Events />} />
          <Route path="/search" element={<Search />} />
          <Route path="/movies/:id" element={<MovieDetail />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/liff/review-form" element={<ReviewForm />} />
          <Route path="/liff/profile" element={<ProfileCard />} />
          <Route path="/liff/campaign-scan" element={<CampaignScan />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
