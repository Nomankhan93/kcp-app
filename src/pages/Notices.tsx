import { Bell } from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { PublicCard } from '../components/PublicCard';
import { publicNotices } from '../lib/publicContent';

export function Notices() {
  return (
    <>
      <PageHeader
        eyebrow="Public Notices"
        title="Official notices and citizen alerts"
        description="This section is prepared for approved notices, emergency alerts and important public information from Town Committee Kunri."
      />

      <section className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid gap-5">
          {publicNotices.map((notice) => (
            <PublicCard
              key={notice.title}
              title={notice.title}
              description={notice.description}
              meta={notice.meta}
              status={notice.status}
              icon={<Bell className="h-6 w-6" />}
            />
          ))}
        </div>
      </section>
    </>
  );
}
