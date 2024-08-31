jiant.module("jiant-ui", ["jiant-auto", "jiant-render", "jiant-types", "jiant-spec"],
  function ({$, app, jiant, params, "jiant-auto": Auto, "jiant-render": Render, "jiant-types": JType,
              "jiant-spec": Spec}) {

    this.singleton();

    const serviceNames = ["parseTemplate", "parseTemplate2Text", "propagate", "renderer"];

    function scanForSpec(prefix, content, elem) {
      const children = elem[0].getElementsByTagName("*");
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
      const p = that._j.parent._j,
        fn = typeof val === "function";
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

    $.fn.extend({
      showOn: function (fldOrCb, exactVal) {
        hndlOn({that: this, fnName: "showing", val: fldOrCb, useCls: false,
          useExactVal: arguments.length > 1, exactVal: exactVal});
      },
      hideOn: function (fldOrCb, exactVal) {
        if (typeof fldOrCb === "function") {
          this.showOn(function () {
            return !fldOrCb.apply(this, arguments);
          });
        } else {
          fldOrCb = (fldOrCb.startsWith("!")) ? fldOrCb.substr(1) : ("!" + fldOrCb);
          arguments.length > 1 ? this.showOn(fldOrCb, exactVal) : this.showOn(fldOrCb);
        }
      },
      switchClassOn: function (clsOrCb, fldOrCb, exactVal) {
        hndlOn({that: this, fnName: "switchClass", val: fldOrCb, useCls: true,
          clsVal: clsOrCb, useExactVal: arguments.length > 1, exactVal: exactVal});
      }
    });

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
          on = Array.isArray(item.exactVal) ? $.inArray(on, item.exactVal) >= 0 : on === item.exactVal;
        }
        on = item.dir ? on : !on;
        item.el[on ? "show" : "hide"]();
      });
      view._j.switchClass && view._j.switchClass.forEach(function (item) {
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

    function makePropagationFunction({app, viewId, templateId, content, spec, viewOrTm}) {
      const fn = function (data, subscribe4updates, reverseBinding, mapping) {
        const propSettings = {subscribe4updates: subscribe4updates, reverseBinding: reverseBinding, mapping: mapping};
        subscribe4updates = (subscribe4updates === undefined) ? true : subscribe4updates;

        for (let [key, keySpec] of Object.entries(spec)) {
          const compKey = key;
          if (JType.is(keySpec)) {
            key = keySpec.field() || key;
          }
          let actualKey, val, elemType = getComponentType(keySpec);
          actualKey = (mapping && mapping[key]) ? mapping[key] : key;
          val = typeof actualKey === "function" ? actualKey.apply(data) : data[actualKey];
          if (content[key]?.renderer
            || Render.isOnRenderPresent({app, viewId, templateId, field: key})
            || (data && val !== undefined && val !== null && !isServiceName(key) && !(val instanceof $))) {
            const actualVal = typeof val === "function" ? val.apply(data) : val;

            const compElem = viewOrTm[compKey],
              compType = elemType,
              fnKey = "_j" + compKey;
            const args =
              {data: data, elem: compElem, val: actualVal, isUpdate: false, view: viewOrTm, settings: propSettings};
            // jiant.logError("R UI 119 " + viewId + "::" + compKey);
            content[compKey].renderer(args);
            if (elemType !== jiant.comp) {
              Render.callOnRender({app, viewId, templateId, field: compKey, args});
            }
            if (subscribe4updates && typeof data.on === "function" && (spec[compKey].renderer || typeof val === "function")) { // 3rd ?
              if (fn[fnKey]) {
                const oldData = fn[fnKey][0];
                oldData && oldData.off(fn[fnKey][1]);
                fn[fnKey][2] && compElem.off && compElem.off("change", fn[fnKey][2]);
              }
              if (typeof val !== "function") { // ?
                actualKey = null;
              }
              const handler = data.on(actualKey, function (obj, newVal) {
                if (arguments.length === 2 && newVal === "remove") {
                  return;
                }
                const args =
                  {data: data, elem: compElem, val: newVal, isUpdate: true, view: viewOrTm, settings: propSettings};
                // jiant.logError("R UI 139 " + viewId + "::" + compKey);
                content[compKey].renderer(args);
                if (getComponentType(compType) !== jiant.comp) {
                  Render.callOnRender({app, viewId, templateId, field: key, args});
                }
              });
              fn[fnKey] = [data, handler];
            }
            if (reverseBinding && compElem && compElem.change) {
              const backHandler = function (event) {
                const tagName = compElem[0].tagName.toLowerCase(),
                  tp = compElem.attr("type"),
                  etype = spec[compKey];

                function convert(val) {
                  return val === "undefined" ? undefined : val;
                }

                function elem2arr(elem) {
                  const arr = [];
                  $.each(elem, function (i, item) {
                    !!$(item).prop("checked") && arr.push(convert($(item).val()));
                  });
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
                    } else if (tagName in {"input": 1, "select": 1, "textarea": 1}) {
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
            fn[fnKey][2] && elem.off && elem.off("change", fn[fnKey][2]);
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

    return {
      makePropagationFunction,
      isServiceName,
      isOptional,
      scanForSpec,
      getComponentType,
    }

  });
