'use strict';

angular.module('module2', []).controller('c1', function($scope) {
    
    var count = 0;
    $scope.message = "Labas No" + count + "!";
    
    $scope.refresh = function (data) {
        $scope.count += 1;
    }
    
});
