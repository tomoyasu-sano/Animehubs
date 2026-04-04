function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatPrice(amountInOre: number): string {
  return `${(amountInOre / 100).toLocaleString("sv-SE")} SEK`;
}

export interface NewsletterProduct {
  nameEn: string;
  price: number;
  imageUrl: string;
  productUrl: string;
}

export interface NewsletterEmailInput {
  body: string;
  unsubscribeUrl: string;
  shopUrl: string;
  products?: NewsletterProduct[];
}

function buildProductsHtml(products: NewsletterProduct[]): string {
  if (products.length === 0) return "";

  const rows = products
    .map(
      (p) => `<tr>
        <td style="padding: 12px 0; border-bottom: 1px solid #e5e5e5; width: 80px; vertical-align: top;">
          <a href="${escapeHtml(p.productUrl)}" style="text-decoration: none;">
            <img src="${escapeHtml(p.imageUrl)}" alt="${escapeHtml(p.nameEn)}" width="64" height="64" style="border-radius: 8px; object-fit: cover; display: block;" />
          </a>
        </td>
        <td style="padding: 12px 8px; border-bottom: 1px solid #e5e5e5; vertical-align: top;">
          <a href="${escapeHtml(p.productUrl)}" style="color: #171717; text-decoration: none; font-size: 14px; font-weight: 600;">${escapeHtml(p.nameEn)}</a>
        </td>
        <td style="padding: 12px 0; border-bottom: 1px solid #e5e5e5; text-align: right; vertical-align: top; white-space: nowrap;">
          <span style="font-size: 14px; font-weight: 600; color: #171717;">${formatPrice(p.price)}</span>
        </td>
      </tr>`,
    )
    .join("");

  return `
    <div style="margin-top: 32px;">
      <h3 style="color: #171717; margin: 0 0 16px; font-size: 18px; text-align: center; border-bottom: 2px solid #e5e5e5; padding-bottom: 12px;">New Arrivals</h3>
      <table style="width: 100%; border-collapse: collapse;">
        ${rows}
      </table>
    </div>`;
}

/**
 * ニュースレターのHTMLメールを生成する。
 * 既存の send-order-email.ts と同じインラインHTMLパターンを使用。
 */
export function buildNewsletterEmailHtml(input: NewsletterEmailInput): string {
  const { body, unsubscribeUrl, shopUrl, products } = input;

  const productsHtml =
    products && products.length > 0 ? buildProductsHtml(products) : "";

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #fafafa;">
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <div style="background-color: #0a0a0a; padding: 24px; text-align: center; border-radius: 12px 12px 0 0;">
      <h1 style="color: #ffffff; margin: 0; font-size: 24px;">AnimeHubs</h1>
    </div>
    <div style="background-color: #ffffff; padding: 32px 24px; border: 1px solid #e5e5e5; border-top: none; border-radius: 0 0 12px 12px;">
      <p style="color: #404040; font-size: 15px; line-height: 1.6; margin: 0 0 24px; white-space: pre-line;">${escapeHtml(body)}</p>

      ${productsHtml}

      <div style="text-align: center; margin-top: 32px;">
        <a href="${escapeHtml(shopUrl)}" style="display: inline-block; background-color: #171717; color: #ffffff; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-size: 15px; font-weight: 600;">Shop Now</a>
      </div>

      <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e5e5; text-align: center;">
        <p style="color: #9ca3af; font-size: 12px; margin: 0 0 8px;">AnimeHubs — Uppsala, Sweden</p>
        <a href="${escapeHtml(unsubscribeUrl)}" style="color: #9ca3af; font-size: 12px; text-decoration: underline;">Unsubscribe</a>
      </div>
    </div>
  </div>
</body>
</html>`;
}
