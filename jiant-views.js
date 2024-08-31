jiant.module("jiant-views", ["jiant-uifactory", "jiant-ui", "jiant-types", "jiant-render", "jiant-spec"],
    function({$, app, jiant, params, "jiant-uifactory": UiFactory, "jiant-ui": Ui, "jiant-types": JType,
               "jiant-spec": Spec}) {

  this.singleton();

  let uiFactory, errString;

  function _bindContent(appRoot, viewRoot, viewId, viewElem, prefix) {
    const addOnRender = (componentId) => viewRoot[componentId].onRender =
      (cb) => jiant.onRender({app: appRoot, viewId, field: componentId, cb});
    viewRoot._j = {};
    $.each(viewRoot, function (componentId, elemSpec) {
      let componentTp = JType.is(elemSpec) ? elemSpec.tp() : Ui.getComponentType(elemSpec);
      Spec.viewSpec(appRoot, viewId)[componentId] = jiant.wrapType(elemSpec);
      if (JType.is(componentTp)) {
        if (elemSpec.componentProducer) {
          const bindLogger = {result: res => {bindLogger.res = res}, res: ""};
          viewRoot[componentId] = elemSpec.componentProducer(
            {view: viewRoot, viewImpl: viewElem, viewId, componentId, app: appRoot, tpInstance: elemSpec, uiFactory, bindLogger});
          errString += bindLogger.res;
        }
        if (elemSpec.renderProducer) {
          viewRoot[componentId].renderer = elemSpec.renderProducer({view: viewRoot, viewId, app: appRoot, componentId, tpInstance: elemSpec});
        }
        addOnRender(componentId);
        viewRoot[componentId]._j = {parent: viewRoot};
      } else if (!(componentId in {appPrefix: 1, impl: 1, _scan: 1, jInit: 1, _j: 1, renderer: 1})) {
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
    for (let key in viewContent) {
      if (! (key in {"_scan": 1, "impl": 1, "jInit": 1, "appPrefix": 1, "renderer": 1})) {
        viewContent[key] = jiant.wrapType(viewContent[key]);
      }
    }
    const result = UiFactory.ensureExists(viewImpl, prefix + viewId);
    if (result.length === 0) {
      _bindContent(appRoot, viewContent, viewId, viewImpl, prefix);
    } else {
      errArr[0] += result;
    }
    ensureSafeExtend(viewContent, viewImpl);
    Ui.makePropagationFunction({app: appRoot, viewId: viewId, content: viewContent,
      spec: Spec.viewSpec(appRoot, viewId), viewOrTm: viewContent});
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