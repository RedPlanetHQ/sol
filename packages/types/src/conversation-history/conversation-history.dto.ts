import { IsString } from 'class-validator';

import { Page } from '../page';
import { Task } from '../task';

export class ConversationHistoryParamsDto {
  @IsString()
  conversationHistoryId: string;
}

export interface Resource {
  id?: string;
  size?: number;
  fileType: string;
  publicURL: string;
  originalName?: string;
}

export class ConversationContextData {
  pages?: string[];
  lists?: string[];
  tasks?: string[];
  agents?: string[];

  resources?: Resource[];
  repository?: string;
}

export class PreviousHistory {
  message: string;
}

export class ConversationContext {
  page: Array<Partial<Page>>;
  task: Array<Partial<Task>>;
  previousHistory: PreviousHistory[];
}
