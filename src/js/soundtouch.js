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
* Lesser General Public License for more details.
*
* You should have received a copy of the GNU Lesser General Public
* License along with this library; if not, write to the Free Software
* Foundation, Inc., 59 Temple Place, Suite 330, Boston, MA  02111-1307  USA
*/

function SoundTouch() {
    this.rateTransposer = new RateTransposer(false);
    this.tdStretch = new Stretch(false);

    this._inputBuffer = new FifoSampleBuffer();
    this._intermediateBuffer = new FifoSampleBuffer();
    this._outputBuffer = new FifoSampleBuffer();

    this._rate = 0;
    this.tempo = 0;

    this.virtualPitch = 1.0;
    this.virtualRate = 1.0;
    this.virtualTempo = 1.0;

    this._calculateEffectiveRateAndTempo();
}

extend(SoundTouch.prototype, {
    clear: function () {
        rateTransposer.clear();
        tdStretch.clear();
    },

    clone: function () {
        var result = new SoundTouch();
        result.rate = rate;
        result.tempo = tempo;
        return result;
    },

    get rate() {
        return this._rate;
    },

    set rate(rate) {
        this.virtualRate = rate;
        this._calculateEffectiveRateAndTempo();
    },

    set rateChange(rateChange) {
        this.rate = 1.0 + 0.01 * rateChange;
    },

    get tempo() {
        return this._tempo;
    },

    set tempo(tempo) {
        this.virtualTempo = tempo;
        this._calculateEffectiveRateAndTempo();
    },

    set tempoChange(tempoChange) {
        this.tempo = 1.0 + 0.01 * tempoChange;
    },

    set pitch(pitch) {
        this.virtualPitch = pitch;
        this._calculateEffectiveRateAndTempo();
    },

    set pitchOctaves(pitchOctaves) {
        this.pitch = Math.exp(0.69314718056 * pitchOctaves);
        this._calculateEffectiveRateAndTempo();
    },

    set pitchSemitones(pitchSemitones) {
        this.pitchOctaves = pitchSemitones / 12.0;
    },

    get inputBuffer() {
        return this._inputBuffer;
    },

    get outputBuffer() {
        return this._outputBuffer;
    },

    _calculateEffectiveRateAndTempo: function () {
        var previousTempo = this._tempo;
        var previousRate = this._rate;

        this._tempo = this.virtualTempo / this.virtualPitch;
        this._rate = this.virtualRate * this.virtualPitch;

        if (testFloatEqual(this._tempo, previousTempo)) {
            this.tdStretch.tempo = this._tempo;
        }
        if (testFloatEqual(this._rate, previousRate)) {
            this.rateTransposer.rate = this._rate;
        }

        if (this._rate > 1.0) {
            if (this._outputBuffer != this.rateTransposer.outputBuffer) {
                this.tdStretch.inputBuffer = this._inputBuffer;
                this.tdStretch.outputBuffer = this._intermediateBuffer;

                this.rateTransposer.inputBuffer = this._intermediateBuffer;
                this.rateTransposer.outputBuffer = this._outputBuffer;
            }
        }
        else {
            if (this._outputBuffer != this.tdStretch.outputBuffer) {
                this.rateTransposer.inputBuffer = this._inputBuffer;
                this.rateTransposer.outputBuffer = this._intermediateBuffer;

                this.tdStretch.inputBuffer = this._intermediateBuffer;
                this.tdStretch.outputBuffer = this._outputBuffer;
            }
        }
    },

    process: function () {
        if (this._rate > 1.0) {
            this.tdStretch.process();
            this.rateTransposer.process();
        }
        else {
            this.rateTransposer.process();
            this.tdStretch.process();
        }
    }
});
