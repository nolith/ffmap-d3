var http = require('http');
var _ = require('underscore');

var startingNode= "10.150.3.13";

function getUrl(host, param) {
  return "http://"+host+":2006/"+param;
}

function getLinks(host) { return getUrl(host, "links"); }

function OlsrNode(ip) {
  return { 
    'name': ip, 
    "flags": { //TODO: detect type
      "client": false,
      "gateway": false,
      "online": true
    }, 
    "geo": null,
    "macs": "", //TODO sobstitute with MID
    "id": ip
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

var graph = { 
  nodes: [ OlsrNode(startingNode) ], 
  links: [], 
  meta: {
    timestamp: "2013-05-08T21:08:04"
  }
};

var whites = [], greys = [], node_idxs = {};
node_idxs[startingNode] = 0;


var visit = function(node, src_idx) {
  console.log("visiting " + node);

  var req = http.request(getLinks(node), function(res) {
    res.setEncoding('utf8');
      var last=""
      var regex = /\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\t(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})\t([\d\.]+)\t([\d\.]+)\t([\d\.]+)\t([\d\.]+)\n?/;
     
      res.on('data', function (chunk) {
        var lines, i;

        lines = (last+chunk).split("\n");
        for(i = 0; i < lines.length - 1; i++) {
          var match = regex.exec(lines[i]);
          if(match != null) {
            var remoteIP = getNodeName(match[1]);
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
            }

            graph.links.push( {
              'source': src_idx,
              'target': dest_idx,
              'id': node+"-"+remoteIP,
              "quality": String(lq) + ", " + String(nlq),
              "type": null //TODO: detect type
            });
          }
        }
        last = lines[i];
      });
      res.on('end', function() {
        var nextNode = greys.pop();
        if(nextNode)
          visit(nextNode, node_idxs[nextNode]);
        else
          console.log(graph);
      });
  });

  req.on('error', function(e) {
    console.log('problem with Link request on node ' + node + ': ' + e.message);
  });

  req.end();
};

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