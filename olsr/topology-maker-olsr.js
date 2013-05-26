#!/usr/bin/env node

var http = require('http');
var _ = require('underscore');
var fs = require('fs');
var ip_calc = require("./ip_address.js");
var olsr = require("./olsr.js");
var nano = require('nano');

/**
 * Module dependencies.
 */

var program = require('commander');

program
  .version('0.0.1')
  .usage('[options] <first_node_ip> [couchdb]')
  .option('-u, --user <username>', 'couchdb username')
  .option('-p, --pass [password]', 'couchdb password')
  .option('-P, --port <n>', 'txt_plugin port [2006]', parseInt, 2006)
  // .option('-4, --port4 <n>', 'txt_plugin IPv4 port [2006]', parseInt, 2006)
  // .option('-6, --port6 <n>', 'txt_plugin IPv6 port [2007]', parseInt, 2007)
  .option('-d, --db <dbname>', 'database name [nnxmap]', String, 'nnxmap')
  .parse(process.argv);


// if(typeof program.port !== 'undefined') {
//   program.port4 = program.port;
//   program.port6 = program.port;
// }

if(program.pass === true) {
  program.password('Password: ', function(pass){
    program.pass = pass;
    process.stdin.destroy();
  });
}

if(program.args.length < 1) {
  program.help();
}

var db_url = 'http://localhost:5984';
if(program.args.length > 1)
  db_url = program.args[1];

var couch = nano(db_url);
var nnxmap = couch.use(program.db);


function startVisit(nodes_by_address, firstIP, txt_plugin_port) {
  var whites = [], greys = [firstIP];
  //MID map data
  var nodeDB = new olsr.MIDMap();
  var oldLinks = {};
  var mid_ready = false, old_links_ready = false;
  //some utility functions
  function getUrl(host, param) {
    return "http://"+host+":" + txt_plugin_port + "/"+param;
  }
  function getLinks(host) { return getUrl(host, "links"); }

  function clean_old_links_if_empty() {
    if(_.isEmpty(greys)) {
      console.log("Pruning old links");
      _.each(oldLinks, function(doc_id, rev) {
        nnxmap.destroy(doc_id, rev, function(err, body) {
          if(err) {
            console.log("Cannot delete old link " + doc_id);
          }
        });
      });
    }
  }

  var visit = function(node) {
    var node_name = nodes_by_address[node];
    console.log("visiting " + node_name + "(" + node + ")");

    var req = http.request(getLinks(node), function(res) {
      if(_.contains(whites, node))
        return;
      whites.push(node);
      var grey_idx = _.indexOf(greys, node);
      greys.splice(grey_idx, 1);

      res.setEncoding('utf8');
      var last=""
      var regex = /(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})\t(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})\t([\d\.]+)\t([\d\.]+)\t([\d\.]+)\t([\d\.]+)\n?/;

      res.on('data', function (chunk) {
        var lines, i;

        lines = (last+chunk).split("\n");
        for(i = 0; i < lines.length - 1; i++) {
          //console.log("parsing: " + lines[i]);
          var match = regex.exec(lines[i]);
          if(match != null) {
            var localIp = match[1];
            var linkIp = match[2];
            var remoteIP = nodeDB.get(linkIp);
            var hyst = match[3];
            var lq = match[4];
            var nlq = match[5];
            var cost = match[6];

            if( !_.contains(whites, remoteIP) &&
                !_.contains(greys, remoteIP)) {
              //schedule NODE navigation
              greys.push(remoteIP);
              visit(remoteIP);
            }

            var link = new olsr.OlsrLink(node, localIp, linkIp, 
              hyst, lq, nlq, cost, node_name);

            var old_link_rev = oldLinks[link._id];
            if(old_link_rev) {
              link._rev = old_link_rev;
              oldLinks[link._id] = false;
            }

            nnxmap.insert(link, function(err, body) {
              if(err) {
                console.log("Error uploading " + link._id);
                console.log(body);
              }
            });
          }
        }
        last = lines[i];
      });
      res.on('end', function() {
        clean_old_links_if_empty();
      });
    });

    req.on('error', function(e) {
      var grey_idx = _.indexOf(greys, node);
      greys.splice(grey_idx, 1);
      console.log('problem with Link request on node ' + node + ': ' + e.message);
    });

    req.end();
  };

  var detectGateways = function(node, callback) {
    var hnaReq = http.request(getUrl("10.150.0.1", "hna"), function(res) {
      console.log("Detecting gateways");
      res.setEncoding('utf8');
      var last=""
      var regex = /\b0\.0\.0\.0\/0\t(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})\n?/;
     
      res.on('data', function (chunk) {
        var lines, i;

        lines = (last+chunk).split("\n");
        for(i = 0; i < lines.length - 1; i++) {
          var match = regex.exec(lines[i]);
          if(match != null) {
            var matchedIp = match[1];
            var nodeName = getNodeName(matchedIp);
            var nodeIdx = node_idxs[nodeName];
            if(graph.nodes[nodeIdx] && graph.nodes[nodeIdx].flags) {
              graph.nodes[nodeIdx].flags['gateway'] = true;
            } else {
              console.log("Errore detect gateway: " +lines[i]);
              console.log("IP: " + matchedIp + "\n MID: " + nodeName + " idx: " + nodeIdx);
              console.log("graph: " + graph.nodes[nodeIdx]);
            }
          }
        }
        last = lines[i];
      });
      res.on('end', callback);
    });


    hnaReq.on('error', function(e) {
      console.log('problem with Gateway detection request: ' + e.message);
      callback();
    });


    hnaReq.end();
  }

  //fetching old links
  nnxmap.view('nnxmap', 'links', function(err, body) {
    if (!err) {
      _.each(body.rows, function(doc) {
        //link_id -> link_rev 
        oldLinks[doc.key[1]] = doc.value;
      })
      old_links_ready = true;
      if(mid_ready)
        visit(firstIP);
    }else {
      console.log("Cannot load links view!");
      console.log(body);
      process.exit(2);
    }
  });

  //build MID map
  var midReq = http.request(getUrl(firstIP, "mid"), function(res) {
    console.log("building MID");
    res.setEncoding('utf8');
    var last=""
    var regex = /(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})\t(.*)\n?/;
   
    res.on('data', function (chunk) {
      var lines, i;

      lines = (last+chunk).split("\n");
      for(i = 0; i < lines.length - 1; i++) {
        var match = regex.exec(lines[i]);
        if(match != null) {
          var nodeIp = match[1];
          nodeDB.add(nodeIp, match[2].split(";"));
        }
      }
      last = lines[i];
    });
    res.on('end', function() {
      mid_ready = true;
      if(old_links_ready)
        visit(firstIP);
    });
  });


  midReq.on('error', function(e) {
    console.log('problem with MID request: ' + e.message);
    process.exit(3);
  });

  midReq.end();
}

console.log("Fetching node_by_address");
nnxmap.view('nnxmap', 'node_by_address', function(err, body) {
  if (!err) {
    var nodes_by_address = {};

    body.rows.forEach(function(doc) {
      nodes_by_address[doc.key] = doc.value[0];
    });

    startVisit(nodes_by_address, program.args[0], program.port);
  }else {
    console.log("Cannot load node_by_address view!");
    console.log(body);
    process.exit(1);
  }
});