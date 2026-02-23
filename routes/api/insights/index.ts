import { type Handlers } from "$fresh/server.ts";
import { getSession } from "../../../lib/auth.ts";
import { prisma } from "../../../lib/db.ts";
import type { ApiResponse } from "../../../lib/types.ts";

interface ProjectStat {
  projectName: string;
  entryCount: number;
  lastEntryAt: string | null;
}

interface TaskStat {
  taskTitle: string;
  entryCount: number;
}

interface TensionPoint {
  date: string;
  avgTension: number;
}

interface StalledProject {
  id: string;
  name: string;
  daysSinceLastEntry: number;
}

interface ActivitySummary {
  thisWeek: number;
  thisMonth: number;
  total: number;
}

export interface InsightsData {
  projectStats: ProjectStat[];
  taskStats: TaskStat[];
  tensionHistory: TensionPoint[];
  stalledProjects: StalledProject[];
  activitySummary: ActivitySummary;
}

export const handler: Handlers = {
  async GET(req) {
    const session = await getSession(req);
    if (!session) {
      return Response.json(
        { success: false, error: "Unauthorized" } satisfies ApiResponse,
        { status: 401 },
      );
    }

    const url = new URL(req.url);
    const period = url.searchParams.get("period") === "90d" ? 90 : 30;
    const periodStart = new Date();
    periodStart.setDate(periodStart.getDate() - period);

    const now = new Date();

    // 今週の月曜日を取得
    const weekStart = new Date(now);
    const dayOfWeek = weekStart.getDay();
    const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    weekStart.setDate(weekStart.getDate() - diffToMonday);
    weekStart.setHours(0, 0, 0, 0);

    // 今月の初日を取得
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // ユーザーが参加しているプロジェクトIDを取得
    const userProjects = await prisma.project.findMany({
      where: {
        OR: [
          { ownerId: session.userId },
          { members: { some: { userId: session.userId } } },
        ],
      },
      select: { id: true, name: true },
    });
    const projectIds = userProjects.map((p) => p.id);
    const projectNameMap = new Map(userProjects.map((p) => [p.id, p.name]));

    // 期間内の分報を取得
    const entries = await prisma.entry.findMany({
      where: {
        userId: session.userId,
        createdAt: { gte: periodStart },
      },
      select: {
        id: true,
        projectId: true,
        taskId: true,
        tension: true,
        createdAt: true,
      },
      orderBy: { createdAt: "asc" },
    });

    // --- projectStats ---
    const projectEntryMap = new Map<string, { count: number; lastAt: Date | null }>();
    for (const entry of entries) {
      if (!entry.projectId) continue;
      const current = projectEntryMap.get(entry.projectId) || { count: 0, lastAt: null };
      current.count++;
      if (!current.lastAt || entry.createdAt > current.lastAt) {
        current.lastAt = entry.createdAt;
      }
      projectEntryMap.set(entry.projectId, current);
    }

    const projectStats: ProjectStat[] = [];
    for (const [projectId, stat] of projectEntryMap) {
      const name = projectNameMap.get(projectId);
      if (name) {
        projectStats.push({
          projectName: name,
          entryCount: stat.count,
          lastEntryAt: stat.lastAt?.toISOString() ?? null,
        });
      }
    }
    projectStats.sort((a, b) => b.entryCount - a.entryCount);

    // --- taskStats ---
    const taskEntryMap = new Map<string, number>();
    for (const entry of entries) {
      if (!entry.taskId) continue;
      taskEntryMap.set(entry.taskId, (taskEntryMap.get(entry.taskId) || 0) + 1);
    }

    const taskIds = Array.from(taskEntryMap.keys());
    const tasks = taskIds.length > 0
      ? await prisma.task.findMany({
        where: { id: { in: taskIds } },
        select: { id: true, title: true },
      })
      : [];
    const taskNameMap = new Map(tasks.map((t) => [t.id, t.title]));

    const taskStats: TaskStat[] = [];
    for (const [taskId, count] of taskEntryMap) {
      const title = taskNameMap.get(taskId);
      if (title) {
        taskStats.push({ taskTitle: title, entryCount: count });
      }
    }
    taskStats.sort((a, b) => b.entryCount - a.entryCount);

    // --- tensionHistory ---
    const tensionByDate = new Map<string, { sum: number; count: number }>();
    for (const entry of entries) {
      if (entry.tension === null) continue;
      const dateKey = entry.createdAt.toISOString().slice(0, 10);
      const current = tensionByDate.get(dateKey) || { sum: 0, count: 0 };
      current.sum += entry.tension;
      current.count++;
      tensionByDate.set(dateKey, current);
    }

    const tensionHistory: TensionPoint[] = Array.from(tensionByDate.entries())
      .map(([date, { sum, count }]) => ({
        date,
        avgTension: Math.round((sum / count) * 10) / 10,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // --- stalledProjects ---
    const stalledProjects: StalledProject[] = [];
    for (const projectId of projectIds) {
      const lastEntry = await prisma.entry.findFirst({
        where: { projectId, userId: session.userId },
        orderBy: { createdAt: "desc" },
        select: { createdAt: true },
      });

      const daysSince = lastEntry
        ? Math.floor(
          (now.getTime() - lastEntry.createdAt.getTime()) / (1000 * 60 * 60 * 24),
        )
        : Infinity;

      if (daysSince >= 7) {
        const name = projectNameMap.get(projectId);
        if (name) {
          stalledProjects.push({
            id: projectId,
            name,
            daysSinceLastEntry: daysSince === Infinity ? -1 : daysSince,
          });
        }
      }
    }
    stalledProjects.sort((a, b) => b.daysSinceLastEntry - a.daysSinceLastEntry);

    // --- activitySummary ---
    const allEntries = await prisma.entry.count({
      where: { userId: session.userId },
    });
    const thisWeekCount = await prisma.entry.count({
      where: { userId: session.userId, createdAt: { gte: weekStart } },
    });
    const thisMonthCount = await prisma.entry.count({
      where: { userId: session.userId, createdAt: { gte: monthStart } },
    });

    const activitySummary: ActivitySummary = {
      thisWeek: thisWeekCount,
      thisMonth: thisMonthCount,
      total: allEntries,
    };

    const data: InsightsData = {
      projectStats,
      taskStats,
      tensionHistory,
      stalledProjects,
      activitySummary,
    };

    return Response.json({ success: true, data } satisfies ApiResponse<InsightsData>);
  },
};
