'use strict';

var app = angular
    .module('WbmModule', ['ui.bootstrap','oc.lazyLoad','LocalStorageModule'])
    .constant("_cfg", {
        baseUrl: "workspaces/",
        desktop: $("#__layout_desktop"),
        left: $('#__layout_left'),
        controlToggler: $("#__layout_control"),
        control: $("#__layout_control div:first")
    })
    .config(['$ocLazyLoadProvider', function ($ocLazyLoadProvider) {
            $ocLazyLoadProvider.config({ debug: false });
        }])
    .config(function (localStorageServiceProvider) {
        localStorageServiceProvider
            .setPrefix('wbm')
            .setStorageType('sessionStorage')
            .setNotify(true, true)
    })
    .controller('LayoutCtrl', function ($scope, $http, $ocLazyLoad, $compile, _cfg, localStorageService) {
    
    $scope.layout = undefined;
    $scope.layoutEdit = false;
    $scope.showControl = false;
    
    $http.get(_cfg.baseUrl + "workspaces.json").then(function (ret) {
        var workspaces = ret.data;
        angular.forEach(workspaces, function (workspace) {
            workspace.baseUrl = _cfg.baseUrl + workspace.baseUrl;
            workspace.loaded = false;
        });
        
        $scope.workspaces = workspaces;
        $scope.setWorkspace(workspaces[0]);
    });
    
    var loadPage = function (path) {
        $scope.workspace.page = path;
        var root = $scope.layout.root;
        if (root.contentItems.length > 0) {
            root.contentItems[0].remove();
        }
        root.addChild(path.content);
    }

    $scope.setPath = function (path, index) {
        $scope.workspace.paths[index].selected = path;
        $scope.workspace.paths = $scope.workspace.paths.slice(0, index + 1);
        if (path.children !== undefined && path.children.length > 0) {
            $scope.workspace.paths.push({ path: path, selected: undefined });
        }
        if (path.content !== undefined) {
            if (path.control) {
                loadControl(path.control);
            }
            loadPage(path);
        }
    }
    
    $scope.setWorkspace = function (workspace) {
        if (!workspace.loaded) {
            
            Promise.all([
                
                $http.get(workspace.baseUrl + "pages.json"),
                $http.get(workspace.baseUrl + "controls.json"),
                $http.get(workspace.baseUrl + "portlets.json")
                
            ]).then(function (ret) {

                var pages = ret[0].data;
                angular.extend(workspace, {
                    pages: pages,
                    controls: ret[1].data,
                    portlets: ret[2].data,
                    paths: [{ path: { children: pages }, selected: undefined }],
                    page: undefined,
                    loaded: true,
                    _portlet_cache: { },
                    _control_cache: { }
                });

                $scope.workspace = workspace;
                $scope.setPath(workspace.pages[0], 0);
                
            });
            
        } else {
            $scope.workspace = workspace;
        }
    }
    

    //*********************************
    //  Layout stuff
    //*********************************
    
    $scope.editLayout = function () {
        $scope.layoutEdit = true;
        $scope.workspace.page.saved = angular.copy($scope.workspace.page.content);
        initLayout();
        loadPage($scope.workspace.page);
    }

    $scope.saveLayout = function () {
        $scope.layoutEdit = false;
        $scope.workspace.page.content = angular.copy($scope.layout.toConfig().content[0]);
        initLayout();
        loadPage($scope.workspace.page);
    }

    $scope.cancelLayout = function () {
        $scope.layoutEdit = false;
        $scope.workspace.page.content = $scope.workspace.page.saved;
        initLayout();
        loadPage($scope.workspace.page);
    }
    
//    var addPortlet = function (pdata) {
//        var element = $('<li>' + pdata.title + '</li>');
//        _cfg.left.append(element);
//
//        var newItemConfig = {
//            title: pdata.title,
//            type: 'component',
//            componentName: 'portlet',
//            componentState: pdata
//        };
//
//        $scope.layout.createDragSource(element, newItemConfig);
//    };

//    $http.get(_cfg.portletsPath + 'portlets.json')
//        .then(function(res) {
//            angular.forEach(res.data, function(value) {
//                addPortlet(value);
//            });            
//        });

//    $scope.newPage = function () {
//        // TODO
//    }

    var layoutDisplayConfig = {
        settings: {
            isCloseable: false,
            hasHeaders: true,
            constrainDragToContainer: true,
            reorderEnabled: false,
            resizeEnabled: false,
            selectionEnabled: true,
            popoutWholeStack: false,
            blockedPopoutsThrowError: true,
            closePopoutsOnUnload: true,
            showPopoutIcon: false,
            showMaximiseIcon: true,
            showCloseIcon: false
        }, 
        dimensions: {
            borderWidth: 10
        }, content: [ ]
    };

    var layoutEditConfig = {
        settings: {
            isCloseable: true,
            hasHeaders: true,
            constrainDragToContainer: true,
            reorderEnabled: true,
            resizeEnabled: true,
            selectionEnabled: true,
            popoutWholeStack: false,
            blockedPopoutsThrowError: true,
            closePopoutsOnUnload: true,
            showPopoutIcon: false,
            showMaximiseIcon: true,
            showCloseIcon: true
        }, 
        dimensions: {
            borderWidth: 10
        }, content: [ ]
    };

    var loadPortlet = function (container, cached) {
        container.setTitle(cached.title);
        var linkingFunction = $compile(cached.html);
        var el = container.getElement();
        var portlet = linkingFunction($scope);
        el.append(portlet);
    }

    var initLayout = function () {
        if ($scope.layout) {
            $scope.layout.destroy();
        }
        var conf = $scope.layoutEdit ? layoutEditConfig : layoutDisplayConfig;
        $scope.layout = new window.GoldenLayout(conf, _cfg.desktop);
        $scope.layout.registerComponent("portlet", function (container, state) {
            var cached = $scope.workspace._portlet_cache[state.portlet];
            if (cached) {
                loadPortlet(container, cached);
            } else {
                var portlet = $scope.workspace.portlets[state.portlet];
                $ocLazyLoad.load($scope.workspace.baseUrl + portlet.script)
                    .then(function (data) {
                        $http.get($scope.workspace.baseUrl + portlet.template)
                            .then(function (html) {
                                cached = {
                                    title: portlet.title,
                                    html: html.data
                                };
                                loadPortlet(container, cached);
                                $scope.workspace._portlet_cache[state.portlet] = cached;
                            });
                    });
            }
        });
        $scope.layout.init();
    }
    
    initLayout();
    
    //*********************************
    //  Control stuff
    //*********************************
    
    var getControlScope = function () {
        return angular.element(_cfg.control.find("#__layout_control_div [ng-controller] :first")).scope();
    }
        
    $scope.applyControl = function () {
        $scope.$broadcast('applyPortlet', getControlScope().onApply());
        $scope.toggleControl();
    }
    
    $scope.onApply = function () { return {} }
    
    $scope.cancelControl = function () {
        getControlScope().onCancel();
        $scope.toggleControl();
    }

    $scope.onCancel = function () { }
        
    $scope.toggleControl = function () {
        _cfg.controlToggler.slideToggle();
    }
    
    var drawControl = function(div, cached) {
        var linkingFunction = $compile(cached.html);
        div.append(linkingFunction($scope));
        $scope.$broadcast('initPortlet', getControlScope().onInit());
    }

    var loadControl = function (cid) {
        _cfg.control.find("#__layout_control_div").remove();
        var div = $("<div id=\"__layout_control_div\"></div>").prependTo(_cfg.control);
        var cached = $scope.workspace._control_cache[cid];
        if (cached) {
            drawControl(div, cached);
        } else {
            var control = $scope.workspace.controls[cid];
            $ocLazyLoad.load($scope.workspace.baseUrl + control.script)
                .then(function (data) {
                    $http.get($scope.workspace.baseUrl + control.template)
                        .then(function (html) {
                            cached = {
                                title: control.title,
                                html: html.data
                            };
                            drawControl(div, cached);
                            $scope.workspace._control_cache[cid] = cached;
                        });
                });
        }
        
        _cfg.controlToggler.slideDown();
    };
    
    $scope.onInit = function () { return {} }
        
});
