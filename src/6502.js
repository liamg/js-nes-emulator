/**
 * A simulation of the 6502 CPU (without decimal support).
 * http://en.wikipedia.org/wiki/MOS_Technology_6502
 */
(function() {
    "use strict";

    window.JNE = window.JNE || {};

    /**
     * @param mmc JNE.MMC Memory controller
     * @constructor
     */
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
            carry: 0,
            zero: 0,
            negative: 0
        };

        this.reset();

    };

    /**
     * Enumeration of interrupt request types
     */
    window.JNE.NES6502.prototype.IRQ = {
        NORMAL: 0,
        NMI: 1,
        RESET: 2
    };

    /**
     * Reset the CPU
     */
    window.JNE.NES6502.prototype.reset = function(){

        this.registers.A = 0;
        this.registers.X = 0;
        this.registers.Y = 0;
        this.registers.SP = 0x1FF;
        this.registers.PC = 0x07FF;
        this.registers.P = 0;

        this.flags.zero = 1;
        this.flags.carry = 0;
        this.flags.negative = 0;
    };

    /**
     * Enumeration of address modes
     */
    window.JNE.NES6502.prototype.addressModes = {
        IMPLICIT:           0,  //
        IMMEDIATE:          1,  // #
        ZERO_PAGE:          2,  // d
        ZERO_PAGE_X:        3,  // d, X
        ZERO_PAGE_Y:        4,  // d,Y
        INDEXED_INDIRECT:   5,  // (d, X)
        INDIRECT_INDEXED:   6,  // (d),Y
        ACCUMULATOR:        7,  // A
        RELATIVE:           8,  // r
        ABSOLUTE:           9,  // a
        ABSOLUTE_X:         10, // a, X
        ABSOLUTE_Y:         11, // a, Y,
        INDIRECT_ABSOLUTE:  12 // ? - only used for JMP?
    };

    window.JNE.NES6502.prototype.getOpcodeText = function(opcode){
        for(var i in this.opcodes){
            if(this.opcodes[i] == opcode) return i;
        }
    };

    window.JNE.NES6502.prototype.getAddressModeText = function(address_mode){
        for(var i in this.addressModes){
            if(this.addressModes[i] == address_mode) return i;
        }
    };

    /**
     * List of opcodes and their operations
     */
    window.JNE.NES6502.prototype.opcodes = {
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

    /**
     * Read this: http://www.llx.com/~nparker/a2/opcodes.html
    */

    window.JNE.NES6502.prototype.instruction_table = [];
    window.JNE.NES6502.prototype.instruction_table[0x0] = [window.JNE.NES6502.prototype.opcodes.BRK, window.JNE.NES6502.prototype.addressModes.IMPLICIT];
    window.JNE.NES6502.prototype.instruction_table[0x1] = [window.JNE.NES6502.prototype.opcodes.ORA, window.JNE.NES6502.prototype.addressModes.INDEXED_INDIRECT];
    window.JNE.NES6502.prototype.instruction_table[0x5] = [window.JNE.NES6502.prototype.opcodes.ORA, window.JNE.NES6502.prototype.addressModes.ZERO_PAGE];
    window.JNE.NES6502.prototype.instruction_table[0x6] = [window.JNE.NES6502.prototype.opcodes.ASL, window.JNE.NES6502.prototype.addressModes.ZERO_PAGE, 5];
    window.JNE.NES6502.prototype.instruction_table[0x8] = [window.JNE.NES6502.prototype.opcodes.PHP, window.JNE.NES6502.prototype.addressModes.IMPLICIT];
    window.JNE.NES6502.prototype.instruction_table[0x9] = [window.JNE.NES6502.prototype.opcodes.ORA, window.JNE.NES6502.prototype.addressModes.IMMEDIATE];
    window.JNE.NES6502.prototype.instruction_table[0xa] = [window.JNE.NES6502.prototype.opcodes.ASL, window.JNE.NES6502.prototype.addressModes.ACCUMULATOR, 2];
    window.JNE.NES6502.prototype.instruction_table[0xd] = [window.JNE.NES6502.prototype.opcodes.ORA, window.JNE.NES6502.prototype.addressModes.ABSOLUTE];
    window.JNE.NES6502.prototype.instruction_table[0xe] = [window.JNE.NES6502.prototype.opcodes.ASL, window.JNE.NES6502.prototype.addressModes.ABSOLUTE, 6];

    window.JNE.NES6502.prototype.instruction_table[0x10] = [window.JNE.NES6502.prototype.opcodes.BPL, window.JNE.NES6502.prototype.addressModes.RELATIVE];
    window.JNE.NES6502.prototype.instruction_table[0x11] = [window.JNE.NES6502.prototype.opcodes.ORA, window.JNE.NES6502.prototype.addressModes.INDIRECT_INDEXED];
    window.JNE.NES6502.prototype.instruction_table[0x15] = [window.JNE.NES6502.prototype.opcodes.ORA, window.JNE.NES6502.prototype.addressModes.ZERO_PAGE_X];
    window.JNE.NES6502.prototype.instruction_table[0x16] = [window.JNE.NES6502.prototype.opcodes.ASL, window.JNE.NES6502.prototype.addressModes.ZERO_PAGE_X, 6];
    window.JNE.NES6502.prototype.instruction_table[0x18] = [window.JNE.NES6502.prototype.opcodes.CLC, window.JNE.NES6502.prototype.addressModes.IMPLICIT];
    window.JNE.NES6502.prototype.instruction_table[0x19] = [window.JNE.NES6502.prototype.opcodes.ORA, window.JNE.NES6502.prototype.addressModes.ABSOLUTE_Y];
    window.JNE.NES6502.prototype.instruction_table[0x1d] = [window.JNE.NES6502.prototype.opcodes.ORA, window.JNE.NES6502.prototype.addressModes.ABSOLUTE_X];
    window.JNE.NES6502.prototype.instruction_table[0x1e] = [window.JNE.NES6502.prototype.opcodes.ASL, window.JNE.NES6502.prototype.addressModes.ABSOLUTE_X, 7];

    window.JNE.NES6502.prototype.instruction_table[0x20] = [window.JNE.NES6502.prototype.opcodes.JSR, window.JNE.NES6502.prototype.addressModes.ABSOLUTE];
    window.JNE.NES6502.prototype.instruction_table[0x21] = [window.JNE.NES6502.prototype.opcodes.AND, window.JNE.NES6502.prototype.addressModes.INDEXED_INDIRECT, 6];
    window.JNE.NES6502.prototype.instruction_table[0x24] = [window.JNE.NES6502.prototype.opcodes.BIT, window.JNE.NES6502.prototype.addressModes.ZERO_PAGE];
    window.JNE.NES6502.prototype.instruction_table[0x25] = [window.JNE.NES6502.prototype.opcodes.AND, window.JNE.NES6502.prototype.addressModes.ZERO_PAGE, 3];
    window.JNE.NES6502.prototype.instruction_table[0x26] = [window.JNE.NES6502.prototype.opcodes.ROL, window.JNE.NES6502.prototype.addressModes.ZERO_PAGE];
    window.JNE.NES6502.prototype.instruction_table[0x28] = [window.JNE.NES6502.prototype.opcodes.PLP, window.JNE.NES6502.prototype.addressModes.IMPLICIT];
    window.JNE.NES6502.prototype.instruction_table[0x29] = [window.JNE.NES6502.prototype.opcodes.AND, window.JNE.NES6502.prototype.addressModes.IMMEDIATE, 2];
    window.JNE.NES6502.prototype.instruction_table[0x2a] = [window.JNE.NES6502.prototype.opcodes.ROL, window.JNE.NES6502.prototype.addressModes.ACCUMULATOR];
    window.JNE.NES6502.prototype.instruction_table[0x2c] = [window.JNE.NES6502.prototype.opcodes.BIT, window.JNE.NES6502.prototype.addressModes.ABSOLUTE];
    window.JNE.NES6502.prototype.instruction_table[0x2d] = [window.JNE.NES6502.prototype.opcodes.AND, window.JNE.NES6502.prototype.addressModes.ABSOLUTE, 4];
    window.JNE.NES6502.prototype.instruction_table[0x2e] = [window.JNE.NES6502.prototype.opcodes.ROL, window.JNE.NES6502.prototype.addressModes.ABSOLUTE];

    window.JNE.NES6502.prototype.instruction_table[0x30] = [window.JNE.NES6502.prototype.opcodes.BMI, window.JNE.NES6502.prototype.addressModes.RELATIVE];
    window.JNE.NES6502.prototype.instruction_table[0x31] = [window.JNE.NES6502.prototype.opcodes.AND, window.JNE.NES6502.prototype.addressModes.INDIRECT_INDEXED, 5];
    window.JNE.NES6502.prototype.instruction_table[0x35] = [window.JNE.NES6502.prototype.opcodes.AND, window.JNE.NES6502.prototype.addressModes.ZERO_PAGE_X, 4];
    window.JNE.NES6502.prototype.instruction_table[0x36] = [window.JNE.NES6502.prototype.opcodes.ROL, window.JNE.NES6502.prototype.addressModes.ZERO_PAGE_X];
    window.JNE.NES6502.prototype.instruction_table[0x38] = [window.JNE.NES6502.prototype.opcodes.SEC, window.JNE.NES6502.prototype.addressModes.IMPLICIT];
    window.JNE.NES6502.prototype.instruction_table[0x39] = [window.JNE.NES6502.prototype.opcodes.AND, window.JNE.NES6502.prototype.addressModes.ABSOLUTE_Y, 4];
    window.JNE.NES6502.prototype.instruction_table[0x3c] = [window.JNE.NES6502.prototype.opcodes.BIT, window.JNE.NES6502.prototype.addressModes.ABSOLUTE_X];
    window.JNE.NES6502.prototype.instruction_table[0x3d] = [window.JNE.NES6502.prototype.opcodes.AND, window.JNE.NES6502.prototype.addressModes.ABSOLUTE_X, 4];
    window.JNE.NES6502.prototype.instruction_table[0x3e] = [window.JNE.NES6502.prototype.opcodes.ROL, window.JNE.NES6502.prototype.addressModes.ABSOLUTE_X];
    window.JNE.NES6502.prototype.instruction_table[0x40] = [window.JNE.NES6502.prototype.opcodes.RTI, window.JNE.NES6502.prototype.addressModes.IMPLICIT];
    window.JNE.NES6502.prototype.instruction_table[0x41] = [window.JNE.NES6502.prototype.opcodes.EOR, window.JNE.NES6502.prototype.addressModes.INDEXED_INDIRECT];
    window.JNE.NES6502.prototype.instruction_table[0x42] = [window.JNE.NES6502.prototype.opcodes.LSR, window.JNE.NES6502.prototype.addressModes.IMMEDIATE];
    window.JNE.NES6502.prototype.instruction_table[0x44] = [window.JNE.NES6502.prototype.opcodes.JMP, window.JNE.NES6502.prototype.addressModes.ZERO_PAGE];
    window.JNE.NES6502.prototype.instruction_table[0x45] = [window.JNE.NES6502.prototype.opcodes.EOR, window.JNE.NES6502.prototype.addressModes.ZERO_PAGE];
    window.JNE.NES6502.prototype.instruction_table[0x46] = [window.JNE.NES6502.prototype.opcodes.LSR, window.JNE.NES6502.prototype.addressModes.ZERO_PAGE];
    window.JNE.NES6502.prototype.instruction_table[0x48] = [window.JNE.NES6502.prototype.opcodes.PHA, window.JNE.NES6502.prototype.addressModes.IMPLICIT];
    window.JNE.NES6502.prototype.instruction_table[0x49] = [window.JNE.NES6502.prototype.opcodes.EOR, window.JNE.NES6502.prototype.addressModes.IMMEDIATE];
    window.JNE.NES6502.prototype.instruction_table[0x4a] = [window.JNE.NES6502.prototype.opcodes.LSR, window.JNE.NES6502.prototype.addressModes.ACCUMULATOR];
    window.JNE.NES6502.prototype.instruction_table[0x4c] = [window.JNE.NES6502.prototype.opcodes.JMP, window.JNE.NES6502.prototype.addressModes.ABSOLUTE];
    window.JNE.NES6502.prototype.instruction_table[0x4d] = [window.JNE.NES6502.prototype.opcodes.EOR, window.JNE.NES6502.prototype.addressModes.ABSOLUTE];
    window.JNE.NES6502.prototype.instruction_table[0x4e] = [window.JNE.NES6502.prototype.opcodes.LSR, window.JNE.NES6502.prototype.addressModes.ABSOLUTE];
    window.JNE.NES6502.prototype.instruction_table[0x50] = [window.JNE.NES6502.prototype.opcodes.BVC, window.JNE.NES6502.prototype.addressModes.RELATIVE];
    window.JNE.NES6502.prototype.instruction_table[0x51] = [window.JNE.NES6502.prototype.opcodes.EOR, window.JNE.NES6502.prototype.addressModes.INDIRECT_INDEXED];
    window.JNE.NES6502.prototype.instruction_table[0x54] = [window.JNE.NES6502.prototype.opcodes.JMP, window.JNE.NES6502.prototype.addressModes.ZERO_PAGE_X];
    window.JNE.NES6502.prototype.instruction_table[0x55] = [window.JNE.NES6502.prototype.opcodes.EOR, window.JNE.NES6502.prototype.addressModes.ZERO_PAGE_X];
    window.JNE.NES6502.prototype.instruction_table[0x56] = [window.JNE.NES6502.prototype.opcodes.LSR, window.JNE.NES6502.prototype.addressModes.ZERO_PAGE_X];
    window.JNE.NES6502.prototype.instruction_table[0x58] = [window.JNE.NES6502.prototype.opcodes.CLI, window.JNE.NES6502.prototype.addressModes.IMPLICIT];
    window.JNE.NES6502.prototype.instruction_table[0x59] = [window.JNE.NES6502.prototype.opcodes.EOR, window.JNE.NES6502.prototype.addressModes.ABSOLUTE_Y];
    window.JNE.NES6502.prototype.instruction_table[0x5c] = [window.JNE.NES6502.prototype.opcodes.JMP, window.JNE.NES6502.prototype.addressModes.ABSOLUTE_X];
    window.JNE.NES6502.prototype.instruction_table[0x5d] = [window.JNE.NES6502.prototype.opcodes.EOR, window.JNE.NES6502.prototype.addressModes.ABSOLUTE_X];
    window.JNE.NES6502.prototype.instruction_table[0x5e] = [window.JNE.NES6502.prototype.opcodes.LSR, window.JNE.NES6502.prototype.addressModes.ABSOLUTE_X];
    window.JNE.NES6502.prototype.instruction_table[0x60] = [window.JNE.NES6502.prototype.opcodes.RTS, window.JNE.NES6502.prototype.addressModes.IMPLICIT];
    window.JNE.NES6502.prototype.instruction_table[0x61] = [window.JNE.NES6502.prototype.opcodes.ADC, window.JNE.NES6502.prototype.addressModes.INDEXED_INDIRECT, 6];
    window.JNE.NES6502.prototype.instruction_table[0x62] = [window.JNE.NES6502.prototype.opcodes.ROR, window.JNE.NES6502.prototype.addressModes.IMMEDIATE];
    window.JNE.NES6502.prototype.instruction_table[0x64] = [window.JNE.NES6502.prototype.opcodes.JMP_ABS, window.JNE.NES6502.prototype.addressModes.ZERO_PAGE];
    window.JNE.NES6502.prototype.instruction_table[0x65] = [window.JNE.NES6502.prototype.opcodes.ADC, window.JNE.NES6502.prototype.addressModes.ZERO_PAGE, 3];
    window.JNE.NES6502.prototype.instruction_table[0x66] = [window.JNE.NES6502.prototype.opcodes.ROR, window.JNE.NES6502.prototype.addressModes.ZERO_PAGE];
    window.JNE.NES6502.prototype.instruction_table[0x68] = [window.JNE.NES6502.prototype.opcodes.PLA, window.JNE.NES6502.prototype.addressModes.IMPLICIT];
    window.JNE.NES6502.prototype.instruction_table[0x69] = [window.JNE.NES6502.prototype.opcodes.ADC, window.JNE.NES6502.prototype.addressModes.IMMEDIATE, 2];
    window.JNE.NES6502.prototype.instruction_table[0x6a] = [window.JNE.NES6502.prototype.opcodes.ROR, window.JNE.NES6502.prototype.addressModes.ACCUMULATOR];
    window.JNE.NES6502.prototype.instruction_table[0x6c] = [window.JNE.NES6502.prototype.opcodes.JMP_ABS, window.JNE.NES6502.prototype.addressModes.ABSOLUTE];
    window.JNE.NES6502.prototype.instruction_table[0x6d] = [window.JNE.NES6502.prototype.opcodes.ADC, window.JNE.NES6502.prototype.addressModes.ABSOLUTE, 4];
    window.JNE.NES6502.prototype.instruction_table[0x6e] = [window.JNE.NES6502.prototype.opcodes.ROR, window.JNE.NES6502.prototype.addressModes.ABSOLUTE];
    window.JNE.NES6502.prototype.instruction_table[0x70] = [window.JNE.NES6502.prototype.opcodes.BVS, window.JNE.NES6502.prototype.addressModes.RELATIVE];
    window.JNE.NES6502.prototype.instruction_table[0x71] = [window.JNE.NES6502.prototype.opcodes.ADC, window.JNE.NES6502.prototype.addressModes.INDIRECT_INDEXED, 5];
    window.JNE.NES6502.prototype.instruction_table[0x74] = [window.JNE.NES6502.prototype.opcodes.JMP_ABS, window.JNE.NES6502.prototype.addressModes.ZERO_PAGE_X];
    window.JNE.NES6502.prototype.instruction_table[0x75] = [window.JNE.NES6502.prototype.opcodes.ADC, window.JNE.NES6502.prototype.addressModes.ZERO_PAGE_X, 4];
    window.JNE.NES6502.prototype.instruction_table[0x76] = [window.JNE.NES6502.prototype.opcodes.ROR, window.JNE.NES6502.prototype.addressModes.ZERO_PAGE_X];
    window.JNE.NES6502.prototype.instruction_table[0x78] = [window.JNE.NES6502.prototype.opcodes.SEI, window.JNE.NES6502.prototype.addressModes.IMPLICIT];
    window.JNE.NES6502.prototype.instruction_table[0x79] = [window.JNE.NES6502.prototype.opcodes.ADC, window.JNE.NES6502.prototype.addressModes.ABSOLUTE_Y, 4];
    window.JNE.NES6502.prototype.instruction_table[0x7c] = [window.JNE.NES6502.prototype.opcodes.JMP_ABS, window.JNE.NES6502.prototype.addressModes.ABSOLUTE_X];
    window.JNE.NES6502.prototype.instruction_table[0x7d] = [window.JNE.NES6502.prototype.opcodes.ADC, window.JNE.NES6502.prototype.addressModes.ABSOLUTE_X, 4];
    window.JNE.NES6502.prototype.instruction_table[0x7e] = [window.JNE.NES6502.prototype.opcodes.ROR, window.JNE.NES6502.prototype.addressModes.ABSOLUTE_X];
    window.JNE.NES6502.prototype.instruction_table[0x80] = [window.JNE.NES6502.prototype.opcodes.STY, window.JNE.NES6502.prototype.addressModes.IMMEDIATE];
    window.JNE.NES6502.prototype.instruction_table[0x81] = [window.JNE.NES6502.prototype.opcodes.STA, window.JNE.NES6502.prototype.addressModes.INDEXED_INDIRECT];
    window.JNE.NES6502.prototype.instruction_table[0x82] = [window.JNE.NES6502.prototype.opcodes.STX, window.JNE.NES6502.prototype.addressModes.IMMEDIATE];
    window.JNE.NES6502.prototype.instruction_table[0x84] = [window.JNE.NES6502.prototype.opcodes.STY, window.JNE.NES6502.prototype.addressModes.ZERO_PAGE];
    window.JNE.NES6502.prototype.instruction_table[0x85] = [window.JNE.NES6502.prototype.opcodes.STA, window.JNE.NES6502.prototype.addressModes.ZERO_PAGE];
    window.JNE.NES6502.prototype.instruction_table[0x86] = [window.JNE.NES6502.prototype.opcodes.STX, window.JNE.NES6502.prototype.addressModes.ZERO_PAGE];
    window.JNE.NES6502.prototype.instruction_table[0x88] = [window.JNE.NES6502.prototype.opcodes.DEY, window.JNE.NES6502.prototype.addressModes.IMPLICIT];
    window.JNE.NES6502.prototype.instruction_table[0x89] = [window.JNE.NES6502.prototype.opcodes.STA, window.JNE.NES6502.prototype.addressModes.IMMEDIATE];
    window.JNE.NES6502.prototype.instruction_table[0x8a] = [window.JNE.NES6502.prototype.opcodes.TXA, window.JNE.NES6502.prototype.addressModes.IMPLICIT];
    window.JNE.NES6502.prototype.instruction_table[0x8c] = [window.JNE.NES6502.prototype.opcodes.STY, window.JNE.NES6502.prototype.addressModes.ABSOLUTE];
    window.JNE.NES6502.prototype.instruction_table[0x8d] = [window.JNE.NES6502.prototype.opcodes.STA, window.JNE.NES6502.prototype.addressModes.ABSOLUTE];
    window.JNE.NES6502.prototype.instruction_table[0x8e] = [window.JNE.NES6502.prototype.opcodes.STX, window.JNE.NES6502.prototype.addressModes.ABSOLUTE];
    window.JNE.NES6502.prototype.instruction_table[0x90] = [window.JNE.NES6502.prototype.opcodes.BCC, window.JNE.NES6502.prototype.addressModes.RELATIVE, 2];
    window.JNE.NES6502.prototype.instruction_table[0x91] = [window.JNE.NES6502.prototype.opcodes.STA, window.JNE.NES6502.prototype.addressModes.INDIRECT_INDEXED];
    window.JNE.NES6502.prototype.instruction_table[0x94] = [window.JNE.NES6502.prototype.opcodes.STY, window.JNE.NES6502.prototype.addressModes.ZERO_PAGE_X];
    window.JNE.NES6502.prototype.instruction_table[0x95] = [window.JNE.NES6502.prototype.opcodes.STA, window.JNE.NES6502.prototype.addressModes.ZERO_PAGE_X];
    window.JNE.NES6502.prototype.instruction_table[0x96] = [window.JNE.NES6502.prototype.opcodes.STX, window.JNE.NES6502.prototype.addressModes.ZERO_PAGE_X];
    window.JNE.NES6502.prototype.instruction_table[0x98] = [window.JNE.NES6502.prototype.opcodes.TYA, window.JNE.NES6502.prototype.addressModes.IMPLICIT];
    window.JNE.NES6502.prototype.instruction_table[0x99] = [window.JNE.NES6502.prototype.opcodes.STA, window.JNE.NES6502.prototype.addressModes.ABSOLUTE_Y];
    window.JNE.NES6502.prototype.instruction_table[0x9a] = [window.JNE.NES6502.prototype.opcodes.TXS, window.JNE.NES6502.prototype.addressModes.IMPLICIT];
    window.JNE.NES6502.prototype.instruction_table[0x9c] = [window.JNE.NES6502.prototype.opcodes.STY, window.JNE.NES6502.prototype.addressModes.ABSOLUTE_X];
    window.JNE.NES6502.prototype.instruction_table[0x9d] = [window.JNE.NES6502.prototype.opcodes.STA, window.JNE.NES6502.prototype.addressModes.ABSOLUTE_X];
    window.JNE.NES6502.prototype.instruction_table[0x9e] = [window.JNE.NES6502.prototype.opcodes.STX, window.JNE.NES6502.prototype.addressModes.ABSOLUTE_X];
    window.JNE.NES6502.prototype.instruction_table[0xa0] = [window.JNE.NES6502.prototype.opcodes.LDY, window.JNE.NES6502.prototype.addressModes.IMMEDIATE];
    window.JNE.NES6502.prototype.instruction_table[0xa1] = [window.JNE.NES6502.prototype.opcodes.LDA, window.JNE.NES6502.prototype.addressModes.INDEXED_INDIRECT, 6];
    window.JNE.NES6502.prototype.instruction_table[0xa2] = [window.JNE.NES6502.prototype.opcodes.LDX, window.JNE.NES6502.prototype.addressModes.IMMEDIATE];
    window.JNE.NES6502.prototype.instruction_table[0xa4] = [window.JNE.NES6502.prototype.opcodes.LDY, window.JNE.NES6502.prototype.addressModes.ZERO_PAGE];
    window.JNE.NES6502.prototype.instruction_table[0xa5] = [window.JNE.NES6502.prototype.opcodes.LDA, window.JNE.NES6502.prototype.addressModes.ZERO_PAGE, 3];
    window.JNE.NES6502.prototype.instruction_table[0xa6] = [window.JNE.NES6502.prototype.opcodes.LDX, window.JNE.NES6502.prototype.addressModes.ZERO_PAGE];
    window.JNE.NES6502.prototype.instruction_table[0xa8] = [window.JNE.NES6502.prototype.opcodes.TAY, window.JNE.NES6502.prototype.addressModes.IMPLICIT];
    window.JNE.NES6502.prototype.instruction_table[0xa9] = [window.JNE.NES6502.prototype.opcodes.LDA, window.JNE.NES6502.prototype.addressModes.IMMEDIATE, 2];
    window.JNE.NES6502.prototype.instruction_table[0xaa] = [window.JNE.NES6502.prototype.opcodes.TAX, window.JNE.NES6502.prototype.addressModes.IMPLICIT];
    window.JNE.NES6502.prototype.instruction_table[0xac] = [window.JNE.NES6502.prototype.opcodes.LDY, window.JNE.NES6502.prototype.addressModes.ABSOLUTE];
    window.JNE.NES6502.prototype.instruction_table[0xad] = [window.JNE.NES6502.prototype.opcodes.LDA, window.JNE.NES6502.prototype.addressModes.ABSOLUTE, 4];
    window.JNE.NES6502.prototype.instruction_table[0xae] = [window.JNE.NES6502.prototype.opcodes.LDX, window.JNE.NES6502.prototype.addressModes.ABSOLUTE];
    window.JNE.NES6502.prototype.instruction_table[0xb0] = [window.JNE.NES6502.prototype.opcodes.BCS, window.JNE.NES6502.prototype.addressModes.RELATIVE];
    window.JNE.NES6502.prototype.instruction_table[0xb1] = [window.JNE.NES6502.prototype.opcodes.LDA, window.JNE.NES6502.prototype.addressModes.INDIRECT_INDEXED, 5];
    window.JNE.NES6502.prototype.instruction_table[0xb4] = [window.JNE.NES6502.prototype.opcodes.LDY, window.JNE.NES6502.prototype.addressModes.ZERO_PAGE_X];
    window.JNE.NES6502.prototype.instruction_table[0xb5] = [window.JNE.NES6502.prototype.opcodes.LDA, window.JNE.NES6502.prototype.addressModes.ZERO_PAGE_X, 4];
    window.JNE.NES6502.prototype.instruction_table[0xb6] = [window.JNE.NES6502.prototype.opcodes.LDX, window.JNE.NES6502.prototype.addressModes.ZERO_PAGE_X];
    window.JNE.NES6502.prototype.instruction_table[0xb8] = [window.JNE.NES6502.prototype.opcodes.CLV, window.JNE.NES6502.prototype.addressModes.IMPLICIT];
    window.JNE.NES6502.prototype.instruction_table[0xb9] = [window.JNE.NES6502.prototype.opcodes.LDA, window.JNE.NES6502.prototype.addressModes.ABSOLUTE_Y, 4];
    window.JNE.NES6502.prototype.instruction_table[0xba] = [window.JNE.NES6502.prototype.opcodes.TSX, window.JNE.NES6502.prototype.addressModes.IMPLICIT];
    window.JNE.NES6502.prototype.instruction_table[0xbc] = [window.JNE.NES6502.prototype.opcodes.LDY, window.JNE.NES6502.prototype.addressModes.ABSOLUTE_X];
    window.JNE.NES6502.prototype.instruction_table[0xbd] = [window.JNE.NES6502.prototype.opcodes.LDA, window.JNE.NES6502.prototype.addressModes.ABSOLUTE_X, 4];
    window.JNE.NES6502.prototype.instruction_table[0xbe] = [window.JNE.NES6502.prototype.opcodes.LDX, window.JNE.NES6502.prototype.addressModes.ABSOLUTE_X];
    window.JNE.NES6502.prototype.instruction_table[0xc0] = [window.JNE.NES6502.prototype.opcodes.CPY, window.JNE.NES6502.prototype.addressModes.IMMEDIATE];
    window.JNE.NES6502.prototype.instruction_table[0xc1] = [window.JNE.NES6502.prototype.opcodes.CMP, window.JNE.NES6502.prototype.addressModes.INDEXED_INDIRECT];
    window.JNE.NES6502.prototype.instruction_table[0xc2] = [window.JNE.NES6502.prototype.opcodes.DEC, window.JNE.NES6502.prototype.addressModes.IMMEDIATE];
    window.JNE.NES6502.prototype.instruction_table[0xc4] = [window.JNE.NES6502.prototype.opcodes.CPY, window.JNE.NES6502.prototype.addressModes.ZERO_PAGE];
    window.JNE.NES6502.prototype.instruction_table[0xc5] = [window.JNE.NES6502.prototype.opcodes.CMP, window.JNE.NES6502.prototype.addressModes.ZERO_PAGE];
    window.JNE.NES6502.prototype.instruction_table[0xc6] = [window.JNE.NES6502.prototype.opcodes.DEC, window.JNE.NES6502.prototype.addressModes.ZERO_PAGE];
    window.JNE.NES6502.prototype.instruction_table[0xc8] = [window.JNE.NES6502.prototype.opcodes.INY, window.JNE.NES6502.prototype.addressModes.IMPLICIT];
    window.JNE.NES6502.prototype.instruction_table[0xc9] = [window.JNE.NES6502.prototype.opcodes.CMP, window.JNE.NES6502.prototype.addressModes.IMMEDIATE];
    window.JNE.NES6502.prototype.instruction_table[0xca] = [window.JNE.NES6502.prototype.opcodes.DEX, window.JNE.NES6502.prototype.addressModes.IMPLICIT];
    window.JNE.NES6502.prototype.instruction_table[0xcc] = [window.JNE.NES6502.prototype.opcodes.CPY, window.JNE.NES6502.prototype.addressModes.ABSOLUTE];
    window.JNE.NES6502.prototype.instruction_table[0xcd] = [window.JNE.NES6502.prototype.opcodes.CMP, window.JNE.NES6502.prototype.addressModes.ABSOLUTE];
    window.JNE.NES6502.prototype.instruction_table[0xce] = [window.JNE.NES6502.prototype.opcodes.DEC, window.JNE.NES6502.prototype.addressModes.ABSOLUTE];
    window.JNE.NES6502.prototype.instruction_table[0xd0] = [window.JNE.NES6502.prototype.opcodes.BNE, window.JNE.NES6502.prototype.addressModes.RELATIVE];
    window.JNE.NES6502.prototype.instruction_table[0xd1] = [window.JNE.NES6502.prototype.opcodes.CMP, window.JNE.NES6502.prototype.addressModes.INDIRECT_INDEXED];
    window.JNE.NES6502.prototype.instruction_table[0xd4] = [window.JNE.NES6502.prototype.opcodes.CPY, window.JNE.NES6502.prototype.addressModes.ZERO_PAGE_X];
    window.JNE.NES6502.prototype.instruction_table[0xd5] = [window.JNE.NES6502.prototype.opcodes.CMP, window.JNE.NES6502.prototype.addressModes.ZERO_PAGE_X];
    window.JNE.NES6502.prototype.instruction_table[0xd6] = [window.JNE.NES6502.prototype.opcodes.DEC, window.JNE.NES6502.prototype.addressModes.ZERO_PAGE_X];
    window.JNE.NES6502.prototype.instruction_table[0xd8] = [window.JNE.NES6502.prototype.opcodes.CLD, window.JNE.NES6502.prototype.addressModes.IMPLICIT];
    window.JNE.NES6502.prototype.instruction_table[0xd9] = [window.JNE.NES6502.prototype.opcodes.CMP, window.JNE.NES6502.prototype.addressModes.ABSOLUTE_Y];
    window.JNE.NES6502.prototype.instruction_table[0xdc] = [window.JNE.NES6502.prototype.opcodes.CPY, window.JNE.NES6502.prototype.addressModes.ABSOLUTE_X];
    window.JNE.NES6502.prototype.instruction_table[0xdd] = [window.JNE.NES6502.prototype.opcodes.CMP, window.JNE.NES6502.prototype.addressModes.ABSOLUTE_X];
    window.JNE.NES6502.prototype.instruction_table[0xde] = [window.JNE.NES6502.prototype.opcodes.DEC, window.JNE.NES6502.prototype.addressModes.ABSOLUTE_X];
    window.JNE.NES6502.prototype.instruction_table[0xe0] = [window.JNE.NES6502.prototype.opcodes.CPX, window.JNE.NES6502.prototype.addressModes.IMMEDIATE];
    window.JNE.NES6502.prototype.instruction_table[0xe1] = [window.JNE.NES6502.prototype.opcodes.SBC, window.JNE.NES6502.prototype.addressModes.INDEXED_INDIRECT];
    window.JNE.NES6502.prototype.instruction_table[0xe2] = [window.JNE.NES6502.prototype.opcodes.INC, window.JNE.NES6502.prototype.addressModes.IMMEDIATE];
    window.JNE.NES6502.prototype.instruction_table[0xe4] = [window.JNE.NES6502.prototype.opcodes.CPX, window.JNE.NES6502.prototype.addressModes.ZERO_PAGE];
    window.JNE.NES6502.prototype.instruction_table[0xe5] = [window.JNE.NES6502.prototype.opcodes.SBC, window.JNE.NES6502.prototype.addressModes.ZERO_PAGE];
    window.JNE.NES6502.prototype.instruction_table[0xe6] = [window.JNE.NES6502.prototype.opcodes.INC, window.JNE.NES6502.prototype.addressModes.ZERO_PAGE];
    window.JNE.NES6502.prototype.instruction_table[0xe8] = [window.JNE.NES6502.prototype.opcodes.INX, window.JNE.NES6502.prototype.addressModes.IMPLICIT];
    window.JNE.NES6502.prototype.instruction_table[0xe9] = [window.JNE.NES6502.prototype.opcodes.SBC, window.JNE.NES6502.prototype.addressModes.IMMEDIATE];
    window.JNE.NES6502.prototype.instruction_table[0xea] = [window.JNE.NES6502.prototype.opcodes.NOP, window.JNE.NES6502.prototype.addressModes.IMPLICIT, 2];
    window.JNE.NES6502.prototype.instruction_table[0xec] = [window.JNE.NES6502.prototype.opcodes.CPX, window.JNE.NES6502.prototype.addressModes.ABSOLUTE];
    window.JNE.NES6502.prototype.instruction_table[0xed] = [window.JNE.NES6502.prototype.opcodes.SBC, window.JNE.NES6502.prototype.addressModes.ABSOLUTE];
    window.JNE.NES6502.prototype.instruction_table[0xee] = [window.JNE.NES6502.prototype.opcodes.INC, window.JNE.NES6502.prototype.addressModes.ABSOLUTE];
    window.JNE.NES6502.prototype.instruction_table[0xf0] = [window.JNE.NES6502.prototype.opcodes.BEQ, window.JNE.NES6502.prototype.addressModes.RELATIVE];
    window.JNE.NES6502.prototype.instruction_table[0xf1] = [window.JNE.NES6502.prototype.opcodes.SBC, window.JNE.NES6502.prototype.addressModes.INDIRECT_INDEXED];
    window.JNE.NES6502.prototype.instruction_table[0xf4] = [window.JNE.NES6502.prototype.opcodes.CPX, window.JNE.NES6502.prototype.addressModes.ZERO_PAGE_X];
    window.JNE.NES6502.prototype.instruction_table[0xf5] = [window.JNE.NES6502.prototype.opcodes.SBC, window.JNE.NES6502.prototype.addressModes.ZERO_PAGE_X];
    window.JNE.NES6502.prototype.instruction_table[0xf6] = [window.JNE.NES6502.prototype.opcodes.INC, window.JNE.NES6502.prototype.addressModes.ZERO_PAGE_X];
    window.JNE.NES6502.prototype.instruction_table[0xf8] = [window.JNE.NES6502.prototype.opcodes.SED, window.JNE.NES6502.prototype.addressModes.IMPLICIT];
    window.JNE.NES6502.prototype.instruction_table[0xf9] = [window.JNE.NES6502.prototype.opcodes.SBC, window.JNE.NES6502.prototype.addressModes.ABSOLUTE_Y];
    window.JNE.NES6502.prototype.instruction_table[0xfc] = [window.JNE.NES6502.prototype.opcodes.CPX, window.JNE.NES6502.prototype.addressModes.ABSOLUTE_X];
    window.JNE.NES6502.prototype.instruction_table[0xfd] = [window.JNE.NES6502.prototype.opcodes.SBC, window.JNE.NES6502.prototype.addressModes.ABSOLUTE_X];
    window.JNE.NES6502.prototype.instruction_table[0xfe] = [window.JNE.NES6502.prototype.opcodes.INC, window.JNE.NES6502.prototype.addressModes.ABSOLUTE_X];

    /**
     * Reads the appropriate memory location and returns the value, depending on the address mode
     * @param addressMode number The address mode of the current operation.
     * @returns object
     */
    window.JNE.NES6502.prototype.readMemory = function(addressMode){

        var address;
        var value;

        switch(addressMode){
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
                value =  this.mmc.fetch(address);
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
                if((address & 0xFF00) != ((address + this.registers.X) & 0xFF00)) {
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
                if((address & 0xFF00) != ((address + this.registers.Y) & 0xFF00)) {
                    this.memoryCycles += 1;
                }
                address = address + this.registers.Y;
                value =  this.mmc.fetch(address);
                break;
            case this.addressModes.RELATIVE:

                address = this.mmc.fetch(this.registers.PC++);

                if(address < 0x80) {
                    address = this.registers.PC + address;
                }else{
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
            case this.addressModes.INDIRECT_ABSOLUTE:
                throw "Not implemented"; //@TODO investigate this
            case this.addressModes.IMPLICIT:
                throw "Cannot read memory for an implicit addressing mode operation";
            default:
                throw "Unsupported addressing mode";
        }

        return {
            address: address,
            value: value
        };

    };

    // http://www.obelisk.demon.co.uk/6502/reference.html#LDA
    window.JNE.NES6502.prototype.operations = [];

    window.JNE.NES6502.prototype.operations[window.JNE.NES6502.prototype.opcodes.LDA] = function(addressMode) {
        var value = this.readMemory(addressMode).value;
        this.registers.A = value;
        this.flags.zero = this.registers.A === 0 ? 1 : 0;
        this.flags.negative = this.registers.A & 0x80 ? 1 : 0;
    };

    window.JNE.NES6502.prototype.operations[window.JNE.NES6502.prototype.opcodes.NOP] = function(addressMode) {
        //nothing!
    };

    window.JNE.NES6502.prototype.operations[window.JNE.NES6502.prototype.opcodes.ADC] = function(addressMode) {

        var mem = this.readMemory(addressMode).value;

        var tmp = this.registers.A + mem + this.flags.carry;
        this.flags.overflow = ((this.registers.A ^ mem) & 0x80) === 0 && ((this.registers.A ^ tmp) & 0x80) !== 0 ? 1 : 0;
        this.flags.carry = tmp > 0xff ? 1 : 0;
        this.flags.negative = tmp & 0x80 ? 1 : 0;
        this.flags.zero = this.registers.A === 0;
        this.registers.A = tmp & 0xff;

    };

    window.JNE.NES6502.prototype.operations[window.JNE.NES6502.prototype.opcodes.AND] = function(addressMode) {

        this.registers.A = this.readMemory(addressMode).value & this.registers.A;
        this.flags.negative = this.registers.A & 0x80 ? 1 : 0;
        this.flags.zero = this.registers.A === 0;

    };

    window.JNE.NES6502.prototype.operations[window.JNE.NES6502.prototype.opcodes.ASL] = function(addressMode) {

        var tmp = 0;

        if(addressMode === this.addressModes.ACCUMULATOR){
            tmp = this.registers.A << 1;
            this.registers.A = tmp & 0xff;
        }else {
            var mem = this.readMemory(addressMode);
            tmp = mem.value << 1;
            this.mmc.store(mem.address, tmp & 0xff);
        }

        this.flags.carry = tmp > 0xff ? 1 : 0;
        this.flags.negative = tmp & 0x80 ? 1 : 0;
        this.flags.zero = this.registers.A === 0 ? 1 : 0;

    };

    window.JNE.NES6502.prototype.operations[window.JNE.NES6502.prototype.opcodes.BCC] = function(addressMode) {

        if(this.flags.carry === 0){
            this.extraCycles++;
            var old_pc = this.registers.PC;
            var inc = this.readMemory(addressMode).value;

            this.registers.PC += inc;

            if(this.registers.PC & 0xFF00 !== old_pc & 0xFF00){
                this.extraCycles++;
            }
        }
    };

    window.JNE.NES6502.prototype.execute = function(){

        this.memoryCycles = 0;
        this.extraCycles = 0;

        var opcode = this.mmc.fetch(this.registers.PC++);

        if(!(opcode in this.instruction_table)){
            throw "Invalid opcode: 0x" + opcode.toString(16);
        }

        var instruction = this.instruction_table[opcode];

        this.operations[instruction[0]].apply(this, [instruction[1]]);

        return instruction[2] + this.memoryCycles + this.extraCycles;
    };

})();