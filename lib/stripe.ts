import Stripe from "stripe";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  // @ts-expect-error stripe v22 : LatestApiVersion typé différemment de la chaîne projet.
  apiVersion: "2024-06-20",
});
