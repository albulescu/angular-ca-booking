'use strict';

angular.module('ca.schedule')

.factory('MatrixTableFactory', function(DateUtils, TimeUtils){

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
});