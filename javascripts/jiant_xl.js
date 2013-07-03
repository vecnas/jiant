// 0.33 based, added bindList
// 0.42 based, minor fix in bindList
// 0.44 based, nav, stateful views
// 0.46 based, pagedContent

jiant.xl = {

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

  bindList: function(model, container, template, setterName) {
    function renderObj(obj) {
      var view = template.parseTemplate({id: $.isFunction(obj.id) ? obj.id() : obj.id});
      container.append(view);
      setterName && $.isFunction(obj[setterName]) && obj[setterName](view);
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

  pagedContent: function(state, ajax, container, pager, template, perItemCb) {
    return function() {

      pager.onValueChange(function(event, pageNum) {
        state.go(pageNum);
      });

      state.start(function(pageNum) {
        pageNum = pageNum ? pageNum : 0;
        ajax({"page.page": pageNum}, function(data) {
          container.empty();
          $.each(data.content, function(idx, item) {
            var row = template.parseTemplate(item);
            container.append(row);
            perItemCb && perItemCb(item, row);
          });
          pager.updatePager(data);
        });
      });

    };
  },

  elementVisibilityByEvent: function(elem, eventsList) {},

  removeCtl: function(ctl, model) {}

};
