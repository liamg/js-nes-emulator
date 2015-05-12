QUnit.module("MMC", {
    setup: function () {
        window.mmc = new JNE.MMC();
    },
    teardown: function () {
        window.mmc = null;
    }
});

QUnit.test("MMC initialises memory", function (assert) {

    assert.equal(mmc.size, 0x10000, 'MMC is configured to initialise 65536 bytes of memory.');

    assert.equal(mmc.memory.length, 0x10000, 'Memory initialised is of size 65536 bytes.');

    assert.equal(mmc.fetch(0), 0, 'Memory at zero offset has zero value.');
    assert.equal(mmc.fetch(0x01), 0, 'Memory at 0x01 offset has zero value.');
    assert.equal(mmc.fetch(0xFF), 0, 'Memory at 0xFF offset has zero value.');
    assert.equal(mmc.fetch(mmc.size - 1), 0, 'Memory at last offset has zero value.');

});

QUnit.test("MMC resets memory to zero byte values", function (assert) {

    mmc.store(0x00, 0x01);
    mmc.store(0x01, 0x01);
    mmc.store(0xFF, 0x01);
    mmc.store(mmc.size - 1, 0x01);

    mmc.reset();

    assert.equal(mmc.memory.length, 0x10000, 'Memory is still of size 65536 bytes after reset.');

    assert.equal(mmc.fetch(0), 0, 'Memory at zero offset has zero value.');
    assert.equal(mmc.fetch(0x01), 0, 'Memory at 0x01 offset has zero value.');
    assert.equal(mmc.fetch(0xFF), 0, 'Memory at 0xFF offset has zero value.');
    assert.equal(mmc.fetch(mmc.size - 1), 0, 'Memory at last offset has zero value.');

});

QUnit.test("MMC stores values in memory", function (assert) {

    function testStore(address, value) {
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

    testStore(mmc.memory.length - 1, 0x01);
    testStore(mmc.memory.length - 1, 0xFF);
    testStore(mmc.memory.length - 1, 0x00);
    testStore(mmc.memory.length - 1, 0x07);

    mmc.store(0x200, 0x1001);
    assert.equal(mmc.memory[0x200], 0x1, 'Values greater than 0xff are ANDed to a single byte');

    assert.throws(
        function () {
            mmc.store(mmc.memory.length, 0x00);
        },
        /Invalid memory address/,
        'Exception is thrown when attempting to write to invalid location in memory (>= size).'
    );

    assert.throws(
        function () {
            mmc.store(-1, 0x00);
        },
        /Invalid memory address/,
        'Exception is thrown when attempting to write to invalid location in memory (-1).'
    );

    assert.throws(
        function () {
            mmc.store(null, 0x00);
        },
        /Invalid memory address/,
        'Exception is thrown when attempting to write to invalid location in memory (null).'
    );

    assert.throws(
        function () {
            mmc.store(undefined, 0x00);
        },
        /Invalid memory address/,
        'Exception is thrown when attempting to write to invalid location in memory (undefined).'
    );

});

QUnit.test("MMC retrieves values from memory", function (assert) {

    function testFetch(address, value) {
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

    testFetch(mmc.memory.length - 1, 0x01);
    testFetch(mmc.memory.length - 1, 0xFF);
    testFetch(mmc.memory.length - 1, 0x00);
    testFetch(mmc.memory.length - 1, 0x01);

    assert.throws(
        function () {
            mmc.fetch(mmc.memory.length);
        },
        /Invalid memory address/,
        'Exception is thrown when attempting to fetch from invalid location in memory (>= size).'
    );

    assert.throws(
        function () {
            mmc.fetch(-1);
        },
        /Invalid memory address/,
        'Exception is thrown when attempting to fetch from invalid location in memory (-1).'
    );

    assert.throws(
        function () {
            mmc.fetch(null);
        },
        /Invalid memory address/,
        'Exception is thrown when attempting to fetch from invalid location in memory (null).'
    );

    assert.throws(
        function () {
            mmc.fetch(undefined);
        },
        /Invalid memory address/,
        'Exception is thrown when attempting to fetch from invalid location in memory (undefined).'
    );

});

QUnit.module("Clock", {
    setup: function () {
        window.clock = new JNE.Clock();
    },
    teardown: function () {
        window.clock = null;
    }
});

QUnit.asyncTest("Clock frequency is within 5% of bare metal", function(assert){

    var testLength = 5; // seconds

    function endClockTest() {

        clock.stop();

        var marginOfError = 0.05;

        var cps = window.cycleCount / testLength;

        assert.ok(cps <= (clock.cpuClockSpeed * (1 + marginOfError)) && cps >= (clock.cpuClockSpeed * (1 - marginOfError)), 'Clock speed falls within acceptable bounds. Result ' + (((cps / clock.cpuClockSpeed) * 100).toFixed(2)) + '% of expected (' + cps + 'Hz)');

        QUnit.start();
    }

    function tick(cycles){
            window.cycleCount += cycles;
    }

    window.cycleCount = 0;

    clock.onTick(tick);

    clock.start();

    setTimeout(endClockTest, (testLength * 1000));
});

QUnit.module("CPU", {
    setup: function () {
        var mmc = new JNE.MMC();
        window.cpu = new JNE.CPU(mmc);
    },
    teardown: function () {
        window.cpu = null;
    }
});

QUnit.test("Initialises registers/flags", function (assert) {

    assert.equal(cpu.registers.A, 0, 'Register A is initialised to 0x00');
    assert.equal(cpu.registers.X, 0, 'Register X is initialised to 0x00');
    assert.equal(cpu.registers.Y, 0, 'Register Y is initialised to 0x00');
    assert.equal(cpu.registers.SP, 0x01FF, 'Register SP is initialised to 0x01FF');
    assert.equal(cpu.registers.PC, 0x07FF, 'Register PC is initialised to 0x07FF');
    assert.equal(cpu.registers.P, 0x36, 'Register P is initialised to 0x36');

    assert.equal(cpu.flags.negative, 0, 'Negative flag is not initially set');
    assert.equal(cpu.flags.carry, 0, 'Carry flag is not initially set');
    assert.equal(cpu.flags.zero, 1, 'Zero flag is initially set');

});

QUnit.test("Reset state", function (assert) {

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
    assert.equal(cpu.registers.P, 0x36, 'Register P is reset to 0x36');

    assert.equal(cpu.flags.negative, 0, 'Negative flag is not initially set');
    assert.equal(cpu.flags.carry, 0, 'Carry flag is not initially set');
    assert.equal(cpu.flags.zero, 1, 'Zero flag is initially set');

});

QUnit.test("Instruction table integrity", function (assert) {

    function decodeInstruction(opcode) {

        // split byte into aaabbbcc
        var aaa = (opcode & 224) >> 5;
        var bbb = (opcode & 28) >> 2;
        var cc = opcode & 3;

        var result = {
            operation: opcode,
            address_mode: -1
        };

        switch (opcode) {

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
                            case 3:
                                result.operation = cpu.opcodes.JMP;
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

    for (var opcode in cpu.instruction_table) {

        opcode = parseInt(opcode, 10);

        var decoded = decodeInstruction(opcode);

        var operation = cpu.instruction_table[opcode][0];
        var address_mode = cpu.instruction_table[opcode][1];

        assert.equal(cpu.instruction_table[opcode].length, 3, 'Instruction 0x' + opcode.toString(16) + ' has wrong number of paramters present in instruction table.');
        assert.equal(cpu.getOpcodeText(operation), cpu.getOpcodeText(decoded.operation), 'Operation matches for 0x' + opcode.toString(16) + ' (' + cpu.getOpcodeText(operation) + ')');
        assert.equal(cpu.getAddressModeText(address_mode), cpu.getAddressModeText(decoded.address_mode), 'Address mode matches for 0x' + opcode.toString(16) + ' (' + cpu.getOpcodeText(operation) + ')');
    }

});


QUnit.test("Memory reads in different address modes", function (assert) {

    cpu.registers.A = 0x9;
    var accumulator = cpu.readMemory(cpu.addressModes.ACCUMULATOR).value;
    assert.equal(accumulator, 0x9, 'ACCUMULATOR address mode reads value');

    cpu.mmc.store(0xf, 0xff);
    cpu.registers.PC = 0xf;
    var imm = cpu.readMemory(cpu.addressModes.IMMEDIATE).value;
    assert.equal(imm, 0xff, 'IMMEDIATE address mode reads value');

    cpu.mmc.store(0x101, 0x3);
    cpu.mmc.store(0x102, 0x9);
    cpu.mmc.store(0x103, 0x8);
    cpu.mmc.store(0x104, 0x7);
    cpu.mmc.store(0x105, 0x6);
    cpu.registers.PC = 0x101;
    var rel = cpu.readMemory(cpu.addressModes.RELATIVE).value;
    assert.equal(rel, 0x6, 'RELATIVE address mode reads value');

    cpu.mmc.store(0x101, 0x3);
    cpu.mmc.store(0x102, 0x9);
    cpu.mmc.store(0x103, 0x82);
    cpu.mmc.store(0x104, 0x7);
    cpu.mmc.store(0x105, 0x6);
    cpu.registers.PC = 0x103;
    rel = cpu.readMemory(cpu.addressModes.RELATIVE).value;
    assert.equal(rel, 0x9, 'RELATIVE address mode reads value when negative offset');

    cpu.mmc.store(0xf, 0x1);
    cpu.registers.PC = 0xf;
    var zpval = cpu.readMemory(cpu.addressModes.ZERO_PAGE).value;
    assert.equal(zpval, 0x1, 'ZERO PAGE address mode reads value');

    cpu.mmc.store(0x6, 0x2);
    cpu.registers.PC = 0x3;
    cpu.registers.X = 0x3;
    var zpxval = cpu.readMemory(cpu.addressModes.ZERO_PAGE_X).value;
    assert.equal(zpxval, 0x2, 'ZERO PAGE X address mode reads value');

    cpu.mmc.store(0xa, 0x3);
    cpu.registers.PC = 0x8;
    cpu.registers.Y = 0x2;
    var zpyval = cpu.readMemory(cpu.addressModes.ZERO_PAGE_Y).value;
    assert.equal(zpyval, 0x3, 'ZERO PAGE Y address mode reads value');

    cpu.mmc.store(0x101, 0xaa);
    cpu.mmc.store(0x102, 0xaa);
    cpu.mmc.store(0xaaaa, 0x1);
    cpu.registers.PC = 0x101;
    var absval = cpu.readMemory(cpu.addressModes.ABSOLUTE).value;
    assert.equal(absval, 0x1, 'ABSOLUTE address mode reads value');

    cpu.mmc.store(0x101, 0x01);
    cpu.mmc.store(0x102, 0xcc);
    cpu.mmc.store(0xcc01, 0x1);
    cpu.registers.PC = 0x101;
    var absleval = cpu.readMemory(cpu.addressModes.ABSOLUTE).value;
    assert.equal(absleval, 0x1, 'ABSOLUTE address mode reads value (little endian)');

    cpu.mmc.store(0x101, 0xcc);
    cpu.mmc.store(0x102, 0x99);
    cpu.mmc.store(0x99cd, 0x1);
    cpu.registers.PC = 0x101;
    cpu.registers.X = 0x1;
    var absxval = cpu.readMemory(cpu.addressModes.ABSOLUTE_X).value;
    assert.equal(absxval, 0x1, 'ABSOLUTE X address mode reads value');

    cpu.mmc.store(0x103, 0x33);
    cpu.mmc.store(0x104, 0xcc);
    cpu.mmc.store(0xcc36, 0x1);
    cpu.registers.PC = 0x103;
    cpu.registers.Y = 0x3;
    var absyval = cpu.readMemory(cpu.addressModes.ABSOLUTE_Y).value;
    assert.equal(absyval, 0x1, 'ABSOLUTE Y address mode reads value');


    cpu.mmc.store(0x101, 0xff);
    cpu.mmc.store(0x102, 0x77);
    cpu.mmc.store(0x77ff, 0x1);
    cpu.registers.PC = 0x101;
    cpu.registers.X = 0x1;
    cpu.memoryCycles = 0;
    cpu.readMemory(cpu.addressModes.ABSOLUTE_X);
    assert.equal(cpu.memoryCycles, 0x1, 'ABSOLUTE X address mode increments memory cycles for multi page');

    cpu.mmc.store(0x101, 0xff);
    cpu.mmc.store(0x102, 0x77);
    cpu.mmc.store(0x77ff, 0x1);
    cpu.registers.PC = 0x101;
    cpu.registers.Y = 0x1;
    cpu.memoryCycles = 0;
    cpu.readMemory(cpu.addressModes.ABSOLUTE_Y);
    assert.equal(cpu.memoryCycles, 0x1, 'ABSOLUTE Y address mode increments memory cycles for multi page');


    cpu.mmc.store(0x00, 0x07);
    cpu.mmc.store(0x10, 0x7);
    cpu.mmc.store(0x11, 0x5);
    cpu.mmc.store(0x507, 0x4);
    cpu.registers.PC = 0x00;
    cpu.registers.X = 0x09;
    var preindex = cpu.readMemory(cpu.addressModes.INDEXED_INDIRECT).value;
    assert.equal(preindex, 0x4, 'INDEXED INDIRECT address mode reads value');

    cpu.mmc.store(0x00, 0x07);
    cpu.mmc.store(0x07, 0x01);
    cpu.mmc.store(0x08, 0x03);
    cpu.mmc.store(0x302, 0x08);
    cpu.registers.PC = 0x00;
    cpu.registers.Y = 0x01;
    var postindex = cpu.readMemory(cpu.addressModes.INDIRECT_INDEXED).value;
    assert.equal(postindex, 0x8, 'INDIRECT INDEXED address mode reads value');

    assert.throws(
        function () {
            cpu.readMemory(0xff);
        },
        /Unsupported addressing mode/,
        'Error thrown on unknown address mode'
    );

    assert.throws(
        function () {
            cpu.readMemory(cpu.addressModes.IMPLICIT);
        },
        /Cannot read memory for an implicit addressing mode operation/,
        'Error thrown on implicit address mode read'
    );


});

QUnit.test("Invalid opcode check", function (assert) {

    cpu.mmc.store(0x200, 0xff);

    cpu.registers.PC = 0x200;

    assert.throws(
        function () {
            cpu.execute();
        },
        /Invalid opcode/,
        'Error thrown on invalid opcode'
    );
});

QUnit.test("Flag functions set/clear flags as required", function (assert) {

    var flags = ['Carry', 'Zero', 'InterruptDisable', 'Decimal', 'Brk', 'Unused', 'Overflow', 'Negative'];

    var expectedClear, camel;

    for (var i in flags) {

        if (!flags.hasOwnProperty(i)) continue;

        var flagValue = Math.pow(2, parseInt(i, 10));

        cpu.reset();

        expectedClear = (cpu.registers.P & flagValue) ? cpu.registers.P - flagValue : cpu.registers.P;

        camel = flags[i].substring(0, 1).toLowerCase() + flags[i].substring(1);

        cpu['set' + flags[i] + 'Flag']();
        assert.equal(cpu.flags[camel], 1, flags[i] + ' flag is set');
        assert.equal(cpu.registers.P & flagValue, flagValue, flags[i] + ' flag is set in the P register');
        assert.equal(cpu.registers.P, flagValue | expectedClear, flags[i] + ' flag is set in the P register without affecting other flags');

        cpu['clear' + flags[i] + 'Flag']();
        assert.equal(cpu.flags[camel], 0, flags[i] + ' flag is cleared');
        assert.equal(cpu.registers.P & flagValue, 0, flags[i] + ' flag is clear in the P register');
        assert.equal(cpu.registers.P, expectedClear, flags[i] + ' flag is clear in the P register without affecting other flags');

    }

});

QUnit.test("Carry flag check", function (assert) {

    cpu.checkCarryFlag(0x101);
    assert.equal(cpu.flags.carry, 1, 'Carry flag is set when value is > 0xff');

    cpu.reset();

    cpu.setCarryFlag();
    cpu.checkCarryFlag(0xff);
    assert.equal(cpu.flags.carry, 0, 'Carry flag is clear when value is <= 0xff');
});

QUnit.test("Negative flag check", function (assert) {

    cpu.checkNegativeFlag(0xff);
    assert.equal(cpu.flags.negative, 1, 'Negative flag is set when value is 0xff (-1)');

    cpu.reset();

    cpu.setNegativeFlag();
    cpu.checkNegativeFlag(0x01);
    assert.equal(cpu.flags.negative, 0, 'Negative flag is clear when value is 0x01');
});

QUnit.test("Zero flag check", function (assert) {

    cpu.checkZeroFlag(0x00);
    assert.equal(cpu.flags.zero, 1, 'Zero flag is set when value is 0x0');

    cpu.reset();

    cpu.setZeroFlag();
    cpu.checkZeroFlag(0x01);
    assert.equal(cpu.flags.zero, 0, 'Zero flag is clear when value is 0x01');
});

QUnit.test("Overflow flag check", function (assert) {

    cpu.checkOverflowFlag(0x50, 0x50, 0xa0, true);
    assert.equal(cpu.flags.overflow, 1, 'Overflow flag is set when 0x50 + 0x50');

    cpu.reset();

    cpu.setOverflowFlag();
    cpu.checkOverflowFlag(0x01, 0x01, 0x02, true);
    assert.equal(cpu.flags.overflow, 0, 'Overflow flag is clear when 0x01 + 0x01');
});

QUnit.test("Stack operations", function (assert) {

    cpu.push(0x01);
    assert.equal(cpu.mmc.fetch(0x1ff), 0x01, 'First stack push writes to 0x1ff');

    cpu.push(0x02);
    assert.equal(cpu.mmc.fetch(0x1fe), 0x02, 'Stack pointer decrements on push so second push writes to 0x1fe');

    cpu.registers.SP = 0x100;
    cpu.push(0x03);
    cpu.push(0x04);
    assert.equal(cpu.mmc.fetch(0x1ff), 0x04, 'Stack overflow results in wrap around so decrementing from 0x100 results in next value being pushed to 0x1ff');


    cpu.reset();

    cpu.push(0x01);
    assert.equal(cpu.pop(), 0x01, 'Value pushed to stack can be popped back off');

    cpu.push(0x01);
    cpu.push(0x02);
    cpu.push(0x03);
    cpu.mmc.store(0x100, 0x0);
    assert.equal(cpu.pop(), 0x03, 'Values pushed to stack are popped back off in FILO order');
    assert.equal(cpu.pop(), 0x02, 'Values pushed to stack are popped back off in FILO order');
    assert.equal(cpu.pop(), 0x01, 'Values pushed to stack are popped back off in FILO order');

    assert.equal(cpu.pop(), 0x00, 'Stack underflow results in wrap around so 0x100 is read after 0x1ff');
    assert.equal(cpu.registers.SP, 0x100, 'Stack underflow results in wrap around so 0x100 is read after 0x1ff');


    cpu.reset();
    cpu.push(0x7);
    cpu.push(0x8);
    cpu.push(0x9);
    var pre_peek_sp = cpu.registers.SP;
    assert.equal(cpu.peek(), 0x9, 'Stack peek returns most recently pushed value');
    assert.equal(cpu.registers.SP, pre_peek_sp, 'Stack peek does not modify stack pointer register');

});

QUnit.test("ADC #", function (assert) {

    cpu.registers.A = 0x80;

    cpu.mmc.store(0x200, 0x69); // ADC
    cpu.mmc.store(0x201, 0x01); // #3

    cpu.registers.PC = 0x200;

    var cycles = cpu.execute();

    assert.equal(cycles, 2, 'ADC # takes 2 cycles');
    assert.equal(cpu.registers.A, 0x81, '"A" register has value 0x81 stored');
    assert.equal(cpu.registers.PC, 0x202, 'Program counter is incremented twice for ADC #');
    assert.equal(cpu.flags.negative, 0x1, 'Negative flag is set');
    assert.equal(cpu.flags.overflow, 0x0, 'Overflow flag is not set');

    cpu.reset();

    // test carry bit is added

    cpu.registers.A = 0x02;

    cpu.mmc.store(0x200, 0x69); // ADC
    cpu.mmc.store(0x201, 0x01); // #$1

    cpu.registers.PC = 0x200;

    cpu.flags.carry = 1;

    cycles = cpu.execute();

    assert.equal(cycles, 2, 'ADC # takes 2 cycles');
    assert.equal(cpu.registers.A, 0x04, '"A" register has value 0x04 stored');
    assert.equal(cpu.registers.PC, 0x202, 'Program counter is incremented twice for ADC #');
    assert.equal(cpu.flags.negative, 0x0, 'Negative flag is not set');
    assert.equal(cpu.flags.overflow, 0x0, 'Overflow flag is not set');


    cpu.reset();

    // test multi-byte addition

    cpu.registers.A = 0x02;
    cpu.registers.PC = 0x200;
    cpu.flags.carry = 0;

    cpu.mmc.store(0x200, 0x69); // ADC
    cpu.mmc.store(0x201, 0xff); // #$ff
    cpu.mmc.store(0x202, 0x69); // ADC
    cpu.mmc.store(0x203, 0x00); // #$0

    cycles = cpu.execute();

    assert.equal(cycles, 2, 'ADC # call takes 2 cycles');
    assert.equal(cpu.registers.A, 0x01, '"A" register has value 0x01 stored');
    assert.equal(cpu.flags.carry, 0x1, 'Carry flag is set when adding 0xff + 0x1');
    assert.equal(cpu.registers.PC, 0x202, 'Program counter is incremented twice for ADC #');
    assert.equal(cpu.flags.negative, 0x0, 'Negative flag is not set');
    assert.equal(cpu.flags.overflow, 0x0, 'Overflow flag is not set');

    cycles = cpu.execute();

    assert.equal(cycles, 2, 'Additional ADC # call takes 2 further cycles');
    assert.equal(cpu.registers.A, 0x02, '"A" register has value 0x02 stored');
    assert.equal(cpu.flags.carry, 0x0, 'Carry flag is set when adding 0xff + 0x1');
    assert.equal(cpu.registers.PC, 0x204, 'Program counter is incremented twice further for additonal ADC #');
    assert.equal(cpu.flags.negative, 0x0, 'Negative flag is not set');
    assert.equal(cpu.flags.overflow, 0x0, 'Overflow flag is not set');

    cpu.reset();

    // test overflow flag

    cpu.registers.A = 0x50;
    cpu.registers.PC = 0x200;

    cpu.mmc.store(0x200, 0x69); // ADC
    cpu.mmc.store(0x201, 0x50); // #$ff

    cycles = cpu.execute();

    assert.equal(cycles, 2, 'ADC # call takes 2 cycles');
    assert.equal(cpu.flags.overflow, 0x1, 'Overflow flag is set');
    assert.equal(cpu.registers.A, 0xa0, '0x50 ADC 0x50 = 0xa0');
    assert.equal(cpu.flags.zero, 0x0, 'Zero flag is clear');

    // test zero flag

    cpu.reset();

    cpu.registers.A = 0x00;
    cpu.registers.PC = 0x200;

    cpu.mmc.store(0x200, 0x69); // ADC
    cpu.mmc.store(0x201, 0x00); // #$2

    cycles = cpu.execute();

    assert.equal(cycles, 2, 'ADC # call takes 2 cycles');
    assert.equal(cpu.flags.zero, 0x1, 'Zero flag is set');
    assert.equal(cpu.registers.A, 0x0, 'A is set to zero');

});

QUnit.test("AND #", function (assert) {

    cpu.registers.A = 0x02;

    cpu.mmc.store(0x200, 0x29); // AND
    cpu.mmc.store(0x201, 0x01); // #$1

    cpu.registers.PC = 0x200;

    var cycles = cpu.execute();

    assert.equal(cycles, 2, 'AND # takes 2 cycles');
    assert.equal(cpu.registers.A, 0x00, '"A" register has value 0x00 stored');
    assert.equal(cpu.registers.PC, 0x202, 'Program counter is incremented twice for AND #');
    assert.equal(cpu.flags.negative, 0x0, 'Negative flag is not set');
    assert.equal(cpu.flags.zero, 0x1, 'Zero flag is set');

    cpu.reset();

    cpu.registers.A = 0xff;

    cpu.mmc.store(0x200, 0x29); // AND
    cpu.mmc.store(0x201, 0x80); // #$80

    cpu.registers.PC = 0x200;

    cycles = cpu.execute();

    assert.equal(cycles, 2, 'AND # takes 2 cycles');
    assert.equal(cpu.registers.A, 0x80, '"A" register has value 0x80 stored');
    assert.equal(cpu.registers.PC, 0x202, 'Program counter is incremented twice for AND #');
    assert.equal(cpu.flags.negative, 0x1, 'Negative flag is set');
    assert.equal(cpu.flags.zero, 0x0, 'Zero flag is not set');


});


QUnit.test("ASL", function (assert) {

    cpu.registers.A = 0xc;

    cpu.mmc.store(0x200, 0x0A); // ASL A

    cpu.registers.PC = 0x200;

    var cycles = cpu.execute();

    assert.equal(cycles, 2, 'ASL A takes 2 cycles');
    assert.equal(cpu.registers.A, 0x18, '"A" register has value 0x18 stored');
    assert.equal(cpu.registers.PC, 0x201, 'Program counter is incremented once for ASL A');
    assert.equal(cpu.flags.negative, 0x0, 'Negative flag is not set');
    assert.equal(cpu.flags.zero, 0x0, 'Zero flag is not set');
    assert.equal(cpu.flags.carry, 0x0, 'Carry flag is not set');


    cpu.reset();

    cpu.mmc.store(0x200, 0x0E); // ASL a
    cpu.mmc.store(0x201, 0x03);
    cpu.mmc.store(0x202, 0x02);
    cpu.mmc.store(0x203, 0x07);

    cpu.registers.PC = 0x200;

    cycles = cpu.execute();

    assert.equal(cycles, 6, 'ASL a takes 6 cycles');
    assert.equal(cpu.mmc.fetch(0x203), 0xE, 'Memory at 0x203 has value 0xE stored');
    assert.equal(cpu.registers.PC, 0x203, 'Program counter is incremented 3 times for ASL a');
    assert.equal(cpu.flags.negative, 0x0, 'Negative flag is not set');
    assert.equal(cpu.flags.zero, 0x1, 'Zero flag is set');
    assert.equal(cpu.flags.carry, 0x0, 'Carry flag is not set');

    cpu.reset();

    cpu.mmc.store(0x200, 0x0A); // ASL A

    cpu.registers.PC = 0x200;

    cpu.registers.A = 0x40;

    cycles = cpu.execute();

    assert.equal(cycles, 2, 'ASL A takes 2 cycles');
    assert.equal(cpu.registers.A, 0x80, '"A" register has value 0x80 stored');
    assert.equal(cpu.registers.PC, 0x201, 'Program counter is incremented once for ASL A');
    assert.equal(cpu.flags.negative, 0x1, 'Negative flag is set');
    assert.equal(cpu.flags.zero, 0x0, 'Zero flag is not set');
    assert.equal(cpu.flags.carry, 0x0, 'Carry flag is not set');

    cpu.reset();

    cpu.mmc.store(0x200, 0x0A); // ASL A

    cpu.registers.PC = 0x200;

    cpu.registers.A = 0x80;

    cycles = cpu.execute();

    assert.equal(cycles, 2, 'ASL A takes 2 cycles');
    assert.equal(cpu.registers.A, 0x0, '"A" register has value 0x80 stored');
    assert.equal(cpu.registers.PC, 0x201, 'Program counter is incremented once for ASL A');
    assert.equal(cpu.flags.negative, 0x0, 'Negative flag is not set');
    assert.equal(cpu.flags.zero, 0x1, 'Zero flag is set');
    assert.equal(cpu.flags.carry, 0x1, 'Carry flag is set');


});

QUnit.test("BCC r", function (assert) {

    cpu.flags.carry = 1;

    cpu.mmc.store(0x200, 0x90); // BCC +2
    cpu.mmc.store(0x201, 0x01);
    cpu.mmc.store(0x202, 0x02);
    cpu.mmc.store(0x203, 0x03);

    cpu.registers.PC = 0x200;

    var cycles = cpu.execute();

    assert.equal(cycles, 2, 'Unsuccessful BCC r takes 2 cycles');
    assert.equal(cpu.registers.PC, 0x201, 'Branch does not jump if carry not clear');

    cpu.reset();

    cpu.mmc.store(0x2fe, 0x90); // BCC +2
    cpu.mmc.store(0x2ff, 0x01);
    cpu.mmc.store(0x300, 0x02);
    cpu.mmc.store(0x301, 0x01);
    cpu.mmc.store(0x302, 0x04);

    cpu.registers.PC = 0x2fe;

    cycles = cpu.execute();

    assert.equal(cycles, 4, 'Successful BCC r takes 4 cycles with new page');
    assert.equal(cpu.registers.PC, 0x301, 'Branch does jump if carry not set and multi page');

    cpu.reset();

    cpu.mmc.store(0x200, 0x90); // BCC +2
    cpu.mmc.store(0x201, 0x01);
    cpu.mmc.store(0x202, 0x02);
    cpu.mmc.store(0x203, 0x01);
    cpu.mmc.store(0x204, 0x07);

    cpu.registers.PC = 0x200;

    cycles = cpu.execute();

    assert.equal(cycles, 3, 'Successful BCC r takes 3 cycles');
    assert.equal(cpu.registers.PC, 0x203, 'Branch jumps if carry is clear');
});

QUnit.test("BCS r", function (assert) {

    cpu.mmc.store(0x200, 0xB0); // BCS +2
    cpu.mmc.store(0x201, 0x01);
    cpu.mmc.store(0x202, 0x02);
    cpu.mmc.store(0x203, 0x03);

    cpu.registers.PC = 0x200;

    var cycles = cpu.execute();

    assert.equal(cycles, 2, 'Unsuccessful BCC r takes 2 cycles');
    assert.equal(cpu.registers.PC, 0x201, 'Branch does not jump if carry clear');

    cpu.reset();

    cpu.flags.carry = 1;

    cpu.mmc.store(0x2fe, 0xB0); // BCS +2
    cpu.mmc.store(0x2ff, 0x01);
    cpu.mmc.store(0x300, 0x02);
    cpu.mmc.store(0x301, 0x01);
    cpu.mmc.store(0x302, 0x04);

    cpu.registers.PC = 0x2fe;

    cycles = cpu.execute();

    assert.equal(cycles, 4, 'Successful BCS r takes 4 cycles with new page');
    assert.equal(cpu.registers.PC, 0x301, 'Branch does jump if carry set and multi page');

    cpu.reset();

    cpu.flags.carry = 1;

    cpu.mmc.store(0x200, 0xB0); // BCS +2
    cpu.mmc.store(0x201, 0x01);
    cpu.mmc.store(0x202, 0x02);
    cpu.mmc.store(0x203, 0x01);
    cpu.mmc.store(0x204, 0x07);

    cpu.registers.PC = 0x200;

    cycles = cpu.execute();

    assert.equal(cycles, 3, 'Successful BCS r takes 3 cycles');
    assert.equal(cpu.registers.PC, 0x203, 'Branch jumps if carry is set');
});

QUnit.test("BEQ r", function (assert) {

    cpu.flags.zero = 0;

    cpu.mmc.store(0x200, 0xF0); // BEQ +2
    cpu.mmc.store(0x201, 0x01);
    cpu.mmc.store(0x202, 0x02);
    cpu.mmc.store(0x203, 0x03);

    cpu.registers.PC = 0x200;

    var cycles = cpu.execute();

    assert.equal(cycles, 2, 'Unsuccessful BEQ r takes 2 cycles');
    assert.equal(cpu.registers.PC, 0x201, 'Branch does not jump if zero clear');

    cpu.reset();

    cpu.flags.zero = 1;

    cpu.mmc.store(0x2fe, 0xF0); // BEQ +2
    cpu.mmc.store(0x2ff, 0x01);
    cpu.mmc.store(0x300, 0x02);
    cpu.mmc.store(0x301, 0x01);
    cpu.mmc.store(0x302, 0x04);

    cpu.registers.PC = 0x2fe;

    cycles = cpu.execute();

    assert.equal(cycles, 4, 'Successful BEQ r takes 4 cycles with new page');
    assert.equal(cpu.registers.PC, 0x301, 'Branch does jump if zero set and multi page');

    cpu.reset();

    cpu.flags.zero = 1;

    cpu.mmc.store(0x200, 0xF0); // BEQ +2
    cpu.mmc.store(0x201, 0x01);
    cpu.mmc.store(0x202, 0x02);
    cpu.mmc.store(0x203, 0x01);
    cpu.mmc.store(0x204, 0x07);

    cpu.registers.PC = 0x200;

    cycles = cpu.execute();

    assert.equal(cycles, 3, 'Successful BEQ r takes 3 cycles');
    assert.equal(cpu.registers.PC, 0x203, 'Branch jumps if zero is set');
});

QUnit.test("BIT a", function (assert) {

    cpu.mmc.store(0x200, 0x2C); // BIT a
    cpu.mmc.store(0x201, 0x03);
    cpu.mmc.store(0x202, 0x02);
    cpu.mmc.store(0x203, 0xff);

    cpu.registers.PC = 0x200;
    cpu.registers.A = 0xff;

    var cycles = cpu.execute();

    assert.equal(cycles, 4, 'BIT a takes 4 cycles');
    assert.equal(cpu.flags.zero, 0, 'Zero flag is not set when BIT test run on 0xFF & 0xFF');
    assert.equal(cpu.flags.negative, 1, 'Negative flag is set when memory location contains 0xFF');
    assert.equal(cpu.flags.overflow, 1, 'Overflow flag is set when memory location contains 0xFF');

    cpu.reset();

    cpu.mmc.store(0x200, 0x2C); // BIT a
    cpu.mmc.store(0x201, 0x03);
    cpu.mmc.store(0x202, 0x02);
    cpu.mmc.store(0x203, 0x00);

    cpu.registers.PC = 0x200;
    cpu.registers.A = 0xff;

    cycles = cpu.execute();

    assert.equal(cycles, 4, 'BIT a takes 4 cycles');
    assert.equal(cpu.flags.zero, 1, 'Zero flag is set when BIT test run on 0x00 & 0xFF');
    assert.equal(cpu.flags.negative, 0, 'Negative flag is not set when memory location contains 0x00');
    assert.equal(cpu.flags.overflow, 0, 'Overflow flag is not set when memory location contains 0x00');

});

QUnit.test("BMI r", function (assert) {

    cpu.mmc.store(0x200, 0x30); // BMI +2
    cpu.mmc.store(0x201, 0x01);
    cpu.mmc.store(0x202, 0x02);
    cpu.mmc.store(0x203, 0x03);

    cpu.registers.PC = 0x200;

    var cycles = cpu.execute();

    assert.equal(cycles, 2, 'Unsuccessful BMI r takes 2 cycles');
    assert.equal(cpu.registers.PC, 0x201, 'Branch does not jump if negative clear');

    cpu.reset();

    cpu.flags.negative = 1;

    cpu.mmc.store(0x2fe, 0x30); // BMI +2
    cpu.mmc.store(0x2ff, 0x01);
    cpu.mmc.store(0x300, 0x02);
    cpu.mmc.store(0x301, 0x01);
    cpu.mmc.store(0x302, 0x04);

    cpu.registers.PC = 0x2fe;

    cycles = cpu.execute();

    assert.equal(cycles, 4, 'Successful BMI r takes 4 cycles with new page');
    assert.equal(cpu.registers.PC, 0x301, 'Branch does jump if negative set and multi page');

    cpu.reset();

    cpu.flags.negative = 1;

    cpu.mmc.store(0x200, 0x30); // BMI +2
    cpu.mmc.store(0x201, 0x01);
    cpu.mmc.store(0x202, 0x02);
    cpu.mmc.store(0x203, 0x01);
    cpu.mmc.store(0x204, 0x07);

    cpu.registers.PC = 0x200;

    cycles = cpu.execute();

    assert.equal(cycles, 3, 'Successful BMI r takes 3 cycles');
    assert.equal(cpu.registers.PC, 0x203, 'Branch jumps if negative is set');
});

QUnit.test("BNE r", function (assert) {

    cpu.flags.zero = 1;

    cpu.mmc.store(0x200, 0xD0); // BNE +2
    cpu.mmc.store(0x201, 0x01);
    cpu.mmc.store(0x202, 0x02);
    cpu.mmc.store(0x203, 0x03);

    cpu.registers.PC = 0x200;

    var cycles = cpu.execute();

    assert.equal(cycles, 2, 'Unsuccessful BNE r takes 2 cycles');
    assert.equal(cpu.registers.PC, 0x201, 'Branch does not jump if zero set');

    cpu.reset();

    cpu.flags.zero = 0;

    cpu.mmc.store(0x2fe, 0xD0); // BNE +2
    cpu.mmc.store(0x2ff, 0x01);
    cpu.mmc.store(0x300, 0x02);
    cpu.mmc.store(0x301, 0x01);
    cpu.mmc.store(0x302, 0x04);

    cpu.registers.PC = 0x2fe;

    cycles = cpu.execute();

    assert.equal(cycles, 4, 'Successful BNE r takes 4 cycles with new page');
    assert.equal(cpu.registers.PC, 0x301, 'Branch does jump if zero not set and multi page');

    cpu.reset();

    cpu.flags.zero = 0;

    cpu.mmc.store(0x200, 0xD0); // BNE +2
    cpu.mmc.store(0x201, 0x01);
    cpu.mmc.store(0x202, 0x02);
    cpu.mmc.store(0x203, 0x01);
    cpu.mmc.store(0x204, 0x07);

    cpu.registers.PC = 0x200;

    cycles = cpu.execute();

    assert.equal(cycles, 3, 'Successful BNE r takes 3 cycles');
    assert.equal(cpu.registers.PC, 0x203, 'Branch jumps if zero is clear');
});

QUnit.test("BPL r", function (assert) {

    cpu.flags.negative = 1;

    cpu.mmc.store(0x200, 0x10); // BPL +2
    cpu.mmc.store(0x201, 0x01);
    cpu.mmc.store(0x202, 0x02);
    cpu.mmc.store(0x203, 0x03);

    cpu.registers.PC = 0x200;

    var cycles = cpu.execute();

    assert.equal(cycles, 2, 'Unsuccessful BPL r takes 2 cycles');
    assert.equal(cpu.registers.PC, 0x201, 'Branch does not jump if negative set');

    cpu.reset();

    cpu.flags.negative = 0;

    cpu.mmc.store(0x2fe, 0x10); // BPL +2
    cpu.mmc.store(0x2ff, 0x01);
    cpu.mmc.store(0x300, 0x02);
    cpu.mmc.store(0x301, 0x01);
    cpu.mmc.store(0x302, 0x04);

    cpu.registers.PC = 0x2fe;

    cycles = cpu.execute();

    assert.equal(cycles, 4, 'Successful BPL r takes 4 cycles with new page');
    assert.equal(cpu.registers.PC, 0x301, 'Branch does jump if negative clear and multi page');

    cpu.reset();

    cpu.flags.negative = 0;

    cpu.mmc.store(0x200, 0x10); // BPL +2
    cpu.mmc.store(0x201, 0x01);
    cpu.mmc.store(0x202, 0x02);
    cpu.mmc.store(0x203, 0x01);
    cpu.mmc.store(0x204, 0x07);

    cpu.registers.PC = 0x200;

    cycles = cpu.execute();

    assert.equal(cycles, 3, 'Successful BPL r takes 3 cycles');
    assert.equal(cpu.registers.PC, 0x203, 'Branch jumps if negative is clear');
});

QUnit.test("BRK", function (assert) {

    cpu.flags.negative = 1;

    cpu.mmc.store(0x200, 0x00); // BRK
    cpu.mmc.store(0xFFFE, 0x02);
    cpu.mmc.store(0xFFFF, 0x01);

    cpu.registers.PC = 0x200;

    var initialP = cpu.registers.P;

    var initialPC = cpu.registers.PC + 2;

    var cycles = cpu.execute();

    assert.equal(cycles, 7, 'BRK takes 7 cycles');
    assert.equal(cpu.flags.brk, 1, 'BRK flag is set');
    assert.equal(cpu.pop(), initialP, 'P was pushed to stack');
    assert.equal(cpu.pop(), (initialPC & 0xff), 'PC[low] was pushed to stack');
    assert.equal(cpu.pop(), ((initialPC >> 8) & 0xff), 'PC[high] was pushed to stack');
    assert.equal(cpu.registers.PC, 0x102, 'PC was set from 0xFFFE-0xFFFF to 0x102');

});


QUnit.test("BVC r", function (assert) {

    cpu.flags.overflow = 1;

    cpu.mmc.store(0x200, 0x50); // BCC +2
    cpu.mmc.store(0x201, 0x01);
    cpu.mmc.store(0x202, 0x02);
    cpu.mmc.store(0x203, 0x03);

    cpu.registers.PC = 0x200;

    var cycles = cpu.execute();

    assert.equal(cycles, 2, 'Unsuccessful BVC r takes 2 cycles');
    assert.equal(cpu.registers.PC, 0x201, 'Branch does not jump if overflow not clear');

    cpu.reset();

    cpu.mmc.store(0x2fe, 0x50); // BCC +2
    cpu.mmc.store(0x2ff, 0x01);
    cpu.mmc.store(0x300, 0x02);
    cpu.mmc.store(0x301, 0x01);
    cpu.mmc.store(0x302, 0x04);

    cpu.registers.PC = 0x2fe;

    cycles = cpu.execute();

    assert.equal(cycles, 4, 'Successful BVC r takes 4 cycles with new page');
    assert.equal(cpu.registers.PC, 0x301, 'Branch does jump if overflow not set and multi page');

    cpu.reset();

    cpu.mmc.store(0x200, 0x50); // BCC +2
    cpu.mmc.store(0x201, 0x01);
    cpu.mmc.store(0x202, 0x02);
    cpu.mmc.store(0x203, 0x01);
    cpu.mmc.store(0x204, 0x07);

    cpu.registers.PC = 0x200;

    cycles = cpu.execute();

    assert.equal(cycles, 3, 'Successful BVC r takes 3 cycles');
    assert.equal(cpu.registers.PC, 0x203, 'Branch jumps if overflow is clear');
});

QUnit.test("BVS r", function (assert) {

    cpu.mmc.store(0x200, 0x70); // BCS +2
    cpu.mmc.store(0x201, 0x01);
    cpu.mmc.store(0x202, 0x02);
    cpu.mmc.store(0x203, 0x03);

    cpu.registers.PC = 0x200;

    var cycles = cpu.execute();

    assert.equal(cycles, 2, 'Unsuccessful BVS r takes 2 cycles');
    assert.equal(cpu.registers.PC, 0x201, 'Branch does not jump if overflow clear');

    cpu.reset();

    cpu.flags.overflow = 1;

    cpu.mmc.store(0x2fe, 0x70); // BCS +2
    cpu.mmc.store(0x2ff, 0x01);
    cpu.mmc.store(0x300, 0x02);
    cpu.mmc.store(0x301, 0x01);
    cpu.mmc.store(0x302, 0x04);

    cpu.registers.PC = 0x2fe;

    cycles = cpu.execute();

    assert.equal(cycles, 4, 'Successful BVS r takes 4 cycles with new page');
    assert.equal(cpu.registers.PC, 0x301, 'Branch does jump if overflow set and multi page');

    cpu.reset();

    cpu.flags.overflow = 1;

    cpu.mmc.store(0x200, 0x70); // BCS +2
    cpu.mmc.store(0x201, 0x01);
    cpu.mmc.store(0x202, 0x02);
    cpu.mmc.store(0x203, 0x01);
    cpu.mmc.store(0x204, 0x07);

    cpu.registers.PC = 0x200;

    cycles = cpu.execute();

    assert.equal(cycles, 3, 'Successful BVS r takes 3 cycles');
    assert.equal(cpu.registers.PC, 0x203, 'Branch jumps if overflow is set');
});

QUnit.test("CLC", function (assert) {

    cpu.setCarryFlag();

    cpu.mmc.store(0x200, 0x18); // CLC +2

    cpu.registers.PC = 0x200;

    var cycles = cpu.execute();

    assert.equal(cycles, 2, 'CLC takes 2 cycles');
    assert.equal(cpu.flags.carry, 0x0, 'Set carry flag is cleared on CLC');

    cpu.reset();

    cpu.clearCarryFlag();

    cpu.mmc.store(0x200, 0x18); // CLC +2

    cpu.registers.PC = 0x200;

    cycles = cpu.execute();

    assert.equal(cycles, 2, 'CLC takes 2 cycles when already clear');
    assert.equal(cpu.flags.carry, 0x0, 'Carry flag stays cleared on CLC');

});

QUnit.test("CLD", function (assert) {

    cpu.setDecimalFlag();

    cpu.mmc.store(0x200, 0xD8); // CLD +2

    cpu.registers.PC = 0x200;

    var cycles = cpu.execute();

    assert.equal(cycles, 2, 'CLD takes 2 cycles');
    assert.equal(cpu.flags.decimal, 0x0, 'Set decimal flag is cleared on CLD');

    cpu.reset();

    cpu.clearDecimalFlag();

    cpu.mmc.store(0x200, 0xD8); // CLC +2

    cpu.registers.PC = 0x200;

    cycles = cpu.execute();

    assert.equal(cycles, 2, 'CLD takes 2 cycles when already clear');
    assert.equal(cpu.flags.decimal, 0x0, 'Decimal flag stays cleared on CLD');

});

QUnit.test("CLI", function (assert) {

    cpu.setInterruptDisableFlag();

    cpu.mmc.store(0x200, 0x58); // CLI +2

    cpu.registers.PC = 0x200;

    var cycles = cpu.execute();

    assert.equal(cycles, 2, 'CLI takes 2 cycles');
    assert.equal(cpu.flags.interruptDisable, 0x0, 'Set interrupt disable flag is cleared on CLI');

    cpu.reset();

    cpu.clearInterruptDisableFlag();

    cpu.mmc.store(0x200, 0x58); // CLI +2

    cpu.registers.PC = 0x200;

    cycles = cpu.execute();

    assert.equal(cycles, 2, 'CLI takes 2 cycles when already clear');
    assert.equal(cpu.flags.interruptDisable, 0x0, 'Interrupt disable flag stays cleared on CLI');

});

QUnit.test("CLV", function (assert) {

    cpu.setOverflowFlag();

    cpu.mmc.store(0x200, 0xB8); // CLV +2

    cpu.registers.PC = 0x200;

    var cycles = cpu.execute();

    assert.equal(cycles, 2, 'CLV takes 2 cycles');
    assert.equal(cpu.flags.overflow, 0x0, 'Set decimal flag is cleared on CLV');

    cpu.reset();

    cpu.clearOverflowFlag();

    cpu.mmc.store(0x200, 0xB8); // CLV +2

    cpu.registers.PC = 0x200;

    cycles = cpu.execute();

    assert.equal(cycles, 2, 'CLV takes 2 cycles when already clear');
    assert.equal(cpu.flags.overflow, 0x0, 'Overflow flag stays cleared on CLV');

});

QUnit.test("CMP #", function (assert) {

    cpu.mmc.store(0x200, 0xC9); // CMP $C9
    cpu.mmc.store(0x201, 0x7);

    cpu.registers.A = 0x7;
    cpu.registers.PC = 0x200;

    var cycles = cpu.execute();

    assert.equal(cycles, 2, 'CMP # takes 2 cycles');
    assert.equal(cpu.flags.zero, 0x1, 'Zero flag is set when A==M on CMP');
    assert.equal(cpu.flags.carry, 0x1, 'Carry flag is set when A==M on CMP');
    assert.equal(cpu.flags.negative, 0x0, 'Negative flag is clear when A==M on CMP');

    cpu.reset();

    cpu.mmc.store(0x200, 0xC9); // CMP $C9
    cpu.mmc.store(0x201, 0x8);

    cpu.registers.A = 0x7;
    cpu.registers.PC = 0x200;

    cycles = cpu.execute();

    assert.equal(cycles, 2, 'CMP # takes 2 cycles');
    assert.equal(cpu.flags.zero, 0x0, 'Zero flag is clear when A<M on CMP');
    assert.equal(cpu.flags.carry, 0x0, 'Carry flag is clear when A<M on CMP');
    assert.equal(cpu.flags.negative, 0x1, 'Negative flag is set when A<M on CMP');

    cpu.reset();

    cpu.mmc.store(0x200, 0xC9); // CMP $C9
    cpu.mmc.store(0x201, 0x8);

    cpu.registers.A = 0x9;
    cpu.registers.PC = 0x200;

    cycles = cpu.execute();

    assert.equal(cycles, 2, 'CMP # takes 2 cycles');
    assert.equal(cpu.flags.zero, 0x0, 'Zero flag is clear when A>M on CMP');
    assert.equal(cpu.flags.carry, 0x1, 'Carry flag is set when A>M on CMP');
    assert.equal(cpu.flags.negative, 0x0, 'Negative flag is clear when A>M on CMP');


});

QUnit.test("CPX #", function (assert) {

    cpu.mmc.store(0x200, 0xE0); // CPX
    cpu.mmc.store(0x201, 0x7);

    cpu.registers.X = 0x7;
    cpu.registers.PC = 0x200;

    var cycles = cpu.execute();

    assert.equal(cycles, 2, 'CPX # takes 2 cycles');
    assert.equal(cpu.flags.zero, 0x1, 'Zero flag is set when X==M on CPX');
    assert.equal(cpu.flags.carry, 0x1, 'Carry flag is set when X==M on CPX');
    assert.equal(cpu.flags.negative, 0x0, 'Negative flag is clear when X==M on CPX');

    cpu.reset();

    cpu.mmc.store(0x200, 0xE0); // CPX
    cpu.mmc.store(0x201, 0x8);

    cpu.registers.X = 0x7;
    cpu.registers.PC = 0x200;

    cycles = cpu.execute();

    assert.equal(cycles, 2, 'CPX # takes 2 cycles');
    assert.equal(cpu.flags.zero, 0x0, 'Zero flag is clear when X<M on CPX');
    assert.equal(cpu.flags.carry, 0x0, 'Carry flag is clear when X<M on CPX');
    assert.equal(cpu.flags.negative, 0x1, 'Negative flag is set when X<M on CPX');

    cpu.reset();

    cpu.mmc.store(0x200, 0xE0); // CPX
    cpu.mmc.store(0x201, 0x8);

    cpu.registers.X = 0x9;
    cpu.registers.PC = 0x200;

    cycles = cpu.execute();

    assert.equal(cycles, 2, 'CPX # takes 2 cycles');
    assert.equal(cpu.flags.zero, 0x0, 'Zero flag is clear when X>M on CPX');
    assert.equal(cpu.flags.carry, 0x1, 'Carry flag is set when X>M on CPX');
    assert.equal(cpu.flags.negative, 0x0, 'Negative flag is clear when X>M on CPX');


});

QUnit.test("CPY #", function (assert) {

    cpu.mmc.store(0x200, 0xC0); // CPY
    cpu.mmc.store(0x201, 0x7);

    cpu.registers.Y = 0x7;
    cpu.registers.PC = 0x200;

    var cycles = cpu.execute();

    assert.equal(cycles, 2, 'CPY # takes 2 cycles');
    assert.equal(cpu.flags.zero, 0x1, 'Zero flag is set when Y==M on CPY');
    assert.equal(cpu.flags.carry, 0x1, 'Carry flag is set when Y==M on CPY');
    assert.equal(cpu.flags.negative, 0x0, 'Negative flag is clear when Y==M on CPY');

    cpu.reset();

    cpu.mmc.store(0x200, 0xC0); // CPY
    cpu.mmc.store(0x201, 0x8);

    cpu.registers.Y = 0x7;
    cpu.registers.PC = 0x200;

    cycles = cpu.execute();

    assert.equal(cycles, 2, 'CPY # takes 2 cycles');
    assert.equal(cpu.flags.zero, 0x0, 'Zero flag is clear when Y<M on CPY');
    assert.equal(cpu.flags.carry, 0x0, 'Carry flag is clear when Y<M on CPY');
    assert.equal(cpu.flags.negative, 0x1, 'Negative flag is set when Y<M on CPY');

    cpu.reset();

    cpu.mmc.store(0x200, 0xC0); // CPY
    cpu.mmc.store(0x201, 0x8);

    cpu.registers.Y = 0x9;
    cpu.registers.PC = 0x200;

    cycles = cpu.execute();

    assert.equal(cycles, 2, 'CPY # takes 2 cycles');
    assert.equal(cpu.flags.zero, 0x0, 'Zero flag is clear when Y>M on CPY');
    assert.equal(cpu.flags.carry, 0x1, 'Carry flag is set when Y>M on CPY');
    assert.equal(cpu.flags.negative, 0x0, 'Negative flag is clear when Y>M on CPY');

});

QUnit.test("DEC a", function (assert) {

    cpu.mmc.store(0x200, 0xCE); // DEC a
    cpu.mmc.store(0x201, 0x03);
    cpu.mmc.store(0x202, 0x02);
    cpu.mmc.store(0x203, 0x09);

    cpu.registers.PC = 0x200;

    var cycles = cpu.execute();

    assert.equal(cycles, 6, 'DEC a takes 6 cycles');
    assert.equal(cpu.mmc.fetch(0x203), 0x8, 'DEC a on 0x9 results in 0x8');
    assert.equal(cpu.flags.zero, 0x0, 'Zero flag is clear when DEC a result is non zero');
    assert.equal(cpu.flags.negative, 0x0, 'Negative flag is clear when DEC a result is positive');

    cpu.reset();

    cpu.mmc.store(0x200, 0xCE); // DEC a
    cpu.mmc.store(0x201, 0x03);
    cpu.mmc.store(0x202, 0x02);
    cpu.mmc.store(0x203, 0x00);

    cpu.registers.PC = 0x200;

    cycles = cpu.execute();

    assert.equal(cycles, 6, 'DEC a takes 6 cycles');
    assert.equal(cpu.mmc.fetch(0x203), 0xff, 'DEC a on 0x0 results in 0xff');
    assert.equal(cpu.flags.zero, 0x0, 'Zero flag is clear when DEC a result is negative');
    assert.equal(cpu.flags.negative, 0x1, 'Negative flag is set when DEC a result is negative');

    cpu.reset();

    cpu.mmc.store(0x200, 0xCE); // DEC a
    cpu.mmc.store(0x201, 0x03);
    cpu.mmc.store(0x202, 0x02);
    cpu.mmc.store(0x203, 0x01);

    cpu.registers.PC = 0x200;

    cycles = cpu.execute();

    assert.equal(cycles, 6, 'DEC a takes 6 cycles');
    assert.equal(cpu.mmc.fetch(0x203), 0x0, 'DEC a on 0x1 results in 0x0');
    assert.equal(cpu.flags.zero, 0x1, 'Zero flag is set when DEC a result is zero');
    assert.equal(cpu.flags.negative, 0x0, 'Negative flag is clear when DEC a result is zero');

});

QUnit.test("DEX", function (assert) {

    cpu.mmc.store(0x200, 0xCA); // DEX

    cpu.registers.PC = 0x200;
    cpu.registers.X = 0x01;

    var cycles = cpu.execute();

    assert.equal(cycles, 2, 'DEX takes 2 cycles');
    assert.equal(cpu.registers.X, 0x0, 'DEX on 0x1 results in 0x0');
    assert.equal(cpu.flags.zero, 0x1, 'Zero flag is set when DEX result is zero');
    assert.equal(cpu.flags.negative, 0x0, 'Negative flag is clear when DEX result is positive');

    cpu.reset();

    cpu.mmc.store(0x200, 0xCA); // DEX

    cpu.registers.PC = 0x200;
    cpu.registers.X = 0x00;

    cycles = cpu.execute();

    assert.equal(cycles, 2, 'DEX takes 2 cycles');
    assert.equal(cpu.registers.X, 0xff, 'DEX on 0x0 results in 0xff (-1)');
    assert.equal(cpu.flags.zero, 0x0, 'Zero flag is clear when DEX result is non-zero');
    assert.equal(cpu.flags.negative, 0x1, 'Negative flag is set when DEX result is negative');

});

QUnit.test("DEY", function (assert) {

    cpu.mmc.store(0x200, 0x88); // DEY

    cpu.registers.PC = 0x200;
    cpu.registers.Y = 0x01;

    var cycles = cpu.execute();

    assert.equal(cycles, 2, 'DEY takes 2 cycles');
    assert.equal(cpu.registers.Y, 0x0, 'DEY on 0x1 results in 0x0');
    assert.equal(cpu.flags.zero, 0x1, 'Zero flag is set when DEY result is zero');
    assert.equal(cpu.flags.negative, 0x0, 'Negative flag is clear when DEY result is positive');

    cpu.reset();

    cpu.mmc.store(0x200, 0x88); // DEY

    cpu.registers.PC = 0x200;
    cpu.registers.Y = 0x00;

    cycles = cpu.execute();

    assert.equal(cycles, 2, 'DEY takes 2 cycles');
    assert.equal(cpu.registers.Y, 0xff, 'DEY on 0x0 results in 0xff (-1)');
    assert.equal(cpu.flags.zero, 0x0, 'Zero flag is clear when DEY result is non-zero');
    assert.equal(cpu.flags.negative, 0x1, 'Negative flag is set when DEY result is negative');

});

QUnit.test("EOR #", function (assert) {

    cpu.mmc.store(0x200, 0x49); // EOR #$15
    cpu.mmc.store(0x201, 0x15);

    cpu.registers.PC = 0x200;
    cpu.registers.A = 0x15;

    var cycles = cpu.execute();

    assert.equal(cycles, 2, 'EOR # takes 2 cycles');
    assert.equal(cpu.registers.A, 0x0, 'EOR 0x15 0x15 results in 0x0');
    assert.equal(cpu.flags.zero, 0x1, 'Zero flag is set when EOR result is zero');
    assert.equal(cpu.flags.negative, 0x0, 'Negative flag is clear when EOR result is positive');
});

QUnit.test("INC a", function (assert) {

    cpu.mmc.store(0x200, 0xEE); // INC a
    cpu.mmc.store(0x201, 0x03);
    cpu.mmc.store(0x202, 0x02);
    cpu.mmc.store(0x203, 0x09);

    cpu.registers.PC = 0x200;

    var cycles = cpu.execute();

    assert.equal(cycles, 6, 'INC a takes 6 cycles');
    assert.equal(cpu.mmc.fetch(0x203), 0x0a, 'INC a on 0x9 results in 0x0a');
    assert.equal(cpu.flags.zero, 0x0, 'Zero flag is clear when INC a result is non zero');
    assert.equal(cpu.flags.negative, 0x0, 'Negative flag is clear when INC a result is positive');

    cpu.reset();

    cpu.mmc.store(0x200, 0xEE); // INC a
    cpu.mmc.store(0x201, 0x03);
    cpu.mmc.store(0x202, 0x02);
    cpu.mmc.store(0x203, 0x80);

    cpu.registers.PC = 0x200;

    cycles = cpu.execute();

    assert.equal(cycles, 6, 'INC a takes 6 cycles');
    assert.equal(cpu.mmc.fetch(0x203), 0x81, 'INC a on 0x80 results in 0x81');
    assert.equal(cpu.flags.zero, 0x0, 'Zero flag is clear when INC a result is negative');
    assert.equal(cpu.flags.negative, 0x1, 'Negative flag is set when INC a result is negative');

    cpu.reset();

    cpu.mmc.store(0x200, 0xEE); // INC a
    cpu.mmc.store(0x201, 0x03);
    cpu.mmc.store(0x202, 0x02);
    cpu.mmc.store(0x203, 0xff);

    cpu.registers.PC = 0x200;

    cycles = cpu.execute();

    assert.equal(cycles, 6, 'INC a takes 6 cycles');
    assert.equal(cpu.mmc.fetch(0x203), 0x0, 'INC a on 0xff results in 0x0');
    assert.equal(cpu.flags.zero, 0x1, 'Zero flag is set when INC a result is zero');
    assert.equal(cpu.flags.negative, 0x0, 'Negative flag is clear when INC a result is zero');

});

QUnit.test("INX", function (assert) {

    cpu.mmc.store(0x200, 0xE8); // INX

    cpu.registers.PC = 0x200;
    cpu.registers.X = 0xff;

    var cycles = cpu.execute();

    assert.equal(cycles, 2, 'INX takes 2 cycles');
    assert.equal(cpu.registers.X, 0x0, 'INX on 0xff results in 0x0');
    assert.equal(cpu.flags.zero, 0x1, 'Zero flag is set when INX result is zero');
    assert.equal(cpu.flags.negative, 0x0, 'Negative flag is clear when INX result is positive');

    cpu.reset();

    cpu.mmc.store(0x200, 0xE8); // INX

    cpu.registers.PC = 0x200;
    cpu.registers.X = 0xfe;

    cycles = cpu.execute();

    assert.equal(cycles, 2, 'INX takes 2 cycles');
    assert.equal(cpu.registers.X, 0xff, 'INX on 0x0 results is 0xff');
    assert.equal(cpu.flags.zero, 0x0, 'Zero flag is clear when INX result is non-zero');
    assert.equal(cpu.flags.negative, 0x1, 'Negative flag is set when INX result is negative');

});

QUnit.test("INY", function (assert) {

    cpu.mmc.store(0x200, 0xC8); // INY

    cpu.registers.PC = 0x200;
    cpu.registers.Y = 0xff;

    var cycles = cpu.execute();

    assert.equal(cycles, 2, 'INY takes 2 cycles');
    assert.equal(cpu.registers.Y, 0x0, 'INY on 0xff results in 0x0');
    assert.equal(cpu.flags.zero, 0x1, 'Zero flag is set when INY result is zero');
    assert.equal(cpu.flags.negative, 0x0, 'Negative flag is clear when INY result is positive');

    cpu.reset();

    cpu.mmc.store(0x200, 0xC8); // INY

    cpu.registers.PC = 0x200;
    cpu.registers.Y = 0xfe;

    cycles = cpu.execute();

    assert.equal(cycles, 2, 'INY takes 2 cycles');
    assert.equal(cpu.registers.Y, 0xff, 'INY on 0x0 results is 0xff');
    assert.equal(cpu.flags.zero, 0x0, 'Zero flag is clear when INY result is non-zero');
    assert.equal(cpu.flags.negative, 0x1, 'Negative flag is set when INY result is negative');

});

QUnit.test("JMP a", function (assert) {

    cpu.mmc.store(0x200, 0x4C); // JMP a
    cpu.mmc.store(0x201, 0x03);
    cpu.mmc.store(0x202, 0x02);
    cpu.mmc.store(0x203, 0x09);

    cpu.registers.PC = 0x200;

    var cycles = cpu.execute();

    assert.equal(cycles, 3, 'JMP a takes 3 cycles');
    assert.equal(cpu.registers.PC, 0x203, 'JMP results in PC being set to JMP arg');

});

QUnit.test("JSR a", function (assert) {

    cpu.mmc.store(0x200, 0x20); // JSR a
    cpu.mmc.store(0x201, 0xff);
    cpu.mmc.store(0x202, 0x02);

    cpu.registers.PC = 0x200;

    var cycles = cpu.execute();

    assert.equal(cycles, 6, 'JSR a takes 6 cycles');
    assert.equal(cpu.registers.PC, 0x2ff, 'JSR results in PC being set to JMP arg');
    assert.equal(cpu.pop(), 0x03, 'JSR results PC return address being pushed to the stack');
    assert.equal(cpu.pop(), 0x02, 'JSR results PC return address being pushed to the stack');

});

QUnit.test("LDA #", function (assert) {

    cpu.mmc.store(0x200, 0xA9);
    cpu.mmc.store(0x201, 0x07);

    cpu.registers.PC = 0x200;

    var cycles = cpu.execute();

    assert.equal(cycles, 2, 'LDA # takes 2 cycles');
    assert.equal(cpu.registers.A, 0x07, '"A" register has value 0x07 stored');
    assert.equal(cpu.registers.PC, 0x202, 'Program counter is incremented twice for LDA #');

    cpu.reset();

    cpu.mmc.store(0x200, 0xA9);
    cpu.mmc.store(0x201, 0x8);
    cpu.mmc.store(0x202, 0xA9);
    cpu.mmc.store(0x203, 0xf);
    cpu.mmc.store(0x204, 0xA9);
    cpu.mmc.store(0x205, 0x00);

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

    cpu.mmc.store(0x200, 0xA9);
    cpu.mmc.store(0x201, 0x00);

    cpu.registers.PC = 0x200;

    cpu.execute();

    assert.equal(cpu.flags.zero, 1, 'LDA #0 results in zero flag being set');
    assert.equal(cpu.flags.negative, 0, 'LDA #0 results in negative flag being unset');

    cpu.reset();

    cpu.mmc.store(0x200, 0xA9);
    cpu.mmc.store(0x201, 0x07);

    cpu.registers.PC = 0x200;

    cpu.execute();

    assert.equal(cpu.flags.zero, 0, 'LDA #7 results in zero flag being unset');
    assert.equal(cpu.flags.negative, 0, 'LDA #7 results in negative flag being unset');

    cpu.reset();

    cpu.mmc.store(0x200, 0xA9);
    cpu.mmc.store(0x201, 0x81);

    cpu.registers.PC = 0x200;

    cpu.execute();

    assert.equal(cpu.flags.zero, 0, 'LDA #81 results in zero flag being unset');
    assert.equal(cpu.flags.negative, 1, 'LDA #81 results in negative flag being set');

});

QUnit.test("LDX #", function (assert) {

    cpu.mmc.store(0x200, 0xA2);
    cpu.mmc.store(0x201, 0x07);

    cpu.registers.PC = 0x200;

    var cycles = cpu.execute();

    assert.equal(cycles, 2, 'LDX # takes 2 cycles');
    assert.equal(cpu.registers.X, 0x07, '"X" register has value 0x07 stored');
    assert.equal(cpu.registers.PC, 0x202, 'Program counter is incremented twice for LDX #');

    cpu.reset();

    cpu.mmc.store(0x200, 0xA2);
    cpu.mmc.store(0x201, 0x8);
    cpu.mmc.store(0x202, 0xA2);
    cpu.mmc.store(0x203, 0xf);
    cpu.mmc.store(0x204, 0xA2);
    cpu.mmc.store(0x205, 0x00);

    cpu.registers.PC = 0x200;

    cpu.execute();
    assert.equal(cpu.registers.X, 0x08, '"X" register has value 0x08 stored');
    assert.equal(cpu.registers.PC, 0x202, 'Program counter is incremented twice for LDX #');
    cpu.execute();
    assert.equal(cpu.registers.X, 0x0f, '"X" register has value 0x0f stored');
    assert.equal(cpu.registers.PC, 0x204, 'Program counter is incremented twice for LDX #');
    cpu.execute();
    assert.equal(cpu.registers.X, 0x00, '"X" register has value 0x00 stored');
    assert.equal(cpu.registers.PC, 0x206, 'Program counter is incremented twice for LDX #');


    cpu.reset();

    cpu.mmc.store(0x200, 0xA2);
    cpu.mmc.store(0x201, 0x00);

    cpu.registers.PC = 0x200;

    cpu.execute();

    assert.equal(cpu.flags.zero, 1, 'LDX #0 results in zero flag being set');
    assert.equal(cpu.flags.negative, 0, 'LDX #0 results in negative flag being unset');

    cpu.reset();

    cpu.mmc.store(0x200, 0xA2);
    cpu.mmc.store(0x201, 0x07);

    cpu.registers.PC = 0x200;

    cpu.execute();

    assert.equal(cpu.flags.zero, 0, 'LDX #7 results in zero flag being unset');
    assert.equal(cpu.flags.negative, 0, 'LDX #7 results in negative flag being unset');

    cpu.reset();

    cpu.mmc.store(0x200, 0xA2);
    cpu.mmc.store(0x201, 0x81);

    cpu.registers.PC = 0x200;

    cpu.execute();

    assert.equal(cpu.flags.zero, 0, 'LDX #81 results in zero flag being unset');
    assert.equal(cpu.flags.negative, 1, 'LDX #81 results in negative flag being set');

});

QUnit.test("LDY #", function (assert) {

    cpu.mmc.store(0x200, 0xA0);
    cpu.mmc.store(0x201, 0x07);

    cpu.registers.PC = 0x200;

    var cycles = cpu.execute();

    assert.equal(cycles, 2, 'LDY # takes 2 cycles');
    assert.equal(cpu.registers.Y, 0x07, '"A" register has value 0x07 stored');
    assert.equal(cpu.registers.PC, 0x202, 'Program counter is incremented twice for LDY #');

    cpu.reset();

    cpu.mmc.store(0x200, 0xA0);
    cpu.mmc.store(0x201, 0x8);
    cpu.mmc.store(0x202, 0xA0);
    cpu.mmc.store(0x203, 0xf);
    cpu.mmc.store(0x204, 0xA0);
    cpu.mmc.store(0x205, 0x00);

    cpu.registers.PC = 0x200;

    cpu.execute();
    assert.equal(cpu.registers.Y, 0x08, '"A" register has value 0x08 stored');
    assert.equal(cpu.registers.PC, 0x202, 'Program counter is incremented twice for LDY #');
    cpu.execute();
    assert.equal(cpu.registers.Y, 0x0f, '"A" register has value 0x0f stored');
    assert.equal(cpu.registers.PC, 0x204, 'Program counter is incremented twice for LDY #');
    cpu.execute();
    assert.equal(cpu.registers.Y, 0x00, '"A" register has value 0x00 stored');
    assert.equal(cpu.registers.PC, 0x206, 'Program counter is incremented twice for LDY #');


    cpu.reset();

    cpu.mmc.store(0x200, 0xA0);
    cpu.mmc.store(0x201, 0x00);

    cpu.registers.PC = 0x200;

    cpu.execute();

    assert.equal(cpu.flags.zero, 1, 'LDY #0 results in zero flag being set');
    assert.equal(cpu.flags.negative, 0, 'LDY #0 results in negative flag being unset');

    cpu.reset();

    cpu.mmc.store(0x200, 0xA0);
    cpu.mmc.store(0x201, 0x07);

    cpu.registers.PC = 0x200;

    cpu.execute();

    assert.equal(cpu.flags.zero, 0, 'LDY #7 results in zero flag being unset');
    assert.equal(cpu.flags.negative, 0, 'LDY #7 results in negative flag being unset');

    cpu.reset();

    cpu.mmc.store(0x200, 0xA0);
    cpu.mmc.store(0x201, 0x81);

    cpu.registers.PC = 0x200;

    cpu.execute();

    assert.equal(cpu.flags.zero, 0, 'LDY #81 results in zero flag being unset');
    assert.equal(cpu.flags.negative, 1, 'LDY #81 results in negative flag being set');

});

QUnit.test("LSR A", function (assert) {

    cpu.mmc.store(0x200, 0x4a);

    cpu.registers.A = 0x08;
    cpu.registers.PC = 0x200;

    var cycles = cpu.execute();

    assert.equal(cycles, 2, 'LSR A takes 2 cycles');
    assert.equal(cpu.registers.A, 0x04, '"A" register has value 0x04 stored after LSR of 0x08');
    assert.equal(cpu.flags.negative, 0x0, 'Negative flag is clear after LSR');
    assert.equal(cpu.flags.carry, 0x0, 'Carry flag is clear after LSR of 0x08');
    assert.equal(cpu.flags.zero, 0x0, 'Zero flag is clear after LSR of 0x08');

    cpu.reset();

    cpu.mmc.store(0x200, 0x4a);

    cpu.registers.A = 0x01;
    cpu.registers.PC = 0x200;

    cycles = cpu.execute();

    assert.equal(cycles, 2, 'LSR A takes 2 cycles');
    assert.equal(cpu.registers.A, 0x0, '"A" register has value 0x0 stored after LSR of 0x01');
    assert.equal(cpu.flags.negative, 0x0, 'Negative flag is clear after LSR');
    assert.equal(cpu.flags.carry, 0x1, 'Carry flag is set after LSR of 0x01');
    assert.equal(cpu.flags.zero, 0x1, 'Zero flag is set after LSR of 0x01');

});

QUnit.test("LSR a", function (assert) {

    cpu.mmc.store(0x200, 0x4e);
    cpu.mmc.store(0x201, 0x03);
    cpu.mmc.store(0x202, 0x02);
    cpu.mmc.store(0x203, 0x08);

    cpu.registers.PC = 0x200;

    var cycles = cpu.execute();

    assert.equal(cycles, 6, 'LSR A takes 6 cycles');
    assert.equal(cpu.mmc.fetch(0x203), 0x04, 'Memory has value 0x04 stored after LSR of 0x08');
    assert.equal(cpu.flags.negative, 0x0, 'Negative flag is clear after LSR');
    assert.equal(cpu.flags.carry, 0x0, 'Carry flag is clear after LSR of 0x08');
    assert.equal(cpu.flags.zero, 0x0, 'Zero flag is clear after LSR of 0x08');

    cpu.reset();

    cpu.mmc.store(0x200, 0x4e);
    cpu.mmc.store(0x201, 0x03);
    cpu.mmc.store(0x202, 0x02);
    cpu.mmc.store(0x203, 0x01);

    cpu.registers.PC = 0x200;

    cycles = cpu.execute();

    assert.equal(cycles, 6, 'LSR A takes 6 cycles');
    assert.equal(cpu.mmc.fetch(0x203), 0x0, 'Memory has value 0x0 stored after LSR of 0x01');
    assert.equal(cpu.flags.negative, 0x0, 'Negative flag is clear after LSR');
    assert.equal(cpu.flags.carry, 0x1, 'Carry flag is set after LSR of 0x01');
    assert.equal(cpu.flags.zero, 0x1, 'Zero flag is set after LSR of 0x01');
});

QUnit.test("NOP", function (assert) {

    cpu.mmc.store(0x200, 0xEA);
    cpu.registers.PC = 0x200;

    var preState_registers = JSON.stringify(cpu.registers);
    var preState_flags = JSON.stringify(cpu.flags);
    var preState_memory = JSON.stringify(cpu.mmc.memory);

    assert.equal(cpu.execute(), 2, 'NOP takes 2 cycles');
    assert.equal(cpu.registers.PC, 0x201, 'PC is incremented once on NOP');

    cpu.registers.PC = 0x200;
    var postState_registers = JSON.stringify(cpu.registers);
    var postState_flags = JSON.stringify(cpu.flags);
    var postState_memory = JSON.stringify(cpu.mmc.memory);
    assert.equal(postState_registers, preState_registers, 'CPU register state is unchanged other than increment of PC on NOP');
    assert.equal(postState_flags, preState_flags, 'CPU flag state is unchanged on NOP');
    assert.equal(postState_memory, preState_memory, 'CPU memory state is unchanged on NOP');
});

QUnit.test("ORA #", function (assert) {

    cpu.mmc.store(0x200, 0x09); // ORA
    cpu.mmc.store(0x201, 0x15); // 00010101

    cpu.registers.PC = 0x200;
    cpu.registers.A = 0x40; // 01000000

    var cycles = cpu.execute();

    assert.equal(cycles, 2, 'ORA # takes 2 cycles');
    assert.equal(cpu.registers.A, 0x55, 'ORA 0x15 0x15 results in 0x55');
    assert.equal(cpu.flags.zero, 0x0, 'Zero flag is clear when ORA result is not zero');
    assert.equal(cpu.flags.negative, 0x0, 'Negative flag is clear when ORA result is positive');

    cpu.reset();

    cpu.mmc.store(0x200, 0x09); // ORA
    cpu.mmc.store(0x201, 0x00); // 00000000

    cpu.registers.PC = 0x200;
    cpu.registers.A = 0x00; // 00000000

    cycles = cpu.execute();

    assert.equal(cycles, 2, 'ORA # takes 2 cycles');
    assert.equal(cpu.registers.A, 0x0, 'ORA 0x0 0x0 results in 0x0');
    assert.equal(cpu.flags.zero, 0x1, 'Zero flag is set when ORA result is zero');
    assert.equal(cpu.flags.negative, 0x0, 'Negative flag is clear when ORA result is positive');

    cpu.reset();

    cpu.mmc.store(0x200, 0x09); // ORA
    cpu.mmc.store(0x201, 0x80); // 10000000

    cpu.registers.PC = 0x200;
    cpu.registers.A = 0x01; // 00000001

    cycles = cpu.execute();

    assert.equal(cycles, 2, 'ORA # takes 2 cycles');
    assert.equal(cpu.registers.A, 0x81, 'ORA 0x80 0x01 results in 0x81');
    assert.equal(cpu.flags.zero, 0x0, 'Zero flag is clear when ORA result is not zero');
    assert.equal(cpu.flags.negative, 0x1, 'Negative flag is set when ORA result is negative');

});

QUnit.test("PHA", function (assert) {

    cpu.mmc.store(0x200, 0x48);
    cpu.registers.PC = 0x200;
    cpu.registers.A = 0x88;
    var cycles = cpu.execute();
    assert.equal(cycles, 3, 'PHA takes 3 cycles');
    assert.equal(cpu.pop(), 0x88, 'PHA pushes value of A to stack');
});

QUnit.test("PHP", function (assert) {

    cpu.mmc.store(0x200, 0x08);
    cpu.registers.PC = 0x200;
    var cycles = cpu.execute();
    assert.equal(cycles, 3, 'PHP takes 3 cycles');
    assert.equal(cpu.pop(), cpu.registers.P, 'PHP pushes value of P to stack');
});

QUnit.test("PLA", function (assert) {

    cpu.mmc.store(0x200, 0x68);
    cpu.registers.PC = 0x200;
    cpu.push(0x77);
    var cycles = cpu.execute();
    assert.equal(cycles, 4, 'PLA takes 4 cycles');
    assert.equal(cpu.registers.A, 0x77, 'PLA pulls value stack pop into A');
    assert.equal(cpu.flags.zero, 0x0, 'Zero flag is clear after PLA where stack value is non zero');
    assert.equal(cpu.flags.negative, 0x0, 'Negative flag is clear after PLA where stack value is not negative');

    cpu.reset();

    cpu.mmc.store(0x200, 0x68);
    cpu.registers.PC = 0x200;
    cpu.push(0x0);
    cycles = cpu.execute();
    assert.equal(cycles, 4, 'PLA takes 4 cycles');
    assert.equal(cpu.registers.A, 0x0, 'PLA pulls value stack pop into A');
    assert.equal(cpu.flags.zero, 0x1, 'Zero flag is set after PLA where stack value is zero');
    assert.equal(cpu.flags.negative, 0x0, 'Negative flag is clear after PLA where stack value is not negative');

    cpu.reset();

    cpu.mmc.store(0x200, 0x68);
    cpu.registers.PC = 0x200;
    cpu.push(0x80);
    cycles = cpu.execute();
    assert.equal(cycles, 4, 'PLA takes 4 cycles');
    assert.equal(cpu.registers.A, 0x80, 'PLA pulls value stack pop into A');
    assert.equal(cpu.flags.zero, 0x0, 'Zero flag is clear after PLA where stack value is non zero');
    assert.equal(cpu.flags.negative, 0x1, 'Negative flag is set after PLA where stack value is negative');

});

QUnit.test("PLP", function (assert) {

    cpu.mmc.store(0x200, 0x28);
    cpu.registers.PC = 0x200;
    cpu.push(0xff);
    var cycles = cpu.execute();
    assert.equal(cycles, 4, 'PLP takes 4 cycles');
    assert.equal(cpu.registers.P, 0xff, 'PLP pulls value stack pop into P');
    assert.equal(cpu.flags.zero, 0x1, 'Zero flag is set when PLP pulls 0xff from stack');
    assert.equal(cpu.flags.carry, 0x1, 'Carry flag is set when PLP pulls 0xff from stack');
    assert.equal(cpu.flags.negative, 0x1, 'Negative flag is set when PLP pulls 0xff from stack');
    assert.equal(cpu.flags.unused, 0x1, 'Unused flag is set when PLP pulls 0xff from stack');
    assert.equal(cpu.flags.brk, 0x1, 'Brk flag is set when PLP pulls 0xff from stack');
    assert.equal(cpu.flags.interruptDisable, 0x1, 'IRQ flag is set when PLP pulls 0xff from stack');
    assert.equal(cpu.flags.decimal, 0x1, 'Decimal flag is set when PLP pulls 0xff from stack');
    assert.equal(cpu.flags.overflow, 0x1, 'Overflow flag is set when PLP pulls 0xff from stack');

});

QUnit.test("ROL A", function (assert) {

    cpu.mmc.store(0x200, 0x2a);

    cpu.registers.A = 0x08;
    cpu.registers.PC = 0x200;

    var cycles = cpu.execute();

    assert.equal(cycles, 2, 'ROL A takes 2 cycles');
    assert.equal(cpu.registers.A, 0x10, '"A" register has value 0x10 stored after ROL of 0x08');
    assert.equal(cpu.flags.negative, 0x0, 'Negative flag is clear after ROL');
    assert.equal(cpu.flags.carry, 0x0, 'Carry flag is clear after ROL of 0x08');
    assert.equal(cpu.flags.zero, 0x0, 'Zero flag is clear after ROL of 0x08');

    cpu.reset();

    cpu.mmc.store(0x200, 0x2a);

    cpu.registers.A = 0x80;
    cpu.registers.PC = 0x200;

    cycles = cpu.execute();

    assert.equal(cycles, 2, 'ROL A takes 2 cycles');
    assert.equal(cpu.registers.A, 0x0, '"A" register has value 0x0 stored after ROL of 0x80');
    assert.equal(cpu.flags.negative, 0x0, 'Negative flag is clear after ROL');
    assert.equal(cpu.flags.carry, 0x1, 'Carry flag is set after ROL of 0x80');
    assert.equal(cpu.flags.zero, 0x1, 'Zero flag is set after ROL of 0x80');

    cpu.reset();

    cpu.mmc.store(0x200, 0x2a);

    cpu.registers.A = 0x40;
    cpu.registers.PC = 0x200;

    cycles = cpu.execute();

    assert.equal(cycles, 2, 'ROL A takes 2 cycles');
    assert.equal(cpu.registers.A, 0x80, '"A" register has value 0x80 stored after ROL of 0x40');
    assert.equal(cpu.flags.negative, 0x1, 'Negative flag is set after ROL 0x40');
    assert.equal(cpu.flags.carry, 0x0, 'Carry flag is clear after ROL of 0x40');
    assert.equal(cpu.flags.zero, 0x0, 'Zero flag is clear after ROL of 0x40');

    cpu.reset();

    cpu.mmc.store(0x200, 0x2a);

    cpu.setCarryFlag();
    cpu.registers.A = 0x0;
    cpu.registers.PC = 0x200;

    cycles = cpu.execute();

    assert.equal(cycles, 2, 'ROL A takes 2 cycles');
    assert.equal(cpu.registers.A, 0x01, '"A" register has value 0x01 stored after ROL of 0x0 with carry set');
    assert.equal(cpu.flags.negative, 0x0, 'Negative flag is clear after ROL 0x0 with carry set');
    assert.equal(cpu.flags.carry, 0x0, 'Carry flag is clear after ROL of 0x0 with carry set');
    assert.equal(cpu.flags.zero, 0x0, 'Zero flag is clear after ROL of 0x0 with carry set');
});

QUnit.test("ROL a", function (assert) {

    cpu.mmc.store(0x200, 0x2e);
    cpu.mmc.store(0x201, 0x03);
    cpu.mmc.store(0x202, 0x02);
    cpu.mmc.store(0x203, 0x08);

    cpu.registers.PC = 0x200;

    var cycles = cpu.execute();

    assert.equal(cycles, 6, 'ROL a takes 6 cycles');
    assert.equal(cpu.mmc.fetch(0x203), 0x10, 'Memory has value 0x10 stored after ROL of 0x08');
    assert.equal(cpu.flags.negative, 0x0, 'Negative flag is clear after ROL');
    assert.equal(cpu.flags.carry, 0x0, 'Carry flag is clear after ROL of 0x08');
    assert.equal(cpu.flags.zero, 0x0, 'Zero flag is clear after ROL of 0x08');

    cpu.reset();

    cpu.mmc.store(0x200, 0x2e);
    cpu.mmc.store(0x201, 0x03);
    cpu.mmc.store(0x202, 0x02);
    cpu.mmc.store(0x203, 0x80);

    cpu.registers.PC = 0x200;

    cycles = cpu.execute();

    assert.equal(cycles, 6, 'ROL a takes 6 cycles');
    assert.equal(cpu.mmc.fetch(0x203), 0x0, 'Memory has value 0x0 stored after ROL of 0x80');
    assert.equal(cpu.flags.negative, 0x0, 'Negative flag is clear after ROL');
    assert.equal(cpu.flags.carry, 0x1, 'Carry flag is set after ROL of 0x80');
    assert.equal(cpu.flags.zero, 0x1, 'Zero flag is set after ROL of 0x80');

    cpu.reset();

    cpu.mmc.store(0x200, 0x2e);
    cpu.mmc.store(0x201, 0x03);
    cpu.mmc.store(0x202, 0x02);
    cpu.mmc.store(0x203, 0x40);

    cpu.registers.PC = 0x200;

    cycles = cpu.execute();

    assert.equal(cycles, 6, 'ROL a takes 6 cycles');
    assert.equal(cpu.mmc.fetch(0x203), 0x80, 'Memory has value 0x80 stored after ROL of 0x40');
    assert.equal(cpu.flags.negative, 0x1, 'Negative flag is set after ROL 0x40');
    assert.equal(cpu.flags.carry, 0x0, 'Carry flag is clear after ROL of 0x40');
    assert.equal(cpu.flags.zero, 0x0, 'Zero flag is clear after ROL of 0x40');

    cpu.reset();

    cpu.mmc.store(0x200, 0x2e);

    cpu.setCarryFlag();
    cpu.mmc.store(0x201, 0x03);
    cpu.mmc.store(0x202, 0x02);
    cpu.mmc.store(0x203, 0x0);

    cpu.registers.PC = 0x200;

    cycles = cpu.execute();

    assert.equal(cycles, 6, 'ROL a takes 6 cycles');
    assert.equal(cpu.mmc.fetch(0x203), 0x01, 'Memory has value 0x01 stored after ROL of 0x0 with carry set');
    assert.equal(cpu.flags.negative, 0x0, 'Negative flag is clear after ROL 0x0 with carry set');
    assert.equal(cpu.flags.carry, 0x0, 'Carry flag is clear after ROL of 0x0 with carry set');
    assert.equal(cpu.flags.zero, 0x0, 'Zero flag is clear after ROL of 0x0 with carry set');
});

QUnit.test("ROR A", function (assert) {

    cpu.mmc.store(0x200, 0x6a);

    cpu.registers.A = 0x08;
    cpu.registers.PC = 0x200;

    var cycles = cpu.execute();

    assert.equal(cycles, 2, 'ROR A takes 2 cycles');
    assert.equal(cpu.registers.A, 0x04, '"A" register has value 0x04 stored after ROR of 0x08');
    assert.equal(cpu.flags.negative, 0x0, 'Negative flag is clear after ROR');
    assert.equal(cpu.flags.carry, 0x0, 'Carry flag is clear after ROR of 0x08');
    assert.equal(cpu.flags.zero, 0x0, 'Zero flag is clear after ROR of 0x08');

    cpu.reset();

    cpu.mmc.store(0x200, 0x6a);

    cpu.registers.A = 0x1;
    cpu.registers.PC = 0x200;

    cycles = cpu.execute();

    assert.equal(cycles, 2, 'ROR A takes 2 cycles');
    assert.equal(cpu.registers.A, 0x0, '"A" register has value 0x0 stored after ROR of 0x1');
    assert.equal(cpu.flags.negative, 0x0, 'Negative flag is clear after ROR');
    assert.equal(cpu.flags.carry, 0x1, 'Carry flag is set after ROR of 0x1');
    assert.equal(cpu.flags.zero, 0x1, 'Zero flag is set after ROR of 0x1');

    cpu.reset();

    cpu.mmc.store(0x200, 0x6a);

    cpu.setCarryFlag();
    cpu.registers.A = 0x2;
    cpu.registers.PC = 0x200;

    cycles = cpu.execute();

    assert.equal(cycles, 2, 'ROR A takes 2 cycles');
    assert.equal(cpu.registers.A, 0x81, '"A" register has value 0x81 stored after ROR of 0x2 with carry set');
    assert.equal(cpu.flags.negative, 0x1, 'Negative flag is set after ROR of 0x2 with carry set');
    assert.equal(cpu.flags.carry, 0x0, 'Carry flag is clear after ROR of 0x2 with carry set');
    assert.equal(cpu.flags.zero, 0x0, 'Zero flag is clear after ROR of 0x2 with carry set');

    cpu.reset();

    cpu.mmc.store(0x200, 0x6a);

    cpu.setCarryFlag();
    cpu.registers.A = 0x1;
    cpu.registers.PC = 0x200;

    cycles = cpu.execute();

    assert.equal(cycles, 2, 'ROR A takes 2 cycles');
    assert.equal(cpu.registers.A, 0x80, '"A" register has value 0x80 stored after ROR of 0x1 with carry set');
    assert.equal(cpu.flags.negative, 0x1, 'Negative flag is set after ROR of 0x1 with carry set');
    assert.equal(cpu.flags.carry, 0x1, 'Carry flag is set after ROR of 0x1 with carry set');
    assert.equal(cpu.flags.zero, 0x0, 'Zero flag is clear after ROR of 0x1 with carry set');
});

QUnit.test("ROR a", function (assert) {

    cpu.mmc.store(0x200, 0x6e);
    cpu.mmc.store(0x201, 0x03);
    cpu.mmc.store(0x202, 0x02);
    cpu.mmc.store(0x203, 0x08);

    cpu.registers.PC = 0x200;

    var cycles = cpu.execute();

    assert.equal(cycles, 6, 'ROR a takes 6 cycles');
    assert.equal(cpu.mmc.fetch(0x203), 0x04, '"A" register has value 0x04 stored after ROR of 0x08');
    assert.equal(cpu.flags.negative, 0x0, 'Negative flag is clear after ROR');
    assert.equal(cpu.flags.carry, 0x0, 'Carry flag is clear after ROR of 0x08');
    assert.equal(cpu.flags.zero, 0x0, 'Zero flag is clear after ROR of 0x08');

    cpu.reset();

    cpu.mmc.store(0x200, 0x6e);
    cpu.mmc.store(0x201, 0x03);
    cpu.mmc.store(0x202, 0x02);
    cpu.mmc.store(0x203, 0x1);

    cpu.registers.PC = 0x200;

    cycles = cpu.execute();

    assert.equal(cycles, 6, 'ROR a takes 6 cycles');
    assert.equal(cpu.mmc.fetch(0x203), 0x0, '"A" register has value 0x0 stored after ROR of 0x1');
    assert.equal(cpu.flags.negative, 0x0, 'Negative flag is clear after ROR');
    assert.equal(cpu.flags.carry, 0x1, 'Carry flag is set after ROR of 0x1');
    assert.equal(cpu.flags.zero, 0x1, 'Zero flag is set after ROR of 0x1');

    cpu.reset();

    cpu.mmc.store(0x200, 0x6e);
    cpu.mmc.store(0x201, 0x03);
    cpu.mmc.store(0x202, 0x02);
    cpu.mmc.store(0x203, 0x02);

    cpu.setCarryFlag();
    cpu.registers.PC = 0x200;

    cycles = cpu.execute();

    assert.equal(cycles, 6, 'ROR a takes 6 cycles');
    assert.equal(cpu.mmc.fetch(0x203), 0x81, '"A" register has value 0x81 stored after ROR of 0x2 with carry set');
    assert.equal(cpu.flags.negative, 0x1, 'Negative flag is set after ROR of 0x2 with carry set');
    assert.equal(cpu.flags.carry, 0x0, 'Carry flag is clear after ROR of 0x2 with carry set');
    assert.equal(cpu.flags.zero, 0x0, 'Zero flag is clear after ROR of 0x2 with carry set');

    cpu.reset();

    cpu.mmc.store(0x200, 0x6e);
    cpu.mmc.store(0x201, 0x03);
    cpu.mmc.store(0x202, 0x02);
    cpu.mmc.store(0x203, 0x01);

    cpu.setCarryFlag();
    cpu.registers.PC = 0x200;

    cycles = cpu.execute();

    assert.equal(cycles, 6, 'ROR a takes 6 cycles');
    assert.equal(cpu.mmc.fetch(0x203), 0x80, '"A" register has value 0x80 stored after ROR of 0x1 with carry set');
    assert.equal(cpu.flags.negative, 0x1, 'Negative flag is set after ROR of 0x1 with carry set');
    assert.equal(cpu.flags.carry, 0x1, 'Carry flag is set after ROR of 0x1 with carry set');
    assert.equal(cpu.flags.zero, 0x0, 'Zero flag is clear after ROR of 0x1 with carry set');
});

QUnit.test("RTI", function (assert) {

    cpu.mmc.store(0x200, 0x40);

    cpu.registers.PC = 0x200;

    cpu.push(0x04); //return...
    cpu.push(0x02); //...address
    cpu.push(0xff); //flags

    var cycles = cpu.execute();

    assert.equal(cycles, 6, 'RTI takes 6 cycles');
    assert.equal(cpu.flags.negative, 0x1, 'Negative flag is set after RTI with 0xff stacked last');
    assert.equal(cpu.flags.carry, 0x1, 'Carry flag is set after RTI with 0xff stacked last');
    assert.equal(cpu.flags.overflow, 0x1, 'Overflow flag is set after RTI with 0xff stacked last');
    assert.equal(cpu.flags.zero, 0x1, 'Zero flag is set after RTI with 0xff stacked last');
    assert.equal(cpu.flags.unused, 0x1, 'Unused flag is set after RTI with 0xff stacked last');
    assert.equal(cpu.flags.interruptDisable, 0x1, 'IRQ flag is set after RTI with 0xff stacked last');
    assert.equal(cpu.flags.brk, 0x1, 'BRK flag is set after RTI with 0xff stacked last');
    assert.equal(cpu.flags.decimal, 0x1, 'Decimal flag is set after RTI with 0xff stacked last');
    assert.equal(cpu.registers.PC, 0x204, 'PC is set to 0x204 after RTI with 0x04 then 0x02 stacked before P');

});


QUnit.test("RTS", function (assert) {

    cpu.mmc.store(0x200, 0x60);

    cpu.registers.PC = 0x200;

    cpu.push(0x04); //return...
    cpu.push(0x02); //...address

    var cycles = cpu.execute();

    assert.equal(cycles, 6, 'RTS takes 6 cycles');
    assert.equal(cpu.registers.PC, 0x204, 'PC is set to 0x204 after RTS with 0x04 then 0x02 stacked');

});

QUnit.test("SBC #", function (assert) {

    cpu.mmc.store(0x200, 0xE9);
    cpu.mmc.store(0x201, 0x01);

    cpu.registers.A = 0x80;
    cpu.registers.PC = 0x200;

    var cycles = cpu.execute();

    assert.equal(cycles, 2, 'SBC # takes 2 cycles');
    assert.equal(cpu.registers.A, 0x7E, '"A" register has value 0x7E stored after SBC 0x80 - 0x01');
    assert.equal(cpu.registers.PC, 0x202, 'Program counter is incremented twice for SBC #');
    assert.equal(cpu.flags.negative, 0x0, 'Negative flag is clear after SBC 0x80 - 0x01');
    assert.equal(cpu.flags.zero, 0x0, 'Zero flag is clear after SBC 0x80 - 0x01');
    assert.equal(cpu.flags.overflow, 0x1, 'Overflow flag is set after SBC 0x80 - 0x01');

    cpu.reset();

    cpu.mmc.store(0x200, 0xE9);
    cpu.mmc.store(0x201, 0x01);

    cpu.registers.A = 0x02;
    cpu.registers.PC = 0x200;

    cycles = cpu.execute();

    assert.equal(cycles, 2, 'SBC # takes 2 cycles');
    assert.equal(cpu.registers.A, 0x0, '"A" register has value 0x0 stored after SBC 0x02 - 0x01');
    assert.equal(cpu.flags.negative, 0x0, 'Negative flag is clear after SBC 0x02 - 0x01');
    assert.equal(cpu.flags.zero, 0x1, 'Zero flag is set after SBC 0x02 - 0x01');
    assert.equal(cpu.flags.overflow, 0x0, 'Overflow flag is clear after SBC 0x02 - 0x01');

    cpu.reset();

    cpu.mmc.store(0x200, 0xE9);
    cpu.mmc.store(0x201, 0x01);

    cpu.registers.A = 0x01;
    cpu.registers.PC = 0x200;

    cpu.setCarryFlag();

    cycles = cpu.execute();

    assert.equal(cycles, 2, 'SBC # takes 2 cycles');
    assert.equal(cpu.registers.A, 0x0, '"A" register has value 0x0 stored after SBC 0x01 - 0x01 with carry flag set');
    assert.equal(cpu.flags.negative, 0x0, 'Negative flag is clear after SBC 0x01 - 0x01 with carry flag set');
    assert.equal(cpu.flags.zero, 0x1, 'Zero flag is set after SBC 0x01 - 0x01 with carry flag set');
    assert.equal(cpu.flags.overflow, 0x0, 'Overflow flag is clear after SBC 0x01 - 0x01 with carry flag set');

    cpu.reset();

    cpu.mmc.store(0x200, 0xE9);
    cpu.mmc.store(0x201, 0x01);

    cpu.registers.A = 0x0;
    cpu.registers.PC = 0x200;

    cycles = cpu.execute();

    assert.equal(cycles, 2, 'SBC # takes 2 cycles');
    assert.equal(cpu.registers.A, 0xfe, '"A" register has value 0xfe stored after SBC 0x0 - 0x01');
    assert.equal(cpu.flags.negative, 0x1, 'Negative flag is set after SBC 0x0 - 0x01');
    assert.equal(cpu.flags.zero, 0x0, 'Zero flag is clear after SBC 0x01 - 0x0');
    assert.equal(cpu.flags.overflow, 0x0, 'Overflow flag is clear after SBC 0x0 - 0x01');

    cpu.reset();

    cpu.mmc.store(0x200, 0xE9);
    cpu.mmc.store(0x201, 0x70);

    cpu.registers.A = 0xd0;
    cpu.registers.PC = 0x200;

    cycles = cpu.execute();

    assert.equal(cycles, 2, 'SBC # takes 2 cycles');
    assert.equal(cpu.registers.A, 0x5f, '"A" register has value 0x5f stored after SBC 0xd0 - 0x70');
    assert.equal(cpu.flags.negative, 0x0, 'Negative flag is clear after SBC 0xd0 - 0x70');
    assert.equal(cpu.flags.zero, 0x0, 'Zero flag is clear after SBC 0xd0 - 0x70');
    assert.equal(cpu.flags.overflow, 0x1, 'Overflow flag is set after SBC 0xd0 - 0x70');
});

QUnit.test("SEC", function (assert) {

    cpu.mmc.store(0x200, 0x38);
    cpu.registers.PC = 0x200;
    cpu.clearCarryFlag();
    var cycles = cpu.execute();



    assert.equal(cycles, 2, 'SEC takes 2 cycles');
    assert.equal(cpu.flags.carry, 0x1, 'SEC sets carry flag');
});

QUnit.test("SED", function (assert) {

    cpu.mmc.store(0x200, 0xF8);
    cpu.registers.PC = 0x200;
    cpu.clearDecimalFlag();

    var cycles = cpu.execute();

    assert.equal(cycles, 2, 'SED takes 2 cycles');
    assert.equal(cpu.flags.decimal, 0x1, 'SED sets decimal flag');
});

QUnit.test("SEI", function (assert) {

    cpu.mmc.store(0x200, 0x78);
    cpu.registers.PC = 0x200;
    cpu.clearInterruptDisableFlag();

    var cycles = cpu.execute();

    assert.equal(cycles, 2, 'SEI takes 2 cycles');
    assert.equal(cpu.flags.interruptDisable, 0x1, 'SEI sets IRQ flag');
});

QUnit.test("STA a", function (assert) {

    cpu.mmc.store(0x600, 0x8D);
    cpu.mmc.store(0x601, 0x03);
    cpu.mmc.store(0x602, 0x06);
    cpu.registers.PC = 0x600;
    cpu.registers.A = 0x33;

    var cycles = cpu.execute();

    assert.equal(cycles, 4, 'STA a takes 4 cycles');
    assert.equal(cpu.mmc.fetch(0x603), 0x33, 'STA a stores value of A in memory');
});

QUnit.test("STX a", function (assert) {

    cpu.mmc.store(0x600, 0x8E);
    cpu.mmc.store(0x601, 0x03);
    cpu.mmc.store(0x602, 0x06);
    cpu.registers.PC = 0x600;
    cpu.registers.X = 0x33;

    var cycles = cpu.execute();

    assert.equal(cycles, 4, 'STX a takes 4 cycles');
    assert.equal(cpu.mmc.fetch(0x603), 0x33, 'STX a stores value of X in memory');
});

QUnit.test("STY a", function (assert) {

    cpu.mmc.store(0x600, 0x8C);
    cpu.mmc.store(0x601, 0x03);
    cpu.mmc.store(0x602, 0x06);
    cpu.registers.PC = 0x600;
    cpu.registers.Y = 0x33;

    var cycles = cpu.execute();

    assert.equal(cycles, 4, 'STY a takes 4 cycles');
    assert.equal(cpu.mmc.fetch(0x603), 0x33, 'STY a stores value of Y in memory');
});

QUnit.test("TAX", function (assert) {

    cpu.mmc.store(0x600, 0xAA);
    cpu.registers.PC = 0x600;
    cpu.registers.A = 0x32;

    var cycles = cpu.execute();

    assert.equal(cycles, 2, 'TAX a takes 2 cycles');
    assert.equal(cpu.registers.X, 0x32, 'TAX transfers A into X');
    assert.equal(cpu.flags.zero, 0x0, 'Zero flag is clear when A is non zero');
    assert.equal(cpu.flags.negative, 0x0, 'Negative flag is clear when A is not negative');

    cpu.reset();

    cpu.mmc.store(0x600, 0xAA);
    cpu.registers.PC = 0x600;
    cpu.registers.A = 0x0;

    cycles = cpu.execute();

    assert.equal(cycles, 2, 'TAX a takes 2 cycles');
    assert.equal(cpu.registers.X, 0x0, 'TAX transfers A into X');
    assert.equal(cpu.flags.zero, 0x1, 'Zero flag is set when A is zero');
    assert.equal(cpu.flags.negative, 0x0, 'Negative flag is clear when A is not negative');

    cpu.reset();

    cpu.mmc.store(0x600, 0xAA);
    cpu.registers.PC = 0x600;
    cpu.registers.A = 0x80;

    cycles = cpu.execute();

    assert.equal(cycles, 2, 'TAX a takes 2 cycles');
    assert.equal(cpu.registers.X, 0x80, 'TAX transfers A into X');
    assert.equal(cpu.flags.zero, 0x0, 'Zero flag is clear when A is non zero');
    assert.equal(cpu.flags.negative, 0x1, 'Negative flag is set when A is negative');
});

QUnit.test("TAY", function (assert) {

    cpu.mmc.store(0x600, 0xA8);
    cpu.registers.PC = 0x600;
    cpu.registers.A = 0x32;

    var cycles = cpu.execute();

    assert.equal(cycles, 2, 'TAY a takes 2 cycles');
    assert.equal(cpu.registers.Y, 0x32, 'TAY transfers A into Y');
    assert.equal(cpu.flags.zero, 0x0, 'Zero flag is clear when A is non zero');
    assert.equal(cpu.flags.negative, 0x0, 'Negative flag is clear when A is not negative');

    cpu.reset();

    cpu.mmc.store(0x600, 0xA8);
    cpu.registers.PC = 0x600;
    cpu.registers.A = 0x0;

    cycles = cpu.execute();

    assert.equal(cycles, 2, 'TAY a takes 2 cycles');
    assert.equal(cpu.registers.Y, 0x0, 'TAY transfers A into Y');
    assert.equal(cpu.flags.zero, 0x1, 'Zero flag is set when A is zero');
    assert.equal(cpu.flags.negative, 0x0, 'Negative flag is clear when A is not negative');

    cpu.reset();

    cpu.mmc.store(0x600, 0xA8);
    cpu.registers.PC = 0x600;
    cpu.registers.A = 0x80;

    cycles = cpu.execute();

    assert.equal(cycles, 2, 'TAY a takes 2 cycles');
    assert.equal(cpu.registers.Y, 0x80, 'TAY transfers A into Y');
    assert.equal(cpu.flags.zero, 0x0, 'Zero flag is clear when A is non zero');
    assert.equal(cpu.flags.negative, 0x1, 'Negative flag is set when A is negative');
});

QUnit.test("TSX", function (assert) {

    cpu.mmc.store(0x600, 0xBA);
    cpu.registers.PC = 0x600;
    cpu.registers.SP = 0x32;

    var cycles = cpu.execute();

    assert.equal(cycles, 2, 'TAX a takes 2 cycles');
    assert.equal(cpu.registers.X, 0x32, 'TAX transfers SP into X');
    assert.equal(cpu.flags.zero, 0x0, 'Zero flag is clear when SP is non zero');
    assert.equal(cpu.flags.negative, 0x0, 'Negative flag is clear when SP is not negative');

    cpu.reset();

    cpu.mmc.store(0x600, 0xBA);
    cpu.registers.PC = 0x600;
    cpu.registers.SP = 0x0;

    cycles = cpu.execute();

    assert.equal(cycles, 2, 'TAX a takes 2 cycles');
    assert.equal(cpu.registers.X, 0x0, 'TAX transfers SP into X');
    assert.equal(cpu.flags.zero, 0x1, 'Zero flag is set when SP is zero');
    assert.equal(cpu.flags.negative, 0x0, 'Negative flag is clear when SP is not negative');

    cpu.reset();

    cpu.mmc.store(0x600, 0xBA);
    cpu.registers.PC = 0x600;
    cpu.registers.SP = 0x80;

    cycles = cpu.execute();

    assert.equal(cycles, 2, 'TAX a takes 2 cycles');
    assert.equal(cpu.registers.X, 0x80, 'TAX transfers SP into X');
    assert.equal(cpu.flags.zero, 0x0, 'Zero flag is clear when SP is non zero');
    assert.equal(cpu.flags.negative, 0x1, 'Negative flag is set when SP is negative');
});

QUnit.test("TXA", function (assert) {

    cpu.mmc.store(0x600, 0x8A);
    cpu.registers.PC = 0x600;
    cpu.registers.X = 0x32;

    var cycles = cpu.execute();

    assert.equal(cycles, 2, 'TXA a takes 2 cycles');
    assert.equal(cpu.registers.A, 0x32, 'TXA transfers X into A');
    assert.equal(cpu.flags.zero, 0x0, 'Zero flag is clear when X is non zero');
    assert.equal(cpu.flags.negative, 0x0, 'Negative flag is clear when X is not negative');

    cpu.reset();

    cpu.mmc.store(0x600, 0x8A);
    cpu.registers.PC = 0x600;
    cpu.registers.X = 0x0;

    cycles = cpu.execute();

    assert.equal(cycles, 2, 'TXA a takes 2 cycles');
    assert.equal(cpu.registers.A, 0x0, 'TXA transfers X into A');
    assert.equal(cpu.flags.zero, 0x1, 'Zero flag is set when X is zero');
    assert.equal(cpu.flags.negative, 0x0, 'Negative flag is clear when X is not negative');

    cpu.reset();

    cpu.mmc.store(0x600, 0x8A);
    cpu.registers.PC = 0x600;
    cpu.registers.X = 0x80;

    cycles = cpu.execute();

    assert.equal(cycles, 2, 'TXA a takes 2 cycles');
    assert.equal(cpu.registers.A, 0x80, 'TXA transfers X into A');
    assert.equal(cpu.flags.zero, 0x0, 'Zero flag is clear when X is non zero');
    assert.equal(cpu.flags.negative, 0x1, 'Negative flag is set when X is negative');
});

QUnit.test("TXS", function (assert) {

    cpu.mmc.store(0x600, 0x9A);
    cpu.registers.PC = 0x600;
    cpu.registers.X = 0x32;

    var cycles = cpu.execute();

    assert.equal(cycles, 2, 'TXS a takes 2 cycles');
    assert.equal(cpu.registers.SP, 0x32, 'TXS transfers X into SP');

});

QUnit.test("TYA", function (assert) {

    cpu.mmc.store(0x600, 0x98);
    cpu.registers.PC = 0x600;
    cpu.registers.Y = 0x32;

    var cycles = cpu.execute();

    assert.equal(cycles, 2, 'TYA a takes 2 cycles');
    assert.equal(cpu.registers.A, 0x32, 'TYA transfers Y into A');
    assert.equal(cpu.flags.zero, 0x0, 'Zero flag is clear when Y is non zero');
    assert.equal(cpu.flags.negative, 0x0, 'Negative flag is clear when Y is not negative');

    cpu.reset();

    cpu.mmc.store(0x600, 0x98);
    cpu.registers.PC = 0x600;
    cpu.registers.Y = 0x0;

    cycles = cpu.execute();

    assert.equal(cycles, 2, 'TYA a takes 2 cycles');
    assert.equal(cpu.registers.A, 0x0, 'TYA transfers Y into A');
    assert.equal(cpu.flags.zero, 0x1, 'Zero flag is set when Y is zero');
    assert.equal(cpu.flags.negative, 0x0, 'Negative flag is clear when Y is not negative');

    cpu.reset();

    cpu.mmc.store(0x600, 0x98);
    cpu.registers.PC = 0x600;
    cpu.registers.Y = 0x80;

    cycles = cpu.execute();

    assert.equal(cycles, 2, 'TYA a takes 2 cycles');
    assert.equal(cpu.registers.A, 0x80, 'TYA transfers Y into A');
    assert.equal(cpu.flags.zero, 0x0, 'Zero flag is clear when Y is non zero');
    assert.equal(cpu.flags.negative, 0x1, 'Negative flag is set when Y is negative');
});

QUnit.module("Assembler", {
    setup: function () {
        var mmc = new JNE.MMC();
        var cpu = new JNE.CPU(mmc);
        window.assembler = new JNE.Assembler(cpu);
    },
    teardown: function () {
        window.assembler = null;
    }
});

QUnit.test("ADC", function (assert) {

    // IMMEDIATE
    var bytes = assembler.assemble('ADC #$42');
    var expected = [0x69, 0x42];
    assert.deepEqual(bytes, expected, 'ADC #$42 assembles');

    // ZERO PAGE
    bytes = assembler.assemble('ADC $10');
    expected = [0x65, 0x10];
    assert.deepEqual(bytes, expected, 'ADC $10 assembles');

    // ABSOLUTE
    bytes = assembler.assemble('ADC $1020');
    expected = [0x6D, 0x20, 0x10];
    assert.deepEqual(bytes, expected, 'ADC $1020 assembles');

    // INDEXED INDIRECT
    bytes = assembler.assemble('ADC ($10,X)');
    expected = [0x61, 0x10];
    assert.deepEqual(bytes, expected, 'ADC ($10,X) assembles');

    // INDIRECT INDEXED
    bytes = assembler.assemble('ADC ($10),Y');
    expected = [0x71, 0x10];
    assert.deepEqual(bytes, expected, 'ADC ($10),Y assembles');

    //IMPLICIT
    assert.throws(
        function(){
            assembler.assemble('ADC');
        },
        /Invalid memory address mode/,
        'Implicit memory address with ADC throws error'
    );

    //ACCUMULATOR
    assert.throws(
        function(){
            assembler.assemble('ADC');
        },
        /Invalid memory address mode/,
        'Accumulator memory address with ADC throws error'
    );

    // INDIRECT (JMP only)
    assert.throws(
        function(){
            assembler.assemble('ADC ($1000)');
        },
        /Invalid memory address mode/,
        'Indirect memory address with ADC throws error'
    );
});

QUnit.test("Label resolution", function(assert){

    var code = 'INX\n' +
        'BPL test\n' +
        'INX\n' +
        'test:\n' +
        'TXA\n';

    var bytes = assembler.assemble(code);

    var expected = [0xe8, 0x10, 0x01, 0xe8, 0x8a];
    assert.deepEqual(bytes, expected, 'Label resolution test with BPL');

});

QUnit.test("Example programs", function(assert){


    code = [
        'init:',
        'JSR init'
    ].join('\n');

    expected = [
        0x20, 0x00, 0x06
    ];

    assert.deepEqual(assembler.assemble(code), expected, 'JSR to label');



    // Testing some example programs from http://skilldrick.github.io/easy6502/#intro are assembled correctly

    var code = [
        'LDA #$01',
        'STA $0200',
        'LDA #$05',
        'STA $0201',
        'LDA #$08',
        'STA $0202'
    ].join('\n');

    var expected = [
        0xa9, 0x01,
        0x8d, 0x00, 0x02,
        0xa9, 0x05,
        0x8d, 0x01, 0x02,
        0xa9, 0x08,
        0x8d, 0x02, 0x02
    ];

    assert.deepEqual(assembler.assemble(code), expected, 'Example program assembly test #1');


    // example #2

    code = [
        'LDA #$c0  ;Load the hex value $c0 into the A register',
        'TAX       ;Transfer the value in the A register to X',
        'INX       ;Increment the value in the X register',
        'ADC #$c4  ;Add the hex value $c4 to the A register',
        'BRK       ;Break - we are done'
    ].join('\n');

    expected = [
        0xa9, 0xc0, 0xaa, 0xe8, 0x69, 0xc4, 0x00
    ];

    assert.deepEqual(assembler.assemble(code), expected, 'Example program assembly test #2');


    // Snake game from same site as above

    code = [
		'    ; Change direction: W A S D',
		'',
		'    define appleL         $00 ; screen location of apple, low byte',
		'    define appleH         $01 ; screen location of apple, high byte',
		'    define snakeHeadL     $10 ; screen location of snake head, low byte',
		'    define snakeHeadH     $11 ; screen location of snake head, high byte',
		'    define snakeBodyStart $12 ; start of snake body byte pairs',
		'    define snakeDirection $02 ; direction (possible values are below)',
		'    define snakeLength    $03 ; snake length, in bytes',
		'',
		'    ; Directions (each using a separate bit)',
		'    define movingUp      1',
		'    define movingRight   2',
		'    define movingDown    4',
		'    define movingLeft    8',
		'',
		'    ; ASCII values of keys controlling the snake',
		'    define ASCII_w      $77',
		'    define ASCII_a      $61',
		'    define ASCII_s      $73',
		'    define ASCII_d      $64',
		'',
		'    ; System variables',
		'    define sysRandom    $fe',
		'    define sysLastKey   $ff',
		'',
		'',
		'    jsr init',
		'    jsr loop',
		'',
		'    init:',
		'        jsr initSnake',
		'    jsr generateApplePosition',
		'    rts',
		'',
		'',
		'    initSnake:',
		'        lda #movingRight  ;start direction',
		'    sta snakeDirection',
		'',
		'    lda #4  ;start length (2 segments)',
		'    sta snakeLength',
		'',
		'    lda #$11',
		'    sta snakeHeadL',
		'',
		'    lda #$10',
		'    sta snakeBodyStart',
		'',
		'    lda #$0f',
		'    sta $14 ; body segment 1',
		'',
		'    lda #$04',
		'    sta snakeHeadH',
		'    sta $13 ; body segment 1',
		'    sta $15 ; body segment 2',
		'    rts',
		'',
		'',
		'    generateApplePosition:',
		'        ;load a new random byte into $00',
		'    lda sysRandom',
		'    sta appleL',
		'',
		'    ;load a new random number from 2 to 5 into $01',
		'    lda sysRandom',
		'    and #$03 ;mask out lowest 2 bits',
		'    clc',
		'    adc #2',
		'    sta appleH',
		'',
		'    rts',
		'',
		'',
		'    loop:',
		'        jsr readKeys',
		'    jsr checkCollision',
		'    jsr updateSnake',
		'    jsr drawApple',
		'    jsr drawSnake',
		'    jsr spinWheels',
		'    jmp loop',
		'',
		'',
		'    readKeys:',
		'        lda sysLastKey',
		'    cmp #ASCII_w',
		'    beq upKey',
		'    cmp #ASCII_d',
		'    beq rightKey',
		'    cmp #ASCII_s',
		'    beq downKey',
		'    cmp #ASCII_a',
		'    beq leftKey',
		'    rts',
		'    upKey:',
		'        lda #movingDown',
		'    bit snakeDirection',
		'    bne illegalMove',
		'',
		'    lda #movingUp',
		'    sta snakeDirection',
		'    rts',
		'    rightKey:',
		'        lda #movingLeft',
		'    bit snakeDirection',
		'    bne illegalMove',
		'',
		'    lda #movingRight',
		'    sta snakeDirection',
		'    rts',
		'    downKey:',
		'        lda #movingUp',
		'    bit snakeDirection',
		'    bne illegalMove',
		'',
		'    lda #movingDown',
		'    sta snakeDirection',
		'    rts',
		'    leftKey:',
		'        lda #movingRight',
		'    bit snakeDirection',
		'    bne illegalMove',
		'',
		'    lda #movingLeft',
		'    sta snakeDirection',
		'    rts',
		'    illegalMove:',
		'        rts',
		'',
		'',
		'    checkCollision:',
		'        jsr checkAppleCollision',
		'    jsr checkSnakeCollision',
		'    rts',
		'',
		'',
		'    checkAppleCollision:',
		'        lda appleL',
		'    cmp snakeHeadL',
		'    bne doneCheckingAppleCollision',
		'    lda appleH',
		'    cmp snakeHeadH',
		'    bne doneCheckingAppleCollision',
		'',
		'    ;eat apple',
		'    inc snakeLength',
		'    inc snakeLength ;increase length',
		'    jsr generateApplePosition',
		'    doneCheckingAppleCollision:',
		'        rts',
		'',
		'',
		'    checkSnakeCollision:',
		'        ldx #2 ;start with second segment',
		'    snakeCollisionLoop:',
		'        lda snakeHeadL,x',
		'    cmp snakeHeadL',
		'    bne continueCollisionLoop',
		'',
		'    maybeCollided:',
		'        lda snakeHeadH,x',
		'    cmp snakeHeadH',
		'    beq didCollide',
		'',
		'    continueCollisionLoop:',
		'        inx',
		'    inx',
		'    cpx snakeLength          ;got to last section with no collision',
		'    beq didntCollide',
		'    jmp snakeCollisionLoop',
		'',
		'    didCollide:',
		'        jmp gameOver',
		'    didntCollide:',
		'        rts',
		'',
		'',
		'    updateSnake:',
		'        ldx snakeLength',
		'    dex',
		'    txa',
		'    updateloop:',
		'        lda snakeHeadL,x',
		'    sta snakeBodyStart,x',
		'    dex',
		'    bpl updateloop',
		'',
		'    lda snakeDirection',
		'    lsr',
		'    bcs up',
		'    lsr',
		'    bcs right',
		'    lsr',
		'    bcs down',
		'    lsr',
		'    bcs left',
		'    up:',
		'        lda snakeHeadL',
		'    sec',
		'    sbc #$20',
		'    sta snakeHeadL',
		'    bcc upup',
		'    rts',
		'    upup:',
		'        dec snakeHeadH',
		'    lda #$1',
		'    cmp snakeHeadH',
		'    beq collision',
		'    rts',
		'    right:',
		'        inc snakeHeadL',
		'    lda #$1f',
		'    bit snakeHeadL',
		'    beq collision',
		'    rts',
		'    down:',
		'        lda snakeHeadL',
		'    clc',
		'    adc #$20',
		'    sta snakeHeadL',
		'    bcs downdown',
		'    rts',
		'    downdown:',
		'        inc snakeHeadH',
		'    lda #$6',
		'    cmp snakeHeadH',
		'    beq collision',
		'    rts',
		'    left:',
		'        dec snakeHeadL',
		'    lda snakeHeadL',
		'    and #$1f',
		'    cmp #$1f',
		'    beq collision',
		'    rts',
		'    collision:',
		'        jmp gameOver',
		'',
		'',
		'    drawApple:',
		'        ldy #0',
		'    lda sysRandom',
		'    sta (appleL),y',
		'    rts',
		'',
		'',
		'    drawSnake:',
		'        ldx #0',
		'    lda #1',
		'    sta (snakeHeadL,x) ; paint head',
		'',
		'    ldx snakeLength',
		'    lda #0',
		'    sta (snakeHeadL,x) ; erase end of tail',
		'    rts',
		'',
		'',
		'    spinWheels:',
		'        ldx #0',
		'    spinloop:',
		'        nop',
		'    nop',
		'    dex',
		'    bne spinloop',
		'    rts',
		'',
		'',
		'    gameOver:'
    ].join('\n');

    expected = [
        0x20, 0x06, 0x06, 0x20, 0x38, 0x06, 0x20, 0x0d, 0x06, 0x20, 0x2a, 0x06, 0x60, 0xa9, 0x02, 0x85, 0x02, 
        0xa9, 0x04, 0x85, 0x03, 0xa9, 0x11, 0x85, 0x10, 0xa9, 0x10, 0x85, 0x12, 0xa9, 0x0f, 0x85, 0x14, 0xa9,
        0x04, 0x85, 0x11, 0x85, 0x13, 0x85, 0x15, 0x60, 0xa5, 0xfe, 0x85, 0x00, 0xa5, 0xfe, 0x29, 0x03, 0x18,
        0x69, 0x02, 0x85, 0x01, 0x60, 0x20, 0x4d, 0x06, 0x20, 0x8d, 0x06, 0x20, 0xc3, 0x06, 0x20, 0x19, 0x07,
        0x20, 0x20, 0x07, 0x20, 0x2d, 0x07, 0x4c, 0x38, 0x06, 0xa5, 0xff, 0xc9, 0x77, 0xf0, 0x0d, 0xc9, 0x64,
        0xf0, 0x14, 0xc9, 0x73, 0xf0, 0x1b, 0xc9, 0x61, 0xf0, 0x22, 0x60, 0xa9, 0x04, 0x24, 0x02, 0xd0, 0x26,
        0xa9, 0x01, 0x85, 0x02, 0x60, 0xa9, 0x08, 0x24, 0x02, 0xd0, 0x1b, 0xa9, 0x02, 0x85, 0x02, 0x60, 0xa9,
        0x01, 0x24, 0x02, 0xd0, 0x10, 0xa9, 0x04, 0x85, 0x02, 0x60, 0xa9, 0x02, 0x24, 0x02, 0xd0, 0x05, 0xa9,
        0x08, 0x85, 0x02, 0x60, 0x60, 0x20, 0x94, 0x06, 0x20, 0xa8, 0x06, 0x60, 0xa5, 0x00, 0xc5, 0x10, 0xd0,
        0x0d, 0xa5, 0x01, 0xc5, 0x11, 0xd0, 0x07, 0xe6, 0x03, 0xe6, 0x03, 0x20, 0x2a, 0x06, 0x60, 0xa2, 0x02,
        0xb5, 0x10, 0xc5, 0x10, 0xd0, 0x06, 0xb5, 0x11, 0xc5, 0x11, 0xf0, 0x09, 0xe8, 0xe8, 0xe4, 0x03, 0xf0,
        0x06, 0x4c, 0xaa, 0x06, 0x4c, 0x35, 0x07, 0x60, 0xa6, 0x03, 0xca, 0x8a, 0xb5, 0x10, 0x95, 0x12, 0xca,
        0x10, 0xf9, 0xa5, 0x02, 0x4a, 0xb0, 0x09, 0x4a, 0xb0, 0x19, 0x4a, 0xb0, 0x1f, 0x4a, 0xb0, 0x2f, 0xa5,
        0x10, 0x38, 0xe9, 0x20, 0x85, 0x10, 0x90, 0x01, 0x60, 0xc6, 0x11, 0xa9, 0x01, 0xc5, 0x11, 0xf0, 0x28,
        0x60, 0xe6, 0x10, 0xa9, 0x1f, 0x24, 0x10, 0xf0, 0x1f, 0x60, 0xa5, 0x10, 0x18, 0x69, 0x20, 0x85, 0x10,
        0xb0, 0x01, 0x60, 0xe6, 0x11, 0xa9, 0x06, 0xc5, 0x11, 0xf0, 0x0c, 0x60, 0xc6, 0x10, 0xa5, 0x10, 0x29,
        0x1f, 0xc9, 0x1f, 0xf0, 0x01, 0x60, 0x4c, 0x35, 0x07, 0xa0, 0x00, 0xa5, 0xfe, 0x91, 0x00, 0x60, 0xa2,
        0x00, 0xa9, 0x01, 0x81, 0x10, 0xa6, 0x03, 0xa9, 0x00, 0x81, 0x10, 0x60, 0xa2, 0x00, 0xea, 0xea, 0xca,
        0xd0, 0xfb, 0x60
    ];

    assert.deepEqual(assembler.assemble(code), expected, 'Assemble complete snake game from http://skilldrick.github.io/easy6502/#snake');

});
