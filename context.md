# FlowEstate - Contexte du Projet

## 🎯 Description
SaaS d'automatisation pour agents immobiliers.

## ✅ Fait
- Landing page complète avec essai gratuit 14 jours mis en avant
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
- Dashboard pro : stats dynamiques Supabase, activité récente 
  dynamique, bannière trial avec jours restants
- Historique des générations : filtres par type, recherche 
  par prospect, pagination
- Page Profil : photo, infos perso, logo agence, signature, 
  abonnement, stats globales, déconnexion, suppression compte
- Authentification réelle : NextAuth.js + Supabase + bcrypt
- Protection des routes : middleware Next.js
- Pages : login, register, forgot-password, 404, tarifs, profil
- Stripe intégré : checkout, plans Starter(30 gen)/Pro, 
  essai 14 jours, webhooks
- Limite 30 générations/mois pour Starter
- Table users : plan, subscription_status, trial_ends_at, 
  stripe_customer_id, stripe_subscription_id, avatar_url, 
  logo_url, signature_url, phone
- Supabase Storage : bucket profiles (photos, logos, signatures)
- Toutes variables d'environnement sur Vercel ✅ EN PRODUCTION

## ⏭️ Prochaine étape
- Page de contact / support
- Notifications email (trial qui expire, bienvenue)
- Tests et optimisations

## 🗂️ Stack technique
- Next.js + TypeScript
- GitHub : github.com/timal76/flowestate
- Hébergement : Vercel
- Auth : NextAuth.js v5 beta
- BDD : Supabase (PostgreSQL)
- Storage : Supabase Storage
- API : Anthropic Claude (claude-sonnet-4-5)
- Paiement : Stripe (test mode)
- PDF : html2canvas + jsPDF

## 📅 Roadmap post-MVP
### Phase 2
- Notifications email, page contact/support, optimisations

### Phase 3
- CRM léger, relances programmées, score annonce, multi-langue

### Phase 4
- Multi-agents, intégration SeLoger/LeBonCoin, app mobile

## 📅 Dernière mise à jour
- Session du 3 mai 2026
