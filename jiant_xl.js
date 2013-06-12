// 0.33 based, added bindList
// 0.42 based, minor fix in bindList
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

  pagedContent: function(ajax, container, pager, template, renderingCb) {
    return function() {
      ajax(function() {
        pager.updatePager(currentPage);
      });
    };
  },

  elementVisibilityByEvent: function(elem, eventsList) {},

  removeCtl: function(ctl, model) {}

};
