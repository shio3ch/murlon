import { useSignal } from "@preact/signals";
import type { ProjectRecord, Visibility } from "../lib/types.ts";

interface ProjectWithMemberCount extends ProjectRecord {
  memberCount: number;
}

interface ProjectListProps {
  initialProjects: ProjectWithMemberCount[];
  userId: string;
}

function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function visibilityLabel(v: Visibility): string {
  switch (v) {
    case "PRIVATE":
      return "非公開";
    case "LIMITED":
      return "限定公開";
    case "PUBLIC":
      return "公開";
  }
}

function visibilityColor(v: Visibility): string {
  switch (v) {
    case "PRIVATE":
      return "bg-gray-100 text-gray-600";
    case "LIMITED":
      return "bg-yellow-100 text-yellow-700";
    case "PUBLIC":
      return "bg-green-100 text-green-700";
  }
}

export default function ProjectList({ initialProjects, userId }: ProjectListProps) {
  const projects = useSignal<ProjectWithMemberCount[]>(initialProjects);

  if (projects.value.length === 0) {
    return (
      <div class="text-center py-12 text-gray-400">
        <p class="text-4xl mb-3">📁</p>
        <p class="text-sm">まだプロジェクトがありません。</p>
        <a
          href="/projects/new"
          class="inline-block mt-4 bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
        >
          最初のプロジェクトを作成
        </a>
      </div>
    );
  }

  return (
    <div class="space-y-3">
      {projects.value.map((project) => (
        <a
          key={project.id}
          href={`/projects/${project.id}`}
          class="block bg-white rounded-xl shadow-sm border border-gray-200 p-4 hover:border-brand-300 hover:shadow-md transition-all"
        >
          <div class="flex items-start justify-between">
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2">
                <h3 class="text-base font-semibold text-gray-900 truncate">
                  {project.name}
                </h3>
                <span
                  class={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    visibilityColor(project.visibility)
                  }`}
                >
                  {visibilityLabel(project.visibility)}
                </span>
                {project.ownerId === userId && (
                  <span class="text-xs px-2 py-0.5 rounded-full bg-brand-50 text-brand-700 font-medium">
                    オーナー
                  </span>
                )}
              </div>
              {project.description && (
                <p class="text-sm text-gray-500 mt-1 line-clamp-2">
                  {project.description}
                </p>
              )}
            </div>
          </div>

          <div class="flex items-center gap-4 mt-3 text-xs text-gray-400">
            <span>メンバー {project.memberCount}人</span>
            <span>作成日 {formatDate(project.createdAt)}</span>
          </div>
        </a>
      ))}
    </div>
  );
}
