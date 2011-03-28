var t = new RateTransposer(true);
var context = new webkitAudioContext();

var buffer;

loadSample = function(url) {
    var request = new XMLHttpRequest();
    request.open('GET', url, true);
    request.responseType = 'arraybuffer';

    request.onload = function() {
        console.log('url loaded');
        createBuffer(request.response);
    }

    console.log('reading url');
    request.send();
}

function createBuffer(arrayBuffer) {
    offset = 0;
    startTime = 0;
    var start = new Date();
    // NOTE the second parameter is required, or a TypeError is thrown
    buffer = context.createBuffer(arrayBuffer, false);
    console.log('loaded audio in ' + (new Date() - start));
}

loadSample('track.mp3')

var node = context.createJavaScriptNode(1024, 1, 1);

var samples = new Float32Array(2048);

node.onaudioprocess = function (e) {
    var l = e.outputBuffer.getChannelData(0);
    var r = e.outputBuffer.getChannelData(1);
    f.extract(samples, 1024);
    for (var i = 0; i < 1024; i++) {
        l[i] = samples[i * 2];
        r[i] = samples[i * 2 + 1];
    }
};

function play() {
    node.connect(context.destination);
}

function pause() {
    node.disconnect();
}

var source = {
    extract: function (target, numFrames, position) {
        var l = buffer.getChannelData(0);
        var r = buffer.getChannelData(1);
        for (var i = 0; i < numFrames; i++) {
            target[i * 2] = l[i + position];
            target[i * 2 + 1] = r[i + position];
        }
    }
};


f = new SimpleFilter(source, t);