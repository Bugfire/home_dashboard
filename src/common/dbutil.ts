/**
 * @license dbutil.ts
 * (c) 2019 Bugfire https://bugfire.dev/
 * License: MIT
 */

import * as mysql from "mysql";

import { ConfigType } from "./config";

const IS_DRYRUN = process.env["NODE_ENV"] === "DRYRUN";
const IS_DEBUG = IS_DRYRUN || process.env["NODE_ENV"] === "DEBUG";

export interface DBConfig {
  host: string;
  name: string;
  user: string;
  password: string;
}

export const DBConfigType: ConfigType = {
  host: "string",
  name: "string",
  user: "string",
  password: "string"
};

export const connect = (config: DBConfig): mysql.Connection => {
  return mysql.createConnection({
    host: config.host,
    database: config.name,
    user: config.user,
    password: config.password,
    connectTimeout: 10000,
    supportBigNumbers: true,
    timezone: "+09:00"
  });
};

type ColumnType = number | string | Date | null;

export const query = async (
  client: mysql.Connection,
  query: string
): Promise<{ [key: string]: ColumnType }[]> => {
  return new Promise<{ [key: string]: ColumnType }[]>(
    (resolve, reject): void => {
      if (IS_DEBUG) {
        console.log(`Querying...\n${query}`);
      }
      if (IS_DRYRUN) {
        resolve([]);
        return;
      }
      client.query(query, (err, result: { [key: string]: ColumnType }[]) => {
        if (err) {
          reject(err);
        } else {
          resolve(result);
        }
      });
    }
  );
};

export const connectAndQueries = async (
  config: DBConfig,
  queries: string[]
): Promise<{ [key: string]: ColumnType }[][]> => {
  if (queries.length === 0) {
    return [];
  }
  const client = connect(config);
  const r: { [key: string]: ColumnType }[][] = [];
  for (let i = 0; i < queries.length; i++) {
    try {
      r.push(await query(client, queries[i]));
    } catch (ex) {
      if (ex.toString().indexOf("Error: ER_DUP_ENTRY") !== 0 || IS_DEBUG) {
        console.error(ex.toString());
      }
    }
  }
  client.end();
  return r;
};

export const getDateJST = (): string => {
  return (
    new Date(new Date().getTime() + 9 * 3600 * 1000)
      .toISOString()
      .replace(/T/, " ")
      .replace(/\..+/, "")
      .slice(0, -2) + "00"
  );
};
