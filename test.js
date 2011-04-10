var st = new SoundTouch();
var player;


//loadSample('badromance.mp3')
loadSample('track.mp3');

var wb = new WaveBuilder();
var f;
function init() {
    f = new SimpleFilter(source, st);
    player = new FilterPlayer(f)
}

function save() {
    var frame = document.getElementById('frame');
    frame.src = window.webkitURL.createObjectURL(wb.generateBlob());
}

function play() {
    player.play();
}

function pause() {
    player.pause();
}