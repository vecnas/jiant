jiant.module("jiant-views", ["jiant-uifactory", "jiant-ui", "jiant-types", "jiant-render", "jiant-spec"],
    function({$, app, jiant, params, "jiant-uifactory": UiFactory, "jiant-ui": Ui, "jiant-types": Types,
               "jiant-spec": Spec}) {

  this.singleton();

  let uiFactory, errString;

  function _bindContent(appRoot, viewRoot, viewId, viewElem, prefix) {
    Types.canonizeMap(viewRoot);
    const addOnRender = (componentId) => viewRoot[componentId].onRender =
      (cb) => jiant.onRender({app: appRoot, viewId, field: componentId, cb});
    viewRoot._j = {};
    jiant.each(viewRoot, function (componentId, elemSpec) {
      const componentTp = Ui.getComponentType(elemSpec);
      const predefined = componentId in {"_scan": 1, "impl": 1, "appPrefix": 1, "renderer": 1, "jInit": 1, "_j": 1};
      if (! predefined) {
        Spec.viewSpec(appRoot, viewId)[componentId] = jiant.wrapType(elemSpec);
      }
      if (Types.is(componentTp)) {
        if (elemSpec.componentProducer) {
          const bindLogger = {result: res => {bindLogger.res = res}, res: ""};
          viewRoot[componentId] = elemSpec.componentProducer({view: viewRoot, viewImpl: viewElem,
            viewId, componentId, app: appRoot, tpInstance: elemSpec, uiFactory, bindLogger});
          errString += bindLogger.res;
        }
        if ("renderProducer" in elemSpec) {
          viewRoot[componentId].renderer = elemSpec.renderProducer({view: viewRoot, viewId,
            app: appRoot, componentId, tpInstance: elemSpec});
        }
        addOnRender(componentId);
        viewRoot[componentId]._j = {parent: viewRoot};
      } else if (! predefined) {
        const uiElem = uiFactory.viewComponent(viewElem, viewId, prefix, componentId, componentTp, appRoot.bindByTag);
        errString += UiFactory.ensureExists(uiElem, prefix + viewId, prefix + componentId,
            Ui.isOptional(elemSpec));
        viewRoot[componentId] = uiElem;
        addOnRender(componentId);
      }
    });
    viewRoot.onRender = (cb) => jiant.onRender({app: appRoot, viewId, cb});
  }

  function ensureSafeExtend(spec, jqObject) {
    jiant.each(spec, function(key, content) {
      if (jqObject[key]) {
        jiant.info("unsafe extension: " + key + " already defined in base jQuery, shouldn't be used, now overriding!");
        jqObject[key] = undefined;
      }
    });
  }

  function _bindViews(appRoot, root, appUiFactory) {
    uiFactory = appUiFactory;
    errString = "";
    jiant.each(root, function(viewId, viewContent) {
      bindView(appRoot, viewId, viewContent, null, [errString]);
    });
    jiant.DEV_MODE && errString.length > 0 && alert("Some views not bound to HTML properly, check console " + errString);
  }

  function bindView(appRoot, viewId, viewContent, viewImpl, errArr) {
    if (Spec.isViewPresent(appRoot, viewId)) {
      jiant.errorp("Binding to already bound view, skipping. App id: !!, viewId: !!", appRoot.id, viewId);
      return;
    }
    const prefix = jiant.getAppPrefix(appRoot, viewContent);
    viewImpl = viewImpl || UiFactory.view(prefix, viewId, viewContent, appRoot.bindByTag);
    if ("_scan" in viewContent) {
      Ui.scanForSpec(prefix, viewContent, viewImpl);
    }
    const result = UiFactory.ensureExists(viewImpl, prefix + viewId);
    if (result.length === 0) {
      _bindContent(appRoot, viewContent, viewId, viewImpl, prefix);
    } else {
      errArr[0] += result;
    }
    ensureSafeExtend(viewContent, viewImpl);
    const viewSpec = Spec.viewSpec(appRoot, viewId);
    Ui.makePropagationFunction({app: appRoot, viewId: viewId, content: viewContent,
      spec: viewSpec, viewOrTm: viewContent});
    jiant.extend(viewContent, viewImpl);
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
