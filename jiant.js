// 0.01 : ajax alpha, views, templates
// 0.02 : event bus
// 0.03 : ajax with callback and errHandler per call
// 0.04 : bind plugin
// 0.05 : states
// 0.06 : onUiBound event for anonymous plugins, empty hash state
// 0.07 : crossdomain views load, setupForm check for form, pager update
// 0.08 : broken for some ie cases, templates IE attribute quotes workaround from http://weblogs.asp.net/alexeigorkov/archive/2010/03/16/lazy-html-attributes-wrapping-in-internet-explorer.aspx
// 0.09 : broken for some ie cases, templates IE redone, to avoid bug with "a=!!val!!" situation, isMSIE flag added
// 0.10 : templates IE one more redone, attributes DOM manipulation, for templates parse, parse template starting with plain text by adding comment, template controls binding
// 0.11: ajax url override for ajax calls via returning value from specification function
// 0.12: return from submitForm, template parse results binding changed to merge of filter and find to support no-root templates, added propagate(data) function to views
// 0.13: comment node removed from template parse results
// 0.14: events[name].listenersCount++;
// 0.15: parseInt for inputInt value arrow up
// 0.16: state parameters - undefined replacement by current value properly, inputDate added, works when datepicker available, formatDate, formatTime added
// 0.17: propagate "0" and "" passed as valid values
// 0.18: default state "end" not triggered - fixed
// 0.19: DEBUG_MODE added, state start vs trigger check in debug mode, event usage check in debug mode
// 0.20: appId introduced
// 0.21: root state not packed, go back not packed - fixed, propagate added to parseTemplate results
// 0.22: onUiBound accepts both app and app.id as first param
// 0.23: model initial auto-implementation added for method names "add", "remove", "setXXX", "getXXX", "findByXXX"; .xl added
// 0.24: model modified, "set"/"get" replaced by single method xxx(optional_param), in jquery style, added global "on" event for any model change. incompatible with 0.23
// 0.25: radio button handled properly in propagate function
// 0.26: jiant.STATE_EXTERNAL_BASE added for navigation to another page in frames of state change, fixed multiple apps on a page mixing
// 0.27: predefined model functions not created automatically more

var jiant = jiant || (function($) {

  var collection = {},
      container = {},
      containerPaged = {},
      ctl = {},
      form = {},
      fn = function(param) {},
      grid = {},
      image = {},
      input = {},
      inputInt = {},
      inputDate = {},
      label = {},
      lookup = function(selector) {},
      on = function(cb) {},
      goState = function(params, preserveOmitted) {},
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

      lastState = undefined,
      eventBus = $({}),
      bindingsResult = true,
      uiBoundRoot = {},
      errString,
      statesUsed = {},
      eventsUsed = {};

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

  function maybeAddDevHook(uiElem, key, elem) {
    if (jiant.DEV_MODE) {
      uiElem.click(function(event) {
        if (event.shiftKey && event.altKey) {
          var message = key + (elem ? ("." + elem) : "");
          if (event.ctrlKey) {
            message += "\r\n------------\r\n";
            message += pseudoserializeJSON(jQuery._data(uiElem[0], "events"));
          }
          logInfo(message);
          alert(message);
          event.preventDefault();
          event.stopImmediatePropagation();
        }
      });
    }
  }

  // not serialization actually, for example when text contains " - generates invalid output. just for dev purposes
  function pseudoserializeJSON(obj) {
    var t = typeof(obj);
    if (t != "object" || obj === null) {
      // simple data type
      if (t == "string") {
        obj = '"' + obj + '"';
      }
      return String(obj);
    } else {
      // array or object
      var json = [],
          arr = (obj && obj.constructor == Array);

      $.each(obj, function (k, v) {
        t = typeof(v);
        if (t == "string") {
          v = '"' + v + '"';
        }
        else if (t == "object" && v !== null) {
          v = pseudoserializeJSON(v);
        }
        json.push((arr ? "" : '"' + k + '":') + (v ? v : "\"\""));
      });

      return (arr ? "[" : "{") + String(json) + (arr ? "]" : "}");
    }
  }

  function formatDate(millis) {
    var dt = new Date(millis);
    return $.datepicker.formatDate("yy-mm-dd", dt);
  }

  function formatTime(millis) {
    var dt = new Date(millis);
    return lfill(dt.getHours()) + ":" + lfill(dt.getMinutes());
  }

  function formatTimeSeconds(millis) {
    var dt = new Date(millis);
    return lfill(dt.getHours()) + ":" + lfill(dt.getMinutes()) + ":" + lfill(dt.getSeconds());
  }

  function lfill(val) {
    return val < 10 ? "0" + val : val;
  }

  function msieDom2Html(elem) {
    $.each(elem.find("*"), function(idx, child) {
      $.each(child.attributes, function(i, attr) {
        if (attr.value.indexOf(" ") < 0 && attr.value.indexOf("!!") >= 0) {
          $(child).attr(attr.name, attr.value.replace(/!!/g, "e2013e03e11eee "));
        }
      });
    });
    return $.trim($(elem).html()).replace(/!!/g, "!! ").replace(/e2013e03e11eee /g, "!! ");
  }

  function parseTemplate(that, data) {
    data = data || {};
//    if (! that.html) {
//      that = $(that);
//    }
    var str = $.trim($(that).html()),
        _tmplCache = {},
        err = "";
    if (!jiant.isMSIE) {
      str = str.replace(/!!/g, "!! ");
    } else {
      str = msieDom2Html($(that));
    }
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
                    .replace(/!! (.+?)!! /g, "',$1,'")
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
      if (event.keyCode == jiant.key.down && input.val() > 0) {
        input.val(input.val() - 1);
        return false;
      } else if (event.keyCode == jiant.key.up) {
        input.val(parseInt(input.val()) + 1);
        return false;
      } else if (event.keyCode == jiant.key.backspace || event.keyCode == jiant.key.del || event.keyCode == jiant.key.end
          || event.keyCode == jiant.key.home || event.keyCode == jiant.key.tab || event.keyCode == jiant.key.enter) {
      } else if (event.shiftKey || (event.keyCode < 48 || event.keyCode > 57) && (event.keyCode < 96 || event.keyCode > 105 )) {
        event.preventDefault();
        return false;
      }
      return true;
    });
  }

  function setupForm(elem, key, name) {
    if (! elem[0]) {
      return;
    }
    var tagName = elem[0].tagName.toLowerCase();
    if (tagName != "form") {
      jiant.logError(key + "." + name + " form element assigned to non-form: " + tagName);
      if (jiant.DEV_MODE) {
        alert(key + "." + name + " form element assigned to non-form: " + tagName);
      }
    }
    elem.submitForm = function(url, cb) {
      url = url || elem.attr("action");
      return $.post(url, elem.serialize(), cb);
    };
  }

  function logError(error) {
    window.console && window.console.error && window.console.error(error);
  }

  function logInfo(s) {
    jiant.DEV_MODE && window.console && window.console.info && window.console.info(s);
  }


  function debug(s) {
    if (window.console && window.console.error) {
      window.console.error(s);
//      var callerName = "not available";
//      if (arguments && arguments.callee && arguments.callee.caller) {
//        callerName = arguments.callee.caller.name;
//        callerName && window.console.debug(callerName);
//        arguments.callee.caller.caller && arguments.callee.caller.caller.name && window.console.debug(arguments.callee.caller.caller.name);
//      }
      return true;
    } else {
      return false;
    }
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
      var from = Math.max(0, page.number - jiant.PAGER_RADIUS / 2),
          to = Math.min(page.number + jiant.PAGER_RADIUS / 2, page.totalPages);
      if (from > 0) {
        addPageCtl(1, "").find("a").css("margin-right", "20px");
      }
      for (var i = from; i < to; i++) {
        var cls = "";
        if (i == page.number) {
          cls += " active";
        }
        addPageCtl(i + 1, cls);
      }
      if (to < page.totalPages - 1) {
        addPageCtl(page.totalPages, "").find("a").css("margin-left", "20px");
      }
    };
    function addPageCtl(value, ctlClass) {
      var ctl = $(parseTemplate($("<b><li class='!!ctlClass!!' style='cursor: pointer;'><a>!!label!!</a></li></b>"), {label: value, ctlClass: ctlClass}));
      root.append(ctl);
      ctl.click(function() {
        pagerBus.trigger("ValueChange", value);
      });
      return ctl;
    }
  }

  function setupContainerPaged(uiElem) {
    var prev = $("<div>&lt;&lt;</div>"),
        next = $("<div>&gt;&gt;</div>"),
        container = $("<div></div>"),
        pageSize = 8,
        offset = 0;
    prev.addClass("paged-prev");
    next.addClass("paged-next");
    container.addClass("paged-container");
    uiElem.empty();
    uiElem.append(prev);
    uiElem.append(container);
    uiElem.append(next);
    prev.click(function() {
      offset -= pageSize;
      sync();
    });
    next.click(function() {
      offset += pageSize;
      sync();
    });
    uiElem.append = function(elem) {
      container.append(elem);
      sync();
    };
    uiElem.empty = function() {
      container.empty();
      sync();
    };
    uiElem.setHorizontal = function(bool) {
      var display = bool ? "inline-block" : "block";
      prev.css("display", display);
      next.css("display", display);
      container.css("display", display);
    };
    uiElem.setPageSize = function(val) {
      pageSize = val;
      sync();
    };
    uiElem.setHorizontal(true);

    function sync() {
      offset = Math.max(offset, 0);
      offset = Math.min(offset, container.children().length - 1);
      prev.css("visibility", offset > 0 ? "visible" : "hidden");
      next.css("visibility", offset < container.children().length - pageSize ? "visible" : "hidden");
      $.each(container.children(), function(idx, domElem) {
        var elem = $(domElem);
//        logInfo("comparing " + idx + " vs " + offset + " - " + (offset+pageSize));
        if (idx >= offset && idx < offset + pageSize) {
//          logInfo("showing");
          elem.show();
        } else {
          elem.hide();
        }
      });
    }
  }

  function setupExtras(uiElem, elemContent, key, elem) {
    if (elemContent == tabs && uiElem.tabs) {
      uiElem.tabs();
    } else if (elemContent == inputInt) {
      setupInputInt(uiElem);
    } else if (elemContent == inputDate && uiElem.datepicker) {
      uiElem.datepicker();
    } else if (elemContent == pager) {
      setupPager(uiElem);
    } else if (elemContent == form) {
      setupForm(uiElem, key, elem);
    } else if (elemContent == containerPaged) {
      setupContainerPaged(uiElem);
    }
    maybeAddDevHook(uiElem, key, elem);
  }

  function getStackTrace() {
    var obj = {stack: {}};
    Error.captureStackTrace && Error.captureStackTrace(obj, getStackTrace);
    return obj.stack;
  }

// ------------ views ----------------

  function _bindContent(subRoot, key, content, view, prefix) {
    $.each(content, function (elem, elemContent) {
//      window.console && window.console.logInfo(elem + "    : " + subRoot[elem]);
      if (subRoot[elem] == lookup) {
        logInfo("    loookup element, no checks/bindings: " + elem);
        subRoot[elem] = function() {return $("." + prefix + elem);};
      } else {
        var uiElem = view.find("." + prefix + elem);
        ensureExists(uiElem, prefix + key, prefix + elem);
        subRoot[elem] = uiElem;
        setupExtras(uiElem, elemContent, key, elem);
//        logInfo("    bound UI for: " + elem);
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

  function makePropagationFunction(content) {
    var map = {},
        types = ["text", "hidden", undefined];
    $.each(content, function (key, elem) {
      map[key] = elem;
    });
    return function(data) {
      $.each(map, function (key, elem) {
        if (data[key] != undefined && data[key] != null) {
          var tagName = elem[0].tagName.toLowerCase();
          if (tagName == "input" || tagName == "textarea") {
            var el = $(elem[0]),
                tp = el.attr("type");
            if ($.inArray(tp, types) >= 0) {
              elem.val(data[key]);
            } else if (tp == "radio") {
              $.each(elem, function(idx, subelem) {
                $(subelem).prop("checked", subelem.value == data[key]);
              });
            }
          } else if (tagName == "img") {
            elem.attr("src", data[key]);
          } else {
            elem.html(data[key]);
          }
        }
      });
    }
  }

  function _bindViews(prefix, root) {
    prefix = prefix || "";
    $.each(root, function (key, content) {
      logInfo("binding UI for view: " + key);
      var view = $("#" + prefix + key);
      ensureExists(view, prefix + key);
      _bindContent(root[key], key, content, view, prefix);
      ensureSafeExtend(root[key], view);
      root[key].propagate = makePropagationFunction(content);
      $.extend(root[key], view);
      maybeAddDevHook(view, key, undefined);
    });
  }

// ------------ templates ----------------

  function _bindTemplates(prefix, root) {
    prefix = prefix || "";
    $.each(root, function(key, content) {
      logInfo("binding UI for template: " + key);
      var tm = $("#" + prefix + key);
      ensureExists(tm, prefix + key);
      $.each(content, function (elem, elemType) {
        ensureExists(tm.find("." + prefix + elem), prefix + key, prefix + elem);
      });
      root[key].parseTemplate = function(data) {
        var retVal = $("<!-- -->" + parseTemplate(tm, data)); // add comment to force jQuery to read it as HTML fragment
        root[key].propagate = makePropagationFunction(content);
        $.each(content, function (elem, elemType) {
          if (elem != "parseTemplate" && elem != "parseTemplate2Text") {
            retVal[elem] = $.merge(retVal.filter("." + prefix + elem), retVal.find("." + prefix + elem));
            setupExtras(retVal[elem], root[key][elem], key, elem);
            maybeAddDevHook(retVal[elem], key, elem);
          }
        });
        retVal.splice(0, 1); // remove first comment
        return retVal;
      };
      root[key].parseTemplate2Text = function(data) {
        return parseTemplate(tm, data);
      };
    });
  }

  function parseTemplate2Text(tm, data) {
    return parseTemplate(tm, data);
  }

// ------------ model staff ----------------

  function assignOnHandler(obj, eventName, fname) {
    var fn = function(cb) {
      var trace;
      if (jiant.DEBUG_MODE.events) {
        debug("assigning event handler to " + eventName);
        eventsUsed[eventName] && debug(" !!! Event handler assigned after fire occured, possible error, for event " + eventName);
        trace = getStackTrace();
      }
      if (fname) {
        obj[fname].listenersCount++;
      } else {
        obj.listenersCount++;
      }
      eventBus.on(eventName, function () {
        jiant.DEBUG_MODE.events && debug("called event handler: " + eventName + ", registered at " + trace);
        var args = $.makeArray(arguments);
        args.splice(0, 1);
        cb && cb.apply(cb, args);
      })
    };
    if (fname) {
      obj[fname].on = fn;
      obj[fname].listenersCount = 0;
    } else {
      obj.on = fn;
      obj.listenersCount = 0;
    }
  }

  function bindFunctions(name, spec, obj) {
    var storage = [],
        fldPrefix = "fld_prefix_";
//        predefined = ["add", "all", "on", "remove"];
//    $.each(predefined, function(idx, fn) {
//      if (! spec[fn]) {
//        spec[fn] = fn;
//        jiant.logInfo("  !Adding not declared function to model: " + fn);
//      }
//    });
    $.each(spec, function(fname, funcSpec) {
      var eventName = name + "_" + fname + "_event",
          globalChangeEventName = name + "_globalevent";
      jiant.logInfo("  implementing model function " + fname);
      if (fname == "all") {
        obj[fname] = function() {
          return storage;
        };
      } else if (fname == "on") {
        assignOnHandler(obj, globalChangeEventName);
      } else if (fname == "add") {
        var params = getParamNames(funcSpec);
        obj[fname] = function() {
          var newObj = {};
          $.each(arguments, function(idx, arg) {
            params[idx] && (newObj[fldPrefix + params[idx]] = arg);
          });
          storage.push(newObj);
          bindFunctions(name, spec, newObj);
          jiant.DEBUG_MODE.events && debug("fire event: " + eventName);
          jiant.DEBUG_MODE.events && (! eventsUsed[eventName]) && (eventsUsed[eventName] = name);
          eventBus.trigger(eventName, newObj);
          jiant.DEBUG_MODE.events && debug("fire event: " + globalChangeEventName);
          jiant.DEBUG_MODE.events && (! eventsUsed[globalChangeEventName]) && (eventsUsed[globalChangeEventName] = name);
          eventBus.trigger(globalChangeEventName, [newObj, fname]);
          return newObj;
        };
        assignOnHandler(obj, eventName, fname);
      } else if (fname == "remove") {
        obj[fname] = function(elem) {
          var prevLen = storage.length;
          storage = $.grep(storage, function(value) {return value != elem;});
          if (storage.length != prevLen) {
            jiant.DEBUG_MODE.events && debug("fire event: " + eventName);
            jiant.DEBUG_MODE.events && (! eventsUsed[eventName]) && (eventsUsed[eventName] = name);
            eventBus.trigger(eventName, elem);
            jiant.DEBUG_MODE.events && debug("fire event: " + globalChangeEventName);
            jiant.DEBUG_MODE.events && (! eventsUsed[globalChangeEventName]) && (eventsUsed[globalChangeEventName] = name);
            eventBus.trigger(globalChangeEventName, [elem, fname]);
          }
          return elem;
        };
        assignOnHandler(obj, eventName, fname);
      } else if (fname.indexOf("findBy") == 0 && fname.length > 6) {
        var fieldName = fldPrefix + fname.substring(6).toLowerCase();
        obj[fname] = function(val) {
          return $.grep(storage, function(value) {return value[fieldName] == val});
        };
      } else {
        obj[fname] = function(val) {
          var fieldName = fldPrefix + fname;
          if (arguments.length == 0) {
            return obj[fieldName];
          } else {
            if (obj[fieldName] !== val) {
              obj[fieldName] = val;
              jiant.DEBUG_MODE.events && debug("fire event: " + eventName);
              jiant.DEBUG_MODE.events && (! eventsUsed[eventName]) && (eventsUsed[eventName] = name);
              eventBus.trigger(eventName, [obj, val]);
              jiant.DEBUG_MODE.events && debug("fire event: " + globalChangeEventName);
              jiant.DEBUG_MODE.events && (! eventsUsed[globalChangeEventName]) && (eventsUsed[globalChangeEventName] = name);
              eventBus.trigger(globalChangeEventName, [obj, fname, val]);
            }
            return obj[fieldName];
          }
        };
        assignOnHandler(obj, eventName, fname);
//        jiant.logError("Unsupported model functionality declaration, can't implement: " + fname);
      }
    });
  }

  function _bindModels(models) {
    $.each(models, function(name, spec) {
      jiant.logInfo("implementing model " + name);
      bindFunctions(name, spec, spec);
    });
  }

// ------------ events staff ----------------

  function _bindEvents(events) {
    $.each(events, function(name, spec) {
      logInfo("binding event: " + name);
      events[name].listenersCount = 0;
      events[name].fire = function() {
        jiant.DEBUG_MODE.events && debug("fire event: " + name);
        jiant.DEBUG_MODE.events && (! eventsUsed[name]) && (eventsUsed[name] = name);
        eventBus.trigger(name + ".event", arguments);
      };
      events[name].on = function (cb) {
        var trace;
        if (jiant.DEBUG_MODE.events) {
          debug("assigning event handler to: " + name);
          eventsUsed[name] && debug(" !!! Event handler assigned after fire occured, possible error, for event " + name);
          trace = getStackTrace();
        }
        events[name].listenersCount++;
        eventBus.on(name + ".event", function () {
          jiant.DEBUG_MODE.events && debug("called event handler: " + name + ", registered at " + trace);
          var args = $.makeArray(arguments);
          args.splice(0, 1);
          cb && cb.apply(cb, args);
        })
      };
    });
  }

// ------------ states staff ----------------

  function _bindStates(states) {
    if (! $.History) {
      var err = "No history plugin and states configured. Don't use states or add $.History plugin";
      jiant.logError(err);
      if (jiant.DEV_MODE) {
        alert(err);
      }
      return;
    }
    $.each(states, function(name, stateSpec) {
      logInfo("binding state: " + name);
      stateSpec.go = go(name, stateSpec.root);
      stateSpec.start = function(cb) {
        var trace;
        if (jiant.DEBUG_MODE.states) {
          debug("register state start handler: " + name);
          statesUsed[name] && debug(" !!! State start handler registered after state triggered, possible error, for state " + name);
          trace = getStackTrace();
        }
        eventBus.on("state_" + name + "_start", function() {
          jiant.DEBUG_MODE.states && debug("called state start handler: " + name + ", registered at " + trace);
          var args = $.makeArray(arguments);
          args.splice(0, 1);
          cb && cb.apply(cb, args);
        });
      };
      stateSpec.end = function(cb) {
        var trace;
        if (jiant.DEBUG_MODE.states) {
          debug("register state end handler: " + name);
          statesUsed[name] && debug(" !!! State end handler registered after state triggered, possible error, for state " + name);
          trace = getStackTrace();
        }
        eventBus.on("state_" + name + "_end", function() {
          jiant.DEBUG_MODE.states && debug("called state end handler: " + name + ", registered at " + trace);
          var args = $.makeArray(arguments);
          args.splice(0, 1);
          cb && cb.apply(cb, args);
        });
      };
    });
    $.History.bind(function (state) {
      var parsed = parseState(),
          stateId = parsed.now[0],
          handler = states[stateId],
          params = parsed.now;
      params.splice(0, 1);
      $.each(params, function(idx, p) {
        if (p == "undefined") {
          params[idx] = undefined;
        }
      });
      if (lastState != undefined && lastState != stateId) {
        jiant.DEBUG_MODE.states && debug("trigger state end: " + (lastState ? lastState : ""));
        eventBus.trigger("state_" + lastState + "_end");
      }
      lastState = stateId;
      stateId = (stateId ? stateId : "");
      jiant.DEBUG_MODE.states && debug("trigger state start: " + stateId);
      jiant.DEBUG_MODE.states && (! statesUsed[stateId]) && (statesUsed[stateId] = stateId);
      eventBus.trigger("state_" + stateId + "_start", params);
    });
  }

  function go(stateId, root) {
    return function() {
      var parsed = parseState(),
          prevState = parsed.now;
      parsed.now = [stateId];
      $.each(arguments, function(idx, arg) {
        if (arg != undefined) {
          parsed.now.push(pack(arg + ""));
        } else if (prevState[0] == stateId && prevState[idx + 1] != undefined) {
          parsed.now.push(pack(prevState[idx + 1] + ""));
        } else {
          parsed.now.push(pack(arg + ""));
        }
      });
      if (root) {
        parsed.root = [];
        $.each(parsed.now, function(idx, param) {
          parsed.root.push(param);
        });
      } else {
        $.each(parsed.root, function(idx, param) {
          parsed.root[idx] = pack(param);
        });
      }
      setState(parsed);
    };
  }

  function goRoot() {
    var parsed = parseState();
    parsed.now = [];
    $.each(parsed.root, function(idx, param) {
      parsed.now.push(pack(param));
      parsed.root[idx] = pack(param);
    });
    setState(parsed);
  }

  function setState(parsed) {
    var s = "now=" + parsed.now + "|root=" + parsed.root;
    if (jiant.STATE_EXTERNAL_BASE) {
      window.location.assign(jiant.STATE_EXTERNAL_BASE + "#" + s);
    } else {
      $.History.go(s);
    }
  }

  function parseState() {
    var state = $.History.getState();
    var arr = state.split("|");
    var parsed = {};
    $.each(arr, function(idx, item) {
      var itemArr = item.split("="),
          args = [];
      if (itemArr.length >= 2) {
        args = itemArr[1].split(",");
      }
      parsed[itemArr[0]] = [];
      $.each(args, function(idx, arg) {
        parsed[itemArr[0]].push(unpack(arg));
      });
    });
    parsed.now = parsed.now || [];
    parsed.root = parsed.root || [];
    return parsed;
  }

  function pack(s) {
    return s ? s.replace(/;/g, ";;").replace(/,/g, ";1").replace(/=/g, ";2").replace(/\|/g, ";3") : "";
  }

  function unpack(s) {
    return s ? s.replace(/;3/g, "|").replace(/;2/g, "=").replace(/;1/g, ",").replace(/;;/g, ";") : "";
  }

  function refreshState() {
    $.History.trigger($.History.getState());
  }

// ------------ ajax staff ----------------

  function getParamNames(func) {
    var funStr = func.toString();
    return funStr.slice(funStr.indexOf('(')+1, funStr.indexOf(')')).match(/([^\s,]+)/g);
  }

  function _bindAjax(root) {
    $.each(root, function(uri, funcSpec) {
      logInfo("binding ajax for function: " + uri);
      var params = getParamNames(funcSpec);
      params.splice(params.length - 1, 1);
      root[uri] = makeAjaxPerformer(uri, params, $.isFunction(root[uri]) ? root[uri]() : undefined);
    });
  }

  function parseForAjaxCall(root, path, actual) {
    if ($.isArray(actual)) {
      root[path] = actual;
    } else if ($.isPlainObject(actual)) {
      $.each(actual, function(key, value) {
        parseForAjaxCall(root, key, value);
//        parseForAjaxCall(root, path + "." + key, value);
      });
    } else {
      root[path] = actual;
    }
  }

  function makeAjaxPerformer(uri, params, hardUrl) {
    return function() {
      var callData = {},
          callback,
          errHandler,
          outerArgs = arguments;
      if ($.isFunction(outerArgs[outerArgs.length - 2])) {
        callback = outerArgs[outerArgs.length - 2];
        errHandler = outerArgs[outerArgs.length - 1];
      } else if ($.isFunction(outerArgs[outerArgs.length - 1])) {
        callback = outerArgs[outerArgs.length - 1];
      }
      $.each(params, function(idx, param) {
        if (idx < outerArgs.length && !$.isFunction(outerArgs[idx]) && outerArgs[idx] != undefined && outerArgs[idx] != null) {
          var actual = outerArgs[idx];
          parseForAjaxCall(callData, param, actual);
        }
      });
      if (! callData["antiCache3721"]) {
        callData["antiCache3721"] = new Date().getTime();
      }
      var url = hardUrl ? hardUrl : jiant.AJAX_PREFIX + uri + jiant.AJAX_SUFFIX;
      logInfo("    AJAX call. " + uri + " to server url: " + url);
      $.ajax(url, {data: callData, traditional: true, success: function(data) {
        if (callback) {
          try{
            data = $.parseJSON(data);
          } catch (ex) {}
          jiant.DEBUG_MODE.ajax && debug("Ajax call results for uri " + uri) && debug(data);
          callback(data);
        }
      }, error: function(jqXHR, textStatus, errorText) {
        if (errHandler) {
          errHandler(jqXHR.responseText);
        } else {
          jiant.handleErrorFn(jqXHR.responseText);
        }
      }});
    };
  }

  function defaultAjaxErrorsHandle(errorDetails) {
    logError(errorDetails);
  }

// ------------ base staff ----------------

  function maybeSetDevModeFromQueryString() {
    if ((window.location + "").toLowerCase().indexOf("jiant.dev_mode") >= 0) {
      jiant.DEV_MODE = true;
    }
  }

  function maybeSetDebugModeFromQueryString() {
    if ((window.location + "").toLowerCase().indexOf("jiant.debug_events") >= 0) {
      jiant.DEBUG_MODE.events = 1;
    }
    if ((window.location + "").toLowerCase().indexOf("jiant.debug_states") >= 0) {
      jiant.DEBUG_MODE.states = 1;
    }
    if ((window.location + "").toLowerCase().indexOf("jiant.debug_ajax") >= 0) {
      jiant.DEBUG_MODE.ajax = 1;
    }
  }

  function _bindUi(prefix, root, devMode) {
    jiant.DEV_MODE = devMode;
    if (! devMode) {
      maybeSetDevModeFromQueryString();
    }
    maybeSetDebugModeFromQueryString();
    errString = "";
    bindingsResult = true;
    if (! root.id) {
      jiant.logError("!!! Application id not specified. Not recommended since 0.20. Use 'id' property of application root to specify application id");
    } else {
      jiant.logInfo("Loading application, id: " + root.id);
    }
    if (root.views) {
      _bindViews(prefix, root.views);
    } else {
      root.views = {};
    }
    if (root.templates) {
      _bindTemplates(prefix, root.templates);
    } else {
      root.templates = {};
    }
    if (root.ajax) {
      _bindAjax(root.ajax);
    } else {
      root.ajax = {};
    }
    if (root.events) {
      _bindEvents(root.events);
    } else {
      root.events = {};
    }
    if (root.states) {
      _bindStates(root.states);
    } else {
      root.states = {};
    }
    if (root.models) {
      _bindModels(root.models);
    } else {
      root.models = {};
    }
    if (jiant.DEV_MODE && !bindingsResult) {
      alert("Some elements not bound to HTML properly, check console" + errString);
    }
    var appId = (root.id ? root.id : "no_app_id");
    uiBoundRoot[appId] = root;
    var eventId = "jiant_uiBound_" + appId;
    eventBus.trigger(eventId);
  }

  function bindUi(prefix, root, devMode, viewsUrl, injectId) {
    var startedAt = new Date().getMilliseconds();
    if (viewsUrl) {
      var injectionPoint = injectId ? $("#" + injectId) : $("body");
      injectionPoint.load(viewsUrl, {}, function() {
        $.ajaxSetup({
          contentType:"application/json",
          dataType:'jsonp',
          xhrFields: {
            withCredentials: true
          },
          crossDomain: true
        });
        _bindUi(prefix, root, devMode);
      });
    } else {
      _bindUi(prefix, root, devMode);
    }
    jiant.logInfo("UI bound in " + (new Date().getMilliseconds() - startedAt) + "ms");
  }

  function bind(obj1, obj2) {
    $.extend(obj1, obj2);
  }

  function onUiBound(appId, cb) {
    if (! cb) {
      jiant.logError("!!! Registering anonymous logic without application id. Not recommended since 0.20");
      cb = appId;
      appId = "no_app_id";
    } else {
      if ($.isPlainObject(appId)) {
        appId = appId.id;
      }
    }
    if (uiBoundRoot[appId]) {
      cb && cb($, uiBoundRoot[appId]);
    } else {
      var eventId = "jiant_uiBound_" + appId;
      eventBus.on(eventId, function() {
        cb && cb($, uiBoundRoot[appId]);
      });
    }
  }

  return {
    AJAX_PREFIX: "",
    AJAX_SUFFIX: "",
    DEV_MODE: false,
    DEBUG_MODE: {
      states: 0,
      events: 0,
      ajax: 0
    },
    PAGER_RADIUS: 6,
    isMSIE: eval("/*@cc_on!@*/!1"),
    STATE_EXTERNAL_BASE: undefined,

    bind: bind,
    bindUi: bindUi,
    goRoot: goRoot,
    goState: goState,
    onUiBound: onUiBound,
    refreshState: refreshState,

    handleErrorFn: defaultAjaxErrorsHandle,
    logInfo: logInfo,
    logError: logError,
    parseTemplate: function(text, data) {return $(parseTemplate(text, data));},
    parseTemplate2Text: parseTemplate2Text,

    collection: collection,
    container: container,
    containerPaged: containerPaged,
    ctl : ctl,
    fn: fn,
    form: form,
    formatDate: formatDate,
    formatTime: formatTime,
    formatTimeSeconds: formatTimeSeconds,
    grid: grid,
    image: image,
    input: input,
    inputDate: inputDate,
    inputInt: inputInt,
    label: label,
    lookup: lookup,
    on: on,
    pager: pager,
    slider: slider,
    stub: stub,
    tabs: tabs,

    key: {left: 37, up: 38, right: 39, down: 40, del: 46, backspace: 8, tab: 9, end: 35, home: 36, enter: 13, ctrl: 17,
      escape: 27,
      a: 65, c: 67, u: 85, w: 87, space: 32, 1: 49, 2: 50, 3: 51, 4: 52, 5: 53, 6: 54}

  };

})(jQuery);
