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
 */

(function() {

  var confirmedActionBsSelectedFn;

  var tmpJiantXl = {

    version: function() {
      return 45;
    },

    ctl2state: function(ctl, state, selectedCssClass, goProxy) {
      return function() {
        ctl.click(function() {
          goProxy ? goProxy(state) : state.go();
        });
        selectedCssClass && state.start(function() {
          ctl.addClass(selectedCssClass);
        });
        selectedCssClass && state.end(function() {
          ctl.removeClass(selectedCssClass);
        });
      };
    },

    nav: function(app, view, suffix, selectedCssClass, goProxy) {
      return function() {
        suffix = suffix ? suffix : "";
        $.each(app.states, function(stateName, stateSpec) {
          var ctl = view[stateName + suffix];
          ctl && jiant.xl.ctl2state(ctl, stateSpec, selectedCssClass, goProxy)();
        });
      };
    },

    statefulViews: function(states, views) {
      return function() {
        function bind2state(state) {
          state.start(function() {
            if ($.isArray(views)) {
              $.each(views, function(idx, view) {
                view.show();
              });
            } else {
              views.show();
            }
          });
          state.end(function() {
            if ($.isArray(views)) {
              $.each(views, function(idx, view) {view.hide();});
            } else {
              views.hide();
            }
          });
        }
        if ($.isArray(states)) {
          $.each(states, function(idx, state) {
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
        $.each(app.states, function(name, state) {
          var view = app.views[name + viewNameSuffix];
          view && jiant.xl.statefulViews(state, view)();
        });
        app.states[""] && defaultState && app.states[""].start(function() {defaultState.go();});
      };
    },

    bindList: function(model, container, template, viewFieldSetterName, sortFn, subscribeForUpdates, reversePropagate, elemFactory) {
      function renderObj(obj) {
        var tm = $.isFunction(template) ? template(obj) : template,
            view = elemFactory ? elemFactory.create(obj, subscribeForUpdates, reversePropagate)
                : tm.parseTemplate(obj, subscribeForUpdates, reversePropagate),
            appended = false;
        viewFieldSetterName = viewFieldSetterName || "viewFieldSetterXL";
        if (viewFieldSetterName && sortFn && $.isFunction(sortFn) && model.all) {
          $.each(model.all(), function(i, item) {
            var order = sortFn(obj, item);
            if (item[viewFieldSetterName] && item[viewFieldSetterName]() && order < 0) {
              !elemFactory && view.insertBefore(item[viewFieldSetterName]()[0]);
              appended = true;
              return false;
            }
          });
        }
        if (!appended) {
          !elemFactory && container.append(view);
        }
        viewFieldSetterName && $.isFunction(obj[viewFieldSetterName]) && view && obj[viewFieldSetterName](view);
      }
      return function() {
        model.add && model.add.on(function(arr) {
          $.each(arr, function(idx, obj) {
            renderObj(obj);
          });
        });
        model.remove && model.remove.on(function(obj) {
          obj[viewFieldSetterName] && (elemFactory ? elemFactory.remove(obj[viewFieldSetterName]()) : obj[viewFieldSetterName]().remove());
        });
      };
    },

    pageableFilterableSortableModel: function(model, ajax, state, pager, filterSortModel) {
      function refresh(pageNum) {
        var parsedNum = parseInt(pageNum);
        parsedNum = isNaN(parsedNum) ? 0 : parsedNum;
        var pageable = {"page.page": parsedNum, "page": parsedNum == 0 ? 0 : parsedNum - 1};
        filterSortModel && filterSortModel.sort && filterSortModel.sort()
        && (pageable["page.sort"] = filterSortModel.sort(), pageable["sort"] = filterSortModel.sort());
        ajax(filterSortModel, pageable, function(data) {
          model.updateAll(data.content, true);
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

    pageableFilterableSortable: function(state, container, pager, template, ajax, filterModel, perItemCb, noItemsLabel, onCompleteCb) {
      function refresh(pageNum) {
        var parsedNum = parseInt(pageNum);
        parsedNum = isNaN(parsedNum) ? 0 : parsedNum;
        var pageable = {"page.page": parsedNum, "page": parsedNum == 0 ? 0 : parsedNum - 1};
        filterModel && filterModel.sort && filterModel.sort()
        && (pageable["page.sort"] = filterModel.sort(), pageable["sort"] = filterModel.sort());
        ajax(filterModel, pageable, function(data) {
          container.empty();
          noItemsLabel && (data.content.length ? noItemsLabel.hide() : noItemsLabel.show());
          $.each(data.content, function(idx, item) {
            var row = template.parseTemplate(item);
            container.append(row);
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
            container.empty();
            noItemsLabel && (data.content.length ? noItemsLabel.hide() : noItemsLabel.show());
            $.each(data.content, function(idx, item) {
              var row = template.parseTemplate(item);
              container.append(row);
              perItemCb && perItemCb(item, row);
            });
            pager && pager.updatePager(data);
            onCompleteCb && onCompleteCb(data);
          });
        });

      };
    },

    renderList: function(list, container, tm, perItemCb, noItemsLabel, subscribeForUpdates) {
      return function() {
        noItemsLabel && (list.length ? noItemsLabel.hide() : noItemsLabel.show());
        container.empty();
        $.each(list, function(idx, item) {
          var elem = tm.parseTemplate(item, subscribeForUpdates);
          container.append(elem);
          perItemCb && perItemCb(item, elem, idx);
        });
      }
    },

    confirmedActionBs: function(ctl, confirmDialogView, dialogOkCtl, actionFn, preCb) {
      return function() {
        ctl.click(function() {
          preCb && preCb();
          confirmDialogView.modal("show");
          confirmedActionBsSelectedFn = actionFn;
        });
        !confirmDialogView.firstTimeConfirmation && dialogOkCtl.click(function() {
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
        ctl.click(function(event) {
          var prevLabel = markerElem.html();
          ctl.attr("disabled", "disabled");
          markerElem.html(markerText);
          saveFn(function () {
            ctl.attr("disabled", null);
            markerElem.html(prevLabel);
          }, event);
        });
      };
    },

    xOption: function(allSelector, filterFn) {
      function Impl(allSelector) {
        var options = [];
        function sync() {
          var arr = [], allUnchecked = true, allChecked = true;
          $.each(options, function(idx, elem) {
            elem = $(elem);
            if (elem.prop("checked")) {
              arr.push(elem.data("val"));
              allUnchecked = false;
            } else {
              allChecked = false;
            }
          });
          allSelector.prop("checked", allChecked);
          if (allChecked || allUnchecked) {
            allSelector.removeClass("middle-check");
          } else {
            allSelector.addClass("middle-check");
          }
          filterFn && filterFn(arr);
        }
        allSelector.change(function() {
          $.each(options, function(idx, option) {
            var val = allSelector.prop("checked");
            $(option).prop("checked", val);
          });
          sync();
        });
        return {
          add: function(elem) {
            options.push(elem);
            elem.change(sync);
          },
          sync: sync
        }
      }
      return new Impl(allSelector);
    },

    pseudoDropdown: function(ctl, label, dropPanel, dropContainer, optionTm) {
      var selectedVal;
      ctl.click(function() {
        ctl.toggleClass("pseudoDropped");
        dropPanel.toggleClass("pseudoDropped");
      });
      function val(_val, title) {
        if (arguments.length == 0) {
          return selectedVal;
        } else {
          selectedVal = _val;
          label && label.html(title);
          ctl.trigger("change", selectedVal);
        }
      }
      return {
        add: function(_val, title, selected) {
          var elem = optionTm.parseTemplate(_val);
          if (Object.prototype.toString.call(_val) == "[object String]" && title) {
            elem.html(title);
          }
          dropContainer.append(elem);
          elem.click(function() {
            val(_val, title);
          });
          selected && val(_val, title);
        },
        change: function(arg) {
          ctl.change(arg);
        },
        empty: function() {
          dropContainer.empty();
        },
        val: val
      }
    },

    pseudoSelect: function(arrElems, arrVals, cb, selectedIdx, selectClass) {
      function Impl() {
        var selectedElem, selectedVal, selectClass, defaultCb = cb;
        return {
          add: function(elem, val, cb, selected) {
            elem = $(elem);
            cb = cb || defaultCb;
            elem.click(function() {
              var prevElem = selectedElem, prevVal = selectedVal;
              selectedVal = val;
              if (selectClass) {
                selectedElem && selectedElem.removeClass(selectClass);
                elem.addClass(selectClass);
              }
              selectedElem = elem;
              cb && cb(selectedElem, selectedVal, prevElem, prevVal);
            });
            selected && elem.click();
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
               prevVal && $(prevVal).hide();
               selectedVal && $(selectedVal).show();
             };
      }
      var impl = new Impl();
      impl.setSelectClass(selectClass);
      arrElems && $.each(arrElems, function(idx, elem) {
        impl.add($(elem), arrVals && arrVals.length > idx ? arrVals[idx] : null, cb, selectedIdx === idx);
      });
      return impl;
    },

    elementVisibilityByEvent: function(elem, eventsList) {},

    removeCtl: function(ctl, model) {}

  };

  if (! (window.jiant && window.jiant.xl && window.jiant.xl.version && window.jiant.xl.version() >= tmpJiantXl.version())) {
    window.jiant.xl = tmpJiantXl;
  }

})();
