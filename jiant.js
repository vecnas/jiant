var jiant = jiant || (function($) {

  var PAGER_COUNT = 6,

      collection = {},
      container = {},
      ctl = {},
      form = {},
      fn = function(param) {},
      grid = {},
      image = {},
      input = {},
      inputInt = {},
      label = {},
      lookup = function(selector) {},
      pager = {},
      slider = {},
      stub = function() {
        var callerName = "not available";
        if (arguments && arguments.callee && arguments.callee.caller) {
          callerName = arguments.callee.caller.name;
        }
        alert("stub called from function: " + callerName);
      },
      tabs = {},

      bindingsResult = true,
      errString;

  function ensureExists(obj, idName, className) {
    if (!obj || !obj.length) {
      window.console && window.console.error
      && (className ? logError("non existing object referred by class under object id '" + idName
          + "', check stack trace for details, expected obj class: " + className) :
          logError("non existing object referred by id, check stack trace for details, expected obj id: " + idName));
      if (className) {
        errString += "   ,    #" + idName + " ." + className;
      } else {
        errString += ", #" + idName;
      }
      bindingsResult = false;
    }
  }

  function parseTemplate(that, data) {
    data = data || {};
    var str = (that).html().trim(),
        _tmplCache = {},
        err = "";
    try {
      var func = _tmplCache[str];
      if (!func) {
        var strFunc =
            "var p=[],print=function(){p.push.apply(p,arguments);};" +
                "with(obj){p.push('" +
                str.replace(/[\r\t\n]/g, " ")
                    .replace(/'(?=[^#]*#>)/g, "\t")
                    .split("'").join("\\'")
                    .split("\t").join("'")
                    .replace(/!!(.+?)!!/g, "',$1,'")
                    .split("!?").join("');")
                    .split("?!").join("p.push('")
                + "');}return p.join('');";

        //alert(strFunc);
        func = new Function("obj", strFunc);
        _tmplCache[str] = func;
      }
      return $.trim(func(data));
    } catch (e) {
      err = e.message;
    }
    return "!!! ERROR: " + err.toString() + " !!!";
  }

  function setupInputInt(input) {
    input.keydown(function(event) {
      if (event.keyCode == key.down && input.val() > 0) {
        input.val(input.val() - 1);
        return false;
      } else if (event.keyCode == key.up) {
        input.val(input.val() + 1);
        return false;
      } else if (event.keyCode == key.backspace || event.keyCode == key.del || event.keyCode == key.end
          || event.keyCode == key.home || event.keyCode == key.tab || event.keyCode == key.enter) {
      } else if (event.shiftKey || (event.keyCode < 48 || event.keyCode > 57) && (event.keyCode < 96 || event.keyCode > 105 )) {
        event.preventDefault();
        return false;
      }
      return true;
    });
  }

  function logError(error) {
    window.console && window.console.error && window.console.error(error);
  }

  function logInfo(s) {
    window.console && window.console.info && window.console.info(s);
  }

  function setupPager(uiElem) {
    var pagerBus = $({}),
        root = $("<ul></ul>");
    uiElem.addClass("pagination");
    uiElem.append(root);
    uiElem.onValueChange = function(callback) {
      pagerBus.on("ValueChange", callback);
    };
    uiElem.updatePager = function(page) {
      root.empty();
//      $.each(page, function(key, value) {
//        logInfo(key + " === " + value);
//      });
      var from = Math.max(0, page.number - PAGER_COUNT / 2),
          to = Math.min(page.number + PAGER_COUNT / 2, page.totalPages);
      for (var i = from; i < to; i++) {
        var cls = "";
        if (i == page.number) {
          cls += " active";
        }
        addPageCtl(i + 1, cls);
      }
    };
    function addPageCtl(value, ctlClass) {
      var ctl = $(parseTemplate($("<b><li class='!!ctlClass!!'><a>!!label!!</a></li></b>"), {label: value, ctlClass: ctlClass}));
      root.append(ctl);
      ctl.click(function() {
        pagerBus.trigger("ValueChange", value);
      });
    }
  }

  function _bindContent(subRoot, key, content, view, prefix) {
    $.each(content, function (elem, elemContent) {
      if (subRoot[elem] == lookup) {
        logInfo("    loookup element, no checks/bindings: " + elem);
        subRoot[elem] = function() {return $("." + prefix + elem);};
      } else {
        var uiElem = view.find("." + prefix + elem);
        ensureExists(uiElem, prefix + key, prefix + elem);
        if (elemContent == tabs) {
          uiElem.tabs();
        } else if (elemContent == inputInt) {
          setupInputInt(uiElem);
        } else if (elemContent == pager) {
          setupPager(uiElem);
        }
        subRoot[elem] = uiElem;
        logInfo("    bound UI for: " + elem);
      }
    });
  }

  function ensureSafeExtend(spec, jqObject) {
    $.each(spec, function(key, content) {
      if (jqObject[key]) {
        logError("unsafe extension: " + key + " already defined in base jQuery, shouldn't be used");
      }
    });
  }

  function _bindUi(prefix, root) {
    prefix = prefix || "";
    $.each(root, function (key, content) {
      logInfo("binding UI for view: " + key);
      var view = $("#" + prefix + key);
      ensureExists(view, prefix + key);
      _bindContent(root[key], key, content, view, prefix);
      ensureSafeExtend(root[key], view);
      $.extend(root[key], view);
    });
  }

  function _bindTemplates(prefix, root) {
    prefix = prefix || "";
    $.each(root, function(key, content) {
      logInfo("binding UI for template: " + key);
      var tm = $("#" + prefix + key);
      ensureExists(tm, prefix + key);
      $.each(content, function (elem, elemType) {
        root[key][elem] = tm.find("." + prefix + elem);
        ensureExists(root[key][elem], prefix + key, prefix + elem);
      });
      root[key].parseTemplate = function(data) {
        var retVal = $(parseTemplate(tm, data));
        $.each(content, function (elem, elemType) {
          retVal[elem] = retVal.find("." + prefix + elem);
        });
        return retVal;
      };
      root[key].parseTemplate2Text = function(data) {
        return parseTemplate(tm, data);
      };
    });
  }

  function getParamNames(func) {
    var funStr = func.toString();
    return funStr.slice(funStr.indexOf('(')+1, funStr.indexOf(')')).match(/([^\s,]+)/g);
  }

  function _bindAjax(root) {
    $.each(root, function(uri, funcSpec) {
      logInfo("binding ajax for function: " + uri);
      var params = getParamNames(funcSpec);
      params.splice(params.length - 1, 1);
      root[uri] = makeAjaxPerformer(uri, params);
    });
  }

  function makeAjaxPerformer(uri, params) {
    return function() {
      var callData = {},
          callback = arguments[arguments.length - 1],
          outerArgs = arguments;
      $.each(params, function(idx, param) {
        if (idx < outerArgs.length - 1) {
          var actual = outerArgs[idx];
          if ($.isArray(actual)) {
            callData[param] = actual;
          } else if ($.isPlainObject(actual)) {
            $.each(actual, function(key, value) {
              callData[param + "." + key] = value;
            });
          } else {
            callData[param] = actual;
          }
        }
      });
      if (! callData["antiCache3721"]) {
        callData["antiCache3721"] = new Date().getTime();
      }
      $.ajax(uri, {data: callData, traditional: true, success: function(data) {
        if (callback) {
          try{
            data = $.parseJSON(data);
          } catch (ex) {}
          callback(data);
        }
      }, error: function(jqXHR, textStatus, errorText) {
        jiant.handleErrorFn(jqXHR.responseText);
      }});
    };
  }

  function defaultAjaxErrorsHandle(errorDetails) {
    logError(errorDetails);
  }

  function bindUi(prefix, root) {
    errString = "";
    bindingsResult = true;
    if (root.views) {
      _bindUi(prefix, root.views);
    }
    if (root.templates) {
      _bindTemplates(prefix, root.templates);
    }
    if (root.ajax) {
      _bindAjax(root.ajax);
    }
    if (!bindingsResult) {
      alert("Some elements not bound to HTML properly, check console" + errString);
    }
  }

  return {
    bindUi: bindUi,
    handleErrorFn: defaultAjaxErrorsHandle,
    logInfo: logInfo,
    logError: logError,

    collection: collection,
    container: container,
    ctl : ctl,
    fn: fn,
    form: form,
    grid: grid,
    image: image,
    input: input,
    inputInt: inputInt,
    label: label,
    lookup: lookup,
    pager: pager,
    slider: slider,
    stub: stub,
    tabs: tabs
  };

})(jQuery);
