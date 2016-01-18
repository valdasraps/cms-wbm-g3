'use strict';

var app = angular
    .module('LayoutModule', ['ui.bootstrap','oc.lazyLoad','LocalStorageModule'])
    .constant("_cfg", {
        workspacesPath: "workspaces/",
        workspacesFile: "workspaces.json",
        desktop: $("#__layout_desktop"),
        left: $('#__layout_left'),
        controlToggler: $("#__layout_control"),
        control: $("#__layout_control div"),
//        controlButts: $("#__layout_control_butts")
    })
    .config(['$ocLazyLoadProvider', function ($ocLazyLoadProvider) {
            $ocLazyLoadProvider.config({ debug: false });
        }])
    .config(function (localStorageServiceProvider) {
        localStorageServiceProvider
            .setPrefix('wbm')
            .setStorageType('sessionStorage')
            .setNotify(true, true)
    });

app.controller('LayoutController', function ($scope, $http, $ocLazyLoad, $compile, _cfg, localStorageService) {

    $scope.layout = undefined;
    $scope.layoutEdit = false;
    $scope.showControl = false;

    var addPortlet = function (pdata) {
        var element = $('<li>' + pdata.title + '</li>');
        _cfg.left.append(element);

        var newItemConfig = {
            title: pdata.title,
            type: 'component',
            componentName: 'portlet',
            componentState: pdata
        };

        $scope.layout.createDragSource(element, newItemConfig);
    };

//    $http.get(_cfg.portletsPath + 'portlets.json')
//        .then(function(res) {
//            angular.forEach(res.data, function(value) {
//                addPortlet(value);
//            });            
//        });

    $scope.newPage = function () {
        // TODO
    }

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
                $http.get(workspace.baseUrl + workspace.pagesUrl),
                $http.get(workspace.baseUrl + workspace.controlsUrl),
                $http.get(workspace.baseUrl + workspace.portletsUrl)
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

    $http.get(_cfg.workspacesPath + _cfg.workspacesFile).then(function (ret) {
        var workspaces = ret.data;
        angular.forEach(workspaces, function (workspace) {
            workspace.baseUrl = _cfg.workspacesPath + workspace.baseUrl;
            workspace.loaded = false;
        });
        
        console.log(workspaces);
        
        $scope.workspaces = workspaces;
        $scope.setWorkspace(workspaces[0]);
    });
    
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
            showMaximiseIcon: false,
            showCloseIcon: false
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
            showPopoutIcon: true,
            showMaximiseIcon: true,
            showCloseIcon: true
        }, content: [ ]
    };

    var loadPortlet = function (container, cached) {
        container.setTitle(cached.title);
        var linkingFunction = $compile(cached.html);
        var el = container.getElement();
        el.append(linkingFunction($scope));
        angular.bootstrap(el[0], [ cached.ctrl ]);
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
                                    html: html.data,
                                    ctrl: state.portlet
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
        
    $scope.toggleControl = function () {
        _cfg.controlToggler.slideToggle();
    }
        
    var loadContent = function (container, cached) {
        var linkingFunction = $compile(cached.html);
        container.append(linkingFunction($scope));
        angular.bootstrap(container[0], [ cached.ctrl ]);
    }

    var loadControl = function (cid) {
        _cfg.control.find("div:first").remove();
        var div = $("<div></div>").prependTo(_cfg.control);
        var cached = $scope.workspace._control_cache[cid];
        if (cached) {
            loadContent(div, cached);
        } else {
            var control = $scope.workspace.controls[cid];
            console.log(control);
            $ocLazyLoad.load($scope.workspace.baseUrl + control.script)
                .then(function (data) {
                    $http.get($scope.workspace.baseUrl + control.template)
                        .then(function (html) {
                            cached = {
                                title: control.title,
                                html: html.data,
                                ctrl: cid
                            };
                            loadContent(div, cached);
                            $scope.workspace._control_cache[cid] = cached;
                        });
                });
        }
    };
        
});
