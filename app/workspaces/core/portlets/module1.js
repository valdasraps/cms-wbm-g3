'use strict';

angular.module('WbmModule').controller('core-m1', function($scope) {
    
    $scope.count = undefined;
    
    $scope.$on('initPortlet', function(e) {
        $scope.count = 0;
    });

    $scope.$on('applyPortlet', function(e, data) {
        $scope.count = data.runnumber;
    });
    
});