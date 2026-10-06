import {
  Add01Icon,
  Calendar01Icon,
  Cancel01Icon,
  CheckmarkCircle02Icon,
  Package02Icon,
  Refresh01Icon,
  SparklesIcon,
} from "@/lib/hugeicons";
import { HugeiconsIcon } from "@hugeicons/react";

import MotivationalHeader from "@/components/MotivationalHeader";
import { StockWorkspace } from "@/components/stock/stock-workspace";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog } from "@/components/ui/dialog";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import {
  FormDialogBody,
  FormDialogContent,
  FormDialogFooter,
  FormDialogHeader,
} from "@/components/ui/form-dialog";
import { Input } from "@/components/ui/input";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "sonner";

import {
  CATEGORIES,
  COMMON_VET_PRODUCTS,
} from "@/modules/stock/components/stock-shared";
import type { Transaction } from "@/types/db";
import { formatDZD, toCentimes } from "@/utils/currency";
import type { StockViewProps } from "../hooks/use-stock-page-model";

export function StockView(props: StockViewProps) {
  const {
    activeProducts,
    adjustProductStock,
    autoFillProduct,
    createExpense,
    expenseStatus,
    formData,
    handleArchive,
    handleOpenAdd,
    handleOpenEdit,
    handleOpenRestock,
    handleRestockSubmit,
    handleSaveProduct,
    isProductModalOpen,
    isRestockModalOpen,
    isSubmitting,
    loading,
    movements,
    restockCost,
    restockQty,
    selectedProduct,
    setCreateExpense,
    setExpenseStatus,
    setFormData,
    setIsProductModalOpen,
    setIsRestockModalOpen,
    setRestockCost,
    setRestockQty,
    stockValue,
    totalProducts,
  } = props;
  return (
    <div className="dashboard-stage flex w-full min-w-0 flex-col gap-6 px-4 pt-8 pb-8 lg:px-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <MotivationalHeader
          section="stock"
          subtitle={`${totalProducts} référence${totalProducts > 1 ? "s" : ""} active${totalProducts > 1 ? "s" : ""} · ${formatDZD(stockValue)} en stock`}
        />
        <div data-slot="page-header-actions" className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Button className="h-10 rounded-full px-5 text-sm" onClick={handleOpenAdd}>
            <HugeiconsIcon
              className="size-4"
              icon={Add01Icon}
              strokeWidth={1.5}
            />
            Nouveau produit
          </Button>
        </div>
      </div>

      <StockWorkspace
        loading={loading}
        movements={movements}
        onAdjust={async (product, quantity, reason) => {
          await adjustProductStock({ productId: product.id, quantity, reason });
          toast.success(`Inventaire de ${product.name} mis à jour.`);
        }}
        onDelete={(product) => {
          void handleArchive(product);
        }}
        onEdit={handleOpenEdit}
        onRestock={handleOpenRestock}
        products={activeProducts}
      />

      {/* --- ADD/EDIT PRODUCT DIALOG --- */}
      <Dialog onOpenChange={setIsProductModalOpen} open={isProductModalOpen}>
        <FormDialogContent size="md">
          <FormDialogHeader
            artwork="product"
            description={
              selectedProduct
                ? "Référence, tarifs et disponibilité."
                : "Référence, tarifs et disponibilité."
            }
            icon={<HugeiconsIcon icon={Package02Icon} strokeWidth={1.5} />}
            title={selectedProduct ? "Modifier le produit" : "Nouveau produit"}
            tone="amber"
          />

          <FormDialogBody>
            <FieldGroup>
              {/* Auto-fill section */}
              {!selectedProduct && (
                <div className="rounded-xl border border-zinc-200 border-dashed bg-zinc-50/20 p-4 dark:border-zinc-800">
                  <div className="mb-3 flex items-center gap-2">
                    <HugeiconsIcon
                      className="size-4 text-primary"
                      icon={SparklesIcon}
                      strokeWidth={1.5}
                    />
                    <span className="font-bold text-primary text-xs uppercase tracking-wider">
                      Remplissage rapide
                    </span>
                  </div>
                  <NativeSelect
                    className="w-full cursor-pointer"
                    defaultValue=""
                    onChange={(e) => {
                      const template = COMMON_VET_PRODUCTS.find(
                        (p) => p.name === e.target.value
                      );
                      if (template) {
                        autoFillProduct(template);
                      }
                    }}
                  >
                    <NativeSelectOption disabled value="">
                      Sélectionner un produit courant...
                    </NativeSelectOption>
                    {COMMON_VET_PRODUCTS.map((p) => (
                      <NativeSelectOption key={p.name} value={p.name}>
                        {p.name} ({p.category})
                      </NativeSelectOption>
                    ))}
                  </NativeSelect>
                </div>
              )}

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Field>
                  <FieldLabel>Nom du produit *</FieldLabel>
                  <Input
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    placeholder="Ex: Amoxicilline"
                    value={formData.name || ""}
                  />
                </Field>

                <Field>
                  <FieldLabel>Catégorie</FieldLabel>
                  <NativeSelect
                    className="w-full cursor-pointer"
                    onChange={(e) => {
                      if (e.target.value === "__custom__") {
                        setFormData({ ...formData, category: "" });
                      } else {
                        setFormData({ ...formData, category: e.target.value });
                      }
                    }}
                    value={
                      CATEGORIES.includes(formData.category || "")
                        ? formData.category
                        : "__custom__"
                    }
                  >
                    {CATEGORIES.map((c) => (
                      <NativeSelectOption key={c} value={c}>
                        {c}
                      </NativeSelectOption>
                    ))}
                    <NativeSelectOption value="__custom__">
                      ➕ Catégorie personnalisée...
                    </NativeSelectOption>
                  </NativeSelect>
                  {!CATEGORIES.includes(formData.category || "") && (
                    <Input
                      autoFocus
                      className="mt-2"
                      onChange={(e) =>
                        setFormData({ ...formData, category: e.target.value })
                      }
                      placeholder="Entrez votre catégorie..."
                      value={formData.category || ""}
                    />
                  )}
                </Field>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <Field>
                  <FieldLabel>Quantité</FieldLabel>
                  <Input
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        quantity: Number(e.target.value),
                      })
                    }
                    type="number"
                    value={formData.quantity}
                  />
                </Field>
                <Field>
                  <FieldLabel>Unité</FieldLabel>
                  <Input
                    onChange={(e) =>
                      setFormData({ ...formData, unit: e.target.value })
                    }
                    placeholder="boite"
                    value={formData.unit || ""}
                  />
                </Field>
                <Field>
                  <FieldLabel>Stock Min</FieldLabel>
                  <Input
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        minStock: Number(e.target.value),
                      })
                    }
                    type="number"
                    value={formData.minStock}
                  />
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Field>
                  <FieldLabel>Prix Achat (DA)</FieldLabel>
                  <Input
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        purchasePriceAmount: Number(e.target.value),
                      })
                    }
                    type="number"
                    value={formData.purchasePriceAmount}
                  />
                </Field>
                <Field>
                  <FieldLabel>Prix Vente (DA)</FieldLabel>
                  <Input
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        salePriceAmount: Number(e.target.value),
                      })
                    }
                    type="number"
                    value={formData.salePriceAmount}
                  />
                </Field>
              </div>

              <Field>
                <FieldLabel>Date d'expiration (optionnel)</FieldLabel>
                <div className="grid grid-cols-3 gap-3">
                  <NativeSelect
                    className="w-full cursor-pointer"
                    onChange={(e) => {
                      const current = formData.expiryDate?.split("-") || [
                        new Date().getFullYear().toString(),
                        "",
                        "01",
                      ];
                      if (e.target.value) {
                        setFormData({
                          ...formData,
                          expiryDate: `${current[0]}-${e.target.value}-${current[2] || "01"}`,
                        });
                      }
                    }}
                    value={
                      formData.expiryDate
                        ? formData.expiryDate.split("-")[1]
                        : ""
                    }
                  >
                    <NativeSelectOption value="">Mois</NativeSelectOption>
                    {[
                      "01",
                      "02",
                      "03",
                      "04",
                      "05",
                      "06",
                      "07",
                      "08",
                      "09",
                      "10",
                      "11",
                      "12",
                    ].map((m, i) => (
                      <NativeSelectOption key={m} value={m}>
                        {
                          [
                            "Janv",
                            "Fév",
                            "Mars",
                            "Avr",
                            "Mai",
                            "Juin",
                            "Juil",
                            "Août",
                            "Sept",
                            "Oct",
                            "Nov",
                            "Déc",
                          ][i]
                        }
                      </NativeSelectOption>
                    ))}
                  </NativeSelect>

                  <NativeSelect
                    className="w-full cursor-pointer"
                    onChange={(e) => {
                      const current = formData.expiryDate?.split("-") || [
                        "",
                        "01",
                        "01",
                      ];
                      if (e.target.value) {
                        setFormData({
                          ...formData,
                          expiryDate: `${e.target.value}-${current[1] || "01"}-${current[2] || "01"}`,
                        });
                      }
                    }}
                    value={
                      formData.expiryDate
                        ? formData.expiryDate.split("-")[0]
                        : ""
                    }
                  >
                    <NativeSelectOption value="">Année</NativeSelectOption>
                    {Array.from(
                      { length: 10 },
                      (_, i) => new Date().getFullYear() + i
                    ).map((year) => (
                      <NativeSelectOption key={year} value={year}>
                        {year}
                      </NativeSelectOption>
                    ))}
                  </NativeSelect>

                  {formData.expiryDate && (
                    <Button
                      onClick={() =>
                        setFormData({ ...formData, expiryDate: "" })
                      }
                      size="sm"
                      variant="destructive"
                    >
                      <HugeiconsIcon
                        className="size-3.5"
                        icon={Cancel01Icon}
                        strokeWidth={1.5}
                      />
                      Effacer
                    </Button>
                  )}
                </div>
                {formData.expiryDate && (
                  <p className="mt-2 flex items-center gap-2 text-muted-foreground text-xs">
                    <HugeiconsIcon
                      className="size-3.5"
                      icon={Calendar01Icon}
                      strokeWidth={1.5}
                    />
                    Expire le:{" "}
                    {new Date(formData.expiryDate).toLocaleDateString("fr-FR", {
                      month: "long",
                      year: "numeric",
                    })}
                  </p>
                )}
              </Field>

              {!selectedProduct && Number(formData.quantity) > 0 && (
                <div className="grid gap-3 rounded-xl border border-zinc-150 bg-zinc-50/30 p-4 dark:border-zinc-800 dark:bg-zinc-900/10">
                  <label className="flex cursor-pointer items-center gap-3">
                    <Checkbox
                      checked={createExpense}
                      onCheckedChange={(checked) => setCreateExpense(!!checked)}
                    />
                    <div className="flex-1">
                      <span className="font-medium text-foreground text-sm">
                        Enregistrer l’achat en finances
                      </span>
                      <p className="text-muted-foreground text-xs">
                        Montant :{" "}
                        {formatDZD(
                          toCentimes(
                            (Number(formData.quantity) || 0) *
                              (Number(formData.purchasePriceAmount) || 0)
                          )
                        )}
                      </p>
                    </div>
                  </label>
                  {createExpense && (
                    <NativeSelect
                      className="w-full"
                      onChange={(event) =>
                        setExpenseStatus(
                          event.target.value as Transaction["status"]
                        )
                      }
                      value={expenseStatus}
                    >
                      <NativeSelectOption value="paid">
                        Achat déjà payé
                      </NativeSelectOption>
                      <NativeSelectOption value="pending">
                        À payer au fournisseur
                      </NativeSelectOption>
                    </NativeSelect>
                  )}
                </div>
              )}
            </FieldGroup>
          </FormDialogBody>

          <FormDialogFooter>
            <Button
              className="cursor-pointer"
              onClick={() => setIsProductModalOpen(false)}
              variant="outline"
            >
              Annuler
            </Button>
            <Button
              className="cursor-pointer"
              disabled={isSubmitting}
              onClick={handleSaveProduct}
            >
              {isSubmitting ? (
                <Spinner className="size-4" />
              ) : (
                <HugeiconsIcon
                  className="size-4.5"
                  icon={CheckmarkCircle02Icon}
                  strokeWidth={1.5}
                />
              )}
              Enregistrer
            </Button>
          </FormDialogFooter>
        </FormDialogContent>
      </Dialog>

      {/* --- RESTOCK DIALOG --- */}
      <Dialog
        onOpenChange={setIsRestockModalOpen}
        open={isRestockModalOpen && !!selectedProduct}
      >
        <FormDialogContent size="sm">
          <FormDialogHeader
            artwork="restock"
            description={selectedProduct?.name || "Produit sélectionné"}
            icon={<HugeiconsIcon icon={Refresh01Icon} strokeWidth={1.5} />}
            title="Réapprovisionner"
            tone="teal"
          />

          <FormDialogBody>
            <FieldGroup>
              <div className="grid grid-cols-2 gap-4">
                <Field>
                  <FieldLabel>Quantité (+)</FieldLabel>
                  <Input
                    onChange={(e) => setRestockQty(Number(e.target.value))}
                    type="number"
                    value={restockQty}
                  />
                </Field>
                <Field>
                  <FieldLabel>Coût Unitaire</FieldLabel>
                  <Input
                    onChange={(e) => setRestockCost(Number(e.target.value))}
                    type="number"
                    value={restockCost}
                  />
                </Field>
              </div>

              <div className="grid gap-3 rounded-xl border border-zinc-150 bg-zinc-50/30 p-4 dark:border-zinc-800 dark:bg-zinc-900/10">
                <label className="flex cursor-pointer items-center gap-3">
                  <Checkbox
                    checked={createExpense}
                    onCheckedChange={(checked) => setCreateExpense(!!checked)}
                  />
                  <div className="flex-1">
                    <span className="font-medium text-foreground text-sm">
                      Enregistrer l’achat en finances
                    </span>
                    <p className="text-muted-foreground text-xs">
                      Total :{" "}
                      <span className="font-bold text-foreground">
                        {formatDZD(toCentimes(restockQty * restockCost))}
                      </span>
                    </p>
                  </div>
                </label>
                {createExpense && (
                  <NativeSelect
                    className="w-full"
                    onChange={(event) =>
                      setExpenseStatus(
                        event.target.value as Transaction["status"]
                      )
                    }
                    value={expenseStatus}
                  >
                    <NativeSelectOption value="paid">
                      Achat déjà payé
                    </NativeSelectOption>
                    <NativeSelectOption value="pending">
                      À payer au fournisseur
                    </NativeSelectOption>
                  </NativeSelect>
                )}
              </div>
            </FieldGroup>
          </FormDialogBody>

          <FormDialogFooter>
            <Button
              className="cursor-pointer"
              onClick={() => setIsRestockModalOpen(false)}
              variant="outline"
            >
              Annuler
            </Button>
            <Button
              className="cursor-pointer"
              disabled={isSubmitting || restockQty <= 0}
              onClick={handleRestockSubmit}
            >
              {isSubmitting ? (
                <Spinner className="size-4" />
              ) : (
                <HugeiconsIcon
                  className="size-4.5"
                  icon={Refresh01Icon}
                  strokeWidth={1.5}
                />
              )}
              Valider Stock
            </Button>
          </FormDialogFooter>
        </FormDialogContent>
      </Dialog>
    </div>
  );
}
