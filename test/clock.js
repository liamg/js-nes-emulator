
QUnit.module("Clock", {
    setup: function () {
        window.clock = new JNE.Clock();
    },
    teardown: function () {
        window.clock = null;
    }
});

QUnit.asyncTest("Clock frequency is within 1% of bare metal", function(assert){

    var testLength = 5; // seconds

    function endClockTest() {

        clock.stop();

        var marginOfError = 0.01;

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
