jiant.module("jiant-dev", function({jiant}) {

  this.singleton();

  function maybeAddDevHook(uiElem, key, elem, prefix, viewOrTm) {
    jiant.DEV_MODE && uiElem.click(function(event) {
      if (event.shiftKey && event.altKey) {
        let message = key + (elem ? ("." + elem) : "");
        if (event.ctrlKey) {
          message += "\r\n------------\r\n";
          message += pseudoserializeJSON($._data(uiElem[0], "events"));
        }
        jiant.info(message);
        if (viewOrTm._jiantPropagationInfo) {
          jiant.logInfo("Last propagated by: ", viewOrTm._jiantPropagationInfo, viewOrTm._jiantPropagationInfo.trace);
        } else {
          jiant.logInfo("No propagation for this view");
        }
        // alert(message);
        event.preventDefault();
        event.stopImmediatePropagation();
      } else if (event.ctrlKey && event.altKey) {
        jiant.copy2cb("#" + prefix + key + " " + (elem ? ("." + prefix + elem) : ""));
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    });
  }

  // not serialization actually, for example when text contains " - generates invalid output. just for dev purposes
  function pseudoserializeJSON(obj) {
    let t = typeof (obj);
    if (t !== "object" || obj === null) {
      // simple data type
      if (t === "string") {
        obj = '"' + obj + '"';
      }
      return String(obj);
    } else {
      // array or object
      const json = [],
          arr = (obj && obj.constructor === Array);
      jiant.each(obj, function (k, v) {
        t = typeof(v);
        if (t === "string") {
          v = '"' + v + '"';
        } else if (t === "object" && v !== null) {
          v = pseudoserializeJSON(v);
        }
        json.push((arr ? "" : '"' + k + '":') + (v ? v : "\"\""));
      });
      return (arr ? "[" : "{") + String(json) + (arr ? "]" : "}");
    }
  }

  function visualize(app) {
    const path = "//cdn.jsdelivr.net/gh/vecnas/jiant@4.04/";
    jiant.module("jiant-visualize", {js: [
        path + "arbor.js",
        path + "arbor-tween.js",
        path + "graph.js",
      ]});
    jiant.loadModule(app, "jiant-visualize", function() {
      jiant.onApp(app, ["jiantVisualizer"], function($, app) {
        app.logic.jiantVisualizer.visualize($, app);
      });
    });
  }

  jiant.visualize = visualize;

  return {
    visualize: visualize
  }

});