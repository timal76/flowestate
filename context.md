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
- Dashboard pro : stats dynamiques, activité récente dynamique, 
  bannière trial avec jours restants, compteur générations restantes
- Historique des générations : filtres par type, recherche 
  par prospect, pagination
- Page Profil : photo, infos perso, logo agence, signature, 
  abonnement, stats globales, portail Stripe, déconnexion
- Notifications email (Resend) : email bienvenue à l'inscription + 
  email rappel trial qui expire dans 3 jours
- Authentification réelle : NextAuth.js + Supabase + bcrypt
- Protection des routes : middleware Next.js
- Pages : login, register, forgot-password, 404, tarifs, profil
- Stripe intégré : checkout, plans Starter(30 gen)/Pro(2 users), 
  essai 14 jours, webhooks, portail client
- Limite 30 générations/mois pour Starter
- Barre de progression générations dans les 3 outils
- Supabase Storage : bucket profiles (photos, logos, signatures)
- Toutes variables d'environnement sur Vercel ✅ EN PRODUCTION

## ⏭️ Prochaine étape
- Vérifier un domaine sur Resend pour envoyer à tous les emails
- Page contact/support
- Animations landing page
- Ajouter RESEND_API_KEY sur Vercel

## 🗂️ Stack technique
- Next.js + TypeScript
- GitHub : github.com/timal76/flowestate
- Hébergement : Vercel
- Auth : NextAuth.js v5 beta
- BDD : Supabase (PostgreSQL)
- Storage : Supabase Storage
- API : Anthropic Claude (claude-sonnet-4-5)
- Paiement : Stripe (test mode)
- Email : Resend
- PDF : html2canvas + jsPDF

## 📅 Roadmap post-MVP
### Phase 2
- Domaine vérifié Resend, page contact, animations

### Phase 3
- CRM léger, relances programmées, score annonce, multi-langue

### Phase 4
- Multi-agents, intégration SeLoger/LeBonCoin, app mobile

## 📅 Dernière mise à jour
- Session du 3 mai 2026
