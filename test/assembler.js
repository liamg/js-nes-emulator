
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
