var _ = require('underscore')._;

exports.network = function(doc, req) {
  log(doc);
  log(req);
  var graph = {
    nodes: [],
    links: [],
    meta: {
      timestamp: (new Date()).toJSON()
    }
  };
  var nodes_idx = {};
  while (row = getRow()) {
    if(row.value.type === 'node') {
      var idx = graph.nodes.push(row.value) -1;
      nodes_idx[row.value.id] = idx;
    }else if (row.value.type === 'link') {
      graph.links.push(row.value);
    }
  }

  var processed_links = {};
  graph.links = _.map(graph.links, function(link) {
    var peer = [
      { 
        idx: nodes_idx[link.local_node], 
        id: link.local_ip, 
        lq: link.lq,
        node: link.local_node
      },
      { 
        idx: nodes_idx[link.remote_node],
        id: link.remote_ip,
        lq: link.nlq,
        node: link.remote_node
      }];
    for(var i =0; i < 2; i++) {
      if(typeof peer[i].idx === 'undefined') {
        var idx = graph.nodes.push({
          name: peer[i].node,
          type: 'node',
          geo: null,
          description: "",
          owner: null,
          devices: [], //TODO: prune a bit
          flags: { //TODO: detect type
            client: false,
            gateway: false,
            online: true
          },
          macs: [],
          id: peer[i].node 
        }) -1;
        nodes_idx[peer[i].node] = idx;
        peer[i].idx = idx;
      }
      log("node: " + peer[i].id + " idx: " + peer[i].idx);
    }
    var src = peer[0].id < peer[1].id ? 0 : 1;
    var dst = src === 0 ? 1 : 0;
    var link_id = peer[src].id+"-"+peer[dst].id;
    var link_type = undefined; //TODO: check on nodes
    if(!processed_links[link_id]) {
      processed_links[link_id] = true;

      return {
        source: peer[src].idx,
        target: peer[dst].idx,
        id: link_id,
        quality: String(peer[src].lq) + ", " + String(peer[dst].lq),
        type: link_type
      };
    }
  });
  graph.links = _.reject(graph.links, function(link) { return (typeof link === 'undefined');});

  return JSON.stringify(graph);
};