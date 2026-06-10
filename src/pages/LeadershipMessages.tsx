import { PageHeader } from '../components/PageHeader';
import { LeadershipMessageCard } from '../components/LeadershipMessageCard';
import { leadershipMessages } from '../lib/publicContent';

export function LeadershipMessages() {
  return (
    <>
      <PageHeader
        eyebrow="Leadership Messages"
        title="Public messages from Town Committee leadership"
        description="Chairman and public representative message sections with official photos. Draft text can be replaced with approved wording before public launch."
      />

      <section className="mx-auto grid max-w-6xl gap-8 px-4 py-8 sm:px-6 lg:px-8">
        {leadershipMessages.map((message) => (
          <LeadershipMessageCard key={message.id} message={message} reverse={message.id === 'mpa'} />
        ))}
      </section>
    </>
  );
}
