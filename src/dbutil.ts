/**
 * @license dbutil.ts
 * (c) 2019 Bugfire https://bugfire.dev/
 * License: MIT
 */

import * as mysql from "mysql";

export interface Config {
  host: string;
  name: string;
  user: string;
  password: string;
}

export const validateConfig = (config: Config): void => {
  const errorNames = ["host", "name", "user", "password"]
    .filter(v => typeof (config as any)[v] !== "string") // eslint-disable-line @typescript-eslint/no-explicit-any
    .join(", ");
  if (errorNames !== "") {
    throw new Error(`Invalid Config [db.${errorNames}] is not string`);
  }
};

export const connect = (config: Config): mysql.Connection => {
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
      // console.log(query);
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
  config: Config,
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
      if (ex.toString().indexOf("Error: ER_DUP_ENTRY") !== 0) {
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
