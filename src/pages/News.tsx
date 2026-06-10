import { Newspaper } from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { PublicCard } from '../components/PublicCard';
import { newsUpdates } from '../lib/publicContent';

export function News() {
  return (
    <>
      <PageHeader
        eyebrow="News / Updates"
        title="Town Committee Kunri updates"
        description="Approved news, progress updates and service announcements can be published here after official content confirmation."
      />

      <section className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid gap-5">
          {newsUpdates.map((item) => (
            <PublicCard
              key={item.title}
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
