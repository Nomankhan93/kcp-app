import { useEffect, useState } from 'react';
import { PageHeader } from '../components/PageHeader';
import { LeadershipMessageCard } from '../components/LeadershipMessageCard';
import { fetchPublishedLeadershipMessages } from '../lib/cms';
import { leadershipMessages } from '../lib/publicContent';
import type { LeadershipMessage } from '../lib/publicContent';

export function LeadershipMessages() {
  const [messages, setMessages] = useState<LeadershipMessage[]>(leadershipMessages);

  useEffect(() => {
    fetchPublishedLeadershipMessages().then(setMessages).catch(() => setMessages(leadershipMessages));
  }, []);

  return (
    <>
      <PageHeader
        eyebrow="Leadership Messages"
        title="Public messages from Town Committee leadership"
        description="Chairman and public representative message sections with official photos and approved wording."
      />

      <section className="mx-auto grid max-w-6xl gap-8 px-4 py-8 sm:px-6 lg:px-8">
        {messages.map((message) => (
          <LeadershipMessageCard key={message.id} message={message} reverse={message.id === 'mpa'} />
        ))}
      </section>
    </>
  );
}
