import { useEffect, useState } from 'react';
import { Download, FileText } from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { PublicCard } from '../components/PublicCard';
import { fetchPublishedDownloads, type PublicDownloadItem } from '../lib/cms';
import { downloads } from '../lib/publicContent';

export function Downloads() {
  const [items, setItems] = useState<PublicDownloadItem[]>(downloads);

  useEffect(() => {
    fetchPublishedDownloads().then(setItems).catch(() => setItems(downloads));
  }, []);

  return (
    <>
      <PageHeader
        eyebrow="Downloads / Forms"
        title="Public forms and downloadable documents"
        description="Approved forms, templates and citizen service documents from Town Committee Kunri."
      />

      <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid gap-5 md:grid-cols-2">
          {items.map((item) => (
            <PublicCard
              key={`${item.title}-${item.meta ?? ''}`}
              title={item.title}
              description={item.description}
              meta={item.meta}
              status={item.status}
              icon={<FileText className="h-6 w-6" />}
            >
              {item.fileUrl ? (
                <a
                  href={item.fileUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center rounded-2xl bg-civic-700 px-4 py-2 text-sm font-bold text-white hover:bg-civic-800"
                >
                  <Download className="mr-2 h-4 w-4" />
                  Download
                </a>
              ) : (
                <button
                  type="button"
                  disabled
                  className="inline-flex cursor-not-allowed items-center rounded-2xl bg-slate-100 px-4 py-2 text-sm font-bold text-slate-500"
                  title="File will be enabled after upload"
                >
                  <Download className="mr-2 h-4 w-4" />
                  Download pending
                </button>
              )}
            </PublicCard>
          ))}
        </div>
      </section>
    </>
  );
}
