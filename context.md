# FlowEstate - Contexte du Projet

## 🎯 Description
SaaS d'automatisation pour agents immobiliers.

## ✅ Fait
- Landing page complète avec tous les boutons connectés
- Navigation : header avec Dashboard, Annonces, Emails, 
  Comptes-rendus, Accueil, Connexion/Prénom+Déconnexion
- Menu hamburger responsive sur mobile (toutes les pages)
- Générateur d'annonces : formulaire complet, upload 5 photos, 
  longueur, ton (toggle), API Claude Sonnet, Markdown, copier
- Emails de relance : formulaire complet, signature dynamique, 
  ton (toggle), API Claude, copier
- Compte-rendu de visite : formulaire complet, upload logo + 
  signature, PDF, ton (toggle), API Claude, copier
- Dashboard pro : stats dynamiques Supabase, accès rapide, 
  activité récente, conseil du jour
- Authentification réelle : NextAuth.js + Supabase + bcrypt
- Protection des routes : middleware Next.js
- Pages : login, register, forgot-password, 404 custom
- Stats dashboard dynamiques par utilisateur (table generations)
- Prompt Claude optimisé sur les 3 outils
- Clé API Anthropic + variables Supabase + NextAuth sur Vercel
- SSH configuré, GitHub connecté, Vercel déployé ✅ EN PRODUCTION

## ⏭️ Prochaine étape
- Activité récente dynamique (table generations)
- Historique des générations par outil
- Optimisation prompt emails et comptes-rendus

## 🗂️ Stack technique
- Next.js + TypeScript
- GitHub : github.com/timal76/flowestate
- Hébergement : Vercel
- Auth : NextAuth.js v5 beta
- BDD : Supabase (PostgreSQL)
- API : Anthropic Claude (claude-sonnet-4-5)
- PDF : html2canvas + jsPDF

## 📅 Roadmap post-MVP
### Phase 2
- Activité récente dynamique, historique, templates, export PDF

### Phase 3
- CRM léger, relances programmées, score annonce, multi-langue

### Phase 4
- Multi-agents, intégration SeLoger/LeBonCoin, app mobile

## 📅 Dernière mise à jour
- Session du 2 mai 2026
