var http = require('http');
var _ = require('underscore');
var fs = require('fs');
var ip_calc = require("./ip_address.js");


var startingNode = "10.150.0.1";
var vpnNetworks = [ "10.150.0.0/24" ];

function getUrl(host, param) {
  return "http://"+host+":2006/"+param;
}

function getLinks(host) { return getUrl(host, "links"); }

function OlsrNode(ip) {
  var aliases = [];
  for(var alias in nodeDB) {
    if(nodeDB[alias] === ip)
      aliases.push(nodeDB[alias]);
  }

  return { 
    name: ip, 
    flags: { //TODO: detect type
      client: false,
      gateway: false,
      online: true
    }, 
    geo: null,
    macs: aliases.toString(),
    id: ip
  };
}


//MID map data
var nodeDB = {};
var getNodeName = function(ip) {
  var entry = nodeDB[ip];
  if(typeof entry === 'undefined')
    return ip;
  return entry;
}

var mapname = "nodes.json";

var ifDoneDump = function(filename) {
  if(!_.isEmpty(greys)) return;

  detectGateways(startingNode, function() {
    fs.writeFile(filename, JSON.stringify(graph), function (err) {
      if (err) throw err;
      console.log('It\'s saved!');
    });
  });
}

var graph = { 
  nodes: [ OlsrNode(startingNode) ], 
  links: [], 
  meta: {
    timestamp: (new Date()).toJSON()
  }
};

var whites = [], greys = [], node_idxs = {};
node_idxs[startingNode] = 0;


var visit = function(node, src_idx) {
  console.log("visiting " + node);

  var req = http.request(getLinks(node), function(res) {
    if(_.contains(whites, node))
      return;
    whites.push(node);
    var grey_idx = _.indexOf(greys, node);
    greys.splice(grey_idx, 1);

    res.setEncoding('utf8');
    var last=""
    var regex = /\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\t(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})\t([\d\.]+)\t([\d\.]+)\t([\d\.]+)\t([\d\.]+)\n?/;
    
    function detectLinkType(src, dest, linkIp) {
      //TODO: client?
      if(_.some(vpnNetworks, function(net) { return ip_calc.matchNetwork(linkIp, net) }))
        return "vpn";
      return undefined; //wificlient...
    }

    res.on('data', function (chunk) {
      var lines, i;

      lines = (last+chunk).split("\n");
      for(i = 0; i < lines.length - 1; i++) {
        var match = regex.exec(lines[i]);
        if(match != null) {
          var linkIp = match[1];
          var remoteIP = getNodeName(linkIp);
          var hyst = match[2];
          var lq = match[3];
          var nlq = match[4];
          var cost = match[5];
          if(_.contains(whites, remoteIP))
            continue;

          var dest_idx = node_idxs[remoteIP];
          if(typeof dest_idx === 'undefined') {
            //NODE generation
            dest_idx = graph.nodes.push(OlsrNode(remoteIP)) -1;
            node_idxs[remoteIP] = dest_idx;
            greys.push(remoteIP);
            visit(remoteIP, dest_idx);
          }

          var peer = [{ idx: src_idx, id: node, lq: lq},
                      { idx: dest_idx, id: remoteIP, lq: nlq}];
          var src = peer[0].id < peer[1].id ? 0 : 1;
          var dst = src === 0 ? 1 : 0;
          var link_id = peer[src].id+"-"+peer[dst].id;
          var link_type = detectLinkType(peer[src], peer[dst], linkIp);

          if(_.find(graph.links, function(l) { return l.id == link_id; }))
            continue;

          graph.links.push( {
            source: peer[src].idx,
            target: peer[dst].idx,
            id: link_id,
            quality: String(peer[src].lq) + ", " + String(peer[dst].lq),
            type: link_type
          });
        }
      }
      last = lines[i];
    });
    res.on('end', function() {
      // var nextNode = greys.pop();
      // if(nextNode)
      //   visit(nextNode, node_idxs[nextNode]);
      //else
      ifDoneDump(mapname);
    });
  });

  req.on('error', function(e) {
    var grey_idx = _.indexOf(greys, node);
    greys.splice(grey_idx, 1);
    console.log('problem with Link request on node ' + node + ': ' + e.message);
    ifDoneDump(mapname);
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

//build MID map
var midReq = http.request(getUrl(startingNode, "mid"), function(res) {
  console.log("MID");
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
        match[2].split(";").forEach( function(alias) {
          nodeDB[alias] = nodeIp;
        });
      }
    }
    last = lines[i];
  });
  res.on('end', function() { visit(startingNode, 0)});
});


midReq.on('error', function(e) {
  console.log('problem with MID request: ' + e.message);
});


midReq.end();
