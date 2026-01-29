jiant.module("jiant-ajax", function({}) {

  this.singleton();

  const restRegexp = /:([^\/]+)(\/|$)/g;

  function bindAjax(name, funcSpec, appRoot) {
    let params = jiant.getParamNames(funcSpec);
    params && params.length > 0 ? params.splice(params.length - 1, 1) : params = [];
    const impl = makeAjaxPerformer(appRoot, appRoot.ajaxPrefix, appRoot.ajaxSuffix, name, params,
        typeof funcSpec === "function" ? funcSpec() : undefined, appRoot.crossDomain);
    return impl;
  }

  function _bindAjax(appRoot, ajaxRoot) {
    jiant.each(ajaxRoot, function(name, funcSpec) {
      ajaxRoot[name] = bindAjax(name, funcSpec, appRoot);
    });
  }

  function isPlainObject(obj) {
    if (!obj || Object.prototype.toString.call(obj) !== "[object Object]") {
      return false;
    }
    const proto = Object.getPrototypeOf(obj);
    return proto === Object.prototype || proto === null;
  }

  function parseForAjaxCall(root, path, actual, traverse) {
    if (path === null) {
      return;
    }
    if (Array.isArray(actual) || (actual && actual.jCollection)) {
      let compound = false;
      actual.forEach(function(obj) {
        compound = compound || isPlainObject(obj) || (obj && obj.jModelName);
        return compound;
      });
      actual.forEach(function(obj, i) {
        parseForAjaxCall(root, path + (compound ? ("[" + i + "]") : ""), obj, true);
      });
    } else if (isPlainObject(actual) || (actual && actual.jModelName)) {
      jiant.each(actual, function(key, value) {
        if (key === jiant.flags.ajaxSubmitAsMap) {
          return;
        }
        const subpath = actual[jiant.flags.ajaxSubmitAsMap]
            ? (traverse ? (path + "[") : "") + key + (traverse ? "]" : "")
            : (traverse ? (path + ".") : "") + key;
        if (("isModel" in jiant) && jiant.isModel(actual)) { // model
          (jiant.isModelAccessor(value) || jiant.isModelSupplier(value)) && !jiant.isTransient(value) && parseForAjaxCall(root, subpath, value.apply(actual), true);
        } else {
          parseForAjaxCall(root, subpath, value, true);
        }
      });
    } else {
      if (path in root) {
        if (root[path] && root[path].jParsed) {
          root[path].push(actual);
        } else {
          root[path] = [root[path], actual];
          root[path].jParsed = 1;
        }
      } else {
        root[path] = actual;
      }
    }
  }

  function subslash(s) {
    s = s.substring(1);
    return s.endsWith("/") ? s.substring(0, s.length - 1) : s;
  }

  function replaceSubsInUrl(url, subs) {
    return url.replace(restRegexp, function(key) {
      const lenBefore = key.length;
      key = subslash(key);
      return (key in subs ? subs[key] : (":" + key)) + ((lenBefore - key.length >= 2) ? "/" : "");
    });
  }

  function extractSubsInUrl(url) {
    let arr = url.match(restRegexp) || [];
    arr.forEach(function(obj, i) {
      arr[i] = subslash(obj);
    });
    if (jiant.isNumberString(arr[0])) {
      arr = arr.slice(1, arr.length);
    }
    return arr;
  }

  function makeAjaxPerformer(appRoot, ajaxPrefix, ajaxSuffix, uri, params, specRetVal, crossDomain) {
    let pfx = (ajaxPrefix || ajaxPrefix === "") ? ajaxPrefix : jiant.AJAX_PREFIX,
        sfx = (ajaxSuffix || ajaxSuffix === "") ? ajaxSuffix : jiant.AJAX_SUFFIX,
        callSpec = (specRetVal && (typeof specRetVal !== "string")) ? specRetVal : {},
        subsInUrl,
        headers = {};
    callSpec.url = callSpec.url || (typeof specRetVal === "string" ? specRetVal : (uri + sfx));
    if (pfx.endsWith("/") && callSpec.url.startsWith("/")) {
      callSpec.url = callSpec.url.substring(1);
    }
    if (!callSpec.url.startsWith("http://") && !callSpec.url.startsWith("https://")) {
      callSpec.url = pfx + ((callSpec.url.startsWith("/") || pfx.endsWith("/") || pfx.length === 0
          || (!callSpec.url.startsWith("/") && !pfx.endsWith("/"))) ? "" : "/") + callSpec.url;
    }
    subsInUrl = extractSubsInUrl(callSpec.url);
    if (! ("paramMapping" in callSpec)) {
      callSpec.paramMapping = {};
    }
    if (! ("headers" in callSpec)) {
      callSpec.headers = {};
    }
    return function() {
      let callData = {},
          callback,
          errHandler,
          outerArgs = arguments,
          url = callSpec.url,
          time = new Date().getTime();
      if (typeof outerArgs[outerArgs.length - 2] === "function") {
        callback = outerArgs[outerArgs.length - 2];
        errHandler = outerArgs[outerArgs.length - 1];
      } else if (typeof outerArgs[outerArgs.length - 1] === "function") {
        callback = outerArgs[outerArgs.length - 1];
      }
      params.forEach(function(param, idx) {
        if (idx < outerArgs.length && typeof outerArgs[idx] !== "function" && outerArgs[idx] !== undefined && outerArgs[idx] !== null) {
          const actual = outerArgs[idx],
              paramName = callSpec.paramMapping[param] || param;
          if (!(param in callSpec.headers)) {
            parseForAjaxCall(callData, paramName, actual);
          } else {
            headers[callSpec.headers[param]] = actual;
          }
        }
      });
      if ((!callSpec.method || callSpec.method.toLowerCase() === "get") && !callData["antiCache3721"]) {
        callData["antiCache3721"] = new Date().getTime();
      }
      // each(listeners, function(i, l) {l.ajaxCallStarted && l.ajaxCallStarted(appRoot, uri, url, callData)});
      const subs = {};
      subsInUrl.forEach(function(sub) {
        const subMapped = callSpec.paramMapping[sub] || sub;
        if (subMapped in callData) {
          subs[subMapped] = callData[subMapped];
          delete callData[subMapped];
        }
      });
      url = replaceSubsInUrl(url, subs);
      const settings = {
        data: callData,
        method: callSpec.method || "GET",
        headers: headers
      };
      if (crossDomain) {
        settings.crossDomain = true;
        if (appRoot && appRoot.withCredentials) {
          settings.xhrFields = {withCredentials: true};
        }
      }
      return ajaxFetch(url, settings).then(function(text) {
        // each(listeners, function(i, l) {l.ajaxCallCompleted && l.ajaxCallCompleted(appRoot, uri, url, callData, new Date().getTime() - time)});
        if (callback) {
          let data = text;
          try {
            data = JSON.parse(text);
          } catch (ex) {
          }
          // each(listeners, function(i, l) {l.ajaxCallResults && l.ajaxCallResults(appRoot, uri, url, callData, data)});
          callback(data);
        }
        return text;
      }).catch(function(err) {
        if (err && err.status === 0 && (err.statusText === "abort" || err.statusText === "error")) {
          return;
        }
        const responseText = err && typeof err.responseText === "string" ? err.responseText : "";
        if (errHandler) {
          errHandler(responseText);
        } else if (appRoot.handleErrorFn) {
          appRoot.handleErrorFn(responseText);
        } else {
          jiant.handleErrorFn(responseText);
        }
        // each(listeners, function(i, l) {l.ajaxCallError && l.ajaxCallError(appRoot, uri, url, callData, new Date().getTime() - time, responseText, err)});
        return;
      });
    };
  }

  function buildQuery(data) {
    const parts = [];
    jiant.each(data, function(key, val) {
      if (val === undefined) {
        return;
      }
      if (Array.isArray(val)) {
        val.forEach(function(v) {
          parts.push(encodeURIComponent(key) + "=" + encodeURIComponent(v == null ? "" : v));
        });
      } else {
        parts.push(encodeURIComponent(key) + "=" + encodeURIComponent(val == null ? "" : val));
      }
    });
    return parts.join("&");
  }

  function ajaxFetch(url, settings) {
    const method = (settings.method || "GET").toUpperCase();
    const headers = settings.headers || {};
    const params = buildQuery(settings.data || {});
    let finalUrl = url;
    let body;
    if ((method === "GET" || method === "HEAD") && params) {
      finalUrl += (finalUrl.indexOf("?") >= 0 ? "&" : "?") + params;
    } else if (params) {
      body = params;
      if (!("Content-Type" in headers) && !("content-type" in headers)) {
        headers["Content-Type"] = "application/x-www-form-urlencoded; charset=UTF-8";
      }
    }
    const fetchOpts = {
      method: method,
      headers: headers,
      mode: settings.crossDomain ? "cors" : "same-origin",
      credentials: settings.crossDomain ? (settings.xhrFields && settings.xhrFields.withCredentials ? "include" : "omit") : "same-origin"
    };
    if (body !== undefined && method !== "GET" && method !== "HEAD") {
      fetchOpts.body = body;
    }
    return fetch(finalUrl, fetchOpts).then(function(res) {
      return res.text().then(function(text) {
        if (res.ok) {
          return text;
        }
        const err = {
          status: res.status,
          statusText: res.statusText || "",
          responseText: text
        };
        throw err;
      });
    }).catch(function(err) {
      if (err && err.status !== undefined) {
        throw err;
      }
      throw {
        status: 0,
        statusText: err && err.name ? err.name : "error",
        responseText: ""
      };
    });
  }

  function defaultAjaxErrorsHandle(errorDetails) {
    jiant.logError(errorDetails);
  }

  jiant.bindAjax = bindAjax;

  jiant.handleErrorFn = defaultAjaxErrorsHandle;
  jiant.flags.ajaxSubmitAsMap = "_jiantFlagSubmitAsMap";

  return {
    apply: function(appRoot, tree) {
      _bindAjax(appRoot, tree.ajax);
    }
  };
});
