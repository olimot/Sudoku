/**
 * Created by user on 2015-07-10.
 */
Array.prototype.diff = function(a){
    var isArray =  Object.prototype.toString.call( a ) === '[object Array]';
    return this.filter(function(b){ return isArray? a.indexOf(b)<0 : a!=b; });
};

Array.prototype.pickRandom = function(){
    return this[parseInt(Math.random() * this.length)];
}

function printTable(arr, selector){

}

function Deferred(){
    this.doneCallbacks = [];
    this.failCallbacks = [];
}
Deferred.prototype = {
    execute: function(list, args){
        args = Array.prototype.slice.call(args);
        for(var i=0;i<list.length;i++)
            list[i].apply(null, args);
    },
    resolve: function(){ this.execute(this.doneCallbacks, arguments); },
    reject: function(){ this.execute(this.failCallbacks, arguments); },
    done: function(callback){ this.doneCallbacks.push(callback); return this; },
    fail: function(callback){ this.failCallbacks.push(callback); return this; }
};

var Sudoku;
Sudoku = (function (window, document, undefined) {
    var Sudoku, Cell, Table, sudoku_counter = 0;

    Cell = function(a){
        var i = parseInt(a/9), j = a%9;
        this.id = a;
        this.row = i;
        this.col = j;
        this.block = 3*parseInt(i / 3) + parseInt(j / 3);
        this.idInBlock = (i%3)*3 + j%3;
        this.related = [];
        this.value = 0;
        this.given = true;
		this.solving = false;
    };

    Cell.prototype = {
        initialized: function(){
            return this.related.length == 20;
        },
        possibles: function(){
            if(!this.initialized()) return [];
            var possibles = [1,2,3,4,5,6,7,8,9];
            for(i=0; i<20; i++){
                if(this.related[i].given){
                    var index = possibles.indexOf(this.related[i].value);
                    if(index>=0)
                        possibles.splice(index,1);
                }
            }
            return possibles;
        },
        isError: function(){
            if(!this.initialized()){ 
				return true; 
			}
            var myval = this.value;
            for(i=0; i<20; i++){
                if((this.related[i].given || this.related[i].solving) && myval == this.related[i].value){
					return true;
				}
            }
            return false;
        }
    };

    Table = function () {
        //Create
        this.cells = [];
        var cells = this.cells;
        for (var i=0; i<81; i++)
            cells.push(new Cell(i));

        //Initialize
        for(var i=0; i<81; i++){
            cells[i].related = [];
            var cursor = cells[i];
            var firstIdInBlock = 9*3*parseInt(cursor.block/3) + 3*(cursor.block%3);
            var put = function(index){
                if(index != i && cells[i].related.indexOf(cells[index])<0) cells[i].related.push(cells[index]);
            };
            for(var j=0;j<9;j++){
                put(cursor.row*9 + j);
                put(j*9 + cursor.col);
                put(firstIdInBlock+9*parseInt(j/3)+j%3);
            }
        }
        this.clone = function(){
            var cloneTable = new Table();
            for(var i=0; i<81; i++){
                cloneTable.cells[i].value = this.cells[i].value;
                cloneTable.cells[i].given = this.cells[i].given;
            }
            return cloneTable;
        }
        this.emptyCells = function(){ return cells.filter(function(a){ return a.value == 0 || !a.given  }) };
        this.givenCells = function(){ return cells.filter(function(a){ return a.given }) };
        this.log = function(){
            var retval = "";
            for(var i=0; i<9; i++){
                for(var j=0; j<9; j++){
                    if(!this.cells[i*9 + j].given)
                        retval += "x ";
                    else
                        retval += this.cells[i*9 + j].value + " ";
                }
                retval += "\n";
            }
            console.log(retval);
        }
    };

    Sudoku = function (options) {
        this.table = new Table();
        var table = this.table;
        var self = this;
        this.solve = function(theTable){
            theTable = theTable || table;
            var deferred = new Deferred();
            //Initialize information, Clone table only for solving
            var solvingTable = theTable.clone(), cells=solvingTable.cells, queue;
            for(var i=0; i<81; i++){
                cells[i].visited = [];
            }

            //Sort queue by the number of possible answer numbers
            queue = solvingTable.emptyCells();
            queue.sort(function(a,b){
                var comp = a.possibles().length - b.possibles().length;
                return comp!=0?comp: a.id - b.id;
            });

            var cursor= 0;
            //Safe While #1
            var perfTime= new Date(); setTimeout((function backtrack(){
                while(cursor<queue.length && cursor>=0){

                    var cell = queue[cursor];
                    var possibles = cell.possibles().diff(cell.visited);
                    if(possibles.length<=0){
                        cell.value = 0;
                        cell.visited = [];
                        cursor--;
                    }else{
                        cell.value = possibles.pickRandom();
                        cell.visited.push(cell.value);
                        cursor++;
                    }

                    //Safe While #2
                    var perfTime2 = new Date();
                    if(perfTime2 - perfTime > 1000) {
                        perfTime = perfTime2;
                        setTimeout(backtrack, 1);
                        return;
                    }
                }
                if(cursor<=0){
                    deferred.reject();
                }else{
                    deferred.resolve(solvingTable);
                }
            }),1);
            return deferred;
        };
		
		var levelIndex = 0;
		
		var levelSettings = [{
			priorityAlgorithm: function(a,b){ return Math.floor(Math.random()*2)*2-1; },
			minSubGiven: 5,
			minTotalGiven: 50
		},{
			priorityAlgorithm: function(a,b){ return Math.floor(Math.random()*2)*2-1; },
			minSubGiven: 4,
			minTotalGiven: 36
		},{
			priorityAlgorithm: function(a,b){ 
				var retval = a.id%2 - b.id%2;
				return retval!=0?retval:a.id - b.id;
			},
			minSubGiven: 3,
			minTotalGiven: 32
		},{
			priorityAlgorithm: function(a,b){ 
				var ax = a.row*9 + (a.row%2==0?a.col:9-a.col);
				var bx = b.row*9 + (b.row%2==0?b.col:9-b.col);
				return ax - bx;
			},
			minSubGiven: 2,
			minTotalGiven: 28
		},{
			priorityAlgorithm: function(a,b){ return a.id - b.id; },
			minSubGiven: 0,
			minTotalGiven: 0
		}];
		
		this.level = function(lv){
			if(typeof lv =='number' && 0 <= lv && lv <= 4){
				levelIndex = lv;
			}
			return levelIndex;
		}
        this.generate = function(){
            var self = this
                ,deferred = new Deferred();
            this.solve().done(function(solution){
                var queue=solution.cells.slice(0)
				    ,thisLevel = levelSettings[levelIndex];
					
                queue.sort(thisLevel.priorityAlgorithm);
                (function cycle() {
                    var continueCycle = function(){
                            if(queue.length) setTimeout(cycle,1);
                            else deferred.resolve(solution);
                        },cell = queue.shift()
                        ,originalValue = cell.value
                        ,givenCells = solution.givenCells()
                        ,GivenNotEnough = true
                        ,a= ['row','col','block'];

                    for(var i=0; i<a.length; i++){
                        //number of given cells in a same [row,col,block for each loop] >= numLineGiven
                        if(givenCells.filter(function(b){ return b[a[i]] == cell[a[i]]; }).length >= thisLevel.minSubGiven) {
                            GivenNotEnough = false;
                            break;
                        }
                    }
                    if( GivenNotEnough || givenCells.length <= thisLevel.minTotalGiven ){
                        cell.given = true;
                        continueCycle();
                        return;
                    }

                    var possibles = cell.possibles().diff(originalValue);
                    if(possibles.length>0){
                        var conflict = false;
                        var cloneTable = solution.clone();
                        (function trySolve(){
                            cloneTable.cells[cell.id].value = possibles.shift();
                            self.solve(cloneTable).done(function(){
                                cell.given = true;
                                continueCycle();
                            }).fail(function(){
                                if(possibles.length>0){
                                    trySolve();
                                }else{
                                    cell.given=false;
                                    continueCycle();
                                }
                            });
                        })();
                    }else{
                        cell.given = false;
                        continueCycle();
                    }
                })();
            });
            deferred.done(function(solution){
                self.table = solution;
            });
            return deferred;
        };
    };

    Sudoku.Cell = Cell;
    Sudoku.Table = Table;
    return Sudoku;
})(window, document);

sudoku=new Sudoku();