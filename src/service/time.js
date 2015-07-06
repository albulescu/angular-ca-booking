'use strict';

angular.module('ca.schedule')

.factory('DateUtils', function(){
    /*
     * Date Format 1.2.3
     * (c) 2007-2009 Steven Levithan <stevenlevithan.com>
     * MIT license
     *
     * Includes enhancements by Scott Trenda <scott.trenda.net>
     * and Kris Kowal <cixar.com/~kris.kowal/>
     *
     * Accepts a date, a mask, or a date and a mask.
     * Returns a formatted version of the given date.
     * The date defaults to the current date/time.
     * The mask defaults to dateFormat.masks.default.
     */

    var dateFormat = function () {
        var token = /d{1,4}|m{1,4}|yy(?:yy)?|([HhMsTt])\1?|[LloSZ]|"[^"]*"|'[^']*'/g,
            timezone = /\b(?:[PMCEA][SDP]T|(?:Pacific|Mountain|Central|Eastern|Atlantic) (?:Standard|Daylight|Prevailing) Time|(?:GMT|UTC)(?:[-+]\d{4})?)\b/g,
            timezoneClip = /[^-+\dA-Z]/g,
            pad = function (val, len) {
                val = String(val);
                len = len || 2;
                while (val.length < len) val = "0" + val;
                return val;
            };

        // Regexes and supporting functions are cached through closure
        return function (date, mask, utc) {
            var dF = dateFormat;

            // You can't provide utc if you skip other args (use the "UTC:" mask prefix)
            if (arguments.length == 1 && Object.prototype.toString.call(date) == "[object String]" && !/\d/.test(date)) {
                mask = date;
                date = undefined;
            }

            // Passing date through Date applies Date.parse, if necessary
            date = date ? new Date(date) : new Date;
            if (isNaN(date)) throw SyntaxError("invalid date");

            mask = String(dF.masks[mask] || mask || dF.masks["default"]);

            // Allow setting the utc argument via the mask
            if (mask.slice(0, 4) == "UTC:") {
                mask = mask.slice(4);
                utc = true;
            }

            var _ = utc ? "getUTC" : "get",
                d = date[_ + "Date"](),
                D = date[_ + "Day"](),
                m = date[_ + "Month"](),
                y = date[_ + "FullYear"](),
                H = date[_ + "Hours"](),
                M = date[_ + "Minutes"](),
                s = date[_ + "Seconds"](),
                L = date[_ + "Milliseconds"](),
                o = utc ? 0 : date.getTimezoneOffset(),
                flags = {
                    d:    d,
                    dd:   pad(d),
                    ddd:  dF.i18n.dayNames[D],
                    dddd: dF.i18n.dayNames[D + 7],
                    m:    m + 1,
                    mm:   pad(m + 1),
                    mmm:  dF.i18n.monthNames[m],
                    mmmm: dF.i18n.monthNames[m + 12],
                    yy:   String(y).slice(2),
                    yyyy: y,
                    h:    H % 12 || 12,
                    hh:   pad(H % 12 || 12),
                    H:    H,
                    HH:   pad(H),
                    M:    M,
                    MM:   pad(M),
                    s:    s,
                    ss:   pad(s),
                    l:    pad(L, 3),
                    L:    pad(L > 99 ? Math.round(L / 10) : L),
                    t:    H < 12 ? "a"  : "p",
                    tt:   H < 12 ? "am" : "pm",
                    T:    H < 12 ? "A"  : "P",
                    TT:   H < 12 ? "AM" : "PM",
                    Z:    utc ? "UTC" : (String(date).match(timezone) || [""]).pop().replace(timezoneClip, ""),
                    o:    (o > 0 ? "-" : "+") + pad(Math.floor(Math.abs(o) / 60) * 100 + Math.abs(o) % 60, 4),
                    S:    ["th", "st", "nd", "rd"][d % 10 > 3 ? 0 : (d % 100 - d % 10 != 10) * d % 10]
                };

            return mask.replace(token, function ($0) {
                return $0 in flags ? flags[$0] : $0.slice(1, $0.length - 1);
            });
        };
    }();

    // Some common format strings
    dateFormat.masks = {
        "default":      "ddd mmm dd yyyy HH:MM:ss",
        shortDate:      "m/d/yy",
        mediumDate:     "mmm d, yyyy",
        longDate:       "mmmm d, yyyy",
        fullDate:       "dddd, mmmm d, yyyy",
        shortTime:      "h:MM TT",
        mediumTime:     "h:MM:ss TT",
        longTime:       "h:MM:ss TT Z",
        isoDate:        "yyyy-mm-dd",
        isoTime:        "HH:MM:ss",
        isoDateTime:    "yyyy-mm-dd'T'HH:MM:ss",
        isoUtcDateTime: "UTC:yyyy-mm-dd'T'HH:MM:ss'Z'"
    };

    // Internationalization strings
    dateFormat.i18n = {
        dayNames: [
            "Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat",
            "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"
        ],
        monthNames: [
            "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
            "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"
        ]
    };

    return {
        format: function(date, format, utc){
            return dateFormat(date, format, utc)
        },
        isToday: function(date){
            return this.equals(date, new Date());
        },
        equals:function(a, b){
            return a.getDate() === b.getDate() && 
                   a.getMonth() === b.getMonth() &&
                   a.getYear() === b.getYear();
        }
    };
})
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
        var cache = {};
        var zeroFill = function(n) {
            return (n < 10) ? ('0'+n) : n;
        };

        this.format = function( format ) {
            
            var key = format;

            if( cache[key] ){
                return cache[key];
            }

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

            cache[key]=format;

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
