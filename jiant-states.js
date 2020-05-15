jiant.module("jiant-states", function() {

  this.singleton();

  //todo: inner module with helper fns, via jiant. search
  //todo: replace map by app id by direct app due to module per app
  //todo: hashlistener autoload if missing
  //todo: $.isArray check, $.each
  //todo: var -> let/const
  //todo: final review/cleanup
  //todo: jiant.forget cleanup or move

  var lastStates = {},
      statesUsed = {},
      lastEncodedStates = {},
      replacementRegex = /[;,=|{}:#]/gi,
      reverseRegex = /;;|;1|;2|;3|;4|;5|;6|;7/gi,
      replacementMap = {
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
      eventBus = $({});
  $.each(replacementMap, function(key, val) {
    reverseMap[val] = key;
  });

  function getCurrentState(appId) {
    if ($.isPlainObject(appId)) {
      appId = appId.id;
    }
    var parsed = parseState(appId);
    return parsed.now[0] ? parsed.now[0] : "";
  }

  function refreshState(appId) {
    $(window).hashchange && $(window).trigger("hashchange", [true, jiant.extractApplicationId(appId)]);
  }

  function makeHashListener(appRoot, appId) {
    return function (event, enforce, runtimeAppId) {
      if (runtimeAppId && runtimeAppId !== appId) {
        return;
      }
      var state = location.hash.substring(1),
          parsed = parseState(appId),
          stateId = parsed.now[0],
          params = parsed.now,
          smthChanged = enforce || (lastEncodedStates[appId] !== getAppState(appId));
      if (!smthChanged) {
        return;
      }
      params.splice(0, 1);
      $.each(params, function (idx, p) {
        if (p === "undefined") {
          params[idx] = undefined;
        }
      });
      if (lastStates[appId] !== undefined && lastStates[appId] !== stateId) {
        // $.each(listeners, function(i, l) {l.stateEndTrigger && l.stateEndTrigger(appRoot, lastStates[appId])});
        eventBus.trigger(appId + "state_" + lastStates[appId] + "_end");
      }
      lastStates[appId] = stateId;
      lastEncodedStates[appId] = getAppState(appId);
      stateId = (stateId ? stateId : "");
      // $.each(listeners, function(i, l) {l.stateStartTrigger && l.stateStartTrigger(appRoot, stateId, params)});
      !statesUsed[appId + stateId] && (statesUsed[appId + stateId] = 1);
      //            jiant.logInfo(lastEncodedStates[appId] + " params are ", params);
      eventBus.trigger(appId + "state_" + stateId + "_start", params);
    }
  }

  function go(stateId, root, stateSpec, stateExternalBase, appId, assignMode, params) {
    var defaults = stateSpec.jDefaults;
    return function() {
      var parsed = parseState(appId),
          prevState = parsed.now;
      parsed.now = [stateId];
      $.each(arguments, function(idx, arg) {
        if (arg !== undefined) {
          parsed.now.push(pack(arg));
        } else if ((prevState[0] === stateId || isSameStatesGroup(appId, prevState[0], stateId)) && prevState[idx + 1] !== undefined) {
          parsed.now.push(pack(prevState[idx + 1]));
        } else if (idx < params.length && defaults && (params[idx] in defaults)) {
          parsed.now.push(defaults[params[idx]]);
        } else {
          parsed.now.push(pack(arg));
        }
      });
      if (prevState && (prevState[0] === stateId || isSameStatesGroup(appId, prevState[0], stateId))) {
        var argLen = arguments.length + 1;
        while (argLen < prevState.length) {
          // infop("!! vs !!, !! of !!", parsed.now[argLen], prevState[argLen], argLen, parsed.now.length);
          if (argLen < parsed.now.length) {
            if (parsed.now[argLen] === undefined) {
              parsed.now[argLen] = pack(prevState[argLen]);
            }
          } else {
            parsed.now.push(pack(prevState[argLen]));
          }
          argLen++;
        }
      }
      if (defaults) {
        for (var i = arguments.length; i < params.length; i++) {
          if ((params[i] in defaults && parsed.now[i] === undefined)) {
            if (i < parsed.now.length) {
              parsed.now[i] = defaults[params[i]];
            } else {
              parsed.now.push(defaults[params[i]]);
            }
          }
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
      setState(parsed, stateExternalBase, appId, assignMode);
    };
  }

  function isSameStatesGroup(appId, state0, state1) {
    var statesRoot = jiant.getApps()[appId].states;
    return (statesRoot[state0] && statesRoot[state1] && statesRoot[state0].statesGroup !== undefined
        && statesRoot[state0].statesGroup === statesRoot[state1].statesGroup);
  }

  function goRoot(appOrId) {
    function _go(appId) {
      var parsed = parseState(appId);
      parsed.now = [];
      $.each(parsed.root, function(idx, param) {
        parsed.now.push(pack(param));
        parsed.root[idx] = pack(param);
      });
      setState(parsed, undefined, appId, true); // external base not used
    }
    if (appOrId) {
      var appId = jiant.extractApplicationId(appOrId);
      _go(appId);
    } else {
      $.each(getStates(), function(appId, state) {
        _go(appId);
      });
    }
  }

  function setState(parsed, stateExternalBase, appId, assignMode) {
    var states = getStates(),
        result = "";
    var s = parsed.now + "|" + parsed.root;
    $.each(states, function(stateAppId, state) {
      if (appId === stateAppId) {
        result += (stateAppId + "=" + s + "=");
      } else {
        result += (stateAppId + "=" + state + "=");
      }
    });
    if (! states[appId]) {
      result += (appId + "=" + s + "=");
    }
    var extBase = (stateExternalBase || stateExternalBase === "") ? stateExternalBase : jiant.STATE_EXTERNAL_BASE;
    if (assignMode) {
      window.location.assign((extBase ? extBase : "") + "#" + result);
    } else {
      window.location.replace((extBase ? extBase : "") + "#" + result);
    }
    $(window).hashchange();
  }

  function getStates() {
    var state = location.hash.substring(1),
        data = state.split("="),
        retVal = {};
//          jiant.logInfo("parsing state: " + state);
    $.each(data, function(idx, elem) {
      (idx % 2 === 0) && elem && data[idx + 1] !== undefined && (retVal[elem] = data[idx + 1]);
//            (idx % 2 == 0) && elem && data[idx + 1] != undefined && jiant.logInfo("state parsed: " + elem + " === " + data[idx+1]);
    });
    return retVal;
  }

  function getAppState(appId) {
    if (appId) {
      var s = getStates()[appId];
      return s === undefined ? "" : s;
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
        parsed[idx === 0 ? "now" : "root"].push(unpack(arg));
      });
    });
    parsed.now = parsed.now || [];
    parsed.root = parsed.root || [];
    return parsed;
  }

  function pack(s) {
    if ($.isPlainObject(s)) {
      var retVal = "{";
      $.each(s, function(key, val) {
        retVal += pack(key);
        retVal += ":";
        retVal += pack(val);
        retVal += "}";
      });
      retVal = retVal[retVal.length - 1] === "}" ? retVal.substring(0, retVal.length - 1) : retVal;
      return pack(retVal);
    } else {
      s = s + "";
      return s ? s.replace(replacementRegex, function(matched) {return replacementMap[matched];}) : "";
    }
  }

  function unpack(s) {
    if (s.indexOf("%") >= 0 && navigator.userAgent.toLowerCase().indexOf('firefox') >= 0) {
      s = decodeURI(s);
    }
    s = s ? s.replace(reverseRegex, function(matched) {return reverseMap[matched];}) : "";
    if (s && s[0] === "{") {
      var retVal = {};
      var arr = s.substring(1, s.length).split("}");
      $.each(arr, function(idx, item) {
        var sub = item.split(":");
        (sub.length === 2) && (retVal[unpack(sub[0])] = unpack(sub[1]));
      });
      return retVal;
    } else {
      return s === "undefined" ? undefined : jiant.isNumberString(s) ? parseInt(s) : s;
    }
  }

  function _bindStates(appRoot, states, stateExternalBase, appId) {
    if (! Object.keys(states).length) {
      return;
    }
    if (! $(window).hashchange) {
      var err = "No hashchange plugin and states configured. Don't use states or add hashchange plugin (supplied with jiant)";
      jiant.logError(err);
      if (jiant.DEV_MODE) {
        alert(err);
      }
      return;
    }
    if (! states[""]) {
      states[""] = {};
    }
    $.each(states, function(name, stateSpec) {
      var params = stateSpec.go ? jiant.getParamNames(stateSpec.go) : [];
      stateSpec.go = go(name, stateSpec.root, stateSpec, stateExternalBase, appId, true, params);
      stateSpec.replace = go(name, stateSpec.root, stateSpec, stateExternalBase, appId, false, params);
      stateSpec.start = function(cb) {
        var trace;
        // $.each(listeners, function(i, l) {l.stateStartRegisterHandler && l.stateStartRegisterHandler(appRoot, name, stateSpec)});
        // statesUsed[appId + name] && $.each(listeners, function(i, l) {l.stateError && l.stateError(appRoot, name, stateSpec, "State start handler registered after state triggered")});
        trace = jiant.getStackTrace();
        eventBus.on(appId + "state_" + name + "_start", function() {
          var args = [...arguments];
          args.splice(0, 1);
          // $.each(listeners, function(i, l) {l.stateStartCallHandler && l.stateStartCallHandler(appRoot, name, stateSpec, trace, args)});
          cb && cb.apply(cb, args);
        });
        var current = parseState(appId);
        if (jiant.getApps()[appId] && ((name === "" && current.now.length === 0) || (current.now[0] === name))) {
          var params = current.now;
          params.splice(0, 1);
          cb && cb.apply(cb, params);
        }
      };
      stateSpec.end = function(cb) {
        var trace;
        // $.each(listeners, function(i, l) {l.stateEndRegisterHandler && l.stateEndRegisterHandler(appRoot, name, stateSpec)});
        // statesUsed[appId + name] && $.each(listeners, function(i, l) {l.stateError && l.stateError(appRoot, name, stateSpec, "State end handler registered after state triggered")});
        trace = jiant.getStackTrace();
        eventBus.on(appId + "state_" + name + "_end", function() {
          // $.each(listeners, function(i, l) {l.stateEndCallHandler && l.stateEndCallHandler(appRoot, name, stateSpec, trace)});
          var args = [...arguments];
          args.splice(0, 1);
          cb && cb.apply(cb, args);
        });
      };
      // $.each(listeners, function(i, l) {l.boundState && l.boundState(appRoot, states, name, stateSpec)});
    });
    $(window).hashchange(makeHashListener(appRoot, appId));
    lastStates[appId] = parseState(appId).now[0];
    lastEncodedStates[appId] = getAppState(appId);
  }

  jiant.refreshState = refreshState;
  jiant.getCurrentState = getCurrentState;
  jiant.packForState = pack;
  jiant.unpackForState = unpack;
  jiant.goRoot = goRoot;

  return {
    apply: function(appRoot) {
      _bindStates(appRoot, appRoot.states, appRoot.stateExternalBase, appRoot.id);
    }
  };

});