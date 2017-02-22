
QUnit.module("PPU", {
    setup: function () {
        window.mmc = new JNE.MMC();
        window.ppu = new JNE.PPU(window.mmc);
    },
    teardown: function () {
        window.ppu = null;
        window.mmc = null;
    }
});

/**
QUnit.test("PPU", function (assert) {

    //assert.equal(

});
 */