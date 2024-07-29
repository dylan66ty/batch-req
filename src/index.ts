

interface Options {
  name: string
  limit: number
  delay: number
  parallel: number
  request: (chunks: any[]) => Promise<any>
  subscribe: (ret: any[]) => void
}

interface Snapshot {
  id: string,
  chunks: any[]
}

interface BatchReqMethods {
  add(chunk: any): void
  scheduler(promiser: () => Promise<any>): void
  slice(): void
}

const hashSum = (text: string) => {
  let hash = 0
  if (text.length === 0) {
    return hash.toString()
  }
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash = hash & hash
  }
  return hash.toString()
}



export class BatchReq implements BatchReqMethods {
  public name: string
  private _queue: (() => void)[]
  private _chunks: any[]
  private _options: Options
  private _timer: NodeJS.Timeout
  private _counter: number
  private _snapshots: Snapshot[]
  constructor(options: Partial<Options>) {
    this._queue = []
    this._chunks = []
    this._counter = 0
    this._options = Object.assign<Options, {}>({
      limit: 50,
      delay: 100,
      parallel: 3,
      request: async () => { },
      subscribe: () => { },
      name: 'ty'
    }, options)
    this.name = this._options.name
    this.initSnapshots()

  }
  private getKey () {
    return `batch-req_${this.name}`
  }
  private initSnapshots() {
    const snapshots = JSON.parse(localStorage.getItem(this.getKey()) ?? '[]')
    this._snapshots = snapshots
    this._snapshots.forEach(snapshot => {
      this.scheduler(this.resolveSnapshot(snapshot))
    })
  }
  private saveSnapshots () {
    localStorage.setItem(this.getKey(), JSON.stringify(this._snapshots))
  }
  public add(chunk) {
    this._chunks.push(chunk)
    if (this._timer) {
      clearTimeout(this._timer)
    }
    if (this._chunks.length >= this._options.limit) {
      this.slice()
      return
    }
    this._timer = setTimeout(() => {
      this.slice()
    }, this._options.delay);
  }
  public scheduler(promiser) {
    const Wrap = () => {
      const { subscribe } = this._options
      this._counter++
      promiser()
        .then((res) => {
          const { error, data, snapshotId } = res
          if (error) {
            subscribe([error, null])
          } else {
            subscribe([null, data])
          }
          const idx = this._snapshots.findIndex(s => s.id === snapshotId)
          if(idx > -1) {
            this._snapshots.splice(idx, 1)
            this.saveSnapshots()
          }
        })
        .finally(() => {
          this._counter--
          if (this._queue.length) {
            this._queue.shift()()
          }
        })
    }
    if (this._counter >= this._options.parallel) {
      this._queue.push(Wrap)
    } else {
      Wrap()
    }
  }
  private generateSnapshot(chunks) {
    const id = hashSum(JSON.stringify(chunks))
    const exist = this._snapshots.find(s => s.id === id)
    if(exist) return
    const item = {
      id,
      chunks,
    }
    this._snapshots.push(item)
    this.saveSnapshots()
    return item
  }
  private resolveSnapshot(snapshot: Snapshot) {
    const { request } = this._options
    return () => request(snapshot.chunks).then(res => {
      return {
        data: res,
        snapshotId: snapshot.id
      }
    }).catch((error) => {
      return {
        error,
        snapshotId: snapshot.id
      }
    })
  }
  public slice() {
    const { limit } = this._options
    const chunks = this._chunks.slice(0, limit)
    if (chunks.length) {
      const snapshot = this.generateSnapshot(chunks)
      if (snapshot) {
        this.scheduler(this.resolveSnapshot(snapshot))
      }
      this._chunks = this._chunks.slice(limit)
      this.slice()
    }
  }
}

