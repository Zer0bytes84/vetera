import {
  FileText,
  Image as ImageIcon,
  Plus,
  UploadSimple,
} from "@phosphor-icons/react";
import { useTranslation } from "react-i18next";

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
  const docs = repo.data
    .filter((doc) => doc.patientId === patientId)
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0">
        <div>
          <CardTitle className="text-base">
            {t("patientDetail.documents.title")}
          </CardTitle>
          <CardDescription className="text-xs">
            {t("patientDetail.documents.count", { count: docs.length })}
          </CardDescription>
        </div>
        {onUpload ? (
          <Button
            className="h-8 gap-1.5"
            onClick={onUpload}
            size="sm"
            variant="outline"
          >
            <Plus weight="duotone" className="size-4" />
            {t("patientDetail.documents.upload")}
          </Button>
        ) : null}
      </CardHeader>
      <CardContent>
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
            {onUpload ? (
              <EmptyContent>
                <Button onClick={onUpload} size="sm" variant="outline">
                  <UploadSimple weight="duotone" className="size-4" />
                  {t("patientDetail.documents.upload")}
                </Button>
              </EmptyContent>
            ) : null}
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
                  <button
                    className="min-w-0 flex-1 text-left"
                    onClick={() => onOpenDocument?.(doc)}
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
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
