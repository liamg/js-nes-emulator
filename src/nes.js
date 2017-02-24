(function (w) {
    "use strict";

    w.JNE = w.JNE || {};

    var NES = function () {
        this.mmc = new JNE.MMC();
        this.cpu = new JNE.CPU(this.mmc);
        this.ppu = new JNE.PPU(this.mmc);
        this.clock = new JNE.Clock();
        this.locked = false;
        this.clock.onTick(this.tick.bind(this));
        this.clock.setTickMultiplier(10000); // ticks happen 10,000 times less often than a "real" clock
        this.availableCycles = 0;
    };

    NES.prototype.loadROM = function () {

    };
    
    // @todo READ THIS https://wiki.nesdev.com/w/index.php/PPU_rendering

    NES.prototype.tick = function (cycles) {

        this.availableCycles += cycles;

        if (this.isLocked()) {
            return;
        }

        this.lock();

        var cpuCycles = 0;
        var i;

        while (this.availableCycles >= 0) {

            try {
                cpuCycles = this.cpu.emulate();
            } catch (e) {
                this.stop();
                throw e;
            }

            // The NTSC PPU runs at 3 times the CPU clock rate
            for (i = 0; i < cpuCycles * 3; i++) {

                // PPU operations
                this.ppu.emulate();

            }

            this.availableCycles -= cpuCycles;
        }

        this.unlock();
    };

    NES.prototype.start = function () {
        this.unlock();
        this.clock.start();
    };

    NES.prototype.stop = function () {
        this.clock.stop();
        this.unlock();
    };

    NES.prototype.lock = function () {
        this.locked = true;
    };

    NES.prototype.unlock = function () {
        this.locked = false;
    };

    NES.prototype.isLocked = function () {
        return this.locked;
    };

    NES.prototype.reset = function () {
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
