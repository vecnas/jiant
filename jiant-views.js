jiant.module("jiant-views", ["jiant-uifactory", "jiant-ui", "jiant-comp", "jiant-fields"],
    function($, app, jiant, params, UiFactory, Ui, Comp, Fields) {

  this.singleton();

  let uiFactory, errString;

  function _bindContent(appRoot, viewRoot, viewId, viewElem, prefix) {
    const typeSpec = {};
    viewRoot._j = {};
    viewRoot._jiantSpec = typeSpec;
    $.each(viewRoot, function (componentId, elemTypeOrArr) {
      const componentTp = Ui.getComponentType(elemTypeOrArr);
      typeSpec[componentId] = elemTypeOrArr;
      if (componentId in {appPrefix: 1, impl: 1, compCbSet: 1, _jiantSpec: 1, _scan: 1, jInit: 1, _j: 1, customRenderer: 1}) {
        //skip
      } else if (componentTp === jiant.lookup) {
        jiant.logInfo("    loookup element, no checks/bindings: " + componentId);
        jiant.setupLookup(viewRoot, componentId, viewElem, prefix);
      } else if (componentTp === jiant.meta) {
        //skipping, app meta info
      } else if (componentTp === jiant.data) {
        Fields.setupDataFunction(viewRoot, viewRoot, componentId, jiant.getAt(elemTypeOrArr, 1), jiant.getAt(elemTypeOrArr, 2));
        viewRoot[componentId].customRenderer = function(obj, elem, val, isUpdate, viewOrTemplate) {viewRoot[componentId](val)}
      } else if (componentTp === jiant.cssMarker || componentTp === jiant.cssFlag) {
        Fields.setupCssFlagsMarkers(viewRoot, componentId, componentTp, jiant.getAt(elemTypeOrArr, 1), jiant.getAt(elemTypeOrArr, 2));
      } else if (componentTp === jiant.fn) {
        viewRoot[componentId] = elemTypeOrArr[1];
      } else {
        const uiElem = uiFactory.viewComponent(viewElem, viewId, prefix, componentId, componentTp, appRoot.bindByTag);
        errString += UiFactory.ensureExists(prefix, appRoot.dirtyList, uiElem, prefix + viewId, prefix + componentId,
            Ui.isFlagPresent(elemTypeOrArr, jiant.optional));
        viewRoot[componentId] = uiElem;
        // jiant.infop("!!.!! : !!", viewId, componentId, componentTp);
        Fields.setupExtras(appRoot, uiElem, componentTp, viewId, componentId, viewRoot, prefix);
        if (componentTp === jiant.comp) {
          const tmName = jiant.getAt(elemTypeOrArr, 1);
          viewRoot[componentId].customRenderer = Comp.getCompRenderer(appRoot, tmName, componentId, elemTypeOrArr);
          // no need for such init for templates because template always propagated on creation
          if (!Ui.isFlagPresent(elemTypeOrArr, jiant.optional)) {
            jiant.onApp(appRoot, function() {
              viewRoot[componentId].customRenderer({}, viewRoot[componentId], undefined, false, viewRoot, {});
            });
          }
          if (! (tmName in appRoot.templates)) {
            jiant.error("jiant.comp element refers to non-existing template name: " + tmName + ", view.elem: " + viewId + "." + componentId);
          }
        }
        viewRoot[componentId]._j = {
          parent: viewRoot
        };
      }
    });
  }

  function ensureSafeExtend(spec, jqObject) {
    $.each(spec, function(key, content) {
      if (jqObject[key]) {
        jiant.info("unsafe extension: " + key + " already defined in base jQuery, shouldn't be used, now overriding!");
        jqObject[key] = undefined;
      }
    });
  }

  function _bindViews(appRoot, root, appUiFactory) {
    uiFactory = appUiFactory;
    errString = "";
    $.each(root, function(viewId, viewContent) {
      bindView(appRoot, viewId, viewContent, null, [errString]);
    });
    jiant.DEV_MODE && errString.length > 0 && alert("Some views not bound to HTML properly, check console " + errString);
  }

  function bindView(appRoot, viewId, viewContent, viewImpl, errArr = [""]) {
    const prefix = ("appPrefix" in viewContent) ? viewContent.appPrefix : appRoot.appPrefix;
    viewImpl = viewImpl || UiFactory.view(prefix, viewId, viewContent, appRoot.bindByTag);
    if ("_scan" in viewContent) {
      Ui.scanForSpec(prefix, viewContent, view);
    }
    if (viewContent._jiantSpec) {
      const spec = viewContent._jiantSpec;
      for (let key of viewContent) {
        delete viewContent[key];
      }
      if (viewId in appRoot.views) {
        appRoot.views[viewId] = viewContent;
      }
      $.each(spec, function(key, val) {
        viewContent[key] = val;
      })
    }
    const result = UiFactory.ensureExists(prefix, appRoot.dirtyList, viewImpl, prefix + viewId);
    if (result.length === 0) {
      _bindContent(appRoot, viewContent, viewId, viewImpl, prefix);
    } else {
      errArr[0] += result;
    }
    ensureSafeExtend(viewContent, viewImpl);
    Ui.makePropagationFunction(viewId, viewContent, viewContent);
    $.extend(viewContent, viewImpl);
    if (viewContent.jInit && typeof viewContent.jInit === "function") {
      viewContent.jInit.call(viewContent, appRoot);
    }
    return viewContent;
  }

  jiant.bindView = bindView;

  return {
    apply: function(appRoot, tree) {
      _bindViews(appRoot, tree.views, UiFactory);
    }
  };

});