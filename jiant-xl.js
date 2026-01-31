/*
 0.33 based, added bindList
 0.42 based, minor fix in bindList
 0.44 based, nav, stateful views
 0.46 based, pagedContent
 xl.0.01 renderList(list, container, tm, perItemCb) added, perItemCb(item, elem)
 xl.0.02 propagate call added to pagedContent
 xl.0.03 noItems optional parameter added to pagedContent, renderList; version() added
 xl.0.04 onCompleteCb optional parameters added to pagedContent
 xl.0.05 confirmedActionBs(ctl, confirmDialogView, dialogOkCtl, actionFn) added
 xl.0.06 saveCtl(ctl, saveFn, markerElemOptional, markerTextOptional) added
 xl.0.07 confirmedActionBs accepts one more optional parameter - preCb - called just before showing confirmation
 xl.0.08 bindList(model, container, template, viewFieldSetterName) accepts both template or callback as 3rd parameter, usage: template(obj)
 xl.0.09 confirmedActionBs multiple targets bug fixed
 xl.0.10 statefulViews autohides bound views on initialization
 xl.0.11 pagedContent notification about wrong arguments
 xl.0.12 statefulApp accepts 3rd optional argument: defaultState to go from empty state
 xl.0.13 saveCtl fix: event object was added
 xl.0.14 sorting support added to pagedContent
 xl.0.15 empty container when renderList()
 xl.0.16 goProxy(state) param added to ctl2state for custom state.go() parameters support
 xl.0.17 remove hiding views for statefulViews
 xl.0.18 pager is optional for pagedContent
 xl.0.19 bindList tracks obj.remove() too
 xl.0.20 bindList - removed duplicated propagate, could be incompatible with old code (depends on usage)
 xl.0.21 renderList perItemCb accepts 3rd argument - index of element
 xl.0.22 pageableFilterableSortable(state, container, pager, template, ajax, filterModel, perItemCb, noItemsLabel, onCompleteCb) added
 xl.0.23 pageableFilterableSortableModel(model, ajax, state, pager, filterSortModel) added
 xl.0.24 double propagate call removed from some functions
 xl.0.25 pageableFilterableSortableModel some tuning of behaviour
 xl.0.26 pageableFilterableSortableModel removed unnecessary AI
 xl.0.27 pseudoSelect() component added
 xl.0.28 pseudoSelect: function(arrElems, arrVals, cb, selectedIdx, selectClass) - further development
 xl.0.28.1 pseudoSelect.selected(val) supported, without UI sync, only changes selected value
 xl.0.29 xOption(allSelector, filterFn) component added
 xl.0.30 bindList() fix - removal of UI element now works
 xl.0.31 minor cleanup in bindList - removed add.on handler due to add() removal in jiant 1.37
 xl.0.32 adoption to jiant 1.38 - all 'addAll' calls replaced by 'add'
 xl.0.33 bindList accepts one more parameter, sortFn(obj, obj2) - for sorting list presentation
 xl.0.34 renderList(..., subscribeForUpdates) - new param is subscribe for template updates, for better performance
 xl.0.35 bindList accepts one more param, subscribeForUpdates, to subscribe template for model data updates
 xl.0.36 latest Spring compatible pageable request, added "page" and "sort", still compatible with previous version
 xl.0.37 "page" passed as val-1, for PageableHandlerMethodArgumentResolver 0-based compatiblity
 xl.0.38 pseudoDropdown(ctl, dropPanel, dropContainer, optionTm) added for styled select behaviour emulation
 xl.0.39 minor updates
 xl.0.40 bindList, one more argument: reversePropagate - for reverse propagate binding
 xl.0.41 bindList, one more argument: dontAddToDom = to completely pass dom manipulations to customRenderer
 xl.0.42: bindList, dontAddToDom replaced by elemFactory({create: fn, remove: fn} - to produce and attach element, by default parses template and attaches to DOM
 xl.0.43: bindList, no-uifield scenario
 xl.0.44: pseudoSelect default callback show/hide toggler
 xl.0.45: pageableFilterableSortableModel proper reaction on model changes, when state used
 xl.0.46: bindList dynamic container
 xl.0.47: renderList one more param: appendMode - to not clear container
 xl.0.48: bindList one more arg, mapping - passed to parseTemplate
 xl.0.49: renderList one more arg, mapping - passed to parseTemplate
 xl.0.50: filterableData: function(model, ajax, filterModel, updateOnModel) added
 xl.0.51: jiant 2.12 model.repo compatible
 xl.0.52: jiant 2.14 models with custom repo field compatible
 xl.0.53: filterableData one more param, singletonMode
 xl.0.54: jiant 2.16 compatible
 xl.0.55: jiant 2.16.3 compatible
 xl.0.56: amd compatible, anonymous model declared in amd environment
 xl.0.57: bindList elem factory accepts templates
 xl.0.58: bindList.off unsubscribes from model updates, default app state uses state.replace
 xl.0.59: jiant.refs removed, j 2.41 compatible
 xl.0.60: pageableFilterableSortable one more parameter: mapping
 xl.0.60.1: .sortFn(fn) added to bindList ret val
 xl.0.61: proper sorting in bindList
 xl.0.62: viewByAjaxOnState(view, ajax, state) added
 xl.0.63: now jiant module: jiant-xl
 */

(function() {

  var confirmedActionBsSelectedFn;

  var dom, on, trigger, removeClass, addClass, toggleClass, getChecked, getData,
      setChecked, appendElem, insertBeforeElem, removeElem, setHtml, hideElem, showElem, setDisabled;

  function initDom() {
    if (dom) {
      return;
    }
    dom = jiant.dom || (jiant.util && jiant.util.dom);
    if (!dom) {
      return;
    }
    on = dom.on;
    trigger = dom.trigger;
    removeClass = dom.removeClass;
    addClass = dom.addClass;
    toggleClass = dom.toggleClass;
    getChecked = dom.getChecked;
    getData = dom.getData;
    setChecked = dom.setChecked;
    appendElem = dom.append;
    insertBeforeElem = dom.insertBefore;
    removeElem = dom.remove;
    setHtml = dom.html;
    hideElem = dom.hide;
    showElem = dom.show;
    setDisabled = dom.setDisabled;
  }

  var tmpJiantXl = {

    version: function() {
      return 63;
    },

    ctl2state: function(ctl, state, selectedCssClass, goProxy) {
      return function() {
        on(ctl, "click", function() {
          goProxy ? goProxy(state) : state.go();
        });
        selectedCssClass && state.start(function() {
          jiant.addClass(ctl, selectedCssClass);
        });
        selectedCssClass && state.end(function() {
          removeClass(ctl, selectedCssClass);
        });
      };
    },

    nav: function(app, view, suffix, selectedCssClass, goProxy) {
      return function() {
        suffix = suffix ? suffix : "";
        jiant.each(app.states, function(stateName, stateSpec) {
          var ctl = view[stateName + suffix];
          ctl && jiant.xl.ctl2state(ctl, stateSpec, selectedCssClass, goProxy)();
        });
      };
    },

    statefulViews: function(states, views) {
      return function() {
        function bind2state(state) {
          state.start(function() {
            if (Array.isArray(views)) {
              jiant.each(views, function(idx, view) {
                jiant.show(view);
              });
            } else {
              jiant.show(views);
            }
          });
          state.end(function() {
            if (Array.isArray(views)) {
              jiant.each(views, function(idx, view) {jiant.hide(view);});
            } else {
              jiant.hide(views);
            }
          });
        }
        if (Array.isArray(states)) {
          jiant.each(states, function(idx, state) {
            bind2state(state);
          })
        } else {
          bind2state(states);
        }
      };
    },

    statefulApp: function(app, viewNameSuffix, defaultState) {
      return function() {
        viewNameSuffix = viewNameSuffix ? viewNameSuffix : "";
        jiant.each(app.states, function(name, state) {
          var view = app.views[name + viewNameSuffix];
          view && jiant.xl.statefulViews(state, view)();
        });
        app.states[""] && defaultState && app.states[""].start(function() {defaultState.replace();});
      };
    },

    bindList: function(model, container, template, viewFieldSetterName, sortFn, subscribeForUpdates, reversePropagate, elemFactory, mapping) {
      var addHnd, remHnd, sorted = [];
      function renderObj(obj) {
        var tm = jiant.isFunction(template) ? template(obj) : template,
            cont = jiant.isFunction(container) ? container(obj) : container,
            appended = false,
            useTm = !!tm,
            view;
        if (elemFactory) {
          if (jiant.intro.isTemplate(elemFactory.create)) {
            tm = elemFactory.create;
            useTm = true;
          } else if (jiant.isFunction(elemFactory.create)) {
            view =  elemFactory.create(obj, subscribeForUpdates, reversePropagate);
            if (jiant.intro.isTemplate(view)) {
              tm = view;
              useTm = true;
            } else {
              useTm = false;
            }
          }
        }
        if (useTm) {
          view = tm.parseTemplate(obj, subscribeForUpdates, reversePropagate, mapping);
        }
        if (sortFn && jiant.isFunction(sortFn) && jiant.getRepo(model).all) {
          jiant.each(sorted, function(i, item) {
            var order = sortFn(obj, item);
            if (item[viewFieldSetterName] && item[viewFieldSetterName]() && order < 0) {
              useTm && insertBeforeElem(view, item[viewFieldSetterName]()[0]);
              sorted.splice(i, 0, obj);
              appended = true;
              return false;
            }
          });
        }
        if (!appended) {
          useTm && appendElem(cont, view);
          sorted.push(obj);
        }
        jiant.isFunction(obj[viewFieldSetterName]) && view && obj[viewFieldSetterName](view);
      }

      var m = jiant.getRepo(model),
          ret = function () {
            addHnd = m.add && m.add.on(function (arr) {
                  jiant.each(arr, function (idx, obj) {
                    renderObj(obj);
                  });
                });
            remHnd = m.remove && m.remove.on(function (obj) {
                  obj[viewFieldSetterName] && (elemFactory ? elemFactory.remove(obj[viewFieldSetterName]()) : removeElem(obj[viewFieldSetterName]()));
                  sorted = jiant.grep(sorted, function(elem, i) {return elem != obj});
                });
            jiant.each(jiant.getRepo(model).all(), function(i, obj) {
              renderObj(obj);
            });
          };
      ret.off = function () {
        addHnd && m.add.off(addHnd);
        remHnd && m.remove.off(remHnd);
        jiant.each(jiant.getRepo(model).all(), function (i, obj) {
          jiant.isFunction(obj[viewFieldSetterName]) && obj[viewFieldSetterName]() && jiant.isFunction(obj[viewFieldSetterName]().off) && obj[viewFieldSetterName]().off();
        });
      };
      ret.sortFn = function(fn) {
        sortFn = fn;
      };
      return ret;
    },

    filterableData: function(model, ajax, filterModel, updateOnModel, completeCb, singletonMode) {
      function refresh() {
        ajax(filterModel, function(data) {
          singletonMode ? model.update(data) : jiant.getRepo(model).updateAll(data, true);
          completeCb && completeCb(data);
        });
      }
      if (updateOnModel && filterModel && filterModel.on) {
        filterModel.on(refresh);
      }
      return refresh;
    },

    pageableFilterableSortableModel: function(model, ajax, state, pager, filterSortModel) {
      function refresh(pageNum) {
        var parsedNum = parseInt(pageNum);
        parsedNum = isNaN(parsedNum) ? 0 : parsedNum;
        var pageable = {"page.page": parsedNum, "page": parsedNum == 0 ? 0 : parsedNum - 1};
        filterSortModel && filterSortModel.sort && filterSortModel.sort()
        && (pageable["page.sort"] = filterSortModel.sort(), pageable["sort"] = filterSortModel.sort());
        ajax(filterSortModel, pageable, function(data) {
          jiant.getRepo(model).updateAll(data.content, true);
          pager && pager.updatePager(data);
        });
      }
      state && state.start(refresh);
      if (filterSortModel && filterSortModel.on) {
        filterSortModel.on(function() {
          state ? state.go(0) : refresh(0);
        });
      }
      pager && pager.onValueChange(function(event, pageNum) {
        state ? state.go(pageNum) : refresh(pageNum);
      });
      return function() {
        state || refresh();
      };
    },

    pageableFilterableSortable: function(state, container, pager, template, ajax, filterModel, perItemCb, noItemsLabel, onCompleteCb, mapping) {
      function refresh(pageNum) {
        var parsedNum = parseInt(pageNum);
        parsedNum = isNaN(parsedNum) ? 0 : parsedNum;
        var pageable = {"page.page": parsedNum, "page": parsedNum == 0 ? 0 : parsedNum - 1};
        filterModel && filterModel.sort && filterModel.sort()
        && (pageable["page.sort"] = filterModel.sort(), pageable["sort"] = filterModel.sort());
        ajax(filterModel, pageable, function(data) {
          jiant.empty(container);
          noItemsLabel && (data.content.length ? jiant.hide(noItemsLabel) : jiant.show(noItemsLabel));
          jiant.each(data.content, function(idx, item) {
            var row = template.parseTemplate(item, undefined, undefined, mapping);
            appendElem(container, row);
            perItemCb && perItemCb(item, row, idx);
          });
          pager && pager.updatePager(data);
          onCompleteCb && onCompleteCb(data);
        });
      }
      state && state.start(refresh);
      pager && pager.onValueChange(function(event, pageNum) {
        state ? state.go(pageNum, undefined) : refresh(pageNum);
      });
      return function() {
        state || refresh();
      };
    },

    pagedContent: function(state, ajax, container, pager, template, perItemCb, noItemsLabel, onCompleteCb, useSorting) {
      return function() {

        pager && pager.onValueChange(function(event, pageNum) {
          state.go(pageNum, undefined);
        });

        state.start(function(pageNum, sort) {
          pageNum = pageNum ? pageNum : 0;
          var parsedNum = parseInt(pageNum) + "";
          if (parsedNum != pageNum) {
            jiant.logError("pagedContent expects pageNum as first state parameter, passed: " + pageNum
                + ", recommended fix: make pageNum first argument, now replacing pageNum by 0");
            pageNum = 0;
          }
          var pageable = {"page.page": pageNum, "page": parsedNum == 0 ? 0 : parsedNum - 1};
          useSorting && sort && (pageable["page.sort"] = sort, pageable["sort"] = sort);
          ajax(pageable, function(data) {
            jiant.empty(container);
            noItemsLabel && (data.content.length ? jiant.hide(noItemsLabel) : jiant.show(noItemsLabel));
            jiant.each(data.content, function(idx, item) {
              var row = template.parseTemplate(item);
              appendElem(container, row);
              perItemCb && perItemCb(item, row);
            });
            pager && pager.updatePager(data);
            onCompleteCb && onCompleteCb(data);
          });
        });

      };
    },

    renderList: function(list, container, tm, perItemCb, noItemsLabel, subscribeForUpdates, appendMode, mapping) {
      return function() {
        noItemsLabel && (list.length ? jiant.hide(noItemsLabel) : jiant.show(noItemsLabel));
        !appendMode && jiant.empty(container);
        jiant.each(list, function(idx, item) {
          var elem = tm.parseTemplate(item, subscribeForUpdates, false, mapping);
          appendElem(container, elem);
          perItemCb && perItemCb(item, elem, idx);
        });
      }
    },

    confirmedActionBs: function(ctl, confirmDialogView, dialogOkCtl, actionFn, preCb) {
      return function() {
        on(ctl, "click", function() {
          preCb && preCb();
          confirmDialogView.modal("show");
          confirmedActionBsSelectedFn = actionFn;
        });
        !confirmDialogView.firstTimeConfirmation && on(dialogOkCtl, "click", function() {
          confirmDialogView.modal("hide");
          confirmedActionBsSelectedFn && confirmedActionBsSelectedFn();
        });
        !confirmDialogView.firstTimeConfirmation && confirmDialogView.on("hidden", function() {
          confirmedActionBsSelectedFn = null;
        });
        confirmDialogView.firstTimeConfirmation = true;
      }
    },

    saveCtl: function(ctl, saveFn, markerElem, markerText) {
      return function() {
        markerElem = markerElem ? markerElem : ctl;
        markerText = markerText ? markerText : "saving";
        on(ctl, "click", function(event) {
          var prevLabel = jiant.html(markerElem);
          setDisabled(ctl, true);
          jiant.html(markerElem, markerText);
          saveFn(function () {
            setDisabled(ctl, false);
            jiant.html(markerElem, prevLabel);
          }, event);
        });
      };
    },

    xOption: function(allSelector, filterFn) {
      function Impl(allSelector) {
        var options = [];
        function sync() {
          var arr = [], allUnchecked = true, allChecked = true;
          jiant.each(options, function(idx, elem) {
            if (getChecked(elem)) {
              arr.push(getData(elem, "val"));
              allUnchecked = false;
            } else {
              allChecked = false;
            }
          });
          setChecked(allSelector, allChecked);
          if (allChecked || allUnchecked) {
            removeClass(allSelector, "middle-check");
          } else {
            jiant.addClass(allSelector, "middle-check");
          }
          filterFn && filterFn(arr);
        }
        on(allSelector, "change", function() {
          jiant.each(options, function(idx, option) {
            var val = getChecked(allSelector);
            setChecked(option, val);
          });
          sync();
        });
        return {
          add: function(elem) {
            options.push(elem);
            on(elem, "change", sync);
          },
          sync: sync
        }
      }
      return new Impl(allSelector);
    },

    pseudoDropdown: function(ctl, label, dropPanel, dropContainer, optionTm) {
      var selectedVal;
      on(ctl, "click", function() {
        toggleClass(ctl, "pseudoDropped");
        toggleClass(dropPanel, "pseudoDropped");
      });
      function val(_val, title) {
        if (arguments.length == 0) {
          return selectedVal;
        } else {
          selectedVal = _val;
          label && setHtml(label, title);
          trigger(ctl, "change", selectedVal);
        }
      }
      return {
        add: function(_val, title, selected) {
          var elem = optionTm.parseTemplate(_val);
          if (Object.prototype.toString.call(_val) == "[object String]" && title) {
            setHtml(elem, title);
          }
          appendElem(dropContainer, elem);
          on(elem, "click", function() {
            val(_val, title);
          });
          selected && val(_val, title);
        },
        change: function(arg) {
          trigger(ctl, "change", arg);
        },
        empty: function() {
          jiant.empty(dropContainer);
        },
        val: val
      }
    },

    pseudoSelect: function(arrElems, arrVals, cb, selectedIdx, selectClass) {
      function Impl() {
        var selectedElem, selectedVal, selectClass, defaultCb = cb;
        return {
          add: function(elem, val, cb, selected) {
            var jqElem = elem;
            cb = cb || defaultCb;
            on(elem, "click", function() {
              var prevElem = selectedElem, prevVal = selectedVal;
              selectedVal = val;
              if (selectClass) {
                selectedElem && removeClass(selectedElem, selectClass);
                addClass(jqElem, selectClass);
              }
              selectedElem = jqElem;
              cb && cb(jqElem, selectedVal, prevElem, prevVal);
            });
            selected && trigger(elem, "click");
          },
          selected: function() {
            if (arguments.length > 0) {
              selectedVal = arguments[0];
            }
            return selectedVal;
          },
          setSelectClass: function(cls) {
            selectClass = cls;
          }
        };
      }
      if (! cb) {
        cb = function(selectedElem, selectedVal, prevElem, prevVal) {
          prevVal && hideElem(prevVal);
          selectedVal && showElem(selectedVal);
        };
      }
      var impl = new Impl();
      impl.setSelectClass(selectClass);
      arrElems && jiant.each(arrElems, function(idx, elem) {
        impl.add(elem, arrVals && arrVals.length > idx ? arrVals[idx] : null, cb, selectedIdx === idx);
      });
      return impl;
    },

    viewByAjaxOnState: function(view, ajax, state) {
      state.start(function() {
        ajax(function(data) {
          view.propagate(data);
        })
      });
    },

    elementVisibilityByEvent: function(elem, eventsList) {},

    removeCtl: function(ctl, model) {}

  };

  jiant.module("jiant-xl", function() {
    initDom();
    this.singleton();
    return tmpJiantXl;
  });

  if ( typeof define === "function" && define.amd ) {
    define(["jiant"], function (jiant) {
      window.jiant.xl = tmpJiantXl;
      jiant.xl = tmpJiantXl;
      return tmpJiantXl;
    } );
  } else {
    window.jiant.xl = tmpJiantXl;
  }

})();
