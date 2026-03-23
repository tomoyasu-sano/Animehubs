import { initializeDatabase, getDb, schema } from "./index";
import { v4 as uuidv4 } from "uuid";
import bcrypt from "bcryptjs";

// シードデータ: サンプル商品
const sampleProducts = [
  {
    id: uuidv4(),
    nameEn: "Rem - Re:Zero Starting Life in Another World",
    nameSv: "Rem - Re:Zero Starting Life in Another World",
    descriptionEn:
      "1/7 scale figure of Rem from Re:Zero. Beautiful detailed sculpt with flowing blue hair and maid outfit. Comes with original box and stand.",
    descriptionSv:
      "1/7 skalfigur av Rem fran Re:Zero. Vackert detaljerad skulptur med flodande blatt har och hembitradeskladsel. Levereras med originallada och stativ.",
    price: 189900, // 1899 SEK
    stock: 1,
    category: "scale-figures",
    condition: "like_new",
    images: JSON.stringify(["/placeholder/figure-1.svg"]),
    featured: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: uuidv4(),
    nameEn: "Nendoroid Miku Hatsune",
    nameSv: "Nendoroid Miku Hatsune",
    descriptionEn:
      "Classic Nendoroid of Hatsune Miku with multiple face plates and accessories. Includes microphone, leek, and special pose parts.",
    descriptionSv:
      "Klassisk Nendoroid av Hatsune Miku med flera ansiktsplattor och tillbehor. Inkluderar mikrofon, purjolok och specialposedetaljer.",
    price: 59900, // 599 SEK
    stock: 2,
    category: "nendoroid",
    condition: "new",
    images: JSON.stringify(["/placeholder/figure-2.svg"]),
    featured: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: uuidv4(),
    nameEn: "Levi Ackerman - Attack on Titan figma",
    nameSv: "Levi Ackerman - Attack on Titan figma",
    descriptionEn:
      "Highly poseable figma action figure of Captain Levi with ODM gear, dual blades, and multiple hand parts. Perfect for dynamic poses.",
    descriptionSv:
      "Mycket roerlig figma-actionfigur av Kapten Levi med ODM-utrustning, dubbla klingor och flera handdetaljer. Perfekt for dynamiska poser.",
    price: 79900, // 799 SEK
    stock: 1,
    category: "figma",
    condition: "good",
    images: JSON.stringify(["/placeholder/figure-3.svg"]),
    featured: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: uuidv4(),
    nameEn: "Gojo Satoru - Jujutsu Kaisen Prize Figure",
    nameSv: "Gojo Satoru - Jujutsu Kaisen Prisfigur",
    descriptionEn:
      "Banpresto prize figure of Gojo Satoru in his iconic blindfold pose. Great quality for the price, approximately 18cm tall.",
    descriptionSv:
      "Banpresto prisfigur av Gojo Satoru i hans ikoniska ogonbindelspose. Bra kvalitet for priset, cirka 18 cm hog.",
    price: 34900, // 349 SEK
    stock: 3,
    category: "prize-figures",
    condition: "new",
    images: JSON.stringify(["/placeholder/figure-4.svg"]),
    featured: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: uuidv4(),
    nameEn: "Evangelion Unit-01 Garage Kit",
    nameSv: "Evangelion Unit-01 Garage Kit",
    descriptionEn:
      "Unpainted resin garage kit of Evangelion Unit-01 in action pose. Requires assembly and painting. For experienced modelers.",
    descriptionSv:
      "Omalat hartsgaragetbyggsats av Evangelion Unit-01 i aktionspose. Kraver montering och malning. For erfarna modellerare.",
    price: 249900, // 2499 SEK
    stock: 1,
    category: "garage-kits",
    condition: "new",
    images: JSON.stringify(["/placeholder/figure-5.svg"]),
    featured: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: uuidv4(),
    nameEn: "Naruto Uzumaki - Sage Mode Figure",
    nameSv: "Naruto Uzumaki - Sage Mode Figur",
    descriptionEn:
      "Detailed figure of Naruto in Sage Mode with Rasengan effect part. Approx. 25cm tall, excellent paint detail.",
    descriptionSv:
      "Detaljerad figur av Naruto i Sage Mode med Rasengan-effektdel. Ca 25 cm hog, utmarkt malndetalj.",
    price: 129900, // 1299 SEK
    stock: 2,
    category: "figures",
    condition: "like_new",
    images: JSON.stringify(["/placeholder/figure-6.svg"]),
    featured: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: uuidv4(),
    nameEn: "Asuka Langley - Evangelion 1/6 Scale",
    nameSv: "Asuka Langley - Evangelion 1/6 Skala",
    descriptionEn:
      "Premium 1/6 scale figure of Asuka Langley in plugsuit. High quality PVC with intricate detail work. Display base included.",
    descriptionSv:
      "Premium 1/6 skalfigur av Asuka Langley i plugsuit. Hog kvalitet PVC med intrikat detaljarbete. Displaybas inkluderad.",
    price: 299900, // 2999 SEK
    stock: 1,
    category: "scale-figures",
    condition: "new",
    images: JSON.stringify(["/placeholder/figure-7.svg"]),
    featured: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: uuidv4(),
    nameEn: "Dragon Ball Z Goku Figure Set",
    nameSv: "Dragon Ball Z Goku Figurset",
    descriptionEn:
      "Set of 3 prize figures showing Goku's transformations: Base, Super Saiyan, and Super Saiyan Blue. Each approx. 15cm.",
    descriptionSv:
      "Set med 3 prisfigurer som visar Gokus transformationer: Bas, Super Saiyan och Super Saiyan Blue. Varje ca 15 cm.",
    price: 44900, // 449 SEK
    stock: 2,
    category: "prize-figures",
    condition: "good",
    images: JSON.stringify(["/placeholder/figure-8.svg"]),
    featured: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

async function seed() {
  console.log("Initializing database...");
  initializeDatabase();

  const db = getDb();

  // 既存データを削除
  console.log("Clearing existing data...");
  db.delete(schema.products).run();
  db.delete(schema.adminUsers).run();

  // 商品データを挿入
  console.log("Seeding products...");
  for (const product of sampleProducts) {
    db.insert(schema.products).values(product).run();
  }

  // 管理者データを挿入（bcrypt ハッシュで保存）
  console.log("Seeding admin users...");
  const adminData = [
    {
      id: uuidv4(),
      username: "admin1",
      passwordHash: bcrypt.hashSync("admin1pass", 10),
      createdAt: new Date().toISOString(),
    },
    {
      id: uuidv4(),
      username: "admin2",
      passwordHash: bcrypt.hashSync("admin2pass", 10),
      createdAt: new Date().toISOString(),
    },
  ];

  for (const admin of adminData) {
    db.insert(schema.adminUsers).values(admin).run();
  }

  console.log("Seed completed successfully!");
  console.log(`  - ${sampleProducts.length} products created`);
  console.log(`  - ${adminData.length} admin users created`);

  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
