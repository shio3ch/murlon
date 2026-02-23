import { prisma } from "./db.ts";
import { PrismaEntryRepository } from "../infrastructure/database/entry.repository.impl.ts";
import {
  PrismaProjectMemberRepository,
  PrismaProjectRepository,
} from "../infrastructure/database/project.repository.impl.ts";
import { PrismaReportRepository } from "../infrastructure/database/report.repository.impl.ts";
import { PrismaTaskRepository } from "../infrastructure/database/task.repository.impl.ts";
import { PrismaReactionRepository } from "../infrastructure/database/reaction.repository.impl.ts";
import { PrismaCommentRepository } from "../infrastructure/database/comment.repository.impl.ts";
import { PrismaStandupRepository } from "../infrastructure/database/standup.repository.impl.ts";
import { PrismaTemplateRepository } from "../infrastructure/database/template.repository.impl.ts";
import { PrismaIntegrationRepository } from "../infrastructure/database/integration.repository.impl.ts";
import { PrismaUserRepository } from "../infrastructure/database/user.repository.impl.ts";

export const entryRepository = new PrismaEntryRepository(prisma);
export const projectRepository = new PrismaProjectRepository(prisma);
export const projectMemberRepository = new PrismaProjectMemberRepository(prisma);
export const reportRepository = new PrismaReportRepository(prisma);
export const taskRepository = new PrismaTaskRepository(prisma);
export const reactionRepository = new PrismaReactionRepository(prisma);
export const commentRepository = new PrismaCommentRepository(prisma);
export const standupRepository = new PrismaStandupRepository(prisma);
export const templateRepository = new PrismaTemplateRepository(prisma);
export const integrationRepository = new PrismaIntegrationRepository(prisma);
export const userRepository = new PrismaUserRepository(prisma);
