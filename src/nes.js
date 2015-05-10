
(function (w) {
    "use strict";

    w.JNE = w.JNE || {};

    var NES = function () {
        this.mmc = new JNE.MMC();
        this.cpu = new JNE.CPU(this.mmc);
        this.ppu = new JNE.PPU(this.mmc);
        this.clock = new JNE.Clock();
        this.locked = false;
        this.clock.onKiloTick(this.tick.bind(this));
        this.availableCycles = 0;
    };

    NES.prototype.loadROM = function(){

    };

    NES.prototype.tick = function(){

        this.availableCycles += (this.clock.cpuClockSpeed * 1000);

        if(this.isLocked()){
            return;
        }

        this.lock();

        var cpuCycles = 0;
        var i;

        while(this.availableCycles >= 0){

            try {
                cpuCycles = this.cpu.execute();
            }catch(e){
                this.stop();
                throw e;
            }

            for(i =0; i < cpuCycles * 3; i++){

                // PPU operations

            }

            this.availableCycles -= (cpuCycles * 4);
        }

        this.unlock();
    };

    NES.prototype.start = function(){
        this.unlock();
        this.clock.start();
    };

    NES.prototype.stop = function(){
        this.clock.stop();
        this.unlock();
    };

    NES.prototype.lock = function(){
        this.locked = true;
    };

    NES.prototype.unlock = function(){
        this.locked = false;
    };

    NES.prototype.isLocked = function(){
        return this.locked;
    };

    NES.prototype.reset = function(){
        this.clock.stop();
        this.cpu.reset();
    };

    NES.prototype.NESError = function (message) {
        this.name = 'NESError';
        this.message = message;
        this.stack = (new Error()).stack;
    };
    NES.prototype.NESError.prototype = new Error();
    NES.prototype.NESError.prototype.constructor = NES.prototype.NESError;

    w.JNE.NES = NES;

})(window);
