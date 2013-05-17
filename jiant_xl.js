jiant.xl = {

  ctl2state: function(ctl, state, selectedCssClass) {
    return function() {
      ctl.click(state.go);
      selectedCssClass && state.start(function() {
        ctl.addClass(selectedCssClass);
      });
      selectedCssClass && state.end(function() {
        ctl.removeClass(selectedCssClass);
      });
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
