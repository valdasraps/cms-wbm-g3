'use strict';

angular.module('WbmModule').controller('core-m2', function($scope) {
    
    $scope.count = undefined;
    
    $scope.$on('initPortlet', function(e) {
        $scope.count = 1000;
    });

    $scope.$on('applyPortlet', function(e, data) {
        $scope.count = data.runnumber;
    });
    
});
