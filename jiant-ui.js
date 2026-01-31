jiant.module("jiant-ui", ["jiant-auto", "jiant-render", "jiant-types", "jiant-spec"],
  function ({app, jiant, params, "jiant-auto": Auto, "jiant-render": Render, "jiant-types": JType,
              "jiant-spec": Spec}) {

    this.singleton();

    const serviceNames = ["parseTemplate", "parseTemplate2Text", "propagate", "renderer"];

    function scanForSpec(prefix, content, elem) {
      const root = dom.first(elem);
      const children = root && root.querySelectorAll ? root.querySelectorAll("*") : [];
      for (const child of children) {
        for (const cls of child.className.split(/\s+/)) {
          if (cls.startsWith(prefix)) {
            const name = cls.substring(prefix.length);
            if (!(name in content)) {
              content[name] = Auto.getAutoType(child, name);
            }
          }
        }
      }
    }

    function hndlOn({that, fnName, val, useCls, clsVal, useExactVal, exactVal}) {
      const p = that && that._j && that._j.parent ? (that._j.parent._j = that._j.parent._j || {}) : null,
        fn = typeof val === "function";
      if (!p) {
        return;
      }
      let dir = true;
      p[fnName] = p[fnName] || [];
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
      p[fnName].push(data);
    }

    const dom = jiant.dom;

    function showOn(elem, fldOrCb, exactVal) {
      dom.forEach(elem, function(el) {
        hndlOn({that: el, fnName: "showing", val: fldOrCb, useCls: false,
          useExactVal: arguments.length > 2, exactVal: exactVal});
      });
    }

    function hideOn(elem, fldOrCb, exactVal) {
      if (typeof fldOrCb === "function") {
        showOn(elem, function () {
          return !fldOrCb.apply(this, arguments);
        });
      } else {
        fldOrCb = (fldOrCb.startsWith("!")) ? fldOrCb.substr(1) : ("!" + fldOrCb);
        showOn(elem, fldOrCb, exactVal);
      }
    }

    function switchClassOn(elem, clsOrCb, fldOrCb, exactVal) {
      dom.forEach(elem, function(el) {
        hndlOn({that: el, fnName: "switchClass", val: fldOrCb, useCls: true,
          clsVal: clsOrCb, useExactVal: arguments.length > 3, exactVal: exactVal});
      });
    }

    function getComponentType(spec) {
      return JType.is(spec) ? spec.tp() : (typeof spec === "object" && "tp" in spec) ? spec.tp : spec;
    }

    function updateShowHideCls(view, data) {
      view._j.showing && view._j.showing.forEach(function (item) {
        let on;
        if (item.fn) {
          on = item.fld.call(data, data);
        } else {
          on = typeof data[item.fld] === "function" ? data[item.fld]() : data[item.fld];
        }
        if ("exactVal" in item) {
          on = Array.isArray(item.exactVal) ? jiant.inArray(on, item.exactVal) >= 0 : on === item.exactVal;
        }
        on = item.dir ? on : !on;
        on ? dom.show(item.el) : dom.hide(item.el);
      });
      view._j.switchClass && view._j.switchClass.forEach(function (item) {
        let on;
        if (item.fn) {
          on = item.fld.call(data, data);
        } else {
          on = typeof data[item.fld] === "function" ? data[item.fld]() : data[item.fld];
        }
        if ("exactVal" in item) {
          on = Array.isArray(item.exactVal) ? jiant.inArray(on, item.exactVal) >= 0 : on === item.exactVal;
        }
        on = item.dir ? on : !on;
        on ? dom.addClass(item.el, item.cls) : dom.removeClass(item.el, item.cls);
      });
    }

    function makePropagationFunction({app, viewId, templateId, content, spec, viewOrTm}) {
      const fn = function (data, subscribe4updates, reverseBinding, mapping) {
        const propSettings = {subscribe4updates: subscribe4updates, reverseBinding: reverseBinding, mapping: mapping};
        subscribe4updates = (subscribe4updates === undefined) ? true : subscribe4updates;

        for (let [componentKey, componentSpec] of Object.entries(spec)) {
          let fieldKey = JType.is(componentSpec) ? componentSpec.field() : componentKey;
          let mappedKey, val, elemType = getComponentType(componentSpec);
          mappedKey = (mapping && (fieldKey in mapping)) ? mapping[fieldKey] : fieldKey;
          val = typeof mappedKey === "function" ? mappedKey.apply(data) : data[mappedKey];
          if (elemType?.alwaysUpdatable || Render.isOnRenderPresent({app, viewId, templateId, field: fieldKey})
            || (data && val !== undefined && val !== null && !isServiceName(fieldKey) && !dom.isNode(val))) {

            const actualVal = typeof val === "function" ? val.apply(data) : val;
            const actualElement = viewOrTm[componentKey],
              compType = elemType,
              fnKey = "_j" + componentKey;
            const args =
              {data: data, elem: actualElement, val: actualVal, isUpdate: false, view: viewOrTm,
                settings: propSettings, fieldPresent: typeof data === "object" && mappedKey in data};
            if (content[componentKey].renderer) {
              content[componentKey].renderer(args);
            }
            if (elemType !== jiant.comp) {
              Render.callOnRender({app, viewId, templateId, field: fieldKey, args});
            }
            if (subscribe4updates && typeof data.on === "function" && (spec[componentKey].renderer || typeof val === "function")) { // 3rd ?
              if (fn[fnKey]) {
                const oldData = fn[fnKey][0];
                oldData && oldData.off(fn[fnKey][1]);
                fn[fnKey][2] && dom.off(actualElement, "change", fn[fnKey][2]);
              }
              if (typeof val !== "function") { // ?
                mappedKey = null;
              }
              const handler = data.on(mappedKey, function (obj, newVal) {
                if (arguments.length === 2 && newVal === "remove") {
                  return;
                }
                const args =
                  {data: obj, elem: actualElement, val: newVal, isUpdate: true, view: viewOrTm,
                    settings: propSettings, fieldPresent: mappedKey in obj};
                content[componentKey].renderer(args);
                if (getComponentType(compType) !== jiant.comp) {
                  Render.callOnRender({app, viewId, templateId, field: fieldKey, args});
                }
              });
              fn[fnKey] = [data, handler];
            }
            if (reverseBinding && actualElement) {
              const backHandler = function (event) {
                const actualEl = dom.first(actualElement);
                const tagName = actualEl && actualEl.tagName ? actualEl.tagName.toLowerCase() : "",
                  tp = dom.attr(actualElement, "type"),
                  etype = spec[componentKey];

                function convert(val) {
                  return val === "undefined" ? undefined : val;
                }

                function elem2arr(elem) {
                  const arr = [];
                  dom.forEach(elem, function (item) {
                    dom.getChecked(item) && arr.push(convert(dom.getVal(item)));
                  });
                  return arr;
                }

                function joinOrUndef(arr) {
                  return arr.length === 0 || (arr.length === 1 && arr[0] === undefined) ? undefined : arr.join();
                }

                if (val && typeof val === "function") {
                  if (etype === jiant.inputSet) {
                    val.call(data, elem2arr(actualElement));
                  } else if (etype === jiant.inputSetAsString) {
                    val.call(data, joinOrUndef(elem2arr(actualElement)));
                  } else {
                    if (tagName === "input" && tp === "checkbox") {
                      val.call(data, dom.getChecked(actualElement));
                    } else if (tagName === "input" && tp === "radio") {
                      val.call(data, joinOrUndef(elem2arr(actualElement)));
                    } else if (tagName in {"input": 1, "select": 1, "textarea": 1}) {
                      val.call(data, dom.getVal(actualElement)); // don't convert due to user may input "undefined" as string
                    } else if (tagName === "img") {
                      val.call(data, dom.attr(actualElement, "src"));
                      // no actual event for changing html, manual 'change' trigger supported by this code
                    } else {
                      val.call(data, jiant.html(actualElement));
                    }
                  }
                }
              };
              // jiant.logInfo(viewOrTm, compKey, compElem);
              dom.on(actualElement, "change", backHandler);
              fn[fnKey] && fn[fnKey].push(backHandler);
            }
          }
        }
        const that = this;
        updateShowHideCls(this, data);
        if (subscribe4updates && typeof data.on === "function") {
          const fnKey = "_jShowHideCls";
          if (fn[fnKey]) {
            const oldData = fn[fnKey][0];
            oldData && oldData.off(fn[fnKey][1]);
          }
          const handler = data.on(function (obj, newVal) {
            if (arguments.length === 2 && newVal === "remove") {
              return;
            }
            updateShowHideCls(that, data);
          });
          fn[fnKey] = [data, handler];
        }
        const args = {data: data, view: viewOrTm};
        if (content.renderer && typeof content.renderer === "function") {
          // jiant.logError("R UI 214 " + viewId + "::");
          content.renderer(args);
        }
        Render.callOnRender({app, viewId, templateId, spec, args});
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
      viewOrTm.unpropagate = function () {
        for (let [key, elem] of Object.entries(spec)) {
          const fnKey = "_j" + key;
          if (fn[fnKey]) {
            const oldData = fn[fnKey][0];
            oldData && oldData.off(fn[fnKey][1]);
            fn[fnKey][2] && dom.off(elem, "change", fn[fnKey][2]);
          }
        }
        if (jiant.DEV_MODE) {
          delete viewOrTm._jiantPropagationInfo;
        }
      }
    }

    function isOptional(spec) {
      return !!spec.optional;
    }

    function isServiceName(key) {
      return serviceNames.indexOf(key) >= 0;
    }

    jiant.showOn = showOn;
    jiant.hideOn = hideOn;
    jiant.switchClassOn = switchClassOn;

    return {
      makePropagationFunction,
      isServiceName,
      isOptional,
      scanForSpec,
      getComponentType,
      showOn,
      hideOn,
      switchClassOn,
    }

  });
