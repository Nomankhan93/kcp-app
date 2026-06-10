import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { About } from './pages/About';
import { AdminComplaintDetail } from './pages/AdminComplaintDetail';
import { AdminDashboard } from './pages/AdminDashboard';
import { AdminLogin } from './pages/AdminLogin';
import { AdminReports } from './pages/AdminReports';
import { AdminCertificateDetail } from './pages/AdminCertificateDetail';
import { AdminCertificates } from './pages/AdminCertificates';
import { ChairmanMessage } from './pages/ChairmanMessage';
import { ChairmanDashboard } from './pages/ChairmanDashboard';
import { CertificateApply } from './pages/CertificateApply';
import { CertificateTrack } from './pages/CertificateTrack';
import { CouncilorCertificateDetail } from './pages/CouncilorCertificateDetail';
import { CouncilorCertificates } from './pages/CouncilorCertificates';
import { Contact } from './pages/Contact';
import { Downloads } from './pages/Downloads';
import { Home } from './pages/Home';
import { LeadershipMessages } from './pages/LeadershipMessages';
import { News } from './pages/News';
import { Notices } from './pages/Notices';
import { Services } from './pages/Services';
import { SubmitComplaint } from './pages/SubmitComplaint';
import { TrackComplaint } from './pages/TrackComplaint';

export default function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
          <Route path="/chairman-message" element={<ChairmanMessage />} />
          <Route path="/leadership-messages" element={<LeadershipMessages />} />
          <Route path="/services" element={<Services />} />
          <Route path="/notices" element={<Notices />} />
          <Route path="/news" element={<News />} />
          <Route path="/downloads" element={<Downloads />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/submit" element={<SubmitComplaint />} />
          <Route path="/track" element={<TrackComplaint />} />
          <Route path="/certificates/apply" element={<CertificateApply />} />
          <Route path="/certificates/track" element={<CertificateTrack />} />
          <Route path="/councilor" element={<Navigate to="/councilor/certificates" replace />} />
          <Route path="/councilor/certificates" element={<CouncilorCertificates />} />
          <Route path="/councilor/certificates/:id" element={<CouncilorCertificateDetail />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/chairman-dashboard" element={<ChairmanDashboard />} />
          <Route path="/admin/reports" element={<AdminReports />} />
          <Route path="/admin/certificates" element={<AdminCertificates />} />
          <Route path="/admin/certificates/:id" element={<AdminCertificateDetail />} />
          <Route path="/admin/complaints/:id" element={<AdminComplaintDetail />} />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}
