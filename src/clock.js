(function (w) {
    "use strict";

    w.JNE = w.JNE || {};

    var Clock = function () {

        this.clockSpeed = 21477272; // Hz (NTSC)
        this.cpuDivisor = 12;

        this.cpuClockSpeed = this.clockSpeed / this.cpuDivisor; // Hz
        this.tickCallback = function(){};
        this.setTickInterval(20);
    };

    /**
     *
     * @param tickInterval Tick interval (ms)
     */
    Clock.prototype.setTickInterval = function(tickInterval){
        this.tickInterval = tickInterval;
        var cyclesPerMilliSecond = this.cpuClockSpeed / 1000;
        this.cpuCyclesPerTick = cyclesPerMilliSecond * tickInterval;
    };

    Clock.prototype.onTick = function(callback){
        this.tickCallback = callback;
    };

    Clock.prototype.start = function(){
        this.tickInterval = setInterval(this.tickCallback, this.tickInterval, this.cpuCyclesPerTick);
    };

    Clock.prototype.stop = function(){
        clearInterval(this.tickInterval);
    };

    Clock.prototype.reset = function(){
        clearInterval(this.tickInterval);
    };

    w.JNE.Clock = Clock;

})(window);
