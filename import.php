<?php

$numLine = 49151;
$file = new SplFileObject('sudoku17.txt');
//this is zero based so need to subtract 1
$file->seek(rand(0,$numLine-1));
//now print the line
echo $file->current();