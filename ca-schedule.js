/**
* Schedule AngularJS Module v1.0.0
* https://github.com/albulescu/angular-ca-schedule
*
* Author Albulescu Cosmin <cosmin@albulescu.ro>
* Licensed under the MIT license.
*/

'use strict';

angular.module('ca.schedule.templates', []).run(['$templateCache', function($templateCache) {
$templateCache.put('ca-schedule/directive/schedule.html',
    "<div class=ca-schedule ng-init=init()><div class=slots><div ng-repeat=\"slot in slots\" class=slot>dsfsdf {{slot.date}}</div></div><!-- <table cellspacing=\"0\" cellpading=\"0\" ng-style=\"style\">\n" +
    "        <tr class=\"date-row\">\n" +
    "            <td class=\"info-cell empty-cell\"></td>\n" +
    "            <td class=\"info-cell date-cell\" ng-repeat=\"day in days\">{{day}}</td>\n" +
    "        </tr>\n" +
    "        <tr class=\"date-row\">\n" +
    "            <td class=\"info-cell empty-cell\"></td>\n" +
    "            <td class=\"info-cell date-cell\" ng-repeat=\"date in dates\">{{date|date}}</td>\n" +
    "        </tr>\n" +
    "        <tr ng-repeat=\"time in hours track by time.minutes\" ng-class=\"{'not-sharp':!time.sharp}\">\n" +
    "            <td class=\"info-cell time-cell\">{{time.nice}}</td>\n" +
    "            <td schedule-slot=\"[date, time]\"\n" +
    "                data-time=\"{{time}}\"\n" +
    "                ng-repeat=\"date in dates\"\n" +
    "                ng-click=\"book($event,date,time)\"\n" +
    "                hover-class=\"schedule-cell-hover\"\n" +
    "                class=\"schedule-cell\" \n" +
    "                ng-mouseover=\"cellover($event)\"\n" +
    "                ng-mouseout=\"cellout($event)\"\n" +
    "                ng-mousedown=\"onCellDown($event)\">\n" +
    "            </td>\n" +
    "        </tr>\n" +
    "    </table> --></div>"
  );

}]);


angular.module('ca.schedule',['ca.schedule.templates'])

.controller('BookingController', ["$scope", "$injector", "$filter", "$compile", "$document", "$timeout", "$element", "$log", "ScheduleTime", "MatrixTableFactory", "TimeUtils", function( $scope, $injector, $filter, $compile, $document, $timeout, $element, $log, ScheduleTime, MatrixTableFactory, TimeUtils ){

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

        matrix.scale = 60;

        var date = new Date();
        date.setDate(date.getDate()+1);

        if(0){
            matrix.availability = [{
                date:new Date(),
                slots:[[0,1380]]
            },{
                date:date,
                slots:[[0,1380]]
            },];
        }

        matrix.on('book', function(book){
            console.log(book);
        });

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
}]);

angular.module('ca.schedule')

.directive('schedule', function(){
    return {
        restrict : 'E',
        replace:true,
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

angular.module('ca.schedule')

.directive('scheduleSlot', ["$parse", function( $parse ){

    return {
        restrict : 'A',
        require: ['^schedule'],
        link: function(ngRepeatScope, element, attributes, controllers) {
            
            var schedule = controllers[0],
                availability = schedule.$scope.availability,
                slot = $parse(attributes.scheduleSlot)(ngRepeatScope),
                date = slot[0],
                time = slot[1];
            
            if(!availability || !angular.isArray(availability)) {
                return schedule.setupAvailableSlot(element, date, time, attributes);
            }

            for (var i = 0; i < availability.length; i++) {
                var av = availability[i];
                if( av.date.format('Y-d-m') === date.format('Y-d-m') && 
                    schedule.timeAvailable(av.hours, time.minutes) ) {
                    //add available class                    
                    schedule.setupAvailableSlot(element, date, time, attributes);
                    break;
                }
            }
        }
    };
}]);


angular.module('ca.schedule')

.factory('MatrixTableFactory', ["DateUtils", "TimeUtils", function(DateUtils, TimeUtils){

    var ValidationDecorator = function( instance, name, validate ){
        
        name = name.charAt(0).toUpperCase() + name.substr(1);

        var validated=false;
        var interval=null;

        this.validate = instance['validate'+name] = function(){
            if( validated ){
                return;
            }
            validate();
            validated=true;
            instance.emit(name.toLowerCase()+'Validated');
        };

        this.invalidate = instance['invalidate'+name] = function(){
            validated=false;
            clearTimeout(interval);
            interval=setTimeout(instance['validate'+name].bind(instance));
        };
    };

    var MatrixTable = function(){

        var self        = this;
        var date        = new Date();
        var today       = new Date();
        var matrix      = [];
        var scale       = 60;
        var table       = null;
        var events      = {};
        var validators  = [];
        var dateFormat  = "dddd<br/>dd-m-yy";

        var availability=null;
        var slots=[];

        var scrollable=true;
        var scrolling=false;
        var scrollingInterval=null;
        var weekScroll=false;

        var selecting=false;
        var selectingFirstSlot;

        Object.defineProperty(this, 'table', {
            get:function(){ return table; }
        });

        Object.defineProperty(this, 'scale', {
            get:function(){ return scale; },
            set:function(value){
                
                if(value%10!==0){
                    throw new Error('Ivalid time scale');
                }

                scale=parseInt(value,10);

                self.invalidateMatrix();
            }
        });

        Object.defineProperty(this, 'weekScroll', {
            get:function(){ return weekScroll; },
            set:function(value){ weekScroll=value; }
        });

        Object.defineProperty(this, 'availability', {
            get:function(){ return availability; },
            set:function(value){ availability=value; self.invalidateAvailability();}
        });

        Object.defineProperty(this, 'slots', {
            get:function(){ return slots; },
            set:function(value){ slots=value; self.invalidateSlots();}
        });

        var forwardSlotEvent = function(name){
            return function(event){
                self.emit('slot.'+name, event);
            };
        };

        var onTableScroll = function(event){
            
            if(!scrollable){
                return;
            }

            scrolling=true;

            event.preventDefault();
            
            if( event.wheelDelta > 9) {
                date.setDate(date.getDate() + (weekScroll?7:1));
            }else{
                date.setDate(date.getDate() - (weekScroll?7:1));
            }

            self.invalidateDates();
            self.invalidateAvailability();
            self.invalidateSlots();


            clearTimeout(scrollingInterval);
            scrollingInterval = setTimeout(function(){
                scrolling=false;
            },1000);
        };

        var validateMatrix = function(){

            if( table && table.dataset.scale && 
                table.dataset.scale === scale ){
                return;
            }

            var m=[];
            var tbl = document.createElement('table');

            tbl.dataset.scale = scale;

            for (var i = 0; i < (60/scale*24)+1; i++)
            {
                var tr = document.createElement('tr');
                var j,td;

                m[i]=[];

                if( i === 0 )
                {

                    var head = document.createElement('thead');
                    var headRow = document.createElement('tr');

                    m[i].push(head);
                    
                    for (j = 0; j < 8; j++) {
                        td = document.createElement('th');
                        m[i][j]=td;
                        headRow.appendChild(td);
                    }

                    head.appendChild(headRow);
                    tbl.appendChild(head);

                    continue;
                }

                for (j = 0; j < 8; j++) {

                    td = document.createElement('td');
                    m[i][j] = td;
                    tr.appendChild(td);

                    if( j===0 ){

                        td.className='time';
                        var summinutes = (i-1)*scale;
                        var hours =  TimeUtils.zeroFill(Math.floor(summinutes / 60));
                        var minutes = TimeUtils.zeroFill(summinutes % 60);

                        if( minutes == "00" && scale < 60) {
                            tr.className='nsharp';
                        }

                        m[i][0].innerHTML=hours+':'+minutes;

                        continue;
                    }
                    
                    td.className = 'slot';
                    td.dataset.x=i;
                    td.dataset.y=j;

                    td.addEventListener('mouseover', forwardSlotEvent('mouseover'));
                    td.addEventListener('mouseout',  forwardSlotEvent('mouseout'));
                    td.addEventListener('mousedown',  forwardSlotEvent('mousedown'));
                    td.addEventListener('click',  forwardSlotEvent('click'));
                }

                tbl.appendChild(tr);
            }

            matrix=m;
            table=tbl;

            table.addEventListener('mousewheel', onTableScroll);

            self.invalidateDates();
            self.invalidateAvailability();

            console.log('Matrix validated');
        };
        
        var validateDates=function(){

            var i,j;

            angular.element(table).find('.today').removeClass('today');

            //setup header
            var day = date.getDay() === 0 ? 6 : (date.getDay() - 1);
            
            if(!scrolling){
                date.setDate( date.getDate() - day );
            }

            for (i = 0; i < 7; i++) {
                var loop = new Date( date.getTime() );
                loop.setDate( date.getDate() + i );
                matrix[0][i+1].innerHTML=DateUtils.format(loop, dateFormat);
                matrix[0][i+1].dataset.date = loop;
                if( DateUtils.isToday(loop) ){
                    angular.element(matrix[0][i+1]).addClass('today');
                }
            }

            console.log('Dates validated');
        };

        var validateAvailability = function(){

            var x,y,z,i;
            
            angular.element(table).find('.available').removeClass('available');

            if(!matrix.length || !availability){
                return;
            }

            for (x = 0; x < availability.length; x++) {
                for (y = 1; y < 8; y++) {
                    if(DateUtils.equals(new Date(matrix[0][y].dataset.date), availability[x].date)){
                        var slots = angular.copy(availability[x].slots);
                        for (z = 1; z < matrix.length; z++) {
                            for (i = 0; i < slots.length; i++) {
                                var ctime = (z-1)*scale;
                                if( ctime >= slots[i][0] && ctime < slots[i][1]){
                                    angular.element(matrix[z][y]).addClass('available');
                                    if( ctime>=slots[i][1] ){
                                        slots.splice(i,1);
                                    }
                                }
                            }
                        }
                        break;
                    }
                }
            }

        };

        var validateSlots = function(){

            angular.element(table).find('.selected').removeClass('selected');

            for (var i = 0; i < slots.length; i++) {
                for (var j = 1; j < 8; j++) {
                    var cdate = new Date(matrix[0][j].dataset.date);
                    var sdate = slots[i].date;
                    if( DateUtils.equals(cdate, sdate)){
                        for (var k = 0; k < slots[i].slots.length; k++) {
                            var row = slots[i].slots[k][0] / 60 + 1;
                            angular.element(matrix[row][j]).addClass('selected');
                        };
                        break;
                    }
                }
            }
            

        };

        var onSlotOver = function(event){


            var cell = angular.element(event.currentTarget);

            if( canSelect(event) ){
                cell.addClass('over');
            }

            angular.element(matrix[0][cell.data('y')]).addClass('over');
            angular.element(matrix[cell.data('x')][0]).addClass('over');

            updateCursor(event);
        };
        
        var onSlotOut = function(event){

            var cell = angular.element(event.currentTarget);

            cell.removeClass('over');

            angular.element(matrix[0][cell.data('y')]).removeClass('over');
            angular.element(matrix[cell.data('x')][0]).removeClass('over');

            updateCursor();
        };

        var onSlotMouseDown = function(event){
            
            if(!canSelect(event)){
                return;
            }

            selectingFirstSlot=event.currentTarget;
            document.addEventListener('mousemove', onSelectingMouseMove);
            document.addEventListener('mouseup', onSelectingMouseUp);
        };

        var onSelectingMouseUp = function(event){

            updateCursor();

            document.removeEventListener('mousemove', onSelectingMouseMove);
            document.removeEventListener('mouseup', onSelectingMouseUp);
            
            var column = parseInt(selectingFirstSlot.dataset.y);
            
            for (var i = parseInt(selectingFirstSlot.dataset.x); i < matrix.length; i++) {
                angular.element(matrix[i][column]).removeClass('selecting');
            }

            if(!canSelect(event) || selectingFirstSlot === event.target){
                return;
            }

            emit('book', createBooking(selectingFirstSlot, event.target));

            selectingFirstSlot=null;
            selecting=false;

        };

        var onSelectingMouseMove = function(event){

            var slot = angular.element(event.target);

            if( event.target === selectingFirstSlot ){
                return;
            }

            if(!isSlot(event)){
                return;
            }

            selecting = true;

            var column  = parseInt(selectingFirstSlot.dataset.y);
            var from    = parseInt(selectingFirstSlot.dataset.x);
            var to      = parseInt(slot.data('x'));
            var i;

            if( from > to ) {
                var tmp = to;
                to = from;
                from = tmp;
            }

            for (i = 1; i < matrix.length; i++) {
                if( i >= from && i <= to ){
                    angular.element(matrix[i][column]).addClass('selecting');
                }else{
                    angular.element(matrix[i][column]).removeClass('selecting');
                }
            }

            updateCursor(event);
        };

        var onSlotClick = function(event){
            
            if(!canSelect(event)){
                return;
            }

            emit('book', createBooking(event.target));
        };

        var onBook = function(booking){
            self.addSlots(booking);
        };

        var createBooking = function(from, to){

            var Book = function(date, slots){
                this.a = slots;
                Object.defineProperty(this, 'date', {get:function(){
                    return date;
                }});
                Object.defineProperty(this, 'slots', {get:function(){
                    return slots;
                }});
            };

            var column  = parseInt(from.dataset.y);

            var date = new Date(matrix[0][column].dataset.date);
            var slots=[];

            var x = parseInt(from.dataset.x)-1;
            var y = typeof(to)!='undefined' ? parseInt(to.dataset.x) : parseInt(from.dataset.x);

            for (var i = x; i < y; i++) {
                slots.push([i*scale,i*scale+scale]);
            }

            return new Book(date, slots);

        };

        var isSlot = function( event ){

            var cell = event.target;
            var celle = angular.element(cell);

            if( cell.nodeName != 'TD' ||
                !celle.hasClass('slot')){
                return false;
            }

            var parents = celle.parents();

            if(parents.index(table) == -1){
                return false;
            }

            return true;
        };

        var canSelect = function(event){
            
            if(!isSlot(event)){
                return false;
            }

            var e = angular.element(event.target);

            if( availability && e.hasClass('available') ){
                return true;
            }

            if(!availability && !e.hasClass('selected')){
                return true;
            }

            return false;
        };

        /**
         * Update table cursor based on current slot state
         * @param  {NodeElement} slot Slot
         */
        var updateCursor = function(event){
            
            if( selecting ){
                table.style.cursor='row-resize';
            }
            else if(!event || !isSlot(event)){
                table.style.cursor='default';
            }
            else if(!canSelect(event)){
                table.style.cursor='not-allowed';
            }
            else {
                table.style.cursor='pointer';
            }
        };

        this.validate = function(){
            validators.forEach(function(validator){
                validator.validate();
            });
        };

        this.invalidate = function() {
            validators.forEach(function(validator){
                validator.invalidate();
            });
        };

        this.addSlots = function(booking){
            slots.push(booking);
            this.invalidateSlots();
        };

        /**
         * Bind a function to an event
         * @param  {string} event Event name
         * @param  {Function} fct   Callback
         * @return {Void}
         */
        var on = this.on = function(event, fct){
            events[event] = events[event]||[];
            events[event].push(fct);
        };

        var off = this.off = function(event, fct){
            if( event in events === false  )  return;
            events[event].splice(events[event].indexOf(fct), 1);
        };

        var emit = this.emit = function(event /* , args... */){
            if( event in events === false  )  return;
            for(var i = 0; i < events[event].length; i++){
                events[event][i].apply(this, Array.prototype.slice.call(arguments, 1));
            }
        };

        validators.push( new ValidationDecorator(this, 'matrix', validateMatrix) );
        validators.push( new ValidationDecorator(this, 'dates', validateDates) );
        validators.push( new ValidationDecorator(this, 'availability', validateAvailability) );
        validators.push( new ValidationDecorator(this, 'slots', validateSlots   ) );

        on('slot.mouseover', onSlotOver);
        on('slot.mouseout',  onSlotOut);
        on('slot.mousedown', onSlotMouseDown);
        on('slot.click',     onSlotClick);
        on('book',           onBook);
    }

    return function(){
        return new MatrixTable();
    };
}]);

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
