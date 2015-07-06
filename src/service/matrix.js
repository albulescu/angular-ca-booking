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

        var scrollable=true;
        var scrolling=false;
        var scrollingInterval=null;
        var weekScroll=false;

        Object.defineProperty(this, 'table', {
            get:function(){ return table; }
        });

        Object.defineProperty(this, 'scale', {
            get:function(){ return scale; },
            set:function(value){
                
                if(value%10!==0){
                    throw new Error('Ivalid time scale');
                }

                scale=value;

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

                    td.addEventListener('mouseover', forwardSlotEvent('mouseover'));
                    td.addEventListener('mouseout',  forwardSlotEvent('mouseout'));
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

            if(!matrix.length){
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

        /**
         * Bind a function to an event
         * @param  {string} event Event name
         * @param  {Function} fct   Callback
         * @return {Void}
         */
        this.on = function(event, fct){
            events[event] = events[event]||[];
            events[event].push(fct);
        };

        this.off = function(event, fct){
            if( event in events === false  )  return;
            events[event].splice(events[event].indexOf(fct), 1);
        };

        this.emit = function(event /* , args... */){
            if( event in events === false  )  return;
            for(var i = 0; i < events[event].length; i++){
                events[event][i].apply(this, Array.prototype.slice.call(arguments, 1));
            }
        };

        validators.push( new ValidationDecorator(this, 'matrix', validateMatrix) );
        validators.push( new ValidationDecorator(this, 'dates', validateDates) );
        validators.push( new ValidationDecorator(this, 'availability', validateAvailability) );
        validators.push( new ValidationDecorator(this, 'slots', validateSlots   ) );
    }

    return function(){
        return new MatrixTable();
    };
});