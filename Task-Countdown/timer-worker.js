let timerId;

self.onmessage = function(e) {
    if (e.data === 'start') {
        timerId = setInterval(() => {
            self.postMessage('tick');
        }, 1000);
    } else if (e.data === 'stop') {
        clearInterval(timerId);
    }
};