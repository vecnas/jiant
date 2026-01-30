jiant.module("jiant-util", ["jiant-log"], function({jiant}) {

  this.singleton();

  const _tmplCache = {};
  let pickTime;

  function isEmptyFunction(funcSpec) {
    const s = ("" + funcSpec).replace(/\s/g, '');
    return s.indexOf("{}") === s.length - 2;
  }

  function isWebComponentName(name) {
    return name.includes("-");
  }

  function toWebComponentName(name, suffix) {
    if (isWebComponentName(name)) {
      return name;
    }
    const kebabName = toKebabCase(name);
    return kebabName !== name ? kebabName : (kebabName + "-" + suffix);
  }

  function createEventBus() {
    const listeners = {};
    return {
      on: function(eventName, handler) {
        listeners[eventName] = listeners[eventName] || [];
        listeners[eventName].push(handler);
        return handler;
      },
      off: function(eventName, handler) {
        const list = listeners[eventName];
        if (!list) {
          return;
        }
        if (!handler) {
          listeners[eventName] = [];
          return;
        }
        const idx = list.indexOf(handler);
        if (idx >= 0) {
          list.splice(idx, 1);
        }
      },
      one: function(eventName, handler) {
        const onceHandler = function(evt) {
          this.off(eventName, onceHandler);
          handler.apply(null, arguments);
        }.bind(this);
        this.on(eventName, onceHandler);
        return onceHandler;
      },
      trigger: function(eventName) {
        const list = listeners[eventName];
        if (!list || list.length === 0) {
          return;
        }
        const extraArgs = [];
        for (let i = 1; i < arguments.length; i++) {
          extraArgs.push(arguments[i]);
        }
        const spreadArgs = (extraArgs.length === 1 && Array.isArray(extraArgs[0])) ? extraArgs[0] : extraArgs;
        const evt = {
          _stopped: false,
          stopImmediatePropagation: function() { this._stopped = true; }
        };
        const callArgs = [evt].concat(spreadArgs);
        const callList = list.slice();
        for (let i = 0; i < callList.length; i++) {
          callList[i].apply(this, callArgs);
          if (evt._stopped) {
            break;
          }
        }
      }
    };
  }

  function copy2cb(txt) {
    if (document.execCommand) {
      const input = document.createElement("input");
      input.type = "text";
      input.style.opacity = "0";
      input.style.position = "absolute";
      input.style.zIndex = "-1";
      input.value = txt;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
    }
  }

  function randomIntBetween(from, to) {
    return Math.floor((Math.random()*(to - from + 1)) + from);
  }

  function toDate(val) {
    const num = Number(val);
    return ((num === 0 && val !== 0 && val !== "0") || isNaN(num)) ? null : new Date(num);
  }

  function formatMoney(amount, grpDelim, decDelim, decimals) {
    let total, num, ret;
    grpDelim = grpDelim !== undefined ? grpDelim : ",";
    decDelim = decDelim !== undefined ? decDelim : '.';
    amount = amount.toString().replace(/\s+/g, '');
    num = (typeof decimals === 'undefined' || decimals === 0) ? Math.round(parseFloat(amount)) : num = amount.split('.');
    if (isNaN(num) && !num[0]) {
      return "";
    }
    if (num[1]) {
      num[1] = Math.round((num[1])).toString().substring(0, decimals);
      ret = "" + num[0];
    } else {
      ret = "" + num;
    }
    for (let idx = ret.length; idx > 0; idx -= 3) {
      ret = ret.substring(0, idx) + (idx < ret.length ? "." : "") + ret.substring(idx);
    }
    ret = ret.split('.');
    total = ret.join(grpDelim);
    if (!isNaN(num[1])) {
      total += (decDelim + num[1]);
    }
    return total;
  }

  function formatDate(millis) {
    const dt = toDate(millis);
    return dt == null ? "" : lfill(dt.getFullYear()) + "-" + lfill(dt.getMonth() + 1) + "-" + lfill(dt.getDate());
  }

  function formatDateUsa(millis) {
    const dt = toDate(millis);
    return dt == null ? "" : lfill(dt.getMonth() + 1) + "/" + lfill(dt.getDate()) + "/" + lfill(dt.getFullYear());
  }

  function formatTime(millis) {
    const dt = toDate(millis);
    return dt == null ? "" : lfill(dt.getHours()) + ":" + lfill(dt.getMinutes());
  }

  function formatTimeSeconds(millis) {
    const dt = toDate(millis);
    return dt == null ? "" : lfill(dt.getHours()) + ":" + lfill(dt.getMinutes()) + ":" + lfill(dt.getSeconds());
  }

  function lfill(val) {
    val = "" + val;
    return val.length === 0 ? "00" : val.length === 1 ? "0" + val : val;
  }

  function getURLParameter(name) {
    const results = new RegExp('[\\?&]' + name + '=([^&#]*)').exec(window.location.href);
    return (results !== null) ? decodeURIComponent(results[1]) : null;
  }

  function pick(marker, threshold) {
    const now = new Date().getTime(),
        ms = now - pickTime;
    threshold = threshold || -1;
    if (pickTime && ms >= threshold) {
      jiant.info((marker ? marker : "jiant.pick:") + " " + ms + "ms");
    }
    pickTime = now;
    return ms >= threshold ? ms : 0;
  }

  function msieDom2Html(elem) {
    jiant.each(elem.find("*"), function(idx, child) {
      jiant.each(child.attributes, function(i, attr) {
        if (attr.value.indexOf(" ") < 0 && attr.value.indexOf("!!") >= 0) {
          $(child).attr(attr.name, attr.value.replace(/!!/g, "e2013e03e11eee "));
        }
      });
    });
    return jiant.html($(elem)).trim().replace(/!!/g, "!! ").replace(/e2013e03e11eee /g, "!! ");
  }

  function parseTemplate(that, data, tmId, mapping) {
    data = data || {};
    if (mapping) {
      data = jiant.extend({}, data);
      jiant.each(mapping, function(key, val) {
        data[key] = data[val];
      });
    }
    let err = "";
    try {
      let func = tmId ? _tmplCache[tmId] : null;
      if (!func) {
        const tmp = $("<i></i>");
        typeof that === "string" && jiant.html(tmp, that);
        let str = jiant.html(typeof that === "string" ? tmp : $(that)).trim();
        if (!jiant.isMSIE) {
          str = str.replace(/!!/g, "!! ");
        } else {
          str = msieDom2Html($(that));
        }
        const strFunc =
            "var p=[],print=function(){p.push.apply(p,arguments);};" +
            "with(obj){p.push('" +
            str.replace(/[\r\t\n]/g, " ")
                .replace(/'(?=[^#]*#>)/g, "\t")
                .split("'").join("\\'")
                .split("\t").join("'")
                .replace(/!! (.+?)!! /g, "', typeof $1 === 'undefined' ? '' : typeof $1 === 'function' ? $1() : $1,'")
                .split("!?").join("');")
                .split("?!").join("p.push('")
            + "');}return p.join('');";
        func = new Function("obj", strFunc);
        _tmplCache[tmId] = func;
      }
      return func(data).trim();
    } catch (e) {
      err = e.message;
      jiant.logError("Error parse template: " + tmId, mapping, e);
    }
    return "!!! ERROR: " + err.toString() + " !!!";
  }

  function parseTemplate2Text(tm, data, cacheKey) {
    return parseTemplate(tm, data, cacheKey);
  }

  function getParamNames(func) {
    let funcStr = func.toString();
    funcStr = funcStr.slice(funcStr.indexOf('(') + 1, funcStr.indexOf(')')).match(/([^\s,]+)/g);
    return funcStr ? funcStr : [];
  }

  function isNumberString(s) {
    return (parseInt(s) + "") === s;
  }

  function asObjArray(arr, name, idxName) {
    const ret = [];
    arr.forEach(function(val, i) {
      const obj = {};
      obj[name] = val;
      idxName && (obj[idxName] = i);
      ret.push(obj);
    });
    return ret;
  }

  function check(bool, err) {
    if (! bool) {
      const args = [...arguments];
      args.splice(0, 1);
      jiant.logError(args);
      jiant.DEV_MODE && alert(err);
    }
  }

  function toArray(arr) {
    return Array.isArray(arr) ? arr : [arr];
  }

  function fluent(name) {
    return function(val) {
      arguments.length !== 0 && (this.data[name] = val);
      return arguments.length !== 0 ?  this : this.data[name]
    }
  }

  const toKebabCase = s => s
      .replace(/([a-z])([A-Z])/g, "$1-$2")
      .replace(/[\s_]+/g, '-')
      .toLowerCase();

  const exp = {
    parseTemplate: function(text, data) {return $(parseTemplate(text, data));},
    parseTemplate2Text: parseTemplate2Text,
    _parseTemplate: parseTemplate,
    getFunctionParamNames : getParamNames,
    isNumberString: isNumberString,
    getParamNames: getParamNames,
    getURLParameter: getURLParameter,
    pick: pick,
    formatDate: formatDate,
    formatDateUsa: formatDateUsa,
    formatMoney: formatMoney,
    formatTime: formatTime,
    formatTimeSeconds: formatTimeSeconds,
    randomIntBetween: randomIntBetween,
    copy2clipboard: copy2cb,
    asObjArray: asObjArray,
    check: check,
    lfill: lfill,
    fluent: fluent,
    isEmptyFunction: isEmptyFunction,
    toArray: toArray,
    isWebComponentName: isWebComponentName,
    toWebComponentName: toWebComponentName,
    toKebabCase: toKebabCase,
    createEventBus: createEventBus,
    dom: {
      isJq: function(val) { return !!val && val.jquery; },
      first: function(elem) { return elem && elem.jquery ? elem[0] : elem; },
      forEach: function(elem, cb) {
        if (!elem) { return; }
        if (elem.jquery) {
          for (let i = 0; i < elem.length; i++) { cb(elem[i]); }
        } else { cb(elem); }
      },
      on: function(elem, eventName, handler) {
        exp.dom.forEach(elem, function(el) {
          el.addEventListener(eventName, function(evt) { handler(evt, evt.detail); });
        });
      },
      trigger: function(elem, eventName, detail) {
        exp.dom.forEach(elem, function(el) {
          let evt;
          if (typeof CustomEvent === "function") {
            evt = new CustomEvent(eventName, {detail: detail});
          } else {
            evt = document.createEvent("CustomEvent");
            evt.initCustomEvent(eventName, false, false, detail);
          }
          el.dispatchEvent(evt);
        });
      },
      addClass: function(elem, cls) {
        exp.dom.forEach(elem, function(el) { el.classList && el.classList.add(cls); });
      },
      removeClass: function(elem, cls) {
        exp.dom.forEach(elem, function(el) { el.classList && el.classList.remove(cls); });
      },
      toggleClass: function(elem, cls) {
        exp.dom.forEach(elem, function(el) { el.classList && el.classList.toggle(cls); });
      },
      setChecked: function(elem, val) {
        exp.dom.forEach(elem, function(el) { el.checked = !!val; });
      },
      getChecked: function(elem) {
        const el = exp.dom.first(elem);
        return el ? !!el.checked : false;
      },
      getData: function(elem, key) {
        const el = exp.dom.first(elem);
        if (!el) { return undefined; }
        if (el.dataset && key in el.dataset) { return el.dataset[key]; }
        return el.getAttribute ? el.getAttribute("data-" + key) : undefined;
      },
      setDisabled: function(elem, disabled) {
        exp.dom.forEach(elem, function(el) { el.disabled = !!disabled; });
      },
      append: function(parent, child) {
        const p = exp.dom.first(parent);
        if (!p || !child) { return; }
        if (child.jquery) {
          for (let i = 0; i < child.length; i++) { p.appendChild(child[i]); }
        } else if (child.nodeType) {
          p.appendChild(child);
        }
      },
      insertBefore: function(elem, ref) {
        const node = exp.dom.first(elem);
        const refNode = exp.dom.first(ref);
        if (!node || !refNode || !refNode.parentNode) { return; }
        refNode.parentNode.insertBefore(node, refNode);
      },
      remove: function(elem) {
        exp.dom.forEach(elem, function(el) {
          if (el.remove) { el.remove(); }
          else if (el.parentNode) { el.parentNode.removeChild(el); }
        });
      },
      html: function(elem, html) {
        exp.dom.forEach(elem, function(el) { el.innerHTML = html; });
      },
      hide: function(elem) {
        exp.dom.forEach(elem, function(el) { el.style.display = "none"; });
      },
      show: function(elem) {
        exp.dom.forEach(elem, function(el) { el.style.display = ""; });
      },
      getVal: function(elem) {
        if (!elem) { return undefined; }
        if (elem.jquery) { return elem.val(); }
        return "value" in elem ? elem.value : undefined;
      }
    }
  };

  for (let key in exp) {
    jiant[key] = exp[key];
  }

  return exp

});
