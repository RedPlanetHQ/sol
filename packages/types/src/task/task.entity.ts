import { IsEnum, IsOptional, IsString } from 'class-validator';

import { JsonValue } from '../common';
import { Conversation } from '../conversation';
import { List } from '../list';
import { Page, PublicPage } from '../page';
import { TaskOccurrence } from '../task-occurrence/task-occurrence.entity';
import { Workspace } from '../workspace';

export enum SourceType {
  EXTERNAL = 'external',
  PAGE = 'page',
  TASK = 'task',
  LIST = 'list',
}

export class Source {
  @IsOptional()
  @IsEnum(SourceType)
  type?: SourceType;

  @IsOptional()
  @IsString()
  url?: string;
}

export enum TaskType {
  NORMAL = 'NORMAL',
  SCHEDULED = 'SCHEDULED',
  INSTRUCTION = 'INSTRUCTION',
}

export interface TaskMetadata {
  type: TaskType;
}

export type TaskHookAction = 'create' | 'update' | 'delete';

export interface TaskHookContext {
  workspaceId: string;
  userId: string;
  action: TaskHookAction;
  changeData: Record<string, any>;
}

export class Task {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  deleted?: Date;
  atchived?: Date;

  number?: number;
  completedAt?: Date;

  updatedBy: string;
  status?: string;
  metadata?: JsonValue;

  startTime?: Date;
  endTime?: Date;
  recurrence?: string[];
  scheduleText?: string;
  dueDate?: Date;
  remindAt?: Date;
  tags?: string[];

  source?: any;

  page?: Page | PublicPage;
  pageId: string;

  workspace?: Workspace;
  workspaceId: string;

  list?: List;
  listId?: string;

  parent?: Task;
  parentId?: string;
  subIssue?: Task[];

  integrationAccountId?: string;

  taskOccurrence?: TaskOccurrence[];
  conversation?: Conversation[];
}
