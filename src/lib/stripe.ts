import Stripe from "stripe";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("STRIPE_SECRET_KEY is not set");
}

// Cloudflare Workers では Node.js の https モジュールが使えないため
// fetch ベースの HTTP クライアントを使用
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2026-03-25.dahlia",
  typescript: true,
  httpClient: Stripe.createFetchHttpClient(),
});
