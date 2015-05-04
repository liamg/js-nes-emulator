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

// @TODO add tests for reset of flags

