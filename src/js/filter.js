function FilterSupport(pipe) {
    this._pipe = pipe;
}

FilterSupport.prototype = {
    get pipe() {
        return this._pipe;
    },

    get inputBuffer() {
        return this._pipe.inputBuffer;
    },

    get outputBuffer() {
        return this._pipe.outputBuffer;
    },

    // fillInputBuffer: function(numFrames) {
    //     throw new Error("fillInputBuffer() not overridden");
    // },

    fillOutputBuffer: function(numFrames) {
        while (this.outputBuffer.frameCount < numFrames) {
            // TODO hardcoded buffer size
            var numInputFrames = 8192 - this.inputBuffer.frameCount;

            this.fillInputBuffer(numInputFrames);

            if (this.inputBuffer.frameCount < 8192) {
                break;
                // TODO flush pipe
            }

            this._pipe.process();
        }
    },

    clear: function() {
        this._pipe.clear();
    }
};


function SimpleFilter(sourceSound, pipe) {
    FilterSupport.call(this, pipe);
    this.sourceSound = sourceSound;
    this.historyBufferSize = 22050;
    this._sourcePosition = 0;
    this.outputBufferPosition = 0;
    this._position = 0;
}

extend(SimpleFilter.prototype, FilterSupport.prototype);

extend(SimpleFilter.prototype, {
    get position() {
        return this._position;
    },

    set position(position) {
        if (position > this._position) {
            throw new RangeError('New position may not be greater than current position');
        }
        var newOutputBufferPosition = this.outputBufferPosition - (this._position - position);
        if (newOutputBufferPosition < 0) {
            throw new RangeError('New position falls outside of history buffer');
        }
        this.outputBufferPosition = newOutputBufferPosition;
        this._position = position;
    },

    get sourcePosition() {
        return this._sourcePosition;
    },

    set sourcePosition(sourcePosition) {
        this.clear();
        this._sourcePosition = sourcePosition;
    },

    fillInputBuffer: function(numFrames) {
        var samples = new Float32Array(numFrames * 2);
        var numFramesExtracted = this.sourceSound.extract(samples, numFrames, this._sourcePosition);
        this._sourcePosition += numFramesExtracted;
        this.inputBuffer.putSamples(samples);
    },

    extract: function(target, numFrames) {
        this.fillOutputBuffer(this.outputBufferPosition + numFrames);

        var numFramesExtracted = Math.min(numFrames, this.outputBuffer.frameCount - this.outputBufferPosition);
        this.outputBuffer.extract(target, this.outputBufferPosition, numFramesExtracted);

        var currentFrames = this.outputBufferPosition + numFramesExtracted;
        this.outputBufferPosition = Math.min(this.historyBufferSize, currentFrames);
        this.outputBuffer.receive(Math.max(currentFrames - this.historyBufferSize, 0));

        this._position += numFramesExtracted;
        return numFramesExtracted;
    },

    handleSampleData: function(e) {
        this.extract(e.data, 4096);
    },

    clear: function() {
        // TODO yuck
        FilterSupport.prototype.clear.call(this);
        this.outputBufferPosition = 0;
    }
});
