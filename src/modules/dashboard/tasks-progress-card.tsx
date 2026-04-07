import { useMemo } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Task01Icon,
  CheckmarkCircle02Icon,
  ArrowRight01Icon,
} from "@hugeicons/core-free-icons"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"

type TaskItem = {
  id: string
  title: string
  status: string
  priority?: string
  dueDate?: string
}

export function TasksProgressCard({
  tasks,
  onNavigate,
}: {
  tasks: TaskItem[]
  onNavigate: () => void
}) {
  const stats = useMemo(() => {
    const total = tasks.length
    const done = tasks.filter((t) => t.status === "done").length
    const pending = total - done
    const percent = total > 0 ? Math.round((done / total) * 100) : 0
    return { total, done, pending, percent }
  }, [tasks])

  const recentPending = useMemo(() => {
    return tasks
      .filter((t) => t.status !== "done")
      .slice(0, 4)
  }, [tasks])

  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <HugeiconsIcon
              icon={Task01Icon}
              strokeWidth={2}
              className="size-4 text-muted-foreground"
            />
            <CardTitle className="text-sm font-medium">Tâches</CardTitle>
            <Badge variant="secondary" className="text-[10px] font-medium">
              {stats.pending} en cours
            </Badge>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 text-xs"
            onClick={onNavigate}
          >
            Tout voir
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-4 pt-0">
        {/* Progress section */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{stats.done} terminée{stats.done > 1 ? "s" : ""}</span>
            <span className="tabular-nums font-medium text-foreground">{stats.percent}%</span>
          </div>
          <Progress value={stats.percent}>
            <span className="sr-only">{stats.percent}% terminé</span>
          </Progress>
        </div>

        <Separator />

        {/* Task list */}
        <div className="flex-1 space-y-1.5 overflow-y-auto">
          {recentPending.length > 0 ? (
            recentPending.map((task) => (
              <div
                key={task.id}
                className="flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-muted/50"
              >
                <div className="flex size-5 shrink-0 items-center justify-center rounded-full border border-border">
                  <div className="size-2 rounded-full" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">
                    {task.title}
                  </p>
                  {task.dueDate && (
                    <p className="text-[10px] text-muted-foreground">
                      Échéance {new Date(task.dueDate).toLocaleDateString("fr-FR", {
                        day: "numeric",
                        month: "short",
                      })}
                    </p>
                  )}
                </div>
                {task.priority === "high" && (
                  <Badge variant="destructive" className="text-[9px]">
                    Urgent
                  </Badge>
                )}
              </div>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center py-4 text-center">
              <HugeiconsIcon
                icon={CheckmarkCircle02Icon}
                strokeWidth={2}
                className="size-6 text-emerald-500"
              />
              <p className="mt-2 text-xs font-medium text-foreground">
                Tout est à jour
              </p>
              <p className="text-[10px] text-muted-foreground">
                Aucune tâche en attente
              </p>
            </div>
          )}
        </div>

        <Button
          variant="outline"
          size="sm"
          className="mt-auto w-full gap-1 text-xs"
          onClick={onNavigate}
        >
          Gérer les tâches
          <HugeiconsIcon
            icon={ArrowRight01Icon}
            strokeWidth={2}
            className="size-3"
          />
        </Button>
      </CardContent>
    </Card>
  )
}
