export interface SkillComponentType {
  streaming?: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  actionStream: { isStreaming: boolean; content: any[] };
  id: string;
  agent: string;
  name: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  actionData?: any;
}
