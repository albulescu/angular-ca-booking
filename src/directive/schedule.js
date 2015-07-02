'use strict';

angular.module('ca.schedule')

.directive('schedule', function(){
    return {
        restrict : 'E',
        templateUrl: 'ca-schedule/directive/schedule.html',
        controller: 'BookingController',
        require: ['?^ngModel'],
        scope : { 
            from: '=?',
            to: '=?',
            userStep: '@step',
            userDate:'=date',
            availability:'=',
            callback:'&onCreateSlot',
            allowInterval:'=interval',
            allowScrolling:'=scrolling',
            bookingReady:'&ready'
        },
        link : function(scope, element, attr, ctrls) {
            if( ctrls.length ) {
                scope.ngModel = ctrls[0];
            }
        }
    };
});