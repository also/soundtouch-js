/*
* SoundTouch JS audio processing library
* Copyright (c) Olli Parviainen
* Copyright (c) Ryan Berdeen
*
* This library is free software; you can redistribute it and/or
* modify it under the terms of the GNU Lesser General Public
* License as published by the Free Software Foundation; either
* version 2.1 of the License, or (at your option) any later version.
*
* This library is distributed in the hope that it will be useful,
* but WITHOUT ANY WARRANTY; without even the implied warranty of
* MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
* Lesser General License for more details.
*
* You should have received a copy of the GNU Lesser General Public
* License along with this library; if not, write to the Free Software
* Foundation, Inc., 59 Temple Place, Suite 330, Boston, MA  02111-1307  USA
*/

function RateTransposer(createBuffers) {
    AbstractFifoSamplePipe.call(this, createBuffers);
    this._reset();
    this.rate = 1;
}

extend(RateTransposer.prototype, AbstractFifoSamplePipe.prototype);
extend(RateTransposer.prototype, {
    set rate(rate) {
        this._rate = rate;
        // TODO aa filter
    },

    _reset: function () {
        this.slopeCount = 0;
        this.prevSampleL = 0;
        this.prevSampleR = 0;
    },

    clone: function () {
        var result = new RateTransposer();
        result.rate = this._rate;
        return result;
    },

    process: function () {
        // TODO aa filter
        var numFrames = this._inputBuffer.frameCount;
        this._outputBuffer.ensureAdditionalCapacity(numFrames / this._rate + 1);
        var numFramesOutput = this._transpose(numFrames);
        this._inputBuffer.receive();
        this._outputBuffer.put(numFramesOutput);
    },

    _transpose: function (numFrames) {
        if (numFrames == 0) {
            // no work
            return 0;
        }

        var src = this._inputBuffer.vector;
        var srcOffset = this._inputBuffer.startIndex;

        var dest = this._outputBuffer.vector;
        var destOffset = this._outputBuffer.endIndex;

        var used = 0;
        var i = 0;

        while(this.slopeCount < 1.0) {
            dest[destOffset + 2 * i] = (1.0 - this.slopeCount) * this.prevSampleL + this.slopeCount * src[srcOffset];
            dest[destOffset + 2 * i + 1] = (1.0 - this.slopeCount) * this.prevSampleR + this.slopeCount * src[srcOffset + 1];
            i++;
            this.slopeCount += this._rate;
        }

        this.slopeCount -= 1.0;

        if (numFrames != 1) {
            out: while (true) {
                while (this.slopeCount > 1.0) {
                    this.slopeCount -= 1.0;
                    used++;
                    if (used >= numFrames - 1) {
                        break out;
                    }
                }

                var srcIndex = srcOffset + 2 * used;
                dest[destOffset + 2 * i] = (1.0 - this.slopeCount) * src[srcIndex] + this.slopeCount * src[srcIndex + 2];
                dest[destOffset + 2 * i + 1] = (1.0 - this.slopeCount) * src[srcIndex + 1] + this.slopeCount * src[srcIndex + 3];

                i++;
                this.slopeCount += this._rate;
            }
        }

        this.prevSampleL = src[srcOffset + 2 * numFrames - 2];
        this.prevSampleR = src[srcOffset + 2 * numFrames - 1];

        return i;
    }
});