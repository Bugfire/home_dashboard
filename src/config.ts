/**
 * @license home_dashboard
 * (c) 2019 Bugfire https://bugfire.dev/
 * License: MIT
 */

import * as dbUtil from "./dbutil";

export class Config {
  public readonly db: dbUtil.Config;
  /* eslint-disable @typescript-eslint/camelcase */
  public readonly remo_stats: string;
  public readonly aiseg_watch_main_name: string;
  public readonly aiseg_watch_main: string;
  public readonly aiseg_watch_detail_name: string;
  public readonly aiseg_watch_detail: string;
  /* eslint-enable @typescript-eslint/camelcase */

  public constructor(configString: string) {
    const json = JSON.parse(configString);

    this.db = json.db;
    /* eslint-disable @typescript-eslint/camelcase */
    this.remo_stats = json.remo_stats;
    this.aiseg_watch_main_name = json.aiseg_watch_main_name;
    this.aiseg_watch_main = json.aiseg_watch_main;
    this.aiseg_watch_detail_name = json.aiseg_watch_detail_name;
    this.aiseg_watch_detail = json.aiseg_watch_detail;
    /* eslint-enable @typescript-eslint/camelcase */

    dbUtil.validateConfig(this.db);

    const errorNames = [
      "remo_stats",
      "aiseg_watch_main_name",
      "aiseg_watch_main",
      "aiseg_watch_detail_name",
      "aiseg_watch_detail"
    ]
      .filter(v => typeof (this as any)[v] !== "string") // eslint-disable-line @typescript-eslint/no-explicit-any
      .join(", ");
    if (errorNames !== "") {
      throw new Error(`Invalid Config [${errorNames}] is not string`);
    }

    return this;
  }
}
