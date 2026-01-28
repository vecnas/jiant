jiant.module("jiant-states", function({jiant}) {

  this.singleton();

  //todo: inner module with helper fns, via jiant. search
  //todo: replace map by app id by direct app due to module per app
  //todo: final review/cleanup
  //todo: jiant.forget cleanup or move

  const lastStates = {},
      statesUsed = {},
      lastEncodedStates = {},
      hashListeners = {},
      replacementRegex = /[;,=|{}:#]/gi,
      reverseRegex = /;;|;1|;2|;3|;4|;5|;6|;7/gi,
      replacementMap = {
        ";": ";;",
        ",": ";1",
        "=": ";2",
        "|": ";3",
        "{": ";4",
        "}": ";5",
        ":": ";6",
        "#": ";7",
        "'": ";7"
      }, reverseMap = {},
      eventBus = $({});
  let hashListenerBound = false;
  jiant.each(replacementMap, function(key, val) {
    reverseMap[val] = key;
  });

  function getCurrentState(appId) {
    if ($.isPlainObject(appId)) {
      appId = appId.id;
    }
    const parsed = parseState(appId);
    return parsed.now[0] ? parsed.now[0] : "";
  }

  function refreshState(appId) {
    triggerHashChange(true, jiant.extractApplicationId(appId));
  }

  function makeHashListener(appId) {
    return function (event, enforce, runtimeAppId) {
      if (runtimeAppId && runtimeAppId !== appId) {
        return;
      }
      let state = location.hash.substring(1),
          parsed = parseState(appId),
          stateId = parsed.now[0],
          params = parsed.now,
          smthChanged = enforce || (lastEncodedStates[appId] !== getAppState(appId));
      if (!smthChanged) {
        return;
      }
      params.splice(0, 1);
      params.forEach(function (p, idx) {
        if (p === "undefined") {
          params[idx] = undefined;
        }
      });
      if (lastStates[appId] !== undefined && lastStates[appId] !== stateId) {
        eventBus.trigger(appId + "state_" + lastStates[appId] + "_end");
      }
      lastStates[appId] = stateId;
      lastEncodedStates[appId] = getAppState(appId);
      stateId = (stateId ? stateId : "");
      !statesUsed[appId + stateId] && (statesUsed[appId + stateId] = 1);
      //            jiant.logInfo(lastEncodedStates[appId] + " params are ", params);
      eventBus.trigger(appId + "state_" + stateId + "_start", params);
    }
  }

  function triggerHashChange(enforce, runtimeAppId) {
    jiant.each(hashListeners, function(appId, listener) {
      listener({}, enforce, runtimeAppId);
    });
  }

  function bindHashListener(appId) {
    hashListeners[appId] = makeHashListener(appId);
    if (!hashListenerBound) {
      if (!("onhashchange" in window)) {
        const err = "No hashchange support in browser and states configured. Don't use states or upgrade browser";
        jiant.logError(err);
        if (jiant.DEV_MODE) {
          alert(err);
        }
        return false;
      }
      window.addEventListener("hashchange", function() {
        triggerHashChange();
      });
      hashListenerBound = true;
    }
    return true;
  }

  function go(stateId, root, stateSpec, stateExternalBase, appId, assignMode, params) {
    const defaults = stateSpec.jDefaults;
    return function() {
      const parsed = parseState(appId),
          prevState = parsed.now;
      parsed.now = [stateId];
      [...arguments].forEach(function(arg, idx) {
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
        let argLen = arguments.length + 1;
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
        for (let i = arguments.length; i < params.length; i++) {
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
        parsed.now.forEach(function(param) {
          parsed.root.push(param);
        });
      } else {
        parsed.root.forEach(function(param, idx) {
          parsed.root[idx] = pack(param);
        });
      }
      setState(parsed, stateExternalBase, appId, assignMode);
    };
  }

  function isSameStatesGroup(appId, state0, state1) {
    const statesRoot = jiant.getApps()[appId].states;
    return (statesRoot[state0] && statesRoot[state1] && statesRoot[state0].statesGroup !== undefined
        && statesRoot[state0].statesGroup === statesRoot[state1].statesGroup);
  }

  function goRoot(appOrId) {
    function _go(appId) {
      const parsed = parseState(appId);
      parsed.now = [];
      parsed.root.forEach(function(param, idx) {
        parsed.now.push(pack(param));
        parsed.root[idx] = pack(param);
      });
      setState(parsed, undefined, appId, true); // external base not used
    }
    if (appOrId) {
      const appId = jiant.extractApplicationId(appOrId);
      _go(appId);
    } else {
      jiant.each(getStates(), function(appId, state) {
        _go(appId);
      });
    }
  }

  function setState(parsed, stateExternalBase, appId, assignMode) {
    let states = getStates(),
        result = "";
    const s = parsed.now + "|" + parsed.root;
    jiant.each(states, function(stateAppId, state) {
      if (appId === stateAppId) {
        result += (stateAppId + "=" + s + "=");
      } else {
        result += (stateAppId + "=" + state + "=");
      }
    });
    if (! states[appId]) {
      result += (appId + "=" + s + "=");
    }
    const extBase = (stateExternalBase || stateExternalBase === "") ? stateExternalBase : jiant.STATE_EXTERNAL_BASE;
    if (assignMode) {
      window.location.assign((extBase ? extBase : "") + "#" + result);
    } else {
      window.location.replace((extBase ? extBase : "") + "#" + result);
    }
    triggerHashChange();
  }

  function getStates() {
    const state = location.hash.substring(1),
        data = state.split("="),
        retVal = {};
    data.forEach(function(elem, idx) {
      (idx % 2 === 0) && elem && data[idx + 1] !== undefined && (retVal[elem] = data[idx + 1]);
    });
    return retVal;
  }

  function getAppState(appId) {
    if (appId) {
      const s = getStates()[appId];
      return s === undefined ? "" : s;
    } else {
      let retVal = "";
      jiant.each(getStates(), function(key, val) {
        retVal = val;
        return false;
      });
      return retVal;
    }
  }

  function parseState(appId) {
    const state = getAppState(appId),
        arr = state.split("|"),
        parsed = {now: [], root: []};
    arr.forEach(function(item, idx) {
      const args = item.split(",");
      args.forEach(function(arg, idxInner) {
        parsed[idx === 0 ? "now" : "root"].push(unpack(arg));
      });
    });
    parsed.now = parsed.now || [];
    parsed.root = parsed.root || [];
    return parsed;
  }

  function pack(s) {
    if ($.isPlainObject(s)) {
      let retVal = "{";
      jiant.each(s, function(key, val) {
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
      const retVal = {};
      const arr = s.substring(1, s.length).split("}");
      jiant.each(arr, function(idx, item) {
        const sub = item.split(":");
        (sub.length === 2) && (retVal[unpack(sub[0])] = unpack(sub[1]));
      });
      return retVal;
    } else {
      return s === "undefined" ? undefined : jiant.isNumberString(s) ? parseInt(s) : s;
    }
  }

  function _bindStates(app, states) {
    if (! Object.keys(states).length) {
      return;
    }
    if (!bindHashListener(app.id)) {
      return;
    }
    if (! states[""]) {
      states[""] = {};
    }
    jiant.each(states, function(name, stateSpec) {
      bindState(app, name, stateSpec);
    });
    lastStates[app.id] = parseState(app.id).now[0];
    lastEncodedStates[app.id] = getAppState(app.id);
  }

  function bindState(app, name, stateSpec) {
    const params = stateSpec.go ? jiant.getParamNames(stateSpec.go) : [];
    stateSpec.go = go(name, stateSpec.root, stateSpec, app.stateExternalBase, app.id, true, params);
    stateSpec.replace = go(name, stateSpec.root, stateSpec, app.stateExternalBase, app.id, false, params);
    stateSpec.start = function(cb) {
      let trace;
      trace = jiant.getStackTrace();
      eventBus.on(app.id + "state_" + name + "_start", function() {
        const args = [...arguments];
        args.splice(0, 1);
        cb && cb.apply(cb, args);
      });
      const current = parseState(app.id);
      if (jiant.getApps()[app.id] && ((name === "" && current.now.length === 0) || (current.now[0] === name))) {
        const params = current.now;
        params.splice(0, 1);
        cb && cb.apply(cb, params);
      }
    };
    stateSpec.end = function(cb) {
      let trace;
      trace = jiant.getStackTrace();
      eventBus.on(app.id + "state_" + name + "_end", function() {
        const args = [...arguments];
        args.splice(0, 1);
        cb && cb.apply(cb, args);
      });
    };
    return stateSpec;
  }

  jiant.bindState = bindState;

  jiant.refreshState = refreshState;
  jiant.getCurrentState = getCurrentState;
  jiant.packForState = pack;
  jiant.unpackForState = unpack;
  jiant.goRoot = goRoot;

  return {
    apply: function(appRoot, tree) {
      _bindStates(appRoot, tree.states);
    }
  };

});
