'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';

const api = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

type Member = {
  id: number;
  name: string;
  role: string;
  bio: string;
  order: number;
};

type Event = {
  id: number;
  title: string;
  description: string;
  date: string;
  location: string;
  published: boolean;
};

async function request(path: string, options?: RequestInit) {
  return fetch(`${api}${path}`, {
    ...options,
    credentials: 'include',
  });
}

function datePourFormulaire(value: string) {
  const date = new Date(value);

  const annee = date.getFullYear();
  const mois = String(date.getMonth() + 1).padStart(2, '0');
  const jour = String(date.getDate()).padStart(2, '0');
  const heures = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');

  return `${annee}-${mois}-${jour}T${heures}:${minutes}`;
}

export default function Admin() {
  const router = useRouter();

  const [allowed, setAllowed] = useState(false);
  const [checking, setChecking] = useState(true);
  const [message, setMessage] = useState('');

  const [members, setMembers] = useState<Member[]>([]);
  const [events, setEvents] = useState<Event[]>([]);

  const [membersError, setMembersError] = useState('');
  const [eventsError, setEventsError] = useState('');
  const [loadingMembers, setLoadingMembers] = useState(true);
  const [loadingEvents, setLoadingEvents] = useState(true);

  const [editMember, setEditMember] = useState<Member | null>(null);
  const [editEvent, setEditEvent] = useState<Event | null>(null);

  const [savingMember, setSavingMember] = useState(false);
  const [savingEvent, setSavingEvent] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  async function loadMembers() {
    setLoadingMembers(true);
    setMembersError('');

    try {
      const response = await request('/api/members');

      if (!response.ok) {
        throw new Error(
          `Impossible de charger les membres (${response.status}).`
        );
      }

      const data = await response.json();

      if (!Array.isArray(data)) {
        throw new Error('Le serveur a renvoyé une liste de membres invalide.');
      }

      setMembers(data);
    } catch (error) {
      setMembersError(
        error instanceof Error
          ? error.message
          : 'Impossible de charger les membres.'
      );
    } finally {
      setLoadingMembers(false);
    }
  }

  async function loadEvents() {
    setLoadingEvents(true);
    setEventsError('');

    try {
      const response = await request('/api/admin/events');

      if (!response.ok) {
        throw new Error(
          `Impossible de charger les événements (${response.status}).`
        );
      }

      const data = await response.json();

      if (!Array.isArray(data)) {
        throw new Error(
          'Le serveur a renvoyé une liste d’événements invalide.'
        );
      }

      setEvents(data);
    } catch (error) {
      setEventsError(
        error instanceof Error
          ? error.message
          : 'Impossible de charger les événements.'
      );
    } finally {
      setLoadingEvents(false);
    }
  }

  useEffect(() => {
    async function checkSession() {
      try {
        const response = await request('/api/me');

        if (!response.ok) {
          setMessage('Connectez-vous avec un compte administrateur.');
          return;
        }

        const data = await response.json();

        if (data.user?.role !== 'ADMIN') {
          setMessage('Connectez-vous avec un compte administrateur.');
          return;
        }

        setAllowed(true);

        await Promise.all([loadMembers(), loadEvents()]);
      } catch {
        setMessage('Impossible de contacter le serveur.');
      } finally {
        setChecking(false);
      }
    }

    void checkSession();
  }, []);

  async function saveMember(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const formulaire = event.currentTarget;
    const formData = new FormData(formulaire);

    const data = {
      name: String(formData.get('name') || ''),
      role: String(formData.get('role') || ''),
      bio: String(formData.get('bio') || ''),
      order: Number(formData.get('order')),
    };

    setSavingMember(true);
    setMessage('');

    try {
      const path = editMember
        ? `/api/admin/members/${editMember.id}`
        : '/api/admin/members';

      const response = await request(path, {
        method: editMember ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        setMessage(
          `Impossible d’enregistrer ce membre (${response.status}).`
        );
        return;
      }

      formulaire.reset();
      setEditMember(null);
      setMessage('Membre enregistré.');

      await loadMembers();
      router.refresh();
    } catch {
      setMessage('Impossible de contacter le serveur pour enregistrer le membre.');
    } finally {
      setSavingMember(false);
    }
  }

  async function saveEvent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const formulaire = event.currentTarget;
    const formData = new FormData(formulaire);
    const date = new Date(String(formData.get('date')));

    if (Number.isNaN(date.getTime())) {
      setMessage('Indique une date et une heure valides.');
      return;
    }

    const data = {
      title: String(formData.get('title') || ''),
      description: String(formData.get('description') || ''),
      location: String(formData.get('location') || ''),
      date: date.toISOString(),
      published: formData.get('published') === 'on',
    };

    setSavingEvent(true);
    setMessage('');

    try {
      const path = editEvent
        ? `/api/admin/events/${editEvent.id}`
        : '/api/admin/events';

      const response = await request(path, {
        method: editEvent ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        setMessage(
          `Impossible d’enregistrer cet événement (${response.status}).`
        );
        return;
      }

      formulaire.reset();
      setEditEvent(null);
      setMessage('Événement enregistré.');

      await loadEvents();
      router.refresh();
    } catch {
      setMessage(
        'Impossible de contacter le serveur pour enregistrer l’événement.'
      );
    } finally {
      setSavingEvent(false);
    }
  }

  async function remove(
    type: 'members' | 'events',
    id: number,
    name: string
  ) {
    if (!window.confirm(`Supprimer définitivement « ${name} » ?`)) {
      return;
    }

    setDeleting(`${type}-${id}`);
    setMessage('');

    try {
      const response = await request(`/api/admin/${type}/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        setMessage(`Suppression impossible (${response.status}).`);
        return;
      }

      if (type === 'members') {
        if (editMember?.id === id) {
          setEditMember(null);
        }

        await loadMembers();
      } else {
        if (editEvent?.id === id) {
          setEditEvent(null);
        }

        await loadEvents();
      }

      setMessage(
        type === 'members' ? 'Membre supprimé.' : 'Événement supprimé.'
      );

      router.refresh();
    } catch {
      setMessage('Impossible de contacter le serveur pour la suppression.');
    } finally {
      setDeleting(null);
    }
  }

  async function logout() {
    try {
      const response = await request('/api/logout', {
        method: 'POST',
      });

      if (!response.ok) {
        setMessage('Déconnexion impossible.');
        return;
      }

      window.location.href = '/';
    } catch {
      setMessage('Impossible de contacter le serveur.');
    }
  }

  return (
    <section className="section">
      <p className="eyebrow dark">Gestion de la liste</p>
      <h1>Administration</h1>

      <p role="status" aria-live="polite">
        {checking ? 'Vérification de la session…' : message}
      </p>

      {!checking && !allowed && (
        <a href="/connexion">Aller à la connexion</a>
      )}

      {allowed && (
        <>
          <button
            type="button"
            className="secondary"
            onClick={logout}
          >
            Se déconnecter
          </button>

          <div className="admin-grid">
            <section aria-labelledby="members-title">
              <h2 id="members-title">Membres</h2>

              <form
                className="panel"
                onSubmit={saveMember}
                key={editMember?.id ?? 'new-member'}
                aria-busy={savingMember}
              >
                <h3>
                  {editMember ? 'Modifier un membre' : 'Ajouter un membre'}
                </h3>

                <label>
                  Nom
                  <input
                    name="name"
                    defaultValue={editMember?.name ?? ''}
                    required
                    maxLength={80}
                  />
                </label>

                <label>
                  Rôle
                  <input
                    name="role"
                    defaultValue={editMember?.role ?? ''}
                    required
                    maxLength={80}
                  />
                </label>

                <label>
                  Présentation
                  <textarea
                    name="bio"
                    defaultValue={editMember?.bio ?? ''}
                    maxLength={600}
                  />
                </label>

                <label>
                  Ordre d’affichage
                  <input
                    name="order"
                    type="number"
                    defaultValue={editMember?.order ?? 0}
                  />
                </label>

                <button type="submit" disabled={savingMember}>
                  {savingMember ? 'Enregistrement…' : 'Enregistrer'}
                </button>

                {editMember && (
                  <button
                    className="secondary"
                    type="button"
                    disabled={savingMember}
                    onClick={() => setEditMember(null)}
                  >
                    Annuler
                  </button>
                )}
              </form>

              <h3>Membres enregistrés</h3>

              {loadingMembers && <p>Chargement des membres…</p>}

              {membersError && (
                <div role="alert">
                  <p>{membersError}</p>
                  <button
                    type="button"
                    className="secondary"
                    onClick={loadMembers}
                    disabled={loadingMembers}
                  >
                    Réessayer
                  </button>
                </div>
              )}

              {!loadingMembers && !membersError && members.length === 0 && (
                <p>Aucun membre enregistré dans la base de données.</p>
              )}

              <ul className="manage-list">
                {members.map((member) => (
                  <li key={member.id}>
                    <span>
                      <strong>{member.name}</strong> · {member.role}
                    </span>

                    <span>
                      <button
                        type="button"
                        className="secondary"
                        disabled={savingMember || deleting !== null}
                        onClick={() => setEditMember(member)}
                        aria-label={`Modifier ${member.name}`}
                      >
                        Modifier
                      </button>

                      <button
                        type="button"
                        className="danger"
                        disabled={savingMember || deleting !== null}
                        onClick={() =>
                          remove('members', member.id, member.name)
                        }
                        aria-label={`Supprimer ${member.name}`}
                      >
                        {deleting === `members-${member.id}`
                          ? 'Suppression…'
                          : 'Supprimer'}
                      </button>
                    </span>
                  </li>
                ))}
              </ul>
            </section>

            <section aria-labelledby="events-title">
              <h2 id="events-title">Événements</h2>

              <form
                className="panel"
                onSubmit={saveEvent}
                key={editEvent?.id ?? 'new-event'}
                aria-busy={savingEvent}
              >
                <h3>
                  {editEvent
                    ? 'Modifier un événement'
                    : 'Ajouter un événement'}
                </h3>

                <label>
                  Titre
                  <input
                    name="title"
                    defaultValue={editEvent?.title ?? ''}
                    required
                    maxLength={120}
                  />
                </label>

                <label>
                  Date et heure
                  <input
                    name="date"
                    type="datetime-local"
                    defaultValue={
                      editEvent ? datePourFormulaire(editEvent.date) : ''
                    }
                    required
                  />
                </label>

                <label>
                  Lieu
                  <input
                    name="location"
                    defaultValue={editEvent?.location ?? ''}
                    required
                    maxLength={160}
                  />
                </label>

                <label>
                  Description
                  <textarea
                    name="description"
                    defaultValue={editEvent?.description ?? ''}
                    required
                    maxLength={3000}
                  />
                </label>

                <label className="check">
                  <input
                    name="published"
                    type="checkbox"
                    defaultChecked={editEvent?.published ?? false}
                  />
                  Publier l’événement
                </label>

                <button type="submit" disabled={savingEvent}>
                  {savingEvent ? 'Enregistrement…' : 'Enregistrer'}
                </button>

                {editEvent && (
                  <button
                    className="secondary"
                    type="button"
                    disabled={savingEvent}
                    onClick={() => setEditEvent(null)}
                  >
                    Annuler
                  </button>
                )}
              </form>

              <h3>Événements enregistrés</h3>

              {loadingEvents && <p>Chargement des événements…</p>}

              {eventsError && (
                <div role="alert">
                  <p>{eventsError}</p>
                  <button
                    type="button"
                    className="secondary"
                    onClick={loadEvents}
                    disabled={loadingEvents}
                  >
                    Réessayer
                  </button>
                </div>
              )}

              {!loadingEvents && !eventsError && events.length === 0 && (
                <p>Aucun événement enregistré.</p>
              )}

              <ul className="manage-list">
                {events.map((event) => (
                  <li key={event.id}>
                    <span>
                      <strong>{event.title}</strong>
                      <br />
                      {new Date(event.date).toLocaleString('fr-FR', {
                        dateStyle: 'short',
                        timeStyle: 'short',
                      })}
                      {' · '}
                      {event.published ? 'Publié' : 'Brouillon'}
                      {' · '}
                      N° {event.id}
                    </span>

                    <span>
                      <button
                        type="button"
                        className="secondary"
                        disabled={savingEvent || deleting !== null}
                        onClick={() => setEditEvent(event)}
                        aria-label={`Modifier ${event.title}, numéro ${event.id}`}
                      >
                        Modifier
                      </button>

                      <button
                        type="button"
                        className="danger"
                        disabled={savingEvent || deleting !== null}
                        onClick={() =>
                          remove(
                            'events',
                            event.id,
                            `${event.title} — n° ${event.id}`
                          )
                        }
                        aria-label={`Supprimer ${event.title}, numéro ${event.id}`}
                      >
                        {deleting === `events-${event.id}`
                          ? 'Suppression…'
                          : 'Supprimer'}
                      </button>
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </>
      )}
    </section>
  );
}