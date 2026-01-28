jiant.module("jiant-logic", ["jiant-util"], function({$, app, jiant, params, "jiant-util": Util}) {

  this.singleton();

  const eventBus = $({}),
      loadedLogics = {},
      externalDeclarations = {},
      awaitingDepends = {};

  function override(spec, implFn) {
    if (spec._jAppId) {
      const superImpl = $.extend(true, {}, spec),
          newImpl = implFn($, jiant.getApps()[spec._jAppId], superImpl);
      jiant.each(newImpl, function(fname, fbody) {
        spec[fname] = fbody;
      });
    } else {
      spec._jOverrides = spec._jOverrides || [];
      spec._jOverrides.push(implFn);
    }
  }

  function copyLogic(appId, name) {
    // jiant.infop("!! into !!", name, appId);
    const obj = externalDeclarations[name],
        app = jiant.getApps()[appId];
    if (obj && appId in awaitingDepends && name in awaitingDepends[appId] && app) {
      app.logic = app.logic || {};
      app.logic[name] = app.logic[name] || {};
      jiant.each(typeof obj === "function" ? obj($, app) : obj, function(fname, fspec) {
        app.logic[name][fname] = fspec;
      });
      loadedLogics[appId][name] = 1;
    }
  }

  function checkForExternalAwaiters(appId, name) {
    if (externalDeclarations[name] && awaitingDepends[appId][name] && jiant.getApps()[appId]) {
      awakeAwaitingDepends(appId, name);
      loadedLogics[appId] && (loadedLogics[appId][name] = 1);
      logUnboundCount(appId);
    }
  }

  function declare(name, objOrUrlorFn) {
    const lib = typeof objOrUrlorFn === "string",
        startedAt = new Date().getTime();

    function handle() {
      const ms = new Date().getTime() - startedAt;
      lib && jiant.infop("Loaded external library !! in !! ms", objOrUrlorFn, ms);
      externalDeclarations[name] = lib ? {} : objOrUrlorFn;
      jiant.each(awaitingDepends, function(appId) {
        copyLogic(appId, name);
      });
      jiant.each(awaitingDepends, function(appId) {
        checkForExternalAwaiters(appId, name);
      });
    }

    lib && jiant.infop("Start loading external library !!", objOrUrlorFn);
    lib ? $.ajax({
      url: objOrUrlorFn,
      cache: true,
      crossDomain: true,
      timeout: 500,
      dataType: "text"
    }).done(function(data) {
      data += "\r\n//# sourceURL= " + objOrUrlorFn;
      $.globalEval(data);
    }).always(handle) : handle();
  }

  function implement(logic, impl) {
    logic.implement(impl);
  }

  function dependencyResolvedEventName(appId, depName) {
    return appId + "jiant_dependency_resolved_" + depName;
  }

  function getAwaitingDepends() {
    return awaitingDepends;
  }

  function awakeAwaitingDepends(appId, name) {
    if (! awaitingDepends[appId] || ! awaitingDepends[appId][name]) {
      return;
    }
    const awaiters = awaitingDepends[appId][name];
    delete awaitingDepends[appId][name];
    awaiters && jiant.each(awaiters, function(idx, cb) {
      eventBus.trigger(dependencyResolvedEventName(appId, name));
//            handleBound(appId, cb);
    });
  }

  function _bindLogic(appRoot, logics, appId) {
    jiant.each(logics, function(name, spec) {
      if (typeof spec === "function") {
        if (Util.isEmptyFunction(spec)) {
          jiant.logError("don't declare empty logic functions, use objects for namespace grouping");
        }
      } else {
        jiant.each(spec, function(fname, fnbody) {
          if (typeof fnbody === "function") {
            const params = jiant.getParamNames(fnbody);
            if (Util.isEmptyFunction(fnbody)) {
              spec[fname] = function() {
                jiant.logError("Logic function app.logics." + name + "." + fname + " called before implemented!");
              };
              spec[fname].empty = true;
            }
            spec[fname].params = params;
            spec[fname].spec = true;
          }
        });
        spec.implement = function(obj) {
          spec._jAppId = appId;
          jiant.each(spec, function(fname, fnbody) {
            if (typeof fnbody === "function" && !(fname in {"implement": 1, "_jAppId": 1, "_jOverrides": 1})) {
              if (! fname in obj) {
                jiant.logError("Logic function " + fname + " is not implemented by declared implementation");
              } else {
                spec[fname] = obj[fname];
              }
            }
          });
          spec._jOverrides && spec._jOverrides.length && jiant.each(spec._jOverrides, function(i, implFn) {
            const superImpl = $.extend(true, {}, spec),
                newImpl = implFn($, jiant.getApps()[spec._jAppId], superImpl);
            jiant.each(newImpl, function(fname, fbody) {
              spec[fname] = fbody;
            });
          });
          loadedLogics[appId] = loadedLogics[appId] || {};
          loadedLogics[appId][name] = 1;
          awakeAwaitingDepends(appId, name);
          logUnboundCount(appId);
        };
        if (name === "intl") {
          jiant.loadModule(appRoot, "jiant-intl", function() {
            jiant.loadIntl(spec, appRoot);
          });
        }
      }
    });
  }

  function logUnboundCount(appId) {
    let len = 0;
    awaitingDepends[appId] && jiant.each(awaitingDepends[appId], function() {len++});
  }

  function afterBind(appId) {
    loadedLogics[appId] || (loadedLogics[appId] = {});
    jiant.each(externalDeclarations, function(name, impl) {
      if (! (name in loadedLogics[appId])) {
        loadedLogics[appId][name] = externalDeclarations[name];
        copyLogic(appId, name);
        awakeAwaitingDepends(appId, name);
      }
    });
    jiant.DEV_MODE && setTimeout(function() {
      if (awaitingDepends[appId]) {
        jiant.each(awaitingDepends[appId], function(key, arr) {
          if (arr && arr.length) {
            jiant.errorp("Some logic depends for application " + appId + " are not implemented by your code, logic name: ", key);
            jiant.logError(awaitingDepends[appId]);
            return false;
          }
        })
      }
    }, 5000);
  }

  function beforeBind(appId, dep, cb) {
    awaitingDepends[appId] = awaitingDepends[appId] || {};
    loadedLogics[appId] = loadedLogics[appId] || {};
    dep && jiant.each(dep, function(idx, depName) {
      if (! (depName in awaitingDepends[appId])) {
        awaitingDepends[appId][depName] = [];
      }
      if ((!(depName in loadedLogics[appId])) && depName in externalDeclarations) {
        copyLogic(appId, depName);
        checkForExternalAwaiters(appId, depName);
      }
      if (! (depName in loadedLogics[appId])) {
        awaitingDepends[appId][depName].push(cb);
      }
    });
  }

  function isDependResolved(appId, cbObj) {
    let allDependsResolved = true;
    awaitingDepends[appId] && jiant.each(awaitingDepends[appId], function(depName, cbArr) {
      allDependsResolved = allDependsResolved && (cbArr.indexOf(cbObj.depCb) < 0);
      !allDependsResolved && eventBus.one(dependencyResolvedEventName(appId, depName), cbObj.callCb);
      return allDependsResolved;
    });
    return allDependsResolved;
  }

  function isLogicLoaded(appId, logicName) {
    return appId in loadedLogics && logicName in loadedLogics[appId];
  }

  jiant.getAwaitingDepends = getAwaitingDepends;
  jiant.declare = declare;
  jiant.override = override;
  jiant.implement = implement;

  return {
    apply: function(appRoot, tree) {
      _bindLogic(appRoot, tree.logic, appRoot.id);
    },
    beforeBind: beforeBind,
    isDependResolved: isDependResolved,
    afterBind: afterBind,
    isLogicLoaded: isLogicLoaded
  };

});
