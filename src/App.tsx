import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { About } from './pages/About';
import { AdminComplaintDetail } from './pages/AdminComplaintDetail';
import { AdminContent } from './pages/AdminContent';
import { AdminContentDownloads } from './pages/AdminContentDownloads';
import { AdminContentMessages } from './pages/AdminContentMessages';
import { AdminContentNews } from './pages/AdminContentNews';
import { AdminContentNotices } from './pages/AdminContentNotices';
import { AdminDashboard } from './pages/AdminDashboard';
import { AdminLogin } from './pages/AdminLogin';
import { AdminReports } from './pages/AdminReports';
import { AdminUsers } from './pages/AdminUsers';
import { AdminWardCouncilors } from './pages/AdminWardCouncilors';
import { AdminCertificateDetail } from './pages/AdminCertificateDetail';
import { AdminCertificates } from './pages/AdminCertificates';
import { AdminCertificateFinalProcessing } from './pages/AdminCertificateFinalProcessing';
import { ChairmanMessage } from './pages/ChairmanMessage';
import { ChairmanDashboard } from './pages/ChairmanDashboard';
import { CertificateApply } from './pages/CertificateApply';
import { CertificateTrack } from './pages/CertificateTrack';
import { Contact } from './pages/Contact';
import { CouncilorCertificateDetail } from './pages/CouncilorCertificateDetail';
import { CouncilorCertificates } from './pages/CouncilorCertificates';
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
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/chairman-dashboard" element={<ChairmanDashboard />} />
          <Route path="/admin/reports" element={<AdminReports />} />
          <Route path="/admin/users" element={<AdminUsers />} />
          <Route path="/admin/ward-councilors" element={<AdminWardCouncilors />} />
          <Route path="/admin/content" element={<AdminContent />} />
          <Route path="/admin/content/notices" element={<AdminContentNotices />} />
          <Route path="/admin/content/news" element={<AdminContentNews />} />
          <Route path="/admin/content/downloads" element={<AdminContentDownloads />} />
          <Route path="/admin/content/messages" element={<AdminContentMessages />} />
          <Route path="/admin/certificates" element={<AdminCertificates />} />
          <Route path="/admin/certificates/final-processing" element={<AdminCertificateFinalProcessing />} />
          <Route path="/admin/certificates/:id" element={<AdminCertificateDetail />} />
          <Route path="/admin/complaints/:id" element={<AdminComplaintDetail />} />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/councilor/certificates" element={<CouncilorCertificates />} />
          <Route path="/councilor/certificates/:id" element={<CouncilorCertificateDetail />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}
