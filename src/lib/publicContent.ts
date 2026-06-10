import {
  Bell,
  Building2,
  Clock3,
  Construction,
  Download,
  Droplets,
  FileText,
  Landmark,
  Lightbulb,
  Mail,
  MapPin,
  Megaphone,
  Newspaper,
  Phone,
  ShieldCheck,
  Trash2,
  Trees,
  UsersRound,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export type PublicCardItem = {
  title: string;
  description: string;
  meta?: string;
  status?: string;
};

export type ServiceDepartment = {
  title: string;
  description: string;
  responsibilities: string[];
  icon: LucideIcon;
};

export type LeadershipMessage = {
  id: string;
  eyebrow: string;
  title: string;
  name: string;
  designation: string;
  subtitle: string;
  imageUrl: string;
  imageAlt: string;
  imageFit: 'cover' | 'contain';
  paragraphs: string[];
  note: string;
};

export const siteInfo = {
  townName: 'Town Committee Kunri',
  portalName: 'Kunri Citizens Portal',
  district: 'District Umerkot, Sindh',
  officeAddress: 'Town Committee Office, Kunri, District Umerkot, Sindh',
  officePhone: 'To be provided by Town Committee Kunri',
  officeEmail: 'To be provided by Town Committee Kunri',
  officeHours: 'Monday to Saturday, 9:00 AM to 5:00 PM',
};

export const leadershipMessages: LeadershipMessage[] = [
  {
    id: 'mpa',
    eyebrow: 'Public Representative Message',
    title: 'Message from the Member Provincial Assembly',
    name: 'Member Provincial Assembly',
    designation: 'PS-51 Kunri / Umerkot',
    subtitle: 'Supporting digital access, service monitoring and citizen facilitation for Kunri.',
    imageUrl: '/leadership/mpa-ps51-kunri-umerkot.jpg',
    imageAlt: 'Member Provincial Assembly PS-51 Kunri Umerkot public message image',
    imageFit: 'contain',
    paragraphs: [
      'Digital public service systems can help citizens reach municipal offices more easily and help elected representatives monitor public issues more transparently.',
      'The Kunri Citizens Portal can provide a simple channel for complaints, certificate service requests, public notices, downloads and service information for the residents of Kunri.',
      'This section can be updated with the approved official message, name, designation and any development priorities shared by the Member Provincial Assembly office.',
    ],
    note: 'Draft text. Add approved official name/message only after written confirmation from the MPA office.',
  },
  {
    id: 'chairman',
    eyebrow: 'Chairman Message',
    title: 'Message from the Chairman',
    name: 'Chairman, Town Committee Kunri',
    designation: 'Town Committee Kunri',
    subtitle: 'Public service, transparency and timely complaint resolution for Kunri citizens.',
    imageUrl: '/leadership/chairman-town-committee-kunri.jpg',
    imageAlt: 'Chairman Town Committee Kunri official office photo',
    imageFit: 'cover',
    paragraphs: [
      'Kunri Citizens Portal is proposed as a digital public service platform for Town Committee Kunri. The aim is to make municipal complaint submission, tracking and communication easier for citizens.',
      'Through this portal, citizens will be able to submit complaints related to sanitation, street lights, drainage, water supply, roads and other municipal services. Each complaint will receive a tracking number for follow-up.',
      'Official notices, news updates, public forms and certificate service information can also be published here after approval by the competent authority of Town Committee Kunri.',
    ],
    note: "Draft text. Replace with the Chairman's approved official message and name before public launch.",
  },
];

export const chairmanMessage = leadershipMessages.find((message) => message.id === 'chairman') ?? leadershipMessages[1];

export const quickFacts: PublicCardItem[] = [
  {
    title: 'Digital Complaint Tracking',
    description: 'Citizens can submit complaints online and track progress using a tracking number and mobile number.',
  },
  {
    title: 'Official Public Updates',
    description: 'A central place for approved notices, updates and municipal information.',
  },
  {
    title: 'Transparent Administration',
    description: 'Admin dashboard structure for receiving, assigning and resolving public complaints.',
  },
];

export const departments: ServiceDepartment[] = [
  {
    title: 'Administration Branch',
    description: 'General office coordination, citizen facilitation and official correspondence.',
    responsibilities: ['Public facilitation desk', 'Office correspondence', 'Record coordination', 'General information'],
    icon: Building2,
  },
  {
    title: 'Sanitation Department',
    description: 'Cleanliness, garbage collection and sanitation-related complaint handling.',
    responsibilities: ['Garbage collection complaints', 'Street cleanliness', 'Waste disposal coordination', 'Sanitation staff follow-up'],
    icon: Trash2,
  },
  {
    title: 'Street Lights Section',
    description: 'Street light repair, maintenance and reporting of non-functional lights.',
    responsibilities: ['Street light complaints', 'Pole/light identification', 'Repair follow-up', 'Area-wise status updates'],
    icon: Lightbulb,
  },
  {
    title: 'Drainage / Sewerage Section',
    description: 'Drainage overflow, blocked lines and sewerage-related public issues.',
    responsibilities: ['Blocked drains', 'Overflow complaints', 'Emergency response coordination', 'Field verification'],
    icon: Droplets,
  },
  {
    title: 'Roads & Works Section',
    description: 'Road, street, footpath and municipal repair request coordination.',
    responsibilities: ['Road damage reports', 'Street repair requests', 'Work progress notes', 'Repair proof updates'],
    icon: Construction,
  },
  {
    title: 'Parks & Public Spaces',
    description: 'Public spaces, parks and civic area improvement requests.',
    responsibilities: ['Public space complaints', 'Park maintenance requests', 'Cleanliness follow-up', 'Citizen suggestions'],
    icon: Trees,
  },
  {
    title: 'Records / Certificates Desk',
    description: 'Information desk for birth, death and other municipal record inquiries.',
    responsibilities: ['Birth record inquiry', 'Death record inquiry', 'Form guidance', 'Document requirement information'],
    icon: FileText,
  },
  {
    title: 'Chairman Overview Desk',
    description: 'Leadership dashboard view for public service monitoring and performance review.',
    responsibilities: ['Pending complaint overview', 'Department-wise progress', 'Area-wise issues', 'Weekly review summaries'],
    icon: Landmark,
  },
];

export const publicNotices: PublicCardItem[] = [
  {
    title: 'Official notice board is ready for approved content',
    description: 'Town Committee Kunri can publish public notices, meeting notices, emergency alerts and citizen guidance here after official approval.',
    meta: 'Draft section',
    status: 'Awaiting official content',
  },
  {
    title: 'Citizen complaint categories can be updated',
    description: 'Complaint categories, wards and departments can be finalized after approval from Town Committee Kunri administration.',
    meta: 'Configuration notice',
    status: 'Draft',
  },
];

export const newsUpdates: PublicCardItem[] = [
  {
    title: 'Kunri Citizens Portal public website structure prepared',
    description: 'The portal includes introduction, leadership messages, services, notices, news, downloads, contact and complaint tracking sections.',
    meta: 'Portal update',
    status: 'Draft',
  },
  {
    title: 'Complaint management workflow proposed',
    description: 'Citizens submit complaints, receive tracking numbers, and Town Committee staff can review and update complaint status through admin dashboard.',
    meta: 'Service update',
    status: 'Draft',
  },
];

export const downloads: PublicCardItem[] = [
  {
    title: 'Citizen Complaint Form',
    description: 'Printable complaint form template for citizens who prefer manual submission at Town Committee office.',
    meta: 'PDF template',
    status: 'To be uploaded',
  },
  {
    title: 'Birth Record Inquiry Form',
    description: 'Template for birth record inquiry and required document guidance.',
    meta: 'PDF template',
    status: 'To be uploaded',
  },
  {
    title: 'Death Record Inquiry Form',
    description: 'Template for death record inquiry and required document guidance.',
    meta: 'PDF template',
    status: 'To be uploaded',
  },
  {
    title: 'Department Contact Sheet',
    description: 'Official department-wise contact list after approval from Town Committee Kunri.',
    meta: 'PDF / DOCX',
    status: 'To be uploaded',
  },
];

export const contactItems = [
  { label: 'Office Address', value: siteInfo.officeAddress, icon: MapPin },
  { label: 'Phone', value: siteInfo.officePhone, icon: Phone },
  { label: 'Email', value: siteInfo.officeEmail, icon: Mail },
  { label: 'Office Hours', value: siteInfo.officeHours, icon: Clock3 },
];

export const publicFeatureLinks = [
  { title: 'Introduction', description: 'Town Committee Kunri portal overview and purpose.', to: '/about', icon: Building2 },
  { title: 'Leadership Messages', description: 'Chairman and public representative messages with official photos.', to: '/leadership-messages', icon: UsersRound },
  { title: 'Departments & Services', description: 'Municipal departments and service responsibilities.', to: '/services', icon: ShieldCheck },
  { title: 'Public Notices', description: 'Approved notices and important public information.', to: '/notices', icon: Bell },
  { title: 'News / Updates', description: 'Official news and progress updates.', to: '/news', icon: Newspaper },
  { title: 'Downloads / Forms', description: 'Forms and public service documents.', to: '/downloads', icon: Download },
  { title: 'Certificates', description: 'Apply and track birth, marriage and death certificate applications.', to: '/certificates/apply', icon: FileText },
];
