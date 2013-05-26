module.exports = {
  coordinate: {
    map: function (doc) {
      if(doc.type === "node")
        emit([doc.lat, doc.lng], doc.name);
    }
  },
  links: {
    map: function (doc) {
      if(doc.type === "link")
        emit([doc.protocol, doc._id], doc._rev);
    }
  },
  node_by_address: {
    map: function(doc) {
      if(doc.type == "node") {
        for(var i = 0; i < doc.devices.length; i++) {
          var device = doc.devices[i];
          var value = [doc._id, device.name];
          for(var j=0; j < device.interfaces.length; j++) {
            var intf = device.interfaces[j];
            if(typeof intf.ipv4_address !== "undefined" && 
                intf.ipv4_address !== "" &&
                intf.ipv4_address !== "None") {
              emit(intf.ipv4_address, value);
            }
            if(typeof intf.ipv6_address !== "undefined" && 
                intf.ipv6_address !== "" &&
                intf.ipv6_address !== "None") {
              emit(intf.ipv6_address, value);
            }
            if(typeof intf.mac_address !== "undefined" && 
                intf.mac_address !== "" &&
                intf.mac_address !== "None") {
              emit(intf.mac_address, value);
            }
          }
        }
      }
    }
  },
  ips_per_node: {
    map: function(doc) {
      if(doc.type == "node") {
        for(var i = 0; i < doc.devices.length; i++) {
          var ips = [];
          var device = doc.devices[i];
          for(var j=0; j < device.interfaces.length; j++) {
            var intf = device.interfaces[j];
            if(typeof intf.ipv4_address !== "undefined" && 
                intf.ipv4_address !== "" &&
                intf.ipv4_address !== "None") {
              ips.push(intf.ipv4_address)
            }
            if(typeof intf.ipv6_address !== "undefined" && 
                intf.ipv6_address !== "" &&
                intf.ipv6_address !== "None") {
              ips.push(intf.ipv6_address)
            }
          }
          if(ips.length > 0)
            emit([doc._id, device.name], ips);
        }
      }
    }
  },
  macs_per_node: {
    map: function(doc) {
      if(doc.type == "node") {
        for(var i = 0; i < doc.devices.length; i++) {
          var macs = [];
          var device = doc.devices[i];
          for(var j=0; j < device.interfaces.length; j++) {
            var intf = device.interfaces[j];
            if(typeof intf.mac_address !== "undefined" && 
                intf.mac_address !== "" &&
                intf.mac_address !== "None") {
              macs.push(intf.mac_address)
            }
          }
          if(macs.length > 0)
            emit([doc._id, device.name], macs);
        }
      }
    }
  }
};