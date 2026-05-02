# FlowEstate - Contexte du Projet

## 🎯 Description
SaaS d'automatisation pour agents immobiliers.

## ✅ Fait
- Landing page complète avec essai gratuit 14 jours mis en avant
- Navigation : Dashboard, Historique, Annonces, Emails, 
  Comptes-rendus, Accueil, Prénom+Déconnexion
- Menu hamburger responsive sur mobile (toutes les pages)
- Générateur d'annonces : formulaire complet, upload 5 photos, 
  longueur, ton (toggle), API Claude Sonnet, Markdown, copier
- Emails de relance : formulaire complet, signature dynamique, 
  ton (toggle), API Claude, copier
- Compte-rendu de visite : formulaire complet, upload logo + 
  signature, PDF, ton (toggle), API Claude, copier
- 5 générations gratuites sans inscription (localStorage)
- Dashboard pro : stats dynamiques Supabase, activité récente 
  dynamique, bannière trial, bannière succès abonnement
- Historique des générations : filtres par type, recherche 
  par prospect, pagination
- Authentification réelle : NextAuth.js + Supabase + bcrypt
- Protection des routes : middleware Next.js
- Pages : login, register, forgot-password, 404, tarifs
- Stats dashboard dynamiques par utilisateur (table generations)
- Prompt Claude optimisé sur les 3 outils
- Stripe intégré : checkout, plans Starter/Pro, essai 14 jours
- Table users : plan, subscription_status, trial_ends_at, 
  stripe_customer_id, stripe_subscription_id
- Clé API Anthropic + Supabase + NextAuth + Stripe sur Vercel
- SSH configuré, GitHub connecté, Vercel déployé ✅ EN PRODUCTION

## ⏭️ Prochaine étape
- Webhooks Stripe (tracker abonnements actifs/annulés)
- Limiter les générations selon le plan (50/mois Starter)
- Page profil agent
- Ajouter variables Stripe sur Vercel

## 🗂️ Stack technique
- Next.js + TypeScript
- GitHub : github.com/timal76/flowestate
- Hébergement : Vercel
- Auth : NextAuth.js v5 beta
- BDD : Supabase (PostgreSQL)
- API : Anthropic Claude (claude-sonnet-4-5)
- Paiement : Stripe (test mode)
- PDF : html2canvas + jsPDF

## 📅 Roadmap post-MVP
### Phase 2
- Webhooks Stripe, limites générations, page profil, 
  historique complet

### Phase 3
- CRM léger, relances programmées, score annonce, multi-langue

### Phase 4
- Multi-agents, intégration SeLoger/LeBonCoin, app mobile

## 📅 Dernière mise à jour
- Session du 2 mai 2026
