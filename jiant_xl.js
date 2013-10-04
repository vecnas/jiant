// 0.33 based, added bindList
// 0.42 based, minor fix in bindList
// 0.44 based, nav, stateful views
// 0.46 based, pagedContent
// xl.0.01 renderList(list, container, tm, perItemCb) added, perItemCb(item, elem)
// xl.0.02 propagate call added to pagedContent
// xl.0.03 noItems optional parameter added to pagedContent, renderList; version() added
// xl.0.04 onCompleteCb optional parameters added to pagedContent
// xl.0.05 confirmedActionBs(ctl, confirmDialogView, dialogOkCtl, actionFn) added
// xl.0.06 saveCtl(ctl, saveFn, markerElemOptional, markerTextOptional) added
// xl.0.07 confirmedActionBs accepts one more optional parameter - preCb - called just before showing confirmation
// xl.0.08 bindList(model, container, template, viewFieldSetterName) accepts both template or callback as 3rd parameter, usage: template(obj)
// xl.0.09 confirmedActionBs multiple targets bug fixed

(function() {

  var confirmedActionBsSelectedFn;

  var tmpJiantXl = {

    version: function() {
      return 9;
    },

    ctl2state: function(ctl, state, selectedCssClass) {
      return function() {
        ctl.click(function() {
          state.go();
        });
        selectedCssClass && state.start(function() {
          ctl.addClass(selectedCssClass);
        });
        selectedCssClass && state.end(function() {
          ctl.removeClass(selectedCssClass);
        });
      };
    },

    nav: function(app, view, suffix, selectedCssClass) {
      return function() {
        suffix = suffix ? suffix : "";
        $.each(app.states, function(stateName, stateSpec) {
          var ctl = view[stateName + suffix];
          ctl && jiant.xl.ctl2state(ctl, stateSpec, selectedCssClass)();
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
              $.each(views, function(idx, view) {
                view.hide();
              });
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

    statefulApp: function(app, viewNameSuffix) {
      return function() {
        viewNameSuffix = viewNameSuffix ? viewNameSuffix : "";
        $.each(app.states, function(name, state) {
          var view = app.views[name + viewNameSuffix];
          view && jiant.xl.statefulViews(state, view)();
        });
      };
    },

    bindList: function(model, container, template, viewFieldSetterName) {
      function renderObj(obj) {
        var tm = $.isFunction(template) ? template(obj) : template;
        var view = tm.parseTemplate({id: $.isFunction(obj.id) ? obj.id() : obj.id});
        container.append(view);
        viewFieldSetterName && $.isFunction(obj[viewFieldSetterName]) && obj[viewFieldSetterName](view);
        view.propagate(obj);
        container.refreshTabs && container.refreshTabs();
      }
      return function() {
        model.addAll && model.addAll.on(function(arr) {
          $.each(arr, function(idx, obj) {
            renderObj(obj);
          });
        });
        model.add && model.add.on(renderObj);
      };
    },

    pagedContent: function(state, ajax, container, pager, template, perItemCb, noItemsLabel, onCompleteCb) {
      return function() {

        pager.onValueChange(function(event, pageNum) {
          state.go(pageNum);
        });

        state.start(function(pageNum) {
          pageNum = pageNum ? pageNum : 0;
          ajax({"page.page": pageNum}, function(data) {
            container.empty();
            noItemsLabel && (data.content.length ? noItemsLabel.hide() : noItemsLabel.show());
            $.each(data.content, function(idx, item) {
              var row = template.parseTemplate(item);
              row.propagate(item, false);
              container.append(row);
              perItemCb && perItemCb(item, row);
            });
            pager.updatePager(data);
            onCompleteCb && onCompleteCb(data);
          });
        });

      };
    },

    renderList: function(list, container, tm, perItemCb, noItemsLabel) {
      return function() {
        noItemsLabel && (list.length ? noItemsLabel.hide() : noItemsLabel.show());
        $.each(list, function(idx, item) {
          var elem = tm.parseTemplate(item);
          elem.propagate(item, false);
          container.append(elem);
          perItemCb && perItemCb(item, elem);
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
        ctl.click(function() {
          var prevLabel = markerElem.html();
          ctl.attr("disabled", "disabled");
          markerElem.html(markerText);
          saveFn(function () {
            ctl.attr("disabled", null);
            markerElem.html(prevLabel);
          });
        });
      };
    },

    elementVisibilityByEvent: function(elem, eventsList) {},

    removeCtl: function(ctl, model) {}

  };

  if (! (window.jiant && window.jiant.xl && window.jiant.xl.version && window.jiant.xl.version() >= tmpJiantXl.version())) {
    window.jiant.xl = tmpJiantXl;
  }

})();
