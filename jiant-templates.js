jiant.module("jiant-templates", ["jiant-uifactory", "jiant-ui", "jiant-comp", "jiant-fields"],
    function({$, app, jiant, params, "jiant-uifactory": UiFactory, "jiant-ui": Ui, "jiant-comp": Comp, "jiant-fields": Fields}) {

      this.singleton();

  const jTypeTemplate = {};
  let errString;

  function fillClassMappings(elem, classMapping) {
    const childs = elem.find("*"),
        selfs = elem.filter("*");
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
    const childs = elem.find("*"),
        selfs = elem.filter("*");
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
    const prefix = jiant.getAppPrefix(appRoot, tmContent);
    tm = tm || UiFactory.view(prefix, tmId, tmContent, appRoot.bindByTag);
    tmContent._jiantSpec = {};
    tmContent._jiantType = jTypeTemplate;
    if ("_scan" in tmContent) {
      Ui.scanForSpec(prefix, tmContent, tm);
    }
    const elemTypes = {};
    $.each(tmContent, function (componentId, elemSpec) {
      const elemType = Ui.getComponentType(elemSpec);
      elemTypes[componentId] = elemType;
      if (!(componentId in {appPrefix: 1, impl: 1, compCbSet: 1, _jiantSpec: 1, _jiantType: 1, _scan: 1, jInit: 1, _j: 1, renderer: 1, onRender: 1})) {
        tmContent._jiantSpec[componentId] = elemType;
        if (elemType === jiant.lookup) {
          jiant.logInfo("    loookup element, no checks/bindings: " + componentId);
        } else if (elemType === jiant.meta) {
          //skipping, app meta info
        } else if (elemType === jiant.data) {
          tmContent[componentId] = jiant.wrapType(tmContent[componentId]);
          tmContent[componentId].jiant_data = 1
          tmContent[componentId].jiant_data_spec = elemSpec;
          tmContent[componentId].renderer = ({data, val, view, elem, isUpdate}) => view[componentId](val);
        } else if (elemType === jiant.cssMarker || elemType === jiant.cssFlag) {
          Fields.setupCssFlagsMarkers(tmContent, componentId, elemType, elemSpec.field, elemSpec.className);
        } else if (elemType === jiant.fn) {
        } else {
          const comp = UiFactory.viewComponent(tm, tmId, prefix, componentId, elemType, appRoot.bindByTag);
          errArr[0] += UiFactory.ensureExists(comp, prefix + tmId, prefix + componentId,
              Ui.isOptional(elemSpec));
          tmContent[componentId] = {};
          if (elemType === jiant.comp) {
            const tmName = elemSpec.compName;
            tmContent[componentId].renderer = Comp.getCompRenderer(appRoot, tmName, componentId, elemSpec);
            if (!(tmName in appRoot.templates)) {
              jiant.error("jiant.comp element refers to non-existing template name: " + tmName + ", tm.elem " + tmId + "." + componentId);
            }
          }
        }
      }
    });
    errArr[0] += UiFactory.ensureExists(tm, prefix + tmId);
    tmContent.templateSource = function() {return tm.html().trim()};
    tmContent.parseTemplate = function(data, subscribeForUpdates, reverseBind, mapping) {
      const retVal = $("<!-- -->" + jiant._parseTemplate(tm, data, tmId, mapping)); // add comment to force jQuery to read it as HTML fragment
      retVal._jiantSpec = tmContent._jiantSpec;
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
        if (elemType === jiant.lookup) {
          jiant.info("    loookup element, no checks/bindings: " + componentId);
          jiant.setupLookup(retVal, componentId, retVal, prefix);
        } else if (elemType === jiant.meta) {
        } else if (elemType.jiant_data) {
          Fields.setupDataFunction(retVal, tmContent, componentId, elemSpec.jiant_data_spec.field, elemSpec.jiant_data_spec.dataName);
        } else if (elemTypes[componentId] === jiant.cssMarker || elemTypes[componentId] === jiant.cssFlag) {
        } else if (elemType === jiant.fn) {
          retVal[componentId] = elemSpec[1];
        } else if (! (componentId in {parseTemplate: 1, parseTemplate2Text: 1, templateSource: 1, appPrefix: 1,
          impl: 1, compCbSet: 1, _jiantSpec: 1, _scan: 1, _j: 1, _jiantType: 1, jInit: 1, renderer: 1, onRender: 1})) {
          retVal[componentId] = getUsingBindBy(componentId);
          if (retVal[componentId]) {
            Fields.setupExtras(appRoot, retVal[componentId], tmContent._jiantSpec[componentId], tmId, componentId, retVal, prefix);
            retVal[componentId]._j = {
              parent: retVal
            };
          }
        }
      });
      retVal.splice(0, 1); // remove first comment
      Ui.makePropagationFunction(tmId, tmContent, retVal);
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