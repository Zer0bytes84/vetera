import {
  BotIcon,
  ChevronDown,
  Logout01Icon,
  Menu01Icon,
  Moon02Icon,
  SearchIcon,
  Settings01Icon,
  Sun03Icon,
  Task01Icon,
  User02Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { getViewTitle } from "@/app/config/navigation";
import Avatar from "@/components/Avatar";
import { Button } from "@/components/ui/button";
import {
  useProductsRepository,
  useTasksRepository,
  useUsersRepository,
} from "@/data/repositories";
import { Input } from "@/shared/ui/input";
import type { View } from "@/types";

export function AppHeader({
  isScrolled,
  currentView,
  currentUserEmail,
  currentUserDisplayName,
  isDarkMode,
  onNavigate,
  onOpenPalette,
  onOpenAssistant,
  onToggleMobileNav,
  onToggleTheme,
  onLogout,
}: {
  isScrolled: boolean;
  currentView: View;
  currentUserEmail: string | null;
  currentUserDisplayName: string | null;
  isDarkMode: boolean;
  onNavigate: (view: View) => void;
  onOpenPalette: () => void;
  onOpenAssistant: () => void;
  onToggleMobileNav: () => void;
  onToggleTheme: () => void;
  onLogout: () => Promise<void>;
}) {
  const { t } = useTranslation();
  const { data: users } = useUsersRepository();
  const { data: tasks } = useTasksRepository();
  const { data: products } = useProductsRepository();
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const notificationsRef = useRef<HTMLDivElement | null>(null);

  const currentUser = users.find((user) => user.email === currentUserEmail);
  const userLabelSource =
    currentUserDisplayName ||
    currentUser?.displayName ||
    currentUserEmail ||
    "Utilisateur";
  const userName =
    userLabelSource.split("@")[0].trim().split(/\s+/)[0] || "Utilisateur";
  const pageTitle = getViewTitle(currentView, t);
  const notificationItems = useMemo(() => {
    const urgentTasks = tasks
      .filter(
        (task) =>
          task.status !== "done" && (task.priority === "high" || task.dueDate)
      )
      .slice(0, 4)
      .map((task) => ({
        id: `task-${task.id}`,
        title: task.title,
        description: task.dueDate
          ? `Échéance ${task.dueDate}`
          : "Tâche prioritaire à traiter",
        target: "taches" as View,
        kind: "task" as const,
      }));

    const stockAlerts = products
      .filter((product) => product.quantity <= product.minStock)
      .slice(0, 4)
      .map((product) => ({
        id: `product-${product.id}`,
        title: product.name,
        description: `Stock bas: ${product.quantity} ${product.unit} restants`,
        target: "stock" as View,
        kind: "stock" as const,
      }));

    return [...urgentTasks, ...stockAlerts].slice(0, 7);
  }, [products, tasks]);

  const notifications = notificationItems.length;
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) {
        setAccountMenuOpen(false);
      }
      if (!notificationsRef.current?.contains(event.target as Node)) {
        setNotificationsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <header className="sticky top-0 z-20 shrink-0 transition-all duration-200">
      <div
        className={`flex items-center justify-between gap-4 px-5 py-3.5 transition-all duration-300 md:px-6 ${
          isScrolled
            ? "border-black/6 border-b bg-white/54 backdrop-blur-2xl backdrop-saturate-150 dark:border-white/8 dark:bg-[rgba(10,12,18,0.48)]"
            : "bg-transparent"
        }`}
      >
        <div
          className="flex min-w-0 flex-1 items-center gap-2"
          data-tauri-drag-region
        >
          <Button
            className="lg:hidden"
            onClick={onToggleMobileNav}
            size="icon-sm"
            variant="ghost"
          >
            <HugeiconsIcon
              className="size-4"
              icon={Menu01Icon}
              strokeWidth={2}
            />
          </Button>
          <div className="min-w-0">
            <h1
              className="truncate font-heading font-semibold text-[1.25rem] tracking-[-0.03em] md:text-[1.35rem]"
              style={{
                background:
                  "linear-gradient(135deg, #ea580c 0%, #f97316 52%, #fb923c 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              {pageTitle}
            </h1>
          </div>
        </div>

        <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
          <button
            className="hidden w-[170px] text-left md:block lg:w-[210px]"
            onClick={onOpenPalette}
          >
            <div className="relative">
              <HugeiconsIcon
                className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                icon={SearchIcon}
                strokeWidth={2}
              />
              <Input
                className="h-10 cursor-pointer rounded-2xl border-black/6 bg-white/72 pr-12 pl-9 text-sm shadow-[0_1px_0_rgba(255,255,255,0.85)_inset] backdrop-blur-xl hover:bg-white/86 dark:border-white/8 dark:bg-white/6 dark:hover:bg-white/10"
                placeholder="Rechercher..."
                readOnly
                value=""
              />
              <span className="pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 rounded-lg border border-black/6 bg-white/80 px-1.5 py-0.5 font-semibold text-[10px] text-muted-foreground tracking-wide dark:border-white/8 dark:bg-white/8">
                ⌘K
              </span>
            </div>
          </button>
          <Button
            className="size-10 rounded-2xl border border-black/6 bg-white/70 text-muted-foreground hover:bg-white hover:text-foreground dark:border-white/8 dark:bg-white/6 dark:hover:bg-white/10"
            onClick={onOpenAssistant}
            size="icon-sm"
            variant="ghost"
          >
            <HugeiconsIcon
              className="size-[18px]"
              icon={BotIcon}
              strokeWidth={2}
            />
          </Button>
          <div className="relative" ref={notificationsRef}>
            <Button
              className="relative size-10 rounded-2xl border border-black/6 bg-white/70 text-muted-foreground hover:bg-white hover:text-foreground dark:border-white/8 dark:bg-white/6 dark:hover:bg-white/10"
              onClick={() => setNotificationsOpen((current) => !current)}
              size="icon-sm"
              variant="ghost"
            >
              <HugeiconsIcon
                className="size-[18px]"
                icon={Task01Icon}
                strokeWidth={2}
              />
              {notifications > 0 ? (
                <span className="glow-ring absolute -top-0.5 -right-0.5 flex size-[18px] items-center justify-center rounded-full bg-gradient-to-r from-rose-500 to-pink-500 font-bold text-[9px] text-white shadow-lg shadow-rose-500/30">
                  {notifications}
                </span>
              ) : null}
            </Button>

            {notificationsOpen ? (
              <div className="absolute top-[calc(100%+0.5rem)] right-0 z-30 min-w-[340px] rounded-2xl border border-border bg-card p-2.5 shadow-[var(--shadow-lift)] backdrop-blur-3xl">
                <div className="flex items-center justify-between px-3 py-2">
                  <div>
                    <p className="font-semibold text-foreground text-sm">
                      Notifications
                    </p>
                    <p className="text-muted-foreground text-xs">
                      Alertes de la clinique
                    </p>
                  </div>
                  {notifications > 0 ? (
                    <span className="rounded-full bg-muted px-2 py-0.5 font-medium text-[11px] text-muted-foreground">
                      {notifications}
                    </span>
                  ) : null}
                </div>

                <div className="mt-1 space-y-0.5">
                  {notificationItems.length > 0 ? (
                    notificationItems.map((item) => (
                      <button
                        className="flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left transition hover:bg-muted"
                        key={item.id}
                        onClick={() => {
                          setNotificationsOpen(false);
                          onNavigate(item.target);
                        }}
                        type="button"
                      >
                        <span
                          className={`mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full font-semibold text-xs ${
                            item.kind === "task"
                              ? "bg-amber-100 text-amber-700 dark:bg-amber-500/12 dark:text-amber-300"
                              : "bg-indigo-100 text-indigo-700 dark:bg-indigo-500/12 dark:text-indigo-300"
                          }`}
                        >
                          {item.kind === "task" ? "!" : "•"}
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate font-medium text-foreground text-sm">
                            {item.title}
                          </span>
                          <span className="mt-0.5 block text-muted-foreground text-xs">
                            {item.description}
                          </span>
                        </span>
                      </button>
                    ))
                  ) : (
                    <div className="px-3 py-8 text-center">
                      <p className="font-medium text-foreground text-sm">
                        Aucune notification
                      </p>
                      <p className="mt-1 text-muted-foreground text-xs">
                        Tout est calme pour le moment.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ) : null}
          </div>
          <Button
            className="size-10 rounded-2xl border border-black/6 bg-white/70 text-muted-foreground hover:bg-white hover:text-foreground dark:border-white/8 dark:bg-white/6 dark:hover:bg-white/10"
            onClick={onToggleTheme}
            size="icon-sm"
            variant="ghost"
          >
            {isDarkMode ? (
              <HugeiconsIcon
                className="size-[18px]"
                icon={Sun03Icon}
                strokeWidth={2}
              />
            ) : (
              <HugeiconsIcon
                className="size-[18px]"
                icon={Moon02Icon}
                strokeWidth={2}
              />
            )}
          </Button>
          <div className="relative ml-0.5" ref={menuRef}>
            <button
              className="flex h-10 items-center gap-2 rounded-2xl border border-black/6 bg-white/74 px-2.5 py-1 transition hover:bg-white dark:border-white/8 dark:bg-white/6 dark:hover:bg-white/10"
              onClick={() => setAccountMenuOpen((current) => !current)}
              type="button"
            >
              <Avatar
                className="border-0 shadow-none ring-0"
                name={userLabelSource}
                size="sm"
                src={currentUser?.avatarUrl}
              />
              <span className="max-w-[90px] truncate font-medium text-foreground text-sm">
                {userName}
              </span>
              <HugeiconsIcon
                className={`size-3.5 text-muted-foreground transition ${accountMenuOpen ? "rotate-180" : ""}`}
                icon={ChevronDown}
                strokeWidth={2}
              />
            </button>

            {accountMenuOpen ? (
              <div className="absolute top-[calc(100%+0.5rem)] right-0 z-30 min-w-[220px] rounded-2xl border border-border bg-card p-2 shadow-[var(--shadow-lift)] backdrop-blur-3xl">
                <button
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-foreground text-sm transition hover:bg-muted"
                  onClick={() => {
                    setAccountMenuOpen(false);
                    onNavigate("equipe");
                  }}
                  type="button"
                >
                  <HugeiconsIcon
                    className="size-4 text-muted-foreground"
                    icon={User02Icon}
                    strokeWidth={2}
                  />
                  <span>Profil</span>
                </button>
                <button
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-foreground text-sm transition hover:bg-muted"
                  onClick={() => {
                    setAccountMenuOpen(false);
                    onNavigate("parametres");
                  }}
                  type="button"
                >
                  <HugeiconsIcon
                    className="size-4 text-muted-foreground"
                    icon={Settings01Icon}
                    strokeWidth={2}
                  />
                  <span>Paramètres</span>
                </button>
                <div className="my-1 h-px bg-border" />
                <button
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-red-600 text-sm transition hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10"
                  onClick={async () => {
                    setAccountMenuOpen(false);
                    await onLogout();
                  }}
                  type="button"
                >
                  <HugeiconsIcon
                    className="size-4"
                    icon={Logout01Icon}
                    strokeWidth={2}
                  />
                  <span>Déconnexion</span>
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </header>
  );
}
