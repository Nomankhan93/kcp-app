import { useEffect, useState } from 'react';
import { Bell } from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { PublicCard } from '../components/PublicCard';
import { fetchPublishedNotices } from '../lib/cms';
import { publicNotices } from '../lib/publicContent';
import type { PublicCardItem } from '../lib/publicContent';

export function Notices() {
  const [items, setItems] = useState<PublicCardItem[]>(publicNotices);

  useEffect(() => {
    fetchPublishedNotices().then(setItems).catch(() => setItems(publicNotices));
  }, []);

  return (
    <>
      <PageHeader
        eyebrow="Public Notices"
        title="Official notices and citizen alerts"
        description="Approved notices, emergency alerts and important public information from Town Committee Kunri."
      />

      <section className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid gap-5">
          {items.map((notice) => (
            <PublicCard
              key={`${notice.title}-${notice.meta ?? ''}`}
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
