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
- Authentification réelle : NextAuth.js + Supabase + bcrypt
- Protection des routes : middleware Next.js
- Stripe : checkout, plans Starter(30 gen)/Pro(2 users), 
  essai 14 jours, webhooks local + production, portail client
- Limite 30 générations/mois pour Starter
- Domaine flowestate.fr connecté à Vercel ✅
- Resend domaine en attente de vérification DNS
- Toutes variables d'environnement sur Vercel ✅ EN PRODUCTION

## ⏭️ Prochaine étape
- Vérifier domaine Resend (attendre propagation DNS)
- Onboarding nouveaux utilisateurs
- Templates sauvegardés
- Export statistiques

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
- Onboarding, templates sauvegardés, export stats

### Phase 3
- CRM léger, relances programmées, score annonce, multi-langue

### Phase 4
- Multi-agents, intégration SeLoger/LeBonCoin, app mobile

## 📅 Dernière mise à jour
- Session du 4 mai 2026
