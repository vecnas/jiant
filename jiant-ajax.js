jiant.module("jiant-ajax", function() {

  this.singleton();

  const restRegexp = /:([^\/]+)(\/|$)/g;

  function getDeclaredName(obj) {
    return !!obj ? obj._jiantSpecName : undefined;
  }

  function bindAjax(name, funcSpec, appRoot) {
    let params = jiant.getParamNames(funcSpec);
    params && params.length > 0 ? params.splice(params.length - 1, 1) : params = [];
    const impl = makeAjaxPerformer(appRoot, appRoot.ajaxPrefix, appRoot.ajaxSuffix, name, params,
        typeof funcSpec === "function" ? funcSpec() : undefined, appRoot.crossDomain);
    impl._jiantSpec = funcSpec;
    impl._jiantSpecName = name;
    return impl;
  }

  function _bindAjax(appRoot, ajaxRoot) {
    $.each(ajaxRoot, function(name, funcSpec) {
      ajaxRoot[name] = bindAjax(name, funcSpec, appRoot);
    });
  }

  function parseForAjaxCall(root, path, actual, traverse) {
    if (path === null) {
      return;
    }
    if ($.isArray(actual) || (actual && actual.jCollection)) {
      let compound = false;
      actual.forEach(function(obj) {
        compound = compound || $.isPlainObject(obj) || (obj && obj.jModelName);
        return compound;
      });
      actual.forEach(function(obj, i) {
        parseForAjaxCall(root, path + (compound ? ("[" + i + "]") : ""), obj, true);
      });
    } else if ($.isPlainObject(actual) || (actual && actual.jModelName)) {
      $.each(actual, function(key, value) {
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
        data: callData, traditional: true, method: callSpec.method, headers: headers, success: function (data) {
          // each(listeners, function(i, l) {l.ajaxCallCompleted && l.ajaxCallCompleted(appRoot, uri, url, callData, new Date().getTime() - time)});
          if (callback) {
            try {
              data = $.parseJSON(data);
            } catch (ex) {
            }
            // each(listeners, function(i, l) {l.ajaxCallResults && l.ajaxCallResults(appRoot, uri, url, callData, data)});
            callback(data);
          }
        }, error: function (jqXHR, textStatus, errorText) {
          if (0 === jqXHR.status && ('abort' === jqXHR.statusText || 'error' === jqXHR.statusText)) {
            return;
          }
          if (errHandler) {
            errHandler(jqXHR.responseText);
          } else if (appRoot.handleErrorFn) {
            appRoot.handleErrorFn(jqXHR.responseText);
          } else {
            jiant.handleErrorFn(jqXHR.responseText);
          }
          // each(listeners, function(i, l) {l.ajaxCallError && l.ajaxCallError(appRoot, uri, url, callData, new Date().getTime() - time, jqXHR.responseText, jqXHR)});
        }
      };
      if (crossDomain) {
        settings.contentType = "application/json";
        settings.dataType = 'jsonp';
        settings.xhrFields = {withCredentials: true};
        settings.crossDomain = true;
      }
      return $.ajax(url, settings);
    };
  }

  function defaultAjaxErrorsHandle(errorDetails) {
    jiant.logError(errorDetails);
  }

  jiant.bindAjax = bindAjax;

  jiant.handleErrorFn = defaultAjaxErrorsHandle;
  jiant.getDeclaredName = getDeclaredName;
  jiant.flags.ajaxSubmitAsMap = "_jiantFlagSubmitAsMap";

  return {
    apply: function(appRoot, tree) {
      _bindAjax(appRoot, tree.ajax);
    }
  };
});