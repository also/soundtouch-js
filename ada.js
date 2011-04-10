function AsyncPlayer (source) {
    this.source = source;
    
    var audio = new Audio();
    audio.mozSetup(2, sampleRate);
    var interval;

    var writePosition = 0;
    
    function write() {
        var needed;

        var playPosition = audio.mozCurrentSampleOffset();
        while ((needed = playPosition + bufferSize - writePosition) > 0) {
            var buffer = source.get(needed);
            if (!buffer || buffer.length === 0) {
                console.log('underflow');
                return;
            }
            var written = audio.mozWriteAudio(buffer);
            source.advance(written);
            writePosition += written;
            if (written < buffer.length) {
                console.log('full');
                break;
            }
        }
    }
    
    this.play = function play() {
        interval = interval || setInterval(write, 100);
        source.start();
    };

    this.pause = function pause() {
        interval = clearInterval(interval);
    }
}

function FilterPlayer(filter) {
    this.filter = filter;
    var audio = new Audio();
    audio.mozSetup(2, sampleRate);
    var interval;

    var writePosition = 0;
    var buffer = new Float32Array(bufferSize);
    function write() {
        var needed;

        var playPosition = audio.mozCurrentSampleOffset();
        while ((needed = playPosition + bufferSize - writePosition) > 0) {
            // FIXME lazy
            filter.extract(buffer, bufferSize / 2)
            var written = audio.mozWriteAudio(buffer);
            writePosition += written;
            if (written < buffer.length) {
                console.log('full');
                break;
            }
        }
    }
    
    this.play = function play() {
        interval = interval || setInterval(write, 100);
    };

    this.pause = function pause() {
        interval = clearInterval(interval);
    }
}