(function (w) {
    "use strict";

    w.JNE = w.JNE || {};

    var Clock = function () {

        this.clockSpeed = 21477272; // Hz (NTSC)
        this.cpuDivisor = 12;
        this.ppuDivisor = 4;

        this.cpuClockSpeed = this.clockSpeed / this.cpuDivisor; // Hz
        this.ppuClockSpeed = this.clockSpeed / this.ppuDivisor;
        this.tickCallback = function(){};
        this.kiloTickInterval = 0;
    };

    Clock.prototype.onKiloTick = function(callback){
        this.tickCallback = callback;
    };

    Clock.prototype.start = function(){
        this.kiloTickInterval = setInterval(this.tickCallback, 1);
    };

    Clock.prototype.stop = function(){
        clearInterval(this.kiloTickInterval);
    };

    Clock.prototype.reset = function(){
        clearInterval(this.kiloTickInterval);
    };

    w.JNE.Clock = Clock;

})(window);
