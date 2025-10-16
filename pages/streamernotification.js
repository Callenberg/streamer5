///Copyright 2025 by Retro Audiophile Designs, license GPL 3.0 or later
//-------------------------------------------------------------------------------
//      ~ Frontend code for notifications on Page of RAD Streamer ~

//the npm package notyf is used: https://www.npmjs.com/package/notyf
//In 2025 the notyf.js needed some patching to work. 

//The most important global variable - the notyf object
var notyf = new Notyf();

//Other global variables
const infoColor = "#AF5828";  //player-orange
const errorColor = "#4C1C1A"; //player-red
const okayColor = "#1B3E33";  //player-green
const oopsColor = "#5578A0";  //player-blue

const quickDuration = 1000;
const normalDuration = 2000;
const longDuration = 5000;
const lastingDuration = (60000 * 5);

const threeSpaces = "&nbsp; &nbsp; &nbsp;";
const fourSpaces = "&nbsp; &nbsp; &nbsp; &nbsp;";
const sixSpaces = "&nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp;";

//---------------------------------------------ERROR
function errorDispatch(missive, duration) {
    duration = duration || longDuration;
    notyf.error({
        message: missive,
        duration: duration,
        background: errorColor,
        position: { x: 'center', y: 'top' },
        dismissible: true
    });
};
//----------------------------------------------INFO
function infoDispatch(missive, duration) {
    duration = duration || quickDuration;
    notyf.success({
        message: missive,
        duration: duration,
        background: infoColor,
        position: { x: 'center', y: 'top' },
        dismissible: true,
        icon: false

    });
};
//----------------------------------------------DONE
function doneDispatch(missive, duration) {
    duration = duration || normalDuration;
    notyf.success({
        message: missive,
        duration: normalDuration,
        background: okayColor,
        position: { x: 'center', y: 'top' },
        dismissible: true
    });
};
//------------------------------------------MISHAP
function mishapDispatch(missive, duration) {
    duration = duration || longDuration;
    notyf.success({
        message: missive,
        duration: duration,
        background: oopsColor,
        position: { x: 'center', y: 'top' },
        dismissible: true,
        icon: false
    });
};

