import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  IntegrationPayloadEventType,
  OAuth2Params,
} from '@redplanethq/sol-sdk';
import { tasks } from '@trigger.dev/sdk/v3';
import * as simpleOauth2 from 'simple-oauth2';
import { scheduler } from 'triggers/integrations/scheduler';

import { IntegrationDefinitionService } from 'modules/integration-definition/integration-definition.service';
import { IntegrationsService } from 'modules/integrations/integrations.service';
import { LoggerService } from 'modules/logger/logger.service';

import {
  CallbackParams,
  OAuthBodyInterface,
  ProviderTemplateOAuth2,
  SessionRecord,
} from './oauth-callback.interface';
import {
  getSimpleOAuth2ClientConfig,
  getTemplate,
} from './oauth-callback.utils';

@Injectable()
export class OAuthCallbackService {
  // TODO(Manoj): Move this to Redis once we have multiple servers
  session: Record<string, SessionRecord> = {};
  private readonly logger = new LoggerService(OAuthCallbackService.name);
  CALLBACK_URL = '';

  constructor(
    private integrationDefinitionService: IntegrationDefinitionService,
    private configService: ConfigService,
    private integrationService: IntegrationsService,
  ) {
    this.CALLBACK_URL = this.configService.get<string>('OAUTH_CALLBACK_URL');
  }

  async getRedirectURL(
    oAuthBody: OAuthBodyInterface,
    userId: string,
    workspaceId: string,
    specificScopes?: string,
  ) {
    const { integrationDefinitionId, personal } = oAuthBody;

    const redirectURL = `${this.configService.get('FRONTEND_HOST')}/integrations`;

    this.logger.info({
      message: `We got OAuth request for ${workspaceId}: ${integrationDefinitionId}`,
      where: `OAuthCallbackService.getRedirectURL`,
    });

    const integrationDefinition =
      await this.integrationDefinitionService.getIntegrationDefinitionWithId({
        integrationDefinitionId,
      });

    const spec = integrationDefinition.spec;
    const externalConfig = spec.auth.OAuth2 as OAuth2Params;
    const template = await getTemplate(integrationDefinition);

    const scopesString = specificScopes || externalConfig.scopes.join(',');
    const additionalAuthParams = template.authorization_params || {};

    try {
      const simpleOAuthClient = new simpleOauth2.AuthorizationCode(
        getSimpleOAuth2ClientConfig(
          {
            client_id: integrationDefinition.config.clientId,
            client_secret: integrationDefinition.config.clientSecret,
            scopes: scopesString,
          },
          template,
          externalConfig,
        ),
      );

      const uniqueId = Date.now().toString(36);
      this.session[uniqueId] = {
        integrationDefinitionId: integrationDefinition.id,
        redirectURL,
        workspaceId,
        config: externalConfig,
        userId,
        personal,
      };

      const scopes = [
        ...scopesString.split(','),
        ...(template.default_scopes || []),
      ];

      const scopeIdentifier = externalConfig.scope_identifier ?? 'scope';

      const authorizationUri = simpleOAuthClient.authorizeURL({
        redirect_uri: this.CALLBACK_URL,
        [scopeIdentifier]: scopes.join(template.scope_separator || ' '),
        state: uniqueId,
        ...additionalAuthParams,
      });

      this.logger.debug({
        message: `OAuth 2.0 for ${integrationDefinition.name} - redirecting to: ${authorizationUri}`,
        where: `OAuthCallbackService.getRedirectURL`,
      });

      return {
        status: 200,
        redirectURL: authorizationUri,
      };
    } catch (e) {
      this.logger.warn(e);
      throw new BadRequestException({ error: e.message });
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async callbackHandler(params: CallbackParams, res: any) {
    if (!params.state) {
      throw new BadRequestException({
        error: 'No state found',
      });
    }

    const sessionRecord = this.session[params.state];

    /**
     * Delete the session once it's used
     */
    delete this.session[params.state];

    if (!sessionRecord) {
      throw new BadRequestException({
        error: 'No session found',
      });
    }

    const integrationDefinition =
      await this.integrationDefinitionService.getIntegrationDefinitionWithId({
        integrationDefinitionId: sessionRecord.integrationDefinitionId,
      });

    const template = (await getTemplate(
      integrationDefinition,
    )) as ProviderTemplateOAuth2;

    if (integrationDefinition === null) {
      const errorMessage = 'No matching integration definition found';

      res.redirect(
        `${sessionRecord.redirectURL}?success=false&error=${errorMessage}`,
      );
    }

    let additionalTokenParams: Record<string, string> = {};
    if (template.token_params !== undefined) {
      const deepCopy = JSON.parse(JSON.stringify(template.token_params));
      additionalTokenParams = deepCopy;
    }

    if (template.refresh_params) {
      additionalTokenParams = template.refresh_params;
    }

    const headers: Record<string, string> = {};

    if (template.token_request_auth_method === 'basic') {
      headers['Authorization'] = `Basic ${Buffer.from(
        `${integrationDefinition.config.clientId}:${integrationDefinition.config.clientSecret}`,
      ).toString('base64')}`;
    }

    const accountIdentifier = sessionRecord.accountIdentifier
      ? `&accountIdentifier=${sessionRecord.accountIdentifier}`
      : '';
    const integrationKeys = sessionRecord.integrationKeys
      ? `&integrationKeys=${sessionRecord.integrationKeys}`
      : '';

    try {
      const scopes = (integrationDefinition.spec.auth.OAuth2 as OAuth2Params)
        .scopes;
      const simpleOAuthClient = new simpleOauth2.AuthorizationCode(
        getSimpleOAuth2ClientConfig(
          {
            client_id: integrationDefinition.config.clientId,
            client_secret: integrationDefinition.config.clientSecret,
            scopes: scopes.join(','),
          },
          template,
          sessionRecord.config,
        ),
      );

      // const {code, ...otherParams} = params
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const tokensResponse: any = await simpleOAuthClient.getToken(
        {
          code: params.code as string,
          redirect_uri: this.CALLBACK_URL,
          ...additionalTokenParams,
        },
        {
          headers,
        },
      );

      const integrationAccount =
        await this.integrationService.runIntegrationTrigger(
          integrationDefinition,
          {
            event: IntegrationPayloadEventType.INTEGRATION_ACCOUNT_CREATED,
            eventBody: {
              oauthResponse: tokensResponse.token,
              oauthParams: {
                ...params,
                redirect_uri: this.CALLBACK_URL,
              },
              integrationDefinition,
            },
          },
          sessionRecord.userId,
        );

      await tasks.trigger<typeof scheduler>('scheduler', {
        integrationAccountId: integrationAccount.id,
      });

      res.redirect(
        `${sessionRecord.redirectURL}?success=true&integrationName=${integrationDefinition.name}${accountIdentifier}${integrationKeys}`,
      );
    } catch (e) {
      this.logger.error({
        message: e,
        where: `OAuthCallbackService.callbackHandler`,
      });

      res.redirect(
        `${sessionRecord.redirectURL}?success=false&error=${e.message}${accountIdentifier}${integrationKeys}`,
      );
    }
  }
}
