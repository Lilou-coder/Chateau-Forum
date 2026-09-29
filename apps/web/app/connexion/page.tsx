'use client';
import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
const api = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
export default function Login() {
  const [error, setError] = useState(''); const [register, setRegister] = useState(false); const router = useRouter();
  async function submit(e: FormEvent<HTMLFormElement>) { e.preventDefault(); const form = new FormData(e.currentTarget); const r = await fetch(`${api}/api/${register ? 'register' : 'login'}`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: form.get('name'), email: form.get('email'), password: form.get('password') }) }); if (!r.ok) { setError((await r.json()).error || 'Connexion impossible.'); return; } const user = await r.json(); router.push(user.role === 'ADMIN' ? '/admin' : '/evenements'); router.refresh(); }
  return <section className="section narrow"><p className="eyebrow dark">Votre espace</p><h1>{register ? 'Créer un compte' : 'Connexion'}</h1><p>Créez un compte pour réagir aux événements.</p><form onSubmit={submit} className="panel">{register && <label>Nom<input name="name" autoComplete="name" required minLength={2} /></label>}<label>Email<input name="email" type="email" autoComplete="email" required /></label><label>Mot de passe<input name="password" type="password" autoComplete="current-password" required /></label><button type="submit">{register ? "Créer mon compte" : "Se connecter"}</button><button className="secondary" type="button" onClick={() => { setRegister(!register); setError(''); }}>{register ? "J’ai déjà un compte" : "Créer un compte"}</button><p role="alert">{error}</p></form></section>;
}
