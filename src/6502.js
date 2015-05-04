/**
 * A simulation of the 6502 CPU (without decimal support).
 * http://en.wikipedia.org/wiki/MOS_Technology_6502
 */
(function() {
    "use strict";

    window.JNE = window.JNE || {};

    window.JNE.NES6502 = function (mmc) {

        this.mmc = mmc;

        this.registers = {
            A:  0,  //accumulator
            X:  0,
            Y:  0,
            SP: 0,  //stack pointer - stack is at $0100 - $01ff
            PC: 0,  //program counter
            P:  0   //status
        };

        this.flags = {
            carry: false,
            zero: false,
            interrupt_disable: false,
            decimal_mode: false,
            break_command: false,
            overflow: false,
            negative: false
        };

        this.reset();
    };

    window.JNE.NES6502.prototype.IRQ = {
        NORMAL: 0,
        NMI: 1,
        RESET: 2
    };

    window.JNE.NES6502.prototype.reset = function(){

        this.registers.A = 0;
        this.registers.X = 0;
        this.registers.Y = 0;
        this.registers.SP = 0xFF;
        this.registers.PC = 0;
        this.registers.P = 0;

        this.flags.carry = false;
        this.flags.zero = true;
        this.flags.interrupt_disable = false;
        this.flags.decimal_mode = false;
        this.flags.break_command = true;
        this.flags.overflow = false;
        this.flags.negative = false;

        this.addressing_mode = 0; // default?


    };
})();