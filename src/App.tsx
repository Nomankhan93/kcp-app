import { lazy, Suspense, type ComponentType } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';

function lazyNamed<T extends Record<string, unknown>, K extends keyof T>(
  loader: () => Promise<T>,
  exportName: K,
) {
  return lazy(async () => ({ default: (await loader())[exportName] as ComponentType }));
}

const About = lazyNamed(() => import('./pages/About'), 'About');
const AdminComplaintDetail = lazyNamed(() => import('./pages/AdminComplaintDetail'), 'AdminComplaintDetail');
const AdminContent = lazyNamed(() => import('./pages/AdminContent'), 'AdminContent');
const AdminContentDownloads = lazyNamed(() => import('./pages/AdminContentDownloads'), 'AdminContentDownloads');
const AdminContentMessages = lazyNamed(() => import('./pages/AdminContentMessages'), 'AdminContentMessages');
const AdminContentNews = lazyNamed(() => import('./pages/AdminContentNews'), 'AdminContentNews');
const AdminContentNotices = lazyNamed(() => import('./pages/AdminContentNotices'), 'AdminContentNotices');
const AdminDashboard = lazyNamed(() => import('./pages/AdminDashboard'), 'AdminDashboard');
const StaffLogin = lazyNamed(() => import('./pages/StaffLogin'), 'StaffLogin');
const AdminReports = lazyNamed(() => import('./pages/AdminReports'), 'AdminReports');
const AdminUsers = lazyNamed(() => import('./pages/AdminUsers'), 'AdminUsers');
const AdminWardCouncilors = lazyNamed(() => import('./pages/AdminWardCouncilors'), 'AdminWardCouncilors');
const AdminCertificateDetail = lazyNamed(() => import('./pages/AdminCertificateDetail'), 'AdminCertificateDetail');
const AdminCertificates = lazyNamed(() => import('./pages/AdminCertificates'), 'AdminCertificates');
const AdminCertificateFinalProcessing = lazyNamed(() => import('./pages/AdminCertificateFinalProcessing'), 'AdminCertificateFinalProcessing');
const ChairmanMessage = lazyNamed(() => import('./pages/ChairmanMessage'), 'ChairmanMessage');
const ChairmanDashboard = lazyNamed(() => import('./pages/ChairmanDashboard'), 'ChairmanDashboard');
const CertificateApply = lazyNamed(() => import('./pages/CertificateApply'), 'CertificateApply');
const CertificateTrack = lazyNamed(() => import('./pages/CertificateTrack'), 'CertificateTrack');
const CitizenDashboard = lazyNamed(() => import('./pages/CitizenDashboard'), 'CitizenDashboard');
const CitizenComplaintDetail = lazyNamed(() => import('./pages/CitizenComplaintDetail'), 'CitizenComplaintDetail');
const CitizenCertificateDetail = lazyNamed(() => import('./pages/CitizenCertificateDetail'), 'CitizenCertificateDetail');
const CitizenNotifications = lazyNamed(() => import('./pages/CitizenNotifications'), 'CitizenNotifications');
const CitizenLogin = lazyNamed(() => import('./pages/CitizenLogin'), 'CitizenLogin');
const CitizenProfile = lazyNamed(() => import('./pages/CitizenProfile'), 'CitizenProfile');
const Contact = lazyNamed(() => import('./pages/Contact'), 'Contact');
const CouncilorCertificateDetail = lazyNamed(() => import('./pages/CouncilorCertificateDetail'), 'CouncilorCertificateDetail');
const CouncilorCertificates = lazyNamed(() => import('./pages/CouncilorCertificates'), 'CouncilorCertificates');
const Downloads = lazyNamed(() => import('./pages/Downloads'), 'Downloads');
const Home = lazyNamed(() => import('./pages/Home'), 'Home');
const LeadershipMessages = lazyNamed(() => import('./pages/LeadershipMessages'), 'LeadershipMessages');
const News = lazyNamed(() => import('./pages/News'), 'News');
const Notices = lazyNamed(() => import('./pages/Notices'), 'Notices');
const PrivacyPolicy = lazyNamed(() => import('./pages/PrivacyPolicy'), 'PrivacyPolicy');
const Services = lazyNamed(() => import('./pages/Services'), 'Services');
const SubmitComplaint = lazyNamed(() => import('./pages/SubmitComplaint'), 'SubmitComplaint');
const TrackComplaint = lazyNamed(() => import('./pages/TrackComplaint'), 'TrackComplaint');

function RouteFallback() {
  return (
    <div className="mx-auto flex min-h-[40vh] max-w-7xl items-center justify-center px-4 py-12 text-sm font-semibold text-slate-500">
      Loading Kunri Citizens Portal...
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Suspense fallback={<RouteFallback />}>
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
            <Route path="/privacy-policy" element={<PrivacyPolicy />} />
            <Route path="/submit" element={<SubmitComplaint />} />
            <Route path="/track" element={<TrackComplaint />} />
            <Route path="/certificates/apply" element={<CertificateApply />} />
            <Route path="/certificates/track" element={<CertificateTrack />} />
            <Route path="/citizen/login" element={<CitizenLogin />} />
            <Route path="/citizen/dashboard" element={<CitizenDashboard />} />
            <Route path="/citizen/profile" element={<CitizenProfile />} />
            <Route path="/citizen/complaints/:id" element={<CitizenComplaintDetail />} />
            <Route path="/citizen/certificates/:id" element={<CitizenCertificateDetail />} />
            <Route path="/citizen/notifications" element={<CitizenNotifications />} />
            <Route path="/staff/login" element={<StaffLogin />} />
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
            <Route path="/admin/login" element={<Navigate to="/staff/login" replace />} />
            <Route path="/councilor/certificates" element={<CouncilorCertificates />} />
            <Route path="/councilor/certificates/:id" element={<CouncilorCertificateDetail />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </Layout>
    </BrowserRouter>
  );
}
