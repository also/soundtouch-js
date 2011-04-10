function AsyncFilterSource(source) {
    this.source = source;
}

AsyncFilterSource.prototype = {
    extract: function (target, numFrames, position) {
        var numSamples = numFrames * 2;
        // TODO don't ignore position
        var samples;
        var offset = 0;
        while ((samples = this.source.get(numSamples - offset)) && samples.length > 0) {
            target.set(samples, offset);
            offset += samples.length;
            this.source.advance(samples.length);
        }
    }
}