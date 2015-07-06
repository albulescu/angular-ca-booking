'use strict';

angular.module('ca.schedule',['ca.schedule.templates'])

.controller('BookingController', function( $scope, $injector, $filter, $compile, $document, $timeout, $element, $log, ScheduleTime, MatrixTableFactory, TimeUtils ){

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

    $scope.slots = [];

    $scope.style = {};

    var table = $element.find('table:eq(0)');

    var tds=[];

    var selecting = false;

    var matrix = window.m = MatrixTableFactory();

    var Slot = function(date,from,to) {
        Object.defineProperty(this,"from",{"get":function(){
            return from;
        }});
        Object.defineProperty(this,"to",{"get":function(){
            return to;
        }});
        Object.defineProperty(this,"date",{"get":function(){
            return date;
        }});
    };

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

    var onNgModelController = function(ctrl){
        
        if(!ctrl)return;

        ctrl.$render = function(){
            $scope.slots = ngModel.$viewValue;
        };
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

    var renderSlots = function(){
        
        if(!angular.isArray($scope.slots) || !$scope.slots.length){
            return;
        }
        var tableRect = $element[0].getBoundingClientRect();
        var slots = $element.find('.slots .slot');

        for (var i = 0; i < $scope.slots.length; i++) {
            
            var tds = $scope.slots[i].tds;
            
            var topRect=tds[0][0].getBoundingClientRect();
            var bottomRect=tds[tds.length-1][0].getBoundingClientRect();

            slots.eq(i).css({
                'left' : topRect.left-tableRect.left,
                'top' : topRect.top-tableRect.top,
                'width' : bottomRect.width,
                'height' : bottomRect.top - topRect.top + bottomRect.height,
            });
        }
    }

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
     * Called when booking cell down to start interval selection process
     * @param  {Event}
     * @return {void}
     */
    $scope.onCellDown = function( event ) {

        if( angular.isDefined($scope.allowInterval) && $scope.allowInterval === false ) {
            $log.warn('Interval selection is disabled');
            return;
        }

        $scope.startCell = angular.element(event.currentTarget);

        if(isBooked($scope.startCell)){
            $log.warn('This slot already booked');
            return;
        }

        if(!isAvailable($scope.startCell)) {
            $log.warn('This slot is not a valid booking slot');
            $scope.startCell = null;
            return;
        }

        selecting = true;

        $scope.style.pointer = 'row-resize';

        $document.bind( 'mousemove', onCellMove );
        $document.bind( 'mouseup', onCellUp );
    };

    /**
     * Mouse move event to calculate path from one hour to another in interval selection mode
     * @param  {Event}
     * @return {void}
     */
    var onCellMove = function(event) {

        var cell = angular.element(event.originalEvent.target);

        if(!$scope.startCell) {
            throw new Error("Listening on moving event without starting point.");
        }

        if( !isAvailable(cell) ||
            !onSlot(event) ){
            $log.warn('Moving on invalid slot cell');
            return;
        }

        $scope.interval = true;

        var startIndex = $scope.startCell.parent().index();
        var endIndex = cell.parent().index();

        if(startIndex === endIndex){
            return;
        }

        console.log(startIndex+'-'+endIndex);

        var canSelect = true, from, to;

        for (var i = 0; i < tds.length; i++) {
            tds[i].removeClass('schedule-cell-selecting');
        }

        tds = [];

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
                var td = angular.element(tr).find('td').eq($scope.startCell.index());
                
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
            tds[i].addClass('schedule-cell-selecting');
        }
    };


    /**
     * Trigged on mouse up event
     * @param  {Event}
     * @return {void}
     */
    var onCellUp = function(event) {
        
        selecting=false;
        
        if(!$scope.interval) {
            return;
        }
        
        var cell = angular.element(event.originalEvent.target);
        
        if( $scope.startCell[0] === cell[0]) {  
            return;
        }

        $document.unbind( 'mousemove', onCellMove );
        $document.unbind( 'mouseup', onCellUp );

        if(!onSlot(event) || !pendingSlotIsFree()){
            cleanPendingSlot();
            return;
        }

        if(!isAvailable(cell)) {
            return;
        }

        var date = $scope.dates[ $scope.startCell.index() - 1 ];
        
        trigger( date, JSON.parse($scope.startCell.data('time')), getCellEndTime(cell) );

        $scope.startCell = null;

        $scope.interval = false;
    };

    var onSlotHover = function(index){

        if( selecting ){
            return;
        }

        for (var i = 0; i < $scope.slots[index]['tds'].length; i++) {
            $scope.slots[index]['tds'][i].addClass('slot-hover');
        }
    };

    var onSlotOut = function(index){

        if( selecting ){
            return;
        }

        for (var i = 0; i < $scope.slots[index]['tds'].length; i++) {
            $scope.slots[index]['tds'][i].removeClass('slot-hover');
        }
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

        var slot = new Slot(date,from,to);

        ($scope.callback || angular.noop)({
            $slot : slot
        });

        if( $scope.ngModel ){
            $scope.ngModel.$setViewValue($data.slots);
        }

        setPendingSlotDone(slot, $scope.slots.length);

        $scope.slots.push(slot);

        $scope.$digest();

        return $scope.slots.length - 1;
    };

    var isBooked = function(cell){
        return angular.element(cell).hasClass('schedule-cell-selected');
    };

    var isAvailable = function(cell){
        return angular.element(cell).hasClass('available');
    };

    var pendingSlotIsFree = function(){
        
        for (var i = 0; i < tds.length; i++) {
            if( isBooked(tds[i]) ){
                return false;
            }
        }

        return true;
    };

    var onSlot = function( event ){

        var cell = event.originalEvent.target;
        var celle = angular.element(cell);

        if( cell.nodeName != 'TD' ||
            !celle.hasClass('schedule-cell')){
            return false;
        }

        var parents = celle.parents();

        if(parents.index(cell.parent) == -1){
            return false;
        }

        return true;
    };

    var cleanPendingSlot = function(){
        for (var i = 0; i < tds.length; i++) {
            tds[i].removeClass('schedule-cell-selecting');
        }
        tds=[];
    };

    var setPendingSlotDone = function( slot, index ){
        for (var i = 0; i < tds.length; i++) {
            tds[i].removeClass('schedule-cell-selecting')
                  .addClass('schedule-cell-selected')
                  .data('slot-index', index);
        }
        slot.tds=tds;
        tds=[];
    };

    var enableMouseScrolling = function() {
        table.bind('mousewheel', function(event){
            
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

    /**
     * Called when booking cell over
     * @param  {Event}
     * @return {void}
     */
    $scope.cellover = function( event ) {
        var cell = angular.element(event.currentTarget);

        if( typeof(cell.data('slot-index')) != 'undefined' ){
            onSlotHover(cell.data('slot-index'));
        }

        if(!cell.hasClass('available')){ return; }

        cell.addClass('cell-hover');

        cell.parent().first().addClass('info-cell-highlight');
        var daterows = table.find('.date-row');
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

        if( typeof(cell.data('slot-index')) != 'undefined' ){
            onSlotOut(cell.data('slot-index'));
        }

        cell.removeClass('cell-hover');

        if(!cell.hasClass('available')){ return; }
        cell.parent().first().removeClass('info-cell-highlight');
        var daterows = table.find('.date-row');
        daterows.eq(0).find('td').eq( cell.index() ).removeClass('info-cell-highlight');
        daterows.eq(1).find('td').eq( cell.index() ).removeClass('info-cell-highlight');
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

        if(isBooked(cell) || !isAvailable(cell)) {
            return;
        }

        if( angular.isDefined( cell.data('tipScope') ) ) {
            //hack angular bootstrap tip to close when book click
            cell.data('tipScope').$broadcast('$locationChangeSuccess');
        }

        cell.addClass('schedule-cell-selected');

        $document.unbind( 'mousemove', onCellMove );
        $document.unbind( 'mouseup', onCellUp );

        tds.push(cell);

        trigger(date, time, getCellEndTime(cell));
    };

    $scope.init = function() {

        $log.debug('Init booking widget');

        $scope.$watch('step', updateHours);
        $scope.$watch('userStep', function(scale){
            if(!scale){
                return;
            }
            matrix.scale = scale;
        });
        $scope.$watch('userDate', onUserDateChanged);
        $scope.$watchCollection('slots', function(){
            $timeout(renderSlots)
        });
        $scope.$watch('availability', onAvailabilityChange);

        $scope.$watch('ngModel', onNgModelController);

        if($scope.allowScrolling) {
            enableMouseScrolling();
        }

        matrix.on('matrixValidated', function(){
            $element.html('').append(matrix.table);
        });

        var date = new Date();
        date.setDate(date.getDate()+1);

        matrix.availability = [{
            date:new Date(),
            slots:[[0,1380]]
        },{
            date:date,
            slots:[[0,1380]]
        },];

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