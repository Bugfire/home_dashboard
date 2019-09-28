/**
 * @license home_dashboard
 * (c) 2015 Bugfire https://bugfire.dev/
 * License: MIT
 */

import * as fs from "fs";

import { LoadConfig as LC, ConfigType } from "./common/config";
import { DBConfig, DBConfigType } from "./common/dbutil";

/* eslint-disable @typescript-eslint/camelcase */

interface MyConfig {
  db: DBConfig;
  remo_stats: string;
  aiseg_watch_main_name: string;
  aiseg_watch_main: string;
  aiseg_watch_detail_name: string;
  aiseg_watch_detail: string;
}

const MyConfigType: ConfigType = {
  db: DBConfigType,
  remo_stats: "string",
  aiseg_watch_main_name: "string",
  aiseg_watch_main: "string",
  aiseg_watch_detail_name: "string",
  aiseg_watch_detail: "string"
};

/* eslint-enable @typescript-eslint/camelcase */
  
export const LoadConfig = (filename: string) => {
  return LC<MyConfig>(
    fs.readFileSync(filename, "utf8"),
    MyConfigType
  );
};