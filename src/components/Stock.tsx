import React, { useDeferredValue, useMemo, useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Activity01Icon,
  Add01Icon,
  Alert02Icon,
  ArrowDown01Icon,
  Bug01Icon,
  Calendar01Icon,
  Cancel01Icon,
  CheckmarkCircle02Icon,
  Delete01Icon,
  GivePillIcon,
  KitchenUtensilsIcon,
  Package02Icon,
  PillIcon,
  Refresh01Icon,
  Scissor01Icon,
  SearchIcon,
  ShoppingCart01Icon,
  SparklesIcon,
} from "@hugeicons/core-free-icons"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
import {
  useProductsRepository,
  useTransactionsRepository,
} from "@/data/repositories"
import { TrendingUp, TrendingDown } from "@hugeicons/core-free-icons"
import {
  MetricOverviewStrip,
  type MetricOverviewItem,
} from "@/components/metric-overview-strip"
import { Product } from "@/types/db"
import { formatDZD, toCentimes } from "@/utils/currency"

// --- CATEGORY ICONS MAPPING ---
const getCategoryIcon = (category: string) => {
  switch (category) {
    case "Médicaments":
      return PillIcon
    case "Vaccins":
      return GivePillIcon
    case "Antiparasitaires":
      return Bug01Icon
    case "Anti-inflammatoires":
      return Activity01Icon
    case "Matériel Médical":
      return Scissor01Icon
    case "Alimentation":
      return KitchenUtensilsIcon
    case "Hygiène":
      return SparklesIcon
    default:
      return Package02Icon
  }
}

// --- DATABASE OF COMMON VET PRODUCTS ---
const COMMON_VET_PRODUCTS = [
  {
    category: "Antibiotiques",
    name: "Amoxicilline 500mg",
    subCategory: "Antibiotique général",
    unit: "comprimés",
    minStock: 20,
    purchase: 800,
    sale: 1500,
  },
  {
    category: "Antibiotiques",
    name: "Synulox 250mg",
    subCategory: "Antibiotique",
    unit: "comprimés",
    minStock: 10,
    purchase: 1200,
    sale: 2200,
  },
  {
    category: "Antibiotiques",
    name: "Doxycycline 100mg",
    subCategory: "Antibiotique",
    unit: "comprimés",
    minStock: 15,
    purchase: 600,
    sale: 1200,
  },
  {
    category: "Vaccins",
    name: "CHPPiL (Chien)",
    subCategory: "Vaccin Polyvalent",
    unit: "doses",
    minStock: 5,
    purchase: 1800,
    sale: 3000,
  },
  {
    category: "Vaccins",
    name: "Rage (Rabisin)",
    subCategory: "Vaccin Antirabique",
    unit: "doses",
    minStock: 5,
    purchase: 900,
    sale: 1500,
  },
  {
    category: "Vaccins",
    name: "Leucofeligen (Chat)",
    subCategory: "Vaccin Chat",
    unit: "doses",
    minStock: 5,
    purchase: 1600,
    sale: 2800,
  },
  {
    category: "Anti-inflammatoires",
    name: "Metacam (Meloxicam) inj",
    subCategory: "AINS",
    unit: "flacon",
    minStock: 2,
    purchase: 3500,
    sale: 5500,
  },
  {
    category: "Anti-inflammatoires",
    name: "Prednisolone 5mg",
    subCategory: "Corticoïde",
    unit: "boite",
    minStock: 5,
    purchase: 400,
    sale: 800,
  },
  {
    category: "Antiparasitaires",
    name: "Bravecto Chien 20-40kg",
    subCategory: "Externe",
    unit: "comprimé",
    minStock: 3,
    purchase: 4500,
    sale: 6500,
  },
  {
    category: "Antiparasitaires",
    name: "Nexgard Spectra M",
    subCategory: "Complet",
    unit: "comprimé",
    minStock: 5,
    purchase: 3200,
    sale: 4800,
  },
  {
    category: "Antiparasitaires",
    name: "Drontal Chien",
    subCategory: "Interne",
    unit: "comprimé",
    minStock: 20,
    purchase: 300,
    sale: 600,
  },
  {
    category: "Anesthésie",
    name: "Ketamine 1000",
    subCategory: "Anesthésique",
    unit: "flacon",
    minStock: 2,
    purchase: 2500,
    sale: 0,
  },
  {
    category: "Anesthésie",
    name: "Domitor",
    subCategory: "Sédatif",
    unit: "flacon",
    minStock: 1,
    purchase: 4000,
    sale: 0,
  },
  {
    category: "Hygiène",
    name: "Shampoing Antiseptique",
    subCategory: "Dermatologie",
    unit: "flacon",
    minStock: 3,
    purchase: 1200,
    sale: 2000,
  },
  {
    category: "Matériel",
    name: "Seringues 2.5ml",
    subCategory: "Consommable",
    unit: "boite 100",
    minStock: 2,
    purchase: 800,
    sale: 1000,
  },
]

const CATEGORIES = [
  "Médicaments",
  "Vaccins",
  "Antiparasitaires",
  "Anti-inflammatoires",
  "Anesthésie",
  "Matériel Médical",
  "Consommables",
  "Alimentation",
  "Hygiène",
  "Autre",
]

const STAT_ITEMS = [
  {
    key: "total",
    icon: Package02Icon,
    colorClass:
      "bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400",
    label: "Total Produits",
  },
  {
    key: "low",
    icon: ArrowDown01Icon,
    colorClass:
      "bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400",
    label: "Stock Bas",
  },
  {
    key: "out",
    icon: Alert02Icon,
    colorClass: "bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400",
    label: "Ruptures",
  },
  {
    key: "expiring",
    icon: Calendar01Icon,
    colorClass:
      "bg-violet-100 text-violet-600 dark:bg-violet-500/20 dark:text-violet-400",
    label: "Expirations",
  },
  {
    key: "value",
    icon: ShoppingCart01Icon,
    colorClass:
      "bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400",
    label: "Valeur Stock",
  },
] as const

const Stock: React.FC = () => {
  const [activeCategory, setActiveCategory] = useState("Tous")
  const [searchTerm, setSearchTerm] = useState("")
  const deferredSearchTerm = useDeferredValue(searchTerm)

  const [isProductModalOpen, setIsProductModalOpen] = useState(false)
  const [isRestockModalOpen, setIsRestockModalOpen] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)

  const [isSubmitting, setIsSubmitting] = useState(false)

  const {
    data: products,
    loading,
    add: addProduct,
    update: updateProduct,
    remove: removeProduct,
    restockProduct,
  } = useProductsRepository()
  const { add: addTransaction } = useTransactionsRepository()

  const [formData, setFormData] = useState<Partial<Product>>({
    category: "Médicaments",
    minStock: 10,
    unit: "boite",
    quantity: 0,
    purchasePriceAmount: 0,
    salePriceAmount: 0,
  })
  const [createExpense, setCreateExpense] = useState(true)

  const [restockQty, setRestockQty] = useState<number>(0)
  const [restockCost, setRestockCost] = useState<number>(0)

  // Stats
  const totalProducts = products.length
  const lowStock = products.filter(
    (p) => p.quantity <= p.minStock && p.quantity > 0
  ).length
  const outOfStock = products.filter((p) => p.quantity === 0).length
  const todayStr = new Date().toISOString().split("T")[0]
  const expiringSoon = products.filter(
    (p) => p.expiryDate && p.expiryDate < todayStr
  ).length
  const stockValue = products.reduce(
    (sum, product) => sum + product.quantity * product.purchasePriceAmount,
    0
  )

  const statValues: Record<string, string | number> = {
    total: totalProducts,
    low: lowStock,
    out: outOfStock,
    expiring: expiringSoon,
    value: formatDZD(stockValue),
  }

  // Section Cards for Stock
  const overviewCards = useMemo<MetricOverviewItem[]>(() => {
    const generateSparkline = (base: number) => 
      Array.from({ length: 8 }, () => base + Math.floor(Math.random() * 4) - 2)
    
    return [
      {
        label: "Produits",
        value: String(totalProducts),
        meta: `${products.length} réf.`,
        note: "Catalogue",
        icon: Package02Icon,
        sparklineData: generateSparkline(totalProducts),
        tone: "blue",
      },
      {
        label: "Stock bas",
        value: String(lowStock),
        meta: lowStock > 0 ? "à réapprovisionner" : "OK",
        note: "Seuil atteint",
        icon: ArrowDown01Icon,
        sparklineData: generateSparkline(lowStock),
        tone: "amber",
      },
      {
        label: "Ruptures",
        value: String(outOfStock),
        meta: outOfStock > 0 ? "critique" : "aucune",
        note: "Stock épuisé",
        icon: Alert02Icon,
        sparklineData: generateSparkline(outOfStock),
        tone: "rose",
      },
      {
        label: "Valeur stock",
        value: formatDZD(stockValue),
        meta: "valorisation",
        note: "Coût d'acquisition total",
        icon: ShoppingCart01Icon,
        sparklineData: generateSparkline(Math.round(stockValue / 1000)),
        tone: "emerald",
      },
    ]
  }, [totalProducts, lowStock, outOfStock, stockValue, products.length])

  // Filtering
  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const matchesCategory =
        activeCategory === "Tous" || product.category === activeCategory
      const needle = deferredSearchTerm.toLowerCase()
      const haystack = [
        product.name,
        product.category,
        product.subCategory,
        product.unit,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
      return matchesCategory && haystack.includes(needle)
    })
  }, [products, activeCategory, deferredSearchTerm])

  // --- Handlers ---
  const handleOpenAdd = () => {
    setSelectedProduct(null)
    setFormData({
      category: "Médicaments",
      minStock: 5,
      unit: "boite",
      quantity: 0,
      purchasePriceAmount: 0,
      salePriceAmount: 0,
    })
    setCreateExpense(true)
    setIsProductModalOpen(true)
  }

  const handleOpenEdit = (product: Product) => {
    setSelectedProduct(product)
    setFormData({
      ...product,
      purchasePriceAmount: product.purchasePriceAmount / 100,
      salePriceAmount: product.salePriceAmount / 100,
    })
    setCreateExpense(false)
    setIsProductModalOpen(true)
  }

  const handleOpenRestock = (product: Product) => {
    setSelectedProduct(product)
    setRestockQty(0)
    setRestockCost(product.purchasePriceAmount / 100)
    setCreateExpense(true)
    setIsRestockModalOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (window.confirm("Êtes-vous sûr de vouloir supprimer ce produit ?")) {
      await removeProduct(id)
    }
  }

  const handleSaveProduct = async () => {
    if (!formData.name || !formData.name.trim()) {
      alert("Veuillez entrer un nom de produit.")
      return
    }
    if (
      (formData.purchasePriceAmount ?? 0) < 0 ||
      (formData.salePriceAmount ?? 0) < 0
    ) {
      alert("Les prix doivent être positifs.")
      return
    }

    setIsSubmitting(true)

    try {
      const productData = {
        name: formData.name,
        category: formData.category || "Autre",
        subCategory: formData.subCategory || "",
        quantity: Number(formData.quantity) || 0,
        unit: formData.unit || "unité",
        minStock: Number(formData.minStock) || 5,
        purchasePriceAmount: toCentimes(Number(formData.purchasePriceAmount)),
        salePriceAmount: toCentimes(Number(formData.salePriceAmount)),
        expiryDate: formData.expiryDate || "",
      }

      let productId = selectedProduct?.id

      if (selectedProduct) {
        await updateProduct(selectedProduct.id, productData)
      } else {
        const added = await addProduct(productData as any)
        productId = added.id
      }

      if (createExpense && Number(formData.quantity) > 0 && productId) {
        if (!selectedProduct) {
          const totalCost = toCentimes(
            Number(formData.purchasePriceAmount) * Number(formData.quantity)
          )
          if (totalCost > 0) {
            try {
              await addTransaction({
                date: new Date().toISOString().split("T")[0],
                amount: totalCost,
                type: "expense",
                category: "Achat Stock",
                description: `Stock initial: ${formData.name} (x${formData.quantity})`,
                method: "cash",
                status: "paid",
              } as any)
            } catch (txError) {
              // Transaction creation failed silently
            }
          }
        }
      }

      setIsProductModalOpen(false)
      setSelectedProduct(null)
      setFormData({
        category: "Médicaments",
        minStock: 10,
        unit: "boite",
        quantity: 0,
        purchasePriceAmount: 0,
        salePriceAmount: 0,
      })
    } catch (e) {
      console.error("Error saving product:", e)
      alert("Erreur lors de l'enregistrement. Veuillez réessayer.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleRestockSubmit = async () => {
    if (!selectedProduct || restockQty <= 0) return
    setIsSubmitting(true)

    try {
      await restockProduct({
        productId: selectedProduct.id,
        quantity: restockQty,
        unitCostAmount: toCentimes(restockCost),
        createExpense,
      })

      setIsRestockModalOpen(false)
    } catch (e) {
      console.error(e)
    } finally {
      setIsSubmitting(false)
    }
  }

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
    })
  }

  return (
    <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-5 px-4 pt-4 pb-6 lg:px-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-end">
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button className="h-10 rounded-xl px-4" onClick={handleOpenAdd}>
          <HugeiconsIcon icon={Add01Icon} strokeWidth={2} className="size-4" />
          Nouveau produit
          </Button>
        </div>
      </div>

      <MetricOverviewStrip items={overviewCards} />

      {/* Main Table Card */}
      <Card className="card-vibrant card-hover-lift flex min-h-[540px] flex-col rounded-[24px] border border-border bg-card shadow-none">
        <CardHeader className="border-b border-border px-6 py-5">
          <CardDescription className="font-mono text-[10px] uppercase tracking-[0.06em]">Inventaire</CardDescription>
          <CardTitle className="text-[22px] font-normal tracking-[-0.04em]">
            Catalogue produits
          </CardTitle>
          <CardAction>
            <Badge variant="outline" className="rounded-full px-3 py-1">
              {filteredProducts.length} produit
              {filteredProducts.length > 1 ? "s" : ""}
            </Badge>
          </CardAction>
        </CardHeader>

        <CardContent className="flex min-h-0 flex-1 flex-col px-0 pb-0">
          <div className="flex flex-col gap-3 px-6 pt-5 pb-4 sm:flex-row sm:items-center">
            <div className="relative max-w-sm flex-1">
              <HugeiconsIcon
                icon={SearchIcon}
                strokeWidth={2}
                className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Rechercher un produit, une catégorie..."
                className="h-10 rounded-xl bg-input/50 pl-11"
              />
            </div>

            <NativeSelect
              value={activeCategory}
              onChange={(e) => setActiveCategory(e.target.value)}
            >
              <NativeSelectOption value="Tous">
                Toutes les catégories ({products.length})
              </NativeSelectOption>
              {CATEGORIES.map((cat) => {
                const count = products.filter((p) => p.category === cat).length
                return (
                  <NativeSelectOption key={cat} value={cat}>
                    {cat} ({count})
                  </NativeSelectOption>
                )
              })}
            </NativeSelect>

            {activeCategory !== "Tous" && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setActiveCategory("Tous")}
                className="text-primary"
              >
                {activeCategory}
                <HugeiconsIcon
                  icon={Cancel01Icon}
                  strokeWidth={2}
                  className="size-3"
                />
              </Button>
            )}
          </div>

          <div className="px-6">
            <Separator />
          </div>

          <div className="flex-1 overflow-auto p-4">
            {loading ? (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {Array.from({ length: 8 }).map((_, index) => (
                  <div
                    key={`stock-skeleton-card-${index}`}
                    className="rounded-xl border border-border/60 p-4"
                  >
                    <div className="mb-3 flex items-center justify-between">
                      <Skeleton className="h-5 w-24 rounded-md" />
                      <Skeleton className="h-5 w-12 rounded-md" />
                    </div>
                    <Skeleton className="mb-2 h-4 w-3/4 rounded-md" />
                    <Skeleton className="mb-4 h-3 w-2/3 rounded-md" />
                    <Skeleton className="h-2 w-full rounded-full" />
                  </div>
                ))}
              </div>
            ) : filteredProducts.length === 0 ? (
              <Empty className="border border-dashed border-border/80 bg-muted/20">
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <HugeiconsIcon
                      icon={Package02Icon}
                      strokeWidth={2}
                      className="size-5"
                    />
                  </EmptyMedia>
                  <EmptyTitle>Aucun produit trouvé</EmptyTitle>
                  <EmptyDescription>
                    Modifiez votre recherche ou ajoutez un nouveau produit.
                  </EmptyDescription>
                </EmptyHeader>
                <EmptyContent className="sm:flex-row">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSearchTerm("")
                      setActiveCategory("Tous")
                    }}
                  >
                    Réinitialiser
                  </Button>
                  <Button onClick={handleOpenAdd}>
                    <HugeiconsIcon
                      icon={Add01Icon}
                      strokeWidth={2}
                      data-icon="inline-start"
                      className="size-4"
                    />
                    Ajouter un produit
                  </Button>
                </EmptyContent>
              </Empty>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {filteredProducts.map((product) => {
                  const isLow = product.quantity <= product.minStock
                  const isOut = product.quantity === 0
                  const CatIcon = getCategoryIcon(product.category)
                  const stockPercentage =
                    product.minStock > 0
                      ? Math.min(
                          100,
                          Math.round(
                            (product.quantity / (product.minStock * 3)) * 100
                          )
                        )
                      : 100
                  const isExpired =
                    product.expiryDate && product.expiryDate < todayStr

                  return (
                    <div
                      key={product.id}
                      className={cn(
                        "group cursor-pointer rounded-4xl border bg-card p-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md",
                        isOut
                          ? "border-red-200 dark:border-red-500/30"
                          : isLow
                            ? "border-amber-200 dark:border-amber-500/30"
                            : "border-border/60"
                      )}
                      onClick={() => handleOpenEdit(product)}
                    >
                      <div className="mb-3 flex items-start gap-3">
                        <div
                          className={cn(
                            "flex size-10 shrink-0 items-center justify-center rounded-xl",
                            isOut
                              ? "bg-red-100 text-red-600 dark:bg-red-500/20"
                              : isLow
                                ? "bg-amber-100 text-amber-600 dark:bg-amber-500/20"
                                : "bg-blue-50 text-primary dark:bg-blue-500/10"
                          )}
                        >
                          <HugeiconsIcon
                            icon={CatIcon}
                            strokeWidth={2}
                            className="size-5"
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="truncate text-sm font-semibold text-foreground">
                            {product.name}
                          </h3>
                          <p className="truncate text-[11px] text-muted-foreground">
                            {product.category} •{" "}
                            {product.subCategory || product.unit}
                          </p>
                        </div>
                      </div>

                      <div className="mb-3">
                        <div className="mb-1 flex items-center justify-between">
                          <span className="text-[10px] font-medium text-muted-foreground uppercase">
                            Stock
                          </span>
                          <span
                            className={cn(
                              "text-xs font-semibold",
                              isOut
                                ? "text-red-600"
                                : isLow
                                  ? "text-amber-600"
                                  : "text-green-600"
                            )}
                          >
                            {product.quantity} {product.unit}
                          </span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-muted/50">
                          <div
                            className={cn(
                              "h-full rounded-full transition-all",
                              isOut
                                ? "bg-red-500"
                                : isLow
                                  ? "bg-amber-500"
                                  : "bg-green-500"
                            )}
                            style={{ width: `${isOut ? 5 : stockPercentage}%` }}
                          />
                        </div>
                        <p className="mt-1 text-[10px] text-muted-foreground">
                          Min: {product.minStock} {product.unit}
                        </p>
                      </div>

                      <div className="flex items-center justify-between border-t border-border/50 pt-3">
                        <div>
                          <p className="text-[10px] text-muted-foreground">
                            Achat
                          </p>
                          <p className="text-xs font-medium text-muted-foreground">
                            {formatDZD(product.purchasePriceAmount)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] text-muted-foreground">
                            Vente
                          </p>
                          <p className="text-sm font-bold text-foreground">
                            {formatDZD(product.salePriceAmount)}
                          </p>
                        </div>
                      </div>

                      <div className="mt-3 flex items-center justify-between border-t border-border/30 pt-2">
                        <div className="flex items-center gap-2">
                          {isExpired ? (
                            <Badge
                              variant="outline"
                              className="border-transparent bg-violet-500/10 text-violet-700 dark:text-violet-300"
                            >
                              Expiré
                            </Badge>
                          ) : isOut ? (
                            <Badge
                              variant="outline"
                              className="border-transparent bg-red-500/10 text-red-700 dark:text-red-300"
                            >
                              Rupture
                            </Badge>
                          ) : isLow ? (
                            <Badge
                              variant="outline"
                              className="border-transparent bg-amber-500/10 text-amber-700 dark:text-amber-300"
                            >
                              Stock Bas
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="border-transparent bg-green-500/10 text-green-700 dark:text-green-300"
                            >
                              OK
                            </Badge>
                          )}
                          {product.expiryDate && !isExpired && (
                            <span className="text-[10px] text-muted-foreground">
                              Exp: {product.expiryDate}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            className="text-primary"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleOpenRestock(product)
                            }}
                          >
                            <HugeiconsIcon
                              icon={Refresh01Icon}
                              strokeWidth={2}
                              className="size-3.5"
                            />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            className="text-muted-foreground hover:text-destructive"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDelete(product.id)
                            }}
                          >
                            <HugeiconsIcon
                              icon={Delete01Icon}
                              strokeWidth={2}
                              className="size-3.5"
                            />
                          </Button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* --- ADD/EDIT PRODUCT DIALOG --- */}
      <Dialog open={isProductModalOpen} onOpenChange={setIsProductModalOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {selectedProduct ? "Modifier le Produit" : "Nouveau Produit"}
            </DialogTitle>
            <DialogDescription>
              {selectedProduct
                ? "Modifiez les informations du produit ci-dessous."
                : "Remplissez les informations pour ajouter un nouveau produit à l'inventaire."}
            </DialogDescription>
          </DialogHeader>

          <FieldGroup>
            {/* Auto-fill section */}
            {!selectedProduct && (
              <div className="rounded-2xl border border-dashed border-border bg-muted/20 p-4">
                <div className="mb-3 flex items-center gap-2">
                  <HugeiconsIcon
                    icon={SparklesIcon}
                    strokeWidth={2}
                    className="size-4 text-primary"
                  />
                  <span className="text-xs font-bold tracking-wider text-primary uppercase">
                    Remplissage Rapide
                  </span>
                </div>
                <NativeSelect
                  className="w-full"
                  onChange={(e) => {
                    const template = COMMON_VET_PRODUCTS.find(
                      (p) => p.name === e.target.value
                    )
                    if (template) autoFillProduct(template)
                  }}
                  defaultValue=""
                >
                  <NativeSelectOption value="" disabled>
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
                  value={formData.name || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="Ex: Amoxicilline"
                />
              </Field>

              <Field>
                <FieldLabel>Catégorie</FieldLabel>
                <NativeSelect
                  className="w-full"
                  value={
                    CATEGORIES.includes(formData.category || "")
                      ? formData.category
                      : "__custom__"
                  }
                  onChange={(e) => {
                    if (e.target.value === "__custom__") {
                      setFormData({ ...formData, category: "" })
                    } else {
                      setFormData({ ...formData, category: e.target.value })
                    }
                  }}
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
                    value={formData.category || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, category: e.target.value })
                    }
                    placeholder="Entrez votre catégorie..."
                    className="mt-2"
                    autoFocus
                  />
                )}
              </Field>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <Field>
                <FieldLabel>Quantité</FieldLabel>
                <Input
                  type="number"
                  value={formData.quantity}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      quantity: Number(e.target.value),
                    })
                  }
                />
              </Field>
              <Field>
                <FieldLabel>Unité</FieldLabel>
                <Input
                  value={formData.unit || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, unit: e.target.value })
                  }
                  placeholder="boite"
                />
              </Field>
              <Field>
                <FieldLabel>Stock Min</FieldLabel>
                <Input
                  type="number"
                  value={formData.minStock}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      minStock: Number(e.target.value),
                    })
                  }
                />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Field>
                <FieldLabel>Prix Achat (DA)</FieldLabel>
                <Input
                  type="number"
                  value={formData.purchasePriceAmount}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      purchasePriceAmount: Number(e.target.value),
                    })
                  }
                />
              </Field>
              <Field>
                <FieldLabel>Prix Vente (DA)</FieldLabel>
                <Input
                  type="number"
                  value={formData.salePriceAmount}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      salePriceAmount: Number(e.target.value),
                    })
                  }
                />
              </Field>
            </div>

            <Field>
              <FieldLabel>Date d'expiration (optionnel)</FieldLabel>
              <div className="grid grid-cols-3 gap-3">
                <NativeSelect
                  className="w-full"
                  value={
                    formData.expiryDate ? formData.expiryDate.split("-")[1] : ""
                  }
                  onChange={(e) => {
                    const current = formData.expiryDate?.split("-") || [
                      new Date().getFullYear().toString(),
                      "",
                      "01",
                    ]
                    if (e.target.value) {
                      setFormData({
                        ...formData,
                        expiryDate: `${current[0]}-${e.target.value}-${current[2] || "01"}`,
                      })
                    }
                  }}
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
                  className="w-full"
                  value={
                    formData.expiryDate ? formData.expiryDate.split("-")[0] : ""
                  }
                  onChange={(e) => {
                    const current = formData.expiryDate?.split("-") || [
                      "",
                      "01",
                      "01",
                    ]
                    if (e.target.value) {
                      setFormData({
                        ...formData,
                        expiryDate: `${e.target.value}-${current[1] || "01"}-${current[2] || "01"}`,
                      })
                    }
                  }}
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
                    variant="destructive"
                    size="sm"
                    onClick={() => setFormData({ ...formData, expiryDate: "" })}
                  >
                    <HugeiconsIcon
                      icon={Cancel01Icon}
                      strokeWidth={2}
                      className="size-3.5"
                    />
                    Effacer
                  </Button>
                )}
              </div>
              {formData.expiryDate && (
                <p className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                  <HugeiconsIcon
                    icon={Calendar01Icon}
                    strokeWidth={2}
                    className="size-3.5"
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
              <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-border bg-muted/30 p-4 transition-colors hover:bg-muted/50">
                <Checkbox
                  checked={createExpense}
                  onCheckedChange={(checked) => setCreateExpense(!!checked)}
                />
                <div>
                  <span className="text-sm font-medium text-foreground">
                    Générer une dépense
                  </span>
                  <p className="text-xs text-muted-foreground">
                    Ajoutera automatiquement{" "}
                    {formatDZD(
                      toCentimes(
                        (Number(formData.quantity) || 0) *
                          (Number(formData.purchasePriceAmount) || 0)
                      )
                    )}{" "}
                    aux finances
                  </p>
                </div>
              </label>
            )}
          </FieldGroup>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsProductModalOpen(false)}
            >
              Annuler
            </Button>
            <Button
              onClick={handleSaveProduct}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <Spinner className="size-4" />
              ) : (
                <HugeiconsIcon
                  icon={CheckmarkCircle02Icon}
                  strokeWidth={2}
                  className="size-4.5"
                />
              )}
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* --- RESTOCK DIALOG --- */}
      <Dialog
        open={isRestockModalOpen && !!selectedProduct}
        onOpenChange={setIsRestockModalOpen}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Réapprovisionner</DialogTitle>
            <DialogDescription>{selectedProduct?.name}</DialogDescription>
          </DialogHeader>

          <FieldGroup>
            <div className="grid grid-cols-2 gap-4">
              <Field>
                <FieldLabel>Quantité (+)</FieldLabel>
                <Input
                  type="number"
                  value={restockQty}
                  onChange={(e) => setRestockQty(Number(e.target.value))}
                />
              </Field>
              <Field>
                <FieldLabel>Coût Unitaire</FieldLabel>
                <Input
                  type="number"
                  value={restockCost}
                  onChange={(e) => setRestockCost(Number(e.target.value))}
                />
              </Field>
            </div>

            <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-border bg-muted/30 p-4 transition-colors hover:bg-muted/50">
              <Checkbox
                checked={createExpense}
                onCheckedChange={(checked) => setCreateExpense(!!checked)}
              />
              <div>
                <span className="text-sm font-medium text-foreground">
                  Déduire des Finances
                </span>
                <p className="text-xs text-muted-foreground">
                  Total:{" "}
                  <span className="font-bold text-foreground">
                    {formatDZD(toCentimes(restockQty * restockCost))}
                  </span>
                </p>
              </div>
            </label>
          </FieldGroup>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsRestockModalOpen(false)}
            >
              Annuler
            </Button>
            <Button
              onClick={handleRestockSubmit}
              disabled={isSubmitting || restockQty <= 0}
            >
              {isSubmitting ? (
                <Spinner className="size-4" />
              ) : (
                <HugeiconsIcon
                  icon={Refresh01Icon}
                  strokeWidth={2}
                  className="size-4.5"
                />
              )}
              Valider Stock
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default Stock
