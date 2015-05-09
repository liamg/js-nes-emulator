/**
 * A simulation of the 6502 CPU (without decimal support).
 *
 * Useful links:
 *
 * 6502 Overview
 * http://en.wikipedia.org/wiki/MOS_Technology_6502
 *
 * Online emulator with debug mode
 * http://skilldrick.github.io/easy6502/
 *
 * CPU Docs
 * http://www.llx.com/~nparker/a2/opcodes.html
 * http://www.obelisk.demon.co.uk/6502/reference.html#LDA
 * http://www.6502.org/tutorials/65c02opcodes.html
 */
(function (w) {
    "use strict";

    w.JNE = w.JNE || {};

    /**
     * @param mmc JNE.MMC Memory controller
     * @constructor
     */
    var NES6502 = function (mmc) {

        this.mmc = mmc;

        this.registers = {
            A: 0,  //accumulator
            X: 0,
            Y: 0,
            SP: 0,  //stack pointer - stack is at $0100 - $01ff
            PC: 0,  //program counter
            P: 0   //status
        };

        this.flags = {
            carry: 0,
            zero: 0,
            negative: 0,
            interruptDisable: 0,
            decimal: 0, //not supported by this version
            brk: 0,
            overflow: 0,
            unused: 0
        };

        this.reset();

    };

    NES6502.prototype.CPUError = function (message) {
        this.name = 'CPUError';
        this.message = message;
        this.stack = (new Error()).stack;
    };
    NES6502.prototype.CPUError.prototype = new Error();
    NES6502.prototype.CPUError.prototype.constructor = NES6502.prototype.CPUError;

    /**
     * Enumeration of interrupt request types
     */
    NES6502.prototype.IRQ = {
        NORMAL: 0,
        NMI: 1,
        RESET: 2
    };

    /**
     * Reset the CPU
     */
    NES6502.prototype.reset = function () {

        this.registers.A = 0;
        this.registers.X = 0;
        this.registers.Y = 0;
        this.registers.SP = 0x1FF;
        this.registers.PC = 0x07FF;
        this.registers.P = 0;

        this.setZeroFlag();
        this.clearCarryFlag();
        this.clearNegativeFlag();
        this.clearInterruptDisableFlag();
        this.clearDecimalFlag();
        this.clearBrkFlag();
        this.clearOverflowFlag();
        this.setUnusedFlag();

        this.setPFromFlags();

        mmc.reset();
    };

    /**
     * Determine and set the CPU status (P register) from the individual bit flags
     */
    NES6502.prototype.setPFromFlags = function () {
        this.registers.P = (this.flags.carry |
        (this.flags.zero << 1) |
        (this.flags.interruptDisable << 2) |
        (this.flags.decimal << 3) |
        (this.flags.brk << 4) |
        (this.flags.unused << 5) |
        (this.flags.overflow << 6) |
        (this.flags.negative << 7)) & 0xff;
    };

    NES6502.prototype.setFlagsFromP = function () {
        this.flags.carry = this.registers.P & 0x1;
        this.flags.zero = (this.registers.P >> 1) & 0x1;
        this.flags.interruptDisable = (this.registers.P >> 2) & 0x1;
        this.flags.decimal = (this.registers.P >> 3) & 0x1;
        this.flags.brk = (this.registers.P >> 4) & 0x1;
        this.flags.unused = (this.registers.P >> 5) & 0x1;
        this.flags.overflow = (this.registers.P >> 6) & 0x1;
        this.flags.negative = (this.registers.P >> 7) & 0x1;
    };

    NES6502.prototype.checkCarryFlag = function (value) {
        if (value > 0xff) {
            this.setCarryFlag();
        } else {
            this.clearCarryFlag();
        }
    };

    NES6502.prototype.setCarryFlag = function () {
        this.flags.carry = 1;
        this.setPFromFlags();
    };

    NES6502.prototype.clearCarryFlag = function () {
        this.flags.carry = 0;
        this.setPFromFlags();
    };

    NES6502.prototype.setUnusedFlag = function () {
        this.flags.unused = 1;
        this.setPFromFlags();
    };

    NES6502.prototype.clearUnusedFlag = function () {
        this.flags.unused = 0;
        this.setPFromFlags();
    };

    NES6502.prototype.checkZeroFlag = function (value) {
        if (value === 0) {
            this.setZeroFlag();
        } else {
            this.clearZeroFlag();
        }
    };

    NES6502.prototype.setZeroFlag = function () {
        this.flags.zero = 1;
        this.setPFromFlags();
    };

    NES6502.prototype.clearZeroFlag = function () {
        this.flags.zero = 0;
        this.setPFromFlags();
    };

    NES6502.prototype.setInterruptDisableFlag = function () {
        this.flags.interruptDisable = 1;
        this.setPFromFlags();
    };

    NES6502.prototype.clearInterruptDisableFlag = function () {
        this.flags.interruptDisable = 0;
        this.setPFromFlags();
    };

    NES6502.prototype.setDecimalFlag = function () {
        this.flags.decimal = 1;
        this.setPFromFlags();
    };

    NES6502.prototype.clearDecimalFlag = function () {
        this.flags.decimal = 0;
        this.setPFromFlags();
    };

    NES6502.prototype.setBrkFlag = function () {
        this.flags.brk = 1;
        this.setPFromFlags();
    };

    NES6502.prototype.clearBrkFlag = function () {
        this.flags.brk = 0;
        this.setPFromFlags();
    };

    NES6502.prototype.checkOverflowFlag = function (a, b, total, adc) {
        /**
         * http://www.righto.com/2012/12/the-6502-overflow-flag-explained.html
         */
        if(adc) {
            if ((((a ^ b) & 0x80) === 0) && ((a ^ total) & 0x80) !== 0) {
                this.setOverflowFlag();
            } else {
                this.clearOverflowFlag();
            }
        }else{
            if (((a ^ b) & 0x80) !== 0 && ((a ^ total) & 0x80) !== 0) {
                this.setOverflowFlag();
            } else {
                this.clearOverflowFlag();
            }
        }
    };

    NES6502.prototype.setOverflowFlag = function () {
        this.flags.overflow = 1;
        this.setPFromFlags();
    };

    NES6502.prototype.clearOverflowFlag = function () {
        this.flags.overflow = 0;
        this.setPFromFlags();
    };

    NES6502.prototype.checkNegativeFlag = function (value) {
        if (value & 0x80) {
            this.setNegativeFlag();
        } else {
            this.clearNegativeFlag();
        }
    };

    NES6502.prototype.setNegativeFlag = function () {
        this.flags.negative = 1;
        this.setPFromFlags();
    };

    NES6502.prototype.clearNegativeFlag = function () {
        this.flags.negative = 0;
        this.setPFromFlags();
    };

    /**
     * Enumeration of address modes
     */
    NES6502.prototype.addressModes = {
        IMPLICIT: 0,  //
        IMMEDIATE: 1,  // #
        ZERO_PAGE: 2,  // d
        ZERO_PAGE_X: 3,  // d, X
        ZERO_PAGE_Y: 4,  // d,Y
        INDEXED_INDIRECT: 5,  // (d, X)
        INDIRECT_INDEXED: 6,  // (d),Y
        ACCUMULATOR: 7,  // A
        RELATIVE: 8,  // r
        ABSOLUTE: 9,  // a
        ABSOLUTE_X: 10, // a, X
        ABSOLUTE_Y: 11, // a, Y,
        INDIRECT_ABSOLUTE: 12 // ? - only used for JMP?
    };

    NES6502.prototype.getOpcodeText = function (opcode) {
        for (var i in this.opcodes) {
            if (this.opcodes[i] == opcode) return i;
        }
    };

    NES6502.prototype.getAddressModeText = function (address_mode) {
        for (var i in this.addressModes) {
            if (this.addressModes[i] == address_mode) return i;
        }
    };

    /**
     * List of opcodes and their operations
     */
    NES6502.prototype.opcodes = {
        ORA: 0,
        AND: 1,
        EOR: 2,
        ADC: 3,
        STA: 4,
        LDA: 5,
        CMP: 6,
        SBC: 7,
        BIT: 8,
        JMP: 9,
        JMP_ABS: 10,
        STY: 11,
        LDY: 12,
        CPY: 13,
        CPX: 14,
        BRK: 15,
        ASL: 16,
        PHP: 17,
        BPL: 18,
        CLC: 19,
        JSR: 20,
        ROL: 21,
        PLP: 22,
        BMI: 23,
        LSR: 24,
        LDX: 25,
        ROR: 26,
        STX: 27,
        DEC: 28,
        INC: 29,
        SEC: 30,
        PHA: 31,
        CLI: 32,
        PLA: 33,
        SEI: 34,
        DEY: 35,
        TYA: 36,
        TAY: 37,
        CLV: 38,
        INY: 39,
        CLD: 40,
        INX: 41,
        SED: 42,
        RTI: 43,
        RTS: 44,
        BCS: 45,
        BNE: 46,
        BEQ: 47,
        BVC: 48,
        BVS: 49,
        BCC: 50,
        TXA: 51,
        TXS: 52,
        TAX: 53,
        TSX: 54,
        DEX: 55,
        NOP: 56
    };

    NES6502.prototype.instruction_table = [];
    NES6502.prototype.instruction_table[0x00] = [NES6502.prototype.opcodes.BRK, NES6502.prototype.addressModes.IMPLICIT, 7];
    NES6502.prototype.instruction_table[0x01] = [NES6502.prototype.opcodes.ORA, NES6502.prototype.addressModes.INDEXED_INDIRECT, 6];
    NES6502.prototype.instruction_table[0x05] = [NES6502.prototype.opcodes.ORA, NES6502.prototype.addressModes.ZERO_PAGE, 3];
    NES6502.prototype.instruction_table[0x06] = [NES6502.prototype.opcodes.ASL, NES6502.prototype.addressModes.ZERO_PAGE, 5];
    NES6502.prototype.instruction_table[0x08] = [NES6502.prototype.opcodes.PHP, NES6502.prototype.addressModes.IMPLICIT, 3];
    NES6502.prototype.instruction_table[0x09] = [NES6502.prototype.opcodes.ORA, NES6502.prototype.addressModes.IMMEDIATE, 2];
    NES6502.prototype.instruction_table[0x0a] = [NES6502.prototype.opcodes.ASL, NES6502.prototype.addressModes.ACCUMULATOR, 2];
    NES6502.prototype.instruction_table[0x0d] = [NES6502.prototype.opcodes.ORA, NES6502.prototype.addressModes.ABSOLUTE, 4];
    NES6502.prototype.instruction_table[0x0e] = [NES6502.prototype.opcodes.ASL, NES6502.prototype.addressModes.ABSOLUTE, 6];
    NES6502.prototype.instruction_table[0x10] = [NES6502.prototype.opcodes.BPL, NES6502.prototype.addressModes.RELATIVE, 2];
    NES6502.prototype.instruction_table[0x11] = [NES6502.prototype.opcodes.ORA, NES6502.prototype.addressModes.INDIRECT_INDEXED, 5];
    NES6502.prototype.instruction_table[0x15] = [NES6502.prototype.opcodes.ORA, NES6502.prototype.addressModes.ZERO_PAGE_X, 4];
    NES6502.prototype.instruction_table[0x16] = [NES6502.prototype.opcodes.ASL, NES6502.prototype.addressModes.ZERO_PAGE_X, 6];
    NES6502.prototype.instruction_table[0x18] = [NES6502.prototype.opcodes.CLC, NES6502.prototype.addressModes.IMPLICIT, 2];
    NES6502.prototype.instruction_table[0x19] = [NES6502.prototype.opcodes.ORA, NES6502.prototype.addressModes.ABSOLUTE_Y, 4];
    NES6502.prototype.instruction_table[0x1d] = [NES6502.prototype.opcodes.ORA, NES6502.prototype.addressModes.ABSOLUTE_X, 4];
    NES6502.prototype.instruction_table[0x1e] = [NES6502.prototype.opcodes.ASL, NES6502.prototype.addressModes.ABSOLUTE_X, 7];
    NES6502.prototype.instruction_table[0x20] = [NES6502.prototype.opcodes.JSR, NES6502.prototype.addressModes.ABSOLUTE, 6];
    NES6502.prototype.instruction_table[0x21] = [NES6502.prototype.opcodes.AND, NES6502.prototype.addressModes.INDEXED_INDIRECT, 6];
    NES6502.prototype.instruction_table[0x24] = [NES6502.prototype.opcodes.BIT, NES6502.prototype.addressModes.ZERO_PAGE, 3];
    NES6502.prototype.instruction_table[0x25] = [NES6502.prototype.opcodes.AND, NES6502.prototype.addressModes.ZERO_PAGE, 3];
    NES6502.prototype.instruction_table[0x26] = [NES6502.prototype.opcodes.ROL, NES6502.prototype.addressModes.ZERO_PAGE, 5];
    NES6502.prototype.instruction_table[0x28] = [NES6502.prototype.opcodes.PLP, NES6502.prototype.addressModes.IMPLICIT, 4];
    NES6502.prototype.instruction_table[0x29] = [NES6502.prototype.opcodes.AND, NES6502.prototype.addressModes.IMMEDIATE, 2];
    NES6502.prototype.instruction_table[0x2a] = [NES6502.prototype.opcodes.ROL, NES6502.prototype.addressModes.ACCUMULATOR, 2];
    NES6502.prototype.instruction_table[0x2c] = [NES6502.prototype.opcodes.BIT, NES6502.prototype.addressModes.ABSOLUTE, 4];
    NES6502.prototype.instruction_table[0x2d] = [NES6502.prototype.opcodes.AND, NES6502.prototype.addressModes.ABSOLUTE, 4];
    NES6502.prototype.instruction_table[0x2e] = [NES6502.prototype.opcodes.ROL, NES6502.prototype.addressModes.ABSOLUTE, 6];
    NES6502.prototype.instruction_table[0x30] = [NES6502.prototype.opcodes.BMI, NES6502.prototype.addressModes.RELATIVE, 2];
    NES6502.prototype.instruction_table[0x31] = [NES6502.prototype.opcodes.AND, NES6502.prototype.addressModes.INDIRECT_INDEXED, 5];
    NES6502.prototype.instruction_table[0x35] = [NES6502.prototype.opcodes.AND, NES6502.prototype.addressModes.ZERO_PAGE_X, 4];
    NES6502.prototype.instruction_table[0x36] = [NES6502.prototype.opcodes.ROL, NES6502.prototype.addressModes.ZERO_PAGE_X, 6];
    NES6502.prototype.instruction_table[0x38] = [NES6502.prototype.opcodes.SEC, NES6502.prototype.addressModes.IMPLICIT];
    NES6502.prototype.instruction_table[0x39] = [NES6502.prototype.opcodes.AND, NES6502.prototype.addressModes.ABSOLUTE_Y, 4];
    NES6502.prototype.instruction_table[0x3c] = [NES6502.prototype.opcodes.BIT, NES6502.prototype.addressModes.ABSOLUTE_X, 4];
    NES6502.prototype.instruction_table[0x3d] = [NES6502.prototype.opcodes.AND, NES6502.prototype.addressModes.ABSOLUTE_X, 4];
    NES6502.prototype.instruction_table[0x3e] = [NES6502.prototype.opcodes.ROL, NES6502.prototype.addressModes.ABSOLUTE_X, 7];
    NES6502.prototype.instruction_table[0x40] = [NES6502.prototype.opcodes.RTI, NES6502.prototype.addressModes.IMPLICIT, 6];
    NES6502.prototype.instruction_table[0x41] = [NES6502.prototype.opcodes.EOR, NES6502.prototype.addressModes.INDEXED_INDIRECT, 6];
    NES6502.prototype.instruction_table[0x42] = [NES6502.prototype.opcodes.LSR, NES6502.prototype.addressModes.IMMEDIATE];
    NES6502.prototype.instruction_table[0x44] = [NES6502.prototype.opcodes.JMP, NES6502.prototype.addressModes.ZERO_PAGE];
    NES6502.prototype.instruction_table[0x45] = [NES6502.prototype.opcodes.EOR, NES6502.prototype.addressModes.ZERO_PAGE, 3];
    NES6502.prototype.instruction_table[0x46] = [NES6502.prototype.opcodes.LSR, NES6502.prototype.addressModes.ZERO_PAGE, 5];
    NES6502.prototype.instruction_table[0x48] = [NES6502.prototype.opcodes.PHA, NES6502.prototype.addressModes.IMPLICIT,3];
    NES6502.prototype.instruction_table[0x49] = [NES6502.prototype.opcodes.EOR, NES6502.prototype.addressModes.IMMEDIATE, 2];
    NES6502.prototype.instruction_table[0x4a] = [NES6502.prototype.opcodes.LSR, NES6502.prototype.addressModes.ACCUMULATOR, 2];
    NES6502.prototype.instruction_table[0x4c] = [NES6502.prototype.opcodes.JMP, NES6502.prototype.addressModes.ABSOLUTE, 3];
    NES6502.prototype.instruction_table[0x4d] = [NES6502.prototype.opcodes.EOR, NES6502.prototype.addressModes.ABSOLUTE, 4];
    NES6502.prototype.instruction_table[0x4e] = [NES6502.prototype.opcodes.LSR, NES6502.prototype.addressModes.ABSOLUTE, 6];
    NES6502.prototype.instruction_table[0x50] = [NES6502.prototype.opcodes.BVC, NES6502.prototype.addressModes.RELATIVE, 2];
    NES6502.prototype.instruction_table[0x51] = [NES6502.prototype.opcodes.EOR, NES6502.prototype.addressModes.INDIRECT_INDEXED, 5];
    NES6502.prototype.instruction_table[0x54] = [NES6502.prototype.opcodes.JMP, NES6502.prototype.addressModes.ZERO_PAGE_X];
    NES6502.prototype.instruction_table[0x55] = [NES6502.prototype.opcodes.EOR, NES6502.prototype.addressModes.ZERO_PAGE_X, 4];
    NES6502.prototype.instruction_table[0x56] = [NES6502.prototype.opcodes.LSR, NES6502.prototype.addressModes.ZERO_PAGE_X, 6];
    NES6502.prototype.instruction_table[0x58] = [NES6502.prototype.opcodes.CLI, NES6502.prototype.addressModes.IMPLICIT, 2];
    NES6502.prototype.instruction_table[0x59] = [NES6502.prototype.opcodes.EOR, NES6502.prototype.addressModes.ABSOLUTE_Y, 4];
    NES6502.prototype.instruction_table[0x5c] = [NES6502.prototype.opcodes.JMP, NES6502.prototype.addressModes.ABSOLUTE_X];
    NES6502.prototype.instruction_table[0x5d] = [NES6502.prototype.opcodes.EOR, NES6502.prototype.addressModes.ABSOLUTE_X, 4];
    NES6502.prototype.instruction_table[0x5e] = [NES6502.prototype.opcodes.LSR, NES6502.prototype.addressModes.ABSOLUTE_X, 7];
    NES6502.prototype.instruction_table[0x60] = [NES6502.prototype.opcodes.RTS, NES6502.prototype.addressModes.IMPLICIT, 6];
    NES6502.prototype.instruction_table[0x61] = [NES6502.prototype.opcodes.ADC, NES6502.prototype.addressModes.INDEXED_INDIRECT, 6];
    NES6502.prototype.instruction_table[0x64] = [NES6502.prototype.opcodes.JMP, NES6502.prototype.addressModes.ZERO_PAGE];
    NES6502.prototype.instruction_table[0x65] = [NES6502.prototype.opcodes.ADC, NES6502.prototype.addressModes.ZERO_PAGE, 3];
    NES6502.prototype.instruction_table[0x66] = [NES6502.prototype.opcodes.ROR, NES6502.prototype.addressModes.ZERO_PAGE, 5];
    NES6502.prototype.instruction_table[0x68] = [NES6502.prototype.opcodes.PLA, NES6502.prototype.addressModes.IMPLICIT, 4];
    NES6502.prototype.instruction_table[0x69] = [NES6502.prototype.opcodes.ADC, NES6502.prototype.addressModes.IMMEDIATE, 2];
    NES6502.prototype.instruction_table[0x6a] = [NES6502.prototype.opcodes.ROR, NES6502.prototype.addressModes.ACCUMULATOR, 2];
    NES6502.prototype.instruction_table[0x6c] = [NES6502.prototype.opcodes.JMP, NES6502.prototype.addressModes.ABSOLUTE, 5];
    NES6502.prototype.instruction_table[0x6d] = [NES6502.prototype.opcodes.ADC, NES6502.prototype.addressModes.ABSOLUTE, 4];
    NES6502.prototype.instruction_table[0x6e] = [NES6502.prototype.opcodes.ROR, NES6502.prototype.addressModes.ABSOLUTE, 6];
    NES6502.prototype.instruction_table[0x70] = [NES6502.prototype.opcodes.BVS, NES6502.prototype.addressModes.RELATIVE, 2];
    NES6502.prototype.instruction_table[0x71] = [NES6502.prototype.opcodes.ADC, NES6502.prototype.addressModes.INDIRECT_INDEXED, 5];
    NES6502.prototype.instruction_table[0x74] = [NES6502.prototype.opcodes.JMP, NES6502.prototype.addressModes.ZERO_PAGE_X];
    NES6502.prototype.instruction_table[0x75] = [NES6502.prototype.opcodes.ADC, NES6502.prototype.addressModes.ZERO_PAGE_X, 4];
    NES6502.prototype.instruction_table[0x76] = [NES6502.prototype.opcodes.ROR, NES6502.prototype.addressModes.ZERO_PAGE_X, 6];
    NES6502.prototype.instruction_table[0x78] = [NES6502.prototype.opcodes.SEI, NES6502.prototype.addressModes.IMPLICIT];
    NES6502.prototype.instruction_table[0x79] = [NES6502.prototype.opcodes.ADC, NES6502.prototype.addressModes.ABSOLUTE_Y, 4];
    NES6502.prototype.instruction_table[0x7c] = [NES6502.prototype.opcodes.JMP, NES6502.prototype.addressModes.ABSOLUTE_X];
    NES6502.prototype.instruction_table[0x7d] = [NES6502.prototype.opcodes.ADC, NES6502.prototype.addressModes.ABSOLUTE_X, 4];
    NES6502.prototype.instruction_table[0x7e] = [NES6502.prototype.opcodes.ROR, NES6502.prototype.addressModes.ABSOLUTE_X, 7];
    NES6502.prototype.instruction_table[0x80] = [NES6502.prototype.opcodes.STY, NES6502.prototype.addressModes.IMMEDIATE];
    NES6502.prototype.instruction_table[0x81] = [NES6502.prototype.opcodes.STA, NES6502.prototype.addressModes.INDEXED_INDIRECT];
    NES6502.prototype.instruction_table[0x82] = [NES6502.prototype.opcodes.STX, NES6502.prototype.addressModes.IMMEDIATE];
    NES6502.prototype.instruction_table[0x84] = [NES6502.prototype.opcodes.STY, NES6502.prototype.addressModes.ZERO_PAGE];
    NES6502.prototype.instruction_table[0x85] = [NES6502.prototype.opcodes.STA, NES6502.prototype.addressModes.ZERO_PAGE];
    NES6502.prototype.instruction_table[0x86] = [NES6502.prototype.opcodes.STX, NES6502.prototype.addressModes.ZERO_PAGE];
    NES6502.prototype.instruction_table[0x88] = [NES6502.prototype.opcodes.DEY, NES6502.prototype.addressModes.IMPLICIT, 2];
    NES6502.prototype.instruction_table[0x89] = [NES6502.prototype.opcodes.STA, NES6502.prototype.addressModes.IMMEDIATE];
    NES6502.prototype.instruction_table[0x8a] = [NES6502.prototype.opcodes.TXA, NES6502.prototype.addressModes.IMPLICIT];
    NES6502.prototype.instruction_table[0x8c] = [NES6502.prototype.opcodes.STY, NES6502.prototype.addressModes.ABSOLUTE];
    NES6502.prototype.instruction_table[0x8d] = [NES6502.prototype.opcodes.STA, NES6502.prototype.addressModes.ABSOLUTE];
    NES6502.prototype.instruction_table[0x8e] = [NES6502.prototype.opcodes.STX, NES6502.prototype.addressModes.ABSOLUTE];
    NES6502.prototype.instruction_table[0x90] = [NES6502.prototype.opcodes.BCC, NES6502.prototype.addressModes.RELATIVE, 2];
    NES6502.prototype.instruction_table[0x91] = [NES6502.prototype.opcodes.STA, NES6502.prototype.addressModes.INDIRECT_INDEXED];
    NES6502.prototype.instruction_table[0x94] = [NES6502.prototype.opcodes.STY, NES6502.prototype.addressModes.ZERO_PAGE_X];
    NES6502.prototype.instruction_table[0x95] = [NES6502.prototype.opcodes.STA, NES6502.prototype.addressModes.ZERO_PAGE_X];
    NES6502.prototype.instruction_table[0x96] = [NES6502.prototype.opcodes.STX, NES6502.prototype.addressModes.ZERO_PAGE_X];
    NES6502.prototype.instruction_table[0x98] = [NES6502.prototype.opcodes.TYA, NES6502.prototype.addressModes.IMPLICIT];
    NES6502.prototype.instruction_table[0x99] = [NES6502.prototype.opcodes.STA, NES6502.prototype.addressModes.ABSOLUTE_Y];
    NES6502.prototype.instruction_table[0x9a] = [NES6502.prototype.opcodes.TXS, NES6502.prototype.addressModes.IMPLICIT];
    NES6502.prototype.instruction_table[0x9c] = [NES6502.prototype.opcodes.STY, NES6502.prototype.addressModes.ABSOLUTE_X];
    NES6502.prototype.instruction_table[0x9d] = [NES6502.prototype.opcodes.STA, NES6502.prototype.addressModes.ABSOLUTE_X];
    NES6502.prototype.instruction_table[0x9e] = [NES6502.prototype.opcodes.STX, NES6502.prototype.addressModes.ABSOLUTE_X];
    NES6502.prototype.instruction_table[0xa0] = [NES6502.prototype.opcodes.LDY, NES6502.prototype.addressModes.IMMEDIATE, 2];
    NES6502.prototype.instruction_table[0xa1] = [NES6502.prototype.opcodes.LDA, NES6502.prototype.addressModes.INDEXED_INDIRECT, 6];
    NES6502.prototype.instruction_table[0xa2] = [NES6502.prototype.opcodes.LDX, NES6502.prototype.addressModes.IMMEDIATE, 2];
    NES6502.prototype.instruction_table[0xa4] = [NES6502.prototype.opcodes.LDY, NES6502.prototype.addressModes.ZERO_PAGE, 3];
    NES6502.prototype.instruction_table[0xa5] = [NES6502.prototype.opcodes.LDA, NES6502.prototype.addressModes.ZERO_PAGE, 3];
    NES6502.prototype.instruction_table[0xa6] = [NES6502.prototype.opcodes.LDX, NES6502.prototype.addressModes.ZERO_PAGE, 3];
    NES6502.prototype.instruction_table[0xa8] = [NES6502.prototype.opcodes.TAY, NES6502.prototype.addressModes.IMPLICIT];
    NES6502.prototype.instruction_table[0xa9] = [NES6502.prototype.opcodes.LDA, NES6502.prototype.addressModes.IMMEDIATE, 2];
    NES6502.prototype.instruction_table[0xaa] = [NES6502.prototype.opcodes.TAX, NES6502.prototype.addressModes.IMPLICIT];
    NES6502.prototype.instruction_table[0xac] = [NES6502.prototype.opcodes.LDY, NES6502.prototype.addressModes.ABSOLUTE, 4];
    NES6502.prototype.instruction_table[0xad] = [NES6502.prototype.opcodes.LDA, NES6502.prototype.addressModes.ABSOLUTE, 4];
    NES6502.prototype.instruction_table[0xae] = [NES6502.prototype.opcodes.LDX, NES6502.prototype.addressModes.ABSOLUTE, 4];
    NES6502.prototype.instruction_table[0xb0] = [NES6502.prototype.opcodes.BCS, NES6502.prototype.addressModes.RELATIVE, 2];
    NES6502.prototype.instruction_table[0xb1] = [NES6502.prototype.opcodes.LDA, NES6502.prototype.addressModes.INDIRECT_INDEXED, 5];
    NES6502.prototype.instruction_table[0xb4] = [NES6502.prototype.opcodes.LDY, NES6502.prototype.addressModes.ZERO_PAGE_X, 4];
    NES6502.prototype.instruction_table[0xb5] = [NES6502.prototype.opcodes.LDA, NES6502.prototype.addressModes.ZERO_PAGE_X, 4];
    NES6502.prototype.instruction_table[0xb6] = [NES6502.prototype.opcodes.LDX, NES6502.prototype.addressModes.ZERO_PAGE_X, 4];
    NES6502.prototype.instruction_table[0xb8] = [NES6502.prototype.opcodes.CLV, NES6502.prototype.addressModes.IMPLICIT, 2];
    NES6502.prototype.instruction_table[0xb9] = [NES6502.prototype.opcodes.LDA, NES6502.prototype.addressModes.ABSOLUTE_Y, 4];
    NES6502.prototype.instruction_table[0xba] = [NES6502.prototype.opcodes.TSX, NES6502.prototype.addressModes.IMPLICIT];
    NES6502.prototype.instruction_table[0xbc] = [NES6502.prototype.opcodes.LDY, NES6502.prototype.addressModes.ABSOLUTE_X, 4];
    NES6502.prototype.instruction_table[0xbd] = [NES6502.prototype.opcodes.LDA, NES6502.prototype.addressModes.ABSOLUTE_X, 4];
    NES6502.prototype.instruction_table[0xbe] = [NES6502.prototype.opcodes.LDX, NES6502.prototype.addressModes.ABSOLUTE_X, 4];
    NES6502.prototype.instruction_table[0xc0] = [NES6502.prototype.opcodes.CPY, NES6502.prototype.addressModes.IMMEDIATE, 2];
    NES6502.prototype.instruction_table[0xc1] = [NES6502.prototype.opcodes.CMP, NES6502.prototype.addressModes.INDEXED_INDIRECT, 6];
    NES6502.prototype.instruction_table[0xc4] = [NES6502.prototype.opcodes.CPY, NES6502.prototype.addressModes.ZERO_PAGE, 3];
    NES6502.prototype.instruction_table[0xc5] = [NES6502.prototype.opcodes.CMP, NES6502.prototype.addressModes.ZERO_PAGE, 3];
    NES6502.prototype.instruction_table[0xc6] = [NES6502.prototype.opcodes.DEC, NES6502.prototype.addressModes.ZERO_PAGE, 5];
    NES6502.prototype.instruction_table[0xc8] = [NES6502.prototype.opcodes.INY, NES6502.prototype.addressModes.IMPLICIT, 2];
    NES6502.prototype.instruction_table[0xc9] = [NES6502.prototype.opcodes.CMP, NES6502.prototype.addressModes.IMMEDIATE, 2];
    NES6502.prototype.instruction_table[0xca] = [NES6502.prototype.opcodes.DEX, NES6502.prototype.addressModes.IMPLICIT, 2];
    NES6502.prototype.instruction_table[0xcc] = [NES6502.prototype.opcodes.CPY, NES6502.prototype.addressModes.ABSOLUTE, 4];
    NES6502.prototype.instruction_table[0xcd] = [NES6502.prototype.opcodes.CMP, NES6502.prototype.addressModes.ABSOLUTE, 4];
    NES6502.prototype.instruction_table[0xce] = [NES6502.prototype.opcodes.DEC, NES6502.prototype.addressModes.ABSOLUTE, 6];
    NES6502.prototype.instruction_table[0xd0] = [NES6502.prototype.opcodes.BNE, NES6502.prototype.addressModes.RELATIVE, 2];
    NES6502.prototype.instruction_table[0xd1] = [NES6502.prototype.opcodes.CMP, NES6502.prototype.addressModes.INDIRECT_INDEXED, 5];
    NES6502.prototype.instruction_table[0xd4] = [NES6502.prototype.opcodes.CPY, NES6502.prototype.addressModes.ZERO_PAGE_X];
    NES6502.prototype.instruction_table[0xd5] = [NES6502.prototype.opcodes.CMP, NES6502.prototype.addressModes.ZERO_PAGE_X, 4];
    NES6502.prototype.instruction_table[0xd6] = [NES6502.prototype.opcodes.DEC, NES6502.prototype.addressModes.ZERO_PAGE_X, 6];
    NES6502.prototype.instruction_table[0xd8] = [NES6502.prototype.opcodes.CLD, NES6502.prototype.addressModes.IMPLICIT, 2];
    NES6502.prototype.instruction_table[0xd9] = [NES6502.prototype.opcodes.CMP, NES6502.prototype.addressModes.ABSOLUTE_Y, 4];
    NES6502.prototype.instruction_table[0xdc] = [NES6502.prototype.opcodes.CPY, NES6502.prototype.addressModes.ABSOLUTE_X];
    NES6502.prototype.instruction_table[0xdd] = [NES6502.prototype.opcodes.CMP, NES6502.prototype.addressModes.ABSOLUTE_X, 4];
    NES6502.prototype.instruction_table[0xde] = [NES6502.prototype.opcodes.DEC, NES6502.prototype.addressModes.ABSOLUTE_X, 7];
    NES6502.prototype.instruction_table[0xe0] = [NES6502.prototype.opcodes.CPX, NES6502.prototype.addressModes.IMMEDIATE, 2];
    NES6502.prototype.instruction_table[0xe1] = [NES6502.prototype.opcodes.SBC, NES6502.prototype.addressModes.INDEXED_INDIRECT, 6];
    NES6502.prototype.instruction_table[0xe4] = [NES6502.prototype.opcodes.CPX, NES6502.prototype.addressModes.ZERO_PAGE, 3];
    NES6502.prototype.instruction_table[0xe5] = [NES6502.prototype.opcodes.SBC, NES6502.prototype.addressModes.ZERO_PAGE, 3];
    NES6502.prototype.instruction_table[0xe6] = [NES6502.prototype.opcodes.INC, NES6502.prototype.addressModes.ZERO_PAGE, 5];
    NES6502.prototype.instruction_table[0xe8] = [NES6502.prototype.opcodes.INX, NES6502.prototype.addressModes.IMPLICIT, 2];
    NES6502.prototype.instruction_table[0xe9] = [NES6502.prototype.opcodes.SBC, NES6502.prototype.addressModes.IMMEDIATE, 2];
    NES6502.prototype.instruction_table[0xea] = [NES6502.prototype.opcodes.NOP, NES6502.prototype.addressModes.IMPLICIT, 2];
    NES6502.prototype.instruction_table[0xec] = [NES6502.prototype.opcodes.CPX, NES6502.prototype.addressModes.ABSOLUTE, 4];
    NES6502.prototype.instruction_table[0xed] = [NES6502.prototype.opcodes.SBC, NES6502.prototype.addressModes.ABSOLUTE, 4];
    NES6502.prototype.instruction_table[0xee] = [NES6502.prototype.opcodes.INC, NES6502.prototype.addressModes.ABSOLUTE, 6];
    NES6502.prototype.instruction_table[0xf0] = [NES6502.prototype.opcodes.BEQ, NES6502.prototype.addressModes.RELATIVE, 2];
    NES6502.prototype.instruction_table[0xf1] = [NES6502.prototype.opcodes.SBC, NES6502.prototype.addressModes.INDIRECT_INDEXED, 5];
    NES6502.prototype.instruction_table[0xf4] = [NES6502.prototype.opcodes.CPX, NES6502.prototype.addressModes.ZERO_PAGE_X];
    NES6502.prototype.instruction_table[0xf5] = [NES6502.prototype.opcodes.SBC, NES6502.prototype.addressModes.ZERO_PAGE_X, 4];
    NES6502.prototype.instruction_table[0xf6] = [NES6502.prototype.opcodes.INC, NES6502.prototype.addressModes.ZERO_PAGE_X, 6];
    NES6502.prototype.instruction_table[0xf8] = [NES6502.prototype.opcodes.SED, NES6502.prototype.addressModes.IMPLICIT];
    NES6502.prototype.instruction_table[0xf9] = [NES6502.prototype.opcodes.SBC, NES6502.prototype.addressModes.ABSOLUTE_Y, 4];
    NES6502.prototype.instruction_table[0xfc] = [NES6502.prototype.opcodes.CPX, NES6502.prototype.addressModes.ABSOLUTE_X];
    NES6502.prototype.instruction_table[0xfd] = [NES6502.prototype.opcodes.SBC, NES6502.prototype.addressModes.ABSOLUTE_X, 4];
    NES6502.prototype.instruction_table[0xfe] = [NES6502.prototype.opcodes.INC, NES6502.prototype.addressModes.ABSOLUTE_X, 7];

    /**
     * Reads the appropriate memory location and returns the value, depending on the address mode
     * @param addressMode number The address mode of the current operation.
     * @returns object
     */
    NES6502.prototype.readMemory = function (addressMode) {

        var address;
        var value;

        switch (addressMode) {
            case this.addressModes.IMMEDIATE:
                // 8 bit
                address = this.registers.PC++;
                value = this.mmc.fetch(address);
                break;
            case this.addressModes.ACCUMULATOR:
                address = null;
                value = this.registers.A;
                break;
            case this.addressModes.ZERO_PAGE:
                // 8 bit
                address = this.registers.PC++ & 0xff;
                value = this.mmc.fetch(address);
                break;
            case this.addressModes.ZERO_PAGE_X:
                // 8 bit
                address = ((this.registers.PC++ & 0xff) + this.registers.X) & 0xff;
                value = this.mmc.fetch(address);
                break;
            case this.addressModes.ZERO_PAGE_Y:
                // 8 bit
                address = ((this.registers.PC++ & 0xff) + this.registers.Y) & 0xff;
                value = this.mmc.fetch(address);
                break;
            case this.addressModes.ABSOLUTE:
                // 16 bit
                address = this.registers.PC;
                this.registers.PC += 2;
                address = this.mmc.fetch(address) | (this.mmc.fetch(address + 1) << 8);
                value = this.mmc.fetch(address);
                break;
            case this.addressModes.ABSOLUTE_X:
                //16 bit
                address = this.registers.PC;
                this.registers.PC += 2;
                address = (this.mmc.fetch(address) | (this.mmc.fetch(address + 1) << 8)) & 0xFFFF;
                if ((address & 0xFF00) != ((address + this.registers.X) & 0xFF00)) {
                    this.memoryCycles += 1;
                }
                address = address + this.registers.X;
                value = this.mmc.fetch(address);
                break;
            case this.addressModes.ABSOLUTE_Y:
                //16 bit
                address = this.registers.PC;
                this.registers.PC += 2;
                address = (this.mmc.fetch(address) | (this.mmc.fetch(address + 1) << 8)) & 0xFFFF;
                if ((address & 0xFF00) != ((address + this.registers.Y) & 0xFF00)) {
                    this.memoryCycles += 1;
                }
                address = address + this.registers.Y;
                value = this.mmc.fetch(address);
                break;
            case this.addressModes.RELATIVE:

                address = this.mmc.fetch(this.registers.PC++);

                if (address < 0x80) {
                    address = this.registers.PC + address;
                } else {
                    address = this.registers.PC - (address - 0x80);
                }

                value = this.mmc.fetch(address);
                break;
            case this.addressModes.INDEXED_INDIRECT:

                address = this.mmc.fetch(this.registers.PC++);
                address = (address + this.registers.X) & 0xff;
                address = this.mmc.fetch(address) | (this.mmc.fetch(address + 1) << 8);
                value = this.mmc.fetch(address);
                break;
            case this.addressModes.INDIRECT_INDEXED:

                address = this.mmc.fetch(this.registers.PC++);
                address = this.mmc.fetch(address) | (this.mmc.fetch(address + 1) << 8);
                address = (address + this.registers.Y) & 0xffff;
                value = this.mmc.fetch(address);
                break;
            case this.addressModes.IMPLICIT:
                throw new this.CPUError("Cannot read memory for an implicit addressing mode operation");
            default:
                throw new this.CPUError("Cannot read memory: Unsupported addressing mode");
        }

        return {
            address: address,
            value: value
        };

    };

    NES6502.prototype.push = function (value) {
        // Stack lives at $0100 - $01ff. First value lives at 0x1ff
        this.mmc.store(this.registers.SP, value);
        this.registers.SP = (--this.registers.SP & 0xFF) + 0x100; // wrap around stack for mario hax
    };

    NES6502.prototype.pop = function () {
        this.registers.SP = (++this.registers.SP & 0xFF) + 0x100; // wrap around stack
        return this.mmc.fetch(this.registers.SP);
    };

    NES6502.prototype.peek = function () {
        return this.mmc.fetch(((this.registers.SP + 1) & 0xFF) + 0x100);
    };

    NES6502.prototype.execute = function () {

        this.memoryCycles = 0;
        this.extraCycles = 0;

        var opcode = this.mmc.fetch(this.registers.PC++);

        if (!(opcode in this.instruction_table)) {
            throw new this.CPUError("Invalid opcode: 0x" + opcode.toString(16));
        }

        var instruction = this.instruction_table[opcode];

        if (instruction.length != 3) {
            throw new this.CPUError("Invalid instruction definition - wrong number of parameters");
        }

        if (!(instruction[0] in this.operations)) {
            throw new this.CPUError("Operation exists in instruction table but is not defined: 0x" + opcode.toString(16));
        }

        this.operations[instruction[0]].apply(this, [instruction[1]]);

        return instruction[2] + this.memoryCycles + this.extraCycles;
    };

    // http://www.obelisk.demon.co.uk/6502/reference.html#LDA
    NES6502.prototype.operations = [];

    NES6502.prototype.operations[NES6502.prototype.opcodes.ADC] = function (addressMode) {

        var mem = this.readMemory(addressMode).value;

        var tmp = this.registers.A + mem + this.flags.carry;

        this.checkOverflowFlag(this.registers.A, mem, tmp, true);

        this.registers.A = tmp & 0xff;

        this.checkCarryFlag(tmp);
        this.checkNegativeFlag(tmp);
        this.checkZeroFlag(this.registers.A);
    };

    NES6502.prototype.operations[NES6502.prototype.opcodes.AND] = function (addressMode) {

        this.registers.A = this.readMemory(addressMode).value & this.registers.A;

        this.checkNegativeFlag(this.registers.A);
        this.checkZeroFlag(this.registers.A);
    };

    NES6502.prototype.operations[NES6502.prototype.opcodes.ASL] = function (addressMode) {

        var tmp = 0;

        if (addressMode === this.addressModes.ACCUMULATOR) {
            tmp = this.registers.A << 1;
            this.registers.A = tmp & 0xff;
        } else {
            var mem = this.readMemory(addressMode);
            tmp = mem.value << 1;
            this.mmc.store(mem.address, tmp & 0xff);
        }

        this.checkCarryFlag(tmp);
        this.checkNegativeFlag(tmp);
        this.checkZeroFlag(this.registers.A);

    };

    NES6502.prototype.operations[NES6502.prototype.opcodes.BCC] = function (addressMode) {

        if (this.flags.carry === 0) {
            this.extraCycles++;
            var old_pc = this.registers.PC;
            var inc = this.readMemory(addressMode).value;

            this.registers.PC += inc;

            if ((this.registers.PC & 0xFF00) !== (old_pc & 0xFF00)) {
                this.extraCycles++;
            }
        }
    };

    NES6502.prototype.operations[NES6502.prototype.opcodes.BCS] = function (addressMode) {

        if (this.flags.carry === 1) {
            this.extraCycles++;
            var old_pc = this.registers.PC;
            var inc = this.readMemory(addressMode).value;

            this.registers.PC += inc;

            if ((this.registers.PC & 0xFF00) !== (old_pc & 0xFF00)) {
                this.extraCycles++;
            }
        }
    };

    NES6502.prototype.operations[NES6502.prototype.opcodes.BEQ] = function (addressMode) {

        if (this.flags.zero === 1) {
            this.extraCycles++;
            var old_pc = this.registers.PC;
            var inc = this.readMemory(addressMode).value;

            this.registers.PC += inc;

            if ((this.registers.PC & 0xFF00) !== (old_pc & 0xFF00)) {
                this.extraCycles++;
            }
        }
    };

    NES6502.prototype.operations[NES6502.prototype.opcodes.BIT] = function (addressMode) {

        var mem = this.readMemory(addressMode);

        this.checkNegativeFlag(mem.value);

        if ((mem.value >> 6) & 1) {
            this.setOverflowFlag();
        } else {
            this.clearOverflowFlag();
        }

        this.checkZeroFlag(this.registers.A & mem.value);
    };

    NES6502.prototype.operations[NES6502.prototype.opcodes.BMI] = function (addressMode) {

        if (this.flags.negative === 1) {
            this.extraCycles++;
            var old_pc = this.registers.PC;
            var inc = this.readMemory(addressMode).value;

            this.registers.PC += inc;

            if ((this.registers.PC & 0xFF00) !== (old_pc & 0xFF00)) {
                this.extraCycles++;
            }
        }
    };

    NES6502.prototype.operations[NES6502.prototype.opcodes.BNE] = function (addressMode) {

        if (this.flags.zero === 0) {
            this.extraCycles++;
            var old_pc = this.registers.PC;
            var inc = this.readMemory(addressMode).value;

            this.registers.PC += inc;

            if ((this.registers.PC & 0xFF00) !== (old_pc & 0xFF00)) {
                this.extraCycles++;
            }
        }
    };

    NES6502.prototype.operations[NES6502.prototype.opcodes.BPL] = function (addressMode) {

        if (this.flags.negative === 0) {
            this.extraCycles++;
            var old_pc = this.registers.PC;
            var inc = this.readMemory(addressMode).value;

            this.registers.PC += inc;

            if ((this.registers.PC & 0xFF00) !== (old_pc & 0xFF00)) {
                this.extraCycles++;
            }
        }
    };

    /**
     * The BRK instruction forces the generation of an interrupt request.
     * The program counter and processor status are pushed on the stack then the IRQ interrupt vector at $FFFE/F is
     * loaded into the PC and the break flag in the status set to one.
     *
     * @param addressMode Memory addressing mode
     */
    NES6502.prototype.operations[NES6502.prototype.opcodes.BRK] = function (addressMode) {

        this.registers.PC++;

        this.push((this.registers.PC >> 8) & 0xff);
        this.push(this.registers.PC & 0xff);

        this.push(this.registers.P);

        this.setBrkFlag();

        this.registers.PC = mmc.fetch(0xFFFE) | (mmc.fetch(0xFFFF) << 8);
    };

    NES6502.prototype.operations[NES6502.prototype.opcodes.BVC] = function (addressMode) {

        if (this.flags.overflow === 0) {
            this.extraCycles++;
            var old_pc = this.registers.PC;
            var inc = this.readMemory(addressMode).value;

            this.registers.PC += inc;

            if ((this.registers.PC & 0xFF00) !== (old_pc & 0xFF00)) {
                this.extraCycles++;
            }
        }
    };

    NES6502.prototype.operations[NES6502.prototype.opcodes.BVS] = function (addressMode) {

        if (this.flags.overflow === 1) {
            this.extraCycles++;
            var old_pc = this.registers.PC;
            var inc = this.readMemory(addressMode).value;

            this.registers.PC += inc;

            if ((this.registers.PC & 0xFF00) !== (old_pc & 0xFF00)) {
                this.extraCycles++;
            }
        }
    };

    NES6502.prototype.operations[NES6502.prototype.opcodes.CLC] = function (addressMode) {
        this.clearCarryFlag();
    };

    NES6502.prototype.operations[NES6502.prototype.opcodes.CLD] = function (addressMode) {
        this.clearDecimalFlag();
    };

    NES6502.prototype.operations[NES6502.prototype.opcodes.CLI] = function (addressMode) {
        this.clearInterruptDisableFlag();
    };

    NES6502.prototype.operations[NES6502.prototype.opcodes.CLV] = function (addressMode) {
        this.clearOverflowFlag();
    };

    NES6502.prototype.operations[NES6502.prototype.opcodes.CMP] = function (addressMode) {

        var val = this.registers.A - this.readMemory(addressMode).value;

        if (val >= 0) {
            this.setCarryFlag();
        } else {
            this.clearCarryFlag();
        }

        this.checkZeroFlag(val);
        this.checkNegativeFlag(val);
    };

    NES6502.prototype.operations[NES6502.prototype.opcodes.CPX] = function (addressMode) {

        var val = this.registers.X - this.readMemory(addressMode).value;

        if (val >= 0) {
            this.setCarryFlag();
        } else {
            this.clearCarryFlag();
        }

        this.checkZeroFlag(val);
        this.checkNegativeFlag(val);
    };

    NES6502.prototype.operations[NES6502.prototype.opcodes.CPY] = function (addressMode) {

        var val = this.registers.Y - this.readMemory(addressMode).value;

        if (val >= 0) {
            this.setCarryFlag();
        } else {
            this.clearCarryFlag();
        }

        this.checkZeroFlag(val);
        this.checkNegativeFlag(val);
    };

    NES6502.prototype.operations[NES6502.prototype.opcodes.DEC] = function (addressMode) {

        var m = this.readMemory(addressMode);

        var r = (m.value - 1) & 0xff;

        this.checkZeroFlag(r);
        this.checkNegativeFlag(r);

        this.mmc.store(m.address, r);
    };

    NES6502.prototype.operations[NES6502.prototype.opcodes.INC] = function (addressMode) {

        var m = this.readMemory(addressMode);

        var r = (m.value + 1) & 0xff;

        this.checkZeroFlag(r);
        this.checkNegativeFlag(r);

        this.mmc.store(m.address, r);
    };

    NES6502.prototype.operations[NES6502.prototype.opcodes.DEX] = function (addressMode) {

        this.registers.X = (this.registers.X - 1) & 0xff;

        this.checkZeroFlag(this.registers.X);
        this.checkNegativeFlag(this.registers.X);
    };

    NES6502.prototype.operations[NES6502.prototype.opcodes.DEY] = function (addressMode) {

        this.registers.Y = (this.registers.Y - 1) & 0xff;

        this.checkZeroFlag(this.registers.Y);
        this.checkNegativeFlag(this.registers.Y);
    };

    NES6502.prototype.operations[NES6502.prototype.opcodes.EOR] = function (addressMode) {

        this.registers.A = this.registers.A ^ this.readMemory(addressMode).value;

        this.checkZeroFlag(this.registers.A);
        this.checkNegativeFlag(this.registers.A);
    };

    NES6502.prototype.operations[NES6502.prototype.opcodes.INX] = function (addressMode) {

        this.registers.X = (this.registers.X + 1) & 0xff;

        this.checkZeroFlag(this.registers.X);
        this.checkNegativeFlag(this.registers.X);
    };

    NES6502.prototype.operations[NES6502.prototype.opcodes.INY] = function (addressMode) {

        this.registers.Y = (this.registers.Y + 1) & 0xff;

        this.checkZeroFlag(this.registers.Y);
        this.checkNegativeFlag(this.registers.Y);
    };

    NES6502.prototype.operations[NES6502.prototype.opcodes.JMP] = function (addressMode) {
        this.registers.PC = this.readMemory(addressMode).address;
    };

    NES6502.prototype.operations[NES6502.prototype.opcodes.JSR] = function (addressMode) {
        var mem = this.readMemory(addressMode);
        this.push( (this.registers.PC >> 8) & 0xff );
        this.push( this.registers.PC & 0xff );
        this.registers.PC = mem.address;
    };

    NES6502.prototype.operations[NES6502.prototype.opcodes.LDA] = function (addressMode) {

        var value = this.readMemory(addressMode).value;
        this.registers.A = value;

        this.checkZeroFlag(this.registers.A);
        this.checkNegativeFlag(this.registers.A);

    };

    NES6502.prototype.operations[NES6502.prototype.opcodes.LDX] = function (addressMode) {

        var value = this.readMemory(addressMode).value;
        this.registers.X = value;

        this.checkZeroFlag(this.registers.X);
        this.checkNegativeFlag(this.registers.X);

    };

    NES6502.prototype.operations[NES6502.prototype.opcodes.LDY] = function (addressMode) {

        var value = this.readMemory(addressMode).value;
        this.registers.Y = value;

        this.checkZeroFlag(this.registers.Y);
        this.checkNegativeFlag(this.registers.Y);

    };

    NES6502.prototype.operations[NES6502.prototype.opcodes.LSR] = function (addressMode) {

        if(addressMode === this.addressModes.ACCUMULATOR){
            this.checkCarryFlag(0xff + (this.registers.A & 0x1));
            this.registers.A = this.registers.A >> 1;
            this.checkNegativeFlag(this.registers.A);
            this.checkZeroFlag(this.registers.A);
        }else{
            var mem = this.readMemory(addressMode);
            this.checkCarryFlag(0xff + (mem.value & 0x1));
            mem.value = mem.value >> 1;
            this.checkNegativeFlag(mem.value);
            this.checkZeroFlag(mem.value);
            this.mmc.store(mem.address, mem.value);
        }

    };

    NES6502.prototype.operations[NES6502.prototype.opcodes.NOP] = function (addressMode) {
        //nothing!
    };

    NES6502.prototype.operations[NES6502.prototype.opcodes.ORA] = function (addressMode) {

        this.registers.A = this.registers.A | this.readMemory(addressMode).value;

        this.checkZeroFlag(this.registers.A);
        this.checkNegativeFlag(this.registers.A);
    };

    NES6502.prototype.operations[NES6502.prototype.opcodes.PHA] = function (addressMode) {
        this.push(this.registers.A);
    };

    NES6502.prototype.operations[NES6502.prototype.opcodes.PHP] = function (addressMode) {
        this.push(this.registers.P);
    };

    NES6502.prototype.operations[NES6502.prototype.opcodes.PLA] = function (addressMode) {
        this.registers.A = this.pop();
        this.checkZeroFlag(this.registers.A);
        this.checkNegativeFlag(this.registers.A);
    };

    NES6502.prototype.operations[NES6502.prototype.opcodes.PLP] = function (addressMode) {
        this.registers.P = this.pop();
        this.setFlagsFromP();
    };

    NES6502.prototype.operations[NES6502.prototype.opcodes.ROL] = function (addressMode) {

        var carry = this.flags.carry;

        if(addressMode === this.addressModes.ACCUMULATOR){
            this.checkCarryFlag(0xff + (this.registers.A & 0x80));
            this.registers.A = ((this.registers.A << 1) & 0xff) | carry;
            this.checkNegativeFlag(this.registers.A);
            this.checkZeroFlag(this.registers.A);
        }else{
            var mem = this.readMemory(addressMode);
            this.checkCarryFlag(0xff + (mem.value & 0x80));
            mem.value = ((mem.value << 1) & 0xff) | carry;
            this.checkNegativeFlag(mem.value);
            this.checkZeroFlag(mem.value);
            this.mmc.store(mem.address, mem.value);
        }
    };

    NES6502.prototype.operations[NES6502.prototype.opcodes.ROR] = function (addressMode) {

        var carry = this.flags.carry;

        if(addressMode === this.addressModes.ACCUMULATOR){
            this.checkCarryFlag(0xff + (this.registers.A & 0x1));
            this.registers.A = ((this.registers.A >> 1) & 0xff) | (carry << 7);
            this.checkNegativeFlag(this.registers.A);
            this.checkZeroFlag(this.registers.A);
        }else{
            var mem = this.readMemory(addressMode);
            this.checkCarryFlag(0xff + (mem.value & 0x1));
            mem.value = ((mem.value >> 1) & 0xff) | (carry << 7);
            this.checkNegativeFlag(mem.value);
            this.checkZeroFlag(mem.value);
            this.mmc.store(mem.address, mem.value);
        }
    };

    NES6502.prototype.operations[NES6502.prototype.opcodes.RTI] = function (addressMode) {

        this.registers.P = this.pop();
        this.setFlagsFromP();
        var hiPC = this.pop();
        var loPC = this.pop();
        this.registers.PC = (hiPC << 8) | loPC;
    };

    NES6502.prototype.operations[NES6502.prototype.opcodes.RTS] = function (addressMode) {
        var hiPC = this.pop();
        var loPC = this.pop();
        this.registers.PC = (hiPC << 8) | loPC;
    };

    NES6502.prototype.operations[NES6502.prototype.opcodes.SBC] = function (addressMode) {

        var mem = this.readMemory(addressMode).value;

        var tmp = this.registers.A - mem - (1 - this.flags.carry);

        this.checkOverflowFlag(this.registers.A, mem, tmp, false);

        this.registers.A = tmp & 0xff;

        this.checkCarryFlag(tmp);
        this.checkNegativeFlag(tmp);
        this.checkZeroFlag(this.registers.A);
    };

    w.JNE.NES6502 = NES6502;

})(window);
