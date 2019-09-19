/**
 * @license home_dashboard v1.0.0
 * (c) 2015 Bugfire https://bugfire.dev/
 * License: MIT
 */

import * as fs from "fs";
import * as express from "express";

import * as dbUtil from "./dbutil";
import { Config } from "./config";

if (process.argv.length <= 2) {
  throw new Error("Invalid argument. Specify top directory of config.");
}
const CONFIG = new Config(
  fs.readFileSync(`${process.argv[2]}config/config.json`, "utf8")
);

interface RangeDef {
  title: string;
  where: string;
}

const rangeTable: { [key: string]: RangeDef } = {
  d1: {
    title: "1 Day",
    where:
      "WHERE Datetime > DATE_SUB(NOW(), INTERVAL 24 HOUR) AND Datetime <= NOW() AND (Datetime LIKE '%:00:00' OR Datetime Like '%:20:00' OR Datetime Like '%:40:00')"
  },
  h8: {
    title: "8 Hours",
    where:
      "WHERE Datetime > DATE_SUB(NOW(), INTERVAL 8 HOUR) AND Datetime <= NOW() AND Datetime LIKE '%0:00'"
  },
  h1: {
    title: "1 Hour",
    where:
      "WHERE Datetime > DATE_SUB(NOW(), INTERVAL 1 HOUR) AND Datetime <= NOW()"
  },
  m30: {
    title: "30 Minutes",
    where:
      "WHERE Datetime > DATE_SUB(NOW(), INTERVAL 30 MINUTE) AND Datetime <= NOW()"
  },
  m15: {
    title: "15 Minutes",
    where:
      "WHERE Datetime > DATE_SUB(NOW(), INTERVAL 15 MINUTE) AND Datetime <= NOW()"
  }
};

const app = express();
const defaultPath = "/stats/h1";

app.use(express.static("./www/static"));
app.get("/index.html", (req, res) => {
  res.redirect(req.baseUrl + defaultPath);
});

app.get("/", (req, res) => {
  res.redirect(req.baseUrl + defaultPath);
});

app.get(
  "/stats/:param",
  async (req, res): Promise<void> => {
    const param = req.params.param;
    const range = rangeTable[param];
    if (typeof range === "undefined") {
      res.status(404);
      res.send(`404 ${req.originalUrl}`);
      return;
    }
    const template = fs.readFileSync("./www/template/index.html", "utf8");

    const client = dbUtil.connect(CONFIG.db);

    const formatTime = (date: Date): string => {
      return (
        ("0" + date.getHours()).slice(-2) +
        ":" +
        ("0" + date.getMinutes()).slice(-2)
      );
    };

    interface GraphJsonCol {
      label: string;
      type: string;
    }

    interface GraphJsonRow {
      c: {
        v: number | string;
      }[];
    }

    interface GraphJson {
      cols: GraphJsonCol[];
      rows: GraphJsonRow[];
    }

    // remo_stats
    const tempJson: GraphJson = {
      cols: [
        { label: "Datetime", type: "string" },
        { label: "リビング温度", type: "number" },
        { label: "リビング湿度", type: "number" }
      ],
      rows: []
    };
    {
      const results = await dbUtil.query(
        client,
        `SELECT * FROM ${CONFIG.remo_stats} ${range.where} ORDER BY datetime;`
      );
      results.forEach(row => {
        if (row.datetime instanceof Date && typeof row.te === "number") {
          const hu = typeof row.hu === "number" ? row.hu : 0;
          tempJson.rows.push({
            c: [{ v: formatTime(row.datetime) }, { v: row.te }, { v: hu }]
          });
        }
      });
    }

    // aiseg_main, aiseg_detail
    interface AisegType {
      nameTable: string;
      valueTable: string;
      result: GraphJson;
    }

    const aisegWork: AisegType[] = [
      {
        nameTable: CONFIG.aiseg_watch_main_name,
        valueTable: CONFIG.aiseg_watch_main,
        result: { cols: [], rows: [] }
      },
      {
        nameTable: CONFIG.aiseg_watch_detail_name,
        valueTable: CONFIG.aiseg_watch_detail,
        result: { cols: [], rows: [] }
      }
    ];

    for (const work of aisegWork) {
      const colNames: { [key: string]: string } = {};
      {
        const results = await dbUtil.query(
          client,
          `SELECT * FROM ${work.nameTable};`
        );
        results.forEach(row => {
          if (typeof row.Tag === "string" && typeof row.Name === "string") {
            colNames[row.Tag] = row.Name;
          }
        });
      }
      const colTags: string[] = [];
      {
        const results = await dbUtil.query(
          client,
          `SHOW COLUMNS FROM ${work.valueTable}`
        );
        results.forEach(row => {
          if (typeof row.Field === "string") {
            colTags.push(row.Field);
          }
        });
      }
      colTags.forEach(colTag => {
        const label =
          typeof colNames[colTag] === "undefined" ? colTag : colNames[colTag];
        const type = colTag === "Datetime" ? "string" : "number";
        work.result.cols.push({ label, type });
      });
      {
        const results = await dbUtil.query(
          client,
          `SELECT * FROM ${work.valueTable} ${range.where} ORDER BY Datetime;`
        );
        results.forEach(row => {
          const jsonRow: GraphJsonRow = { c: [] };
          colTags.forEach(colTag => {
            const col = row[colTag];
            if (colTag === "Datetime" && col instanceof Date) {
              jsonRow.c.push({ v: formatTime(col) });
            } else if (typeof col === "number") {
              jsonRow.c.push({ v: col });
            } else {
              jsonRow.c.push({ v: "" });
            }
          });
          work.result.rows.push(jsonRow);
        });
      }
    }

    const title = `Web statistics watcher [${range.title}]`;
    let file = template.replace(/@@TITLE@@/g, title);
    const jsonData = `
    var jsonData1 = ${JSON.stringify(tempJson)};
    var jsonData2 = ${JSON.stringify(aisegWork[0].result)};
    var jsonData3 = ${JSON.stringify(aisegWork[1].result)};
`;
    file = file.replace(/\/\/@@JSON_DATA@@/, jsonData);
    res.send(file);
  }
);

app.listen(3000, () => {
  console.log("Express app start");
});
