'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
const api = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
type Event = { id: number; title: string; description: string; date: string; location: string; interested: number };
export default function Events() {
  const [events, setEvents] = useState<Event[]>([]);
  const [message, setMessage] = useState('Chargement des événements…');
  const [reacted, setReacted] = useState<number[]>([]);
  async function load() { try { const r = await fetch(`${api}/api/events`); if (!r.ok) throw Error(); const data = await r.json(); setEvents(data); setMessage(data.length ? '' : 'Aucun événement publié pour le moment.'); } catch { setMessage('Impossible de charger les événements. Vérifiez que l’API est lancée.'); } }
  useEffect(() => { load(); }, []);
  async function react(id: number) { const r = await fetch(`${api}/api/events/${id}/reaction`, { method: 'PUT', credentials: 'include' }); if (r.status === 401) { setMessage('Connectez-vous pour réagir aux événements.'); return; } if (!r.ok) { setMessage('La réaction n’a pas pu être enregistrée.'); return; } const data = await r.json(); setReacted(current => data.interested ? [...current, id] : current.filter(n => n !== id)); await load(); setMessage(data.interested ? 'Votre réaction a été enregistrée.' : 'Votre réaction a été retirée.'); }
  return <section className="section"><p className="eyebrow dark">À venir</p><h1>Événements</h1><p>Retrouvez-nous sur le campus. Connectez-vous pour indiquer votre intérêt.</p><p role="status" aria-live="polite">{message}</p><div className="event-list">{events.map(event => <article className="event" key={event.id}><div className="date-tile"><strong>{new Intl.DateTimeFormat('fr-FR', { day: '2-digit' }).format(new Date(event.date))}</strong><span>{new Intl.DateTimeFormat('fr-FR', { month: 'short' }).format(new Date(event.date))}</span></div><div><h2>{event.title}</h2><p className="event-meta">{new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long', timeStyle: 'short' }).format(new Date(event.date))} · {event.location}</p><p>{event.description}</p><button type="button" onClick={() => react(event.id)} aria-label={`Indiquer mon intérêt pour ${event.title}`}>Ça m’intéresse · {event.interested}{reacted.includes(event.id) ? ' ✓' : ''}</button></div></article>)}</div><p>Vous avez un compte ? <Link href="/connexion">Se connecter</Link></p></section>;
}
