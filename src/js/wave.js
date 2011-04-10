function WaveBuilder() {
    this.builder = new BlobBuilder();
    this.numFrames = 0;
    this.numChannels = 2;
}

WaveBuilder.prototype = {
    appendInterleaved: function (interleavedFrames) {
        var buff = new Int16Array(interleavedFrames.length);
        for (var i = 0; i < interleavedFrames.length; i ++) {
            buff[i] = interleavedFrames[i] * 32767;
        }
        this.builder.append(buff.buffer);
        this.numFrames += interleavedFrames.length / this.numChannels;
    },

    generateBlob: function () {
        var finalBlobBuilder = new BlobBuilder();
        finalBlobBuilder.append(buildWaveHeader({numChannels: this.numChannels, numFrames: this.numFrames}));
        finalBlobBuilder.append(this.builder.getBlob());
        return finalBlobBuilder.getBlob('audio/x-wav');
    }
}

// https://ccrma.stanford.edu/courses/422/projects/WaveFormat/
function buildWaveHeader(opts) {
    var numFrames = opts.numFrames;
    var numChannels = opts.numChannels || 2;
    var sampleRate = opts.sampleRate || 44100;
    var bytesPerSample = opts.bytesPerSample || 2;
    var blockAlign = numChannels * bytesPerSample;
    var byteRate = sampleRate * blockAlign;
    var dataSize = numFrames * blockAlign;

    var buffer = new ArrayBuffer(44);
    var dv = new DataView(buffer);

    var p = 0;

    function writeString(s) {
        for (var i = 0; i < s.length; i++) {
            dv.setUint8(p + i, s.charCodeAt(i));
        }
        p += s.length;
    }

    function writeUint32(d) {
        dv.setUint32(p, d, true);
        p += 4;
    }

    function writeUint16(d) {
        dv.setUint16(p, d, true);
        p += 2;
    }

    writeString('RIFF');              // ChunkID
    writeUint32(dataSize + 36);       // ChunkSize
    writeString('WAVE');              // Format
    writeString('fmt ');              // Subchunk1ID
    writeUint32(16);                  // Subchunk1Size
    writeUint16(1);                   // AudioFormat
    writeUint16(numChannels);         // NumChannels
    writeUint32(sampleRate);          // SampleRate
    writeUint32(byteRate);            // ByteRate
    writeUint16(blockAlign);          // BlockAlign
    writeUint16(bytesPerSample * 8);  // BitsPerSample
    writeString('data');              // Subchunk2ID
    writeUint32(dataSize);            // Subchunk2Size

    return buffer;
}

function WaveReader(blob) {
    this.blob = blob;
    this.headerReader = new FileReader();

    var that = this;

    function handleHeader(e) {
        that.header = e.target.result;
        var headerView = new DataView(that.header);
        //that.chunkId = that.header.substr(0, 4);
        that.dataSize = headerView.getUint32(4, true) - 36;

        //that.riffType = that.header.substr(8, 4);
        //that.fmtChunkId = that.header.substr(12, 4);
        that.fmtChunkSize = headerView.getUint32(16, true);
        that.audioFormat = headerView.getUint16(20, true);
        that.numChannels = headerView.getUint16(22, true);
        that.sampleRate = headerView.getUint32(24, true);
        that.byteRate = headerView.getUint32(28, true);
        that.blockAlign = headerView.getUint16(32, true);
        that.bitsPerSample = headerView.getUint16(34, true);
        //that.dataChunkId = that.header.substr(36, 4);

        that.data = blob.slice(44, that.blob.size - 44);
        that.onheaders();
    }

    this.headerReader.onloadend = handleHeader;
    this.headerReader.readAsArrayBuffer(blob.slice(0, 44));
}

WaveReader.prototype = {
    onheaders: function () {},

    fill: function (buffer, offset, callback) {
        var reader = new FileReader();
        reader.onloadend = function () {
            var ints = new Int16Array(reader.result);
            for (var i = 0; i < buffer.length; i++) {
                buffer[i] = ints[i] / 32767;
            }
            callback(buffer);
        };
        // TODO handle 32 bit samples
        var blob = this.data.slice(offset * 2, buffer.length * 2);
        reader.readAsArrayBuffer(blob);
    }
};

function BufferQueue() {
    this.empty = [];
    this.full = [];
}

BufferQueue.prototype = {
    start: function () {
        var length = this.empty.length;
        var i = 0;
        while (i++ < length && this.empty.length > 0) {
            this.emptyBufferAvailable();
        }
    },

    enqueueEmpty: function (buffer) {
        this.empty.push(buffer);
        this.emptyBufferAvailable();
    },

    enqueueFull: function (buffer) {
        this.full.push(buffer);
        this.fullBufferAvailable();
    },

    dequeueEmpty: function () {
        return this.empty.pop();
    },

    dequeueFull: function () {
        return this.full.shift();
    },

    emptyBufferAvailable: function () {

    },

    fullBufferAvailable: function () {

    },
};


function AsyncSource(reader, bufferSize, bufferCount) {
    this.reader = reader;
    this.position = 0;
    this.buffer = null;
    this.currentBuffer = AsyncSource.EMPTY;
    this.bufferCount = bufferCount;
    this.bufferSize = bufferSize;
    
    this.queue = new BufferQueue();
    var that = this;
    this.queue.emptyBufferAvailable = function () {
        var buffer = that.queue.dequeueEmpty();
        reader.fill(buffer, that.position, function () {
            that.queue.enqueueFull(buffer);
        });
        that.position += buffer.length;
    }
}

AsyncSource.EMPTY = new Float32Array(0);

AsyncSource.prototype = {
    alloc: function () {
        for (var i = 0; i < this.bufferCount; i++) {
            var b = new Float32Array(this.bufferSize);
            this.queue.enqueueEmpty(b);
        }
    },
    
    start: function () {
        this.queue.start();
    },

    get: function (numSamples) {
        if (this.currentBuffer.length === 0) {
            if (this.buffer) {
                this.queue.enqueueEmpty(this.buffer);
            }
            this.buffer = this.queue.dequeueFull();
            if (!this.buffer) {
                return AsyncSource.EMPTY;
            }
            this.currentBuffer = this.buffer;
        }
        return this.currentBuffer.subarray(0, numSamples);
    },
    
    advance: function (numSamples) {
        this.currentBuffer = this.currentBuffer.subarray(numSamples);
    }
};
