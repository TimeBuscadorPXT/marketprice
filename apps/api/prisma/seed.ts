import "dotenv/config";
import pg from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter } as ConstructorParameters<typeof PrismaClient>[0]);

interface PhoneModelSeed {
  brand: string;
  name: string;
  storages: string[];
  aliases: (storage: string) => string[];
}

const phoneModels: PhoneModelSeed[] = [
  // === Apple iPhones ===
  {
    brand: "Apple",
    name: "iPhone 13",
    storages: ["128GB", "256GB", "512GB"],
    aliases: (s) => [`ip 13 ${s}`, `iphone13 ${s}`, `ip13 ${s}`, `i13 ${s}`],
  },
  {
    brand: "Apple",
    name: "iPhone 13 Pro",
    storages: ["128GB", "256GB", "512GB", "1TB"],
    aliases: (s) => [`ip 13 pro ${s}`, `ip13p ${s}`, `iphone 13 pro ${s}`, `13 pro ${s}`],
  },
  {
    brand: "Apple",
    name: "iPhone 13 Pro Max",
    storages: ["128GB", "256GB", "512GB", "1TB"],
    aliases: (s) => [`ip 13 pm ${s}`, `ip13pm ${s}`, `iphone 13 pro max ${s}`, `13 pro max ${s}`, `13pm ${s}`],
  },
  {
    brand: "Apple",
    name: "iPhone 14",
    storages: ["128GB", "256GB", "512GB"],
    aliases: (s) => [`ip 14 ${s}`, `iphone14 ${s}`, `ip14 ${s}`, `i14 ${s}`],
  },
  {
    brand: "Apple",
    name: "iPhone 14 Plus",
    storages: ["128GB", "256GB", "512GB"],
    aliases: (s) => [`ip 14 plus ${s}`, `ip14+ ${s}`, `iphone 14 plus ${s}`, `14 plus ${s}`, `14+ ${s}`],
  },
  {
    brand: "Apple",
    name: "iPhone 14 Pro",
    storages: ["128GB", "256GB", "512GB", "1TB"],
    aliases: (s) => [`ip 14 pro ${s}`, `ip14p ${s}`, `iphone 14 pro ${s}`, `14 pro ${s}`],
  },
  {
    brand: "Apple",
    name: "iPhone 14 Pro Max",
    storages: ["128GB", "256GB", "512GB", "1TB"],
    aliases: (s) => [`ip 14 pm ${s}`, `ip14pm ${s}`, `iphone 14 pro max ${s}`, `14 pro max ${s}`, `14pm ${s}`],
  },
  {
    brand: "Apple",
    name: "iPhone 15",
    storages: ["128GB", "256GB", "512GB"],
    aliases: (s) => [`ip 15 ${s}`, `iphone15 ${s}`, `ip15 ${s}`, `i15 ${s}`],
  },
  {
    brand: "Apple",
    name: "iPhone 15 Plus",
    storages: ["128GB", "256GB", "512GB"],
    aliases: (s) => [`ip 15 plus ${s}`, `ip15+ ${s}`, `iphone 15 plus ${s}`, `15 plus ${s}`, `15+ ${s}`],
  },
  {
    brand: "Apple",
    name: "iPhone 15 Pro",
    storages: ["128GB", "256GB", "512GB", "1TB"],
    aliases: (s) => [`ip 15 pro ${s}`, `ip15p ${s}`, `iphone 15 pro ${s}`, `15 pro ${s}`],
  },
  {
    brand: "Apple",
    name: "iPhone 15 Pro Max",
    storages: ["256GB", "512GB", "1TB"],
    aliases: (s) => [`ip 15 pm ${s}`, `ip15pm ${s}`, `iphone 15 pro max ${s}`, `15 pro max ${s}`, `15pm ${s}`],
  },
  {
    brand: "Apple",
    name: "iPhone 16",
    storages: ["128GB", "256GB", "512GB"],
    aliases: (s) => [`ip 16 ${s}`, `iphone16 ${s}`, `ip16 ${s}`, `i16 ${s}`],
  },
  {
    brand: "Apple",
    name: "iPhone 16 Plus",
    storages: ["128GB", "256GB", "512GB"],
    aliases: (s) => [`ip 16 plus ${s}`, `ip16+ ${s}`, `iphone 16 plus ${s}`, `16 plus ${s}`, `16+ ${s}`],
  },
  {
    brand: "Apple",
    name: "iPhone 16 Pro",
    storages: ["128GB", "256GB", "512GB", "1TB"],
    aliases: (s) => [`ip 16 pro ${s}`, `ip16p ${s}`, `iphone 16 pro ${s}`, `16 pro ${s}`],
  },
  {
    brand: "Apple",
    name: "iPhone 16 Pro Max",
    storages: ["256GB", "512GB", "1TB"],
    aliases: (s) => [`ip 16 pm ${s}`, `ip16pm ${s}`, `iphone 16 pro max ${s}`, `16 pro max ${s}`, `16pm ${s}`],
  },

  // === Samsung ===
  {
    brand: "Samsung",
    name: "Galaxy S23",
    storages: ["128GB", "256GB"],
    aliases: (s) => [`s23 ${s}`, `galaxy s23 ${s}`, `samsung s23 ${s}`],
  },
  {
    brand: "Samsung",
    name: "Galaxy S23+",
    storages: ["256GB", "512GB"],
    aliases: (s) => [`s23+ ${s}`, `s23 plus ${s}`, `galaxy s23+ ${s}`, `samsung s23 plus ${s}`],
  },
  {
    brand: "Samsung",
    name: "Galaxy S23 Ultra",
    storages: ["256GB", "512GB", "1TB"],
    aliases: (s) => [`s23 ultra ${s}`, `s23u ${s}`, `galaxy s23 ultra ${s}`, `samsung s23 ultra ${s}`],
  },
  {
    brand: "Samsung",
    name: "Galaxy S24",
    storages: ["128GB", "256GB"],
    aliases: (s) => [`s24 ${s}`, `galaxy s24 ${s}`, `samsung s24 ${s}`],
  },
  {
    brand: "Samsung",
    name: "Galaxy S24+",
    storages: ["256GB", "512GB"],
    aliases: (s) => [`s24+ ${s}`, `s24 plus ${s}`, `galaxy s24+ ${s}`, `samsung s24 plus ${s}`],
  },
  {
    brand: "Samsung",
    name: "Galaxy S24 Ultra",
    storages: ["256GB", "512GB", "1TB"],
    aliases: (s) => [`s24 ultra ${s}`, `s24u ${s}`, `galaxy s24 ultra ${s}`, `samsung s24 ultra ${s}`],
  },
  {
    brand: "Samsung",
    name: "Galaxy A54",
    storages: ["128GB", "256GB"],
    aliases: (s) => [`a54 ${s}`, `galaxy a54 ${s}`, `samsung a54 ${s}`],
  },
  {
    brand: "Samsung",
    name: "Galaxy A55",
    storages: ["128GB", "256GB"],
    aliases: (s) => [`a55 ${s}`, `galaxy a55 ${s}`, `samsung a55 ${s}`],
  },

  // === Xiaomi ===
  {
    brand: "Xiaomi",
    name: "Redmi Note 12",
    storages: ["128GB", "256GB"],
    aliases: (s) => [`rn12 ${s}`, `redmi note 12 ${s}`, `note 12 ${s}`, `xiaomi note 12 ${s}`],
  },
  {
    brand: "Xiaomi",
    name: "Redmi Note 13",
    storages: ["128GB", "256GB"],
    aliases: (s) => [`rn13 ${s}`, `redmi note 13 ${s}`, `note 13 ${s}`, `xiaomi note 13 ${s}`],
  },
  {
    brand: "Xiaomi",
    name: "Poco X5",
    storages: ["128GB", "256GB"],
    aliases: (s) => [`poco x5 ${s}`, `pocox5 ${s}`, `xiaomi poco x5 ${s}`],
  },
  {
    brand: "Xiaomi",
    name: "Poco X6 Pro",
    storages: ["128GB", "256GB", "512GB"],
    aliases: (s) => [`poco x6 pro ${s}`, `pocox6p ${s}`, `x6 pro ${s}`, `xiaomi poco x6 pro ${s}`],
  },
];

async function main() {
  console.log("Seeding phone_models...");

  let created = 0;
  let skipped = 0;

  for (const phone of phoneModels) {
    for (const storage of phone.storages) {
      const aliases = phone.aliases(storage);

      const existing = await prisma.phoneModel.findUnique({
        where: {
          brand_name_storage: {
            brand: phone.brand,
            name: phone.name,
            storage,
          },
        },
      });

      if (existing) {
        skipped++;
        continue;
      }

      await prisma.phoneModel.create({
        data: {
          brand: phone.brand,
          name: phone.name,
          storage,
          aliases,
        },
      });
      created++;
    }
  }

  console.log(`Seed complete: ${created} created, ${skipped} skipped (already existed).`);
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
