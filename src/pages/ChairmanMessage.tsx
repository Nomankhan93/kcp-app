import { PageHeader } from '../components/PageHeader';
import { LeadershipMessageCard } from '../components/LeadershipMessageCard';
import { chairmanMessage } from '../lib/publicContent';

export function ChairmanMessage() {
  return (
    <>
      <PageHeader
        eyebrow="Chairman Message"
        title={chairmanMessage.title}
        description={chairmanMessage.subtitle}
      />

      <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <LeadershipMessageCard message={chairmanMessage} />
      </section>
    </>
  );
}
