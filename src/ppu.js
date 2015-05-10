(function (w) {
    "use strict";

    w.JNE = w.JNE || {};

    var PPU = function (mmc) {
        this.mmc = mmc;
    };

    PPU.prototype.PPUError = function (message) {
        this.name = 'PPUError';
        this.message = message;
        this.stack = (new Error()).stack;
    };
    PPU.prototype.PPUError.prototype = new Error();
    PPU.prototype.PPUError.prototype.constructor = PPU.prototype.PPUError;

    w.JNE.PPU = PPU;

})(window);
