import Image from "next/image";
import Link from "next/link";

const api =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

type Membre = {
  id: number;
  name: string;
  role: string;
  bio: string;
  photo?: string;
};

export default async function Home() {
  let membres: Membre[] = [];

  try {
    const reponse = await fetch(`${api}/api/members`, {
      cache: "no-store",
    });

    if (reponse.ok) {
      membres = await reponse.json();
    }
  } catch {}

  return (
    <>
      {/* INTRODUCTION */}
      <section className="accueil">
        <div className="accueil-contenu">
          <p className="sur-titre">La liste · 2026</p>

          <h1>
            Bienvenue au
            <br />
            <em>Château Forum</em>
          </h1>

          <p className="accueil-description">
            Des moments pour se retrouver, des idées à construire ensemble
            et une vie de campus ouverte à toutes et à tous.
          </p>

          <Link className="bouton bouton-clair" href="/evenements">
            Découvrir nos événements
            <span aria-hidden="true"> →</span>
          </Link>
        </div>

        <div className="accueil-decoration" aria-hidden="true">
          CF
        </div>
      </section>

      {/* LE BUREAU */}
      <section className="section bureau" aria-labelledby="bureau-titre">
        <div className="titre-section">
          <p className="sur-titre sombre">Qui se cache derrière le château ?</p>

          <h2 id="bureau-titre">
            Découvrez le <em>bureau</em>
          </h2>

          <p className="introduction-section">
            Cinq étudiants, cinq rôles et une même envie :
            faire vivre Château Forum tout au long de l’année.
          </p>
        </div>

        {membres.length ? (
          <div className="grille-membres">
            {membres.map((membre, index) => (
              <article
                className={`carte-membre ${
                  index === 0 ? "carte-membre-principale" : ""
                }`}
                key={membre.id}
              >
                <div className="photo-membre">
                  {membre.photo ? (
                    <Image
                      src={membre.photo}
                      alt={`Portrait de ${membre.name}`}
                      fill
                      sizes="(max-width: 800px) 100vw, 33vw"
                    />
                  ) : (
                    <div className="photo-manquante">
                      {membre.name.slice(0, 1)}
                    </div>
                  )}

                  <span className="numero-membre">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                </div>

                <div className="contenu-membre">
                  <p className="poste-membre">{membre.role}</p>

                  <h3>{membre.name}</h3>

                  <p className="bio-membre">{membre.bio}</p>

                  <div className="signature-membre">
                    Château Forum · 2026
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <p className="aucun-membre">
            Les membres du bureau seront bientôt présentés ici.
          </p>
        )}
      </section>

      {/* PROGRAMME */}
      <section
        className="section programme"
        aria-labelledby="programme-titre"
      >
        <div className="titre-section">
          <p className="sur-titre sombre">Ce que nous voulons construire</p>
          <h2 id="programme-titre">Nos engagements</h2>
        </div>

        <div className="grille-engagements">
          <article className="carte-engagement">
            <span className="numero">01</span>
            <h3>Se rencontrer</h3>
            <p>
              Créer des occasions de se retrouver, de partager et de profiter
              pleinement de la vie étudiante.
            </p>
          </article>

          <article className="carte-engagement">
            <span className="numero">02</span>
            <h3>Faire ensemble</h3>
            <p>
              Donner une place aux idées des étudiants et permettre à chacun
              de participer à la vie du campus.
            </p>
          </article>

          <article className="carte-engagement">
            <span className="numero">03</span>
            <h3>Rassembler</h3>
            <p>
              Proposer des événements variés et accueillants, pensés pour
              toute la promotion.
            </p>
          </article>
        </div>
      </section>
    </>
  );
}