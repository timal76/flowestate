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
- Animations landing page (Intersection Observer)
- SEO meta tags sur toutes les pages
- SEO meta tags corrigés (flowestate.fr au lieu de localhost)
- Modale visiteur : s'affiche à la première visite via localStorage (flowestate_visited)
- Modale onboarding : s'affiche à la première connexion (4 étapes : profil, outils, fonctionnement, c'est parti) — onboarding_completed en base Supabase
- Suppression de toutes les mentions "IA" dans le projet → remplacé par "automatisation"
- Templates sauvegardés : table Supabase, API CRUD complète, modale save/load, page /templates, intégration boutons dans annonces/emails/comptes-rendus
- Authentification réelle : NextAuth.js + Supabase + bcrypt
- Protection des routes : middleware Next.js
- Stripe : checkout, plans Starter(30 gen)/Pro(2 users), 
  essai 14 jours, webhooks local + production, portail client
- Limite 30 générations/mois pour Starter
- Domaine flowestate.fr connecté à Vercel ✅
- Resend domaine flowestate.fr vérifié ✅
- SUPABASE_SERVICE_ROLE_KEY ajouté sur Vercel et .env.local ✅
- Toutes variables d'environnement sur Vercel ✅ EN PRODUCTION
- Score annonce automatique /10 basé sur 7 critères objectifs (longueur, type de bien, surface, localisation, prix, accroche, appel à l'action)
- Retry automatique API Claude en cas d'erreur overloaded (1 retry après 2 secondes)
- CRM prospects amélioré : badge température chaud/tiède/froid, formatage budget "400 000 €"
- Envoi d'emails via SMTP : configuration dans le profil, guide Gmail/Outlook, envoi direct depuis la page Emails
- Relances programmées avec envoi automatique via Vercel Cron (toutes les minutes en prod)
- Fix fuseau horaire Europe/Paris pour l'affichage des dates de relances ✅

## ⏭️ Prochaine étape
- Passer Stripe en mode live avant le lancement
- Créer des données de démo réalistes pour les démarchages (prospects, annonces, emails fictifs mais réalistes)
- Score annonce : vérifier l'affichage après génération
- Tester le cron relances en prod
- OAuth Gmail pour simplifier la connexion email (v2)
- Intégration copier pour SeLoger/LeBonCoin (formatage adapté)

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
- Dernière mise à jour : Session du 7 mai 2026
