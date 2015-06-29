'use strict';

angular.module('ca.schedule',['ca.schedule.templates'])

.controller('BookingController', function( $scope, $injector, $filter, $compile, $document, $timeout, $element, $log, ScheduleTime, TimeUtils ){

    var self = this;

    /**
     * Current date to show week in calendar
     * @type {Date}
     */
    $scope.date  = new Date();

    /**
     * Day names
     * @type {String[]}
     */
    $scope.days  = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

    /**
     * Days to repeat in calendar table
     * @type {Date}
     */
    $scope.dates = [];

    /**
     * Hours to repeat in calendar
     * @type {Array}
     */
    $scope.hours = [];

    /**
     * Hour from
     * @type {Number}
     */
    $scope.from  = 0;

    /**
     * Hour to
     * @type {Number}
     */
    $scope.to    = 23;

    /**
     * Hours interval. Default 30 minutes
     * @type {Number}
     */
    $scope.step  = 30;

    /**
     * ngModel controller
     * @type {[type]}
     */
    $scope.ngModel = null;

    /**
     * Starting cell when interval select
     * @type {[type]}
     */
    $scope.startCell = null;

    /**
     * Interval selection is in progress
     * @type {Boolean}
     */
    $scope.interval = false;

    $scope.useAmPm = true;

    /**
     * Updates hours array used in ng-repeat
     * @return {void}
     */
    var updateHours = function() {

        if( $scope.from > $scope.to ) {
            return $log.error('From need to be lower than to');
        }

        var hourList = [];

        var from = $scope.from * 60,
            to = $scope.to * 60;

        for (var i = from; i <= to; i += $scope.step) {
            hourList.push( new ScheduleTime( i, $scope.step ) );
        }

        $scope.hours = hourList;
    };

    /**
     * Update dates in calendar used in ng-repeat
     * @param  {Boolean} Set to true to shift with one days
     * @return {void}
     */
    var updateWeek = function( scroll ) {
        
        var date = $scope.date;

        var day = date.getDay() === 0 ? 6 : (date.getDay() - 1);

        if( angular.isUndefined(scroll) ) {
            date.setDate( date.getDate() - day );
        }

        var dates = [];

        for (var i = 0; i < 7; i++) {
            var loop = new Date( date.getTime() );
            loop.setDate( date.getDate() + i );
            dates.push( loop );
        }

        $scope.dates = dates;
    };


    /**
     * When date attribute from <booking> is changed
     * @param  {String|Date}
     * @return {void}
     */
    var onUserDateChanged = function( udate ) {

        if( angular.isUndefined(udate) ) {
            return;
        }

        var date = new Date(udate);

        if( isNaN(date.getTime()) ) {
            $log.warn('[BOOKING] date attribute "'+udate+'" is invalid. A date string required.');
            return;
        }
        
        $scope.date = date;

        updateWeek();
    };


    /**
     * When step attribute changed evaluate expression to find minutes
     * @param  {String}
     * @return {String}
     */
    var onUserStepChanged = function( ustep ) {
        
        if( angular.isUndefined(ustep) ) {
            return;
        }

        clearSelection();

        var reg = /^(\d+)(h|m)$/;
        var minutes = 0;
        var step;

        if( reg.test(ustep) ) {
            
            var match = ustep.match(reg);
            
            minutes = match[1];

            if( match[2] === 'h' ) {
                minutes *= 60;
            }

            if( minutes > 360 ) {
                $log.warn('step is to large, use maximum 6h.');
                return;
            }

            if( 60 % minutes !== 0 &&  60 % minutes !== 60 ) {
                $log.warn('step must be divisible with 60. Use 10m, 15m, 30m, 1h');
                return;
            }

            step = parseInt(minutes, 10);

            if(!isNaN(step)) {
                $scope.step = step;
            }

            $log.debug('Step changed to', minutes, 'minutes');
        }
        else if( angular.isNumber(ustep)) {

            if( 60 % ustep !== 0 &&  60 % ustep !== 60 ) {
                $log.warn('step must be divisible with 60. Received:', ustep);
                return;
            }

            step = parseInt(minutes, 10);

            if(!isNaN(step)) {
                $scope.step = step;
            }

            $log.debug('Step changed to', minutes, 'minutes');
        }
        else {
            $log.warn('Invalid step expression: Example: 1h, 30m Received:', ustep);
        }
    };


    /**
     * Add availability class on root element when defiend
     * @param  {Array}
     * @return {void}
     */
    var onAvailabilityChange = function( availability ) {

        if(!availability) {
            return;
        }

        $log.debug('Availability changed to:', availability);

        $element.find('table').addClass('has-availability');
    };

    /**
     * Setup apparence of available slot
     * @param  {DOMNode} td element
     * @param  {Date}
     * @param  {Object}
     * @return {void}
     */
    this.setupAvailableSlot = function(element, date, time, attributes) {
        
        element.addClass('available');
        
        var dateFilter = $filter('date');

        var tiptext = dateFilter(date,'Y-d-m') + ' from ' + time + ' to ' + time.to;

        if( angular.isDefined(attributes) && $injector.has('$tooltip') ) {
            
            var tipScope = $scope.$new();

            attributes.$set('popoverTrigger','mouseenter');
            attributes.$set('popover', tiptext);
            attributes.$set('popoverAppendToBody', 'true');
            attributes.$set('popoverAnimation', 'false');

            var tooltip = $injector.get('$tooltip');
            var tooltipc = tooltip( 'popover', 'popover', 'mouseenter' ).compile;
            var link = tooltipc( element, attributes );
            
            link( tipScope, element, attributes );

            element.data('tipScope', tipScope);

        } else {
            element.attr('title', tiptext);
        }
    };

    /**
     * Check if time is in the timeframe
     */
    this.timeAvailable = function( hours, time ) {

        if(!hours.length) {
            return;
        }

        if( angular.isArray(hours[0]) ) {
            for(var i = 0; i < hours.length; i++) {
                if(hours[i][0] <= time && hours[i][1] > time) {
                    return true;
                }
            }
        }

        else if( hours.length === 2 && hours[0] <= time && hours[1] > time ) {
            return true;
        }

        return false;
    };

    /**
     * Mouse move event to calculate path from one hour to another in interval selection mode
     * @param  {Event}
     * @return {void}
     */
    var onBookMove = function(event) {

        var cell = angular.element(event.originalEvent.target);

        if(!cell.hasClass('schedule-cell') || !$scope.startCell || !cell.hasClass('available')) {
            return;
        }

        $scope.interval = true;

        var startIndex = $scope.startCell.parent().index();
        var endIndex = cell.parent().index();

        var table = cell.parents('table:eq(0)');

        table.find('.schedule-cell-selected').removeClass('schedule-cell-selected');

        var tds = [], canSelect = true, from, to;

        table.find('tr').each(function(index, tr){

            if( startIndex > endIndex ) {
                from = endIndex;
                to = startIndex;
            } else {
                from = startIndex;
                to = endIndex;
            }

            if( index >= from && index <= to ) {
                
                //take td
                var td = angular.element(tr).find('td').eq(cell.index());
                
                //add selected td
                tds.push(td);

                if(!td.hasClass('available')) {
                    canSelect = false;
                    return false;
                }
            }
        });

        if(!canSelect) {
            return false;
        }

        for (var i = 0; i < tds.length; i++) {
            tds[i].addClass('schedule-cell-selected');
        }
    };

    /**
     * Trigged on mouse up event
     * @param  {Event}
     * @return {void}
     */
    var onCellUp = function(event) {
        
        if(!$scope.interval) {
            return;
        }
        
        var cell = angular.element(event.originalEvent.target);
        
        if( $scope.startCell[0] === cell[0]) {
            return;
        }

        $document.unbind( 'mousemove', onBookMove );
        $document.unbind( 'mouseup', onCellUp );

        if(!cell.hasClass('available')) {
            return clearSelection();
        }

        var date = $scope.dates[ $scope.startCell.index() - 1 ];
        
        trigger( date, JSON.parse($scope.startCell.data('time')), getCellEndTime(cell) );

        $scope.startCell = null;

        $scope.interval = false;

    };

    /**
     * Trigger booking
     * @param  {Date}
     * @param  {Time}
     * @param  {Time}
     * @return {void}
     */
    var trigger = function(date, from, to) {

        var data = {
            date: date,
            from: from,
            to: to || null
        };

        ($scope.callback || angular.noop)({
            $data : data,
            $event : data
        });
    };

    /**
     * Clear booking selection
     * @return {void}
     */
    var clearSelection = function() {
        $element.find('.schedule-cell-selected')
                .removeClass('schedule-cell-selected');
    };

    var enableMouseScrolling = function() {
        $element.find('table').bind('mousewheel', function(event){
            
            event.preventDefault();
            
            if( event.originalEvent.wheelDelta > 9) {
                $scope.date.setDate($scope.date.getDate() + 1);
            }else{
                $scope.date.setDate($scope.date.getDate() - 1);
            }

            $timeout(function(){
                updateWeek(true);
            });

            $scope.$digest();
        });
    };

    var getCellEndTime = function(cell){
        var time = JSON.parse(cell.data('time'));
        return TimeUtils.addTime(time, $scope.step);
    };

    //Expose clearing method to controller instance
    this.clear = clearSelection;

    /**
     * Called when booking cell over
     * @param  {Event}
     * @return {void}
     */
    $scope.cellover = function( event ) {
        var cell = angular.element(event.currentTarget);
        if(!cell.hasClass('available')){ return; }
        cell.parent().first().addClass('info-cell-highlight');
        var daterows = cell.parents('table').find('.date-row');
        daterows.eq(0).find('td').eq( cell.index() ).addClass('info-cell-highlight');
        daterows.eq(1).find('td').eq( cell.index() ).addClass('info-cell-highlight');
    };

    /**
     * Called when booking cell out
     * @param  {Event}
     * @return {void}
     */
    $scope.cellout = function( event ) {
        var cell = angular.element(event.currentTarget);
        if(!cell.hasClass('available')){ return; }
        cell.parent().first().removeClass('info-cell-highlight');
        var daterows = cell.parents('table').find('.date-row');
        daterows.eq(0).find('td').eq( cell.index() ).removeClass('info-cell-highlight');
        daterows.eq(1).find('td').eq( cell.index() ).removeClass('info-cell-highlight');
    };

    /**
     * Called when booking cell down to start interval selection process
     * @param  {Event}
     * @return {void}
     */
    $scope.celldown = function( event ) {

        if( angular.isDefined($scope.allowInterval) && $scope.allowInterval === false ) {
            $log.debug('Interval selection is disabled');
            return;
        }

        $scope.startCell = angular.element(event.currentTarget);

        if(!$scope.startCell.hasClass('available')) {
            return;
        }

        $document.bind( 'mousemove', onBookMove );
        $document.bind( 'mouseup', onCellUp );
    };

    /**
     * Book method to call from each booking cell
     * @param  {Event}
     * @param  {Date}
     * @param  {Time}
     * @return {void}
     */
    $scope.book = function(event, date, time) {

        var cell = angular.element(event.originalEvent.target);

        if(!cell.hasClass('available')) {
            return;
        }

        if( angular.isDefined( cell.data('tipScope') ) ) {
            //hack angular bootstrap tip to close when book click
            cell.data('tipScope').$broadcast('$locationChangeSuccess');
        }


        clearSelection();

        cell.addClass('schedule-cell-selected');

        $document.unbind( 'mousemove', onBookMove );
        $document.unbind( 'mouseup', onCellUp );

        trigger(date, time, getCellEndTime(cell));
    };

    $scope.init = function() {

        $log.debug('Init booking widget');

        $scope.$watch('step', updateHours);
        $scope.$watch('userStep', onUserStepChanged);
        $scope.$watch('userDate', onUserDateChanged);

        $scope.$watch('availability', onAvailabilityChange);


        if($scope.allowScrolling) {
            enableMouseScrolling();
        }

        updateWeek();

        updateHours();

        ($scope.bookingReady || angular.noop)({
            $instance : self,
            $scope : $scope
        });
    };

    //Expose public stuff to controller instance
    this.$scope = $scope;
    this.$element = $element;
});