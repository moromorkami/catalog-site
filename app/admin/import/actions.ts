"use server";

import type { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { prisma } from "@/src/lib/prisma";

type ProductImageType = Prisma.ProductImageCreateManyInput["type"];
const SUPPLIER_IMAGE_TYPE: ProductImageType = "SUPPLIER";

const REQUIRED_COLUMNS = [
  "supplier_name",
  "brand",
  "category_path",
  "title",
  "description",
  "source_url",
  "image_urls",
] as const;

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_ROWS = 2000;

type RequiredColumn = (typeof REQUIRED_COLUMNS)[number];

export type ImportSummary = {
  rowsTotal: number;
  rowsSucceeded: number;
  rowsFailed: number;
  suppliersCreated: number;
  brandsCreated: number;
  categoriesCreated: number;
  productsCreated: number;
  imagesCreated: number;
};

export type ImportRowError = {
  row: number;
  title: string;
  error: string;
};

export type ImportActionState = {
  status: "idle" | "success" | "partial" | "error";
  message: string;
  summary: ImportSummary | null;
  errors: ImportRowError[];
};

export const initialImportState: ImportActionState = {
  status: "idle",
  message: "",
  summary: null,
  errors: [],
};

type CsvRecord = Record<RequiredColumn, string>;

type RowImportCounts = {
  suppliersCreated: number;
  brandsCreated: number;
  categoriesCreated: number;
  productsCreated: number;
  imagesCreated: number;
};

function slugify(value: string) {
  return value
    .normalize("NFKD")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function toErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "Unknown import error.";
}

function isValidUrl(url: string) {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function parseCsv(csvText: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;

  for (let i = 0; i < csvText.length; i += 1) {
    const char = csvText[i];

    if (inQuotes) {
      if (char === '"') {
        if (csvText[i + 1] === '"') {
          cell += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        cell += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
      continue;
    }

    if (char === ",") {
      row.push(cell);
      cell = "";
      continue;
    }

    if (char === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
      continue;
    }

    if (char === "\r") {
      continue;
    }

    cell += char;
  }

  row.push(cell);
  rows.push(row);

  return rows.filter((record) => record.some((field) => field.trim().length > 0));
}

function parseCsvRecords(csvText: string): CsvRecord[] {
  const rows = parseCsv(csvText);
  if (rows.length === 0) {
    throw new Error("CSV is empty.");
  }

  const headers = rows[0].map((value) => value.replace(/^\uFEFF/, "").trim().toLowerCase());
  const headerIndex = new Map(headers.map((header, index) => [header, index]));

  const missingColumns = REQUIRED_COLUMNS.filter((column) => !headerIndex.has(column));
  if (missingColumns.length > 0) {
    throw new Error(`Missing required CSV columns: ${missingColumns.join(", ")}`);
  }

  const dataRows = rows.slice(1).filter((record) => record.some((field) => field.trim().length > 0));
  if (dataRows.length > MAX_ROWS) {
    throw new Error(`Too many rows. Max ${MAX_ROWS} rows per import.`);
  }

  return dataRows.map((record) => {
    const getValue = (column: RequiredColumn) => {
      const index = headerIndex.get(column);
      if (index === undefined) {
        return "";
      }
      return (record[index] ?? "").trim();
    };

    return {
      supplier_name: getValue("supplier_name"),
      brand: getValue("brand"),
      category_path: getValue("category_path"),
      title: getValue("title"),
      description: getValue("description"),
      source_url: getValue("source_url"),
      image_urls: getValue("image_urls"),
    };
  });
}

async function importRecordRow(
  tx: Prisma.TransactionClient,
  row: CsvRecord,
): Promise<RowImportCounts> {
  const supplierName = row.supplier_name.trim();
  const brandName = row.brand.trim();
  const categoryPath = row.category_path.trim();
  const title = row.title.trim();
  const description = row.description.trim() || null;
  const sourceUrl = row.source_url.trim() || null;
  const imageUrls = row.image_urls
    .split(";")
    .map((url) => url.trim())
    .filter(Boolean);

  if (!supplierName) throw new Error("supplier_name is required.");
  if (!title) throw new Error("title is required.");
  if (!categoryPath) throw new Error("category_path is required.");
  if (sourceUrl && !isValidUrl(sourceUrl)) throw new Error(`Invalid source_url: ${sourceUrl}`);

  for (const imageUrl of imageUrls) {
    if (!imageUrl.startsWith("/") && !isValidUrl(imageUrl)) {
      throw new Error(`Invalid image URL: ${imageUrl}`);
    }
  }

  const supplierSlug = slugify(supplierName);
  if (!supplierSlug) throw new Error("Cannot generate supplier slug.");

  let suppliersCreated = 0;
  let brandsCreated = 0;
  let categoriesCreated = 0;
  let imagesCreated = 0;

  let supplier = await tx.supplier.findUnique({
    where: { slug: supplierSlug },
    select: { id: true },
  });

  if (!supplier) {
    supplier = await tx.supplier.create({
      data: { name: supplierName, slug: supplierSlug },
      select: { id: true },
    });
    suppliersCreated += 1;
  }

  let brandId: string | null = null;
  if (brandName) {
    const brandSlug = slugify(brandName);
    if (!brandSlug) throw new Error("Cannot generate brand slug.");

    let brand = await tx.brand.findUnique({
      where: { slug: brandSlug },
      select: { id: true },
    });

    if (!brand) {
      brand = await tx.brand.create({
        data: { name: brandName, slug: brandSlug },
        select: { id: true },
      });
      brandsCreated += 1;
    }

    brandId = brand.id;
  }

  const categorySegments = categoryPath
    .split(">")
    .map((segment) => segment.trim())
    .filter(Boolean);

  if (categorySegments.length === 0) {
    throw new Error("category_path must contain at least one segment.");
  }

  const categoryIds: string[] = [];
  let parentId: string | null = null;

  for (const segment of categorySegments) {
    const segmentSlug = slugify(segment);
    if (!segmentSlug) throw new Error(`Cannot generate category slug from segment: ${segment}`);

    let category: { id: string } | null = await tx.category.findFirst({
      where: { parentId, slug: segmentSlug },
      select: { id: true },
    });

    if (!category) {
      category = await tx.category.create({
        data: { name: segment, slug: segmentSlug, parentId },
        select: { id: true },
      });
      categoriesCreated += 1;
    }

    categoryIds.push(category.id);
    parentId = category.id;
  }

  const uniqueCategoryIds = [...new Set(categoryIds)];

  const product = await tx.product.create({
    data: {
      title,
      description,
      sourceUrl,
      supplier: { connect: { id: supplier.id } },
      ...(brandId ? { brand: { connect: { id: brandId } } } : {}),
      categories: { create: uniqueCategoryIds.map((categoryId) => ({ categoryId })) },
    },
    select: { id: true },
  });

  if (imageUrls.length > 0) {
    await tx.productImage.createMany({
      data: imageUrls.map((url, index) => ({
        productId: product.id,
        type: SUPPLIER_IMAGE_TYPE,
        url,
        sortOrder: index + 1,
      })),
    });
    imagesCreated += imageUrls.length;
  }

  return {
    suppliersCreated,
    brandsCreated,
    categoriesCreated,
    productsCreated: 1,
    imagesCreated,
  };
}

export async function importCsvAction(
  _prevState: ImportActionState,
  formData: FormData,
): Promise<ImportActionState> {
  try {
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return { status: "error", message: "Please upload a CSV file.", summary: null, errors: [] };
    }

    if (file.size === 0) {
      return { status: "error", message: "Uploaded CSV file is empty.", summary: null, errors: [] };
    }

    if (file.size > MAX_FILE_SIZE) {
      return {
        status: "error",
        message: `CSV file is too large. Max ${MAX_FILE_SIZE / (1024 * 1024)}MB.`,
        summary: null,
        errors: [],
      };
    }

    const csvText = await file.text();
    const records = parseCsvRecords(csvText);

    if (records.length === 0) {
      return { status: "error", message: "CSV has no data rows.", summary: null, errors: [] };
    }

    const summary: ImportSummary = {
      rowsTotal: records.length,
      rowsSucceeded: 0,
      rowsFailed: 0,
      suppliersCreated: 0,
      brandsCreated: 0,
      categoriesCreated: 0,
      productsCreated: 0,
      imagesCreated: 0,
    };

    const errors: ImportRowError[] = [];

    for (let index = 0; index < records.length; index += 1) {
      const row = records[index];
      const rowNumber = index + 2;

      try {
        const rowCounts = await prisma.$transaction((tx) => importRecordRow(tx, row));
        summary.rowsSucceeded += 1;
        summary.suppliersCreated += rowCounts.suppliersCreated;
        summary.brandsCreated += rowCounts.brandsCreated;
        summary.categoriesCreated += rowCounts.categoriesCreated;
        summary.productsCreated += rowCounts.productsCreated;
        summary.imagesCreated += rowCounts.imagesCreated;
      } catch (error) {
        summary.rowsFailed += 1;
        errors.push({
          row: rowNumber,
          title: row.title || "(missing title)",
          error: toErrorMessage(error),
        });
      }
    }

    if (summary.rowsSucceeded > 0) {
      revalidatePath("/");
      revalidatePath("/admin");
      revalidatePath("/admin/products/new");
      revalidatePath("/admin/import");
    }

    return {
      status: summary.rowsFailed > 0 ? "partial" : "success",
      message:
        summary.rowsFailed > 0
          ? "Import finished with some row errors."
          : "Import finished successfully.",
      summary,
      errors,
    };
  } catch (error) {
    return { status: "error", message: toErrorMessage(error), summary: null, errors: [] };
  }
}