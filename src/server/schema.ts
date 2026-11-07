import { boolean, index, pgTable, text, timestamp } from 'drizzle-orm/pg-core'

/*
 * Database tables. Better Auth's four tables (user, session, account, verification) match its
 * schema for version 1.7 with the magic-link plugin; regenerate the migration after changing
 * anything here: pnpm db:generate. Columns are snake_case in SQL (casing in database.ts).
 */

const timestamps = {
  createdAt: timestamp({ withTimezone: true }).notNull(),
  updatedAt: timestamp({ withTimezone: true }).notNull(),
}

export const user = pgTable('user', {
  id: text().primaryKey(),
  name: text().notNull(),
  email: text().notNull().unique(),
  emailVerified: boolean().notNull(),
  image: text(),
  ...timestamps,
})

export const session = pgTable(
  'session',
  {
    id: text().primaryKey(),
    expiresAt: timestamp({ withTimezone: true }).notNull(),
    token: text().notNull().unique(),
    ipAddress: text(),
    userAgent: text(),
    userId: text()
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    ...timestamps,
  },
  ({ userId }) => [index().on(userId)],
)

export const account = pgTable(
  'account',
  {
    id: text().primaryKey(),
    accountId: text().notNull(),
    providerId: text().notNull(),
    userId: text()
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    accessToken: text(),
    refreshToken: text(),
    idToken: text(),
    accessTokenExpiresAt: timestamp({ withTimezone: true }),
    refreshTokenExpiresAt: timestamp({ withTimezone: true }),
    scope: text(),
    password: text(),
    ...timestamps,
  },
  ({ userId }) => [index().on(userId)],
)

export const verification = pgTable(
  'verification',
  {
    id: text().primaryKey(),
    identifier: text().notNull(),
    value: text().notNull(),
    expiresAt: timestamp({ withTimezone: true }).notNull(),
    ...timestamps,
  },
  ({ identifier }) => [index().on(identifier)],
)

/** All tables, for Drizzle's query API and Better Auth's adapter. */
export const schema = { user, session, account, verification }
