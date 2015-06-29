'use strict';

angular.module('ca.schedule')

.factory('TimeUtils', function(){
    return {
        zeroFill: function(n) {
            return (n < 10) ? ('0'+n) : n;
        },
        addTime: function(to,mins){
            return this.toString(this.toMinutes(to)+mins);
        },
        toString: function(minutes){
            return this.zeroFill(Math.floor(minutes/60)) +':'+this.zeroFill(minutes % 60);
        },
        toMinutes: function(time){
            if(time.length != 5){
                throw new Error("Invalid time string length");
            }
            if(!(time||"").match(/^([0-9]+):([0-9]+)$/)){
                throw new Error("Invalid time string");
            }
            var p=time.split(':');
            return parseInt(p[0],10) * 60 + parseInt(p[1],10);
        }
    };
})

.factory('ScheduleTime', function() {

    /**
     * ScheduleTime class
     */
    var ScheduleTime = function( mins, step ) {

        step = step || 60;
        var minutes = mins;
        var self    = this;

        var zeroFill = function(n) {
            return (n < 10) ? ('0'+n) : n;
        };

        this.format = function( format ) {
            
            /**
             * h = 0-12
             * H = 0-24
             * m = 0-59
             * p = pm | am
             * P = PM | AM
             */
            
            format = format || 'H:M';

            var hours = Math.floor(minutes/60), m = minutes % 60;

            format = format.replace('h', hours > 12 ? zeroFill(hours-12) : zeroFill(hours));
            format = format.replace('H', zeroFill(hours));
            format = format.replace('m', zeroFill(m));
            format = format.replace('M', zeroFill(m));
            format = format.replace('p', hours >= 12 ? 'pm' : 'am');
            format = format.replace('P', hours >= 12 ? 'PM' : 'AM');

            return format;
        };

        this.equal = function( time ) {
            return mins === time.minutes;
        };

        this.updateDate = function( date ) {

            if(!angular.isDate(date)) {
                throw new Error('Date param should be date!');
            }

            var hours = parseInt(this.format('H'), 10);
            var minutes = parseInt(this.format('m'), 10);

            date.setHours( hours, minutes, 0 );
        };

        Object.defineProperty(this, 'minutes', {
            'get': function() {
                return minutes;
            }
        });

        Object.defineProperty(this, 'sharp', {
            'get': function() {
                return ( ( minutes - step ) % 60 ) === 0;
            }
        });

        Object.defineProperty(this, 'to', {
            'get': function() {
                return new ScheduleTime(minutes+step);
            }
        });

        Object.defineProperty(this, 'nice', {
            'get': function() {
                return self.format('H:m');
            }
        });


        this.toString = function() {
            return this.format();
        };

        this.toJSON = function() {
            return this.format();
        };
    };

    return ScheduleTime;

});
