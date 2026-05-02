# FlowEstate - Contexte du Projet

## 🎯 Description
SaaS d'automatisation pour agents immobiliers.

## ✅ Fait
- Landing page complète avec essai gratuit 14 jours mis en avant
- Navigation complète : Dashboard, Historique, Annonces, Emails, 
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
- Stripe intégré : checkout, plans Starter/Pro, essai 14 jours
- Webhooks Stripe : subscription created/updated/deleted, 
  checkout completed
- Table users : plan, subscription_status, trial_ends_at, 
  stripe_customer_id, stripe_subscription_id
- Homebrew + Stripe CLI installés
- Toutes les variables d'environnement sur Vercel

## ⏭️ Prochaine étape
- Tester les webhooks Stripe en local
- Limiter les générations selon le plan (50/mois Starter)
- Page profil agent
- Ajouter variables Stripe sur Vercel

## 🗂️ Stack technique
- Next.js + TypeScript
- GitHub : github.com/timal76/flowestate
- Hébergement : Vercel
- Auth : NextAuth.js v5 beta
- BDD : Supabase (PostgreSQL)
- API : Anthropic
