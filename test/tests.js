QUnit.module( "MMC", {
    setup: function() {
        window.mmc = new JNE.MMC();
    },
    teardown: function() {

    }
});

QUnit.test("MMC initialises memory", function( assert ) {

    assert.equal(mmc.size, 0xFFFF, 'MMC is configured to initialise 65536 bytes of memory.');

    assert.equal(mmc.memory.length, 0xFFFF, 'Memory initialised is of size 65536 bytes.');

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

    assert.equal(mmc.memory.length, 0xFFFF, 'Memory is still of size 65536 bytes after reset.');

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

QUnit.test("6502 initialises registers", function( assert ) {

    assert.equal(cpu.registers.A, 0, 'Register A is initialised to 0x00');
    assert.equal(cpu.registers.X, 0, 'Register X is initialised to 0x00');
    assert.equal(cpu.registers.Y, 0, 'Register Y is initialised to 0x00');
    assert.equal(cpu.registers.SP, 0xFF, 'Register SP is initialised to 0xFF');
    assert.equal(cpu.registers.PC, 0, 'Register PC is initialised to 0x00');
    assert.equal(cpu.registers.P, 0, 'Register P is initialised to 0x00');

});

QUnit.test("6502 reset state", function( assert ) {

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
    assert.equal(cpu.registers.SP, 0xFF, 'Register SP is reset to 0xFF');
    assert.equal(cpu.registers.PC, 0, 'Register PC is reset to 0x00');
    assert.equal(cpu.registers.P, 0, 'Register P is reset to 0x00');

});

QUnit.test("6502 instruction table contains valid instructions", function( assert ) {

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

        opcode = parseInt(opcode);

        var decoded = decodeInstruction(opcode);

        var operation = cpu.instruction_table[opcode][0];
        var address_mode = cpu.instruction_table[opcode][1];

        assert.equal(cpu.getOpcodeText(operation), cpu.getOpcodeText(decoded.operation), 'Operation matches for 0x' + opcode.toString(16) + ' (' + cpu.getOpcodeText(operation) + ')');
        assert.equal(cpu.getAddressModeText(address_mode), cpu.getAddressModeText(decoded.address_mode), 'Address mode matches for 0x' + opcode.toString(16) + ' (' + cpu.getOpcodeText(operation) + ')');
    }

});


QUnit.test("6502 LDA #", function( assert ) {

    cpu.reset();

    mmc.store(0x200, 0xA9);
    mmc.store(0x201, 0x07);

    cpu.registers.PC = 0x200;

    cpu.execute();

    //@TODO add more assertions for LDA operations e.g. cycles etc.

    assert.equal(cpu.registers.A, 0x07, '"A" register has value 0x07 stored');
    assert.equal(cpu.registers.PC, 0x202, 'Program counter is incremented twice for LDA #');

    mmc.store(0x200, 0xA9);
    mmc.store(0x201, 0x7);
    mmc.store(0x202, 0xA9);
    mmc.store(0x203, 0xf);
    mmc.store(0x204, 0xA9);
    mmc.store(0x205, 0x00);

    cpu.registers.PC = 0x200;

    cpu.execute();
    assert.equal(cpu.registers.A, 0x07, '"A" register has value 0x07 stored');
    assert.equal(cpu.registers.PC, 0x202, 'Program counter is incremented twice times for LDA #');
    cpu.execute();
    assert.equal(cpu.registers.A, 0x0f, '"A" register has value 0x0f stored');
    assert.equal(cpu.registers.PC, 0x204, 'Program counter is incremented twice times for LDA #');
    cpu.execute();
    assert.equal(cpu.registers.A, 0x00, '"A" register has value 0x00 stored');
    assert.equal(cpu.registers.PC, 0x206, 'Program counter is incremented twice times for LDA #');

    //@TODO add more assertions for LDA operations e.g. cycles etc.


});

// @TODO add tests for reset of flags

