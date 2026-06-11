import { PageHeader } from '../components/PageHeader';

const sections = [
  {
    title: 'Purpose of data collection',
    body: 'Kunri Citizens Portal collects citizen information only for municipal complaints, certificate applications, public service tracking, ward verification and official Town Committee follow-up.',
  },
  {
    title: 'Information collected',
    body: 'The portal may collect name, mobile number, CNIC where required, ward, mohalla, address, complaint details, certificate application details, uploaded documents, public remarks and status history.',
  },
  {
    title: 'Who can access records',
    body: 'Authorized Town Committee staff can access service records for processing. Ward General Councilors can access only certificate applications from their assigned ward for verification. Chairman access is for monitoring and reporting.',
  },
  {
    title: 'Document and certificate privacy',
    body: 'Applicant documents and issued certificates are not intended for open public browsing. Tracking number and mobile verification are required for citizen-facing status or certificate access.',
  },
  {
    title: 'Security and accountability',
    body: 'The portal maintains role-based access, status history and internal/public remarks to support transparent service delivery. Official users should not share login credentials or download citizen documents except for official work.',
  },
  {
    title: 'Official approval note',
    body: 'This privacy wording should be reviewed and approved by Town Committee Kunri before public launch and updated according to any official legal or administrative requirement.',
  },
];

export function PrivacyPolicy() {
  return (
    <>
      <PageHeader
        eyebrow="Citizen Data"
        title="Privacy policy"
        description="How Kunri Citizens Portal handles citizen complaints, certificate applications, uploaded documents and official access."
      />

      <section className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="rounded-3xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-900">
          <p className="font-bold">Draft for official approval</p>
          <p className="mt-1">
            This page is provided as a launch-ready draft. Town Committee Kunri should review and approve final privacy, retention and data ownership wording before public launch.
          </p>
        </div>

        <div className="mt-6 grid gap-4">
          {sections.map((section) => (
            <article key={section.title} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-bold text-slate-950">{section.title}</h2>
              <p className="mt-2 text-sm leading-7 text-slate-600">{section.body}</p>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}
