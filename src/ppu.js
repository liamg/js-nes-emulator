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
        // also 8kb of memory on the gamepak
        this.memorySize = 0x800;
        // @todo replace this with a mmc style memory object with mirroring support
        this.memory = new Array(this.memorySize); // https://wiki.nesdev.com/w/index.php/PPU_memory_map
        this.palette = [];
        this.oam = [];
        this.reset();
    };

    PPU.prototype.registerLocation = {
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

    PPU.prototype.mirroringType = {
        VERTICAL: 0,
        HORIZONTAL: 1,
        FOUR_SCREEN: 2,
        SINGLE_SCREEN_1: 3,
        SINGLE_SCREEN_3: 4
    };

    /**


     PPUCTRL

     7  bit  0
     ---- ----
     VPHB SINN
     |||| ||||
     |||| ||++- Base nametable address
     |||| ||    (0 = $2000; 1 = $2400; 2 = $2800; 3 = $2C00)
     |||| |+--- VRAM address increment per CPU read/write of PPUDATA
     |||| |     (0: add 1, going across; 1: add 32, going down)
     |||| +---- Sprite pattern table address for 8x8 sprites
     ||||       (0: $0000; 1: $1000; ignored in 8x16 mode)
     |||+------ Background pattern table address (0: $0000; 1: $1000)
     ||+------- Sprite size (0: 8x8; 1: 8x16)
     |+-------- PPU master/slave select
     |          (0: read backdrop from EXT pins; 1: output color on EXT pins)
     +--------- Generate an NMI at the start of the vertical blanking interval (0: off; 1: on)


     Status

     7  bit  0
     ---- ----
     VSO. ....
     |||| ||||
     |||+-++++- Least significant bits previously written into a PPU register
     |||        (due to register not being updated for this address)
     ||+------- Sprite overflow. The intent was for this flag to be set
     ||         whenever more than eight sprites appear on a scanline, but a
     ||         hardware bug causes the actual behavior to be more complicated
     ||         and generate false positives as well as false negatives; see
     ||         PPU sprite evaluation. This flag is set during sprite
     ||         evaluation and cleared at dot 1 (the second dot) of the
     ||         pre-render line.
     |+-------- Sprite 0 Hit.  Set when a nonzero pixel of sprite 0 overlaps
     |          a nonzero background pixel; cleared at dot 1 of the pre-render
     |          line.  Used for raster timing.
     +--------- Vertical blank has started (0: not in vblank; 1: in vblank).
     Set at dot 1 of line 241 (the line *after* the post-render
     line); cleared after reading $2002 and at dot 1 of the
     pre-render line.

     */


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

    PPU.prototype.reset = function () {
        this.oam = new Array(256); // Object Attribute Memory a.k.a. sprite mem
        this.oam.fill(0);

        var width = 256, height = 240;
        this.canvas = document.createElement('canvas');
        this.canvas.width = width;
        this.canvas.height = height;
        this.canvasContext = this.canvas.getContext('2d');
        this.frameBuffer = this.canvasContext.createImageData(width, height);

        this.latch = 0;
        this.horizontalPos = 0;
        this.scanline = 0;
        this.nmiCounter = 0;
        this.frameComplete = false;
    };

    PPU.prototype.bufferScanline = function () {


        this.scanline++;

        if (this.scanline > 261) {
            this.scanline = 0;
            this.nmiCounter = 9;
            this.frameComplete = true;
        }
    };

    PPU.prototype.writePixelToBuffer = function (pixel, colour) {

        // 0x40    0x30    0x20    0x10
        // AAAAAAAABBBBBBBBGGGGGGGGRRRRRRRR
        // Alpha   Blue    Green   Red

        this.frameBuffer.data[pixel * 4] = colour & 0xFF;
        this.frameBuffer.data[pixel * 4 + 1] = (colour >> 8) & 0xFF;
        this.frameBuffer.data[pixel * 4 + 2] = (colour >> 16) & 0xFF;
        this.frameBuffer.data[pixel * 4 + 3] = 255; // (colour >> 24) & 0xFF; // alpha not used
    };

    PPU.prototype.checkSprite0Hit = function () {
        //Check for a sprite 0 hit.
        if (false) { //this.ppu.curX === this.ppu.spr0HitX && this.ppu.f_spVisibility === 1 && this.ppu.scanline-21 === this.ppu.spr0HitY){
            //Set the sprite 0 hit flag.
            var status = this.mmc.fetch(this.registerLocation.PPUSTATUS);
            status |= 64; // 01000000 - bit 6 of PPUSTATUS = sprite hit flag
            this.mmc.store(this.registerLocation.PPUSTATUS, status);
        }
    };

    PPU.prototype.drawFrame = function () {

    };

    PPU.prototype.emulate = function () {

        //Check if the ppu is done rendering.
        if (this.frameComplete) {

            //Decrement the non-maskable interrupt counter.
            this.nmiCounter--;

            //???
            if (this.nmiCounter === 0) {
                this.frameComplete = false;
                //Draw the frame and start the vBlank period.
                this.drawFrame();
            }
        }

        // move across 1px each cycle
        this.ppu.horizontalPos++;

        // are we at the end of the scanline?
        // each scanline lasts for 341 PPU clock cycles (113.667 CPU clock cycles; 1 CPU cycle = 3 PPU cycles),
        if (this.ppu.horizontalPos === 341) {
            this.ppu.horizontalPos = 0;
            this.ppu.bufferScanline();
        }
    };

    w.JNE.PPU = PPU;

})(window);
