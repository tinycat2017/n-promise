const Util = {
    isFunction(val) {
      return val && typeof val === "function";
    },
    runAsyncCall(callback) {
        setTimeout(callback,0)
    },
    isObject(val) {
        return val && typeof val === "object";
    },
    isPromise(val) {
        return val && val instanceof NPromise;
    }
}
const isValidStatus = status => {
    return status === Status.Pending || Status.Resolved || Status.Rejected
}

const Status = {
    Pending: 'pending',
    Resolved: 'resolved',
    Rejected: 'rejected'
}

class NPromise{
    constructor(executor) {
        this.status = Status.Pending // Promise 的状态
        this.value = null // Promise 的值
        this._handlers = {
            fulfilled: null,
            rejected: null
        }; // then 方法里注册的回调函数
        this.promiseQueue = [] 

        if (executor) {
            try {
                executor(val => {
                    this.Resolve(this,val)
                }, err => {
                    this.reject(err)
                }) 
            } catch (err) {
                this.reject(err)
            }
        }
    }
    Resolve(promise, x) {
        if (promise === x) {
            return promise.transition(Status.Rejected, new TypeError('circular reference'))
        } else if (Util.isPromise(x)) {
            if (x.status === Status.Pending) {
                x.then(val => {
                    this.Resolve(promise,val)
                }, err => {
                    promise.transition(Status.Rejected, err)
                })
            } else {
                // 如果 x 的状态已不为 pending，则 promise的状态为 x 已经确定的状态
                promise.transition(x.status, x.value)
            }
        } else if (Util.isObject(x) || Util.isFunction(x)) {
            let called = false
            try {
                let then = x.then
                // 如果 x 有then函数，则让 x 的行为同定义的 promise 一样，因此引入一个called变量来约束，使得回调函数只能执行一次
                if (Util.isFunction(then)) {
                    then.call(x, y => {
                        if (called) return
                        called = true
                        this.Resolve(promise,y)
                    }, err => {
                        if (called) return
                        called = true
                        promise.reject(err)
                    })
                } else {
                    called = true
                    promise.fulfill(x)
                }
            } catch (err) {
                if (called) return
                called = true
                promise.reject(err)
            }
        } else {
            promise.fulfill(x)
        }
    }
    fulfill(value) {
        this.transition(Status.Resolved, value)
    }
    reject(err) {
        this.transition(Status.Rejected, err)
    }
    transition(status, value) {
        // 判断当前 promise 是否可以更改状态
        if (this.status === status || !isValidStatus(status) || this.status !== Status.Pending || arguments.length !== 2) {
            return
        }
        this.status = status
        this.value = value
        this.processCallback()
    }
    processCallback() {
        let onFulFilledCallback = value => value
        let onRejectedCallback = err => { throw err }
        if (this.status === Status.Pending) return
        Util.runAsyncCall(() => {
            while (this.promiseQueue.length) {
                let promise = this.promiseQueue.shift()
                let handle = null
                let value

                if (this.status === Status.Resolved) {
                    handle = promise._handlers.fulfilled || onFulFilledCallback
                } else if (this.status === Status.Rejected){
                    handle = promise._handlers.rejected || onRejectedCallback
                }

                try {
                    value = handle(this.value)
                } catch (e) {
                    promise.transition(Status.Rejected, e)
                    continue
                }
                this.Resolve(promise, value)
            }
        })
    }
    then(onFulFilled, onRejected) {
        let promise = new NPromise()
        if (Util.isFunction(onFulFilled)) {
            promise._handlers.fulfilled = onFulFilled
        }

        if (Util.isFunction(onRejected)) {
            promise._handlers.rejected = onRejected
        }
        this.promiseQueue.push(promise)
        this.processCallback()
        return promise
    }
}

module.exports = {
    resolved: function (value) {
        return new NPromise(function (resolve) {
            resolve(value);
        });
    },
    rejected: function (reason) {
        return new NPromise(function (resolve, reject) {
            reject(reason);
        });
    },
    deferred: function () {
        var resolve, reject;
        return {
            promise: new NPromise(function (rslv, rjct) {
                resolve = rslv;
                reject = rjct;
            }),
            resolve: resolve,
            reject: reject
        };
    }
};