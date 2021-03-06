var EventEmitter = require('events').EventEmitter;
var Hash = require('traverse').Hash;

Lazy.prototype = new EventEmitter;
module.exports = Lazy;
function Lazy (em, opts) {
    if (!(this instanceof Lazy)) return new Lazy(em, opts);
    var self = this;
    if (em) {
        if (!em._events) em._events = {};
        self._events = em._events;
    }
    
    self.once = function (name, f) {
        self.on(name, function g () {
            self.removeListener(name, g);
            f.apply(this, arguments);
        });
    }
    
    if (!opts) opts = {};
    var dataName = opts.data || 'data';
    var pipeName = opts.pipe || 'pipe';
    var endName = opts.pipe || 'end';
    
    if (pipeName != endName) {
        var piped = false;
        self.once(pipeName, function () { piped = true });
        self.once(endName, function () {
            if (!piped) self.emit('pipe');
        });
    }
    
    function newLazy (g, h) {
        if (!g) g = function () { return true };
        if (!h) h = function (x) { return x };
        var lazy = new Lazy(null, opts);
        self.on(dataName, function (x) {
            if (g.call(lazy, x)) lazy.emit(dataName, h(x));
        });
        self.once(pipeName, function () {
            lazy.emit(pipeName)
        });
        return lazy;
    }
    
    self.filter = function (f) {
        return newLazy(function (x) {
            return f(x);
        });
    }

    self.forEach = function (f) {
        return newLazy(function (x) {
            f(x);
            return true;
        });
    }

    self.map = function (f) {
        return newLazy(
            function () { return true },
            function (x) { return f(x) }
        );
    }

    self.head = function (f) {
        var lazy = newLazy();
        lazy.on(dataName, function g (x) {
            f(x)
            lazy.removeListener(dataName, g)
        })
    }

    self.tail = function () {
        var skip = true;
        return newLazy(function () {
            if (skip) {
                skip = false;
                return false;
            }
            return true;
        });
    }

    self.take = function (n) {
        return newLazy(function () {
            if (n == 0) self.emit(pipeName);
            return n-- > 0;
        });
    }

    self.takeWhile = function (f) {
        var cond = true;
        return newLazy(function (x) {
            if (cond && f(x)) return true;
            cond = false;
            self.emit(pipeName);
            return false;
        });
    }

    self.foldr = function (op, i, f) {
        var acc = i;
        var lazy = newLazy();
        lazy.on(dataName, function g (x) {
            acc = op(x, acc);
        });
        lazy.once(pipeName, function () {
            f(acc);
        });
    }

    self.sum = function (f) {
        return self.foldr(function (x, acc) { return x + acc }, 0, f);
    }

    self.product = function (f) {
        return self.foldr(function (x, acc) { return x*acc }, 1, f);
    }

    self.join = function (f) {
        var data = []
        var lazy = newLazy(function (x) {
            data.push(x);
            return true;
        });
        lazy.once(pipeName, function () { f(data) });
        return self;
    }
}

