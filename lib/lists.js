var _ = require('underscore')._;

exports.network = function(doc, req) {
  log(doc);
  log(req);
  var graph = {
    nodes: [],
    links: []
  };
  var nodes_idx = {};
  while (row = getRow()) {
    if(row.value.type === 'node') {
      var idx = graph.nodes.push(row.value);
      nodes_idx[row.value._id] = idx;
    }else if (row.value.type === 'link') {
      graph.links.push(row.value);
    }
  }

  return JSON.stringify(graph);
};