import { ImageType, PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const connectionString = process.env.DATABASE_URL?.trim();

if (!connectionString) {
  throw new Error("DATABASE_URL is missing. Add DATABASE_URL to .env or .env.local.");
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

async function ensureCategory(name: string, slug: string, parentId: string | null) {
  const existing = await prisma.category.findFirst({
    where: {
      slug,
      parentId,
    },
    select: {
      id: true,
      name: true,
      slug: true,
      parentId: true,
    },
  });

  if (existing) {
    return existing;
  }

  return prisma.category.create({
    data: {
      name,
      slug,
      parentId,
    },
    select: {
      id: true,
      name: true,
      slug: true,
      parentId: true,
    },
  });
}

async function main() {
  const supplier = await prisma.supplier.upsert({
    where: { slug: "seed-supplier" },
    update: {
      name: "Seed Supplier",
      sourceUrl: "https://example.com/supplier",
    },
    create: {
      name: "Seed Supplier",
      slug: "seed-supplier",
      sourceUrl: "https://example.com/supplier",
    },
  });

  const brand = await prisma.brand.upsert({
    where: { slug: "seed-brand" },
    update: {
      name: "Seed Brand",
    },
    create: {
      name: "Seed Brand",
      slug: "seed-brand",
    },
  });

  const rootCategory = await ensureCategory("Electronics", "electronics", null);
  const childCategory = await ensureCategory("Connectors", "connectors", rootCategory.id);

  const product = await prisma.product.upsert({
    where: { id: "seed-product-001" },
    update: {
      title: "Seed USB-C Connector",
      description: "Seed product for local development.",
      sourceUrl: "https://example.com/products/seed-usbc",
      supplierId: supplier.id,
      brandId: brand.id,
      categories: {
        deleteMany: {},
        create: [
          { categoryId: rootCategory.id },
          { categoryId: childCategory.id },
        ],
      },
    },
    create: {
      id: "seed-product-001",
      title: "Seed USB-C Connector",
      description: "Seed product for local development.",
      sourceUrl: "https://example.com/products/seed-usbc",
      supplierId: supplier.id,
      brandId: brand.id,
      categories: {
        create: [
          { categoryId: rootCategory.id },
          { categoryId: childCategory.id },
        ],
      },
    },
  });

  await prisma.productImage.deleteMany({
    where: { productId: product.id },
  });

  await prisma.qcSet.deleteMany({
    where: { productId: product.id },
  });

  const qcSet = await prisma.qcSet.create({
    data: {
      productId: product.id,
      title: "Seed QC Batch 1",
      warehouse: "WH-01",
      notes: "Initial quality control check.",
    },
  });

  await prisma.productImage.createMany({
    data: [
      {
        productId: product.id,
        type: ImageType.SUPPLIER,
        url: "/next.svg",
        sortOrder: 1,
      },
      {
        productId: product.id,
        type: ImageType.SUPPLIER,
        url: "/window.svg",
        sortOrder: 2,
      },
      {
        productId: product.id,
        type: ImageType.QC,
        qcSetId: qcSet.id,
        url: "/globe.svg",
        sortOrder: 1,
      },
      {
        productId: product.id,
        type: ImageType.QC,
        qcSetId: qcSet.id,
        url: "/file.svg",
        sortOrder: 2,
      },
    ],
  });

  console.log("Seed complete: supplier, brand, category tree, and product created.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
