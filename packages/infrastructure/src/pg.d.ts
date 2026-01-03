declare module "pg" {
  export type QueryResult<T = any> = {
    rows: T[];
    rowCount: number;
  };

  export interface PoolClient {
    query<T = any>(text: string, params?: unknown[]): Promise<QueryResult<T>>;
    release(): void;
  }

  export class Pool {
    constructor(config?: { connectionString?: string });
    query<T = any>(text: string, params?: unknown[]): Promise<QueryResult<T>>;
    connect(): Promise<PoolClient>;
    end(): Promise<void>;
  }

  export class Client {
    constructor(config?: { connectionString?: string });
    connect(): Promise<void>;
    query<T = any>(text: string, params?: unknown[]): Promise<QueryResult<T>>;
    end(): Promise<void>;
  }
}
