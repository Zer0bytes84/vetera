"use client";

import { Add01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export type DashboardRow = {
  id: string | number;
  patient: string;
  owner: string;
  type: string;
  appointmentAt: string;
  status: string;
  veterinarian: string;
  summary: string;
  notes: string;
  diagnosis: string;
  treatment: string;
  tab: "planning" | "aujourdhui" | "attention" | "termine";
};

function statusVariant(status: string): "default" | "secondary" | "outline" {
  if (status === "Urgence") {
    return "default";
  }
  if (status === "Terminé" || status === "Completed") {
    return "secondary";
  }
  return "outline";
}

export function DataTable({
  data,
  onCreate,
}: {
  data: DashboardRow[];
  onCreate?: () => void;
}) {
  const { t } = useTranslation();
  const [query, setQuery] = React.useState("");
  const [view, setView] = React.useState<DashboardRow["tab"]>("planning");
  const tabs: Array<{ value: DashboardRow["tab"]; label: string }> = [
    { value: "planning", label: t("dataTable.tabs.planning") },
    { value: "aujourdhui", label: t("dataTable.tabs.today") },
    { value: "attention", label: t("dataTable.tabs.attention") },
    { value: "termine", label: t("dataTable.tabs.done") },
  ];

  const filtered = React.useMemo(() => {
    const needle = query.trim().toLowerCase();
    return data.filter((row) => {
      const matchesTab = view === "planning" ? true : row.tab === view;
      const matchesQuery =
        !needle ||
        [
          row.patient,
          row.owner,
          row.type,
          row.status,
          row.summary,
          row.veterinarian,
        ]
          .join(" ")
          .toLowerCase()
          .includes(needle);

      return matchesTab && matchesQuery;
    });
  }, [data, query, view]);

  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-b px-6 py-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <CardDescription>{t("dataTable.description")}</CardDescription>
            <CardTitle className="text-2xl tracking-[-0.04em]">
              {t("dataTable.title")}
            </CardTitle>
          </div>
          <CardAction className="self-start lg:self-auto">
            <Button onClick={onCreate}>
              <HugeiconsIcon
                data-icon="inline-start"
                icon={Add01Icon}
                strokeWidth={2}
              />
              {t("dataTable.newAppointment")}
            </Button>
          </CardAction>
        </div>
      </CardHeader>
      <CardContent className="px-0 pb-0">
        <div className="flex flex-col gap-4 px-6 pt-4 pb-5">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <Tabs
              onValueChange={(value) => setView(value as DashboardRow["tab"])}
              value={view}
            >
              <TabsList>
                {tabs.map((tab) => (
                  <TabsTrigger key={tab.value} value={tab.value}>
                    {tab.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
            <Input
              className="w-full xl:max-w-sm"
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t("dataTable.searchPlaceholder")}
              value={query}
            />
          </div>
        </div>
        <Separator />
        <div className="px-6 pt-6 pb-6">
          <div className="overflow-hidden rounded-2xl border">
            <Table className="table-fixed">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[30%] pl-6">
                    {t("dataTable.headers.patient")}
                  </TableHead>
                  <TableHead className="hidden w-[20%] xl:table-cell">
                    {t("dataTable.headers.owner")}
                  </TableHead>
                  <TableHead className="w-[16%]">
                    {t("dataTable.headers.act")}
                  </TableHead>
                  <TableHead className="w-[18%]">
                    {t("dataTable.headers.slot")}
                  </TableHead>
                  <TableHead className="w-[10%]">
                    {t("dataTable.headers.status")}
                  </TableHead>
                  <TableHead className="w-[12%] pr-6 text-right">
                    {t("dataTable.headers.action")}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length > 0 ? (
                  filtered.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="pl-6 align-top">
                        <div className="min-w-0 break-words font-medium">
                          {row.patient}
                        </div>
                        <div className="break-words text-muted-foreground text-sm">
                          {row.summary}
                        </div>
                        <div className="mt-1 break-words text-muted-foreground text-sm xl:hidden">
                          {row.owner}
                        </div>
                      </TableCell>
                      <TableCell className="hidden align-top xl:table-cell">
                        <div className="min-w-0 break-words font-medium">
                          {row.owner}
                        </div>
                        <div className="break-words text-muted-foreground text-sm">
                          {row.veterinarian}
                        </div>
                      </TableCell>
                      <TableCell className="align-top">
                        <div className="break-words">{row.type}</div>
                      </TableCell>
                      <TableCell className="align-top">
                        <div className="break-words pr-3 text-sm leading-6 sm:text-base">
                          {row.appointmentAt}
                        </div>
                      </TableCell>
                      <TableCell className="align-top">
                        <Badge
                          className="inline-flex max-w-full whitespace-normal break-words px-2 py-0.5 text-center text-xs"
                          variant={statusVariant(row.status)}
                        >
                          {row.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="pr-6 text-right align-top">
                        <Dialog>
                          <DialogTrigger
                            render={
                              <Button
                                className="h-8 px-2 text-xs sm:px-3 sm:text-sm"
                                size="sm"
                                variant="ghost"
                              />
                            }
                          >
                            {t("dataTable.consult")}
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl">
                            <DialogHeader>
                              <DialogTitle>{row.patient}</DialogTitle>
                              <DialogDescription>
                                {row.type} · {row.appointmentAt}
                              </DialogDescription>
                            </DialogHeader>
                            <div className="grid gap-4 py-2 sm:grid-cols-2">
                              <div className="rounded-xl border p-4">
                                <div className="font-medium text-sm">
                                  {t("dataTable.headers.owner")}
                                </div>
                                <div className="mt-1 text-muted-foreground text-sm">
                                  {row.owner}
                                </div>
                              </div>
                              <div className="rounded-xl border p-4">
                                <div className="font-medium text-sm">
                                  {t("dataTable.veterinarian")}
                                </div>
                                <div className="mt-1 text-muted-foreground text-sm">
                                  {row.veterinarian}
                                </div>
                              </div>
                              <div className="rounded-xl border p-4 sm:col-span-2">
                                <div className="font-medium text-sm">
                                  {t("dataTable.notes")}
                                </div>
                                <div className="mt-1 text-muted-foreground text-sm">
                                  {row.notes || t("dataTable.noClinicalNote")}
                                </div>
                              </div>
                              <div className="rounded-xl border p-4">
                                <div className="font-medium text-sm">
                                  {t("dataTable.diagnosis")}
                                </div>
                                <div className="mt-1 text-muted-foreground text-sm">
                                  {row.diagnosis || t("dataTable.notProvided")}
                                </div>
                              </div>
                              <div className="rounded-xl border p-4">
                                <div className="font-medium text-sm">
                                  {t("dataTable.treatment")}
                                </div>
                                <div className="mt-1 text-muted-foreground text-sm">
                                  {row.treatment || t("dataTable.notProvided")}
                                </div>
                              </div>
                            </div>
                            <DialogFooter>
                              <DialogClose
                                render={<Button variant="outline" />}
                              >
                                Fermer
                              </DialogClose>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      className="h-28 text-center text-muted-foreground text-sm"
                      colSpan={6}
                    >
                      Aucun dossier ne correspond aux filtres actifs.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
