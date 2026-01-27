(function() {

  var timelines = {};

  var Bus = function() {this._subscribers = {}};
  Bus.prototype.trigger = function(evtName, param) {
    if (! this._subscribers[evtName]) {
      return;
    }
    for (var i = 0; i < this._subscribers[evtName].length; i++) {
      this._subscribers[evtName][i].call(this, param);
    }
  };
  Bus.prototype.on = function(evtName, cb) {
    this._subscribers[evtName] = this._subscribers[evtName] || [];
    this._subscribers[evtName].push(cb);
  };

  var Event = function() {Bus.call(this)};
  Event.prototype = Object.create(Bus.prototype);
  // Event.prototype._startedAt = 0;
  // Event.prototype._duration = 0;
  // Event.prototype._startTime = 0;
  // Event.prototype._data = null;
  // Event.prototype._next = null;
  // Event.prototype._fit = null;
  Event.prototype.onStart = function(cb) {
    this.on("start", cb);
    return this;
  };
  Event.prototype.onUpdate = function(cb) {
    this.on("update", cb);
    return this;
  };
  Event.prototype.onComplete = function(cb) {
    this.on("complete", cb);
    return this;
  };
  Event.prototype.duration = function(val) {
    this._duration = val;
    return this;
  };
  Event.prototype.fromTo = function(from, to) {
    this._from = from;
    this._to = to;
    this._fromBase = {};
    for (var key in from) {
      if (from.hasOwnProperty(key) && to.hasOwnProperty(key) && $.isNumeric(from[key]) && $.isNumeric(to[key])) {
        this._fromBase[key] = from[key];
      }
    }
    return this;
  };
  Event.prototype.release = function(val) {
    this._release = val;
    return this;
  };

  var Timeline = window.Timeline = function() {Bus.call(this); this._active = []};
  Timeline.prototype = Object.create(Bus.prototype);
  // Timeline.prototype._active = [];
  // Timeline.prototype._last = null;
  // Timeline.prototype._first = null;
  Timeline.prototype.add = function(obj) {
    var event = new Event();
    event._startTime = time();
    event._data = obj;
    if (this._last) {
      this._last._next = event;
    } else {
      this._first = event;
    }
    this._last = event;
    return event;
  };
  Timeline.prototype.onEmpty = function(cb) {
    this.on("empty", cb);
    return this;
  };
  Timeline.get = function(name) {
    name = name || "default";
    if (!(name in timelines)) {
      timelines[name] = new Timeline();
    }
    return timelines[name];
  };

  requestAnimationFrame(update);

  function time() {
    return new Date().getTime();
  }

  function isTimeForNext(tline, tm) {
    if (tline._active.length == 0) {
      return true;
    }
    var lastEvt = tline._active[tline._active.length - 1];
    return ("_release" in lastEvt) ? (lastEvt._startedAt + lastEvt._release <= tm) : (lastEvt._startedAt + lastEvt._duration <= tm);
  }

  function progressFromTo(evt, progress) {
    if (evt._from && evt._to) {
      for (var key in evt._fromBase) {
        if (evt._fromBase.hasOwnProperty(key)) {
          evt._from[key] = evt._fromBase[key] + progress * (evt._to[key] - evt._fromBase[key]);
        }
      }
    }
  }

  function update() {
    var key, tline, tlineSizeBefore, nextEvt, i, toStop = [], tm = time();
    for (key in timelines) {
      if (timelines.hasOwnProperty(key)) {
        tline = timelines[key];
        nextEvt = tline._first;
        if (nextEvt && isTimeForNext(tline, tm)) {
          tline._active.push(nextEvt);
          tline._first = tline._first._next;
          if (! tline._first) {
            tline._last = null;
          }
        }
      }
    }
    for (key in timelines) {
      if (timelines.hasOwnProperty(key)) {
        tline = timelines[key];
        tlineSizeBefore = tline._active.length;
        for (i = 0; i < tline._active.length; i++) {
          var evt = tline._active[i],
            progress = !evt._duration ? 1 : Math.min(tm - evt._startedAt, evt._duration) / evt._duration;
          if (! evt._startedAt) {
            evt._startedAt = tm;
            evt.trigger("start");
          }
          progressFromTo(evt, progress);
          evt.trigger("update", progress);
          if (progress == 1) {
            if (evt._data && $.isFunction(evt._data)) {
              evt._data();
            }
            evt.trigger("complete");
            tline._active.splice(i, 1);
            i--;
          }
        }
        if (tlineSizeBefore != 0 && tline._active.length == 0 && !tline._first) {
          tline.trigger("empty");
        }
      }
    }
    requestAnimationFrame(update);
  }

})();
