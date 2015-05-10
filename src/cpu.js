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
    var CPU = function (mmc) {

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

    CPU.prototype.CPUError = function (message) {
        this.name = 'CPUError';
        this.message = message;
        this.stack = (new Error()).stack;
    };
    CPU.prototype.CPUError.prototype = new Error();
    CPU.prototype.CPUError.prototype.constructor = CPU.prototype.CPUError;

    /**
     * Enumeration of interrupt request types
     */
    CPU.prototype.IRQ = {
        NORMAL: 0,
        NMI: 1,
        RESET: 2
    };

    /**
     * Reset the CPU
     */
    CPU.prototype.reset = function () {

        this.registers.A = 0;
        this.registers.X = 0;
        this.registers.Y = 0;
        this.registers.SP = 0x1FF;
        this.registers.PC = 0x07FF;
        this.registers.P = 0;

        this.setZeroFlag();
        this.clearCarryFlag();
        this.clearNegativeFlag();
        this.setInterruptDisableFlag();
        this.clearDecimalFlag();
        this.setBrkFlag();
        this.clearOverflowFlag();
        this.setUnusedFlag();

        this.setPFromFlags();

        this.mmc.reset();

        /**
         $0000-$07FF	$800	2KB of work RAM
         $0800-$0FFF	$800	Mirror of $000-$7FF
         $1000-$17FF	$800    Mirror of $000-$7FF
         $1800-$1FFF	$800	Mirror of $000-$7FF
         $2000-$2007	$8      PPU Ctrl Registers
         $2008-$3FFF	$1FF8	*Mirror of $2000-$2007
         $4000-$4020    $20     Registers (Mostly APU)
         $4020-$5FFF	$1FDF   Cartridge Expansion ROM
         $6000-$7FFF	$2000	SRAM
         $8000-$BFFF	$4000	PRG-ROM
         $C000-$FFFF	$4000	PRG-ROM

         http://wiki.nesdev.com/w/index.php/CPU_power_up_state

         */

        for (var i = 0; i < 0x2000; i++) {
            this.mmc.store(i, 0xFF);
        }

        this.mmc.store(0x008, 0xF7);
        this.mmc.store(0x009, 0xEF);
        this.mmc.store(0x00A, 0xDF);
        this.mmc.store(0x00F, 0xBF);
        this.mmc.store(0x808, 0xF7);
        this.mmc.store(0x809, 0xEF);
        this.mmc.store(0x80A, 0xDF);
        this.mmc.store(0x80F, 0xBF);
        this.mmc.store(0x1008, 0xF7);
        this.mmc.store(0x1009, 0xEF);
        this.mmc.store(0x100A, 0xDF);
        this.mmc.store(0x100F, 0xBF);
        this.mmc.store(0x1808, 0xF7);
        this.mmc.store(0x1809, 0xEF);
        this.mmc.store(0x180A, 0xDF);
        this.mmc.store(0x180F, 0xBF);

        for (i = 0x2000; i < this.mmc.length; i++) {
            this.mmc.store(i, 0);
        }
    };

    /**
     * Determine and set the CPU status (P register) from the individual bit flags
     */
    CPU.prototype.setPFromFlags = function () {
        this.registers.P = (this.flags.carry |
        (this.flags.zero << 1) |
        (this.flags.interruptDisable << 2) |
        (this.flags.decimal << 3) |
        (this.flags.brk << 4) |
        (this.flags.unused << 5) |
        (this.flags.overflow << 6) |
        (this.flags.negative << 7)) & 0xff;
    }; // 00110110

    CPU.prototype.setFlagsFromP = function () {
        this.flags.carry = this.registers.P & 0x1;
        this.flags.zero = (this.registers.P >> 1) & 0x1;
        this.flags.interruptDisable = (this.registers.P >> 2) & 0x1;
        this.flags.decimal = (this.registers.P >> 3) & 0x1;
        this.flags.brk = (this.registers.P >> 4) & 0x1;
        this.flags.unused = (this.registers.P >> 5) & 0x1;
        this.flags.overflow = (this.registers.P >> 6) & 0x1;
        this.flags.negative = (this.registers.P >> 7) & 0x1;
    };

    CPU.prototype.checkCarryFlag = function (value) {
        if (value > 0xff) {
            this.setCarryFlag();
        } else {
            this.clearCarryFlag();
        }
    };

    CPU.prototype.setCarryFlag = function () {
        this.flags.carry = 1;
        this.setPFromFlags();
    };

    CPU.prototype.clearCarryFlag = function () {
        this.flags.carry = 0;
        this.setPFromFlags();
    };

    CPU.prototype.setUnusedFlag = function () {
        this.flags.unused = 1;
        this.setPFromFlags();
    };

    CPU.prototype.clearUnusedFlag = function () {
        this.flags.unused = 0;
        this.setPFromFlags();
    };

    CPU.prototype.checkZeroFlag = function (value) {
        if (value === 0) {
            this.setZeroFlag();
        } else {
            this.clearZeroFlag();
        }
    };

    CPU.prototype.setZeroFlag = function () {
        this.flags.zero = 1;
        this.setPFromFlags();
    };

    CPU.prototype.clearZeroFlag = function () {
        this.flags.zero = 0;
        this.setPFromFlags();
    };

    CPU.prototype.setInterruptDisableFlag = function () {
        this.flags.interruptDisable = 1;
        this.setPFromFlags();
    };

    CPU.prototype.clearInterruptDisableFlag = function () {
        this.flags.interruptDisable = 0;
        this.setPFromFlags();
    };

    CPU.prototype.setDecimalFlag = function () {
        this.flags.decimal = 1;
        this.setPFromFlags();
    };

    CPU.prototype.clearDecimalFlag = function () {
        this.flags.decimal = 0;
        this.setPFromFlags();
    };

    CPU.prototype.setBrkFlag = function () {
        this.flags.brk = 1;
        this.setPFromFlags();
    };

    CPU.prototype.clearBrkFlag = function () {
        this.flags.brk = 0;
        this.setPFromFlags();
    };

    CPU.prototype.checkOverflowFlag = function (a, b, total, adc) {
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

    CPU.prototype.setOverflowFlag = function () {
        this.flags.overflow = 1;
        this.setPFromFlags();
    };

    CPU.prototype.clearOverflowFlag = function () {
        this.flags.overflow = 0;
        this.setPFromFlags();
    };

    CPU.prototype.checkNegativeFlag = function (value) {
        if (value & 0x80) {
            this.setNegativeFlag();
        } else {
            this.clearNegativeFlag();
        }
    };

    CPU.prototype.setNegativeFlag = function () {
        this.flags.negative = 1;
        this.setPFromFlags();
    };

    CPU.prototype.clearNegativeFlag = function () {
        this.flags.negative = 0;
        this.setPFromFlags();
    };

    /**
     * Enumeration of address modes
     */
    CPU.prototype.addressModes = {
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

    CPU.prototype.getOpcodeText = function (opcode) {
        for (var i in this.opcodes) {
            if (this.opcodes[i] == opcode) return i;
        }
    };

    CPU.prototype.getAddressModeText = function (address_mode) {
        for (var i in this.addressModes) {
            if (this.addressModes[i] == address_mode) return i;
        }
    };

    /**
     * List of opcodes and their operations
     */
    CPU.prototype.opcodes = {
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

    CPU.prototype.instruction_table = [];
    CPU.prototype.instruction_table[0x00] = [CPU.prototype.opcodes.BRK, CPU.prototype.addressModes.IMPLICIT, 7];
    CPU.prototype.instruction_table[0x01] = [CPU.prototype.opcodes.ORA, CPU.prototype.addressModes.INDEXED_INDIRECT, 6];
    CPU.prototype.instruction_table[0x05] = [CPU.prototype.opcodes.ORA, CPU.prototype.addressModes.ZERO_PAGE, 3];
    CPU.prototype.instruction_table[0x06] = [CPU.prototype.opcodes.ASL, CPU.prototype.addressModes.ZERO_PAGE, 5];
    CPU.prototype.instruction_table[0x08] = [CPU.prototype.opcodes.PHP, CPU.prototype.addressModes.IMPLICIT, 3];
    CPU.prototype.instruction_table[0x09] = [CPU.prototype.opcodes.ORA, CPU.prototype.addressModes.IMMEDIATE, 2];
    CPU.prototype.instruction_table[0x0a] = [CPU.prototype.opcodes.ASL, CPU.prototype.addressModes.ACCUMULATOR, 2];
    CPU.prototype.instruction_table[0x0d] = [CPU.prototype.opcodes.ORA, CPU.prototype.addressModes.ABSOLUTE, 4];
    CPU.prototype.instruction_table[0x0e] = [CPU.prototype.opcodes.ASL, CPU.prototype.addressModes.ABSOLUTE, 6];
    CPU.prototype.instruction_table[0x10] = [CPU.prototype.opcodes.BPL, CPU.prototype.addressModes.RELATIVE, 2];
    CPU.prototype.instruction_table[0x11] = [CPU.prototype.opcodes.ORA, CPU.prototype.addressModes.INDIRECT_INDEXED, 5];
    CPU.prototype.instruction_table[0x15] = [CPU.prototype.opcodes.ORA, CPU.prototype.addressModes.ZERO_PAGE_X, 4];
    CPU.prototype.instruction_table[0x16] = [CPU.prototype.opcodes.ASL, CPU.prototype.addressModes.ZERO_PAGE_X, 6];
    CPU.prototype.instruction_table[0x18] = [CPU.prototype.opcodes.CLC, CPU.prototype.addressModes.IMPLICIT, 2];
    CPU.prototype.instruction_table[0x19] = [CPU.prototype.opcodes.ORA, CPU.prototype.addressModes.ABSOLUTE_Y, 4];
    CPU.prototype.instruction_table[0x1d] = [CPU.prototype.opcodes.ORA, CPU.prototype.addressModes.ABSOLUTE_X, 4];
    CPU.prototype.instruction_table[0x1e] = [CPU.prototype.opcodes.ASL, CPU.prototype.addressModes.ABSOLUTE_X, 7];
    CPU.prototype.instruction_table[0x20] = [CPU.prototype.opcodes.JSR, CPU.prototype.addressModes.ABSOLUTE, 6];
    CPU.prototype.instruction_table[0x21] = [CPU.prototype.opcodes.AND, CPU.prototype.addressModes.INDEXED_INDIRECT, 6];
    CPU.prototype.instruction_table[0x24] = [CPU.prototype.opcodes.BIT, CPU.prototype.addressModes.ZERO_PAGE, 3];
    CPU.prototype.instruction_table[0x25] = [CPU.prototype.opcodes.AND, CPU.prototype.addressModes.ZERO_PAGE, 3];
    CPU.prototype.instruction_table[0x26] = [CPU.prototype.opcodes.ROL, CPU.prototype.addressModes.ZERO_PAGE, 5];
    CPU.prototype.instruction_table[0x28] = [CPU.prototype.opcodes.PLP, CPU.prototype.addressModes.IMPLICIT, 4];
    CPU.prototype.instruction_table[0x29] = [CPU.prototype.opcodes.AND, CPU.prototype.addressModes.IMMEDIATE, 2];
    CPU.prototype.instruction_table[0x2a] = [CPU.prototype.opcodes.ROL, CPU.prototype.addressModes.ACCUMULATOR, 2];
    CPU.prototype.instruction_table[0x2c] = [CPU.prototype.opcodes.BIT, CPU.prototype.addressModes.ABSOLUTE, 4];
    CPU.prototype.instruction_table[0x2d] = [CPU.prototype.opcodes.AND, CPU.prototype.addressModes.ABSOLUTE, 4];
    CPU.prototype.instruction_table[0x2e] = [CPU.prototype.opcodes.ROL, CPU.prototype.addressModes.ABSOLUTE, 6];
    CPU.prototype.instruction_table[0x30] = [CPU.prototype.opcodes.BMI, CPU.prototype.addressModes.RELATIVE, 2];
    CPU.prototype.instruction_table[0x31] = [CPU.prototype.opcodes.AND, CPU.prototype.addressModes.INDIRECT_INDEXED, 5];
    CPU.prototype.instruction_table[0x35] = [CPU.prototype.opcodes.AND, CPU.prototype.addressModes.ZERO_PAGE_X, 4];
    CPU.prototype.instruction_table[0x36] = [CPU.prototype.opcodes.ROL, CPU.prototype.addressModes.ZERO_PAGE_X, 6];
    CPU.prototype.instruction_table[0x38] = [CPU.prototype.opcodes.SEC, CPU.prototype.addressModes.IMPLICIT, 2];
    CPU.prototype.instruction_table[0x39] = [CPU.prototype.opcodes.AND, CPU.prototype.addressModes.ABSOLUTE_Y, 4];
    CPU.prototype.instruction_table[0x3c] = [CPU.prototype.opcodes.BIT, CPU.prototype.addressModes.ABSOLUTE_X, 4];
    CPU.prototype.instruction_table[0x3d] = [CPU.prototype.opcodes.AND, CPU.prototype.addressModes.ABSOLUTE_X, 4];
    CPU.prototype.instruction_table[0x3e] = [CPU.prototype.opcodes.ROL, CPU.prototype.addressModes.ABSOLUTE_X, 7];
    CPU.prototype.instruction_table[0x40] = [CPU.prototype.opcodes.RTI, CPU.prototype.addressModes.IMPLICIT, 6];
    CPU.prototype.instruction_table[0x41] = [CPU.prototype.opcodes.EOR, CPU.prototype.addressModes.INDEXED_INDIRECT, 6];
    CPU.prototype.instruction_table[0x45] = [CPU.prototype.opcodes.EOR, CPU.prototype.addressModes.ZERO_PAGE, 3];
    CPU.prototype.instruction_table[0x46] = [CPU.prototype.opcodes.LSR, CPU.prototype.addressModes.ZERO_PAGE, 5];
    CPU.prototype.instruction_table[0x48] = [CPU.prototype.opcodes.PHA, CPU.prototype.addressModes.IMPLICIT,3];
    CPU.prototype.instruction_table[0x49] = [CPU.prototype.opcodes.EOR, CPU.prototype.addressModes.IMMEDIATE, 2];
    CPU.prototype.instruction_table[0x4a] = [CPU.prototype.opcodes.LSR, CPU.prototype.addressModes.ACCUMULATOR, 2];
    CPU.prototype.instruction_table[0x4c] = [CPU.prototype.opcodes.JMP, CPU.prototype.addressModes.ABSOLUTE, 3];
    CPU.prototype.instruction_table[0x4d] = [CPU.prototype.opcodes.EOR, CPU.prototype.addressModes.ABSOLUTE, 4];
    CPU.prototype.instruction_table[0x4e] = [CPU.prototype.opcodes.LSR, CPU.prototype.addressModes.ABSOLUTE, 6];
    CPU.prototype.instruction_table[0x50] = [CPU.prototype.opcodes.BVC, CPU.prototype.addressModes.RELATIVE, 2];
    CPU.prototype.instruction_table[0x51] = [CPU.prototype.opcodes.EOR, CPU.prototype.addressModes.INDIRECT_INDEXED, 5];
    CPU.prototype.instruction_table[0x55] = [CPU.prototype.opcodes.EOR, CPU.prototype.addressModes.ZERO_PAGE_X, 4];
    CPU.prototype.instruction_table[0x56] = [CPU.prototype.opcodes.LSR, CPU.prototype.addressModes.ZERO_PAGE_X, 6];
    CPU.prototype.instruction_table[0x58] = [CPU.prototype.opcodes.CLI, CPU.prototype.addressModes.IMPLICIT, 2];
    CPU.prototype.instruction_table[0x59] = [CPU.prototype.opcodes.EOR, CPU.prototype.addressModes.ABSOLUTE_Y, 4];
    CPU.prototype.instruction_table[0x5d] = [CPU.prototype.opcodes.EOR, CPU.prototype.addressModes.ABSOLUTE_X, 4];
    CPU.prototype.instruction_table[0x5e] = [CPU.prototype.opcodes.LSR, CPU.prototype.addressModes.ABSOLUTE_X, 7];
    CPU.prototype.instruction_table[0x60] = [CPU.prototype.opcodes.RTS, CPU.prototype.addressModes.IMPLICIT, 6];
    CPU.prototype.instruction_table[0x61] = [CPU.prototype.opcodes.ADC, CPU.prototype.addressModes.INDEXED_INDIRECT, 6];
    CPU.prototype.instruction_table[0x65] = [CPU.prototype.opcodes.ADC, CPU.prototype.addressModes.ZERO_PAGE, 3];
    CPU.prototype.instruction_table[0x66] = [CPU.prototype.opcodes.ROR, CPU.prototype.addressModes.ZERO_PAGE, 5];
    CPU.prototype.instruction_table[0x68] = [CPU.prototype.opcodes.PLA, CPU.prototype.addressModes.IMPLICIT, 4];
    CPU.prototype.instruction_table[0x69] = [CPU.prototype.opcodes.ADC, CPU.prototype.addressModes.IMMEDIATE, 2];
    CPU.prototype.instruction_table[0x6a] = [CPU.prototype.opcodes.ROR, CPU.prototype.addressModes.ACCUMULATOR, 2];
    CPU.prototype.instruction_table[0x6c] = [CPU.prototype.opcodes.JMP, CPU.prototype.addressModes.ABSOLUTE, 5];
    CPU.prototype.instruction_table[0x6d] = [CPU.prototype.opcodes.ADC, CPU.prototype.addressModes.ABSOLUTE, 4];
    CPU.prototype.instruction_table[0x6e] = [CPU.prototype.opcodes.ROR, CPU.prototype.addressModes.ABSOLUTE, 6];
    CPU.prototype.instruction_table[0x70] = [CPU.prototype.opcodes.BVS, CPU.prototype.addressModes.RELATIVE, 2];
    CPU.prototype.instruction_table[0x71] = [CPU.prototype.opcodes.ADC, CPU.prototype.addressModes.INDIRECT_INDEXED, 5];
    CPU.prototype.instruction_table[0x75] = [CPU.prototype.opcodes.ADC, CPU.prototype.addressModes.ZERO_PAGE_X, 4];
    CPU.prototype.instruction_table[0x76] = [CPU.prototype.opcodes.ROR, CPU.prototype.addressModes.ZERO_PAGE_X, 6];
    CPU.prototype.instruction_table[0x78] = [CPU.prototype.opcodes.SEI, CPU.prototype.addressModes.IMPLICIT, 2];
    CPU.prototype.instruction_table[0x79] = [CPU.prototype.opcodes.ADC, CPU.prototype.addressModes.ABSOLUTE_Y, 4];
    CPU.prototype.instruction_table[0x7d] = [CPU.prototype.opcodes.ADC, CPU.prototype.addressModes.ABSOLUTE_X, 4];
    CPU.prototype.instruction_table[0x7e] = [CPU.prototype.opcodes.ROR, CPU.prototype.addressModes.ABSOLUTE_X, 7];
    CPU.prototype.instruction_table[0x81] = [CPU.prototype.opcodes.STA, CPU.prototype.addressModes.INDEXED_INDIRECT, 6];
    CPU.prototype.instruction_table[0x84] = [CPU.prototype.opcodes.STY, CPU.prototype.addressModes.ZERO_PAGE, 3];
    CPU.prototype.instruction_table[0x85] = [CPU.prototype.opcodes.STA, CPU.prototype.addressModes.ZERO_PAGE, 3];
    CPU.prototype.instruction_table[0x86] = [CPU.prototype.opcodes.STX, CPU.prototype.addressModes.ZERO_PAGE, 3];
    CPU.prototype.instruction_table[0x88] = [CPU.prototype.opcodes.DEY, CPU.prototype.addressModes.IMPLICIT, 2];
    CPU.prototype.instruction_table[0x8a] = [CPU.prototype.opcodes.TXA, CPU.prototype.addressModes.IMPLICIT, 2];
    CPU.prototype.instruction_table[0x8c] = [CPU.prototype.opcodes.STY, CPU.prototype.addressModes.ABSOLUTE, 4];
    CPU.prototype.instruction_table[0x8d] = [CPU.prototype.opcodes.STA, CPU.prototype.addressModes.ABSOLUTE, 4];
    CPU.prototype.instruction_table[0x8e] = [CPU.prototype.opcodes.STX, CPU.prototype.addressModes.ABSOLUTE, 4];
    CPU.prototype.instruction_table[0x90] = [CPU.prototype.opcodes.BCC, CPU.prototype.addressModes.RELATIVE, 2];
    CPU.prototype.instruction_table[0x91] = [CPU.prototype.opcodes.STA, CPU.prototype.addressModes.INDIRECT_INDEXED, 6];
    CPU.prototype.instruction_table[0x94] = [CPU.prototype.opcodes.STY, CPU.prototype.addressModes.ZERO_PAGE_X, 4];
    CPU.prototype.instruction_table[0x95] = [CPU.prototype.opcodes.STA, CPU.prototype.addressModes.ZERO_PAGE_X, 4];
    CPU.prototype.instruction_table[0x96] = [CPU.prototype.opcodes.STX, CPU.prototype.addressModes.ZERO_PAGE_X, 4];
    CPU.prototype.instruction_table[0x98] = [CPU.prototype.opcodes.TYA, CPU.prototype.addressModes.IMPLICIT, 2];
    CPU.prototype.instruction_table[0x99] = [CPU.prototype.opcodes.STA, CPU.prototype.addressModes.ABSOLUTE_Y, 5];
    CPU.prototype.instruction_table[0x9a] = [CPU.prototype.opcodes.TXS, CPU.prototype.addressModes.IMPLICIT, 2];
    CPU.prototype.instruction_table[0x9d] = [CPU.prototype.opcodes.STA, CPU.prototype.addressModes.ABSOLUTE_X, 5];
    CPU.prototype.instruction_table[0xa0] = [CPU.prototype.opcodes.LDY, CPU.prototype.addressModes.IMMEDIATE, 2];
    CPU.prototype.instruction_table[0xa1] = [CPU.prototype.opcodes.LDA, CPU.prototype.addressModes.INDEXED_INDIRECT, 6];
    CPU.prototype.instruction_table[0xa2] = [CPU.prototype.opcodes.LDX, CPU.prototype.addressModes.IMMEDIATE, 2];
    CPU.prototype.instruction_table[0xa4] = [CPU.prototype.opcodes.LDY, CPU.prototype.addressModes.ZERO_PAGE, 3];
    CPU.prototype.instruction_table[0xa5] = [CPU.prototype.opcodes.LDA, CPU.prototype.addressModes.ZERO_PAGE, 3];
    CPU.prototype.instruction_table[0xa6] = [CPU.prototype.opcodes.LDX, CPU.prototype.addressModes.ZERO_PAGE, 3];
    CPU.prototype.instruction_table[0xa8] = [CPU.prototype.opcodes.TAY, CPU.prototype.addressModes.IMPLICIT, 2];
    CPU.prototype.instruction_table[0xa9] = [CPU.prototype.opcodes.LDA, CPU.prototype.addressModes.IMMEDIATE, 2];
    CPU.prototype.instruction_table[0xaa] = [CPU.prototype.opcodes.TAX, CPU.prototype.addressModes.IMPLICIT, 2];
    CPU.prototype.instruction_table[0xac] = [CPU.prototype.opcodes.LDY, CPU.prototype.addressModes.ABSOLUTE, 4];
    CPU.prototype.instruction_table[0xad] = [CPU.prototype.opcodes.LDA, CPU.prototype.addressModes.ABSOLUTE, 4];
    CPU.prototype.instruction_table[0xae] = [CPU.prototype.opcodes.LDX, CPU.prototype.addressModes.ABSOLUTE, 4];
    CPU.prototype.instruction_table[0xb0] = [CPU.prototype.opcodes.BCS, CPU.prototype.addressModes.RELATIVE, 2];
    CPU.prototype.instruction_table[0xb1] = [CPU.prototype.opcodes.LDA, CPU.prototype.addressModes.INDIRECT_INDEXED, 5];
    CPU.prototype.instruction_table[0xb4] = [CPU.prototype.opcodes.LDY, CPU.prototype.addressModes.ZERO_PAGE_X, 4];
    CPU.prototype.instruction_table[0xb5] = [CPU.prototype.opcodes.LDA, CPU.prototype.addressModes.ZERO_PAGE_X, 4];
    CPU.prototype.instruction_table[0xb6] = [CPU.prototype.opcodes.LDX, CPU.prototype.addressModes.ZERO_PAGE_X, 4];
    CPU.prototype.instruction_table[0xb8] = [CPU.prototype.opcodes.CLV, CPU.prototype.addressModes.IMPLICIT, 2];
    CPU.prototype.instruction_table[0xb9] = [CPU.prototype.opcodes.LDA, CPU.prototype.addressModes.ABSOLUTE_Y, 4];
    CPU.prototype.instruction_table[0xba] = [CPU.prototype.opcodes.TSX, CPU.prototype.addressModes.IMPLICIT, 2];
    CPU.prototype.instruction_table[0xbc] = [CPU.prototype.opcodes.LDY, CPU.prototype.addressModes.ABSOLUTE_X, 4];
    CPU.prototype.instruction_table[0xbd] = [CPU.prototype.opcodes.LDA, CPU.prototype.addressModes.ABSOLUTE_X, 4];
    CPU.prototype.instruction_table[0xbe] = [CPU.prototype.opcodes.LDX, CPU.prototype.addressModes.ABSOLUTE_X, 4];
    CPU.prototype.instruction_table[0xc0] = [CPU.prototype.opcodes.CPY, CPU.prototype.addressModes.IMMEDIATE, 2];
    CPU.prototype.instruction_table[0xc1] = [CPU.prototype.opcodes.CMP, CPU.prototype.addressModes.INDEXED_INDIRECT, 6];
    CPU.prototype.instruction_table[0xc4] = [CPU.prototype.opcodes.CPY, CPU.prototype.addressModes.ZERO_PAGE, 3];
    CPU.prototype.instruction_table[0xc5] = [CPU.prototype.opcodes.CMP, CPU.prototype.addressModes.ZERO_PAGE, 3];
    CPU.prototype.instruction_table[0xc6] = [CPU.prototype.opcodes.DEC, CPU.prototype.addressModes.ZERO_PAGE, 5];
    CPU.prototype.instruction_table[0xc8] = [CPU.prototype.opcodes.INY, CPU.prototype.addressModes.IMPLICIT, 2];
    CPU.prototype.instruction_table[0xc9] = [CPU.prototype.opcodes.CMP, CPU.prototype.addressModes.IMMEDIATE, 2];
    CPU.prototype.instruction_table[0xca] = [CPU.prototype.opcodes.DEX, CPU.prototype.addressModes.IMPLICIT, 2];
    CPU.prototype.instruction_table[0xcc] = [CPU.prototype.opcodes.CPY, CPU.prototype.addressModes.ABSOLUTE, 4];
    CPU.prototype.instruction_table[0xcd] = [CPU.prototype.opcodes.CMP, CPU.prototype.addressModes.ABSOLUTE, 4];
    CPU.prototype.instruction_table[0xce] = [CPU.prototype.opcodes.DEC, CPU.prototype.addressModes.ABSOLUTE, 6];
    CPU.prototype.instruction_table[0xd0] = [CPU.prototype.opcodes.BNE, CPU.prototype.addressModes.RELATIVE, 2];
    CPU.prototype.instruction_table[0xd1] = [CPU.prototype.opcodes.CMP, CPU.prototype.addressModes.INDIRECT_INDEXED, 5];
    CPU.prototype.instruction_table[0xd5] = [CPU.prototype.opcodes.CMP, CPU.prototype.addressModes.ZERO_PAGE_X, 4];
    CPU.prototype.instruction_table[0xd6] = [CPU.prototype.opcodes.DEC, CPU.prototype.addressModes.ZERO_PAGE_X, 6];
    CPU.prototype.instruction_table[0xd8] = [CPU.prototype.opcodes.CLD, CPU.prototype.addressModes.IMPLICIT, 2];
    CPU.prototype.instruction_table[0xd9] = [CPU.prototype.opcodes.CMP, CPU.prototype.addressModes.ABSOLUTE_Y, 4];
    CPU.prototype.instruction_table[0xdd] = [CPU.prototype.opcodes.CMP, CPU.prototype.addressModes.ABSOLUTE_X, 4];
    CPU.prototype.instruction_table[0xde] = [CPU.prototype.opcodes.DEC, CPU.prototype.addressModes.ABSOLUTE_X, 7];
    CPU.prototype.instruction_table[0xe0] = [CPU.prototype.opcodes.CPX, CPU.prototype.addressModes.IMMEDIATE, 2];
    CPU.prototype.instruction_table[0xe1] = [CPU.prototype.opcodes.SBC, CPU.prototype.addressModes.INDEXED_INDIRECT, 6];
    CPU.prototype.instruction_table[0xe4] = [CPU.prototype.opcodes.CPX, CPU.prototype.addressModes.ZERO_PAGE, 3];
    CPU.prototype.instruction_table[0xe5] = [CPU.prototype.opcodes.SBC, CPU.prototype.addressModes.ZERO_PAGE, 3];
    CPU.prototype.instruction_table[0xe6] = [CPU.prototype.opcodes.INC, CPU.prototype.addressModes.ZERO_PAGE, 5];
    CPU.prototype.instruction_table[0xe8] = [CPU.prototype.opcodes.INX, CPU.prototype.addressModes.IMPLICIT, 2];
    CPU.prototype.instruction_table[0xe9] = [CPU.prototype.opcodes.SBC, CPU.prototype.addressModes.IMMEDIATE, 2];
    CPU.prototype.instruction_table[0xea] = [CPU.prototype.opcodes.NOP, CPU.prototype.addressModes.IMPLICIT, 2];
    CPU.prototype.instruction_table[0xec] = [CPU.prototype.opcodes.CPX, CPU.prototype.addressModes.ABSOLUTE, 4];
    CPU.prototype.instruction_table[0xed] = [CPU.prototype.opcodes.SBC, CPU.prototype.addressModes.ABSOLUTE, 4];
    CPU.prototype.instruction_table[0xee] = [CPU.prototype.opcodes.INC, CPU.prototype.addressModes.ABSOLUTE, 6];
    CPU.prototype.instruction_table[0xf0] = [CPU.prototype.opcodes.BEQ, CPU.prototype.addressModes.RELATIVE, 2];
    CPU.prototype.instruction_table[0xf1] = [CPU.prototype.opcodes.SBC, CPU.prototype.addressModes.INDIRECT_INDEXED, 5];
    CPU.prototype.instruction_table[0xf5] = [CPU.prototype.opcodes.SBC, CPU.prototype.addressModes.ZERO_PAGE_X, 4];
    CPU.prototype.instruction_table[0xf6] = [CPU.prototype.opcodes.INC, CPU.prototype.addressModes.ZERO_PAGE_X, 6];
    CPU.prototype.instruction_table[0xf8] = [CPU.prototype.opcodes.SED, CPU.prototype.addressModes.IMPLICIT, 2];
    CPU.prototype.instruction_table[0xf9] = [CPU.prototype.opcodes.SBC, CPU.prototype.addressModes.ABSOLUTE_Y, 4];
    CPU.prototype.instruction_table[0xfd] = [CPU.prototype.opcodes.SBC, CPU.prototype.addressModes.ABSOLUTE_X, 4];
    CPU.prototype.instruction_table[0xfe] = [CPU.prototype.opcodes.INC, CPU.prototype.addressModes.ABSOLUTE_X, 7];

    /**
     * Reads the appropriate memory location and returns the value, depending on the address mode
     * @param addressMode number The address mode of the current operation.
     * @returns object
     */
    CPU.prototype.readMemory = function (addressMode) {

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

    CPU.prototype.push = function (value) {
        // Stack lives at $0100 - $01ff. First value lives at 0x1ff
        this.mmc.store(this.registers.SP, value);
        this.registers.SP = (--this.registers.SP & 0xFF) + 0x100; // wrap around stack for mario hax
    };

    CPU.prototype.pop = function () {
        this.registers.SP = (++this.registers.SP & 0xFF) + 0x100; // wrap around stack
        return this.mmc.fetch(this.registers.SP);
    };

    CPU.prototype.peek = function () {
        return this.mmc.fetch(((this.registers.SP + 1) & 0xFF) + 0x100);
    };

    CPU.prototype.execute = function () {

        this.memoryCycles = 0;
        this.extraCycles = 0;

        var opcode = this.mmc.fetch(this.registers.PC++);

        if (typeof this.instruction_table[opcode] === 'undefined') {
            throw new this.CPUError("Invalid opcode: 0x" + opcode.toString(16));
        }

        var instruction = this.instruction_table[opcode];

        this.operations[instruction[0]].apply(this, [instruction[1]]);

        return instruction[2] + this.memoryCycles + this.extraCycles;
    };

    // http://www.obelisk.demon.co.uk/6502/reference.html#LDA
    CPU.prototype.operations = [];

    CPU.prototype.operations[CPU.prototype.opcodes.ADC] = function (addressMode) {

        var mem = this.readMemory(addressMode).value;

        var tmp = this.registers.A + mem + this.flags.carry;

        this.checkOverflowFlag(this.registers.A, mem, tmp, true);

        this.registers.A = tmp & 0xff;

        this.checkCarryFlag(tmp);
        this.checkNegativeFlag(tmp);
        this.checkZeroFlag(this.registers.A);
    };

    CPU.prototype.operations[CPU.prototype.opcodes.AND] = function (addressMode) {

        this.registers.A = this.readMemory(addressMode).value & this.registers.A;

        this.checkNegativeFlag(this.registers.A);
        this.checkZeroFlag(this.registers.A);
    };

    CPU.prototype.operations[CPU.prototype.opcodes.ASL] = function (addressMode) {

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

    CPU.prototype.operations[CPU.prototype.opcodes.BCC] = function (addressMode) {

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

    CPU.prototype.operations[CPU.prototype.opcodes.BCS] = function (addressMode) {

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

    CPU.prototype.operations[CPU.prototype.opcodes.BEQ] = function (addressMode) {

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

    CPU.prototype.operations[CPU.prototype.opcodes.BIT] = function (addressMode) {

        var mem = this.readMemory(addressMode);

        this.checkNegativeFlag(mem.value);

        if ((mem.value >> 6) & 1) {
            this.setOverflowFlag();
        } else {
            this.clearOverflowFlag();
        }

        this.checkZeroFlag(this.registers.A & mem.value);
    };

    CPU.prototype.operations[CPU.prototype.opcodes.BMI] = function (addressMode) {

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

    CPU.prototype.operations[CPU.prototype.opcodes.BNE] = function (addressMode) {

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

    CPU.prototype.operations[CPU.prototype.opcodes.BPL] = function (addressMode) {

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
    CPU.prototype.operations[CPU.prototype.opcodes.BRK] = function (addressMode) {

        this.registers.PC++;

        this.push((this.registers.PC >> 8) & 0xff);
        this.push(this.registers.PC & 0xff);

        this.push(this.registers.P);

        this.setBrkFlag();

        this.registers.PC = this.mmc.fetch(0xFFFE) | (this.mmc.fetch(0xFFFF) << 8);
    };

    CPU.prototype.operations[CPU.prototype.opcodes.BVC] = function (addressMode) {

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

    CPU.prototype.operations[CPU.prototype.opcodes.BVS] = function (addressMode) {

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

    CPU.prototype.operations[CPU.prototype.opcodes.CLC] = function (addressMode) {
        this.clearCarryFlag();
    };

    CPU.prototype.operations[CPU.prototype.opcodes.CLD] = function (addressMode) {
        this.clearDecimalFlag();
    };

    CPU.prototype.operations[CPU.prototype.opcodes.CLI] = function (addressMode) {
        this.clearInterruptDisableFlag();
    };

    CPU.prototype.operations[CPU.prototype.opcodes.CLV] = function (addressMode) {
        this.clearOverflowFlag();
    };

    CPU.prototype.operations[CPU.prototype.opcodes.CMP] = function (addressMode) {

        var val = this.registers.A - this.readMemory(addressMode).value;

        if (val >= 0) {
            this.setCarryFlag();
        } else {
            this.clearCarryFlag();
        }

        this.checkZeroFlag(val);
        this.checkNegativeFlag(val);
    };

    CPU.prototype.operations[CPU.prototype.opcodes.CPX] = function (addressMode) {

        var val = this.registers.X - this.readMemory(addressMode).value;

        if (val >= 0) {
            this.setCarryFlag();
        } else {
            this.clearCarryFlag();
        }

        this.checkZeroFlag(val);
        this.checkNegativeFlag(val);
    };

    CPU.prototype.operations[CPU.prototype.opcodes.CPY] = function (addressMode) {

        var val = this.registers.Y - this.readMemory(addressMode).value;

        if (val >= 0) {
            this.setCarryFlag();
        } else {
            this.clearCarryFlag();
        }

        this.checkZeroFlag(val);
        this.checkNegativeFlag(val);
    };

    CPU.prototype.operations[CPU.prototype.opcodes.DEC] = function (addressMode) {

        var m = this.readMemory(addressMode);

        var r = (m.value - 1) & 0xff;

        this.checkZeroFlag(r);
        this.checkNegativeFlag(r);

        this.mmc.store(m.address, r);
    };

    CPU.prototype.operations[CPU.prototype.opcodes.INC] = function (addressMode) {

        var m = this.readMemory(addressMode);

        var r = (m.value + 1) & 0xff;

        this.checkZeroFlag(r);
        this.checkNegativeFlag(r);

        this.mmc.store(m.address, r);
    };

    CPU.prototype.operations[CPU.prototype.opcodes.DEX] = function (addressMode) {

        this.registers.X = (this.registers.X - 1) & 0xff;

        this.checkZeroFlag(this.registers.X);
        this.checkNegativeFlag(this.registers.X);
    };

    CPU.prototype.operations[CPU.prototype.opcodes.DEY] = function (addressMode) {

        this.registers.Y = (this.registers.Y - 1) & 0xff;

        this.checkZeroFlag(this.registers.Y);
        this.checkNegativeFlag(this.registers.Y);
    };

    CPU.prototype.operations[CPU.prototype.opcodes.EOR] = function (addressMode) {

        this.registers.A = this.registers.A ^ this.readMemory(addressMode).value;

        this.checkZeroFlag(this.registers.A);
        this.checkNegativeFlag(this.registers.A);
    };

    CPU.prototype.operations[CPU.prototype.opcodes.INX] = function (addressMode) {

        this.registers.X = (this.registers.X + 1) & 0xff;

        this.checkZeroFlag(this.registers.X);
        this.checkNegativeFlag(this.registers.X);
    };

    CPU.prototype.operations[CPU.prototype.opcodes.INY] = function (addressMode) {

        this.registers.Y = (this.registers.Y + 1) & 0xff;

        this.checkZeroFlag(this.registers.Y);
        this.checkNegativeFlag(this.registers.Y);
    };

    CPU.prototype.operations[CPU.prototype.opcodes.JMP] = function (addressMode) {
        this.registers.PC = this.readMemory(addressMode).address;
    };

    CPU.prototype.operations[CPU.prototype.opcodes.JSR] = function (addressMode) {
        var mem = this.readMemory(addressMode);
        this.push( (this.registers.PC >> 8) & 0xff );
        this.push( this.registers.PC & 0xff );
        this.registers.PC = mem.address;
    };

    CPU.prototype.operations[CPU.prototype.opcodes.LDA] = function (addressMode) {

        var value = this.readMemory(addressMode).value;
        this.registers.A = value;

        this.checkZeroFlag(this.registers.A);
        this.checkNegativeFlag(this.registers.A);

    };

    CPU.prototype.operations[CPU.prototype.opcodes.LDX] = function (addressMode) {

        var value = this.readMemory(addressMode).value;
        this.registers.X = value;

        this.checkZeroFlag(this.registers.X);
        this.checkNegativeFlag(this.registers.X);

    };

    CPU.prototype.operations[CPU.prototype.opcodes.LDY] = function (addressMode) {

        var value = this.readMemory(addressMode).value;
        this.registers.Y = value;

        this.checkZeroFlag(this.registers.Y);
        this.checkNegativeFlag(this.registers.Y);

    };

    CPU.prototype.operations[CPU.prototype.opcodes.LSR] = function (addressMode) {

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

    CPU.prototype.operations[CPU.prototype.opcodes.NOP] = function (addressMode) {
        //nothing!
    };

    CPU.prototype.operations[CPU.prototype.opcodes.ORA] = function (addressMode) {

        this.registers.A = this.registers.A | this.readMemory(addressMode).value;

        this.checkZeroFlag(this.registers.A);
        this.checkNegativeFlag(this.registers.A);
    };

    CPU.prototype.operations[CPU.prototype.opcodes.PHA] = function (addressMode) {
        this.push(this.registers.A);
    };

    CPU.prototype.operations[CPU.prototype.opcodes.PHP] = function (addressMode) {
        this.push(this.registers.P);
    };

    CPU.prototype.operations[CPU.prototype.opcodes.PLA] = function (addressMode) {
        this.registers.A = this.pop();
        this.checkZeroFlag(this.registers.A);
        this.checkNegativeFlag(this.registers.A);
    };

    CPU.prototype.operations[CPU.prototype.opcodes.PLP] = function (addressMode) {
        this.registers.P = this.pop();
        this.setFlagsFromP();
    };

    CPU.prototype.operations[CPU.prototype.opcodes.ROL] = function (addressMode) {

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

    CPU.prototype.operations[CPU.prototype.opcodes.ROR] = function (addressMode) {

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

    CPU.prototype.operations[CPU.prototype.opcodes.RTI] = function (addressMode) {

        this.registers.P = this.pop();
        this.setFlagsFromP();
        var hiPC = this.pop();
        var loPC = this.pop();
        this.registers.PC = (hiPC << 8) | loPC;
    };

    CPU.prototype.operations[CPU.prototype.opcodes.RTS] = function (addressMode) {
        var hiPC = this.pop();
        var loPC = this.pop();
        this.registers.PC = (hiPC << 8) | loPC;
    };

    CPU.prototype.operations[CPU.prototype.opcodes.SBC] = function (addressMode) {

        var mem = this.readMemory(addressMode).value;

        var tmp = this.registers.A - mem - (1 - this.flags.carry);

        this.checkOverflowFlag(this.registers.A, mem, tmp, false);

        this.registers.A = tmp & 0xff;

        this.checkCarryFlag(tmp);
        this.checkNegativeFlag(tmp);
        this.checkZeroFlag(this.registers.A);
    };

    CPU.prototype.operations[CPU.prototype.opcodes.SEC] = function (addressMode) {
        this.setCarryFlag();
    };

    CPU.prototype.operations[CPU.prototype.opcodes.SED] = function (addressMode) {
        this.setDecimalFlag();
    };

    CPU.prototype.operations[CPU.prototype.opcodes.SEI] = function (addressMode) {
        this.setInterruptDisableFlag();
    };

    CPU.prototype.operations[CPU.prototype.opcodes.STA] = function (addressMode) {
        var mem = this.readMemory(addressMode);
        this.mmc.store(mem.address, this.registers.A);
    };

    CPU.prototype.operations[CPU.prototype.opcodes.STX] = function (addressMode) {
        var mem = this.readMemory(addressMode);
        this.mmc.store(mem.address, this.registers.X);
    };

    CPU.prototype.operations[CPU.prototype.opcodes.STY] = function (addressMode) {
        var mem = this.readMemory(addressMode);
        this.mmc.store(mem.address, this.registers.Y);
    };

    CPU.prototype.operations[CPU.prototype.opcodes.TAX] = function (addressMode) {
        this.registers.X = this.registers.A;
        this.checkZeroFlag(this.registers.X);
        this.checkNegativeFlag(this.registers.X);
    };

    CPU.prototype.operations[CPU.prototype.opcodes.TAY] = function (addressMode) {
        this.registers.Y = this.registers.A;
        this.checkZeroFlag(this.registers.Y);
        this.checkNegativeFlag(this.registers.Y);
    };

    CPU.prototype.operations[CPU.prototype.opcodes.TSX] = function (addressMode) {
        this.registers.X = this.registers.SP;
        this.checkZeroFlag(this.registers.X);
        this.checkNegativeFlag(this.registers.X);
    };

    CPU.prototype.operations[CPU.prototype.opcodes.TXA] = function (addressMode) {
        this.registers.A = this.registers.X;
        this.checkZeroFlag(this.registers.A);
        this.checkNegativeFlag(this.registers.A);
    };

    CPU.prototype.operations[CPU.prototype.opcodes.TXS] = function (addressMode) {
        this.registers.SP = this.registers.X;
    };

    CPU.prototype.operations[CPU.prototype.opcodes.TYA] = function (addressMode) {
        this.registers.A = this.registers.Y;
        this.checkZeroFlag(this.registers.A);
        this.checkNegativeFlag(this.registers.A);
    };

    w.JNE.CPU = CPU;

})(window);
