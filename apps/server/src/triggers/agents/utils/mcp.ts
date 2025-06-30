/* eslint-disable @typescript-eslint/no-explicit-any */
import { logger } from '@trigger.dev/sdk/v3';
import { jsonSchema, tool, ToolSet } from 'ai';

import { MCPTool } from './types';

export class MCP {
  private Client: any;
  private clients: Record<string, any> = {};
  private StdioTransport: any;

  constructor() {}

  public async init() {
    this.Client = await MCP.importClient();
    this.StdioTransport = await MCP.importStdioTransport();
  }

  private static async importClient() {
    const { Client } = await import(
      '@modelcontextprotocol/sdk/client/index.js'
    );
    return Client;
  }

  async load(agents: string[], mcpConfig: any) {
    await Promise.all(
      agents.map(async (agent) => {
        const mcp = mcpConfig.mcpServers[agent];

        return await this.connectToServer(agent, mcp.command, mcp.args, {
          ...mcp.env,
          DATABASE_URL: mcp.env?.DATABASE_URL ?? '',
        });
      }),
    );
  }

  private static async importStdioTransport() {
    const { StdioClientTransport } = await import('./stdio');
    return StdioClientTransport;
  }

  async allTools(): Promise<ToolSet> {
    const clientEntries = Object.entries(this.clients);

    // Fetch all tools in parallel
    const toolsArrays = await Promise.all(
      clientEntries.map(async ([clientKey, client]) => {
        try {
          const { tools } = await client.listTools();
          return tools.map(({ name, description, inputSchema }: any) => [
            `${clientKey}--${name}`,
            tool({
              description,
              parameters: jsonSchema(inputSchema),
            }),
          ]);
        } catch (error) {
          logger.error(`Error fetching tools for ${clientKey}:`, error);
          return [];
        }
      }),
    );

    // Flatten and convert to object
    return Object.fromEntries(toolsArrays.flat());
  }

  async tools(): Promise<MCPTool[]> {
    const allTools: MCPTool[] = [];

    for (const clientKey in this.clients) {
      const client = this.clients[clientKey];
      const { tools: clientTools } = await client.listTools();

      for (const tool of clientTools) {
        // Add client prefix to tool name
        tool.name = `${clientKey}--${tool.name}`;
        allTools.push(tool);
      }
    }

    return allTools;
  }

  async getTool(name: string) {
    try {
      const clientKey = name.split('--')[0];
      const toolName = name.split('--')[1];
      const client = this.clients[clientKey];
      const { tools: clientTools } = await client.listTools();
      const clientTool = clientTools.find((to: any) => to.name === toolName);

      return JSON.stringify(clientTool);
    } catch (e) {
      logger.error(e ?? 'Getting tool failed');
      throw new Error('Getting tool failed');
    }
  }

  async callTool(name: string, parameters: any) {
    const clientKey = name.split('--')[0];
    const toolName = name.split('--')[1];

    const client = this.clients[clientKey];

    const response = await client.callTool({
      name: toolName,
      arguments: parameters,
    });

    return response;
  }

  async connectToServer(
    name: string,
    command: string,
    args: string[],
    env: any,
  ) {
    try {
      const client = new this.Client(
        {
          name,
          version: '1.0.0',
        },
        {
          capabilities: {},
        },
      );

      // Conf
      // igure the transport for MCP server
      const transport = new this.StdioTransport({
        command,
        args,
        env,
      });

      // Connect to the MCP server
      await client.connect(transport, { timeout: 60 * 1000 * 5 });
      this.clients[name] = client;

      logger.info(`Connected to ${name} MCP server`);
    } catch (e) {
      logger.error(`Failed to connect to ${name} MCP server: `, e);
      throw e;
    }
  }
}
