angular.module('demo', ['ca.schedule'])

.controller('DemoScheduleController', function($scope){

    $scope.userStep = 60;
    
    $scope.slots = null;
    $scope.ready = function() {
        console.log('Booking read');
    };

    
    $scope.onSchedule = function( event ) {
        console.log('Book from ' + event.from + ' to ' + event.to + ' in date ' + event.date);
    };
});