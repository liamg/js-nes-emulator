/**
 * A basic emulation of the MMC and associated memory.
 *
 * $0000 - $00ff - Used by zero page addressing instructions. Instructions using zero page addressing only require an 8-bit address parameter. The most-signficant 8-bits of the address are assumed to be $00. This is done to save memory since the address requires half the space.
 * $0100 - $01ff - Reserved for the system stack.
 * $0200 - $fff9 - Unspecified
 * $fffa - $fffb - Contains address of non-maskable interrupt (NMI) handler
 * $fffc - $fffd - Contains address of reset location
 * $fffe - $ffff - Contains address of BRK/IRQ handler
 *
 */

(function () {
    "use strict";

    window.JNE = window.JNE || {};

    /**
     * @constructor
     */
    window.JNE.MMC = function () {
        this.debug = false;
        this.size = 0x10000; // default to 65536 bytes
        this.memory = new Array(this.size);
        this.reset();
    };

    /**
     * Validate an address in memory. Throws an exception if address is invalid.
     * @param address Address in memory to test.
     */
    window.JNE.MMC.prototype.validateAddress = function (address) {
        if (typeof address !== 'number' || address >= this.size || address < 0) {
            throw "Invalid memory address: " + address;
        }
    };

    /**
     * Fetch the value at a given address in memory.
     * @param address number Address in memory to retrieve value from.
     * @returns number
     */
    window.JNE.MMC.prototype.fetch = function (address) {
        this.validateAddress(address);
        //if(this.debug) console.log('Reading address 0x' + address.toString(16) + ' - value is 0x' + this.memory[address].toString(16));
        return this.memory[this.translateAddress(address)];
    };

    /**
     * Store a given value at the given address in memory
     * @param address number Address in memory to store value at.
     * @param value number The value to store.
     */
    window.JNE.MMC.prototype.store = function (address, value) {
        this.validateAddress(address);
        //if(this.debug) console.log('Writing value ' + value.toString(16) + ' to address 0x' + address.toString(16));
        this.memory[this.translateAddress(address)] = value & 255;
    };

    /**
     * Reset the memory to all zeroes.
     */
    window.JNE.MMC.prototype.reset = function () {
        var freshMemory = new Array(this.memory.length);
        freshMemory.fill(0);
        this.memory = freshMemory;
    };

    /**
     * Translate an address - used for "mirrored" addresses
     * @param address
     * @returns int
     */
    window.JNE.MMC.prototype.translateAddress = function (address) {
        switch (true) {
            case address >= 0x2008 && address <= 0x3FFF:
                address = ((address - 0x2000) % 8) + 0x2000;
                break;
        }
        return address;
    };

})();