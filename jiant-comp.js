jiant.module("jiant-comp", ["jiant-render", "jiant-spec"],
  function({jiant, "jiant-render": Render, "jiant-spec": Spec}) {

  this.singleton();

  function getCompRenderer({app: appRoot, componentId, templateId, viewId, field, spec: compSpec}) {
    return function({data, val, view, elem, isUpdate, settings}) {
      let mapping = settings.mapping || {},
          actualObj = field in mapping ? data[mapping[field]] : field in data ? data[field] : data,
          el, singleMode = !compSpec.optional();
      if (data === actualObj && !singleMode) {
        return;
      }
      if (typeof actualObj === "function") {
        actualObj = actualObj.apply(data);
      }
      const dataArr = Array.isArray(actualObj) ? actualObj : [actualObj];
      if (! singleMode) {
        jiant.empty(elem);
      }
      dataArr.forEach(function(actualObj, i) {
        if (actualObj) {
          const param = compSpec.params();
          if (param) {
            actualObj = jiant.extend({}, actualObj, param);
          }
          if ((typeof actualObj == "object") && !("index" in actualObj)) {
            actualObj.index = i;
          }
          const mp = jiant.isPlainObject(mapping[field]) ? mapping[field] : mapping;
          if (singleMode && ("propagate" in view[field])) {
            view[field].propagate(actualObj, settings.subscribeForUpdates, settings.reverseBind, mp);
            const args = {data: actualObj, val, view,  elem: view[field], isUpdate, settings};
            Render.callOnRender({app: appRoot, viewId, templateId, field, args});
          } else {
            el = appRoot.templates[componentId].parseTemplate(actualObj, settings.subscribeForUpdates, settings.reverseBind, mp);
            jiant.each(Spec.templateSpec(appRoot, componentId), function(cId, cElem) {
              if (typeof el[cId] === "function") {
                view[field][cId] = el[cId].bind(el);
              } else {
                view[field][cId] = el[cId];
              }
            });
            view[field].propagate = function() {el.propagate.apply(el, arguments)};
            elem.append(el);
            const args = {data: actualObj, val, view, elem: el, isUpdate, settings};
            Render.callOnRender({app: appRoot, viewId, templateId, field, args});
          }
        }
      });
    };
  }

  return {
    getCompRenderer
  }

});
