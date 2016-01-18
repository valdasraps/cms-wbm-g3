'use strict';

var app = angular
    .module('LayoutModule', ['ui.bootstrap','oc.lazyLoad','LocalStorageModule'])
    .constant("_cfg", {
        workspacesPath: "workspaces/",
        workspacesFile: "workspaces.json",
        desktop: $("#__layout_desktop"),
        left: $('#__layout_left')
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

    $scope.paths = [];
    $scope.page = undefined;
    $scope.portlets = [];
    $scope.controls = [];
    $scope.layout = undefined;
    $scope.layoutEdit = false;

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

    var loadPage = function (path) {
        $scope.page = path;
        var root = $scope.layout.root;
        if (root.contentItems.length > 0) {
            root.contentItems[0].remove();
        }
        root.addChild(path.page.content);
    }

    $scope.editLayout = function () {
        $scope.layoutEdit = true;
        $scope.page.page.saved = angular.copy($scope.page.page.content);
        initLayout();
        loadPage($scope.page);
    }

    $scope.saveLayout = function () {
        $scope.layoutEdit = false;
        $scope.page.page.content = angular.copy($scope.layout.toConfig().content[0]);
        initLayout();
        loadPage($scope.page);
    }

    $scope.cancelLayout = function () {
        $scope.layoutEdit = false;
        $scope.page.page.content = $scope.page.page.saved;
        initLayout();
        loadPage($scope.page);
    }
    
    $scope.setPath = function (path, index) {
        $scope.paths[index].selected = path;
        $scope.paths = $scope.paths.slice(0, index + 1);
        if (path.children !== undefined && path.children.length > 0) {
            $scope.paths.push({ path: path, selected: undefined });
        }
        if (path.page !== undefined) {
            loadPage(path);
        }
    }

    $scope.setWorkspace = function (workspace) {
        console.log(workspace);
        $scope.workspace = workspace;
        workspace._cache = {};
        
        Promise.all([
            $http.get(_cfg.workspacesPath + workspace.base + workspace.pages),
            $http.get(_cfg.workspacesPath + workspace.base + workspace.controls),
            $http.get(_cfg.workspacesPath + workspace.base + workspace.portlets)
        ]).then(function (ret) {
            
            $scope.pages = ret[0].data;
            $scope.controls = ret[1].data;
            $scope.portlets = ret[2].data;
            
            $scope.paths.push({path: { children: $scope.pages}, selected: undefined});
            $scope.setPath($scope.pages[0], 0);

        });
    }

    $http.get(_cfg.workspacesPath + _cfg.workspacesFile).then(function (ret) {
        $scope.workspaces = ret.data;
        $scope.setWorkspace($scope.workspaces[0]);
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
            var cached = $scope.workspace._cache[state.portlet];
            if (cached) {
                loadPortlet(container, cached);
            } else {
                var portlet = $scope.portlets[state.portlet];
                var base = _cfg.workspacesPath + $scope.workspace.base;
                $ocLazyLoad.load(base + portlet.script)
                    .then(function (data) {
                        $http.get(base + portlet.template)
                            .then(function (html) {
                                cached = {
                                    title: portlet.title,
                                    html: html.data,
                                    ctrl: state.portlet
                                };
                                loadPortlet(container, cached);
                                $scope.workspace._cache[state.portlet] = cached;
                            });
                    });
            }
        });
        $scope.layout.init();
    }
    
    initLayout();
        
});
