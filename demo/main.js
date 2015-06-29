angular.module('demo', ['ca.schedule'])


.controller('DemoScheduleController', function($scope){

    $scope.userStep = '30m';
    
    $scope.init = function() {
        console.log('init');
    };

    $scope.ready = function() {
        console.log('Booking read');
    };

    
    $scope.onSchedule = function( event ) {
        alert('Book from ' + event.from + ' to ' + event.to + ' in date ' + event.date);
    };
});