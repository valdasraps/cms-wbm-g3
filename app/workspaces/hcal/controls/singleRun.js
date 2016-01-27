'use strict';

angular.module('SingleRun', []).controller('c1', function($scope) {
    
    $scope.runnumber = undefined;
    
    $scope.apply = function () {
        return { runnumber: $scope.runnumber };
    }
    
    $scope.cancel = function () {

    }
    
});