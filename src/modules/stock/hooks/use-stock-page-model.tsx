import { useState } from "react";
import { toast } from "sonner";

import {
  useProductsRepository,
  useTransactionsRepository,
} from "@/data/repositories";

import { COMMON_VET_PRODUCTS } from "@/modules/stock/components/stock-shared";
import type { Product, Transaction } from "@/types/db";
import { toCentimes } from "@/utils/currency";

export function useStockPageModel() {
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isRestockModalOpen, setIsRestockModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    data: products,
    loading,
    add: addProduct,
    update: updateProduct,
    restockProduct,
    movements,
    recordStockMovement,
    adjustProductStock,
  } = useProductsRepository();
  const { add: addTransaction } = useTransactionsRepository();

  const [formData, setFormData] = useState<Partial<Product>>({
    category: "Médicaments",
    minStock: 10,
    unit: "boite",
    quantity: 0,
    purchasePriceAmount: 0,
    salePriceAmount: 0,
  });
  const [createExpense, setCreateExpense] = useState(true);
  const [expenseStatus, setExpenseStatus] =
    useState<Transaction["status"]>("paid");

  const [restockQty, setRestockQty] = useState<number>(0);
  const [restockCost, setRestockCost] = useState<number>(0);
  const activeProducts = products.filter((product) => !product.archivedAt);

  const totalProducts = activeProducts.length;
  const stockValue = activeProducts.reduce(
    (sum, product) => sum + product.quantity * product.purchasePriceAmount,
    0
  );
  // --- Handlers ---
  const handleOpenAdd = () => {
    setSelectedProduct(null);
    setFormData({
      category: "Médicaments",
      minStock: 5,
      unit: "boite",
      quantity: 0,
      purchasePriceAmount: 0,
      salePriceAmount: 0,
    });
    setCreateExpense(true);
    setExpenseStatus("paid");
    setIsProductModalOpen(true);
  };

  const handleOpenEdit = (product: Product) => {
    setSelectedProduct(product);
    setFormData({
      ...product,
      purchasePriceAmount: product.purchasePriceAmount / 100,
      salePriceAmount: product.salePriceAmount / 100,
    });
    setCreateExpense(false);
    setIsProductModalOpen(true);
  };

  const handleOpenRestock = (product: Product) => {
    setSelectedProduct(product);
    setRestockQty(0);
    setRestockCost(product.purchasePriceAmount / 100);
    setCreateExpense(true);
    setExpenseStatus("paid");
    setIsRestockModalOpen(true);
  };

  const handleArchive = async (product: Product) => {
    if (
      !(await updateProduct(product.id, {
        archivedAt: new Date().toISOString(),
      }))
    )
      return;
    toast.success(product.name + " a été archivé.", {
      duration: 5000,
      action: {
        label: "Annuler",
        onClick: () => {
          void updateProduct(product.id, {
            archivedAt: product.archivedAt ?? "",
          });
        },
      },
    });
  };

  const handleSaveProduct = async () => {
    if (!(formData.name && formData.name.trim())) {
      toast.error("Veuillez entrer un nom de produit.");
      return;
    }
    if (
      (formData.purchasePriceAmount ?? 0) < 0 ||
      (formData.salePriceAmount ?? 0) < 0
    ) {
      toast.error("Les prix doivent être positifs.");
      return;
    }

    setIsSubmitting(true);

    try {
      const productData = {
        name: formData.name,
        category: formData.category || "Autre",
        subCategory: formData.subCategory || "",
        quantity: Math.max(0, Number(formData.quantity) || 0),
        unit: formData.unit || "unité",
        minStock: Math.max(0, Number(formData.minStock) || 0),
        purchasePriceAmount: toCentimes(Number(formData.purchasePriceAmount)),
        salePriceAmount: toCentimes(Number(formData.salePriceAmount)),
        expiryDate: formData.expiryDate || "",
      };

      let productId = selectedProduct?.id;

      if (selectedProduct) {
        await updateProduct(selectedProduct.id, productData);
      } else {
        const added = await addProduct(productData as any);
        if (added) {
          productId = added.id;
          if (productData.quantity > 0) {
            await recordStockMovement({
              productId: added.id,
              type: "opening",
              quantityDelta: productData.quantity,
              quantityAfter: productData.quantity,
              unitCostAmount: productData.purchasePriceAmount,
              reason: "Stock initial",
            });
          }
        }
      }

      if (
        createExpense &&
        Number(formData.quantity) > 0 &&
        productId &&
        !selectedProduct
      ) {
        const totalCost = toCentimes(
          Number(formData.purchasePriceAmount) * Number(formData.quantity)
        );
        if (totalCost > 0) {
          try {
            await addTransaction({
              date: new Date().toISOString().split("T")[0],
              amount: totalCost,
              type: "expense",
              category: "Achat Stock",
              description: `Stock initial: ${formData.name} (x${formData.quantity})`,
              method: "cash",
              status: expenseStatus,
            } as any);
          } catch (txError) {
            console.error("Failed to add initial stock transaction:", txError);
            toast.warning(
              "Produit enregistré, mais la dépense initiale n’a pas été créée. Ajoutez-la depuis Finances."
            );
          }
        }
      }

      setIsProductModalOpen(false);
      toast.success(
        selectedProduct ? "Produit mis à jour." : "Produit ajouté au catalogue."
      );
      setSelectedProduct(null);
      setFormData({
        category: "Médicaments",
        minStock: 10,
        unit: "boite",
        quantity: 0,
        purchasePriceAmount: 0,
        salePriceAmount: 0,
      });
    } catch (e) {
      console.error("Error saving product:", e);
      toast.error("Erreur lors de l'enregistrement. Veuillez réessayer.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRestockSubmit = async () => {
    if (!selectedProduct || restockQty <= 0) {
      return;
    }
    setIsSubmitting(true);

    try {
      await restockProduct({
        productId: selectedProduct.id,
        quantity: restockQty,
        unitCostAmount: toCentimes(restockCost),
        createExpense,
        expenseStatus,
      });

      setIsRestockModalOpen(false);
      toast.success(`Stock de ${selectedProduct.name} mis à jour.`);
    } catch (e) {
      console.error(e);
      toast.error("La mise à jour du stock a échoué. Réessayez.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const autoFillProduct = (template: (typeof COMMON_VET_PRODUCTS)[0]) => {
    setFormData({
      ...formData,
      name: template.name,
      category: template.category,
      subCategory: template.subCategory,
      unit: template.unit,
      minStock: template.minStock,
      purchasePriceAmount: template.purchase,
      salePriceAmount: template.sale,
    });
  };
  return {
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
  };
}

export type StockViewProps = ReturnType<typeof useStockPageModel>;
