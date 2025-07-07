# OAuth Implementation Analysis in Sol

## Overview

The OAuth implementation in Sol is a flexible system designed to support various OAuth2 providers by using configurable templates. It follows a standard OAuth2 authorization code flow with a modular architecture that allows for easy integration with different services.

## Route Definitions and Endpoints

The OAuth callback module exposes two main endpoints:

1. **POST /oauth** (v1)
   - Requires authentication via AuthGuard
   - Creates an OAuth redirect URL for the specified integration
   - Takes an OAuthBodyInterface as input with integration details
   - Returns a redirect URL to the OAuth provider's authorization page

2. **GET /oauth/callback** (v1)
   - Public endpoint (no authentication required)
   - Handles the callback from the OAuth provider after user authorization
   - Processes the authorization code to obtain access tokens
   - Creates or updates an integration account with the obtained tokens
   - Redirects the user back to the application with success/error status

## Workflow

### 1. Authorization URL Generation

1. Client requests an OAuth redirect URL via `POST /oauth`
2. The system retrieves the integration definition with provider-specific OAuth templates
3. The OAuth2 client is configured using the integration's client ID, client secret, and required scopes
4. A unique state parameter is generated and stored in an in-memory session
5. A redirect URL is created with proper authorization parameters (scopes, state, etc.)
6. The URL is returned to the client for redirection

### 2. User Authorization

1. User is redirected to the OAuth provider's authorization page
2. User grants permissions to the requested scopes
3. Provider redirects back to the callback URL with an authorization code

### 3. Token Exchange

1. System receives the callback at `GET /oauth/callback`
2. Verifies the state parameter against stored session data
3. Exchanges the authorization code for access/refresh tokens
4. Handles provider-specific authentication methods (body/header, form/JSON)
5. Supports Basic Auth for providers that require it

### 4. Integration Account Creation

1. After successful token exchange, integration-specific handler is triggered
2. The `runIntegrationTrigger` method dynamically loads the integration backend code
3. Integration account is created or updated with tokens and configuration
4. Tokens are securely stored in the database

### 5. Scheduled Tasks Setup

1. For integrations with scheduled tasks, a scheduler is triggered
2. The scheduler creates recurring tasks based on the integration's specifications
3. Schedule IDs are stored in the integration account settings

## Key Components

### OAuthCallbackService

- **getRedirectURL**: Generates authorization URLs with proper parameters
- **callbackHandler**: Processes callbacks and exchanges codes for tokens
- Uses in-memory session storage (planned migration to Redis)
- Handles error cases with appropriate redirects

### Integration Services

- **IntegrationsService**: Manages integration triggering and PAT creation
- **IntegrationAccountService**: Creates and updates integration accounts
- **integration-run.ts**: Dynamically loads and executes integration backends
- **scheduler.ts**: Sets up scheduled tasks for integrations

### Data Structures

- **SessionRecord**: Stores OAuth session data (state, integration ID, etc.)
- **OAuthBodyInterface**: Input interface for initiating OAuth flows
- **ProviderTemplateOAuth2**: Configuration template for OAuth2 providers

### Utility Functions

- **getSimpleOAuth2ClientConfig**: Configures OAuth2 clients with provider settings
- **getTemplate**: Retrieves provider templates from integration definitions
- **interpolateString**: Handles string interpolation for dynamic URLs

## Security Considerations

1. Uses state parameters to prevent CSRF attacks
2. Supports PKCE for public clients (can be disabled if needed)
3. Securely stores tokens in the database
4. Uses personal access tokens (PATs) for internal API calls

## Provider Configuration

Integration definitions include OAuth2 configuration in their specs:
- **Authorization URL**: Provider's authorization endpoint
- **Token URL**: Provider's token endpoint
- **Scopes**: Required permissions
- **Additional Parameters**: Provider-specific authorization parameters
- **Authorization Method**: How credentials are sent (body/header)
- **Body Format**: Format for token requests (form/JSON)

## Extensibility

The system is designed to be highly extensible:
1. Provider templates in integration specifications
2. Dynamic loading of integration-specific handlers
3. Configurable authentication methods and parameters
4. Support for different token formats and scopes

## Implementation Notes

1. Currently using in-memory session storage (TODO: migrate to Redis)
2. Follows OAuth2 best practices with proper error handling
3. Uses NestJS controllers and services with dependency injection
4. Integrates with the Trigger.dev system for scheduled tasks
5. Supports both workspace-level and personal integrations

## Flow Diagram

```
┌─────────┐                  ┌─────────────┐               ┌─────────────────┐
│  Client │                  │  Sol Server │               │  OAuth Provider │
└────┬────┘                  └──────┬──────┘               └────────┬────────┘
     │                              │                               │
     │  POST /oauth                 │                               │
     │─────────────────────────────>│                               │
     │                              │                               │
     │                              │  Generate state & store       │
     │                              │  in session                   │
     │                              │<─────────────────────────────>│
     │                              │                               │
     │  Redirect URL                │                               │
     │<─────────────────────────────│                               │
     │                              │                               │
     │  Redirect to Provider        │                               │
     │───────────────────────────────────────────────────────────────>
     │                              │                               │
     │                              │                               │  User authorizes
     │                              │                               │<─────────────┐
     │                              │                               │              │
     │                              │                               │  Generate code
     │                              │                               │<─────────────┘
     │                              │                               │
     │                              │  GET /oauth/callback?code=...&state=...
     │<──────────────────────────────────────────────────────────────│
     │                              │                               │
     │                              │  Verify state                 │
     │                              │<─────────────────────────────>│
     │                              │                               │
     │                              │  Exchange code for tokens     │
     │                              │───────────────────────────────>
     │                              │                               │
     │                              │  Access & refresh tokens      │
     │                              │<───────────────────────────────│
     │                              │                               │
     │                              │  Create/update integration    │
     │                              │  account                      │
     │                              │<─────────────────────────────>│
     │                              │                               │
     │                              │  Setup scheduled tasks        │
     │                              │<─────────────────────────────>│
     │                              │                               │
     │  Redirect to success page    │                               │
     │<─────────────────────────────│                               │
     │                              │                               │
```