import type { D1Database, D1Result } from '@cloudflare/workers-types';
import { createClient, type Client, type InValue, type ResultSet } from '@libsql/client/web';

/**
 * libSQL transport for the SQLite statement interface used by our existing
 * Drizzle queries and raw SQL. This never calls Cloudflare D1. Keep batch writes
 * in one libSQL transaction (post edits, counters and newsletter locks rely on it).
 */
export function createLibsqlDatabase(url: string, authToken: string): D1Database {
  return bindLibsqlClient(createClient({ url, authToken, intMode: 'number' }));
}

export function bindLibsqlClient(client: Client): D1Database {
  class Statement {
    constructor(readonly sql: string, readonly args: InValue[] = []) {}

    bind(...values: unknown[]) {
      return new Statement(this.sql, values.map(value => {
        if (value === null || typeof value === 'string' || typeof value === 'number' || typeof value === 'bigint') return value;
        if (typeof value === 'boolean') return Number(value);
        if (value instanceof ArrayBuffer || ArrayBuffer.isView(value)) return value as InValue;
        throw new TypeError('Unsupported SQLite bind value');
      }));
    }

    async all<T = Record<string, unknown>>(): Promise<D1Result<T>> {
      return mapResult<T>(await client.execute({ sql: this.sql, args: this.args }));
    }

    run<T = Record<string, unknown>>() { return this.all<T>(); }

    async first<T = Record<string, unknown>>(column?: string): Promise<T | null> {
      const result = await this.all<Record<string, unknown>>();
      const row = result.results[0];
      if (!row) return null;
      if (column !== undefined && !(column in row)) throw new Error(`Unknown result column: ${column}`);
      return (column === undefined ? row : row[column]) as T;
    }

    async raw(options?: { columnNames?: boolean }) {
      const result = await client.execute({ sql: this.sql, args: this.args });
      const rows = result.rows.map(row => result.columns.map(column => row[column]));
      return options?.columnNames ? [result.columns, ...rows] : rows;
    }
  }

  const binding = {
    prepare(sql: string) {
      // Standalone BEGIN/COMMIT over HTTP cannot share a transaction. Fail closed;
      // all application multi-statement writes must use atomic batch().
      if (/^\s*(?:begin|commit|rollback|savepoint|release)\b/i.test(sql)) {
        throw new Error('Use database.batch() for atomic libSQL transactions');
      }
      return new Statement(sql);
    },
    async batch<T>(statements: Statement[]): Promise<D1Result<T>[]> {
      if (statements.some(statement => !(statement instanceof Statement))) throw new TypeError('Cannot batch statements from another database');
      if (statements.length === 0) return [];
      return (await client.batch(statements.map(({ sql, args }) => ({ sql, args })), 'write')).map(mapResult<T>);
    },
  };

  // D1's dump, exec, sessions and replica bookmark APIs are deliberately absent:
  // the application only uses the portable prepared-statement/batch subset.
  return binding as unknown as D1Database;
}

function mapResult<T>(result: ResultSet): D1Result<T> {
  return {
    success: true,
    results: result.rows.map(row => Object.fromEntries(result.columns.map(column => [column, row[column]]))) as T[],
    meta: {
      changes: result.rowsAffected,
      last_row_id: Number(result.lastInsertRowid ?? 0),
      changed_db: result.rowsAffected > 0,
      // These D1-only telemetry fields are not available from libSQL.
      duration: 0, size_after: 0, rows_read: 0, rows_written: 0,
    },
  };
}
