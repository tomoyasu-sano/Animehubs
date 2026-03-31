// D1移行後のシードは src/lib/db/seed.sql + wrangler CLI で実行
// npm run db:seed:cf
//
// ローカルD1への投入:
//   npx wrangler d1 execute animehubs-db --file=./src/lib/db/seed.sql --local
// リモートD1への投入:
//   npx wrangler d1 execute animehubs-db --file=./src/lib/db/seed.sql --remote

export {};
