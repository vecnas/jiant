jiant.module("jiant-xl2", ["jiant-util"], function($, app, jiant, params, util) {

    const fluent = util.fluent;

    this.singleton();

    const StatefulViews = function() {this.data = {}};
    StatefulViews.prototype.states = fluent("states");
    StatefulViews.prototype.views = fluent("views");
    StatefulViews.prototype.apply = function() {
        const states = jiant.toArray(this.states());
        const views = jiant.toArray(this.views());
        const bind2state = (state) => {
            state.start(function() {
                $.each(views, function(idx, view) {view.show()});
            });
            state.end(function() {
                $.each(views, function(idx, view) {view.hide()});
            });
        }
        $.each(states, function(idx, state) {
            bind2state(state);
        })
    };


    const StatefulApp = function() {this.data = {viewNameSuffix: ""}};
    StatefulApp.prototype.app = fluent("app");
    StatefulApp.prototype.viewNameSuffix = fluent("viewNameSuffix");
    StatefulApp.prototype.defaultState = fluent("defaultState");
    StatefulApp.prototype.apply = function() {
        const {app, viewNameSuffix,defaultState} = this.data;
        $.each(app.states, function(name, state) {
            const view = app.views[name + viewNameSuffix];
            view && new StatefulViews().states(state).views(view).apply();
        });
        app.states[""] && defaultState && app.states[""].start(function() {defaultState.replace();});
    };

    const Ctl2state = function() {this.data = {ctl: "Ctl", selectedCssClass: "selected"}};
    Ctl2state.prototype.ctl = fluent("ctl");
    Ctl2state.prototype.state = fluent("state");
    Ctl2state.prototype.selectedCssClass = fluent("selectedCssClass");
    Ctl2state.prototype.goProxy = fluent("goProxy");
    Ctl2state.prototype.apply = function() {
        const {ctl, state, selectedCssClass, goProxy} = this.data;
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

    const StatefulNav = function() {this.data = {suffix: "", selectedCssClass: "selected"}};
    StatefulNav.prototype.app = fluent("app");
    StatefulNav.prototype.view = fluent("view");
    StatefulNav.prototype.suffix = fluent("suffix");
    StatefulNav.prototype.selectedCssClass = fluent("selectedCssClass");
    StatefulNav.prototype.goProxy = fluent("goProxy");
    StatefulNav.prototype.apply = function() {
        const {app, view, suffix, selectedCssClass, goProxy} = this.data;
        $.each(app.states, function(stateName, stateSpec) {
            const ctl = view[stateName + suffix];
            ctl && new Ctl2state().ctl(ctl).state(stateSpec).selectedCssClass(selectedCssClass).goProxy(goProxy).apply();
        });
    };

    const PageableFilterableSortable = function() {this.data = {}};
    PageableFilterableSortable.prototype.state = fluent("state");
    PageableFilterableSortable.prototype.container = fluent("container");
    PageableFilterableSortable.prototype.pager = fluent("pager");
    PageableFilterableSortable.prototype.template = fluent("template");
    PageableFilterableSortable.prototype.ajax = fluent("ajax");
    PageableFilterableSortable.prototype.filterModel = fluent("filterModel");
    PageableFilterableSortable.prototype.perItemCb = fluent("perItemCb");
    PageableFilterableSortable.prototype.noItemsLabel = fluent("noItemsLabel");
    PageableFilterableSortable.prototype.onCompleteCb = fluent("onCompleteCb");
    PageableFilterableSortable.prototype.mapping = fluent("mapping");
    PageableFilterableSortable.prototype.apply = function() {
        const {state, container, pager, template, ajax, filterModel, perItemCb, noItemsLabel, onCompleteCb, mapping} = this.data;
        function refresh(pageNum) {
            let parsedNum = parseInt(pageNum);
            parsedNum = isNaN(parsedNum) ? 0 : parsedNum;
            const pageable = {"page.page": parsedNum, "page": parsedNum == 0 ? 0 : parsedNum - 1};
            filterModel && filterModel.sort && filterModel.sort()
            && (pageable["page.sort"] = filterModel.sort(), pageable["sort"] = filterModel.sort());
            ajax(filterModel, pageable, function(data) {
                container.empty();
                noItemsLabel && (data.content.length ? noItemsLabel.hide() : noItemsLabel.show());
                $.each(data.content, function(idx, item) {
                    const row = template.parseTemplate(item, undefined, undefined, mapping);
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
        state || refresh();
    };

    const SaveCtl = function() {this.data = {}};
    SaveCtl.prototype.ctl = fluent("ctl");
    SaveCtl.prototype.saveFn = fluent("saveFn");
    SaveCtl.prototype.markerElem = fluent("markerElem");
    SaveCtl.prototype.markerText = fluent("markerText");
    SaveCtl.prototype.apply = function() {
        let {ctl, saveFn, markerElem, markerText} = this.data;
        markerElem = markerElem ? markerElem : ctl;
        markerText = markerText ? markerText : "saving";
        ctl.click(function(event) {
            const prevLabel = markerElem.html();
            ctl.attr("disabled", "disabled");
            markerElem.html(markerText);
            saveFn(function () {
                ctl.attr("disabled", null);
                markerElem.html(prevLabel);
            }, event);
        });
    };

    const ConfirmedActionBs = function() {this.data = {}};
    ConfirmedActionBs.prototype.ctl = fluent("ctl");
    ConfirmedActionBs.prototype.confirmDialogView = fluent("confirmDialogView");
    ConfirmedActionBs.prototype.dialogOkCtl = fluent("dialogOkCtl");
    ConfirmedActionBs.prototype.actionFn = fluent("actionFn");
    ConfirmedActionBs.prototype.preCb = fluent("preCb");
    ConfirmedActionBs.prototype.apply = function() {
        const {ctl, confirmDialogView, dialogOkCtl, actionFn, preCb} = this.data;
        let confirmedActionBsSelectedFn;
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
    };

    let rememberedActionFn;
    const ConfirmedAction = function() {this.data = {}};
    ConfirmedAction.prototype.ctl = fluent("ctl");
    ConfirmedAction.prototype.confirmDialogView = fluent("confirmDialogView");
    ConfirmedAction.prototype.dialogOkCtl = fluent("dialogOkCtl");
    ConfirmedAction.prototype.actionFn = fluent("actionFn");
    ConfirmedAction.prototype.preCb = fluent("preCb");
    ConfirmedAction.prototype.apply = function() {
        const {ctl, confirmDialogView, dialogOkCtl, actionFn, preCb} = this.data;
        ctl.click(function() {
            preCb && preCb();
            rememberedActionFn = actionFn;
            confirmDialogView.show();
        });
        dialogOkCtl.click(function() {
            confirmDialogView.hide();
            rememberedActionFn && rememberedActionFn();
            rememberedActionFn = null;
        });
    };

    const BindList = function() {this.data = {}};
    BindList.prototype.model = fluent("model");
    BindList.prototype.container = fluent("container");
    BindList.prototype.template = fluent("template");
    BindList.prototype.viewFieldSetterName = fluent("viewFieldSetterName");
    BindList.prototype.sortFn = fluent("sortFn");
    BindList.prototype.subscribeForUpdates = fluent("subscribeForUpdates");
    BindList.prototype.reversePropagate = fluent("reversePropagate");
    BindList.prototype.elemFactory = fluent("elemFactory");
    BindList.prototype.mapping = fluent("mapping");
    BindList.prototype.off = function () {
        const viewFieldSetterName = this.data.viewFieldSetterName;
        this._addHnd && m.add.off(this._addHnd);
        this._remHnd && m.remove.off(this._remHnd);
        $.each(this.data.model.jRepo.all(), function (i, obj) {
            $.isFunction(obj[viewFieldSetterName]) && obj[viewFieldSetterName]()
            && $.isFunction(obj[viewFieldSetterName]().off) && obj[viewFieldSetterName]().off();
        });
    };
    BindList.prototype.apply = function() {
        const {model, container, template, viewFieldSetterName, sortFn, subscribeForUpdates, reversePropagate,
            elemFactory, mapping} = this.data;
        let sorted = [];
        function renderObj(obj) {
            let tm = $.isFunction(template) ? template(obj) : template,
                cont = $.isFunction(container) ? container(obj) : container,
                appended = false,
                useTm = !!tm,
                view;
            if (elemFactory) {
                if (jiant.intro.isTemplate(elemFactory.create)) {
                    tm = elemFactory.create;
                    useTm = true;
                } else if ($.isFunction(elemFactory.create)) {
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
            if (sortFn && $.isFunction(sortFn) && jiant.getRepo(model).all) {
                $.each(sorted, function(i, item) {
                    const order = sortFn(obj, item);
                    if (item[viewFieldSetterName] && item[viewFieldSetterName]() && order < 0) {
                        useTm && view.insertBefore(item[viewFieldSetterName]()[0]);
                        sorted.splice(i, 0, obj);
                        appended = true;
                        return false;
                    }
                });
            }
            if (!appended) {
                useTm && cont.append(view);
                sorted.push(obj);
            }
            $.isFunction(obj[viewFieldSetterName]) && view && obj[viewFieldSetterName](view);
        }
        const m = model.jRepo;
        this._addHnd = m.add && m.add.on(function (arr) {
            $.each(arr, function (idx, obj) {
                renderObj(obj);
            });
        });
        this._remHnd = m.remove && m.remove.on(function (obj) {
            obj[viewFieldSetterName] && (elemFactory ? elemFactory.remove(obj[viewFieldSetterName]()) : obj[viewFieldSetterName]().remove());
            sorted = $.grep(sorted, function(elem, i) {return elem != obj});
        });
        $.each(model.jRepo.all(), function(i, obj) {
            renderObj(obj);
        });
    };

    const FilterableData = function() {this.data = {}};
    FilterableData.prototype.model = fluent("model");
    FilterableData.prototype.ajax = fluent("ajax");
    FilterableData.prototype.filterModel = fluent("filterModel");
    FilterableData.prototype.updateOnModel = fluent("updateOnModel");
    FilterableData.prototype.completeCb = fluent("completeCb");
    FilterableData.prototype.singletonMode = fluent("singletonMode");
    FilterableData.prototype.apply = function() {
        const {model, ajax, filterModel, updateOnModel, completeCb, singletonMode} = this.data;
        function refresh() {
            ajax(filterModel, function(data) {
                singletonMode ? model.update(data) : model.jRepo.updateAll(data, true);
                completeCb && completeCb(data);
            });
        }
        if (updateOnModel && filterModel && filterModel.on) {
            filterModel.on(refresh);
        }
        refresh();
    };

    const PageableFilterableSortableModel = function() {this.data = {}};
    PageableFilterableSortableModel.prototype.model = fluent("model");
    PageableFilterableSortableModel.prototype.ajax = fluent("ajax");
    PageableFilterableSortableModel.prototype.state = fluent("state");
    PageableFilterableSortableModel.prototype.pager = fluent("pager");
    PageableFilterableSortableModel.prototype.filterSortModel = fluent("filterSortModel");
    PageableFilterableSortableModel.prototype.apply = function() {
        const {model, ajax, state, pager, filterSortModel} = this.data;
        function refresh(pageNum) {
            let parsedNum = parseInt(pageNum);
            parsedNum = isNaN(parsedNum) ? 0 : parsedNum;
            const pageable = {"page.page": parsedNum, "page": parsedNum == 0 ? 0 : parsedNum - 1};
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
        state || refresh();
    };

    const RenderList = function() {this.data = {}};
    RenderList.prototype.list = fluent("list");
    RenderList.prototype.container = fluent("container");
    RenderList.prototype.tm = fluent("tm");
    RenderList.prototype.perItemCb = fluent("perItemCb");
    RenderList.prototype.noItemsLabel = fluent("noItemsLabel");
    RenderList.prototype.subscribeForUpdates = fluent("subscribeForUpdates");
    RenderList.prototype.appendMode = fluent("appendMode");
    RenderList.prototype.mapping = fluent("mapping");
    RenderList.prototype.apply = function() {
        const {list, container, tm, perItemCb, noItemsLabel, subscribeForUpdates, appendMode, mapping} = this.data;
        noItemsLabel && (list.length ? noItemsLabel.hide() : noItemsLabel.show());
        !appendMode && container.empty();
        $.each(list, function(idx, item) {
            const elem = tm.parseTemplate(item, subscribeForUpdates, false, mapping);
            container.append(elem);
            perItemCb && perItemCb(item, elem, idx);
        });
    };

    const PagedContent = function() {this.data = {}};
    PagedContent.prototype.state = fluent("state");
    PagedContent.prototype.ajax = fluent("ajax");
    PagedContent.prototype.container = fluent("container");
    PagedContent.prototype.pager = fluent("pager");
    PagedContent.prototype.template = fluent("template");
    PagedContent.prototype.perItemCb = fluent("perItemCb");
    PagedContent.prototype.noItemsLabel = fluent("noItemsLabel");
    PagedContent.prototype.onCompleteCb = fluent("onCompleteCb");
    PagedContent.prototype.useSorting = fluent("useSorting");
    PagedContent.prototype.apply = function() {
        const {state, ajax, container, pager, template, perItemCb, noItemsLabel, onCompleteCb, useSorting} = this.data;

        pager && pager.onValueChange(function(event, pageNum) {
            state.go(pageNum, undefined);
        });

        state.start(function(pageNum, sort) {
            pageNum = pageNum ? pageNum : "0";
            const parsedNum = parseInt(pageNum) + "";
            if (parsedNum != pageNum) {
                jiant.logError("pagedContent expects pageNum as first state parameter, passed: " + pageNum
                    + ", recommended fix: make pageNum first argument, now replacing pageNum by 0");
                pageNum = 0;
            }
            const pageable = {"page.page": pageNum, "page": parsedNum === "0" ? 0 : parsedNum - 1};
            if (useSorting && sort) {
                pageable["page.sort"] = sort;
                pageable["sort"] = sort;
            }
            ajax(pageable, function(data) {
                container.empty();
                noItemsLabel && (data.content.length ? noItemsLabel.hide() : noItemsLabel.show());
                $.each(data.content, function(idx, item) {
                    const row = template.parseTemplate(item);
                    container.append(row);
                    perItemCb && perItemCb(item, row);
                });
                pager && pager.updatePager(data);
                onCompleteCb && onCompleteCb(data);
            });
        });
    };

    const XOption = function() {this.data = {}};
    XOption.prototype.allSelector = fluent("allSelector");
    XOption.prototype.filterFn = fluent("filterFn");
    XOption.prototype.apply = function() {
        const {allSelector, filterFn} = this.data;
        function Impl(allSelector) {
            const options = [];
            function sync() {
                let arr = [], allUnchecked = true, allChecked = true;
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
                    const val = allSelector.prop("checked");
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
    };

    const PseudoDropdown = function() {this.data = {}};
    PseudoDropdown.prototype.ctl = fluent("ctl");
    PseudoDropdown.prototype.label = fluent("label");
    PseudoDropdown.prototype.dropPanel = fluent("dropPanel");
    PseudoDropdown.prototype.dropContainer = fluent("dropContainer");
    PseudoDropdown.prototype.optionTm = fluent("optionTm");
    PseudoDropdown.prototype.apply = function() {
        const {ctl, label, dropPanel, dropContainer, optionTm} = this.data;
        let selectedVal;
        ctl.click(function() {
            ctl.toggleClass("pseudoDropped");
            dropPanel.toggleClass("pseudoDropped");
        });
        function val(_val, title) {
            if (arguments.length === 0) {
                return selectedVal;
            } else {
                selectedVal = _val;
                label && label.html(title);
                ctl.trigger("change", selectedVal);
            }
        }
        return {
            add: function(_val, title, selected) {
                const elem = optionTm.parseTemplate(_val);
                if (Object.prototype.toString.call(_val) === "[object String]" && title) {
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
    };

    const PseudoSelect = function() {this.data = {}};
    PseudoSelect.prototype.arrElems = fluent("arrElems");
    PseudoSelect.prototype.arrVals = fluent("arrVals");
    PseudoSelect.prototype.cb = fluent("cb");
    PseudoSelect.prototype.selectedIdx = fluent("selectedIdx");
    PseudoSelect.prototype.selectClass = fluent("selectClass");
    PseudoSelect.prototype.apply = function() {
        const {arrElems, arrVals, selectedIdx, selectClass} = this.data;
        let cb = this.data.cb;
        function Impl() {
            let selectedElem, selectedVal, selectClass, defaultCb = cb;
            return {
                add: function(elem, val, cb, selected) {
                    elem = $(elem);
                    cb = cb || defaultCb;
                    elem.click(function() {
                        const prevElem = selectedElem, prevVal = selectedVal;
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
        const impl = new Impl();
        impl.setSelectClass(selectClass);
        arrElems && $.each(arrElems, function(idx, elem) {
            impl.add($(elem), arrVals && arrVals.length > idx ? arrVals[idx] : null, cb, selectedIdx === idx);
        });
        return impl;
    };

    const ViewByAjaxOnState = function() {this.data = {}};
    ViewByAjaxOnState.prototype.view = fluent("view");
    ViewByAjaxOnState.prototype.ajax = fluent("ajax");
    ViewByAjaxOnState.prototype.state = fluent("state");
    ViewByAjaxOnState.prototype.apply = function() {
        const {view, ajax, state} = this.data;
        state.start(function() {
            ajax(function(data) {
                view.propagate(data);
            })
        })
    };

    return {
        ViewByAjaxOnState: function() {return new ViewByAjaxOnState()},
        PseudoSelect: function() {return new PseudoSelect()},
        PseudoDropdown: function() {return new PseudoDropdown()},
        XOption: function() {return new XOption()},
        PagedContent: function() {return new PagedContent()},
        RenderList: function() {return new RenderList()},
        PageableFilterableSortableModel: function() {return new PageableFilterableSortableModel()},
        PageableFilterableSortable: function() {return new PageableFilterableSortable()},
        FilterableData: function() {return new FilterableData()},
        BindList: function() {return new BindList()},
        SaveCtl: function() {return new SaveCtl()},
        ConfirmedActionBs: function() {return new ConfirmedActionBs()},
        ConfirmedAction: function() {return new ConfirmedAction()},
        Ctl2state: function() {return new Ctl2state()},
        StatefulNav: function() {return new StatefulNav()},
        StatefulApp: function() {return new StatefulApp()},
        StatefulViews: function() {return new StatefulViews()}
    }
})