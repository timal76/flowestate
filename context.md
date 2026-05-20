# FlowEstate - Contexte du Projet

## 🎯 Description
SaaS d'automatisation pour agents immobiliers.

## ✅ Fait
- Landing page complète avec animations + essai gratuit 14 jours
- Navigation complète : Dashboard, Historique, Annonces, Emails, 
  Comptes-rendus, Accueil, Prénom cliquable → Profil, Badge plan, Déconnexion
- Menu hamburger responsive sur mobile (toutes les pages)
- Générateur d'annonces : formulaire complet, upload 5 photos, 
  longueur, ton (toggle), API Claude Sonnet, Markdown, copier
- Emails de relance : formulaire complet, signature dynamique, 
  ton (toggle), API Claude, copier, pré-remplissage depuis profil
- Compte-rendu de visite : formulaire complet, upload logo + 
  signature, PDF, ton (toggle), API Claude, copier, 
  pré-remplissage logo/signature/infos depuis profil
- 5 générations gratuites sans inscription (localStorage)
- Dashboard pro : stats dynamiques, activité récente dynamique, 
  bannière trial avec jours restants, compteur générations restantes
- Historique des générations : filtres par type, recherche 
  par prospect, pagination
- Page Profil : photo, infos perso, logo agence, signature, 
  abonnement, stats globales, portail Stripe, déconnexion
- Notifications email (Resend) : bienvenue + trial ending
- Spinner génération + Toast notifications (sonner)
- Page contact/support avec FAQ
- CGU + Mentions légales
- Landing page : hero animé CSS, sections features/tarifs/CTA toujours visibles (sans IntersectionObserver)
- SEO meta tags sur toutes les pages
- SEO meta tags corrigés (flowestate.fr au lieu de localhost)
- Modale visiteur : s'affiche à la première visite via localStorage (flowestate_visited)
- Modale onboarding : s'affiche à la première connexion (4 étapes : profil, outils, fonctionnement, c'est parti) — onboarding_completed en base Supabase
- Suppression de toutes les mentions "IA" dans le projet → remplacé par "automatisation"
- Templates sauvegardés : table Supabase, API CRUD complète, modale save/load, page /templates, intégration boutons dans annonces/emails/comptes-rendus
- Authentification réelle : NextAuth.js + Supabase + bcrypt
- Protection des routes : middleware Next.js
- Stripe : checkout, plans Starter(30 gen)/Pro(1 user), mensuel + annuel,
  essai 14 jours, webhooks local + production, portail client
- Limite 30 générations/mois pour Starter
- Domaine flowestate.fr connecté à Vercel ✅
- Resend domaine flowestate.fr vérifié ✅
- SUPABASE_SERVICE_ROLE_KEY ajouté sur Vercel et .env.local ✅
- Toutes variables d'environnement sur Vercel ✅ EN PRODUCTION
- Score annonce automatique /10 basé sur 7 critères objectifs (longueur, type de bien, surface, localisation, prix, accroche, appel à l'action)
- Retry automatique API Claude en cas d'erreur overloaded (1 retry après 2 secondes)
- CRM prospects : formatage budget « 400 000 € »
- Envoi d'emails via SMTP : configuration dans le profil, guide Gmail/Outlook, envoi direct depuis la page Emails
- Relances programmées avec envoi automatique via Vercel Cron (1x/jour à 8h UTC, plan Hobby)
- Fix fuseau horaire Europe/Paris pour l'affichage des dates de relances ✅
- Stripe passé en mode live — clés, produits et webhook configurés en production ✅
- Compte de démo créé avec profil complet (Thomas Marchand, Orpi Paris 11e)
- Gmail connecté en SMTP sur le compte démo
- Fix SMTP : Gmail uniquement dans le profil, guide simplifié
- Fix login/register : bouton afficher/masquer mot de passe
- Fix prospect : température chaud/tiède/froid dans le modal de création
- Fix page détail prospect : "Générer un compte-rendu" à la place de "Générer une annonce", section Relances déplacée avant l'historique
- Courbe d'activité 30 jours sur le dashboard (graphique Recharts avec barres Annonces / Emails / Comptes-rendus)
- Catégories Vendeur / Acheteur dans les prospects
- Badges température (🔴 Chaud / 🟡 Tiède / 🔵 Froid) sur les cards prospects
- Formulaire prospect adapté selon catégorie (champs différents vendeur vs acheteur)
- Fiche prospect complète : sections Emails générés, Comptes-rendus, Relances
- Historique et dashboard cliquables (modal contenu)
- Agence démo mise à jour en « Orpi Paris 11e »
- Fix modal prospect scroll (bouton Enregistrer visible)
- Enregistrement des générations en base via `recordGenerationFromRequest` (service role + session NextAuth, fix compte démo)
- Bouton « Programmer une relance » dans le générateur d'emails (email généré pré-rempli dans la modale)
- Relances liées aux prospects via `prospect_id` (lookup par email à la création)
- Export PDF fiche prospect (téléchargement direct jsPDF sans emojis)
- Colonne `content` ajoutée à la table `generations` (fix historique et activité récente)
- Fix animations landing page (suppression IntersectionObserver, contenu toujours visible)
- Plan Pro passé à 1 utilisateur sur la page tarifs
- Cron relances repassé à 1x/jour à 8h (contrainte Vercel Hobby)
- Compte démo passé en plan Pro
- Plans annuels avec toggle mensuel/annuel (-10%) sur page tarifs
  - Starter annuel : 529€/an (price_1TYQ8eKNbVXHUT7xQ8NxShie)
  - Pro annuel : 1069€/an (price_1TYQA0KNbVXHUT7xxNP30gsR)
  - Variables Vercel ajoutées : STRIPE_STARTER_ANNUAL_PRICE_ID, STRIPE_PRO_ANNUAL_PRICE_ID
- Fix lien CGU page register (href="/cgu" target="_blank")
- Fix DNS flowestate.fr (IP Ionos mise à jour vers 76.76.21.21)
- Données de démo complètes recréées :
  - 3 vendeurs : Catherine Bernier (Paris 7e, 1.15M), Laurent Favre (Paris 18e, 520k), Michel Rousseau (Paris 11e, 380k)
  - 3 acheteurs : Sophie Marchand (Paris 10e/11e, 420k), Thomas Girard (banlieue ouest, 680k), Nathalie Chen (Paris 6e/7e/8e, 950k)
  - 3 annonces générées (1 par vendeur)
  - Emails de relance générés pour chaque prospect
  - Comptes-rendus de visite générés pour les acheteurs
- Démarchage agences immobilières Le Havre commencé (20 mai 2026)

## ⏭️ Prochaine étape
- Itérer sur le produit selon les retours des démos agences
- Convertir les premières agences en clients payants
- Objectif : 3 agences payantes dans les 30 jours

## 🗂️ Stack technique
- Next.js + TypeScript
- GitHub : github.com/timal76/flowestate
- Hébergement : Vercel
- Domaine : flowestate.fr (Ionos)
- Auth : NextAuth.js v5 beta
- BDD : Supabase (PostgreSQL)
- Storage : Supabase Storage
- API : Anthropic Claude (claude-sonnet-4-5)
- Paiement : Stripe (test mode)
- Email : Resend
- PDF : html2canvas + jsPDF

## 📅 Roadmap post-MVP
### Phase 2
- Export statistiques dashboard

### Phase 3
- CRM léger, relances programmées, score annonce, multi-langue

### Phase 4
- Multi-agents, intégration SeLoger/LeBonCoin, app mobile

## 📅 Dernière mise à jour
- Dernière mise à jour : Session du 20 mai 2026
