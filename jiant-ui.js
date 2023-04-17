jiant.module("jiant-ui", ["jiant-fields"],function($, app, jiant, params, Fields) {

  this.singleton();

  const customElementRenderers = {};
  const serviceNames = ["parseTemplate", "parseTemplate2Text", "propagate", "customRenderer", "jMapping", "jMapped", "_jiantSpec"];

  function scanForSpec(prefix, content, elem) {
    const children = elem[0].getElementsByTagName("*");
    for (const child of children) {
      for (const cls of child.className.split(/\s+/)) {
        if (cls.startsWith(prefix)) {
          const name = cls.substring(prefix.length);
          if (! (name in content)) {
            content[name] = Fields.getAutoType(child, name);
          }
        }
      }
    }
  }

  function hndlOn(that, parentName, val, useCls, clsVal, useExactVal, exactVal) {
    const p = that._j.parent._j,
        fn = typeof val === "function";
    let dir = true;
    p[parentName] = p[parentName] || [];
    if (!fn && val.startsWith("!")) {
      val = val.substr(1);
      dir = false;
    }
    const data = {el: that, fld: val, dir: dir, fn: fn};
    if (useCls) {
      data.cls = clsVal;
    }
    if (useExactVal) {
      data.exactVal = exactVal;
    }
    p[parentName].push(data);
  }
  $.fn.extend({
    showOn: function(fldOrCb, exactVal) {
      hndlOn(this, "showing", fldOrCb, false, undefined, arguments.length > 1, exactVal);
    },
    hideOn: function(fldOrCb, exactVal) {
      if (typeof fldOrCb === "function") {
        this.showOn(function() {
          return !fldOrCb.apply(this, arguments);
        });
      } else {
        fldOrCb = (fldOrCb.startsWith("!")) ? fldOrCb.substr(1) : ("!" + fldOrCb);
        arguments.length > 1 ? this.showOn(fldOrCb, exactVal) : this.showOn(fldOrCb);
      }
    },
    switchClassOn: function(clsOrCb, fldOrCb, exactVal) {
      hndlOn(this, "switchClass", fldOrCb, true, clsOrCb, arguments.length > 1, exactVal);
    }
  });

  function updateHref(obj, elem, val, isUpdate, viewOrTemplate) {
    elem.attr("href", !!val ? val : "");
  }

  function updateImgBg(obj, elem, val, isUpdate, viewOrTemplate) {
    elem.css("background-image", !!val ? "url(\"" + val + "\")" : "");
  }

  function updateInputSet(obj, elem, val, isUpdate, viewOrTemplate) {
    if (!elem || !elem[0]) {
      return;
    }
    $.each(elem, function(i, item) {
      item = $(item);
      let check = item.val() === val + "";
      if (!check && Array.isArray(val)) {
        val.forEach(function(subval) {
          if (subval + "" === item.val() + "") {
            check = true;
            return false;
          }
        });
      }
      item.prop("checked", check);
    });
  }

  function getComponentType(spec) {
    return (spec.tp) ? spec.tp : spec;
  }

  function updateViewElement(obj, elem, val, isUpdate, viewOrTemplate) {
    if (!elem || !elem[0]) {
      return;
    }
    const tagName = elem[0].tagName.toLowerCase();
    if (tagName in {"input": 1, "textarea": 1, "select": 1}) {
      const el = $(elem[0]),
          tp = el.attr("type");
      if (tp === "checkbox") {
        elem.prop("checked", !!val);
      } else if (tp === "radio") {
        elem.forEach(function(subelem) {
          $(subelem).prop("checked", subelem.value === (val + ""));
        });
      } else {
        (val === undefined || val === null) ? elem.val(val) : elem.val(val + "");
      }
    } else if (tagName === "img") {
      elem.attr("src", val);
    } else {
      elem.html(val === undefined ? "" : val);
    }
  }

  function getRenderer(obj, elemType) {
    elemType = getComponentType(elemType);
    if (obj && obj.customRenderer && typeof obj.customRenderer === "function") {
      return obj.customRenderer;
    } else if (customElementRenderers[elemType]) {
      return customElementRenderers[elemType];
    } else if (elemType === jiant.inputSet) {
      return updateInputSet;
    } else if (elemType === jiant.href) {
      return updateHref;
    } else if (elemType === jiant.imgBg) {
      return updateImgBg;
    } else if (elemType === jiant.inputSetAsString) {
      return function(obj, elem, val, isUpdate, viewOrTemplate) {
        updateInputSet(obj, elem, !val ? [val] : Array.isArray(val) ? val : $.isNumeric(val) ? [val] : ("" + val).split(","), isUpdate, viewOrTemplate);
      };
    } else {
      return updateViewElement;
    }
  }

  function makePropagationFunction(viewId, spec, viewOrTm) {
    const map = {};
    $.each(spec, function (key, elem) {
      map[key] = elem;
    });
    spec.jMapped && $.each(spec.jMapped, function(key, arr) {
      arr.forEach(function(elem) {
        map[elem] = map[elem] || 1;
      });
    });
    const fn = function(data, subscribe4updates, reverseBinding, mapping) {
      const propSettings = {subscribe4updates: subscribe4updates, reverseBinding: reverseBinding, mapping: mapping};
      subscribe4updates = (subscribe4updates === undefined) ? true : subscribe4updates;
      $.each(map, function (key, elem) {
        let actualKey = (mapping && mapping[key]) ? mapping[key] : key,
            val = typeof actualKey === "function" ? actualKey.apply(data) : data[actualKey],
            elemType = viewOrTm._jiantSpec[key];
        if ((spec[key] && spec[key].customRenderer) || customElementRenderers[elemType] || (spec.jMapping && spec.jMapping[key])
            || (data && val !== undefined && val !== null && !isServiceName(key) && !(val instanceof $))) {
          const actualVal = typeof val === "function" ? val.apply(data) : val;
          [key].concat(spec.jMapping && spec.jMapping[key]? spec.jMapping[key] : []).some(function(compKey) {
            if (compKey === key && spec.jMapped && spec.jMapped[compKey]) {
              return true;
            }
            const compElem = viewOrTm[compKey],
                compType = viewOrTm._jiantSpec[compKey],
                fnKey = "_j" + compKey;
            if (compKey !== "_jiantSpec") {
              getRenderer(spec[compKey], compType)(data, compElem, actualVal, false, viewOrTm, propSettings);
            }
            if (subscribe4updates && typeof data.on === "function" && (spec[compKey].customRenderer || typeof val === "function")) { // 3rd ?
              if (fn[fnKey]) {
                const oldData = fn[fnKey][0];
                oldData && oldData.off(fn[fnKey][1]);
                fn[fnKey][2] && compElem.off && compElem.off("change", fn[fnKey][2]);
              }
              if (typeof val !== "function") { // ?
                actualKey = null;
              }
              const handler = data.on(actualKey, function(obj, newVal) {
                if (arguments.length === 2 && newVal === "remove") {
                  return;
                }
                getRenderer(spec[compKey], compType)(data, compElem, newVal, true, viewOrTm, propSettings);
              });
              fn[fnKey] = [data, handler];
            }
            if (reverseBinding && compElem && compElem.change) {
              const backHandler = function(event) {
                const tagName = compElem[0].tagName.toLowerCase(),
                    tp = compElem.attr("type"),
                    etype = viewOrTm._jiantSpec[compKey];
                function convert(val) {
                  return val === "undefined" ? undefined : val;
                }
                function elem2arr(elem) {
                  const arr = [];
                  $.each(elem, function (i, item) {!!$(item).prop("checked") && arr.push(convert($(item).val()));});
                  return arr;
                }
                function joinOrUndef(arr) {
                  return arr.length === 0 || (arr.length === 1 && arr[0] === undefined) ? undefined : arr.join();
                }
                if (val && typeof val === "function") {
                  if (etype === jiant.inputSet) {
                    val.call(data, elem2arr(compElem));
                  } else if (etype === jiant.inputSetAsString) {
                    val.call(data, joinOrUndef(elem2arr(compElem)));
                  } else {
                    if (tagName === "input" && tp === "checkbox") {
                      val.call(data, !!compElem.prop("checked"));
                    } else if (tagName === "input" && tp === "radio") {
                      val.call(data, joinOrUndef(elem2arr(compElem)));
                    } else if (tagName in {"input": 1,  "select": 1, "textarea": 1}) {
                      val.call(data, compElem.val()); // don't convert due to user may input "undefined" as string
                    } else if (tagName === "img") {
                      val.call(data, compElem.attr("src"));
                      // no actual event for changing html, manual 'change' trigger supported by this code
                    } else {
                      val.call(data, compElem.html());
                    }
                  }
                }
              };
              // jiant.logInfo(viewOrTm, compKey, compElem);
              compElem.change(backHandler);
              fn[fnKey] && fn[fnKey].push(backHandler);
            }
          });
        }
      });
      const that = this;
      updateShowHideCls(this, data);
      if (subscribe4updates && typeof data.on === "function") {
        const fnKey = "_jShowHideCls";
        if (fn[fnKey]) {
          const oldData = fn[fnKey][0];
          oldData && oldData.off(fn[fnKey][1]);
        }
        const handler = data.on(function(obj, newVal) {
          if (arguments.length === 2 && newVal === "remove") {
            return;
          }
          updateShowHideCls(that, data);
        });
        fn[fnKey] = [data, handler];
      }

      function updateShowHideCls(view, data) {
        view._j.showing && view._j.showing.forEach(function(item) {
          let on;
          if (item.fn) {
            on = item.fld.call(data, data);
          } else {
            on = typeof data[item.fld] === "function" ? data[item.fld]() : data[item.fld];
          }
          if ("exactVal" in item) {
            on = Array.isArray(item.exactVal) ? $.inArray(on, item.exactVal) >= 0 : on === item.exactVal;
          }
          on = item.dir ? on : !on;
          item.el[on ? "show" : "hide"]();
        });
        view._j.switchClass && view._j.switchClass.forEach(function(item) {
          let on;
          if (item.fn) {
            on = item.fld.call(data, data);
          } else {
            on = typeof data[item.fld] === "function" ? data[item.fld]() : data[item.fld];
          }
          if ("exactVal" in item) {
            on = Array.isArray(item.exactVal) ? $.inArray(on, item.exactVal) >= 0 : on === item.exactVal;
          }
          on = item.dir ? on : !on;
          item.el[on ? "addClass" : "removeClass"](item.cls);
        });
      }
      if (spec.customRenderer && typeof spec.customRenderer === "function") {
        spec.customRenderer(data, viewOrTm);
      }
      if (jiant.DEV_MODE) {
        viewOrTm._jiantPropagationInfo = {
          modelName: data ? data.jModelName : "",
          data: data,
          subscribe4updates: subscribe4updates,
          reverseBinding: reverseBinding,
          mapping: mapping,
          trace: jiant.getStackTrace()
        };
      }
    };
    viewOrTm.propagate = fn;
    viewOrTm.unpropagate = function() {
      $.each(map, function (key, elem) {
        const fnKey = "_j" + key;
        if (fn[fnKey]) {
          const oldData = fn[fnKey][0];
          oldData && oldData.off(fn[fnKey][1]);
          fn[fnKey][2] && elem.off && elem.off("change", fn[fnKey][2]);
        }
      });
      if (jiant.DEV_MODE) {
        delete viewOrTm._jiantPropagationInfo;
      }
    }
  }

  function isOptional(spec) {
    return !! spec.optional;
  }

  function registerCustomRenderer(customRendererName, handler) {
    if (! (typeof customRendererName === 'string' || customRendererName instanceof String)) {
      alert("Custom renderer name should be string");
    }
    customElementRenderers[customRendererName] = handler;
  }

  function isServiceName(key) {
    return serviceNames.indexOf(key) >= 0;
  }

  jiant.registerCustomRenderer = registerCustomRenderer;

  return {
    makePropagationFunction: makePropagationFunction,
    isServiceName: isServiceName,
    isOptional: isOptional,
    scanForSpec: scanForSpec,
    getComponentType: getComponentType
  }

});
