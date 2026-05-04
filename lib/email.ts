import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendWelcomeEmail(to: string, firstName: string) {
  await resend.emails.send({
    from: "FlowEstate <contact@flowestate.fr>",
    to,
    subject: "Bienvenue sur FlowEstate ! 🏠",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0a0a0a; color: #f5f5f0; padding: 40px; border-radius: 12px;">
        <h1 style="color: #C9A96E; font-size: 28px; margin-bottom: 8px;">FlowEstate</h1>
        <p style="color: #a0a0a0; font-size: 14px; margin-bottom: 32px;">Moins de tâches. Plus de ventes.</p>
        
        <h2 style="color: #f5f5f0; font-size: 22px;">Bienvenue, ${firstName} ! 👋</h2>
        <p style="color: #a0a0a0; line-height: 1.6;">
          Votre compte FlowEstate est créé. Vous bénéficiez de <strong style="color: #C9A96E;">14 jours d'essai gratuit</strong> pour découvrir tous nos outils.
        </p>
        
        <div style="margin: 32px 0;">
          <p style="color: #f5f5f0; font-weight: bold; margin-bottom: 12px;">Ce que vous pouvez faire dès maintenant :</p>
          <ul style="color: #a0a0a0; line-height: 2;">
            <li>🏠 Générer des annonces immobilières en quelques secondes</li>
            <li>📧 Rédiger des emails de relance personnalisés</li>
            <li>📋 Créer des comptes-rendus de visite professionnels</li>
          </ul>
        </div>
        
        <a href="${process.env.NEXTAUTH_URL}/dashboard" 
           style="display: inline-block; background: #C9A96E; color: #0a0a0a; padding: 14px 28px; border-radius: 50px; text-decoration: none; font-weight: bold; font-size: 15px;">
          Accéder à mon espace →
        </a>
        
        <p style="color: #a0a0a0; font-size: 12px; margin-top: 40px; border-top: 1px solid #222; padding-top: 20px;">
          FlowEstate — L'IA au service des agents immobiliers
        </p>
      </div>
    `,
  });
}

export async function sendTrialEndingEmail(to: string, firstName: string, daysLeft: number) {
  await resend.emails.send({
    from: "FlowEstate <contact@flowestate.fr>",
    to,
    subject: `Votre essai gratuit se termine dans ${daysLeft} jours`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0a0a0a; color: #f5f5f0; padding: 40px; border-radius: 12px;">
        <h1 style="color: #C9A96E; font-size: 28px; margin-bottom: 8px;">FlowEstate</h1>
        <p style="color: #a0a0a0; font-size: 14px; margin-bottom: 32px;">Moins de tâches. Plus de ventes.</p>
        
        <h2 style="color: #f5f5f0; font-size: 22px;">Plus que ${daysLeft} jours d'essai, ${firstName} !</h2>
        <p style="color: #a0a0a0; line-height: 1.6;">
          Votre période d'essai gratuit se termine bientôt. Pour continuer à utiliser FlowEstate sans interruption, votre abonnement sera activé automatiquement.
        </p>
        
        <div style="background: #1a1a1a; border: 1px solid #C9A96E33; border-radius: 12px; padding: 24px; margin: 24px 0;">
          <p style="color: #C9A96E; font-weight: bold; margin: 0 0 8px 0;">Votre plan actuel</p>
          <p style="color: #f5f5f0; font-size: 24px; font-weight: bold; margin: 0;">Starter — 49€/mois</p>
          <p style="color: #a0a0a0; font-size: 14px; margin: 8px 0 0 0;">30 générations/mois · 1 utilisateur</p>
        </div>
        
        <a href="${process.env.NEXTAUTH_URL}/tarifs" 
           style="display: inline-block; background: #C9A96E; color: #0a0a0a; padding: 14px 28px; border-radius: 50px; text-decoration: none; font-weight: bold; font-size: 15px;">
          Passer au Pro →
        </a>
        
        <p style="color: #a0a0a0; font-size: 12px; margin-top: 40px; border-top: 1px solid #222; padding-top: 20px;">
          FlowEstate — L'IA au service des agents immobiliers
        </p>
      </div>
    `,
  });
}
