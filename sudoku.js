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
    var Difficulty, NumberFlag, Sudoku, Cell, Table, sudoku_counter = 0;
    Difficulty = [
        {
            minClue : 50,
            minCluePerX : 5
        },{
            minClue : 36,
            minCluePerX : 4
        },{
            minClue : 32,
            minCluePerX : 3
        },{
            minClue : 0,
            minCluePerX : 0
        }
    ];

    NumberFlag = function(val){
        if(val !== undefined){
            this.rawData = val; // 0b111111111 bit at 987654321 is each possibility at its position
        }else{
            this.rawData = 511;
        }
        this.length = 9;
    };

    NumberFlag.prototype = {
        clear : function(){
            this.rawData = 0;
            this.length = 0;
            return this;
        }, fromArray : function(arr){
            this.clear();
            for(var i=0; i<arr.length; i++){
                this.add(arr[i]);
            }
            return this;
        }, getRandom : function(){
            var ret = [], rand = Math.floor(Math.random()*this.length);
            for(var i=0; i<9; i++){
                if(0 != (this.rawData & (1<<i))){
                    if(rand<=0){
                        this.remove(i+1);
                        this.length--;
                        return i+1;
                    }else{
                        rand--;
                    }
                }
            }
        }, shift : function(){
            var ret = [];
            for(var i=0; i<9; i++){
                var x = 1<<i;
                if(0 != (this.rawData & x)){
                    this.rawData = this.rawData & ~x;
                    this.length--;
                    return i+1;
                }
            }
        }, toArray : function(){
            var ret = [];
            for(var i=0; i<9; i++){
                if(0 != (this.rawData & (1<<i))){
                    ret.push(i+1);
                }
            }
            return ret;
        }, add : function(val){
            if(val<1 || val>9){ return; }
            val--;
            var d = this.rawData | (1<<val);
            if(d != this.rawData)
                this.length++;
            this.rawData = d;
            return this;
        }, remove : function(val){
            if(val<1 || val>9){ return; }
            val--;
            var d = this.rawData & ~(1<<val);
            if(d != this.rawData)
                this.length--;
            this.rawData = d;
            return this;
        }, subtract : function(other){
            if(other.rawData == 0) return;
            var d = this.rawData ^ (this.rawData & other.rawData);
            //http://stackoverflow.com/questions/109023/how-to-count-the-number-of-set-bits-in-a-32-bit-integer
            var i = d;
            i = i - ((i >> 1) & 0x55555555);
            i = (i & 0x33333333) + ((i >> 2) & 0x33333333);
            this.length = (((i + (i >> 4)) & 0x0F0F0F0F) * 0x01010101) >> 24;

            this.rawData = d;
            return this;
        }
    }

    Cell = function(a){
        var i = parseInt(a/9), j = a%9;
        //Constants
        this.id = a;
        this.row = i;
        this.col = j;
        this.block = 3*parseInt(i / 3) + parseInt(j / 3);
        this.related = [];
        this.rid = 'ABCDEFGHI'[Math.floor(a/10)] + (a%9 + 1);

        //Public attributes
        this.value = 0;
        this.isClue = true;
		this.isUserInput = false;
    };

    Cell.prototype = {
        initialized: function(){
            return this.related.length == 20;
        },
        possibles: function(){
            //THIS ONE TAKES 2/3 OF THE TIME OF SOLVE FUNCTION
            var possibles = new NumberFlag(), a=0;
            for(i=0; i<20 && possibles.length>0; i++){
                if(this.related[i].isClue || this.related[i].isUserInput){
                    possibles.remove(this.related[i].value)
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
                if((this.related[i].isClue || this.related[i].isUserInput) && myval == this.related[i].value){
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
                cloneTable.cells[i].isClue = this.cells[i].isClue;
            }
            return cloneTable;
        }
        this.emptyCells = function(){ return cells.filter(function(a){ return a.value == 0 || !a.isClue  }) };
        this.clues = function(){ return cells.filter(function(a){ return a.isClue }) };
        this.log = function(){
            var retval = "";
            for(var i=0; i<9; i++){
                for(var j=0; j<9; j++){
                    if(!this.cells[i*9 + j].isClue)
                        retval += "[" + 'x123456789'[this.cells[i*9 + j].value] + "]";
                    else
                        retval += " " + this.cells[i*9 + j].value + " ";
                }
                retval += "\n";
            }
            console.log(retval);
        }
        this.load = function(str){
            for(var i=0; i<81; i++){
                var number = parseInt(str[i]);
                this.cells[i].value = number;
                this.cells[i].isClue = (number != 0);
                this.cells[i].isUserInput = false;
            }

            return true;
        }
    };

    Sudoku = function (options) {
        this.table = new Table();
        

        this.load = function(str){
            this.table.load(str);
        };

        this.solve = function(_table){

            var table = (_table || new Table()).clone(),
                cells = table.cells,
                queue = table.emptyCells();

            for(var i=0; i<81; i++){
                cells[i].visited = new NumberFlag(0);
                cells[i].isUserInput = false;
            }

            /* Start with a single candidate to multiples */
            queue.sort(function(a,b){ return (a.possibles().length - b.possibles().length) || (a.id - b.id); });

            var cursor = 0;
            while(0 <= cursor && cursor < queue.length){
                var cell = queue[cursor];
                var possibles = cell.possibles();
                possibles.subtract(cell.visited);
                
                if(possibles.length>0){
                    cell.value = possibles.getRandom();
                    cell.isUserInput = true;
                    cell.visited.add(cell.value);
                    cursor++;

                    //Swap the next to the cell that has the minimum number of possibles
                    var minNumPossible = 9; next = -1;
                    for(var i=cursor; i<queue.length; i++){
                        var len = queue[i].possibles().length;
                        if(len < minNumPossible){
                            minNumPossible = len;
                            next = i;
                        }
                    }
                    if(next != -1){
                        var t = queue[cursor];
                        queue[cursor] = queue[next];
                        queue[next] = t;
                    }
                    
                } else {
                    cell.value = 0;
                    cell.isUserInput = false;
                    cell.visited.clear();
                    cursor--;
                }
            }

            if(cursor<=0){
                return false;
            }

            for(var i=0; i<81; i++){
                delete cells[i].visited;
                cells[i].isUserInput = false;
            }
            return table;
        };

        this.dig = function(_solution, level){
            var level = level === undefined?0:level,
                minClue = Difficulty[level].minClue,
                minCluePerX = Difficulty[level].minCluePerX,
                solution = _solution.clone(),
                deferred = new Deferred(),
                queue=solution.clues();

            var num_num = {1:0,2:0,3:0,4:0,5:0,6:0,7:0,8:0,9:0};
            var check = ['row','col','block'];
            var num_clues_per = {};
            var num_clues = 0;

            num_clues_per.row = {0:0,1:0,2:0,3:0,4:0,5:0,6:0,7:0,8:0,9:0};
            num_clues_per.col = {0:0,1:0,2:0,3:0,4:0,5:0,6:0,7:0,8:0,9:0};
            num_clues_per.block = {0:0,1:0,2:0,3:0,4:0,5:0,6:0,7:0,8:0,9:0};

            for(var i=0; i<81; i++){
                num_num[solution.cells[i].value]++;
                for(var j=0; j<check.length;j++){
                    num_clues_per[check[j]][solution.cells[i][check[j]]]++;
                }
                if(solution.cells[i].isClue)
                    num_clues++;
            }

            var pass_restriction = function(cell){
                if(num_clues <= minClue ){
                    return false;
                }
                for(var j=0; j<check.length;j++){
                    if(num_clues_per[check[j]][cell[check[j]]] <= minCluePerX)
                        return false;
                }
                return true;
            }

            var sorting = function(a,b){ return (num_num[b.value] - num_num[a.value]) || (a.id-b.id); };
            
            queue.sort(sorting);

            while(queue.length > 0){
                var cell = solution.cells[queue.shift().id],
                    value = cell.value,
                    possibles = cell.possibles().remove(value);
                
                if(!pass_restriction(cell)){
                    continue;
                }

                cell.isClue = false;
                while(possibles.length>0){
                    cell.value = possibles.shift();
                    cell.isClue = true; //not to be handled by solver. (solver handles both not given and 0-value cells)
                    var ret = this.solve(solution);
                    if(ret === false){
                        cell.isClue = false;
                    }else{
                        break;
                    }
                }
                
                if(!cell.isClue){
                    num_clues--;
                    for(var j=0; j<check.length;j++){
                        num_clues_per[check[j]][cell[check[j]]]--;
                    }
                    num_num[value]--;
                    queue.sort(sorting);
                }

                cell.value = value;
            }
            return solution;
        };

        this.generate = function(level){
            this.table = this.dig(this.solve(), level)
            return this.table;
        };

        this.generate22 = function(){
            var min=81, minSudoku, freq = {};
            for(var i=0;i<370;i++){
                console.time('Generate sudoku')
                var ss = this.solve();
                var s = this.dig(ss, 3),
                    x = s.clues().length;
                freq[x] = (x in freq?freq[x]:0) + 1;
                if(min > x){
                    minSudoku = s;
                    min = x;
                }
                console.timeEnd('Generate sudoku')
                console.log(freq);
            }
            return this.table = minSudoku;
        };
    };

    Sudoku.Difficulty = Difficulty;
    Sudoku.Cell = Cell;
    Sudoku.Table = Table;
    Sudoku.NumberFlag = NumberFlag;
    return Sudoku;
})(window, document);