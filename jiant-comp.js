jiant.module("jiant-comp", ["jiant-ui"], function($, app, jiant, params, Ui) {

  this.singleton();

  function getCompRenderer(appRoot, tmId, componentId, componentContentOrArr) {
    return function(obj, elem, val, isUpdate, viewOrTemplate, settings) {
      let mapping = settings.mapping || {},
          actualObj = componentId in mapping ? obj[mapping[componentId]] : componentId in obj ? obj[componentId] : obj,
          el, singleMode = !Ui.isFlagPresent(componentContentOrArr, jiant.optional);
      if (obj === actualObj && !singleMode) {
        return;
      }
      if (typeof actualObj === "function") {
        actualObj = actualObj.apply(obj);
      }
      const dataArr = Array.isArray(actualObj) ? actualObj : [actualObj];
      if (! singleMode) {
        elem.empty();
      }
      const compCbSet = appRoot.templates[tmId].compCbSet;
      compCbSet && compCbSet.start && typeof compCbSet.start === "function" && compCbSet.start.apply();
      dataArr.forEach(function(actualObj, i) {
        if (actualObj) {
          const param = jiant.getAt(componentContentOrArr, 2);
          if (param) {
            actualObj = $.extend({}, actualObj, param);
          }
          if ((typeof actualObj == "object") && !("index" in actualObj)) {
            actualObj.index = i;
          }
          const mp = $.isPlainObject(mapping[componentId]) ? mapping[componentId] : mapping;
          if (singleMode && ("propagate" in viewOrTemplate[componentId])) {
            viewOrTemplate[componentId].propagate(actualObj, settings.subscribeForUpdates, settings.reverseBind, mp);
          } else {
            el = appRoot.templates[tmId].parseTemplate(actualObj, settings.subscribeForUpdates, settings.reverseBind, mp);
            $.each(appRoot.templates[tmId]._jiantSpec, function(cId, cElem) {
              if (typeof el[cId] === "function") {
                viewOrTemplate[componentId][cId] = el[cId].bind(el);
              } else {
                viewOrTemplate[componentId][cId] = el[cId];
              }
            });
            viewOrTemplate[componentId].propagate = function() {el.propagate.apply(el, arguments)};
            elem.append(el);
          }
          compCbSet && "perItem" in compCbSet && typeof compCbSet.perItem === "function" && compCbSet.perItem.apply(actualObj, el);
        }
      });
      compCbSet && "end" in compCbSet && typeof compCbSet.end === "function" && compCbSet.end.apply();
    };
  }

  return {
    getCompRenderer: getCompRenderer
  }

});