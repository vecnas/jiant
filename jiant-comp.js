jiant.module("jiant-comp", ["jiant-ui"], function({$, app, jiant, params, "jiant-ui": Ui}) {

  this.singleton();

  function getCompRenderer(appRoot, tmId, componentId, compSpec) {
    return function({data, val, view, elem, isUpdate, settings}) {
      // jiant.logInfo("AAA", componentId, compSpec, "BBB");
      let mapping = settings.mapping || {},
          actualObj = componentId in mapping ? data[mapping[componentId]] : componentId in data ? data[componentId] : data,
          el, singleMode = !Ui.isOptional(compSpec);
      if (data === actualObj && !singleMode) {
        return;
      }
      if (typeof actualObj === "function") {
        actualObj = actualObj.apply(data);
      }
      const dataArr = Array.isArray(actualObj) ? actualObj : [actualObj];
      if (! singleMode) {
        elem.empty();
      }
      const compCbSet = appRoot.templates[tmId].compCbSet;
      compCbSet && compCbSet.start && typeof compCbSet.start === "function" && compCbSet.start.apply();
      dataArr.forEach(function(actualObj, i) {
        if (actualObj) {
          const param = compSpec.params;
          if (param) {
            actualObj = $.extend({}, actualObj, param);
          }
          if ((typeof actualObj == "object") && !("index" in actualObj)) {
            actualObj.index = i;
          }
          const mp = $.isPlainObject(mapping[componentId]) ? mapping[componentId] : mapping;
          if (singleMode && ("propagate" in view[componentId])) {
            view[componentId].propagate(actualObj, settings.subscribeForUpdates, settings.reverseBind, mp);
            Ui.callOnRender(compSpec, {data: actualObj, val, view: view, elem: view[componentId], isUpdate, settings});
          } else {
            el = appRoot.templates[tmId].parseTemplate(actualObj, settings.subscribeForUpdates, settings.reverseBind, mp);
            $.each(appRoot.templates[tmId]._jiantSpec, function(cId, cElem) {
              if (typeof el[cId] === "function") {
                view[componentId][cId] = el[cId].bind(el);
              } else {
                view[componentId][cId] = el[cId];
              }
            });
            view[componentId].propagate = () => el.propagate.apply(el, arguments);
            elem.append(el);
            Ui.callOnRender(compSpec, {data: actualObj, val, view: view, elem: el, isUpdate, settings});
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