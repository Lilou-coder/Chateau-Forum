'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

const api = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

type Event = {
  id: number;
  title: string;
  description: string;
  date: string;
  location: string;
  interested: number;
};

function trierEvenements(evenements: Event[]) {
  const maintenant = Date.now();

  return [...evenements].sort((a, b) => {
    const dateA = new Date(a.date).getTime();
    const dateB = new Date(b.date).getTime();

    const aEstPasse = dateA < maintenant;
    const bEstPasse = dateB < maintenant;

    if (aEstPasse !== bEstPasse) {
      return aEstPasse ? 1 : -1;
    }

    return aEstPasse ? dateB - dateA : dateA - dateB;
  });
}

export default function Events() {
  const [events, setEvents] = useState<Event[]>([]);
  const [message, setMessage] = useState('Chargement des événements…');
  const [reacted, setReacted] = useState<number[]>([]);
  const [reacting, setReacting] = useState<number | null>(null);

  async function load() {
    try {
      const response = await fetch(`${api}/api/events`);

      if (!response.ok) {
        throw new Error('Chargement impossible.');
      }

      const data: Event[] = await response.json();

      setEvents(trierEvenements(data));
      setMessage(
        data.length ? '' : 'Aucun événement publié pour le moment.'
      );

      return true;
    } catch {
      setMessage(
        'Impossible de charger les événements. Vérifiez que l’API est lancée.'
      );

      return false;
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function react(id: number) {
    setReacting(id);

    try {
      const response = await fetch(`${api}/api/events/${id}/reaction`, {
        method: 'PUT',
        credentials: 'include',
      });

      if (response.status === 401) {
        setMessage('Connectez-vous pour réagir aux événements.');
        return;
      }

      if (!response.ok) {
        setMessage('La réaction n’a pas pu être enregistrée.');
        return;
      }

      const data = await response.json();

      setReacted((current) =>
        data.interested
          ? [...current.filter((number) => number !== id), id]
          : current.filter((number) => number !== id)
      );

      const loaded = await load();

      if (loaded) {
        setMessage(
          data.interested
            ? 'Votre réaction a été enregistrée.'
            : 'Votre réaction a été retirée.'
        );
      }
    } catch {
      setMessage('Impossible de contacter le serveur.');
    } finally {
      setReacting(null);
    }
  }

  return (
    <section className="section">
      <p className="eyebrow dark">Le calendrier de la liste</p>
      <h1>Événements</h1>

      <p>
        Retrouvez-nous sur le campus. Connectez-vous pour indiquer votre
        intérêt.
      </p>

      <p role="status" aria-live="polite">
        {message}
      </p>

      <div className="event-list">
        {events.map((event) => (
          <article className="event" key={event.id}>
            <div className="date-tile">
              <strong>
                {new Intl.DateTimeFormat('fr-FR', {
                  day: '2-digit',
                }).format(new Date(event.date))}
              </strong>

              <span>
                {new Intl.DateTimeFormat('fr-FR', {
                  month: 'short',
                }).format(new Date(event.date))}
              </span>
            </div>

            <div>
              <h2>{event.title}</h2>

              <p className="event-meta">
                <time dateTime={event.date}>
                  {new Intl.DateTimeFormat('fr-FR', {
                    dateStyle: 'long',
                    timeStyle: 'short',
                  }).format(new Date(event.date))}
                </time>
                {' · '}
                {event.location}
              </p>

              <p>{event.description}</p>

              <button
                type="button"
                onClick={() => react(event.id)}
                disabled={reacting !== null}
                aria-label={`Indiquer mon intérêt pour ${event.title}`}
              >
                {reacting === event.id
                  ? 'Enregistrement…'
                  : `Ça m’intéresse · ${event.interested}${
                      reacted.includes(event.id) ? ' ✓' : ''
                    }`}
              </button>
            </div>
          </article>
        ))}
      </div>

      <p>
        Vous avez un compte ?{' '}
        <Link href="/connexion">Se connecter</Link>
      </p>
    </section>
  );
}