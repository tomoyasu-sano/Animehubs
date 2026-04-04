import { Resend } from "resend";
import { getSubscribersWithEmail } from "@/lib/db/newsletter-queries";
import {
  createNewsletterSend,
  updateNewsletterSendResult,
  getRecentNonFailedSend,
} from "@/lib/db/newsletter-sends-queries";
import { getRecentProducts } from "@/lib/db/admin-queries";
import { generateUnsubscribeToken } from "@/lib/newsletter-token";
import {
  buildNewsletterEmailHtml,
  type NewsletterProduct,
} from "./newsletter-template";

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_EMAIL =
  process.env.RESEND_FROM_EMAIL || "AnimeHubs <newsletter@anime-hubs.com>";
const REPLY_TO_EMAIL = process.env.RESEND_REPLY_TO_EMAIL || "";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://animehubs.se";

const BATCH_SIZE = 100;
const BATCH_DELAY_MS = 500;

export interface SendNewsletterInput {
  subjectEn: string;
  subjectSv: string;
  bodyEn: string;
  bodySv: string;
  includeRecentProducts: boolean;
  recentProductsDays: number;
  testMode: boolean;
  adminEmail: string;
}

export interface SendNewsletterResult {
  success: boolean;
  sent: number;
  failed: number;
  error?: string;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseProducts(
  rawProducts: Array<{ id: string; nameEn: string; price: number; images: string }>,
): NewsletterProduct[] {
  return rawProducts.map((p) => {
    let imageUrl = "";
    try {
      const imgs = JSON.parse(p.images) as string[];
      if (imgs.length > 0) imageUrl = imgs[0];
    } catch {
      /* ignore */
    }
    return {
      nameEn: p.nameEn,
      price: p.price,
      imageUrl,
      productUrl: `${SITE_URL}/en/products/${p.id}`,
    };
  });
}

/**
 * ニュースレターを一斉送信する。
 */
export async function sendNewsletter(
  input: SendNewsletterInput,
): Promise<SendNewsletterResult> {
  // テストモード: 管理者自身にのみ送信
  if (input.testMode) {
    return sendTestEmail(input);
  }

  // 購読者取得
  const subscribers = await getSubscribersWithEmail();
  console.log(`Newsletter: ${subscribers.length} subscribers found`);
  if (subscribers.length === 0) {
    return { success: false, sent: 0, failed: 0, error: "No subscribers found." };
  }

  // 商品取得（オプション）
  let products: NewsletterProduct[] = [];
  if (input.includeRecentProducts) {
    const rawProducts = await getRecentProducts(input.recentProductsDays);
    products = parseProducts(rawProducts);
  }

  // 送信履歴作成
  const { id: sendId } = await createNewsletterSend({
    subjectEn: input.subjectEn,
    subjectSv: input.subjectSv,
    bodyEn: input.bodyEn,
    bodySv: input.bodySv,
    recipientCount: subscribers.length,
    sentBy: input.adminEmail,
  });

  // HMAC秘密鍵
  const hmacSecret = process.env.NEWSLETTER_HMAC_SECRET;
  if (!hmacSecret) {
    console.error("NEWSLETTER_HMAC_SECRET is not set");
    return { success: false, sent: 0, failed: 0, error: "Server configuration error." };
  }

  // メール生成（各購読者に固有の配信停止トークンを埋め込む）
  const emails = subscribers.map((s) => {
    const locale = s.locale === "en" ? "en" : "sv";
    const token = generateUnsubscribeToken(s.userId, hmacSecret);
    return {
      from: FROM_EMAIL,
      to: [s.email],
      ...(REPLY_TO_EMAIL ? { replyTo: REPLY_TO_EMAIL } : {}),
      subject: locale === "en" ? input.subjectEn : input.subjectSv,
      html: buildNewsletterEmailHtml({
        body: locale === "en" ? input.bodyEn : input.bodySv,
        unsubscribeUrl: `${SITE_URL}/${locale}/unsubscribe?token=${token}`,
        shopUrl: `${SITE_URL}/${locale}`,
        products,
      }),
    };
  });

  // バッチ送信
  let totalSent = 0;
  let totalFailed = 0;

  for (let i = 0; i < emails.length; i += BATCH_SIZE) {
    const batch = emails.slice(i, i + BATCH_SIZE);

    try {
      const response = await resend.batch.send(batch);

      if (response.error) {
        totalFailed += batch.length;
        console.error("Resend batch error:", response.error);
      } else {
        const sentInBatch = response.data?.data?.length ?? 0;
        const failedInBatch = batch.length - sentInBatch;
        totalSent += sentInBatch;
        totalFailed += failedInBatch;
      }
    } catch (error) {
      totalFailed += batch.length;
      console.error("Resend batch exception:", error);
    }

    // バッチ間待機（最後のバッチ以外）
    if (i + BATCH_SIZE < emails.length) {
      await sleep(BATCH_DELAY_MS);
    }
  }

  // ステータス判定
  const status =
    totalFailed === 0
      ? "completed"
      : totalSent === 0
        ? "failed"
        : "partial_failure";

  await updateNewsletterSendResult(sendId, {
    sentCount: totalSent,
    failedCount: totalFailed,
    status,
  });

  return {
    success: totalSent > 0,
    sent: totalSent,
    failed: totalFailed,
  };
}

async function sendTestEmail(
  input: SendNewsletterInput,
): Promise<SendNewsletterResult> {
  let products: NewsletterProduct[] = [];
  if (input.includeRecentProducts) {
    const rawProducts = await getRecentProducts(input.recentProductsDays);
    products = parseProducts(rawProducts);
  }

  const emails = [
    {
      from: FROM_EMAIL,
      to: [input.adminEmail],
      ...(REPLY_TO_EMAIL ? { replyTo: REPLY_TO_EMAIL } : {}),
      subject: `[TEST] ${input.subjectEn}`,
      html: buildNewsletterEmailHtml({
        body: input.bodyEn,
        unsubscribeUrl: `${SITE_URL}/en/unsubscribe?token=test`,
        shopUrl: `${SITE_URL}/en`,
        products,
      }),
    },
  ];

  try {
    const response = await resend.batch.send(emails);

    if (response.error) {
      return { success: false, sent: 0, failed: 1, error: response.error.message };
    }

    return { success: true, sent: 1, failed: 0 };
  } catch (error) {
    return {
      success: false,
      sent: 0,
      failed: 1,
      error: error instanceof Error ? error.message : "Failed to send test email",
    };
  }
}
