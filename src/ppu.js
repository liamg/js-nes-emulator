(function (w) {
    "use strict";

    w.JNE = w.JNE || {};

    /**
     *
     * @param w.JNE.MMC
     * @constructor
     */
    var PPU = function (mmc) {
        this.mmc = mmc;
    };

    PPU.prototype.registerLocations = {
        PPUCTRL: 0x2000,
        PPUMASK: 0x2001,
        PPUSTATUS: 0x2002,
        OAMADDR: 0x2003,
        OAMDATA: 0x2004,
        PPUSCROLL: 0x2005,
        PPUADDR: 0x2006,
        PPUDATA: 0x2007,
        OAMDMA: 0x4014
    };

    PPU.prototype.PPUError = function (message) {
        this.name = 'PPUError';
        this.message = message;
        this.stack = (new Error()).stack;
    };
    PPU.prototype.PPUError.prototype = new Error();
    PPU.prototype.PPUError.prototype.constructor = PPU.prototype.PPUError;

    PPU.prototype.setRegister = function (registerName, value) {
        if (!this.registerLocations.hasOwnProperty(registerName)) {
            throw new this.PPUError("Unknown register: " + registerName);
        }
        this.mmc.store(this.registerLocations[registerName], value);
    };

    w.JNE.PPU = PPU;

})(window);
