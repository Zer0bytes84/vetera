import {
  FileText,
  Image as ImageIcon,
  Plus,
  Trash,
  UploadSimple,
} from "@phosphor-icons/react";
import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { useConsultationDocumentsRepository } from "@/data/repositories";
import { cn } from "@/lib/utils";
import type { ConsultationDocument } from "@/types/db";

interface PatientDocumentsListProps {
  className?: string;
  onOpenDocument?: (document: ConsultationDocument) => void;
  onUpload?: () => void;
  patientId: string;
}

const CATEGORY_META: Record<
  ConsultationDocument["category"],
  { icon: typeof FileText; label: string; className: string }
> = {
  pdf: {
    icon: FileText,
    label: "PDF",
    className:
      "bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300",
  },
  image: {
    icon: ImageIcon,
    label: "Image",
    className:
      "bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-300",
  },
  other: {
    icon: FileText,
    label: "Autre",
    className:
      "bg-zinc-200 text-zinc-700 dark:bg-zinc-700/40 dark:text-zinc-300",
  },
};

function formatBytes(bytes: number) {
  if (bytes < 1024) {
    return `${bytes} o`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} ko`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(2)} Mo`;
}

function formatDate(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return "—";
  }
  return date.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function PatientDocumentsList({
  className,
  onOpenDocument,
  onUpload,
  patientId,
}: PatientDocumentsListProps) {
  const { t } = useTranslation();
  const repo = useConsultationDocumentsRepository();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const docs = repo.data
    .filter((doc) => doc.patientId === patientId)
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    if (file.size > 12 * 1024 * 1024) {
      toast.error("Le fichier dépasse 12 Mo.");
      return;
    }

    setIsUploading(true);
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const dataUrl = e.target?.result as string;
        const category = file.type.includes("pdf")
          ? "pdf"
          : file.type.startsWith("image/")
          ? "image"
          : "other";
        
        await repo.add({
          patientId,
          appointmentId: "",
          fileName: file.name,
          mimeType: file.type,
          sizeBytes: file.size,
          category,
          dataUrl,
        } as any);
        toast.success("Document ajouté avec succès !");
      } catch (err) {
        toast.error("Erreur lors de l'ajout du document.");
      } finally {
        setIsUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    };
    reader.readAsDataURL(file);
  };

  const triggerUpload = () => {
    if (onUpload) {
      onUpload();
    } else {
      fileInputRef.current?.click();
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await repo.remove(id);
      toast.success("Document supprimé avec succès.");
    } catch (err) {
      toast.error("Erreur lors de la suppression.");
    }
  };

  const handleOpen = (doc: ConsultationDocument) => {
    if (onOpenDocument) {
      onOpenDocument(doc);
    } else {
      window.open(doc.dataUrl, "_blank");
    }
  };

  return (
    <div className={cn("bg-card border border-border dark:border-border rounded-[16px] p-6 shadow-sm flex flex-col", className)}>
      <div className="flex flex-row items-start justify-between gap-2 mb-6">
        <div>
          <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
            {t("patientDetail.documents.title")}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            {t("patientDetail.documents.count", { count: docs.length })}
          </div>
        </div>
        <input
          type="file"
          className="hidden"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept=".pdf,image/*"
        />
        <Button
          className="h-8 gap-1.5 rounded-lg"
          onClick={triggerUpload}
          size="sm"
          variant="default"
          disabled={isUploading}
        >
          <Plus weight="bold" className="size-3.5" />
          {isUploading ? "Import..." : t("patientDetail.documents.upload")}
        </Button>
      </div>
      <div className="flex flex-col flex-1">
        {docs.length === 0 ? (
          <Empty>
            <EmptyHeader>
              <EmptyMedia>
                <UploadSimple
                  className="size-7 text-muted-foreground"
                  weight="duotone"
                />
              </EmptyMedia>
              <EmptyTitle>{t("patientDetail.documents.empty")}</EmptyTitle>
              <EmptyDescription>
                {t("patientDetail.documents.upload")}
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button onClick={triggerUpload} size="sm" variant="outline" disabled={isUploading}>
                <UploadSimple weight="duotone" className="size-4" />
                {isUploading ? "Import..." : t("patientDetail.documents.upload")}
              </Button>
            </EmptyContent>
          </Empty>
        ) : (
          <ul className="divide-y divide-border/40">
            {docs.map((doc) => {
              const meta = CATEGORY_META[doc.category] ?? CATEGORY_META.other;
              const Icon = meta.icon;
              return (
                <li
                  className="flex items-center gap-3 py-3 first:pt-0 last:pb-0"
                  key={doc.id}
                >
                  <span
                    className={cn(
                      "flex size-9 shrink-0 items-center justify-center rounded-lg",
                      meta.className
                    )}
                  >
                    <Icon weight="duotone" className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1 flex items-center justify-between gap-2">
                    <button
                      className="min-w-0 flex-1 text-left"
                      onClick={() => handleOpen(doc)}
                      type="button"
                    >
                      <div className="flex items-center gap-2">
                        <span className="truncate text-sm font-medium">
                          {doc.fileName}
                        </span>
                        <Badge
                          className="rounded-full px-1.5 py-0 text-[10px] font-medium"
                          variant="outline"
                        >
                          {meta.label}
                        </Badge>
                      </div>
                      <div className="mt-0.5 flex items-center gap-2 text-[11px] text-muted-foreground">
                        <span>{formatDate(doc.createdAt)}</span>
                        <span aria-hidden>·</span>
                        <span>{formatBytes(doc.sizeBytes)}</span>
                        {doc.description ? (
                          <>
                            <span aria-hidden>·</span>
                            <span className="truncate">{doc.description}</span>
                          </>
                        ) : null}
                      </div>
                    </button>
                    <Button
                      aria-label="Supprimer le document"
                      className="size-8 text-muted-foreground hover:text-destructive shrink-0"
                      onClick={(e) => void handleDelete(doc.id, e)}
                      size="icon"
                      variant="ghost"
                    >
                      <Trash weight="duotone" className="size-4" />
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
