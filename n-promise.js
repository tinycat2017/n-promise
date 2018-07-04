class Promise {
    constructor(executor) {
        this.status = 'pending'
        this.value = undefined
        this.reason = undefined
        this.onResolvedCallbacks = []
        this.onRejectedCallbacks = []

        let resolve = val => {
            if (this.status === 'pending') {
                this.value = val
                this.status = 'resolved'
                this.onResolvedCallbacks.forEach(callback => callback())
            }
        }

        let reject = err => {
            if (this.status === 'pending') {
                this.reason = err;
                this.status = 'rejected'
                this.onRejectedCallbacks.forEach(callback => callback())
            }
        }

        try {
            executor(resolve, reject)
        } catch (err) {
            reject(err)
        }
    }
    then(onFulfilled, onRejected) {
        onFulfilled = typeof onFulfilled === 'function' ? onFulfilled : value => value
        onRejected = typeof onRejected === 'function' ? onRejected : (err) => {
            throw err
        }

        let promise2 = new Promise((resolve, reject) => {
            if (this.status === 'resolved') {
                setTimeout(() => {
                    try {
                        let x = onFulfilled(this.value)
                        reslovePromise(promise2, x, resolve, reject)
                    } catch (error) {
                        reject(error)
                    }
                }, 0)
            }
            if (this.status === 'rejected') {
                setTimeout(() => {
                    try {
                        let x = onRejected(this.reason)
                        reslovePromise(promise2, x, resolve, reject)
                    } catch (error) {
                        reject(error)
                    }
                }, 0)
            }
            if (this.status === 'pending') {
                this.onResolvedCallbacks.push(() => {
                    setTimeout(() => {
                        try {
                            let x = onFulfilled(this.value)
                            reslovePromise(promise2, x, resolve, reject)
                        } catch (error) {
                            reject(error)
                        }
                    }, 0)
                })
                this.onRejectedCallbacks.push(() => {
                    setTimeout(() => {
                        try {
                            let x = onRejected(this.reason)
                            reslovePromise(promise2, x, resolve, reject)
                        } catch (error) {
                            reject(error)
                        }
                    }, 0)
                })
            }
        })
        return promise2
    }
    catch(fn){
      return this.then(null,fn);
    }
}
Promise.all = promiseArrays => {
    return new Promise((resolve, reject) => {
        let arrays = [];
        let index = 0;
        let handleData = (data,i) => {
            arrays[i] = data
            index++;
            if (index === promiseArrays.length) {
                resolve(arrays)
            }
        }

        for (let i = 0; i < promiseArrays.length; i++){
            promiseArrays.then(res => {
                handleData(res,i)
            }, reject)
        }
    })
}

Promise.race = promiseArrays => {
    return new Promise((resolve, reject) => {
        for (let i = 0; i < promiseArrays.length; i++){
            promiseArrays.then(resolve, reject)
        }
    })
}

Promise.resolve = value => {
    return new Promise((resolve, reject) => {
        resolve(value)
    })
}

Promise.reject = err => {
    return new Promise((resolve, reject) => {
        reject(err)
    })
}

function reslovePromise(promise2, x, resolve, reject) {
    if (promise2 === x) {
        return reject(new TypeError('same interface'))
    }
    let called = false
    if (x != null && (typeof x === 'function' || typeof x === 'object')) {
        try {
            let then = x.then
            if (typeof then === 'function') {
                then.call(x, y => {
                    if (called) return
                    called = true
                    reslovePromise(promise2, y, resolve, reject)
                }, err => {
                    if (called) return
                    called = true
                    reject(err)
                })
            } else {
                resolve(x)
            }
        }catch (error) {
            if (called) return
            called = true
            reject(error)
        }
    } else {
        resolve(x)
    }
}
Promise.defer = Promise.deferred = function () {
    let dfd = {}
    dfd.promise = new Promise((resolve,reject)=>{
      dfd.resolve = resolve;
      dfd.reject = reject;
    });
    return dfd;
  }
module.exports = Promise;