import React from 'react';

import { useGetIntegrationDefinitions } from 'services/integration-definition';

import { useContextStore } from 'store/global-context-provider';
import { UserContext } from 'store/user-context';

export const useMCP = () => {
  const user = React.useContext(UserContext);

  return user.mcp;
};

export const getMCPServers = (mcpConfig: string | object) => {
  try {
    // Handle string or object config
    const config =
      typeof mcpConfig === 'string' ? JSON.parse(mcpConfig) : mcpConfig;

    // Return default if no mcpServers configuration exists
    if (!config?.mcpServers) {
      return [];
    }

    // Transform server keys to server objects with capitalized names
    const userServers = Object.keys(config.mcpServers).map((key) => ({
      key,
      name: key.charAt(0).toUpperCase() + key.slice(1), // Capitalize first letter
    }));

    // Always include the default Sol server
    return [...userServers];
  } catch (error) {
    console.error('Error parsing MCP config:', error);
    return [];
  }
};

export const useMCPServers = () => {
  const { data: integrationDefinitions } = useGetIntegrationDefinitions();
  const { integrationAccountsStore } = useContextStore();
  const mcp = useMCP();

  const preloadMCPs = integrationAccountsStore.integrationAccounts.map((ia) => {
    const integrationDefinition = integrationDefinitions.find(
      (id) => id.id === ia.integrationDefinitionId,
    );

    return {
      id: integrationDefinition.id,
      key: integrationDefinition.slug,
      name: integrationDefinition.name,
    };
  });

  // eslint-disable-next-line react-hooks/exhaustive-deps
  return React.useMemo(
    () => [
      ...getMCPServers(mcp),
      ...preloadMCPs,
      { id: 'claude', key: 'claude--coding', name: 'Claude code' },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [mcp, integrationAccountsStore.integrationAccounts.length],
  );
};
