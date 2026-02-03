jiant.module("t3_after", function() {
  if (window.__jiantTestState) {
    window.__jiantTestState.afterCount = (window.__jiantTestState.afterCount || 0) + 1;
  }
  return {name: "after"};
});
