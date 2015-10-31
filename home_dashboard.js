/**
 * @license web_watch v0.0.1
 * (c) 2015 Bugfire http://ol.eek.jp/blog/
 * License: MIT
 */

var config = require('/data/config.js');
var http = require('http');
var url = require('url');
var path = require('path');
var fs = require('fs');

var fmt_time_hhmm = function(date) {
  return ('0' + date.getHours()).slice(-2) + ':' + ('0' + date.getMinutes()).slice(-2);
};

var range_tbl = {
  d1: {
    title: '1 Day',
    fmt_time: fmt_time_hhmm,
    where: "WHERE Datetime > DATE_SUB(NOW(), INTERVAL 24 HOUR) AND Datetime <= NOW() AND (Datetime LIKE '%:00:00' OR Datetime Like '%:20:00' OR Datetime Like '%:40:00')"
  },
  h8: {
    title: '8 Hours',
    fmt_time: fmt_time_hhmm,
    where: "WHERE Datetime > DATE_SUB(NOW(), INTERVAL 8 HOUR) AND Datetime <= NOW() AND Datetime LIKE '%0:00'"
  },
  h1: {
    title: '1 Hour',
    fmt_time: fmt_time_hhmm,
    where: "WHERE Datetime > DATE_SUB(NOW(), INTERVAL 1 HOUR) AND Datetime <= NOW()"
  },
  m30: {
    title: '30 Minutes',
    fmt_time: fmt_time_hhmm,
    where: "WHERE Datetime > DATE_SUB(NOW(), INTERVAL 30 MINUTE) AND Datetime <= NOW()"
  },
  m15: {
    title: '15 Minutes',
    fmt_time: fmt_time_hhmm,
    where: "WHERE Datetime > DATE_SUB(NOW(), INTERVAL 15 MINUTE) AND Datetime <= NOW()"
  }
};

sendQueries = function(queries, callback) {
  var mysql = require('mysql');
  var client = mysql.createConnection({
    host: config.db.host,
    database: config.db.name,
    user: config.db.user,
    password: config.db.password,
    connectTimeout: 10000,
    supportBigNumbers: true,
    connectionLimit: 10,
    removeNodeErrorCount: 3
  });
  var sendQuery = function(index) {
    var next = function(index) {
      if (index + 1 >= queries.length) {
        client.end();
        callback();
      } else {
        sendQuery(index + 1);
      }
    };
    try {
      client.query(queries[index].query, function(err, result) {
        if (err) {
          console.log(err);
        } else {
          queries[index].callback(result);
        }
        next(index);
      });
    } catch (e) {
      console.log(e.message);
      next(index);
    }
  };
  sendQuery(0);
};

var createQueries = function(range_func) {
  return [
  //
  {
    query: 'SELECT * FROM ' + config.pi_cpu_temp + ' ' + range_func.where,
    callback: function(result) {
      json1_tmp = {};
      for (var i = 0; i < result.length; i++) {
        var t = result[i]['Datetime'];
        var c = {};
        c.d = range_func.fmt_time(t);
        c.c = result[i]['Val'];
        json1_tmp[t] = c;
      }
    }
  },
  {
    query: 'SELECT * FROM ' + config.temper_temp + ' ' + range_func.where,
    callback: function(result) {
      for (var i = 0; i < result.length; i++) {
        var t = result[i]['Datetime'];
        var c;
        if (t in json1_tmp) {
           c = json1_tmp[t];
        } else {
           c = {};
           c.d = range_func.fmt_time(t);
        }
        c.t = result[i]['Val'];
        json1_tmp[t] = c;
      }
      json1 = {};
      json1.cols = [
        { label: 'Datetime', type: 'string' },
        { label: 'CPU', type: 'number' },
        { label: 'リビング', type: 'number' }
      ];
      json1.rows = [];
      for (var i in json1_tmp) {
        var p = json1_tmp[i];
        var c = [];
        c.push({ v: p.d });
        c.push({ v: p.c });
        c.push({ v: p.t });
        json1.rows.push({ c: c });
      }
    }
  },
  //
  {
    query: 'SELECT * FROM ' + config.aiseg_watch_main_name,
    callback: function(result) {
      json2_names = {};
      for (var i = 0; i < result.length; i++) {
        json2_names[result[i]['Tag']] = result[i]['Name'];
      }
    }
  },
  {
    query: 'SHOW COLUMNS FROM ' + config.aiseg_watch_main,
    callback: function(result) {
      json2_cols = [];
      for (var i = 0; i < result.length; i++) {
        json2_cols.push(result[i]['Field']);
      }
    }
  },
  {
    query: 'SELECT * FROM ' + config.aiseg_watch_main + ' ' + range_func.where,
    callback: function(result) {
      json2 = {};
      json2.cols = [];
      var time_index = -1;
      for (var i = 0; i < json2_cols.length; i++) {
        var c = {};
        if (json2_names[json2_cols[i]] === undefined) {
          c.label = json2_cols[i];
        } else {
          c.label = json2_names[json2_cols[i]];
        }
        if (json2_cols[i] == 'Datetime') {
          c.type = 'string';
          time_index = i;
        } else {
          c.type = 'number';
        }
        json2.cols.push(c);
      }
      json2.rows = [];
      for (var i = 0; i < result.length; i++) {
        var c = []
        for (var j = 0; j < json2_cols.length; j++) {
          var v = result[i][json2_cols[j]];
          if (j == time_index) {
            v = range_func.fmt_time(v);
          }
          c.push({ v: v });
        }
        json2.rows.push({ c: c });
      }
    }
  },
  //
  {
    query: 'SELECT * FROM ' + config.aiseg_watch_detail_name,
    callback: function(result) {
      json3_names = {};
      for (var i = 0; i < result.length; i++) {
        json3_names[result[i]['Tag']] = result[i]['Name'];
      }
    }
  },
  {
    query: 'SHOW COLUMNS FROM ' + config.aiseg_watch_detail,
    callback: function(result) {
      json3_cols = [];
      for (var i = 0; i < result.length; i++) {
        json3_cols.push(result[i]['Field']);
      }
    }
  },
  {
    query: 'SELECT * FROM ' + config.aiseg_watch_detail + ' ' + range_func.where,
    callback: function(result) {
      json3 = {};
      json3.cols = [];
      var time_index = -1;
      for (var i = 0; i < json3_cols.length; i++) {
        var c = {};
        if (json3_names[json3_cols[i]] === undefined) {
          c.label = json3_cols[i];
        } else {
          c.label = json3_names[json3_cols[i]];
        }
        if (json3_cols[i] == 'Datetime') {
          c.type = 'string';
          time_index = i;
        } else {
          c.type = 'number';
        }
        json3.cols.push(c);
      }
      json3.rows = [];
      for (var i = 0; i < result.length; i++) {
        var c = []
        for (var j = 0; j < json3_cols.length; j++) {
          var v = result[i][json3_cols[j]];
          if (j == time_index) {
            v = range_func.fmt_time(v);
          }
          c.push({ v: v });
        }
        json3.rows.push({ c: c });
      }
    }
  },
];
}

var raw_filelist = [
  '/bootstrap.min.css',
  '/bootstrap.min.js',
  '/main.css'
];

var extfmt = {
  '.html' : 'text/html; charset=utf-8',
  '.css'  : 'text/css; charset=utf-8',
  '.js'   : 'application/javascript; charset=utf-8',
};

http.createServer(function(cliReq, cliRes) {
  var x = url.parse(cliReq.url);
  var return_error = function(res, code, msg) {
    res.writeHead(code, {'Content-Type': 'text/html'});
    res.write('<!DOCTYPE html><html><body><h1>' + code + ' ' + msg + '</h1></body></html>');
    res.end();
  };

  var filename = x.path;
  var is_raw = false;
  var range_func;
  if (raw_filelist.indexOf(filename) >= 0) {
    is_raw = true;
  } else {
    var t = filename.replace('/', '');
    if (filename == '/') {
      t = 'h1';
    }
    range_func = range_tbl[t];
    if (range_func != undefined)
      filename = '/index.html';
  }
  var fmt = extfmt[path.extname(filename)] || 'text/plain';
  cliRes.writeHead(200, {'Content-Type': fmt});

  try {
    var file = fs.readFileSync('.' + filename, 'utf-8');
    if (is_raw == false) {
      sendQueries(createQueries(range_func), function() {
        var title = 'Web statistics watcher [' + range_func.title + ']';
        file = file.split('@@TITLE@@').join(title);
        var repl = 'var jsonData1 = ' + JSON.stringify(json1) + ';\n' 
                 + 'var jsonData2 = ' + JSON.stringify(json2) + ';\n'
                 + 'var jsonData3 = ' + JSON.stringify(json3) + ';';
        file = file.replace('@@JSON_DATA@@', repl);
        cliRes.write(file);
        cliRes.end();
      });
    } else {
      cliRes.write(file);
      cliRes.end();
    }
  } catch (e) {
    console.log(JSON.stringify(e));
    return_error(cliRes, 404, 'Page not found');
  }
}).listen(3000);
