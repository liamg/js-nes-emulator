QUnit.module( "MMC", {
    setup: function() {
        window.mmc = new JNE.MMC();
    },
    teardown: function() {

    }
});

QUnit.test("MMC initialises memory", function( assert ) {

    assert.equal(mmc.size, 0x10000, 'MMC is configured to initialise 65536 bytes of memory.');

    assert.equal(mmc.memory.length, 0x10000, 'Memory initialised is of size 65536 bytes.');

    assert.equal(mmc.fetch(0), 0, 'Memory at zero offset has zero value.');
    assert.equal(mmc.fetch(0x01), 0, 'Memory at 0x01 offset has zero value.');
    assert.equal(mmc.fetch(0xFF), 0, 'Memory at 0xFF offset has zero value.');
    assert.equal(mmc.fetch(mmc.size-1), 0, 'Memory at last offset has zero value.');

});

QUnit.test("MMC resets memory to zero byte values", function( assert ) {

    mmc.store(0x00, 0x01);
    mmc.store(0x01, 0x01);
    mmc.store(0xFF, 0x01);
    mmc.store(mmc.size-1, 0x01);

    mmc.reset();

    assert.equal(mmc.memory.length, 0x10000, 'Memory is still of size 65536 bytes after reset.');

    assert.equal(mmc.fetch(0), 0, 'Memory at zero offset has zero value.');
    assert.equal(mmc.fetch(0x01), 0, 'Memory at 0x01 offset has zero value.');
    assert.equal(mmc.fetch(0xFF), 0, 'Memory at 0xFF offset has zero value.');
    assert.equal(mmc.fetch(mmc.size-1), 0, 'Memory at last offset has zero value.');

});

QUnit.test("MMC stores values in memory", function( assert ) {

    function testStore(address, value){
        mmc.store(address, value);
        assert.equal(mmc.memory[address], value, 'Value ' + value + ' is stored at location 0x' + address.toString(16));
    }

    testStore(0x00, 0x01);
    testStore(0x00, 0xFF);
    testStore(0x00, 0x00);
    testStore(0x00, 0x07);

    testStore(0x01, 0x01);
    testStore(0x01, 0xFF);
    testStore(0x01, 0x00);
    testStore(0x01, 0x07);

    testStore(mmc.memory.length-1, 0x01);
    testStore(mmc.memory.length-1, 0xFF);
    testStore(mmc.memory.length-1, 0x00);
    testStore(mmc.memory.length-1, 0x07);

    assert.throws(
        function(){
            mmc.store(mmc.memory.length, 0x00);
        },
        /Invalid memory address/,
        'Exception is thrown when attempting to write to invalid location in memory (>= size).'
    );

    assert.throws(
        function(){
            mmc.store(-1, 0x00);
        },
        /Invalid memory address/,
        'Exception is thrown when attempting to write to invalid location in memory (-1).'
    );

    assert.throws(
        function(){
            mmc.store(null, 0x00);
        },
        /Invalid memory address/,
        'Exception is thrown when attempting to write to invalid location in memory (null).'
    );

    assert.throws(
        function(){
            mmc.store(undefined, 0x00);
        },
        /Invalid memory address/,
        'Exception is thrown when attempting to write to invalid location in memory (undefined).'
    );

});

QUnit.test("MMC retrieves values from memory", function( assert ) {

    function testFetch(address, value){
        mmc.store(address, value);
        assert.equal(mmc.fetch(address), value, 'Value ' + value + ' can be retrieved from location 0x' + address.toString(16));
    }

    testFetch(0x00, 0x01);
    testFetch(0x00, 0xFF);
    testFetch(0x00, 0x00);
    testFetch(0x00, 0x01);

    testFetch(0xF, 0x01);
    testFetch(0xF, 0xFF);
    testFetch(0xF, 0x00);
    testFetch(0xF, 0x01);

    testFetch(mmc.memory.length-1, 0x01);
    testFetch(mmc.memory.length-1, 0xFF);
    testFetch(mmc.memory.length-1, 0x00);
    testFetch(mmc.memory.length-1, 0x01);

    assert.throws(
        function(){
            mmc.fetch(mmc.memory.length);
        },
        /Invalid memory address/,
        'Exception is thrown when attempting to fetch from invalid location in memory (>= size).'
    );

    assert.throws(
        function(){
            mmc.fetch(-1);
        },
        /Invalid memory address/,
        'Exception is thrown when attempting to fetch from invalid location in memory (-1).'
    );

    assert.throws(
        function(){
            mmc.fetch(null);
        },
        /Invalid memory address/,
        'Exception is thrown when attempting to fetch from invalid location in memory (null).'
    );

    assert.throws(
        function(){
            mmc.fetch(undefined);
        },
        /Invalid memory address/,
        'Exception is thrown when attempting to fetch from invalid location in memory (undefined).'
    );

});

QUnit.module( "6502 CPU", {
    setup: function() {
        window.mmc = new JNE.MMC();
        window.cpu = new JNE.NES6502(window.mmc);
    },
    teardown: function() {

    }
});

QUnit.test("Initialises registers/flags", function( assert ) {

    assert.equal(cpu.registers.A, 0, 'Register A is initialised to 0x00');
    assert.equal(cpu.registers.X, 0, 'Register X is initialised to 0x00');
    assert.equal(cpu.registers.Y, 0, 'Register Y is initialised to 0x00');
    assert.equal(cpu.registers.SP, 0x01FF, 'Register SP is initialised to 0x01FF');
    assert.equal(cpu.registers.PC, 0x07FF, 'Register PC is initialised to 0x07FF');
    assert.equal(cpu.registers.P, 0, 'Register P is initialised to 0x00');

    assert.equal(cpu.flags.negative, 0, 'Negative flag is not initially set');
    assert.equal(cpu.flags.carry, 0, 'Carry flag is not initially set');
    assert.equal(cpu.flags.zero, 1, 'Zero flag is initially set');

});

QUnit.test("Reset state", function( assert ) {

    cpu.registers.A = 0x99;
    cpu.registers.X = 0x99;
    cpu.registers.Y = 0x99;
    cpu.registers.SP = 0x99;
    cpu.registers.PC = 0x99;
    cpu.registers.P = 0x99;

    cpu.reset();

    assert.equal(cpu.registers.A, 0, 'Register A is reset to 0x00');
    assert.equal(cpu.registers.X, 0, 'Register X is reset to 0x00');
    assert.equal(cpu.registers.Y, 0, 'Register Y is reset to 0x00');
    assert.equal(cpu.registers.SP, 0x01FF, 'Register SP is reset to 0x01FF');
    assert.equal(cpu.registers.PC, 0x07FF, 'Register PC is reset to 0x07FF');
    assert.equal(cpu.registers.P, 0, 'Register P is reset to 0x00');

    assert.equal(cpu.flags.negative, 0, 'Negative flag is not initially set');
    assert.equal(cpu.flags.carry, 0, 'Carry flag is not initially set');
    assert.equal(cpu.flags.zero, 1, 'Zero flag is initially set');

});

QUnit.test("Instruction table contains valid instructions", function( assert ) {

    function decodeInstruction(opcode){

        // split byte into aaabbbcc
        var aaa = (opcode & 224) >> 5;
        var bbb = (opcode & 28) >> 2;
        var cc = opcode & 3;

        var result = {
            operation: opcode,
            address_mode: -1
        };

        switch(opcode) {

            case 0x10:
                result.operation = cpu.opcodes.BPL;
                result.address_mode = cpu.addressModes.RELATIVE;
                break;
            case 0x30:
                result.operation = cpu.opcodes.BMI;
                result.address_mode = cpu.addressModes.RELATIVE;
                break;
            case 0x50:
                result.operation = cpu.opcodes.BVC;
                result.address_mode = cpu.addressModes.RELATIVE;
                break;
            case 0x70:
                result.operation = cpu.opcodes.BVS;
                result.address_mode = cpu.addressModes.RELATIVE;
                break;
            case 0x90:
                result.operation = cpu.opcodes.BCC;
                result.address_mode = cpu.addressModes.RELATIVE;
                break;
            case 0xB0:
                result.operation = cpu.opcodes.BCS;
                result.address_mode = cpu.addressModes.RELATIVE;
                break;
            case 0xD0:
                result.operation = cpu.opcodes.BNE;
                result.address_mode = cpu.addressModes.RELATIVE;
                break;
            case 0xF0:
                result.operation = cpu.opcodes.BEQ;
                result.address_mode = cpu.addressModes.RELATIVE;
                break;

            case 0x00:
                result.operation = cpu.opcodes.BRK;
                result.address_mode = cpu.addressModes.IMPLICIT;
                break;
            case 0x20:
                result.operation = cpu.opcodes.JSR;
                result.address_mode = cpu.addressModes.ABSOLUTE;
                break;
            case 0x40:
                result.operation = cpu.opcodes.RTI;
                result.address_mode = cpu.addressModes.IMPLICIT;
                break;
            case 0x60:
                result.operation = cpu.opcodes.RTS;
                result.address_mode = cpu.addressModes.IMPLICIT;
                break;

            case 0x08:
                result.operation = cpu.opcodes.PHP;
                result.address_mode = cpu.addressModes.IMPLICIT;
                break;
            case 0x18:
                result.operation = cpu.opcodes.CLC;
                result.address_mode = cpu.addressModes.IMPLICIT;
                break;
            case 0x28:
                result.operation = cpu.opcodes.PLP;
                result.address_mode = cpu.addressModes.IMPLICIT;
                break;
            case 0x38:
                result.operation = cpu.opcodes.SEC;
                result.address_mode = cpu.addressModes.IMPLICIT;
                break;
            case 0x48:
                result.operation = cpu.opcodes.PHA;
                result.address_mode = cpu.addressModes.IMPLICIT;
                break;
            case 0x58:
                result.operation = cpu.opcodes.CLI;
                result.address_mode = cpu.addressModes.IMPLICIT;
                break;
            case 0x68:
                result.operation = cpu.opcodes.PLA;
                result.address_mode = cpu.addressModes.IMPLICIT;
                break;
            case 0x78:
                result.operation = cpu.opcodes.SEI;
                result.address_mode = cpu.addressModes.IMPLICIT;
                break;
            case 0x88:
                result.operation = cpu.opcodes.DEY;
                result.address_mode = cpu.addressModes.IMPLICIT;
                break;
            case 0x98:
                result.operation = cpu.opcodes.TYA;
                result.address_mode = cpu.addressModes.IMPLICIT;
                break;
            case 0xa8:
                result.operation = cpu.opcodes.TAY;
                result.address_mode = cpu.addressModes.IMPLICIT;
                break;
            case 0xb8:
                result.operation = cpu.opcodes.CLV;
                result.address_mode = cpu.addressModes.IMPLICIT;
                break;
            case 0xc8:
                result.operation = cpu.opcodes.INY;
                result.address_mode = cpu.addressModes.IMPLICIT;
                break;
            case 0xd8:
                result.operation = cpu.opcodes.CLD;
                result.address_mode = cpu.addressModes.IMPLICIT;
                break;
            case 0xe8:
                result.operation = cpu.opcodes.INX;
                result.address_mode = cpu.addressModes.IMPLICIT;
                break;
            case 0xf8:
                result.operation = cpu.opcodes.SED;
                result.address_mode = cpu.addressModes.IMPLICIT;
                break;

            case 0x8a:
                result.operation = cpu.opcodes.TXA;
                result.address_mode = cpu.addressModes.IMPLICIT;
                break;
            case 0x9a:
                result.operation = cpu.opcodes.TXS;
                result.address_mode = cpu.addressModes.IMPLICIT;
                break;
            case 0xaa:
                result.operation = cpu.opcodes.TAX;
                result.address_mode = cpu.addressModes.IMPLICIT;
                break;
            case 0xba:
                result.operation = cpu.opcodes.TSX;
                result.address_mode = cpu.addressModes.IMPLICIT;
                break;
            case 0xca:
                result.operation = cpu.opcodes.DEX;
                result.address_mode = cpu.addressModes.IMPLICIT;
                break;
            case 0xea:
                result.operation = cpu.opcodes.NOP;
                result.address_mode = cpu.addressModes.IMPLICIT;
                break;

            default:


                switch (cc) {
                    case 1: //01

                        switch (aaa) {
                            case 0:
                                result.operation = cpu.opcodes.ORA;
                                break;
                            case 1:
                                result.operation = cpu.opcodes.AND;
                                break;
                            case 2:
                                result.operation = cpu.opcodes.EOR;
                                break;
                            case 3:
                                result.operation = cpu.opcodes.ADC;
                                break;
                            case 4:
                                result.operation = cpu.opcodes.STA;
                                break;
                            case 5:
                                result.operation = cpu.opcodes.LDA;
                                break;
                            case 6:
                                result.operation = cpu.opcodes.CMP;
                                break;
                            case 7:
                                result.operation = cpu.opcodes.SBC;
                                break;
                        }

                        switch (bbb) {
                            case 0:
                                result.address_mode = cpu.addressModes.INDEXED_INDIRECT;
                                break;
                            case 1:
                                result.address_mode = cpu.addressModes.ZERO_PAGE;
                                break;
                            case 2:
                                result.address_mode = cpu.addressModes.IMMEDIATE;
                                break;
                            case 3:
                                result.address_mode = cpu.addressModes.ABSOLUTE;
                                break;
                            case 4:
                                result.address_mode = cpu.addressModes.INDIRECT_INDEXED;
                                break;
                            case 5:
                                result.address_mode = cpu.addressModes.ZERO_PAGE_X;
                                break;
                            case 6:
                                result.address_mode = cpu.addressModes.ABSOLUTE_Y;
                                break;
                            case 7:
                                result.address_mode = cpu.addressModes.ABSOLUTE_X;
                                break;
                        }

                        break;
                    case 2: //10

                        switch (aaa) {
                            case 0:
                                result.operation = cpu.opcodes.ASL;
                                break;
                            case 1:
                                result.operation = cpu.opcodes.ROL;
                                break;
                            case 2:
                                result.operation = cpu.opcodes.LSR;
                                break;
                            case 3:
                                result.operation = cpu.opcodes.ROR;
                                break;
                            case 4:
                                result.operation = cpu.opcodes.STX;
                                break;
                            case 5:
                                result.operation = cpu.opcodes.LDX;
                                break;
                            case 6:
                                result.operation = cpu.opcodes.DEC;
                                break;
                            case 7:
                                result.operation = cpu.opcodes.INC;
                                break;
                        }

                        switch (bbb) {
                            case 0:
                                result.address_mode = cpu.addressModes.IMMEDIATE;
                                break;
                            case 1:
                                result.address_mode = cpu.addressModes.ZERO_PAGE;
                                break;
                            case 2:
                                result.address_mode = cpu.addressModes.ACCUMULATOR;
                                break;
                            case 3:
                                result.address_mode = cpu.addressModes.ABSOLUTE;
                                break;
                            case 5:
                                result.address_mode = cpu.addressModes.ZERO_PAGE_X;
                                break;
                            case 7:
                                result.address_mode = cpu.addressModes.ABSOLUTE_X;
                                break;
                        }

                        break;

                    case 0:


                        switch (aaa) {
                            case 1:
                                result.operation = cpu.opcodes.BIT;
                                break;
                            case 2:
                                result.operation = cpu.opcodes.JMP;
                                break;
                            case 3:
                                result.operation = cpu.opcodes.JMP_ABS;
                                break;
                            case 4:
                                result.operation = cpu.opcodes.STY;
                                break;
                            case 5:
                                result.operation = cpu.opcodes.LDY;
                                break;
                            case 6:
                                result.operation = cpu.opcodes.CPY;
                                break;
                            case 7:
                                result.operation = cpu.opcodes.CPX;
                                break;
                        }

                        switch (bbb) {
                            case 0:
                                result.address_mode = cpu.addressModes.IMMEDIATE;
                                break;
                            case 1:
                                result.address_mode = cpu.addressModes.ZERO_PAGE;
                                break;
                            case 3:
                                result.address_mode = cpu.addressModes.ABSOLUTE;
                                break;
                            case 5:
                                result.address_mode = cpu.addressModes.ZERO_PAGE_X;
                                break;
                            case 7:
                                result.address_mode = cpu.addressModes.ABSOLUTE_X;
                                break;
                        }

                        break;
                }
        }

        return result;

    }
    
    for(var opcode in cpu.instruction_table) {

        opcode = parseInt(opcode, 10);

        var decoded = decodeInstruction(opcode);

        var operation = cpu.instruction_table[opcode][0];
        var address_mode = cpu.instruction_table[opcode][1];

        assert.equal(cpu.getOpcodeText(operation), cpu.getOpcodeText(decoded.operation), 'Operation matches for 0x' + opcode.toString(16) + ' (' + cpu.getOpcodeText(operation) + ')');
        assert.equal(cpu.getAddressModeText(address_mode), cpu.getAddressModeText(decoded.address_mode), 'Address mode matches for 0x' + opcode.toString(16) + ' (' + cpu.getOpcodeText(operation) + ')');
    }

});


QUnit.test("Memory reads in different address modes", function( assert ) {

    cpu.registers.A = 0x9;
    var accumulator = cpu.readMemory(cpu.addressModes.ACCUMULATOR).value;
    assert.equal(accumulator, 0x9, 'ACCUMULATOR address mode reads value');

    mmc.store(0xf, 0xff);
    cpu.registers.PC = 0xf;
    var imm = cpu.readMemory(cpu.addressModes.IMMEDIATE).value;
    assert.equal(imm, 0xff, 'IMMEDIATE address mode reads value');

    mmc.store(0x101, 0x3);
    mmc.store(0x102, 0x9);
    mmc.store(0x103, 0x8);
    mmc.store(0x104, 0x7);
    mmc.store(0x105, 0x6);
    cpu.registers.PC = 0x101;
    var rel = cpu.readMemory(cpu.addressModes.RELATIVE).value;
    assert.equal(rel, 0x6, 'RELATIVE address mode reads value');

    mmc.store(0x101, 0x3);
    mmc.store(0x102, 0x9);
    mmc.store(0x103, 0x82);
    mmc.store(0x104, 0x7);
    mmc.store(0x105, 0x6);
    cpu.registers.PC = 0x103;
    rel = cpu.readMemory(cpu.addressModes.RELATIVE).value;
    assert.equal(rel, 0x9, 'RELATIVE address mode reads value when negative offset');

    mmc.store(0xf, 0x1);
    cpu.registers.PC = 0xf;
    var zpval = cpu.readMemory(cpu.addressModes.ZERO_PAGE).value;
    assert.equal(zpval, 0x1, 'ZERO PAGE address mode reads value');

    mmc.store(0x6, 0x2);
    cpu.registers.PC = 0x3;
    cpu.registers.X = 0x3;
    var zpxval = cpu.readMemory(cpu.addressModes.ZERO_PAGE_X).value;
    assert.equal(zpxval, 0x2, 'ZERO PAGE X address mode reads value');

    mmc.store(0xa, 0x3);
    cpu.registers.PC = 0x8;
    cpu.registers.Y = 0x2;
    var zpyval = cpu.readMemory(cpu.addressModes.ZERO_PAGE_Y).value;
    assert.equal(zpyval, 0x3, 'ZERO PAGE Y address mode reads value');

    mmc.store(0x101, 0xaa);
    mmc.store(0x102, 0xaa);
    mmc.store(0xaaaa, 0x1);
    cpu.registers.PC = 0x101;
    var absval = cpu.readMemory(cpu.addressModes.ABSOLUTE).value;
    assert.equal(absval, 0x1, 'ABSOLUTE address mode reads value');

    mmc.store(0x101, 0x01);
    mmc.store(0x102, 0xcc);
    mmc.store(0xcc01, 0x1);
    cpu.registers.PC = 0x101;
    var absleval = cpu.readMemory(cpu.addressModes.ABSOLUTE).value;
    assert.equal(absleval, 0x1, 'ABSOLUTE address mode reads value (little endian)');

    mmc.store(0x101, 0xcc);
    mmc.store(0x102, 0x99);
    mmc.store(0x99cd, 0x1);
    cpu.registers.PC = 0x101;
    cpu.registers.X = 0x1;
    var absxval = cpu.readMemory(cpu.addressModes.ABSOLUTE_X).value;
    assert.equal(absxval, 0x1, 'ABSOLUTE X address mode reads value');

    mmc.store(0x103, 0x33);
    mmc.store(0x104, 0xcc);
    mmc.store(0xcc36, 0x1);
    cpu.registers.PC = 0x103;
    cpu.registers.Y = 0x3;
    var absyval = cpu.readMemory(cpu.addressModes.ABSOLUTE_Y).value;
    assert.equal(absyval, 0x1, 'ABSOLUTE Y address mode reads value');

    mmc.store(0x00, 0x07);
    mmc.store(0x10, 0x7);
    mmc.store(0x11, 0x5);
    mmc.store(0x507, 0x4);
    cpu.registers.PC = 0x00;
    cpu.registers.X = 0x09;
    var preindex = cpu.readMemory(cpu.addressModes.INDEXED_INDIRECT).value;
    assert.equal(preindex, 0x4, 'INDEXED INDIRECT address mode reads value');

    mmc.store(0x00, 0x07);
    mmc.store(0x07, 0x01);
    mmc.store(0x08, 0x03);
    mmc.store(0x302, 0x08);
    cpu.registers.PC = 0x00;
    cpu.registers.Y = 0x01;
    var postindex = cpu.readMemory(cpu.addressModes.INDIRECT_INDEXED).value;
    assert.equal(postindex, 0x8, 'INDIRECT INDEXED address mode reads value');

    assert.throws(
        function(){
            cpu.readMemory(0xff);
        },
        /Unsupported addressing mode/,
        'Error thrown on unknown address mode'
    );

    assert.throws(
        function(){
            cpu.readMemory(cpu.addressModes.IMPLICIT);
        },
        /Cannot read memory for an implicit addressing mode operation/,
        'Error thrown on implicit address mode read'
    );



});

QUnit.test("Invalid opcode check", function( assert ) {

    mmc.store(0x200, 0xff);

    cpu.registers.PC = 0x200;

    assert.throws(
        function(){
            cpu.execute();
        },
        /Invalid opcode/,
        'Error thrown on invalid opcode'
    );
});

QUnit.test("LDA #", function( assert ) {

    mmc.store(0x200, 0xA9);
    mmc.store(0x201, 0x07);

    cpu.registers.PC = 0x200;

    var cycles = cpu.execute();

    assert.equal(cycles, 2, 'LDA # takes 2 cycles');
    assert.equal(cpu.registers.A, 0x07, '"A" register has value 0x07 stored');
    assert.equal(cpu.registers.PC, 0x202, 'Program counter is incremented twice for LDA #');

    cpu.reset();

    mmc.store(0x200, 0xA9);
    mmc.store(0x201, 0x8);
    mmc.store(0x202, 0xA9);
    mmc.store(0x203, 0xf);
    mmc.store(0x204, 0xA9);
    mmc.store(0x205, 0x00);

    cpu.registers.PC = 0x200;

    cpu.execute();
    assert.equal(cpu.registers.A, 0x08, '"A" register has value 0x08 stored');
    assert.equal(cpu.registers.PC, 0x202, 'Program counter is incremented twice for LDA #');
    cpu.execute();
    assert.equal(cpu.registers.A, 0x0f, '"A" register has value 0x0f stored');
    assert.equal(cpu.registers.PC, 0x204, 'Program counter is incremented twice for LDA #');
    cpu.execute();
    assert.equal(cpu.registers.A, 0x00, '"A" register has value 0x00 stored');
    assert.equal(cpu.registers.PC, 0x206, 'Program counter is incremented twice for LDA #');


    cpu.reset();

    mmc.store(0x200, 0xA9);
    mmc.store(0x201, 0x00);

    cpu.registers.PC = 0x200;

    cpu.execute();

    assert.equal(cpu.flags.zero, 1, 'LDA #0 results in zero flag being set');
    assert.equal(cpu.flags.negative, 0, 'LDA #0 results in negative flag being unset');

    cpu.reset();

    mmc.store(0x200, 0xA9);
    mmc.store(0x201, 0x07);

    cpu.registers.PC = 0x200;

    cpu.execute();

    assert.equal(cpu.flags.zero, 0, 'LDA #7 results in zero flag being unset');
    assert.equal(cpu.flags.negative, 0, 'LDA #7 results in negative flag being unset');

    cpu.reset();

    mmc.store(0x200, 0xA9);
    mmc.store(0x201, 0x81);

    cpu.registers.PC = 0x200;

    cpu.execute();

    assert.equal(cpu.flags.zero, 0, 'LDA #81 results in zero flag being unset');
    assert.equal(cpu.flags.negative, 1, 'LDA #81 results in negative flag being set');

});

QUnit.test("NOP", function( assert ) {

    mmc.store(0x200, 0xEA);
    cpu.registers.PC = 0x200;

    assert.equal(cpu.execute(), 2, 'NOP takes 2 cycles');

});

QUnit.test("ADC #", function( assert ) {

    cpu.registers.A = 0x02;

    mmc.store(0x200, 0x69); // ADC
    mmc.store(0x201, 0x01); // #3

    cpu.registers.PC = 0x200;

    var cycles = cpu.execute();

    assert.equal(cycles, 2, 'ADC # takes 2 cycles');
    assert.equal(cpu.registers.A, 0x03, '"A" register has value 0x03 stored');
    assert.equal(cpu.registers.PC, 0x202, 'Program counter is incremented twice for ADC #');

    cpu.reset();

    // test carry bit is added

    cpu.registers.A = 0x02;

    mmc.store(0x200, 0x69); // ADC
    mmc.store(0x201, 0x01); // #$1

    cpu.registers.PC = 0x200;

    cpu.flags.carry = 1;

    cycles = cpu.execute();

    assert.equal(cycles, 2, 'ADC # takes 2 cycles');
    assert.equal(cpu.registers.A, 0x04, '"A" register has value 0x04 stored');
    assert.equal(cpu.registers.PC, 0x202, 'Program counter is incremented twice for ADC #');


    cpu.reset();

    // test multi-byte addition

    cpu.registers.A = 0x02;
    cpu.registers.PC = 0x200;
    cpu.flags.carry = 0;

    mmc.store(0x200, 0x69); // ADC
    mmc.store(0x201, 0xff); // #$ff
    mmc.store(0x202, 0x69); // ADC
    mmc.store(0x203, 0x00); // #$0

    cycles = cpu.execute();

    assert.equal(cycles, 2, 'ADC # call takes 2 cycles');
    assert.equal(cpu.registers.A, 0x01, '"A" register has value 0x01 stored');
    assert.equal(cpu.flags.carry, 0x1, 'Carry flag is set when adding 0xff + 0x1');
    assert.equal(cpu.registers.PC, 0x202, 'Program counter is incremented twice for ADC #');

    cycles = cpu.execute();

    assert.equal(cycles, 2, 'Additional ADC # call takes 2 further cycles');
    assert.equal(cpu.registers.A, 0x02, '"A" register has value 0x02 stored');
    assert.equal(cpu.flags.carry, 0x0, 'Carry flag is set when adding 0xff + 0x1');
    assert.equal(cpu.registers.PC, 0x204, 'Program counter is incremented twice further for additonal ADC #');



});


QUnit.test("AND #", function( assert ) {

    cpu.registers.A = 0x02;

    mmc.store(0x200, 0x29); // AND
    mmc.store(0x201, 0x01); // #$1

    cpu.registers.PC = 0x200;

    var cycles = cpu.execute();

    assert.equal(cycles, 2, 'AND # takes 2 cycles');
    assert.equal(cpu.registers.A, 0x00, '"A" register has value 0x00 stored');
    assert.equal(cpu.registers.PC, 0x202, 'Program counter is incremented twice for AND #');
    assert.equal(cpu.flags.negative, 0x0, 'Negative flag is not set');
    assert.equal(cpu.flags.zero, 0x1, 'Zero flag is set');

    cpu.reset();

    cpu.registers.A = 0xff;

    mmc.store(0x200, 0x29); // AND
    mmc.store(0x201, 0x47); // #$47

    cpu.registers.PC = 0x200;

    cycles = cpu.execute();

    assert.equal(cycles, 2, 'AND # takes 2 cycles');
    assert.equal(cpu.registers.A, 0x47, '"A" register has value 0x00 stored');
    assert.equal(cpu.registers.PC, 0x202, 'Program counter is incremented twice for AND #');
    assert.equal(cpu.flags.negative, 0x0, 'Negative flag is not set');
    assert.equal(cpu.flags.zero, 0x0, 'Zero flag is not set');


});


QUnit.test("ASL", function( assert ) {

    cpu.registers.A = 0xc;

    mmc.store(0x200, 0x0A); // ASL A

    cpu.registers.PC = 0x200;

    var cycles = cpu.execute();

    assert.equal(cycles, 2, 'ASL A takes 2 cycles');
    assert.equal(cpu.registers.A, 0x18, '"A" register has value 0x18 stored');
    assert.equal(cpu.registers.PC, 0x201, 'Program counter is incremented once for ASL A');
    assert.equal(cpu.flags.negative, 0x0, 'Negative flag is not set');
    assert.equal(cpu.flags.zero, 0x0, 'Zero flag is not set');


    cpu.reset();

    mmc.store(0x200, 0x0E); // ASL a
    mmc.store(0x201, 0x03);
    mmc.store(0x202, 0x02);
    mmc.store(0x203, 0x07);

    cpu.registers.PC = 0x200;

    cycles = cpu.execute();

    assert.equal(cycles, 6, 'ASL a takes 6 cycles');
    assert.equal(mmc.fetch(0x203), 0xE, 'Memory at 0x203 has value 0xE stored');
    assert.equal(cpu.registers.PC, 0x203, 'Program counter is incremented 3 times for ASL a');
    assert.equal(cpu.flags.negative, 0x0, 'Negative flag is not set');
    assert.equal(cpu.flags.zero, 0x1, 'Zero flag is set');


});

QUnit.test("BCC r", function( assert ) {

    cpu.flags.carry = 1;

    mmc.store(0x200, 0x90); // BCC +2
    mmc.store(0x201, 0x01);
    mmc.store(0x202, 0x02);
    mmc.store(0x203, 0x03);

    cpu.registers.PC = 0x200;

    var cycles = cpu.execute();

    assert.equal(cycles, 2, 'Unsuccessful BCC r takes 2 cycles');
    assert.equal(cpu.registers.PC, 0x201, 'Branch does not jump if carry not clear');

    cpu.reset();

    mmc.store(0x200, 0x90); // BCC +2
    mmc.store(0x201, 0x01);
    mmc.store(0x202, 0x02);
    mmc.store(0x203, 0x01);
    mmc.store(0x204, 0x07);

    cpu.registers.PC = 0x200;

    cycles = cpu.execute();

    assert.equal(cycles, 3, 'Successful BCC r takes 3 cycles');
    assert.equal(cpu.registers.PC, 0x203, 'Branch jumps if carry is clear');
});
