jiant.module("jiant-templates", ["jiant-uifactory", "jiant-ui", "jiant-comp", "jiant-fields"],
    function($, app, jiant, params, UiFactory, Ui, Comp, Fields) {

      this.singleton();

  const jTypeTemplate = {};
  let errString;

  function fillClassMappings(elem, classMapping) {
    const childs = elem.find("*"),
        selfs = elem.filter("*");
    $.each($.merge(selfs, childs), function(i, item) {
      if (typeof item.className.split === "function" && item.className.length > 0) {
        const clss = item.className.split(" ");
        $.each(clss, function(i, cls) {
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

  function _bindTemplates(appRoot, root, appUiFactory) {
    errString = "";
    $.each(root, function(tmId, tmContent) {
      const prefix = ("appPrefix" in tmContent) ? tmContent.appPrefix : appRoot.appPrefix,
          tm = appUiFactory.view(prefix, tmId, tmContent, appRoot.bindByTag);
      root[tmId]._jiantSpec = {};
      root[tmId]._jiantType = jTypeTemplate;
      if ("_scan" in tmContent) {
        Ui.scanForSpec(prefix, tmContent, tm);
      }
      const elemTypes = {};
      $.each(tmContent, function (componentId, elemTypeOrArr) {
        const elemType = Ui.getComponentType(elemTypeOrArr);
        elemTypes[componentId] = elemType;
        if (!(componentId in {appPrefix: 1, impl: 1, compCbSet: 1, _jiantSpec: 1, _jiantType: 1, _scan: 1, jInit: 1, _j: 1, customRenderer: 1})) {
          root[tmId]._jiantSpec[componentId] = elemType;
          if (elemType === jiant.lookup) {
            jiant.logInfo("    loookup element, no checks/bindings: " + componentId);
          } else if (elemType === jiant.meta) {
            //skipping, app meta info
          } else if (elemType === jiant.data) {
            tmContent[componentId] = {jiant_data: 1, jiant_data_spec: elemTypeOrArr};
            tmContent[componentId].customRenderer = function(obj, elem, val, isUpdate, viewOrTemplate) {
              viewOrTemplate[componentId](val);
            };
          } else if (elemType === jiant.cssMarker || elemType === jiant.cssFlag) {
            Fields.setupCssFlagsMarkers(tmContent, componentId, elemType, jiant.getAt(elemTypeOrArr, 1), jiant.getAt(elemTypeOrArr, 2));
          } else if (elemType === jiant.fn) {
          } else {
            const comp = appUiFactory.viewComponent(tm, tmId, prefix, componentId, elemType, appRoot.bindByTag);
            errString += UiFactory.ensureExists(prefix, appRoot.dirtyList, comp, prefix + tmId, prefix + componentId,
                Ui.isFlagPresent(elemTypeOrArr, jiant.optional));
            tmContent[componentId] = {};
            if (elemType === jiant.comp) {
              const tmName = jiant.getAt(elemTypeOrArr, 1);
              tmContent[componentId].customRenderer = Comp.getCompRenderer(appRoot, tmName, componentId, elemTypeOrArr);
              if (!(tmName in root)) {
                jiant.error("jiant.comp element refers to non-existing template name: " + tmName + ", tm.elem " + tmId + "." + componentId);
              }
            }
          }
        }
      });
      errString += UiFactory.ensureExists(prefix, appRoot.dirtyList, tm, prefix + tmId);
      root[tmId].templateSource = function() {return tm.html().trim()};
      root[tmId].parseTemplate = function(data, subscribeForUpdates, reverseBind, mapping) {
        const retVal = $("<!-- -->" + jiant._parseTemplate(tm, data, tmId, mapping)); // add comment to force jQuery to read it as HTML fragment
        retVal._jiantSpec = root[tmId]._jiantSpec;
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
          return !bindBy ? byCls
              : bindBy === 'after-class' ? (byCls || byTag)
                  : bindBy === 'before-class' ? (byTag || byCls)
                      : byTag;
        }
        $.each(tmContent, function (componentId, elemTypeOrArr) {
          if (Ui.isServiceName(componentId)) {
            return;
          }
          const elemType = Ui.getComponentType(elemTypeOrArr);
          if (elemType === jiant.lookup) {
            jiant.info("    loookup element, no checks/bindings: " + componentId);
            jiant.setupLookup(retVal, componentId, retVal, prefix);
          } else if (elemType === jiant.meta) {
          } else if (elemType.jiant_data) {
            Fields.setupDataFunction(retVal, root[tmId], componentId, jiant.getAt(elemTypeOrArr.jiant_data_spec, 1),
                jiant.getAt(elemTypeOrArr.jiant_data_spec, 2));
          } else if (elemTypes[componentId] === jiant.cssMarker || elemTypes[componentId] === jiant.cssFlag) {
          } else if (elemType === jiant.fn) {
            retVal[componentId] = elemTypeOrArr[1];
          } else if (! (componentId in {parseTemplate: 1, parseTemplate2Text: 1, templateSource: 1, appPrefix: 1,
            impl: 1, compCbSet: 1, _jiantSpec: 1, _scan: 1, _j: 1, _jiantType: 1, jInit: 1})) {
            retVal[componentId] = getUsingBindBy(componentId);
            if (retVal[componentId]) {
              Fields.setupExtras(appRoot, retVal[componentId], root[tmId]._jiantSpec[componentId], tmId, componentId, retVal, prefix);
              retVal[componentId]._j = {
                parent: retVal
              };
            }
          }
        });
        retVal.splice(0, 1); // remove first comment
        Ui.makePropagationFunction(tmId, tmContent, retVal);
        if (root[tmId].jInit && typeof root[tmId].jInit === "function") {
          root[tmId].jInit.call(retVal, appRoot);
        }
        data && retVal.propagate(data, !!subscribeForUpdates, !!reverseBind, mapping);
        // each(listeners, function(i, l) {l.parsedTemplate && l.parsedTemplate(appRoot, root, tmId, root[tmId], data, retVal)});
        if ((!("ADD_TM_TAGS" in jiant)) || jiant.ADD_TM_TAGS) {
          retVal.addClass("jianttm_" + tmId);
        }
        return retVal;
      };
      root[tmId].parseTemplate2Text = function(data, mapping) {
        return parseTemplate(tm, data, tmId, mapping);
      };
      // each(listeners, function(i, l) {l.boundTemplate && l.boundTemplate(appRoot, root, tmId, prefix, root[tmId])});
    });
    jiant.DEV_MODE && errString.length > 0 && alert("Some templates not bound to HTML properly, check console " + errString);
  }

  jiant.intro.isTemplate = function(obj) {return obj && obj._jiantType === jTypeTemplate};

  return {
    apply: function(appRoot) {
      _bindTemplates(appRoot, appRoot.templates, UiFactory);
    }
  };

});