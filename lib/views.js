module.exports = {
  coordinate: {
    map: function (doc) {
      if(doc.type === "node")
        emit([doc.lat, doc.lng], doc.name);
    }
  },
  ipv4: {
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
          }
          if(ips.length > 0)
            emit([doc._id, device.name], ips);
        }
      }
    }
  }
};