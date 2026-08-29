// @vercel/og はこのアプリでは未使用（OG画像は静的PNG）。
// Worker サイズ削減のため wrangler.toml の [alias] でこのスタブに差し替えている。
// 誤って ImageResponse を使うとビルドは通るが実行時にこのエラーで落ちる。
export class ImageResponse {
  constructor() {
    throw new Error(
      "@vercel/og is excluded from the Worker bundle (see wrangler.toml [alias]). Use a static OG image instead.",
    );
  }
}
export default { ImageResponse };
