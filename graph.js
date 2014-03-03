jiant.onUiBound(helloJiant, function($, app) {

  var Renderer = function(canvas){
      var canvas = $(canvas).get(0)
      var ctx = canvas.getContext("2d");
      var particleSystem

      var that = {
        init:function(system){
          //
          // the particle system will call the init function once, right before the
          // first frame is to be drawn. it's a good place to set up the canvas and
          // to pass the canvas size to the particle system
          //
          // save a reference to the particle system for use in the .redraw() loop
          particleSystem = system

          // inform the system of the screen dimensions so it can map coords for us.
          // if the canvas is ever resized, screenSize should be called again with
          // the new dimensions
          particleSystem.screenSize(canvas.width, canvas.height)
          particleSystem.screenPadding(80) // leave an extra 80px of whitespace per side

          // set up some event handlers to allow for node-dragging
          that.initMouseHandling()
        },

        redraw:function(){
          //
          // redraw will be called repeatedly during the run whenever the node positions
          // change. the new positions for the nodes can be accessed by looking at the
          // .p attribute of a given node. however the p.x & p.y values are in the coordinates
          // of the particle system rather than the screen. you can either map them to
          // the screen yourself, or use the convenience iterators .eachNode (and .eachEdge)
          // which allow you to step through the actual node objects but also pass an
          // x,y point in the screen's coordinate system
          //
          ctx.fillStyle = "white"
          ctx.fillRect(0,0, canvas.width, canvas.height)

          particleSystem.eachEdge(function(edge, pt1, pt2){
            // edge: {source:Node, target:Node, length:#, data:{}}
            // pt1:  {x:#, y:#}  source position in screen coords
            // pt2:  {x:#, y:#}  target position in screen coords

            if (edge.source.data.visible && edge.target.data.visible) {
            // draw a line from pt1 to pt2
            ctx.strokeStyle = "rgba(0,0,0, .333)"
            ctx.lineWidth = 1
            ctx.beginPath()
            ctx.moveTo(pt1.x, pt1.y)
            ctx.lineTo(pt2.x, pt2.y)
            ctx.stroke()
            }
          })

          particleSystem.eachNode(function(node, pt){
            if (node.data.visible) {
              ctx.font = node.data.font ? node.data.font : "bold 11px Arial"
              ctx.textAlign = "center"
              ctx.fillStyle = node.data.color ? node.data.color : "#888";
              ctx.fillText(node.data.label||"", pt.x, pt.y+4)
            }
          })
        },

        initMouseHandling:function(){
          // no-nonsense drag and drop (thanks springy.js)
          var dragged = null;

          // set up a handler object that will initially listen for mousedowns then
          // for moves and mouseups while dragging
          var handler = {
            clicked:function(e){
              var pos = $(canvas).offset();
              _mouseP = arbor.Point(e.pageX-pos.left, e.pageY-pos.top)
              dragged = particleSystem.nearest(_mouseP);

              if (dragged && dragged.node !== null){
                // while we're dragging, don't let physics move the node
                dragged.node.fixed = true
              }

              $(canvas).bind('mousemove', handler.dragged)
              $(window).bind('mouseup', handler.dropped)

              return false
            },
            dragged:function(e){
              var pos = $(canvas).offset();
              var s = arbor.Point(e.pageX-pos.left, e.pageY-pos.top)

              if (dragged && dragged.node !== null){
                var p = particleSystem.fromScreen(s)
                dragged.node.p = p
              }

              return false
            },

            dropped:function(e){
              if (dragged===null || dragged.node===undefined) return
              if (dragged.node !== null) dragged.node.fixed = false
              dragged.node.tempMass = 1000
              dragged = null
              $(canvas).unbind('mousemove', handler.dragged)
              $(window).unbind('mouseup', handler.dropped)
              _mouseP = null
              return false
            }
          }

          // start listening
          $(canvas).mousedown(handler.clicked);

        }

      }
      return that
    }

  var sections = {
    "states" : "#23F",
    "events" : "#382",
    "ajax" : "#D66",
    "models" : "#F39",
    "views" : "B59",
    "templates" : "#297",
    "logic" : "#73E"};
  var sys = arbor.ParticleSystem(1000, 600, 0.5);
  sys.parameters({gravity:true});
  sys.renderer = Renderer("#jiant_gr_vis");
//  app = pm.ldsClient;
  var root = sys.addNode(app.id, {label: app.id, sourceLabel: app.id, hlLabel: app.id, visible: true});
  $.each(app, function(key, content) {
    var color = sections[key];
    if (color) {
      var obj = {label: key, color: color, font: "bold 13px Arial", visible: true};
      obj.sourceFont = obj.font;
      obj.sourceLabel = obj.label;
      obj.hlLabel = obj.label;
      var section = sys.addNode(key, obj);
      sys.addEdge(root, section);
      $.each(content, function(subKey, subContent) {
        var obj = {label: subKey + ($.isFunction(subContent) ? "()" : ""), color: color, font: "bold 11px Arial", visible: true, dynamic: true};
        obj.sourceFont = obj.font;
        obj.sourceLabel = obj.label;
        var subSection = sys.addNode(key + ":" + subKey, obj);
        sys.addEdge(section, subSection);
        if ($.isFunction(subContent)) {
          obj.hlLabel = makeFunctionSignature(subKey, subContent);
        } else {
          obj.hlLabel = obj.label;
          $.each(subContent._jiantSpec ? subContent._jiantSpec : subContent, function(subSubKey, subSubContent) {
            var obj = {label: subSubKey + ($.isFunction(subSubContent) ? "()" : ""), color: color, font: "10px Arial",
              visible: false, dynamic: false};
            obj.sourceFont = obj.font;
            obj.sourceLabel = obj.label;
            if ($.isFunction(subSubContent)) {
              obj.hlLabel = makeFunctionSignature(subSubKey, subSubContent);
            } else {
              obj.hlLabel = obj.label;
            }
            var subSubSection = sys.addNode(key + ":" + subKey + ":" + subSubKey, obj);
            sys.addEdge(subSection, subSubSection);
          });
        }
      });
    } else {

    }
  });
  var lastNearest;
  $("#jiant_gr_vis").mousemove(function(evt) {
    var nearest = sys.nearest({x: evt.offsetX, y: evt.offsetY}).node;
    if (lastNearest && lastNearest != nearest) {
      lastNearest.data.font = lastNearest.data.sourceFont;
      lastNearest.data.label = lastNearest.data.sourceLabel;
      if (lastNearest.data.dynamic) {
        $.each(sys.getEdgesFrom(lastNearest), function(idx, edge) {
          edge.target.data.visible = false;
        });
      }
    }
    nearest.data.font = "bold 26px Arial";
    nearest.data.label = nearest.data.hlLabel;
    if (nearest.data.dynamic) {
      $.each(sys.getEdgesFrom(nearest), function(idx, edge) {
        edge.target.data.visible = true;
      });
      $.each(sys.getEdgesTo(nearest), function(idx, edge) {
        edge.target.data.visible = true;
      });
    }
    lastNearest = nearest;
  });

  function makeFunctionSignature(key, fnBody) {
    var s = key + "(",
        params = getParamNames(fnBody);
    params && $.each(params, function(idx, key) {
      s += key;
//      idx < params.length - 1 &&
      (s += ", ");
    });
    s += "cb)";
    return s;
  }

  function getParamNames(func) {
//    jiant.logInfo(func.params);
//    var funStr = func.toString();
//    return funStr.slice(funStr.indexOf('(')+1, funStr.indexOf(')')).match(/([^\s,]+)/g);
    return func._jiantSpec;
  }
});
