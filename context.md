# FlowEstate - Contexte du Projet

## 🎯 Description
SaaS d'automatisation pour agents immobiliers.

## ✅ Fait
- Landing page complète avec tous les boutons connectés
- Navigation : header avec Dashboard, Annonces, Emails, 
  Comptes-rendus, Accueil, Connexion
- Menu hamburger responsive sur mobile (toutes les pages)
- Générateur d'annonces : formulaire complet, upload 5 photos, 
  longueur, ton, API Claude Sonnet, Markdown, copier
- Emails de relance : formulaire complet, signature, API Claude, copier
- Compte-rendu de visite : formulaire complet, PDF, API Claude, copier
- Dashboard pro : stats, accès rapide, activité récente, conseil du jour
- Page login /login
- Page register /register
- Page mot de passe oublié /forgot-password
- Page 404 custom
- Prompt Claude optimisé (sonnet-4-5, system prompt amélioré)
- SSH configuré, GitHub connecté, Vercel déployé

## ⏭️ Prochaine étape
- Authentification réelle (NextAuth.js)
- Base de données
- Clé API sur Vercel
- Optimisation prompt emails et comptes-rendus

## 🗂️ Stack technique
- Next.js + TypeScript
- GitHub : github.com/timal76/flowestate
- Hébergement : Vercel
- API : Anthropic Claude (claude-sonnet-4-5)
- PDF : html2canvas + jsPDF

## 📅 Roadmap post-MVP
### Phase 2
- Auth réelle, BDD, historique, templates, export PDF, stats

### Phase 3
- CRM léger, relances programmées, score annonce, multi-langue

### Phase 4
- Multi-agents, intégration SeLoger/LeBonCoin, app mobile

## 📅 Dernière mise à jour
- Session du 1er mai 2026
