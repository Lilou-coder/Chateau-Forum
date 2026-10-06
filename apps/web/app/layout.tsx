import './style.css';
import Link from 'next/link';
export const metadata = { title: 'ChâteauForum', description: 'La liste, son programme et ses événements.' };
export default function Layout({ children }: { children: React.ReactNode }) {
  return <html lang="fr">
    <body>
      <a className="skip" href="#contenu">
        Aller au contenu
      </a>
      <header className="site-header">
        <Link className="brand" href="/"> Château<span>Forum</span></Link>
        <nav aria-label="Navigation principale">
          <Link href="/">La liste</Link>
          <Link href="/evenements">Événements</Link>
          <Link href="/connexion">Connexion</Link>
          <Link href="/admin">Administration</Link>
          </nav>
      </header>
      <main id="contenu">
        {children}
      </main>
      <footer>ChâteauForum · Une liste, des evenements, du fun.</footer>
      </body>
    </html>;
}
