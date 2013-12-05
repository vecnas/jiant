/*
 0.01 : ajax alpha, views, templates
 0.02 : event bus
 0.03 : ajax with callback and errHandler per call
 0.04 : bind plugin
 0.05 : states
 0.06 : onUiBound event for anonymous plugins, empty hash state
 0.07 : crossdomain views load, setupForm check for form, pager update
 0.08 : broken for some ie cases, templates IE attribute quotes workaround from http:weblogs.asp.net/alexeigorkov/archive/2010/03/16/lazy-html-attributes-wrapping-in-internet-explorer.aspx
 0.09 : broken for some ie cases, templates IE redone, to avoid bug with "a=!!val!!" situation, isMSIE flag added
 0.10 : templates IE one more redone, attributes DOM manipulation, for templates parse, parse template starting with plain text by adding comment, template controls binding
 0.11: ajax url override for ajax calls via returning value from specification function
 0.12: return from submitForm, template parse results binding changed to merge of filter and find to support no-root templates, added propagate(data) function to views
 0.13: comment node removed from template parse results
 0.14: events[name].listenersCount++;
 0.15: parseInt for inputInt value arrow up
 0.16: state parameters - undefined replacement by current value properly, inputDate added, works when datepicker available, formatDate, formatTime added
 0.17: propagate "0" and "" passed as valid values
 0.18: default state "end" not triggered - fixed
 0.19: DEBUG_MODE added, state start vs trigger check in debug mode, event usage check in debug mode
 0.20: appId introduced
 0.21: root state not packed, go back not packed - fixed, propagate added to parseTemplate results
 0.22: onUiBound accepts both app and app.id as first param
 0.23: model initial auto-implementation added for method names "add", "remove", "setXXX", "getXXX", "findByXXX"; .xl added
 0.24: model modified, "set"/"get" replaced by single method xxx(optional_param), in jquery style, added global "on" event for any model change. incompatible with 0.23
 0.25: radio button handled properly in propagate function
 0.26: jiant.STATE_EXTERNAL_BASE added for navigation to another page in frames of state change, fixed multiple apps on a page mixing
 0.27: predefined model functions not created automatically more
 0.28: ajaxPrefix, ajaxSuffix, stateExternalBase per application for multi-app support
 0.28.1: minor fix for "" comparison
 0.29: refreshState() workaround for used History plugin timeout, states tuning, per app cross domain via flag for multiple app cross/noncross domain mix, form influenced by ajax pre/suff
 0.30: cross domain settings for submitForm
 0.31: addAll() method added to model with auto-wrap for all source object properties
 0.32: propagate() fixed for templates, propagate(model) with auto data binding added, customRenderer(elem, value, isUpdate) for view/template controls
 0.33: refreshTabs added to jiant.tabs, logInfo prints any amount of arguments
 0.34: override unsafe extended properties with user jiant specified
 0.35: customRenderer accepts 4 parameters: bound object, bound view, new field value, is update
 0.36: models.on fixed - fired for target object only, models.update() added
 0.37: provided implementation for model functions support
 0.38: models.updateAll, models.update.on triggered on addAll, AI on .update.on subscription to spec
 0.39: $.History replaced by $.hashchange usage
 0.40: triggering current state for later registered state handlers, logError accepts any amount of arguments, model events manipulations
 0.41: transact update() of models
 0.42: mixed case field name support by findByXXX, minor fixes
 0.43: default renderer handles missing view elements
 0.44: initial state switch fixed
 0.45: app.dirtyList added, app.appPrefix with new bindUi syntax added
 0.46: lfill made public
 0.47: added asaa/asap synonim functions to models for synchronization by value availability, added jiant.getCurrentState()
 0.48 global model .on() fixed, now works
 0.49 per view/template appPrefix support, for better cross-application integration, added version() function and override by latest version
 0.50 fixed multiple apps events/states intersection, still exists tracking bug with events/statesUsed for multiple apps
 0.51 fix for minor bug in 0.50 - no notification on state end for 2nd application on a page
 0.52 findByXXXAndYYYAndZZZ() support for models, find by several parameters, separated by And
 0.53 setXXXAndYYYAndZZZ(xxx, yyy, zzz) support for models, set several fields
 0.54 custom behaviour injection into model via functions with more than 1 argument and empty body
 0.55 reverted 0.54, added logic support, added shortenings for sections: (v)iews, (m)odels, (t)emplates, (e)vents, (a)jax, (s)tates, (l)ogic
 0.56 parseTemplate executes propagate, customRenderer accepts one more parameter - reference to parse result or view, double bindUi call notify, 0-len params on ajax call fix
 0.57 parseTemplate call without parameters supported
 0.58 dependency load logic via onUiBound parameter, every logic received .implement(obj) method, for implementation declaration, 0.55 logic behaviour cancelled
 0.59 asap() fixed, wrong params when value already set
 0.60 parseTemplate logs error to console on parse failure, inputInt: left/right keys enabled, added dot/comma keys, added inputFloat
 0.61 formatDate() independent from datepicker
 0.62 UiFactory extracted, it is possible to override it
 0.63 UiFactory updated, check for setUiFactory added, removed reporting of missing elements of already missing view
 0.64 UiFactory applied to template components via viewComponent() call
 0.65 parseState pack/unpack fixed (removed old seldom occuring bugs), data objects can be passed as state params from now
 0.66 models.add from now is same as models.addAll, not back compatible, added DEBUG_MODE.data switch,
 updateAll now accepts 3 arguments: updateAll(arr, removeMissing, matcherCb), arr - could be single item or array,
 removeMissing - is to remove missing elements (default false), matcherCb(elem1, elem2) - comparator, default - by id
 0.67 updateAll fixed - addAll() call added for new elements
 0.68 fixed - state.go() ignored set of undefined params to previous state values, when they are on the tail
 0.69 propagate() calls customRenderer() for all view elements with customRenderer assigned
 0.70 model updateAll fixed, removeMissing not used fixed
 0.71 jiant.meta added - field annotated with meta skipped during binding and used by application for metainformation
 0.72 lfill and format functions improved, basing on tests
 0.73 extra update event calls removed
 0.74 onAppInit callback was added
 0.75 setTimeout checker for dependency in dev mode
 0.76 formatDateUsa added, produces MM/DD/YYYY date presentation
 0.77 INCOMPATIBLE MODELS CHANGE! findByXXX returns single element (may be null), and new listByXXX methods return array
 0.78 .on(cb) handler for model fields gets one more parameter, oldVal: cb(obj, val, oldVal), for convenience
 0.79 .off(hndlr) added for all model properties, it accepts handler, returned by .on method. Also propagate
 unsubscribes from previous model when bound to new, inputInt() change value by up/down arrows now trigger change event
 0.80: input type=checkbox now propagated, customRenderer last parameter fixed
 0.81: per application states supported, mix of multiple stateful applications supported
 0.82: formatDateUsa fix
 0.83: per application states - initial wasn't fired fix
 0.84: asMap for models
 0.85: jiant.refreshState() fixed after been broken by 0.81
 0.86: hashchange() directly called after state set, to resolve hashchange async behaviour
 0.87: multiple apps onUiBound: onUiBound([app1Id, app2Id...], depsList, function($, app1, app2...))
 0.88: customRenderer for templates - last param changed to parse result, not specification reference
 0.89: time to bind UI now properly reported in console instead of previous random number
 0.90: randomIntBetween(from, to) function added
 */

(function() {
  var
      DefaultUiFactory = function() {

        function view(prefix, viewId) {
          return $("#" + prefix + viewId);
        }

        function viewComponent(viewElem, viewId, prefix, componentId, componentContent) {
          return viewElem.find("." + prefix + componentId);
        }

        function template(prefix, tmId, tmContent) {
          return $("#" + prefix + tmId);
        }

        return {
          template: template,
          viewComponent: viewComponent,
          view: view
        }
      },

      tmpJiant = (function($) {

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
            inputFloat = {},
            inputDate = {},
            label = {},
            meta = {},
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

            bindingsResult = true,
            errString,

            lastStates = {},
            lastEncodedStates = {},
            loadedLogics = {},
            awaitingDepends = {},
            eventBus = $({}),
            uiBoundRoot = {},
            onInitAppActions = [],
            uiFactory = new DefaultUiFactory(),
            statesUsed = {},
            eventsUsed = {};

        function randomIntBetween(from, to) {
          return Math.floor((Math.random()*(from - to + 1)) + from);
        }
        function toDate(val) {
          var num = Number(val);
          return ((num === 0 && val !== 0 && val !== "0") || isNaN(num)) ? null : new Date(num);
        }

        function formatDate(millis) {
          var dt = toDate(millis);
          return dt == null ? "" : lfill(dt.getFullYear()) + "-" + lfill(dt.getMonth()) + "-" + lfill(dt.getDate());
        }

        function formatDateUsa(millis) {
          var dt = toDate(millis);
          return dt == null ? "" : lfill(dt.getMonth()+1) + "/" + lfill(dt.getDate()) + "/" + lfill(dt.getFullYear());
        }

        function formatTime(millis) {
          var dt = toDate(millis);
          return dt == null ? "" : lfill(dt.getHours()) + ":" + lfill(dt.getMinutes());
        }

        function formatTimeSeconds(millis) {
          var dt = toDate(millis);
          return dt == null ? "" : lfill(dt.getHours()) + ":" + lfill(dt.getMinutes()) + ":" + lfill(dt.getSeconds());
        }

        function lfill(val) {
          val = "" + val;
          return val.length == 0 ? "00" : val.length == 1 ? "0" + val : val;
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

        function parseTemplate(that, data, tmId) {
          debugData("Called parse template " + (tmId ? tmId : "") + " with data", data);
          data = data || {};
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
            logError("Error parse template: " + err);
          }
          return "!!! ERROR: " + err.toString() + " !!!";
        }

        function setupInputInt(input) {
          input.keydown(function(event) {
            if (event.keyCode == jiant.key.down && input.val() > 0) {
              input.val(input.val() - 1);
              input.trigger("change");
              return false;
            } else if (event.keyCode == jiant.key.up) {
              input.val(parseInt(input.val()) + 1);
              input.trigger("change");
              return false;
            } else if (event.keyCode == jiant.key.backspace || event.keyCode == jiant.key.del
                || event.keyCode == jiant.key.end || event.keyCode == jiant.key.left || event.keyCode == jiant.key.right
                || event.keyCode == jiant.key.home || event.keyCode == jiant.key.tab || event.keyCode == jiant.key.enter) {
            } else if (event.shiftKey || (event.keyCode < 48 || event.keyCode > 57) && (event.keyCode < 96 || event.keyCode > 105 )) {
              event.preventDefault();
              return false;
            }
            return true;
          });
        }

        function setupInputFloat(input) {
          input.keydown(function(event) {
            if (event.keyCode == jiant.key.down && input.val() > 0) {
              input.val(input.val() - 1);
              input.trigger("change");
              return false;
            } else if (event.keyCode == jiant.key.up) {
              input.val(parseInt(input.val()) + 1);
              input.trigger("change");
              return false;
            } else if (event.keyCode == jiant.key.dot) {
              return (input.val().indexOf(".") < 0) && input.val().length > 0;
            } else if (event.keyCode == jiant.key.backspace || event.keyCode == jiant.key.del
                || event.keyCode == jiant.key.end || event.keyCode == jiant.key.left || event.keyCode == jiant.key.right
                || event.keyCode == jiant.key.home || event.keyCode == jiant.key.tab || event.keyCode == jiant.key.enter) {
            } else if (event.shiftKey || (event.keyCode < 48 || event.keyCode > 57) && (event.keyCode < 96 || event.keyCode > 105 )) {
              event.preventDefault();
              return false;
            }
            return true;
          });
        }

        function setupForm(appRoot, elem, key, name) {
          if (! elem[0]) {
            return;
          }
          var tagName = elem[0].tagName.toLowerCase();
          if (tagName != "form") {
            jiant.logError(key + "." + name + " form element assigned to non-form: " + tagName);
            jiant.DEV_MODE && alert(key + "." + name + " form element assigned to non-form: " + tagName);
          }
          elem.submitForm = function(url, cb) {
            url = url ? url : elem.attr("action");
            url = (appRoot.ajaxPrefix ? appRoot.ajaxPrefix : jiant.AJAX_PREFIX ? jiant.AJAX_PREFIX : "") + url;
            url = url + (appRoot.ajaxSuffix ? appRoot.ajaxSuffix : jiant.AJAX_SUFFIX ? jiant.AJAX_SUFFIX : "");
            var data = {
              type: "POST",
              url: url,
              data: elem.serialize(),
              success: cb
            };
            if (appRoot.crossDomain) {
              data.contentType = "application/json";
              data.dataType = 'jsonp';
              data.xhrFields = {withCredentials: true};
              data.crossDomain = true;
            }
            debugData("Submitting form", data);
            return $.ajax(data);
          };
        }

        function logError(error) {
          $.each(arguments, function(idx, arg) {
            window.console && window.console.error && window.console.error(arg);
          });
        }

        function logInfo(s) {
          if (jiant.DEV_MODE && window.console && window.console.info) {
            $.each(arguments, function(idx, arg) {
              window.console.info(arg);
            });
          }
        }

        function debugData(s, obj) {
          jiant.DEBUG_MODE.data && debug("   ---   " + s) && debug(obj);
        }

        function debugStates(s) {
          jiant.DEBUG_MODE.states && debug("   ---   " + s);
        }

        function debugEvents(s) {
          jiant.DEBUG_MODE.events && debug("   ---   " + s);
        }

        function debug(s) {
          if (window.console && window.console.error) {
            window.console.error(s);
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
            debugData("Updating pager", page);
            root.empty();
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

        function getStackTrace() {
          var obj = {stack: {}};
          Error.captureStackTrace && Error.captureStackTrace(obj, getStackTrace);
          return obj.stack;
        }

// ------------ views ----------------

        function _bindContent(appRoot, viewRoot, viewId, viewContent, viewElem, prefix) {
          $.each(viewContent, function (componentId, componentContent) {
            if (componentId != "appPrefix") {
              if (viewRoot[componentId] == jiant.lookup) {
                jiant.logInfo("    loookup element, no checks/bindings: " + componentId);
                viewRoot[componentId] = function() {return viewElem.find("." + prefix + componentId);};
              } else if (viewRoot[componentId] == jiant.meta) {
                //skipping, app meta info
              } else {
                var uiElem = uiFactory.viewComponent(viewElem, viewId, prefix, componentId, componentContent);
                ensureExists(prefix, appRoot.dirtyList, uiElem, prefix + viewId, prefix + componentId);
                viewRoot[componentId] = uiElem;
                setupExtras(appRoot, uiElem, componentContent, viewId, componentId);
                //        logInfo("    bound UI for: " + componentId);
              }
            }
          });
        }

        function ensureSafeExtend(spec, jqObject) {
          $.each(spec, function(key, content) {
            if (jqObject[key]) {
              jiant.logError("unsafe extension: " + key + " already defined in base jQuery, shouldn't be used, now overriding!");
              jqObject[key] = undefined;
            }
          });
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
              } else if (t == "object" && v !== null) {
                v = pseudoserializeJSON(v);
              }
              json.push((arr ? "" : '"' + k + '":') + (v ? v : "\"\""));
            });
            return (arr ? "[" : "{") + String(json) + (arr ? "]" : "}");
          }
        }

        function maybeAddDevHook(uiElem, key, elem) {
          jiant.DEV_MODE && uiElem.click(function(event) {
            if (event.shiftKey && event.altKey) {
              var message = key + (elem ? ("." + elem) : "");
              if (event.ctrlKey) {
                message += "\r\n------------\r\n";
                message += pseudoserializeJSON($._data(uiElem[0], "events"));
              }
              jiant.logInfo(message);
              alert(message);
              event.preventDefault();
              event.stopImmediatePropagation();
            }
          });
        }

        function ensureExists(appPrefix, dirtyList, obj, idName, className) {
          if (idName && dirtyList && ($.inArray(idName, dirtyList) >= 0
              || (appPrefix && $.inArray(idName.substring(appPrefix.length), dirtyList) >= 0))) {
            return true;
          }
          if (!obj || !obj.length) {
            window.console && window.console.error
            && (className ? jiant.logError("non existing object referred by class under object id '" + idName
                + "', check stack trace for details, expected obj class: " + className) :
                jiant.logError("non existing object referred by id, check stack trace for details, expected obj id: " + idName));
            if (className) {
              errString += "   ,    #" + idName + " ." + className;
            } else {
              errString += ", #" + idName;
            }
            bindingsResult = false;
            return false;
          }
          return true;
        }

        function setupExtras(appRoot, uiElem, elemContent, key, elem) {
          if ((elemContent == jiant.tabs || elemContent.tabsTmInner) && uiElem.tabs) {
            uiElem.tabs();
            uiElem.refreshTabs = function() {uiElem.tabs("refresh");};
          } else if (elemContent == jiant.inputInt || elemContent.inputIntTmInner) {
            setupInputInt(uiElem);
          } else if (elemContent == jiant.inputFloat || elemContent.inputFloatTmInner) {
            setupInputFloat(uiElem);
          } else if ((elemContent == jiant.inputDate || elemContent.inputDateTmInner) && uiElem.datepicker) {
            uiElem.datepicker();
          } else if (elemContent == jiant.pager || elemContent.pagerTmInner) {
            setupPager(uiElem);
          } else if (elemContent == jiant.form || elemContent.formTmInner) {
            setupForm(appRoot, uiElem, key, elem);
          } else if (elemContent == containerPaged || elemContent.containerPagedTmInner) {
            setupContainerPaged(uiElem);
          }
          maybeAddDevHook(uiElem, key, elem);
        }

        function isServiceName(key) {
          var words = ["parseTemplate", "parseTemplate2Text", "propagate"];
          return $.inArray(key, words) >= 0;
        }

        function makePropagationFunction(viewId, spec, obj, viewOrTm) {
          var map = {};
          $.each(spec, function (key, elem) {
            map[key] = elem;
          });
          var fn = function(data, subscribe4updates) {
            debugData("Propagating " + viewId + " with data", data);
            subscribe4updates = (subscribe4updates == undefined) ? true : subscribe4updates;
            $.each(map, function (key, elem) {
              if (spec[key].customRenderer || (data && data[key] != undefined && data[key] != null && ! isServiceName(key))) {
                var val = data[key];
                elem = obj[key];
                if ($.isFunction(val)) {
                  getRenderer(spec, key)(data, elem, val(), false, viewOrTm);
                  if (subscribe4updates && $.isFunction(val.on)) {
                    if (fn[key]) {
                      var off = fn[key][0];
                      off && off(fn[key][1]);
                    }
                    var handler = val.on(function(obj, newVal) {getRenderer(spec, key)(data, elem, newVal, true, viewOrTm)});
                    fn[key] = [val.off, handler];
                  }
                } else {
                  getRenderer(spec, key)(data, elem, val, false, viewOrTm);
                }
              }
            });
          };
          return fn;
        }

        function getRenderer(spec, key) {
          if (spec[key] && spec[key].customRenderer && $.isFunction(spec[key].customRenderer)) {
            return spec[key].customRenderer;
          } else {
            return updateViewElement;
          }
        }

        function updateViewElement(obj, elem, val, idUpdate, viewOrTemplate) {
          if (! elem || ! elem[0]) {
            return;
          }
          var types = ["text", "hidden", undefined];
          var tagName = elem[0].tagName.toLowerCase();
          if (tagName == "input" || tagName == "textarea" || tagName == "select") {
            var el = $(elem[0]),
                tp = el.attr("type");
            if ($.inArray(tp, types) >= 0) {
              elem.val(val);
            } else if (tp == "checkbox") {
              elem.prop("checked", val ? true : false);
            } else if (tp == "radio") {
              $.each(elem, function(idx, subelem) {
                $(subelem).prop("checked", subelem.value == val);
              });
            }
          } else if (tagName == "img") {
            elem.attr("src", val);
          } else {
            elem.html(val);
          }
        }

        function _bindViews(pfx, root, appRoot, appUiFactory) {
          $.each(root, function(viewId, viewContent) {
            var prefix = viewContent.appPrefix ? viewContent.appPrefix : (pfx ? pfx : "");
            jiant.logInfo("binding UI for view: " + viewId + " using prefix " + prefix);
            var view = appUiFactory.view(prefix, viewId);
            var viewOk = ensureExists(prefix, appRoot.dirtyList, view, prefix + viewId);
            viewOk && _bindContent(appRoot, root[viewId], viewId, viewContent, view, prefix);
            ensureSafeExtend(root[viewId], view);
            root[viewId].propagate = makePropagationFunction(viewId, viewContent, viewContent, root[viewId]);
            $.extend(root[viewId], view);
            maybeAddDevHook(view, viewId, undefined);
          });
        }

// ------------ templates ----------------

        function calcInnerTmKey(elem) {
          switch (elem) {
            case (jiant.label): return "labelTmInner";
            case (jiant.ctl): return "ctlTmInner";
            case (jiant.container): return "containerTmInner";
            case (jiant.containerPaged): return "containerPagedTmInner";
            case (jiant.form): return "formTmInner";
            case (jiant.pager): return "pagerTmInner";
            case (jiant.image): return "imageTmInner";
            case (jiant.grid): return "gridTmInner";
            case (jiant.input): return "inputTmInner";
            case (jiant.inputInt): return "inputIntTmInner";
            case (jiant.inputFloat): return "inputFloatTmInner";
            case (jiant.inputDate): return "inputDateTmInner";
            default: return "customTmInner";
          }
        }

        function parseTemplate2Text(tm, data) {
          return parseTemplate(tm, data);
        }

        function _bindTemplates(pfx, root, appRoot, appUiFactory) {
          $.each(root, function(tmId, tmContent) {
            var prefix = tmContent.appPrefix ? tmContent.appPrefix : (pfx ? pfx : "");
            jiant.logInfo("binding UI for template: " + tmId + " using prefix " + prefix);
            var tm = appUiFactory.template(prefix, tmId, tmContent);
            $.each(tmContent, function (componentId, elemType) {
              if (componentId != "appPrefix") {
                if (tmContent[componentId] == jiant.lookup) {
                  jiant.logInfo("    loookup element, no checks/bindings: " + componentId);
                  tmContent[componentId] = function() {return tmContent.find("." + prefix + componentId);};
                } else if (tmContent[componentId] == jiant.meta) {
                  //skipping, app meta info
                } else {
                  var comp = appUiFactory.viewComponent(tm, tmId, prefix, componentId, elemType);
                  ensureExists(prefix, appRoot.dirtyList, comp, prefix + tmId, prefix + componentId);
                  var innerTmKey = calcInnerTmKey(tmContent[componentId]);
                  tmContent[componentId] = {};
                  tmContent[componentId][innerTmKey] = true;
                }
              }
            });
            ensureExists(prefix, appRoot.dirtyList, tm, prefix + tmId);
            root[tmId].parseTemplate = function(data) {
              var retVal = $("<!-- -->" + parseTemplate(tm, data, tmId)); // add comment to force jQuery to read it as HTML fragment
              $.each(tmContent, function (elem, elemType) {
                if (elem != "parseTemplate" && elem != "parseTemplate2Text" && elem != "appPrefix") {
                  retVal[elem] = $.merge(retVal.filter("." + prefix + elem), retVal.find("." + prefix + elem));
                  setupExtras(appRoot, retVal[elem], root[tmId][elem], tmId, elem);
                  maybeAddDevHook(retVal[elem], tmId, elem);
                }
              });
              retVal.splice(0, 1); // remove first comment
              retVal.propagate = makePropagationFunction(tmId, tmContent, retVal, retVal);
              data && retVal.propagate(data);
              return retVal;
            };
            root[tmId].parseTemplate2Text = function(data) {
              return parseTemplate(tm, data);
            };
          });
        }

// ------------ model staff ----------------

        function assignAsapHandler(obj, eventName, fname) {
          var fn = function(cb) {
            var trace;
            if (jiant.DEBUG_MODE.events) {
              debug("assigning event handler to " + eventName);
              eventsUsed[eventName] && debug(" !!! Event handler assigned after fire occured, possible error, for event " + eventName);
              trace = getStackTrace();
            }
            var val = obj[fname]();
            if (val != undefined) {
              cb && cb.apply(cb, [obj, val]);
            } else {
              obj._innerData.one(eventName, function () {
                debugEvents("called event handler: " + eventName + ", registered at " + trace);
                var args = $.makeArray(arguments);
                args.splice(0, 1);
                cb && cb.apply(cb, args);
              })
            }
          };
          obj[fname].asap = fn;
        }

        function assignOnOffHandlers(obj, eventName, fname, eventObject) {
          eventObject = eventObject ? eventObject : obj._innerData;
          var fn = function (cb) {
                var trace;
                if (jiant.DEBUG_MODE.events) {
                  debug("assigning event handler to " + eventName);
                  eventsUsed[eventName] && debug(" !!! Event handler assigned after fire occured, possible error, for event " + eventName);
                  trace = getStackTrace();
                }
                (fname ? obj[fname] : obj).listenersCount++;
                var handler = function () {
                  debugEvents("called event handler: " + eventName + ", registered at " + trace);
                  var args = $.makeArray(arguments);
                  args.splice(0, 1);
                  //        args.splice(0, 2);
                  cb && cb.apply(cb, args);
                };
                eventObject.on(eventName, handler);
                return handler
              },
              fnOff = function (handler) {
                (fname ? obj[fname] : obj).listenersCount--;
                var res = eventObject.off(eventName, handler);
              };
          if (fname) {
            obj[fname].on = fn;
            obj[fname].off = fnOff;
            obj[fname].listenersCount = 0;
            assignAsapHandler(obj, eventName, fname);
          } else {
            obj.on = fn;
            obj.off = fnOff;
            obj.listenersCount = 0;
          }
        }

        function bindFunctions(name, spec, obj, appId) {
          var storage = [],
              fldPrefix = "fld_prefix_";
          if (spec.updateAll && spec.id) {
            if (! spec.update) spec.update = function(val) {};
            if (! spec.findById) spec.findById = function(val) {};
          }
          if (spec.updateAll) {
            if (! spec.addAll) spec.addAll = function(val) {};
            if (! spec.remove) spec.remove = function(elem) {};
          }
          if (! spec.update) {
            $.each(spec, function(fname, funcSpec) {
              if (fname.indexOf("set") == 0 && fname.length > 3 && ("" + funcSpec).indexOf("{}") == ("" + funcSpec).length - 2) {
                spec.update = function(val) {};
                return false;
              }
            });
          }
          obj._innerData = $({});
          $.each(spec, function(fname, funcSpec) {
            var eventName = name + "_" + fname + "_event",
                globalChangeEventName = appId + name + "_globalevent";
//      jiant.logInfo("  implementing model function " + fname);
            if (fname == "_innerData") {
            } else if (fname == "all") {
              obj[fname] = function() {
                return storage;
              };
            } else if (fname == "on") {
              assignOnOffHandlers(obj, globalChangeEventName, undefined, eventBus);
            } else if (fname == "update") {
              obj[fname] = function(objFrom) {
                var smthChanged = false;
                var toTrigger = {};
                $.each(objFrom, function(key, val) {
                  if (obj[key] && $.isFunction(obj[key]) && obj[key]() != val) {
                    obj[key](val, false);
                    toTrigger[key] = true;
                    smthChanged = true;
                  }
                });
                $.each(toTrigger, function(key, val) {
                  obj[key](obj[key](), true, true);
                });
                debugData("Called update on model " + name + " with data", objFrom);
                if (smthChanged) {
                  debugEvents("fire event: " + eventName);
                  jiant.DEBUG_MODE.events && (! eventsUsed[eventName]) && (eventsUsed[eventName] = 1);
                  obj._innerData.trigger(eventName, obj);
                  obj != spec && spec._innerData.trigger(eventName, obj);
                  debugEvents("fire event: " + globalChangeEventName);
                  jiant.DEBUG_MODE.events && (! eventsUsed[globalChangeEventName]) && (eventsUsed[globalChangeEventName] = 1);
                  eventBus.trigger(globalChangeEventName, [obj, fname]);
                }
              };
              assignOnOffHandlers(obj, eventName, fname);
            } else if (fname == "updateAll") {
              obj[fname] = function(arr, removeMissing, matcherCb) {
                debugData("Called updateAll on model " + name + " with data", arr);
                arr = $.isArray(arr) ? arr : [arr];
                matcherCb = matcherCb ? matcherCb : function(modelObj, outerObj) {return modelObj.id ? modelObj.id() == outerObj.id : false;};
                var toRemove = [];
                var toAdd = [];
                $.each(arr, function(idx, item) {toAdd.push(item);});
                $.each(storage, function(idx, oldItem) {
                  var matchingObj;
                  $.each(arr, function(idx, newItem) {
                    if (matcherCb(oldItem, newItem)) {
                      matchingObj = newItem;
                      return false;
                    }
                    return true;
                  });
                  var idxAdd = toAdd.indexOf(matchingObj);
                  removeMissing && !matchingObj && toRemove.push(oldItem);
                  matchingObj && idx >= 0 && toAdd.splice(idxAdd, 1);
                  matchingObj && oldItem.update(matchingObj);
                });
                removeMissing && $.each(toRemove, function(idx, item) {
                  obj.remove(item);
                });
                obj.addAll(toAdd);
              };
              assignOnOffHandlers(obj, eventName, fname);
            } else if (fname == "addAll" || fname == "add") {
              obj[fname] = function(arr) {
                debugData("Called " + fname + " on model " + name + " with data", arr);
                arr = $.isArray(arr) ? arr : [arr];
                var newArr = [];
                function fn(item) {
                  var newObj = {};
                  storage.push(newObj);
                  newArr.push(newObj);
                  bindFunctions(name, spec, newObj, appId);
                  $.each(item, function(name, param) {
                    newObj[name] && newObj[name](param);
//              newObj[fldPrefix + name] = param;
                  });
                }
                $.each(arr, function(idx, item) {
                  fn(item);
                });
                debugEvents("fire event: " + eventName);
                jiant.DEBUG_MODE.events && (! eventsUsed[eventName]) && (eventsUsed[eventName] = 1);
                obj._innerData.trigger(eventName, [newArr]);
                debugEvents("fire event: " + globalChangeEventName);
                jiant.DEBUG_MODE.events && (! eventsUsed[globalChangeEventName]) && (eventsUsed[globalChangeEventName] = 1);
                eventBus.trigger(globalChangeEventName, [newArr, fname]);
                $.each(arr, function(idx, item) {
                  newArr[idx].update && newArr[idx].update(item); // todo: replace by just trigger update event
                });
                return newArr;
              };
              assignOnOffHandlers(obj, eventName, fname);
            } else if (fname == "remove") {
              obj[fname] = function(elem) {
                var prevLen = storage.length;
                storage = $.grep(storage, function(value) {return value != elem;});
                if (storage.length != prevLen) {
                  debugEvents("fire event: " + eventName);
                  jiant.DEBUG_MODE.events && (! eventsUsed[eventName]) && (eventsUsed[eventName] = 1);
                  obj._innerData.trigger(eventName, [elem]);
                  debugEvents("fire event: " + globalChangeEventName);
                  jiant.DEBUG_MODE.events && (! eventsUsed[globalChangeEventName]) && (eventsUsed[globalChangeEventName] = 1);
                  eventBus.trigger(globalChangeEventName, [elem, fname]);
                }
                return elem;
              };
              assignOnOffHandlers(obj, eventName, fname);
            } else if (fname.indexOf("findBy") == 0 && fname.length > 6) {
              var arr = fname.substring(6).split("And");
              obj[fname] = function() {
                var retVal = storage,
                    outerArgs = arguments;
                function filter(arr, fieldName, val) {
                  return $.grep(arr, function(item) {return val == undefined || item[fieldName]() == val});
                }
                $.each(arr, function(idx, name) {
                  var fieldName = name.substring(0, 1).toLowerCase() + name.substring(1);
                  retVal = filter(retVal, fieldName, outerArgs[idx]);
                });
                return retVal[0];
              }
            } else if (fname.indexOf("listBy") == 0 && fname.length > 6) {
              var arr = fname.substring(6).split("And");
              obj[fname] = function() {
                var retVal = storage,
                    outerArgs = arguments;
                function filter(arr, fieldName, val) {
                  return $.grep(arr, function(item) {return val == undefined || item[fieldName]() == val});
                }
                $.each(arr, function(idx, name) {
                  var fieldName = name.substring(0, 1).toLowerCase() + name.substring(1);
                  retVal = filter(retVal, fieldName, outerArgs[idx]);
                });
                return retVal;
              }
            } else if (fname.indexOf("set") == 0 && fname.length > 3) {
              var arr = fname.substring(3).split("And");
              obj[fname] = function() {
                var outerArgs = arguments,
                    newVals = {};
                $.each(arr, function(idx, name) {
                  var fieldName = name.substring(0, 1).toLowerCase() + name.substring(1);
                  newVals[fieldName] = outerArgs[idx];
                });
                obj.update(newVals);
                return newVals;
              }
            } else if (fname == "asMap") {
              obj[fname] = function () {
                var result = {};
                $.each(obj, function (key, val) {
                  if (key.indexOf(fldPrefix) == 0) {
                    result[key.substr(fldPrefix.length)] = val;
                  }
                });
                return result;
              }
            } else if (isEmptyFunction(funcSpec) || spec._innerData[fname]) {
              spec._innerData[fname] = true;
              obj[fname] = function(val, forceEvent, dontFireUpdate) {
                var fieldName = fldPrefix + fname;
                if (arguments.length == 0) {
                  return obj[fieldName];
                } else {
                  if (forceEvent || (obj[fieldName] !== val && forceEvent !== false)) {
                    var oldVal = obj[fieldName];
                    obj[fieldName] = val;
                    debugEvents("fire event: " + eventName);
                    jiant.DEBUG_MODE.events && (! eventsUsed[eventName]) && (eventsUsed[eventName] = 1);
                    obj._innerData.trigger(eventName, [obj, val, oldVal]);
                    obj != spec && spec._innerData.trigger(eventName, [obj, val, oldVal]);
//              jiant.logInfo(fieldName, obj[fieldName], val, obj != spec);
                    if (! dontFireUpdate) {
                      debugEvents("fire event: " + globalChangeEventName);
                      jiant.DEBUG_MODE.events && (! eventsUsed[globalChangeEventName]) && (eventsUsed[globalChangeEventName] = 1);
                      eventBus.trigger(globalChangeEventName, [obj, fname, val, oldVal]);
                    }
                  } else {
                    obj[fieldName] = val;
                  }
                  return obj[fieldName];
                }
              };
              assignOnOffHandlers(obj, eventName, fname);
            }
          });
        }

        function isEmptyFunction(funcSpec) {
          return ("" + funcSpec).indexOf("{}") == ("" + funcSpec).length - 2
        }

        function _bindModels(models, appId) {
          $.each(models, function(name, spec) {
            jiant.logInfo("implementing model " + name);
            bindFunctions(name, spec, spec, appId);
          });
        }

// ------------ logic staff ----------------

        function _bindLogic(logics, appId) {
          $.each(logics, function(name, spec) {
            jiant.logInfo("binding logic " + name);
            if ($.isFunction(spec)) {
              if (isEmptyFunction(spec)) {
                jiant.logError("don't declare empty logic functions, use objects for namespace grouping");
              }
            } else {
              $.each(spec, function(fname, fnbody) {
                isEmptyFunction(fnbody) && (spec[fname] = function() {
                  jiant.logError("Logic function app.logics." + name + "." + fname + " called before implemented!");
                });
              });
              spec.implement = function(obj) {
                jiant.logInfo("implementation assigned to " + name);
                $.each(spec, function(fname, fnbody) {
                  if (fname != "implement") {
                    if (! obj[fname]) {
                      jiant.logError("Logic function " + fname + " is not implemented by declared implementation");
                    } else {
                      spec[fname] = obj[fname];
                    }
                  }
                });
                awakeAwaitingDepends(appId, name);
                (! loadedLogics[appId]) && (loadedLogics[appId] = {});
                loadedLogics[appId][name] = 1;
              };
            }
          });
        }

        function awakeAwaitingDepends(appId, name) {
          var awaiters = awaitingDepends[appId][name];
          delete awaitingDepends[appId][name];
          awaiters && $.each(awaiters, function(idx, cb) {
            eventBus.trigger(dependencyResolvedEventName(appId, name));
//            handleBound(appId, cb);
          });
        }

// ------------ events staff ----------------

        function _bindEvents(events, appId) {
          $.each(events, function(name, spec) {
            logInfo("binding event: " + name);
            events[name].listenersCount = 0;
            events[name].fire = function() {
              debugEvents("fire event: " + name);
              jiant.DEBUG_MODE.events && (! eventsUsed[name]) && (eventsUsed[name] = 1);
              eventBus.trigger(appId + name + ".event", arguments);
            };
            events[name].on = function (cb) {
              var trace;
              if (jiant.DEBUG_MODE.events) {
                debug("assigning event handler to: " + name);
                eventsUsed[name] && debug(" !!! Event handler assigned after fire occured, possible error, for event " + name);
                trace = getStackTrace();
              }
              events[name].listenersCount++;
              eventBus.on(appId + name + ".event", function () {
                debugEvents("called event handler: " + name + ", registered at " + trace);
                var args = $.makeArray(arguments);
                args.splice(0, 1);
                cb && cb.apply(cb, args);
              });
            };
          });
        }

// ------------ states staff ----------------

        function _bindStates(states, stateExternalBase, appId) {
          if (! $(window).hashchange) {
            var err = "No hashchange plugin and states configured. Don't use states or add hashchange plugin (supplied with jiant)";
            jiant.logError(err);
            if (jiant.DEV_MODE) {
              alert(err);
            }
            return;
          }
          $.each(states, function(name, stateSpec) {
            logInfo("binding state: " + appId + name);
            stateSpec.go = go(name, stateSpec.root, stateExternalBase, appId);
            stateSpec.start = function(cb) {
              var trace;
              if (jiant.DEBUG_MODE.states) {
                debug("register state start handler: " + appId + name);
                statesUsed[appId + name] && debug(" !!! State start handler registered after state triggered, possible error, for state " + appId + name);
                trace = getStackTrace();
              }
              eventBus.on(appId + "state_" + name + "_start", function() {
                debugStates("called state start handler: " + appId + name + ", registered at " + trace);
                var args = $.makeArray(arguments);
                args.splice(0, 1);
                cb && cb.apply(cb, args);
              });
              var current = parseState(appId);
              if (uiBoundRoot[appId] && ((name == "" && current.now.length == 0) || (current.now[0] == name))) {
                var params = current.now;
                params.splice(0, 1);
                cb && cb.apply(cb, params);
              }
            };
            stateSpec.end = function(cb) {
              var trace;
              if (jiant.DEBUG_MODE.states) {
                debug("register state end handler: " + appId + name);
                statesUsed[appId + name] && debug(" !!! State end handler registered after state triggered, possible error, for state " + name);
                trace = getStackTrace();
              }
              eventBus.on(appId + "state_" + name + "_end", function() {
                debugStates("called state end handler: " + appId + name + ", registered at " + trace);
                var args = $.makeArray(arguments);
                args.splice(0, 1);
                cb && cb.apply(cb, args);
              });
            };
          });
          $(window).hashchange(function (event, enforce) {
            var state = location.hash.substring(1),
                parsed = parseState(appId),
                stateId = parsed.now[0],
                params = parsed.now,
                smthChanged = enforce || (lastEncodedStates[appId] != getAppState(appId));
            if (! smthChanged) {
              return;
            }
            params.splice(0, 1);
            $.each(params, function(idx, p) {
              if (p == "undefined") {
                params[idx] = undefined;
              }
            });
            if (lastStates[appId] != undefined && lastStates[appId] != stateId) {
              debugStates("trigger state end: " + appId + (lastStates[appId] ? lastStates[appId] : ""));
              eventBus.trigger(appId + "state_" + lastStates[appId] + "_end");
            }
            lastStates[appId] = stateId;
            lastEncodedStates[appId] = getAppState(appId);
            stateId = (stateId ? stateId : "");
            debugStates("trigger state start: " + appId + stateId);
            jiant.DEBUG_MODE.states && (! statesUsed[appId + stateId]) && (statesUsed[appId + stateId] = 1);
//            jiant.logInfo(lastEncodedStates[appId] + " params are ", params);
            eventBus.trigger(appId + "state_" + stateId + "_start", params);
          });
          lastStates[appId] = parseState(appId).now[0];
//          lastEncodedStates[appId] = getAppState(appId);
        }

        function go(stateId, root, stateExternalBase, appId) {
          return function() {
            var parsed = parseState(appId),
                prevState = parsed.now;
            parsed.now = [stateId];
            debugData("Going to state " + stateId + " with data", arguments);
            $.each(arguments, function(idx, arg) {
              if (arg != undefined) {
                parsed.now.push(pack(arg));
              } else if (prevState[0] == stateId && prevState[idx + 1] != undefined) {
                parsed.now.push(pack(prevState[idx + 1]));
              } else {
                parsed.now.push(pack(arg));
              }
            });
            if (prevState) {
              var argLen = arguments.length;
              while (argLen < prevState.length - 1) {
                parsed.now.push(pack(prevState[++argLen]));
              }
            }
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
            setState(parsed, stateExternalBase, appId);
          };
        }

        function goRoot(appId) {
          function _go(appId) {
            var parsed = parseState(appId);
            parsed.now = [];
            $.each(parsed.root, function(idx, param) {
              parsed.now.push(pack(param));
              parsed.root[idx] = pack(param);
            });
            setState(parsed, undefined, appId); // external base not used
          }
          appId && _go(appId);
          !appId && $.each(getStates(), function(appId, state) {
            _go(appId);
          });
        }

        function setState(parsed, stateExternalBase, appId) {
          var states = getStates(),
              result = "";
          var s = parsed.now + "|" + parsed.root;
          $.each(states, function(stateAppId, state) {
            if (appId == stateAppId) {
              result += (stateAppId + "=" + s + "=");
            } else {
              result += (stateAppId + "=" + state + "=");
            }
          });
          if (! states[appId]) {
            result += (appId + "=" + s + "=");
          }
          var extBase = (stateExternalBase || stateExternalBase == "") ? stateExternalBase : jiant.STATE_EXTERNAL_BASE;
//          jiant.logInfo("setting state: " + result);
          window.location.assign((extBase ? extBase : "") + "#" + result);
          $(window).hashchange();
        }

        function getStates() {
          var state = location.hash.substring(1),
              data = state.split("="),
              retVal = {};
//          jiant.logInfo("parsing state: " + state);
          $.each(data, function(idx, elem) {
            (idx % 2 == 0) && elem && data[idx + 1] != undefined && (retVal[elem] = data[idx + 1]);
//            (idx % 2 == 0) && elem && data[idx + 1] != undefined && jiant.logInfo("state parsed: " + elem + " === " + data[idx+1]);
          });
          return retVal;
        }

        function getAppState(appId) {
          if (appId) {
            var s = getStates()[appId];
            return s == undefined ? "" : s;
          } else {
            var retVal = "";
            $.each(getStates(), function(key, val) {
              retVal = val;
              return false;
            });
            return retVal;
          }
        }

        function parseState(appId) {
          var state = getAppState(appId),
              arr = state.split("|"),
              parsed = {now: [], root: []};
          $.each(arr, function(idx, item) {
            var args = item.split(",");
            $.each(args, function(idxInner, arg) {
              parsed[idx == 0 ? "now" : "root"].push(unpack(arg));
            });
          });
          parsed.now = parsed.now || [];
          parsed.root = parsed.root || [];
          return parsed;
        }

        var replacementMap = {
              ";" : ";;",
              "," : ";1",
              "=" : ";2",
              "|" : ";3",
              "{" : ";4",
              "}" : ";5",
              ":" : ";6",
              "#" : ";7",
              "'" : ";7"
            }, reverseMap = {},
            replacementRegex = /;|,|=|\||\{|\}|:|#/gi,
            reverseRegex = /;;|;1|;2|;3|;4|;5|;6|;7/gi;
        $.each(replacementMap, function(key, val) {
          reverseMap[val] = key;
        });

        function pack(s) {
          if ($.isPlainObject(s)) {
            var retVal = "{";
            $.each(s, function(key, val) {
              retVal += pack(key);
              retVal += ":";
              retVal += pack(val);
              retVal += "}";
            });
            retVal = retVal[retVal.length - 1] == "}" ? retVal.substring(0, retVal.length - 1) : retVal;
            return pack(retVal);
          } else {
            s = s + "";
            return s ? s.replace(replacementRegex, function(matched) {return replacementMap[matched];}) : "";
          }
        }

        function unpack(s) {
          s = s ? s.replace(reverseRegex, function(matched) {return reverseMap[matched];}) : "";
          if (s && s[0] == "{") {
            var retVal = {};
            var arr = s.substring(1, s.length).split("}");
            $.each(arr, function(idx, item) {
              var sub = item.split(":");
              (sub.length == 2) && (retVal[unpack(sub[0])] = unpack(sub[1]));
            });
            return retVal;
          } else {
            return s;
          }
        }

        function getCurrentState(appId) {
          var parsed = parseState(appId);
          return parsed.now[0] ? parsed.now[0] : "";
        }

        function refreshState() {
          $(window).hashchange && $(window).trigger("hashchange", true);
        }

// ------------ ajax staff ----------------

        function getParamNames(func) {
          var funStr = func.toString();
          return funStr.slice(funStr.indexOf('(')+1, funStr.indexOf(')')).match(/([^\s,]+)/g);
        }

        function _bindAjax(root, ajaxPrefix, ajaxSuffix, crossDomain) {
          $.each(root, function(uri, funcSpec) {
            logInfo("binding ajax for function: " + uri);
            var params = getParamNames(funcSpec);
            params && params.length > 0 ? params.splice(params.length - 1, 1) : params = [];
            root[uri] = makeAjaxPerformer(ajaxPrefix, ajaxSuffix, uri, params, $.isFunction(root[uri]) ? root[uri]() : undefined, crossDomain);
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

        function makeAjaxPerformer(ajaxPrefix, ajaxSuffix, uri, params, hardUrl, crossDomain) {
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
            var pfx = (ajaxPrefix || ajaxPrefix == "") ? ajaxPrefix : jiant.AJAX_PREFIX;
            var sfx = (ajaxSuffix || ajaxSuffix == "") ? ajaxSuffix : jiant.AJAX_SUFFIX;
            var url = hardUrl ? hardUrl : pfx + uri + sfx;
            logInfo("    AJAX call. " + uri + " to server url: " + url);
            var settings = {data: callData, traditional: true, success: function(data) {
              if (callback) {
                try {
                  data = $.parseJSON(data);
                } catch (ex) {
                }
                jiant.DEBUG_MODE.ajax && debug("   ---   Ajax call results for uri " + uri) && debug(data);
                callback(data);
              }
            }, error: function (jqXHR, textStatus, errorText) {
              if (errHandler) {
                errHandler(jqXHR.responseText);
              } else {
                jiant.handleErrorFn(jqXHR.responseText);
              }
            }};
            if (crossDomain) {
              settings.contentType = "application/json";
              settings.dataType = 'jsonp';
              settings.xhrFields = {withCredentials: true};
              settings.crossDomain = true;
            }
            $.ajax(url, settings);
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
          if ((window.location + "").toLowerCase().indexOf("jiant.debug_data") >= 0) {
            jiant.DEBUG_MODE.data = 1;
          }
        }

        function maybeShort(root, full, shorten) {
          if (root[full]) {
            return true;
          }
          if (root[shorten]) {
            root[full] = root[shorten];
            return true;
          }
          root[full] = {};
          return false;
        }

        function _bindUi(prefix, root, devMode, appUiFactory) {
          jiant.DEV_MODE = devMode;
          ! devMode && maybeSetDevModeFromQueryString();
          maybeSetDebugModeFromQueryString();
          errString = "";
          bindingsResult = true;
          var appId = (root.id ? root.id : "no_app_id");
          if (! root.id) {
            jiant.logError("!!! Application id not specified. Not recommended since 0.20. Use 'id' property of application root to specify application id");
          } else {
            jiant.logInfo("Loading application, id: " + root.id);
          }
          if (uiBoundRoot[appId]) {
            jiant.logError("Application '" + appId + "' already loaded, skipping multiple bind call");
            return;
          }
          maybeShort(root, "views", "v") && _bindViews(prefix, root.views, root, appUiFactory);
          maybeShort(root, "templates", "t") && _bindTemplates(prefix, root.templates, root, appUiFactory);
          maybeShort(root, "ajax", "a") && _bindAjax(root.ajax, root.ajaxPrefix, root.ajaxSuffix, root.crossDomain);
          maybeShort(root, "events", "e") && _bindEvents(root.events, appId);
          maybeShort(root, "states", "s") && _bindStates(root.states, root.stateExternalBase, appId);
          maybeShort(root, "models", "m") && _bindModels(root.models, appId);
          maybeShort(root, "logic", "l") && _bindLogic(root.logic, appId);
          jiant.DEV_MODE && !bindingsResult && alert("Some elements not bound to HTML properly, check console" + errString);
          uiBoundRoot[appId] = root;
          jiant.logInfo(root);
          var appInitEvent = appId + "onAppInit" + appId;
          eventBus.trigger(appInitEvent);
          $.when.apply($, onInitAppActions).done(function() {eventBus.trigger(appBoundEventName(appId))});
        }

        function bindUi(prefix, root, devMode, viewsUrl, injectId) {
          var startedAt = new Date().getTime();
          if ($.isPlainObject(prefix)) { // no prefix syntax
            injectId = viewsUrl;
            viewsUrl = devMode;
            devMode = root;
            root = prefix;
            prefix = root.appPrefix;
          }
          var appUiFactory = root.uiFactory ? root.uiFactory : uiFactory;
          if (viewsUrl) {
            var injectionPoint = injectId ? $("#" + injectId) : $("body");
            injectionPoint.load(viewsUrl, {}, function() {
              _bindUi(prefix, root, devMode, appUiFactory);
            });
          } else {
            _bindUi(prefix, root, devMode, appUiFactory);
          }
          jiant.logInfo("UI bound in " + (new Date().getTime() - startedAt) + "ms");
          devMode && setTimeout(function() {
            awaitingDepends.length > 0 && logError("Attention!! Some depends are not resolved", awaitingDepends);
          }, 10000);
        }

        function bind(obj1, obj2) {
          $.extend(obj1, obj2);
        }

        // onUiBound(cb);
        // onUiBound(depList, cb); - INVALID, treated as onUiBound(appIdArr, cb);
        // onUiBound(appIdArr, cb);
        // onUiBound(appIdArr, depList, cb);
        // onUiBound(appId, cb);
        // onUiBound(appId, depList, cb)
        function onUiBound(appIdArr, dependenciesList, cb) {
          if (! cb && ! dependenciesList) {
            jiant.logError("!!! Registering anonymous logic without application id. Not recommended since 0.20");
            cb = appIdArr;
            appIdArr = ["no_app_id"];
          } else if (! cb) {
            cb = dependenciesList;
            dependenciesList = [];
          }
          if (! $.isArray(appIdArr)) {
            appIdArr = [appIdArr];
          }
          if (appIdArr.length > 1 && $.isArray(dependenciesList) && dependenciesList.length > 0) {
            $.each(dependenciesList, function(idx, arr) {
              if (!$.isArray(arr)) {
                jiant.logError("Used multiple applications onUiBound and supplied wrong dependency list, use multi-array, " +
                    "like [[app1DepList], [app2DepList]]");
              }
            })
          } else if (appIdArr.length == 1 && dependenciesList.length) {
            dependenciesList = [dependenciesList];
          }
          $.each(appIdArr, function(idx, appId) {
            if ($.isPlainObject(appId)) {
              appId = appId.id;
              appIdArr[idx] = appId;
            }
            (! awaitingDepends[appId]) && (awaitingDepends[appId] = {});
            (! loadedLogics[appId]) && (loadedLogics[appId] = {});
            dependenciesList[idx] && $.each(dependenciesList[idx], function(idx, depName) {
              (!awaitingDepends[appId][depName]) && (awaitingDepends[appId][depName] = []);
              (!loadedLogics[appId][depName]) && awaitingDepends[appId][depName].push(cb);
            });
          });
          handleBoundArr(appIdArr, cb);
        }

        function handleBoundArr(appIdArr, cb) {
          var allBound = true;
          $.each(appIdArr, function(idx, appId) {
            if (! uiBoundRoot[appId]) {
              eventBus.one(appBoundEventName(appId), function() {
                handleBoundArr(appIdArr, cb);
              });
              allBound = false;
              return false;
            }
          });
          if (allBound) {
            var allDependsResolved = true, params = [$];
            $.each(appIdArr, function(idx, appId) {
              $.each(awaitingDepends[appId], function(depName, cbArr) {
                allDependsResolved = allDependsResolved && ($.inArray(cb, cbArr) < 0);
                !allDependsResolved && eventBus.one(dependencyResolvedEventName(appId, depName), function() {
                  handleBoundArr(appIdArr, cb);
                });
                return allDependsResolved;
              });
              if (! allDependsResolved) {
                return false;
              }
              params.push(uiBoundRoot[appId]);
            });
            allDependsResolved && cb.apply(cb, params);
          }
        }

        function appBoundEventName(appId) {
          return appId + "jiant_uiBound_" + appId;
        }

        function dependencyResolvedEventName(appId, depName) {
          return appId + "jiant_dependency_resolved_" + depName;
        }

        function onAppInit(appId, cb) {
          var deferred = new $.Deferred();
          onInitAppActions.push(deferred.promise());
          var readyCb = function() {
            deferred.resolve();
          };
          if (uiBoundRoot[appId]) {
            jiant.logError("Defining and calling onUiBound() before onAppInit().");
          } else {
            var eventId = appId + "onAppInit" + appId;
            eventBus.on(eventId, function () {
              cb && cb($, uiBoundRoot[appId], readyCb);
            });
          }
        }

        function getAwaitingDepends() {
          return awaitingDepends;
        }

        function setUiFactory(factory) {
          var ok = true;
          $.each(["template", "viewComponent", "view"], function(idx, name) {
            if (! factory[name]) {
              jiant.logError("UI Factory doesn't implement method " + name + ", ignoring bad factory");
              ok = false;
            }
          });
          ok ? uiFactory = factory : 0;
        }

        function version() {
          return 90
        }

        return {
          AJAX_PREFIX: "",
          AJAX_SUFFIX: "",
          DEV_MODE: false,
          DEBUG_MODE: {
            states: 0,
            events: 0,
            ajax: 0,
            data: 0
          },
          PAGER_RADIUS: 6,
          isMSIE: eval("/*@cc_on!@*/!1"),
          STATE_EXTERNAL_BASE: undefined,
          getAwaitingDepends: getAwaitingDepends, // for application debug purposes

          bind: bind,
          bindUi: bindUi,
          goRoot: goRoot,
          goState: goState,
          onUiBound: onUiBound,
          onAppInit: onAppInit,
          refreshState: refreshState,
          getCurrentState: getCurrentState,
          setUiFactory: setUiFactory,

          handleErrorFn: defaultAjaxErrorsHandle,
          logInfo: logInfo,
          logError: logError,
          parseTemplate: function(text, data) {return $(parseTemplate(text, data));},
          parseTemplate2Text: parseTemplate2Text,
          version: version,

          formatDate: formatDate,
          formatDateUsa: formatDateUsa,
          formatTime: formatTime,
          formatTimeSeconds: formatTimeSeconds,
          randomIntBetween: randomIntBetween,
          lfill: lfill,

          collection: collection,
          container: container,
          containerPaged: containerPaged,
          ctl : ctl,
          fn: fn,
          form: form,
          grid: grid,
          image: image,
          input: input,
          inputDate: inputDate,
          inputInt: inputInt,
          inputFloat: inputFloat,
          label: label,
          meta: meta,
          lookup: lookup,
          on: on,
          pager: pager,
          slider: slider,
          stub: stub,
          tabs: tabs,

          key: {left: 37, up: 38, right: 39, down: 40, del: 46, backspace: 8, tab: 9, end: 35, home: 36, enter: 13, ctrl: 17,
            escape: 27, dot: 190, comma: 188,
            a: 65, c: 67, u: 85, w: 87, space: 32, 1: 49, 2: 50, 3: 51, 4: 52, 5: 53, 6: 54}

        };

      })(jQuery);

  if (! (window.jiant && window.jiant.version && window.jiant.version() >= tmpJiant.version())) {
    window.jiant = tmpJiant;
  }
})();
