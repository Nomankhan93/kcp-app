import { useEffect, useState } from 'react';
import { PageHeader } from '../components/PageHeader';
import { LeadershipMessageCard } from '../components/LeadershipMessageCard';
import { fetchPublishedLeadershipMessages } from '../lib/cms';
import { chairmanMessage } from '../lib/publicContent';
import type { LeadershipMessage } from '../lib/publicContent';

export function ChairmanMessage() {
  const [message, setMessage] = useState<LeadershipMessage>(chairmanMessage);

  useEffect(() => {
    fetchPublishedLeadershipMessages()
      .then((messages) => setMessage(messages.find((item) => item.id === 'chairman') ?? chairmanMessage))
      .catch(() => setMessage(chairmanMessage));
  }, []);

  return (
    <>
      <PageHeader
        eyebrow="Chairman Message"
        title="Message from the Chairman, Town Committee Kunri"
        description="Official message section for the Chairman of Town Committee Kunri."
      />

      <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <LeadershipMessageCard message={message} />
      </section>
    </>
  );
}
