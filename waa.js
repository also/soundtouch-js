var context = new webkitAudioContext();

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
    var buffer = context.createBuffer(arrayBuffer, false);
    console.log('loaded audio in ' + (new Date() - start));
    
    source = new BufferFilterSource(buffer);
}

var BUFFER_SIZE = 4096;

function createFilterNode(context, filter, bufferSize) {
    var node = context.createJavaScriptNode(bufferSize, 1, 1);

    var samples = new Float32Array(bufferSize * 2);

    node.onaudioprocess = function (e) {
        var l = e.outputBuffer.getChannelData(0);
        var r = e.outputBuffer.getChannelData(1);
        var framesExtracted = f.extract(samples, bufferSize);
        if (framesExtracted == 0) {
            pause();
        }
    
        wb.appendInterleaved(samples);
        for (var i = 0; i < framesExtracted; i++) {
            l[i] = samples[i * 2];
            r[i] = samples[i * 2 + 1];
        }
    };
    return node;
}

function BufferFilterSource(buffer) {
    this.buffer = buffer;
    this.l = buffer.getChannelData(0);
    this.r = buffer.getChannelData(1);
}

BufferFilterSource.prototype = {
    extract: function (target, numFrames, position) {
        for (var i = 0; i < numFrames; i++) {
            target[i * 2] = this.l[i + position];
            target[i * 2 + 1] = this.r[i + position];
        }
        return Math.min(numFrames, this.l.length - position);
    }
}

function AsyncPlayer(source) {
    this.source = source;

    var node = context.createJavaScriptNode(BUFFER_SIZE, 1, 1);
    
    node.onaudioprocess = function (e) {
        var l = e.outputBuffer.getChannelData(0);
        var r = e.outputBuffer.getChannelData(1);
        var i = 0;
        var samples;
        var remaining = BUFFER_SIZE * 2;
        while ((samples = source.get(remaining)) && samples.length > 0) {
            // FIXME
            // if (framesExtracted == 0) {
            //     pause();
            // }
        
            for (var j = 0; j < samples.length; j += 2, i++) {
                l[i] = samples[j];
                r[i] = samples[j + 1];
            }
            remaining -= samples.length;
            source.advance(samples.length);
        }
    };
    
    this.play = function play() {
        node.connect(context.destination);
        source.start();
    }

    this.pause = function pause() {
        node.disconnect();
    }
}

function FilterPlayer(filter) {
    this.filter = filter;
    this.context = context;
    var node = context.createJavaScriptNode(BUFFER_SIZE, 1, 1);

    var samples = new Float32Array(BUFFER_SIZE * 2);

    node.onaudioprocess = function (e) {
        var l = e.outputBuffer.getChannelData(0);
        var r = e.outputBuffer.getChannelData(1);
        var framesExtracted = filter.extract(samples, BUFFER_SIZE);
        if (framesExtracted == 0) {
            pause();
        }

        //wb.appendInterleaved(samples);
        for (var i = 0; i < framesExtracted; i++) {
            l[i] = samples[i * 2];
            r[i] = samples[i * 2 + 1];
        }
    };

    this.play = function play() {
        node.connect(context.destination);
    }

    this.pause = function pause() {
        node.disconnect();
    }
}