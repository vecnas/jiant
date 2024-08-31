jiant.module("jiant-templates", ["jiant-uifactory", "jiant-ui", "jiant-types", "jiant-spec"],
    function({$, app, jiant, params, "jiant-uifactory": UiFactory, "jiant-ui": Ui,
               "jiant-types": JType, "jiant-spec": Spec}) {

      this.singleton();

  const jTypeTemplate = {};
  let errString;

  function fillClassMappings(elem, classMapping) {
    const childs = elem.find("*"), selfs = elem.filter("*");
    $.each($.merge(selfs, childs), function(i, item) {
      if (typeof item.className.split === "function" && item.className.length > 0) {
        const clss = item.className.split(" ");
        clss.forEach(function(cls) {
          classMapping[cls] = classMapping[cls] || [];
          classMapping[cls].push(item);
        });
      }
    });
  }

  function fillTagMappings(elem, tagMapping) {
    const childs = elem.find("*"), selfs = elem.filter("*");
    $.each($.merge(selfs, childs), function(i, item) {
      const tag = item.tagName.toLowerCase();
      tagMapping[tag] = tagMapping[tag] || [];
      tagMapping[tag].push(item);
    });
  }

  function _bindTemplates(appRoot, root) {
    errString = "";
    $.each(root, function(tmId, tmContent) {
      bindTemplate(appRoot, tmId, tmContent, null, [errString]);
    });
    jiant.DEV_MODE && errString.length > 0 && alert("Some templates not bound to HTML properly, check console " + errString);
  }

  function bindTemplate(appRoot, tmId, tmContent, tm, errArr) {
    const addOnRender = (componentId) => tmContent[componentId].onRender =
      (cb) => jiant.onRender({app: appRoot, templateId: tmId, field: componentId, cb});
    const prefix = jiant.getAppPrefix(appRoot, tmContent);
    tm = tm || UiFactory.view(prefix, tmId, tmContent, appRoot.bindByTag);
    tmContent._jiantType = jTypeTemplate;
    if ("_scan" in tmContent) {
      Ui.scanForSpec(prefix, tmContent, tm);
    }
    $.each(tmContent, function (componentId, elemSpec) {
      elemSpec = tmContent[componentId] = jiant.wrapType(tmContent[componentId]);
      const elemType = JType.is(elemSpec) ? elemSpec.tp() : Ui.getComponentType(elemSpec);
      if (JType.is(elemType)) {
        Spec.templateSpec(appRoot, tmId)[componentId] = elemSpec;
        if (elemSpec.renderProducer) {
          tmContent[componentId].renderer = elemSpec.renderProducer(
            {view: tmContent, templateId: tmId, app: appRoot, componentId, tpInstance: elemSpec});
        }
        addOnRender(componentId);
      } else if (!(componentId in {appPrefix: 1, impl: 1, _jiantType: 1, _scan: 1, jInit: 1, _j: 1, renderer: 1})) {
        Spec.templateSpec(appRoot, tmId)[componentId] = jiant.wrapType(elemType);
        const comp = UiFactory.viewComponent(tm, tmId, prefix, componentId, elemType, appRoot.bindByTag);
        errArr[0] += UiFactory.ensureExists(comp, prefix + tmId, prefix + componentId, Ui.isOptional(elemSpec));
        tmContent[componentId] = {};
        addOnRender(componentId);
      }
    });
    tmContent.onRender = (cb) => jiant.onRender({app: appRoot, templateId: tmId, cb});
    errArr[0] += UiFactory.ensureExists(tm, prefix + tmId);
    tmContent.templateSource = function() {return tm.html().trim()};
    tmContent.parseTemplate = function(data, subscribeForUpdates, reverseBind, mapping) {
      const retVal = $("<!-- -->" + jiant._parseTemplate(tm, data, tmId, mapping)); // add comment to force jQuery to read it as HTML fragment
      retVal._j = {};
      const classMappings = {},
          tagMappings = {};
      if (!appRoot.bindByTag || appRoot.bindByTag === "after-class" || appRoot.bindByTag === "before-class") {
        fillClassMappings(retVal, classMappings);
      }
      if (!!appRoot.bindByTag) {
        fillTagMappings(retVal, tagMappings);
      }
      function getUsingBindBy(componentId) {
        const byCls = (prefix + componentId) in classMappings ?  $(classMappings[prefix + componentId]) : null,
            byTag = componentId in tagMappings ? $(tagMappings[componentId.toLowerCase()]) : null,
            bindBy = appRoot.bindByTag;
        return !bindBy ? byCls : bindBy === 'after-class' ? (byCls || byTag) : bindBy === 'before-class' ? (byTag || byCls) : byTag;
      }
      $.each(tmContent, function (componentId, elemSpec) {
        if (Ui.isServiceName(componentId)) {
          return;
        }
        const elemType = Ui.getComponentType(elemSpec);
        if (JType.is(elemType)) {
          if (elemSpec.componentProducer) {
            const bindLogger = {result: res => {bindLogger.res = res}, res: ""};
            retVal[componentId] = elemSpec.componentProducer(
              {view: tmContent, viewImpl: retVal, templateId: tmId, componentId, app: appRoot, tpInstance: elemSpec, uiFactory: UiFactory, bindLogger});
            // errString += bindLogger.res;
          }
        } else if (! (componentId in {parseTemplate: 1, parseTemplate2Text: 1, templateSource: 1, appPrefix: 1,
          impl: 1, _scan: 1, _j: 1, _jiantType: 1, jInit: 1, renderer: 1})) {
          retVal[componentId] = getUsingBindBy(componentId);
          if (retVal[componentId]) {
            retVal[componentId]._j = {
              parent: retVal
            };
          }
        }
      });
      retVal.splice(0, 1); // remove first comment
      Ui.makePropagationFunction({app: appRoot, templateId: tmId, content: tmContent,
        spec: Spec.templateSpec(appRoot, tmId), viewOrTm: retVal});
      if (tmContent.jInit && typeof tmContent.jInit === "function") {
        tmContent.jInit.call(retVal, appRoot);
      }
      data && retVal.propagate(data, !!subscribeForUpdates, !!reverseBind, mapping);
      if ((!("ADD_TM_TAGS" in jiant)) || jiant.ADD_TM_TAGS) {
        retVal.addClass("jianttm_" + tmId);
      }
      return retVal;
    };
    tmContent.parseTemplate2Text = function(data, mapping) {
      return this.parseTemplate(tm, data, tmId, mapping);
    };
    return tmContent;
  }

  jiant.bindTemplate = bindTemplate;

  jiant.intro.isTemplate = function(obj) {return obj && obj._jiantType === jTypeTemplate};

  return {
    apply: function(appRoot, tree) {
      _bindTemplates(appRoot, tree.templates);
    }
  };

});