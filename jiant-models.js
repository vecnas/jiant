jiant.module("jiant-models", ["jiant-util"], function({app, jiant, params, "jiant-util": Util}) {

  this.singleton();

  //todo: inner module with helper fns, via jiant. search
  //todo: replace map by app id by direct app due to module per app
  //todo: move check fns to models-aware module
  //todo: final review/cleanup

  const objectBus = "jModelObjectBus",
      repoName = "jRepo";

  function createEventBus() {
    const listeners = {};
    return {
      on: function(eventName, handler) {
        listeners[eventName] = listeners[eventName] || [];
        listeners[eventName].push(handler);
      },
      off: function(eventName, handler) {
        const list = listeners[eventName];
        if (!list) {
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
      },
      trigger: function(eventName, args) {
        const list = listeners[eventName];
        if (!list || list.length === 0) {
          return;
        }
        const evt = {
          _stopped: false,
          stopImmediatePropagation: function() { this._stopped = true; }
        };
        const callArgs = [evt].concat(args || []);
        for (let i = 0; i < list.length; i++) {
          list[i].apply(null, callArgs);
          if (evt._stopped) {
            break;
          }
        }
      }
    };
  }

  function getRepo(spec) {
    return (spec[repoName] && jiant.isPlainObject(spec[repoName])) ? spec[repoName] : spec;
  }

  function bindModel(modelName, spec) {
    let storage = [],
        collectionFunctions = [],
        modelStorage = "jModelStorage",
        reverseIndexes = "jReverseIndexes",
        defaultsName = "jDefaults",
        indexesSpec = [],
        indexes = {},
        repoMode = spec[repoName] && jiant.isPlainObject(spec[repoName]),
        repoRoot = getRepo(spec),
        Model = function () {
          this[modelStorage] = {};
          this[objectBus] = createEventBus();
          this[reverseIndexes] = [];
        },
        Collection = function (data) {
          if (data) {
            const that = this;
            jiant.each(data, function (idx, obj) {
              that.push(obj)
            });
          }
        },
        specBus = createEventBus(),
        singleton = new Model(),
        objFunctions = ["on", "once", "off", "update", "reset", "remove", "asMap"],
        repoFunctions = ["updateAll", "add", "all", "remove", "filter", "toCollection"];
    Model.prototype.jModelName = modelName;
    if (jiant.DEV_MODE && !spec[repoName]) {
      jiant.infop("Model !! uses deprecated model repository format, switch to new, with model.jRepo = {} section", modelName);
    }
    spec[defaultsName] = spec[defaultsName] || {};
    jiant.each(repoFunctions, function(i, fn) {
      repoRoot[fn] = repoRoot[fn] || function(obj) {};
    });
    jiant.each(objFunctions, function(i, fn) {
      spec[fn] = spec[fn] || function(obj) {};
    });
    if (spec.id) {
      repoRoot.findById = repoRoot.findById || function(val) {};
    }
    jiant.each(repoRoot, function(fname, funcSpec) {
      if (isFindByFunction(fname, funcSpec)) {
        const listBy = "listBy" + fname.substring(6);
        if (! repoRoot[listBy]) {
          repoRoot[listBy] = funcSpec;
        }
        if (! repoRoot[listBy + "In"]) {
          repoRoot[listBy] = funcSpec;
          repoRoot[listBy + "In"] = funcSpec;
        }
      }
    });
    if (repoMode) {
      jiant.each(repoRoot, function(fname, funcSpec) {
        bindFn(repoRoot, fname, funcSpec);
      });
    }
    jiant.each(spec, function(fname, funcSpec) {
      bindFn(spec, fname, funcSpec);
    });
    spec.asap = proxy("asap");
    spec.nowAndOn = proxy("nowAndOn");
    spec.asapAndOn = proxy("asapAndOn");
    spec[objectBus] = specBus;

    //  ----------------------------------------------- remove -----------------------------------------------

    collectionFunctions.push("remove");
    Model.prototype.remove = function() {repoRoot.remove(this)};
    repoRoot.remove = function(obj) {
      const prevLen = storage.length;
      storage = jiant.grep(storage, function(value) {return value !== obj});
      removeIndexes(obj);
      if (storage.length !== prevLen) {
        obj[objectBus].trigger(evt("remove"), [obj]);
        obj[objectBus].trigger(evt(), [obj, "remove"]);
        specBus.trigger(evt("remove"), [obj]);
        specBus.trigger(evt(), [obj, "remove"]);
      }
      return obj;
    };
    repoRoot.remove[objectBus] = specBus;
    assignOnOffHandlers(repoRoot.remove, "remove");

    //  ----------------------------------------------- add -----------------------------------------------

    repoRoot.add = function(arr) {
      const newArr = new Collection();
      if (arr !== undefined && arr !== null) {
        arr = Array.isArray(arr) ? arr : [arr];
        if (arr.length !== 0) {
          jiant.each(arr, function(idx, item) {
            const newItem = jiant.extend({}, spec[defaultsName], item),
                newObj = new Model();
            storage.push(newObj);
            newArr.push(newObj);
            jiant.each(newItem, function(name, val) {
              if (spec[defaultsName][name]) {
                val = (typeof val === "function") ? val(newItem) : val;
              }
              if (isModelAccessor(newObj[name])) {
                val = isModelAccessor(val) ? val.apply(item) : val;
                newObj[modelStorage][name] = val;
              }
            });
            addIndexes(newObj);
            jiant.each(newItem, function(name, val) {
              if (isModelAccessor(newObj[name])) {
                newObj[name](newObj[name](), true, false, undefined);
              }
            });
          });
          jiant.each(newArr, function(idx, item) {
            item.on(function(model, action) {
              if (action === "remove") {
                removeIndexes(item);
              } else {
                updateIndexes(item);
              }
            }); // any change, due to findBy synthetic fields
          });
          trigger(specBus, "add", [newArr], [newArr]);
          if (specBus[evt("update")] || specBus[evt()]) {
            jiant.each(newArr, function(idx, item) {
              trigger(specBus, "update", [item], [item, "update"]);
            });
          }
        }
      }
      return newArr;
    };
    repoRoot.add[objectBus] = specBus;
    assignOnOffHandlers(repoRoot.add, "add");

    // ----------------------------------------------- indexes -----------------------------------------------

    function indexPresent(arr) {
      let present = false;
      jiant.each(indexesSpec, function(i, index) {
        if (index.length === arr.length) {
          let matching = true;
          jiant.each(index, function(j, elem) {
            matching = matching && elem === arr[j];
          });
          if (matching) {
            present = true;
            return false;
          }
        }
      });
      return present;
    }

    function addIndexes(obj) {
      const presentIdx = storage.indexOf(obj);
      if (presentIdx < 0) { // already removed object
        return;
      }
      jiant.each(indexesSpec, function(i, index) {
        let node = indexes;
        jiant.each(index, function(j, name) {
          const key = name + "=" + obj[name]();
          node[key] = node[key] || {};
          node = node[key];
        });
        node.content = node.content || [];
        node.content.push(obj);
        obj[reverseIndexes].push(node.content);
      });
    }

    function removeIndexes(obj) {
      jiant.each(obj[reverseIndexes], function(i, arr) {
        arr.splice(arr.indexOf(obj), 1);
      });
      obj[reverseIndexes] = [];
    }

    function updateIndexes(obj) {
      removeIndexes(obj);
      addIndexes(obj);
    }

    // ----------------------------------------------- all -----------------------------------------------

    repoRoot.all = function() {
      return new Collection(storage);
    };

    // ----------------------------------------------- toCollection ----------------------------------------

    repoRoot.toCollection = function(arr) {
      return new Collection(arr);
    };

    // ----------------------------------------------- updateAll -----------------------------------------------
    repoRoot.updateAll = function(arr, removeMissing, matcherCb) {
      arr = Array.isArray(arr) ? arr : (arr ? [arr] : []);
      matcherCb = matcherCb ? matcherCb : function(modelObj, outerObj) {return modelObj.id ? modelObj.id() === outerObj.id : false;};
      const toRemove = [];
      const toAdd = [];
      jiant.each(arr, function(idx, item) {toAdd.push(item);});
      jiant.each(storage, function(idx, oldItem) {
        let matchingObj;
        jiant.each(arr, function(idx, newItem) {
          if (matcherCb(oldItem, newItem)) {
            matchingObj = newItem;
            return false;
          }
          return true;
        });
        const idxAdd = toAdd.indexOf(matchingObj);
        removeMissing && !matchingObj && toRemove.push(oldItem);
        matchingObj && idx >= 0 && toAdd.splice(idxAdd, 1);
        matchingObj && oldItem.update(matchingObj);
      });
      removeMissing && jiant.each(toRemove, function(idx, item) {
        repoRoot.remove(item);
      });
      toAdd.length > 0 && repoRoot.add(toAdd);
    };

    jiant.each(spec[defaultsName], function(key, val) {
      val = typeof val === "function" ? val(spec) : val;
      if (isModelAccessor(spec[key])) {
        spec[key](val);
      }
    });

    Collection.prototype = [];
    Collection.prototype.jCollection = true;
    Collection.prototype.jModelName = modelName;
    Model.prototype.jModelName = modelName;
    attachCollectionFunctions(Collection.prototype, collectionFunctions);

    // ----------------------------------------------- bind other functions -----------------------------------------------

    function isFindByFunction(fname, funcSpec) {
      return fname.indexOf("findBy") === 0 && fname.length > 6 && isUpperCaseChar(fname, 6) && Util.isEmptyFunction(funcSpec);
    }

    function trigger(bus, fname, args, argsPerObj) {
      bus[evt(fname)] && bus.trigger(evt(fname), args);
      bus[evt()] && bus.trigger(evt(), argsPerObj);
    }

    function proxy(fname) {
      return function() {
        return singleton[fname].apply(singleton, arguments);
      }
    }

    function evt(fname) {
      fname = fname || "";
      return modelName + "_" + fname + "_event";
    }

    function assignExtraHandlers(obj) {
      obj.enqueue = function(field, val) {
        let hndlr, that = this;

        function maybeSet() {
          const current = that[field]();
          if (current === null || current === undefined) {
            hndlr && hndlr.off();
            that[field](val);
            return true;
          }
          return false;
        }
        if (!maybeSet()) {
          hndlr = this[field+"_on"](maybeSet);
        }
      };
      obj.nowAndOn = function(field, cb) {
        cb.apply(this, [this, this[field]()]);
        return this.on(field, cb);
      };
      obj.asapAndOn = function(field, cb) {
        const that = this;
        that.asap(field, function() {
          cb.apply(that, arguments);
          that.on(field, cb);
        });
      };
      obj.asap = function(field, cb) {
        const bus = this[objectBus],
            val = this[field]();
        if (val !== undefined) {
          cb && cb.apply(this, [this, val]);
        } else {
          const eventName = evt(field),
              that = this;
          bus[eventName] = (bus[eventName] || 0) + 1;
          bus.one(eventName, function () {
            bus[eventName]--;
            const args = [...arguments];
            args.splice(0, 1);
            cb && cb.apply(that, args);
          })
        }
      };
    }

    function assignOnOffHandlers(obj, overrideField) {
      obj.on = function(field, cb) {
        if (typeof field === "function") {
          cb = field;
          field = overrideField;
        }
        const that = this,
            bus = this[objectBus],
            eventName = evt(field);
        const handler = function (evt) {
          const args = [...arguments];
          args.splice(0, 1);
          const res = cb && cb.apply(cb, args);
          if (res === false) {
            evt.stopImmediatePropagation();
          }
        };
        bus.handlers = bus.handlers || {};
        bus.handlers[eventName] = bus.handlers[field] || [];
        bus.handlers[eventName].push(cb);
        bus[eventName] = (bus[eventName] || 0) + 1;
        bus.on(eventName, handler);
        handler.off = function() {
          that.off(handler);
        };
        handler.eventName = eventName;
        handler.cb = cb;
        return handler;
      };
      obj.once = function(field, cb) {
        if (typeof field === "function") {
          cb = field;
          field = overrideField;
        }
        const that = this,
            handler = that.on(field, function () {
              that.off(handler);
              cb && cb.apply(that, arguments);
            });
      };
      obj.off = function(handlerOrArr) {
        const bus = this[objectBus];
        handlerOrArr = Array.isArray(handlerOrArr) ? handlerOrArr : [handlerOrArr];
        jiant.each(handlerOrArr, function(i, handler) {
          bus[handler.eventName]--;
          bus.handlers[handler.eventName].splice(bus.handlers[handler.eventName].indexOf(handler.cb), 1);
          return bus.off(handler.eventName, handler);
        });
      };
      obj.subscribers = function(field) {
        const bus = this[objectBus],
            eventName = evt(field);
        return bus.handlers ? bus.handlers[eventName] : undefined;
      }
    }

    function bindFn(fnRoot, fname, funcSpec) {
      let arr;
      const objMode = repoMode && fnRoot !== spec[repoName];
      if (fname === defaultsName && jiant.isPlainObject(funcSpec)) {
      } else if (fname === repoName && jiant.isPlainObject(funcSpec)) {
      } else if (fname === "addAll") {
        alert("JIANT: Model function 'addAll' removed since 1.37, use previous versions or replace it by 'add'");
      } else if (!objMode && fname in {"updateAll": 1, "add": 1, "toCollection": 1, "all": 1}) {
      } else if (fname in {"off": 1, "nowAndOn": 1, "asapAndOn": 1, "asap": 1, "once": 1, "enqueue": 1}) {
        collectionFunctions.push(fname);
      } else if (fname === "on") {
        collectionFunctions.push(fname);
        spec[fname] = proxy(fname);
        assignOnOffHandlers(Model.prototype);
        assignExtraHandlers(Model.prototype);
        assignOnOffHandlers(spec);
      } else if (fname === "update") {
        collectionFunctions.push(fname);
        spec[fname] = proxy(fname);
        Model.prototype[fname] = function(objFrom, treatMissingAsUndefined) {
          let smthChanged = false,
              toTrigger = {},
              that = this;
          if (arguments.length === 0) {
            smthChanged = true;
          } else {
            treatMissingAsUndefined && jiant.each(this[modelStorage], function(key, val) {
              (key in objFrom) || (objFrom[key] = undefined);
            });
            jiant.each(objFrom, function(key, val) {
              if (isModelAccessor(that[key])) {
                val = (typeof val === "function") ? val() : val;
                const oldVal = that[key]();
                if (oldVal !== val) {
                  toTrigger[key] = oldVal;
                  that[key](val, false);
                  smthChanged = true;
                }
              }
            });
            jiant.each(toTrigger, function(key, oldVal) {
              that[key](that[key](), true, false, oldVal);
            });
          }
          if (smthChanged) {
            trigger(this[objectBus], fname, [this], [this, fname]);
            trigger(specBus, fname, [this], [this, fname]);
          }
        };
      } else if (fname === "remove") {
      } else if (fname.indexOf("sum") === 0 && fname.length > 3 && isUpperCaseChar(fname, 3) && !objMode) {
        arr = fname.substring(3).split("And");
        repoRoot[fname] = function() {
          function subsum(all, fieldName) {
            let ret;
            jiant.each(all, function(i, item) {
              if (item[fieldName] && (typeof item[fieldName] === "function")) {
                const val = item[fieldName]();
                ret = ret === undefined ? val : val === undefined ? undefined : (ret + val);
              }
            });
            return ret;
          }

          let ret;
          jiant.each(arr, function(idx, name) {
            const fieldName = name.substring(0, 1).toLowerCase() + name.substring(1);
            const perField = subsum(storage, fieldName);
            ret = ret === undefined ? perField : perField === undefined ? undefined : (ret + perField);
          });
          return ret;
        }
      } else if (fname === "filter" && !objMode) {
        repoRoot[fname] = function(cb) {
          const ret = [];
          jiant.each(repoRoot.all(), function(i, obj) {
            if (cb(obj)) {
              ret.push(obj);
            }
          });
          return new Collection(ret);
        };
      } else if (isFindByFunction(fname, funcSpec) && !objMode) {
        repoRoot[fname] = function() {
          return repoRoot["listBy" + fname.substring(6)].apply(repoRoot, arguments)[0];
        }
      } else if (fname.indexOf("listBy") === 0 && fname.length > 6 && isUpperCaseChar(fname, 6) && !objMode && Util.isEmptyFunction(funcSpec)) {
        const arrNames = fname.substring(6).split("And");
        const inMap = {};
        let usesIns = false;
        jiant.each(arrNames, function(idx, name) {
          if (name.endsWith("In") && !spec[lowerFirst(name)]) {
            name = name.substring(0, name.length - 2);
            inMap[lowerFirst(name)] = true;
            usesIns = true;
          }
          arrNames[idx] = lowerFirst(name);
          if (!spec[arrNames[idx]]) {
            jiant.errorp("Non existing field used by model method !!, field name: !!, model name: !!", fname, arrNames[idx], modelName);
          }
        });
        if (!indexPresent(arrNames)) {
          indexesSpec.push(arrNames);
        }
        repoRoot[fname] = function() {
          let node = indexes,
              args = arguments;
          if (! usesIns) {
            jiant.each(arrNames, function(i, name) {
              const key = name + "=" + args[i];
              node = node[key];
              if (node === undefined) {
                return false;
              }
            });
            return new Collection(node === undefined ? [] : node.content);
          } else {
            let nodes = [indexes];
            jiant.each(arrNames, function(i, name) {
              const newNodes = [];
              args[i] = (inMap[name] && Array.isArray(args[i])) ? args[i] : [args[i]];
              jiant.each(args[i], function(j, arg) {
                const key = name + "=" + arg;
                jiant.each(nodes, function(k, node) {
                  if (node[key] !== undefined) {
                    newNodes.push(node[key]);
                  }
                });
              });
              nodes = newNodes;
            });
            const ret = [];
            jiant.each(nodes, function(i, node) {
              jiant.each(node.content, function(j, item) {
                if (jiant.inArray(ret, item) < 0) {
                  ret.push(item);
                }
              });
            });
            return new Collection(ret);
          }
        }
      } else if (fname.indexOf("set") === 0 && fname.length > 3 && isUpperCaseChar(fname, 3)) {
        collectionFunctions.push(fname);
        spec[fname] = proxy(fname);
        arr = fname.substring(3).split("And");
        Model.prototype[fname] = function() {
          const outerArgs = arguments,
              newVals = {};
          jiant.each(arr, function(idx, name) {
            const fieldName = name.substring(0, 1).toLowerCase() + name.substring(1);
            newVals[fieldName] = outerArgs[idx];
          });
          this.update(newVals);
          return this;
        }
      } else if (fname === "reset") {
        collectionFunctions.push(fname);
        spec[fname] = proxy(fname);
        Model.prototype[fname] = function (val) {
          const that = this;
          jiant.each(this, function(name, fn) {
            isModelAccessor(fn) && that[name](val, true);
          });
        }
      } else if (fname === "asMap") {
        collectionFunctions.push(fname);
        spec[fname] = proxy(fname);
        Model.prototype[fname] = function (mapping, deep) {
          const ret = {},
              that = this;

          function val2map(ret, val, actualKey) {
            if (isModel(val)) {
              ret[actualKey] = val.asMap(null, deep);
            } else if (jiant.isPlainObject(val)) {
              ret[actualKey] = obj2map(val);
            } else {
              val !== undefined && (ret[actualKey] = val);
            }
          }
          function obj2map(obj) {
            const ret = {};
            jiant.each(obj, function(key, val) {
              val2map(ret, val, key);
            });
            return ret;
          }
          jiant.each(that, function(key) {
            const actualKey = (mapping && mapping[key]) ? mapping[key] : key,
                fn = that[actualKey];
            if (isModelAccessor(fn) || isModelSupplier(fn)) {
              const val = fn.apply(that);
              val2map(ret, val, actualKey, mapping);
            }
          });
          return ret;
        }
      } else if ((isModelAccessor(funcSpec) || Util.isEmptyFunction(funcSpec)) && ! isEventHandlerName(fname) && (objMode || !repoMode)) {
        const trans = funcSpec === jiant.transientFn;
        collectionFunctions.push(fname);
        collectionFunctions.push(fname + "_on");
        collectionFunctions.push(fname + "_once");
        collectionFunctions.push(fname + "_off");
        collectionFunctions.push(fname + "_asap");
        collectionFunctions.push(fname + "_nowAndOn");
        collectionFunctions.push(fname + "_asapAndOn");
        collectionFunctions.push(fname + "_enqueue");
        Model.prototype[fname] = function(val, forceEvent, dontFireUpdate, oldValOverride) {
          if (arguments.length !== 0) {
            if (forceEvent || (this[modelStorage][fname] !== val && forceEvent !== false)) {
              const oldVal = arguments.length === 4 ? oldValOverride : this[modelStorage][fname];
              this[modelStorage][fname] = val;
              if (! dontFireUpdate) {
                trigger(this[objectBus], fname, [this, val, oldVal], [this, fname, val, oldVal]);
                trigger(specBus, fname, [this, val, oldVal], [this, fname, val, oldVal]);
              }
            } else {
              this[modelStorage][fname] = val;
            }
          }
          return this[modelStorage][fname];
        };
        Model.prototype[fname].jiant_accessor = 1;
        Model.prototype[fname].transient_fn = trans;
        spec[fname] = proxy(fname);
        spec[fname].on = function(cb) {return spec.on(fname, cb)};
        spec[fname].once = function(cb) {return spec.once(fname, cb)};
        spec[fname].off = function(cb) {return spec.off(cb)};
        spec[fname].asap = function(cb) {return singleton.asap(fname, cb)};
        spec[fname].nowAndOn = function(cb) {return singleton.nowAndOn(fname, cb)};
        spec[fname].asapAndOn = function(cb) {return singleton.asapAndOn(fname, cb)};
        spec[fname].enqueue = function(cb) {return singleton.enqueue(fname, cb)};
        spec[fname + "_on"] = function(cb) {return spec.on(fname, cb)};
        spec[fname + "_once"] = function(cb) {return spec.once(fname, cb)};
        spec[fname + "_off"] = function(cb) {return spec.off(cb)};
        spec[fname + "_asap"] = function(cb) {return singleton.asap(fname, cb)};
        spec[fname + "_nowAndOn"] = function(cb) {return singleton.nowAndOn(fname, cb)};
        spec[fname + "_asapAndOn"] = function(cb) {return singleton.asapAndOn(fname, cb)};
        spec[fname + "_enqueue"] = function(cb) {return singleton.enqueue(fname, cb)};
        Model.prototype[fname + "_on"] = function(cb) {return this.on(fname, cb)};
        Model.prototype[fname + "_once"] = function(cb) {return this.once(fname, cb)};
        Model.prototype[fname + "_off"] = function(cb) {return this.off(cb)};
        Model.prototype[fname + "_asap"] = function(cb) {return this.asap(fname, cb)};
        Model.prototype[fname + "_nowAndOn"] = function(cb) {return this.nowAndOn(fname, cb)};
        Model.prototype[fname + "_asapAndOn"] = function(cb) {return this.asapAndOn(fname, cb)};
        Model.prototype[fname + "_enqueue"] = function(cb) {return this.enqueue(fname, cb)};
        spec[fname].jiant_accessor = 1;
        spec[fname].transient_fn = trans;
        //if (! objMode) {
        //  assignOnOffHandlers()
        //}
        //assignOnOffHandlers(); // spec[fname], specBus, fname
      } else if (isEventHandlerName(fname)) {
      } else if (fname !== modelStorage && fname !== objectBus && typeof funcSpec === "function" && (objMode || !repoMode)) {
        collectionFunctions.push(fname);
        spec[fname] = proxy(fname);
        Model.prototype[fname] = funcSpec;
        if (isSupplierFunction(funcSpec)) {
          Model.prototype[fname].jiant_supplier = 1;
          spec[fname].jiant_supplier = 1;
        }
      }
    }
    return spec;
  }

  function lowerFirst(s) {
    return s.substring(0, 1).toLowerCase() + s.substring(1);
  }

  function isEventHandlerName(fname) {
    function endsWith(fname, suffix) {
      return fname.length > suffix.length && fname.indexOf(suffix) === fname.length - suffix.length;
    }
    return endsWith(fname, "_on") || endsWith(fname, "_once") || endsWith(fname, "_off")
        || endsWith(fname, "_asap") || endsWith(fname, "_nowAndOn") || endsWith(fname, "_asapAndOn");
  }

  function attachCollectionFunctions(arr, collectionFunctions) {
    jiant.each(collectionFunctions, function(idx, fn) {
      arr[fn] = function() {
        const ret = [],
            args = arguments;
        jiant.each(this, function(idx, obj) {
          ret.push(obj[fn].apply(obj, args));
        });
        if (isEventHandlerName(fn)) {
          ret.off = function() {
            jiant.each(ret, function(i, item) {
              item.off();
            });
          }
        }
        return ret;
      }
    });
    return arr;
  }

  function isUpperCaseChar(s, pos) {
    const sub = s.substring(pos, pos + 1);
    return sub !== sub.toLowerCase();
  }

  function isTransient(fn) {
    return fn.transient_fn;
  }

  function isModelAccessor(fn) {
    return fn && fn.jiant_accessor && typeof fn === "function";
  }

  function isModelSupplier(fn) {
    return fn && fn.jiant_supplier && typeof fn === "function";
  }

  function isModel(obj) {
    return !!obj && !!obj[objectBus];
  }

  function isSupplierFunction(funcSpec) {
    const s = ("" + funcSpec).replace(/\s/g, '');
    return s.indexOf("function(){return") === 0;
  }

  function _bindModels(appRoot, models) {
    jiant.each(models, function(name, spec) {
      bindModel(name, spec);
    });
  }

  function dump(app) {
    for (const modelName in app.models) {
      console.info(`%c Model: ${modelName}`, "color:blue");
      console.info(app.models[modelName].jRepo.all().asMap());
    }
  }

  jiant.bindModel = bindModel;
  jiant.dump = dump;

  jiant.isModelSupplier = isModelSupplier;
  jiant.isModelAccessor = isModelAccessor;
  jiant.isModel = isModel;
  jiant.getRepo = getRepo;
  jiant.isTransient = isTransient;

  return {
    apply: function(appRoot, tree) {
      _bindModels(appRoot, tree.models);
    }
  };

});
