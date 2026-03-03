export type Category = {
  slug: string[];
  name: string;
  description: string;
};

export type ProductAttribute = {
  label: string;
  value: string;
};

export type Product = {
  id: string;
  name: string;
  summary: string;
  supplier: string;
  price: string;
  sku: string;
  categorySlug: string[];
  supplierPhotos: string[];
  qcPhotos: string[];
  attributes: ProductAttribute[];
};

export const categories: Category[] = [
  {
    slug: ["electrical", "connectors"],
    name: "Electrical / Connectors",
    description: "Terminals, adapters, and connector kits for assembly lines.",
  },
  {
    slug: ["fasteners"],
    name: "Fasteners",
    description: "Bolts, screws, and washers for industrial and retail projects.",
  },
  {
    slug: ["packaging"],
    name: "Packaging",
    description: "Boxes, wraps, and labels for outbound fulfillment.",
  },
];

export const products: Product[] = [
  {
    id: "p-1001",
    name: "USB-C Shielded Connector Kit",
    summary: "Panel-ready connector kit with locking tabs.",
    supplier: "North Harbor Components",
    price: "$6.80 / kit",
    sku: "NHC-USB-C-44",
    categorySlug: ["electrical", "connectors"],
    supplierPhotos: ["/window.svg", "/globe.svg", "/next.svg"],
    qcPhotos: ["/file.svg", "/vercel.svg"],
    attributes: [
      { label: "Material", value: "Nickel-plated brass" },
      { label: "Rating", value: "5A / 20V" },
      { label: "Lead time", value: "7 days" },
    ],
  },
  {
    id: "p-1002",
    name: "2-Pin Inline Terminal Block",
    summary: "Compact terminal block for low-voltage harnesses.",
    supplier: "Bridgeview Electric Supply",
    price: "$1.25 / unit",
    sku: "BES-TB2-18",
    categorySlug: ["electrical", "connectors"],
    supplierPhotos: ["/next.svg", "/window.svg"],
    qcPhotos: ["/globe.svg", "/file.svg"],
    attributes: [
      { label: "Pitch", value: "3.5 mm" },
      { label: "Max wire", value: "16 AWG" },
      { label: "Lead time", value: "5 days" },
    ],
  },
  {
    id: "p-2001",
    name: "M6 Hex Bolt Assortment",
    summary: "Mixed-length zinc-plated bolts packed in trays.",
    supplier: "Lakefront Hardware Co.",
    price: "$18.00 / tray",
    sku: "LHC-M6-MIX",
    categorySlug: ["fasteners"],
    supplierPhotos: ["/vercel.svg", "/window.svg"],
    qcPhotos: ["/file.svg", "/next.svg"],
    attributes: [
      { label: "Finish", value: "Zinc plated" },
      { label: "Grade", value: "8.8" },
      { label: "Lead time", value: "3 days" },
    ],
  },
  {
    id: "p-3001",
    name: "Recycled Shipping Box 12x8x6",
    summary: "Single-wall carton made from post-consumer fiber.",
    supplier: "ParcelWorks",
    price: "$0.62 / box",
    sku: "PW-RSC-1286",
    categorySlug: ["packaging"],
    supplierPhotos: ["/globe.svg", "/vercel.svg"],
    qcPhotos: ["/window.svg", "/file.svg"],
    attributes: [
      { label: "Burst strength", value: "200 lb/in2" },
      { label: "Color", value: "Kraft" },
      { label: "Lead time", value: "2 days" },
    ],
  },
];

const slugToKey = (slug: string[]) => slug.join("/");

export function getCategoryBySlug(slug: string[]) {
  const targetKey = slugToKey(slug);
  return categories.find((category) => slugToKey(category.slug) === targetKey);
}

export function getProductsByCategorySlug(slug: string[]) {
  const targetKey = slugToKey(slug);
  return products.filter((product) => slugToKey(product.categorySlug) === targetKey);
}

export function getProductById(id: string) {
  return products.find((product) => product.id === id);
}
