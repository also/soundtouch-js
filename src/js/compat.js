(function () {
var typedArrays = [Int8Array, Uint8Array, Int16Array, Uint16Array, Int32Array, Uint32Array, Float32Array];
if (window.Float64Array) {
    typedArrays.push(Float64Array);
}

// fix for webkit pre slice rename
if (!Float32Array.prototype.subarray) {
    typedArrays.forEach(function (cls) {
        cls.prototype.subarray = cls.prototype.slice;
    });
}
// fix for https://bugzilla.mozilla.org/show_bug.cgi?id=637643
else if (new Int8Array([0, 1, 0]).subarray(1).subarray(1)[0]) {
    function subarray (begin, end) {
        if (arguments.length === 0) {
            // duplicate the array
            return new this.constructor(this.buffer, this.byteOffset, this.length);
        }
        else {
            if (begin < 0) {
                // relative to end
                begin += this.length;
            }
            // clamp to 0, length
            begin = Math.max(0, Math.min(this.length, begin));
            if (arguments.length < 2) {
                // slice to end
                end = this.length;
            }
            else {
                if (end < 0) {
                    // relative to end
                    end += this.length;
                }
                // clamp to begin, length
                end = Math.max(begin, Math.min(this.length, end));
            }

            var byteOffset = this.byteOffset + begin * this.BYTES_PER_ELEMENT;
            return new this.constructor(this.buffer, byteOffset, end - begin);
        }
    }
    typedArrays.forEach(function (cls) {
        cls.prototype.subarray = subarray;
    });
}

if (!FileReader.prototype.readAsArrayBuffer) {
    FileReader.prototype.readAsArrayBuffer = function readAsArrayBuffer () {
        this.readAsBinaryString.apply(this, arguments);
        this.__defineGetter__('resultString', this.__lookupGetter__('result'));
        Object.defineProperty(this, 'result', {
            get: function () {
                var string = this.resultString;
                var result = new Uint8Array(string.length);
                for (var i = 0; i < string.length; i++) {
                    result[i] = string.charCodeAt(i);
                }
                return result.buffer;
            }
        });
    };
}


if (!window.DataView) {
    function DataView(buffer) {
        this.buffer = buffer;
        this.bytes = new Uint8Array(buffer);
    }

    // DataView polyfill
    // we exploit the fact that only little-endian processors actually exist
    DataView.prototype = {
        getUint32: function (byteOffset) {
            return new Uint32Array(this.buffer, byteOffset, 1)[0];
        },

        getUint16: function (byteOffset) {
            return new Uint16Array(this.buffer, byteOffset, 1)[0];
        }
    };
    window.DataView = DataView;
}
})();
