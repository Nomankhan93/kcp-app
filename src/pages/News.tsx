import { useEffect, useState } from 'react';
import { Newspaper } from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { PublicCard } from '../components/PublicCard';
import { fetchPublishedNews } from '../lib/cms';
import { newsUpdates } from '../lib/publicContent';
import type { PublicCardItem } from '../lib/publicContent';

export function News() {
  const [items, setItems] = useState<PublicCardItem[]>(newsUpdates);

  useEffect(() => {
    fetchPublishedNews().then(setItems).catch(() => setItems(newsUpdates));
  }, []);

  return (
    <>
      <PageHeader
        eyebrow="News / Updates"
        title="Town Committee Kunri updates"
        description="Approved news, progress updates and service announcements from Town Committee Kunri."
      />

      <section className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid gap-5">
          {items.map((item) => (
            <PublicCard
              key={`${item.title}-${item.meta ?? ''}`}
              title={item.title}
              description={item.description}
              meta={item.meta}
              status={item.status}
              icon={<Newspaper className="h-6 w-6" />}
            />
          ))}
        </div>
      </section>
    </>
  );
}
