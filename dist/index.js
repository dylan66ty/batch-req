"use strict";
var BR = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // src/index.ts
  var src_exports = {};
  __export(src_exports, {
    BatchReq: () => BatchReq
  });
  var hashSum = (text) => {
    let hash = 0;
    if (text.length === 0) {
      return hash.toString();
    }
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return hash.toString();
  };
  var BatchReq = class {
    name;
    _queue;
    _chunks;
    _options;
    _timer;
    _counter;
    _snapshots;
    constructor(options) {
      this._queue = [];
      this._chunks = [];
      this._counter = 0;
      this._options = Object.assign({
        limit: 50,
        delay: 100,
        parallel: 3,
        request: async () => {
        },
        subscribe: () => {
        },
        name: "ty"
      }, options);
      this.name = this._options.name;
      this.initSnapshots();
    }
    getKey() {
      return `batch-req_${this.name}`;
    }
    initSnapshots() {
      const snapshots = JSON.parse(localStorage.getItem(this.getKey()) ?? "[]");
      this._snapshots = snapshots;
      this._snapshots.forEach((snapshot) => {
        this.scheduler(this.resolveSnapshot(snapshot));
      });
    }
    saveSnapshots() {
      localStorage.setItem(this.getKey(), JSON.stringify(this._snapshots));
    }
    add(chunk) {
      this._chunks.push(chunk);
      if (this._timer) {
        clearTimeout(this._timer);
      }
      if (this._chunks.length >= this._options.limit) {
        this.slice();
        return;
      }
      this._timer = setTimeout(() => {
        this.slice();
      }, this._options.delay);
    }
    scheduler(promiser) {
      const Wrap = () => {
        const { subscribe } = this._options;
        this._counter++;
        promiser().then((res) => {
          const { error, data, snapshotId } = res;
          if (error) {
            subscribe([error, null]);
          } else {
            subscribe([null, data]);
          }
          const idx = this._snapshots.findIndex((s) => s.id === snapshotId);
          if (idx > -1) {
            this._snapshots.splice(idx, 1);
            this.saveSnapshots();
          }
        }).finally(() => {
          this._counter--;
          if (this._queue.length) {
            this._queue.shift()();
          }
        });
      };
      if (this._counter >= this._options.parallel) {
        this._queue.push(Wrap);
      } else {
        Wrap();
      }
    }
    generateSnapshot(chunks) {
      const id = hashSum(JSON.stringify(chunks));
      const exist = this._snapshots.find((s) => s.id === id);
      if (exist) return;
      const item = {
        id,
        chunks
      };
      this._snapshots.push(item);
      this.saveSnapshots();
      return item;
    }
    resolveSnapshot(snapshot) {
      const { request } = this._options;
      return () => request(snapshot.chunks).then((res) => {
        return {
          data: res,
          snapshotId: snapshot.id
        };
      }).catch((error) => {
        return {
          error,
          snapshotId: snapshot.id
        };
      });
    }
    slice() {
      const { limit } = this._options;
      const chunks = this._chunks.slice(0, limit);
      if (chunks.length) {
        const snapshot = this.generateSnapshot(chunks);
        if (snapshot) {
          this.scheduler(this.resolveSnapshot(snapshot));
        }
        this._chunks = this._chunks.slice(limit);
        this.slice();
      }
    }
  };
  return __toCommonJS(src_exports);
})();
//# sourceMappingURL=index.js.map
