export type ImportYupooResult = {
  productId: string;
  productTitle: string;
  imageCount: number;
  yupooUrl: string;
};

export type ImportYupooActionState = {
  status: "idle" | "success" | "error";
  message: string;
  result: ImportYupooResult | null;
};

export type ImportYupooFormAction = (
  state: ImportYupooActionState,
  formData: FormData,
) => Promise<ImportYupooActionState>;

export const initialImportYupooState: ImportYupooActionState = {
  status: "idle",
  message: "",
  result: null,
};
