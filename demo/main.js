angular.module('demo', ['ca.schedule','ca.console'])

.config(function($consoleProvider) {
    $consoleProvider.overrideBrowserConsole();
})

.controller('DemoScheduleController', function($scope, $console){

    $scope.init = function() {
        $console.show();
    };

    $scope.ready = function() {
        console.log('Booking read');
    };

    
    $scope.onSchedule = function( event ) {
        console.log('Book from ' + event.from + ' to ' + event.to + ' in date ' + event.date);
    };
});