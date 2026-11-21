import {
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from 'drizzle-orm/sqlite-core';

// Better Auth tables (drizzle adapter, sqlite/D1). Mirrors the Better Auth
// core schema; `role` is an additional user field for admin gating.

export const authUser = sqliteTable(
  'ba_user',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    email: text('email').notNull(),
    emailVerified: integer('email_verified', { mode: 'boolean' })
      .default(false)
      .notNull(),
    image: text('image'),
    role: text('role').default('user'),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
  },
  (table) => [uniqueIndex('ba_user_email_key').on(table.email)],
);

export const authSession = sqliteTable(
  'ba_session',
  {
    id: text('id').primaryKey(),
    expiresAt: integer('expires_at', { mode: 'timestamp_ms' }).notNull(),
    token: text('token').notNull().unique(),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    userId: text('user_id')
      .notNull()
      .references(() => authUser.id, { onDelete: 'cascade' }),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
  },
  (table) => [index('ba_session_user_id_idx').on(table.userId)],
);

export const authAccount = sqliteTable(
  'ba_account',
  {
    id: text('id').primaryKey(),
    accountId: text('account_id').notNull(),
    providerId: text('provider_id').notNull(),
    userId: text('user_id')
      .notNull()
      .references(() => authUser.id, { onDelete: 'cascade' }),
    accessToken: text('access_token'),
    refreshToken: text('refresh_token'),
    idToken: text('id_token'),
    accessTokenExpiresAt: integer('access_token_expires_at', {
      mode: 'timestamp_ms',
    }),
    refreshTokenExpiresAt: integer('refresh_token_expires_at', {
      mode: 'timestamp_ms',
    }),
    scope: text('scope'),
    password: text('password'),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
  },
  (table) => [index('ba_account_user_id_idx').on(table.userId)],
);

export const authVerification = sqliteTable(
  'ba_verification',
  {
    id: text('id').primaryKey(),
    identifier: text('identifier').notNull(),
    value: text('value').notNull(),
    expiresAt: integer('expires_at', { mode: 'timestamp_ms' }).notNull(),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' }),
  },
  (table) => [index('ba_verification_identifier_idx').on(table.identifier)],
);

export type AuthUser = typeof authUser.$inferSelect;
export type AuthSession = typeof authSession.$inferSelect;
export type AuthAccount = typeof authAccount.$inferSelect;
export type AuthVerification = typeof authVerification.$inferSelect;

// Better Auth OAuth provider (MCP) and JWT tables. Generated from
// getAuthTables() for better-auth 1.7.27 + jwt() + @better-auth/mcp; the SQLite
// adapter stores dates as ms timestamps and arrays/JSON as text.

export const authJwks = sqliteTable('ba_jwks', {
    id: text('id').primaryKey(),
    publicKey: text('public_key').notNull(),
    privateKey: text('private_key').notNull(),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
    expiresAt: integer('expires_at', { mode: 'timestamp_ms' }),
    alg: text('alg'),
    crv: text('crv'),
});

export const authOauthClient = sqliteTable('ba_oauth_client', {
    id: text('id').primaryKey(),
    clientId: text('client_id').notNull().unique(),
    clientSecret: text('client_secret'),
    clientDiscoveryId: text('client_discovery_id'),
    disabled: integer('disabled', { mode: 'boolean' }).default(false),
    skipConsent: integer('skip_consent', { mode: 'boolean' }),
    enableEndSession: integer('enable_end_session', { mode: 'boolean' }),
    subjectType: text('subject_type'),
    scopes: text('scopes'),
    clientCredentialsScopes: text('client_credentials_scopes'),
    userId: text('user_id').references(() => authUser.id),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' }),
    name: text('name'),
    uri: text('uri'),
    icon: text('icon'),
    contacts: text('contacts'),
    tos: text('tos'),
    policy: text('policy'),
    softwareId: text('software_id'),
    softwareVersion: text('software_version'),
    softwareStatement: text('software_statement'),
    redirectUris: text('redirect_uris').notNull(),
    postLogoutRedirectUris: text('post_logout_redirect_uris'),
    backchannelLogoutUri: text('backchannel_logout_uri'),
    backchannelLogoutSessionRequired: integer('backchannel_logout_session_required', { mode: 'boolean' }),
    tokenEndpointAuthMethod: text('token_endpoint_auth_method'),
    applicationType: text('application_type'),
    jwks: text('jwks'),
    jwksUri: text('jwks_uri'),
    grantTypes: text('grant_types'),
    responseTypes: text('response_types'),
    requirePKCE: integer('require_p_k_c_e', { mode: 'boolean' }),
    dpopBoundAccessTokens: integer('dpop_bound_access_tokens', { mode: 'boolean' }).default(false),
    referenceId: text('reference_id'),
    metadata: text('metadata'),
});

export const authOauthResource = sqliteTable('ba_oauth_resource', {
    id: text('id').primaryKey(),
    identifier: text('identifier').notNull().unique(),
    name: text('name').notNull(),
    accessTokenTtl: integer('access_token_ttl'),
    refreshTokenTtl: integer('refresh_token_ttl'),
    signingAlgorithm: text('signing_algorithm'),
    signingKeyId: text('signing_key_id'),
    allowedScopes: text('allowed_scopes'),
    customClaims: text('custom_claims'),
    dpopBoundAccessTokensRequired: integer('dpop_bound_access_tokens_required', { mode: 'boolean' }).default(false),
    disabled: integer('disabled', { mode: 'boolean' }).default(false),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' }),
    policyVersion: integer('policy_version').default(1),
    metadata: text('metadata'),
});

export const authOauthClientResource = sqliteTable('ba_oauth_client_resource', {
    id: text('id').primaryKey(),
    clientId: text('client_id').notNull().references(() => authOauthClient.clientId, { onDelete: 'cascade' }),
    resourceId: text('resource_id').notNull().references(() => authOauthResource.identifier, { onDelete: 'cascade' }),
    metadata: text('metadata'),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }),
});

export const authOauthRefreshToken = sqliteTable('ba_oauth_refresh_token', {
    id: text('id').primaryKey(),
    token: text('token').notNull().unique(),
    clientId: text('client_id').notNull().references(() => authOauthClient.clientId),
    sessionId: text('session_id').references(() => authSession.id, { onDelete: 'set null' }),
    userId: text('user_id').notNull().references(() => authUser.id),
    referenceId: text('reference_id'),
    authorizationCodeId: text('authorization_code_id'),
    resources: text('resources'),
    requestedUserInfoClaims: text('requested_user_info_claims'),
    expiresAt: integer('expires_at', { mode: 'timestamp_ms' }),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }),
    revoked: integer('revoked', { mode: 'timestamp_ms' }),
    rotatedAt: integer('rotated_at', { mode: 'timestamp_ms' }),
    rotationReplayResponse: text('rotation_replay_response'),
    rotationReplayExpiresAt: integer('rotation_replay_expires_at', { mode: 'timestamp_ms' }),
    authTime: integer('auth_time', { mode: 'timestamp_ms' }),
    confirmation: text('confirmation'),
    scopes: text('scopes').notNull(),
});

export const authOauthAccessToken = sqliteTable('ba_oauth_access_token', {
    id: text('id').primaryKey(),
    token: text('token').unique(),
    clientId: text('client_id').notNull().references(() => authOauthClient.clientId),
    sessionId: text('session_id').references(() => authSession.id, { onDelete: 'set null' }),
    userId: text('user_id').references(() => authUser.id),
    referenceId: text('reference_id'),
    authorizationCodeId: text('authorization_code_id'),
    resources: text('resources'),
    requestedUserInfoClaims: text('requested_user_info_claims'),
    refreshId: text('refresh_id').references(() => authOauthRefreshToken.id),
    expiresAt: integer('expires_at', { mode: 'timestamp_ms' }),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }),
    revoked: integer('revoked', { mode: 'timestamp_ms' }),
    confirmation: text('confirmation'),
    scopes: text('scopes').notNull(),
});

export const authOauthConsent = sqliteTable('ba_oauth_consent', {
    id: text('id').primaryKey(),
    clientId: text('client_id').notNull().references(() => authOauthClient.clientId),
    userId: text('user_id').references(() => authUser.id),
    referenceId: text('reference_id'),
    resources: text('resources'),
    requestedUserInfoClaims: text('requested_user_info_claims'),
    scopes: text('scopes').notNull(),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' }),
});

export const authOauthClientAssertion = sqliteTable('ba_oauth_client_assertion', {
    id: text('id').primaryKey(),
    expiresAt: integer('expires_at', { mode: 'timestamp_ms' }).notNull(),
});
